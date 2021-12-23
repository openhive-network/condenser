/*eslint global-require: "warn"*/
import path from 'path';
import Koa from 'koa';
import mount from 'koa-mount';
import helmet from 'koa-helmet';
import koa_logger from 'koa-logger';
import cluster from 'cluster';
import os from 'os';
import favicon from 'koa-favicon';
import staticCache from 'koa-static-cache';
import isBot from 'koa-isbot';
import session from '@steem/crypto-session';
import csrf from 'koa-csrf';
import minimist from 'minimist';
import config from 'config';
import secureRandom from 'secure-random';
import koaLocale from 'koa-locale';
import { routeRegex } from 'app/ResolveRoute';
import userIllegalContent from 'app/utils/userIllegalContent';
import { getSupportedLocales } from './utils/misc';
import { specialPosts } from './utils/SpecialPosts';
import usePostJson from './json/post_json';
import useUserJson from './json/user_json';
import useGeneralApi from './api/general';
import useRedirects from './redirects';
import prod_logger from './prod_logger';
import hardwareStats from './hardwarestats';
import { SteemMarket } from './utils/SteemMarket';
import StatsLoggerClient from './utils/StatsLoggerClient';
import requestTime from './requesttimings';

if (cluster.isMaster) console.log('application server starting, please wait.');

// import uploadImage from 'server/upload-image' //medium-editor

const app = new Koa();
app.name = 'Hive app';
const env = process.env.NODE_ENV || 'development';
// cache of a thousand days
const cacheOpts = { maxAge: 86400000, gzip: true, buffer: true };

// Serve static assets without fanfare
app.use(favicon(path.join(__dirname, '../app/assets/images/favicons/favicon.ico')));

app.use(mount('/favicons', staticCache(path.join(__dirname, '../app/assets/images/favicons'), cacheOpts)));

app.use(mount('/images', staticCache(path.join(__dirname, '../app/assets/images'), cacheOpts)));

app.use(mount('/javascripts', staticCache(path.join(__dirname, '../app/assets/javascripts'), cacheOpts)));

// Proxy asset folder to webpack development server in development mode
if (env === 'development') {
    const webpack_dev_port = process.env.PORT ? parseInt(process.env.PORT) + 1 : 8081;
    const proxyhost = 'http://0.0.0.0:' + webpack_dev_port;
    console.log('proxying to webpack dev server at ' + proxyhost);
    const proxy = require('koa-proxy')({
        host: proxyhost,
        map: (filePath) => 'assets/' + filePath,
    });
    app.use(mount('/assets', proxy));
} else {
    app.use(mount('/assets', staticCache(path.join(__dirname, '../../dist'), cacheOpts)));
}

let resolvedAssets = false;
let supportedLocales = false;

if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line import/no-dynamic-require
    resolvedAssets = require(path.join(__dirname, '../..', '/tmp/webpack-stats-prod.json'));
    supportedLocales = getSupportedLocales();
}

app.use(isBot());

// set number of processes equal to number of cores
// (unless passed in as an env var)
const numProcesses = process.env.NUM_PROCESSES || os.cpus().length;

const statsLoggerClient = new StatsLoggerClient(process.env.STATSD_IP);

app.use(requestTime(statsLoggerClient));

app.keys = [config.get('session_key')];

const crypto_key = config.get('server_session_secret');
session(app, {
    maxAge: 1000 * 3600 * 24 * 60,
    crypto_key,
    key: config.get('session_cookie_key'),
});
csrf(app);

koaLocale(app);

function convertEntriesToArrays(obj) {
    return Object.keys(obj).reduce((result, key) => {
        result[key] = obj[key].split(/\s+/);
        return result;
    }, {});
}

// Fetch cached currency data for homepage
const steemMarket = new SteemMarket();
app.use(function* (next) {
    this.steemMarketData = yield steemMarket.get();
    yield next;
});

// some redirects and health status
app.use(function* (next) {
    if (this.method === 'GET' && this.url === '/.well-known/healthcheck.json') {
        this.status = 200;
        this.body = {
            status: 'ok',
            docker_tag: process.env.DOCKER_TAG ? process.env.DOCKER_TAG : false,
            source_commit: process.env.SOURCE_COMMIT ? process.env.SOURCE_COMMIT : false,
        };
        return;
    }

    // redirect to home page/feed if known account
    if (this.method === 'GET' && this.url === '/' && this.session.a) {
        this.status = 302;
        //this.redirect(`/@${this.session.a}/feed`);
        this.redirect(`/trending/my`);
        return;
    }

    // normalize user name url from cased params
    if (
        this.method === 'GET'
        && (routeRegex.UserProfile.test(this.url)
            || routeRegex.PostNoCategory.test(this.url)
            || routeRegex.Post.test(this.url))
    ) {
        const p = this.originalUrl.toLowerCase();
        let userCheck = '';
        if (routeRegex.Post.test(this.url)) {
            userCheck = p.split('/')[2].slice(1);
        } else {
            userCheck = p.split('/')[1].slice(1);
        }
        if (userIllegalContent.includes(userCheck)) {
            console.log('Illegal content user found blocked', userCheck);
            this.status = 451;
            return;
        }
        if (p !== this.originalUrl) {
            this.status = 301;
            this.redirect(p);
            return;
        }
    }

    // normalize top category filtering from cased params
    if (this.method === 'GET' && routeRegex.CategoryFilters.test(this.url)) {
        const p = this.originalUrl.toLowerCase();
        if (p !== this.originalUrl) {
            this.status = 301;
            this.redirect(p);
            return;
        }
    }

    // this.url is a relative URL, it does not include the scheme
    const [pathString, queryString] = this.url.split('?');
    const urlParams = new URLSearchParams(queryString);

    let paramFound = false;
    if (this.url.indexOf('?') !== -1) {
        const paramsToProcess = ['ch', 'cn', 'r'];

        paramsToProcess.forEach((paramToProcess) => {
            if (urlParams.has(paramToProcess)) {
                const paramValue = urlParams.get(paramToProcess);
                if (paramValue) {
                    paramFound = true;
                    this.session[paramToProcess] = paramValue;
                    urlParams.delete(paramToProcess);
                }
            }
        });
    }

    if (paramFound) {
        const newQueryString = urlParams.toString();
        const redir = `${pathString.replace(/\/\//g, '/')}${newQueryString ? `?${newQueryString}` : ''}`;

        this.status = 302;
        this.redirect(redir);
    } else {
        yield next;
    }
});

// load production middleware
if (env === 'production') {
    app.use(require('koa-conditional-get')());
    app.use(require('koa-etag')());
    app.use(require('koa-compressor')());
}

// Logging
if (env === 'production') {
    app.use(prod_logger());
} else {
    app.use(koa_logger());
}

// app.use(
//     helmet({
//         hsts: false,
//     })
// );

app.use(mount('/static', staticCache(path.join(__dirname, '../app/assets/static'), cacheOpts)));

app.use(
    // eslint-disable-next-line require-yield
    mount('/robots.txt', function* () {
        this.set('Cache-Control', 'public, max-age=86400000');
        this.type = 'text/plain';
        this.body = 'User-agent: *\nAllow: /';
    })
);

// set user's uid - used to identify users in logs and some other places
// FIXME SECURITY PRIVACY cycle this uid after a period of time
app.use(function* (next) {
    const { last_visit } = this.session;
    // eslint-disable-next-line no-bitwise
    this.session.last_visit = (new Date().getTime() / 1000) | 0;
    const from_link = this.request.headers.referer;
    if (!this.session.uid) {
        this.session.uid = secureRandom.randomBuffer(13).toString('hex');
        this.session.new_visit = true;
        if (from_link) this.session.r = from_link;
    } else {
        this.session.new_visit = this.session.last_visit - last_visit > 1800;
        if (!this.session.r && from_link) {
            this.session.r = from_link;
        }
    }
    yield next;
});

useRedirects(app);
useUserJson(app);
usePostJson(app);

useGeneralApi(app);

// helmet wants some things as bools and some as lists, makes config difficult.
// our config uses strings, this splits them to lists on whitespace.
if (env === 'production') {
    const helmetConfig = {
        directives: convertEntriesToArrays(config.get('helmet.directives')),
        reportOnly: config.get('helmet.reportOnly'),
        setAllHeaders: config.get('helmet.setAllHeaders'),
    };
    // eslint-disable-next-line prefer-destructuring
    helmetConfig.directives.reportUri = helmetConfig.directives.reportUri[0];
    if (helmetConfig.directives.reportUri === '-') {
        delete helmetConfig.directives.reportUri;
    }
    app.use(helmet.contentSecurityPolicy(helmetConfig));
}

if (env !== 'test') {
    const appRender = require('./app_render');

    // Load special posts and store them on the ctx for later use. Since
    // we're inside a generator, we can't `await` here, so we pass a promise
    // so `src/server/app_render.jsx` can `await` on it.
    app.specialPostsPromise = specialPosts();
    // refresh special posts every five minutes
    setInterval(() => {
        return new Promise((resolve) => {
            app.specialPostsPromise = specialPosts();
            resolve();
        });
    }, 300000);

    app.use(function* () {
        yield appRender(this, supportedLocales, resolvedAssets);
        const bot = this.state.isBot;
        if (bot) {
            console.log(`  --> ${this.method} ${this.originalUrl} ${this.status} (BOT '${bot}')`);
        }
    });

    minimist(process.argv.slice(2));

    const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

    if (env === 'production' && process.env.DISABLE_CLUSTERING !== 'true') {
        if (cluster.isMaster) {
            for (let i = 0; i < numProcesses; i += 1) {
                cluster.fork();
            }
            // if a worker dies replace it so application keeps running
            cluster.on('exit', (worker) => {
                console.log('error: worker %d died, starting a new one', worker.id);
                cluster.fork();
            });
        } else {
            app.listen(port);
            if (process.send) process.send('online');
            console.log(`Worker process started for port ${port}`);
        }
    } else {
        // spawn a single thread if not running in production mode
        app.listen(port);
        if (process.send) process.send('online');
        console.log(`Application started on port ${port}`);
    }
}

// set PERFORMANCE_TRACING to the number of seconds desired for
// logging hardware stats to the console
if (process.env.PERFORMANCE_TRACING) setInterval(hardwareStats, 1000 * process.env.PERFORMANCE_TRACING);

module.exports = app;
