/*eslint global-require: "warn"*/
import path from 'path';
import Koa from 'koa';
import mount from 'koa-mount';
import helmet from 'koa-helmet';
import proxy from 'koa-proxy';
import koa_logger from 'koa-logger';
import cluster from 'cluster';
import os from 'os';
import favicon from 'koa-favicon';
import staticCache from 'koa-static-cache';
import isBot from 'koa-isbot';
import csrf from 'koa-csrf';
import koaBody from 'koa-body';
import config from 'config';
import secureRandom from 'secure-random';
import koaLocale from 'koa-locale';
import { routeRegex } from 'app/ResolveRoute';
import userIllegalContent from 'app/utils/userIllegalContent';
import hiveCryptoSession from './hive-crypto-session';
import { getSupportedLocales } from './utils/misc';
import { specialPosts } from './utils/SpecialPosts';
import usePostJson from './json/post_json';
import useUserJson from './json/user_json';
import useGeneralApi from './api/general';
import useRedirects from './redirects';
import prod_logger from './prod_logger';
import hardwareStats from './hardwarestats';
import StatsLoggerClient from './utils/StatsLoggerClient';
import requestTime from './requesttimings';
import oauthServer from './oauth-server';
import useRocketChat from './rocket-chat';

if (cluster.isMaster) console.log('application server starting, please wait.');

// import uploadImage from 'server/upload-image' //medium-editor

const app = new Koa();
app.proxy = true; // allows to trust the headers that the load-balancer adds to each request
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

    app.use(proxy({
        host: proxyhost,
        match: /^\/assets\//,
    }));
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
const hiveCryptoSessionOptions = {
    maxAge: 1000 * 3600 * 24 * 60,
    crypto_key,
    key: config.get('session_cookie_key'),

    //
    // TODO `sameSite: 'none'` is unsecure. Consider using __HOST prefix, see
    // 1. https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#cookie_prefixes
    // 2. https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/02-Testing_for_Cookies_Attributes
    //

    sameSite: 'none',

};
if (config.get('session_cookie_domain')) {
    // Note that __HOST prefixed cookies shouldn't set domain.
    hiveCryptoSessionOptions.domain = config.get('session_cookie_domain');
}
hiveCryptoSession(app, hiveCryptoSessionOptions);

app.use(koaBody());

// Setup CSRF protection, but allow some exceptions.
const csrfProtect = new csrf({
    invalidTokenMessage: 'Invalid CSRF token',
    invalidTokenStatusCode: 403,
    excludedMethods: ['GET', 'HEAD', 'OPTIONS'],
    disableQuery: true,
});
const csrfIgnoreUrlList = ['/oauth/token', '/chat/sso'];
app.use(async (ctx, next) => {
    console.log('bamboo ctx.req.url', ctx.req.url);
    if (csrfIgnoreUrlList.includes(ctx.req.url)) {
        await next();
    } else if (/\/api\/v1\/.+$/.test(ctx.req.url)) {
        await next();
    } else {
        await csrfProtect(ctx, next);
    }
});

useGeneralApi(app);
if (config.get('oauth_server') && (config.get('oauth_server')).enable === 'yes') {
    oauthServer(app);
}
if (config.get('openhive_chat_iframe_integration_enable') === 'yes') {
        useRocketChat(app);
}
useRedirects(app);
useUserJson(app);
usePostJson(app);

koaLocale(app);

function convertEntriesToArrays(obj) {
    return Object.keys(obj).reduce((result, key) => {
        result[key] = obj[key].split(/\s+/);
        return result;
    }, {});
}

// some redirects and health status
app.use(async (ctx, next) => {

    if (ctx.method === 'GET' && ctx.url === '/.well-known/healthcheck.json') {
        ctx.status = 200;
        ctx.body = {
            status: 'ok',
            docker_tag: process.env.DOCKER_TAG ? process.env.DOCKER_TAG : false,
            source_commit: process.env.SOURCE_COMMIT ? process.env.SOURCE_COMMIT : false,
        };
        return;
    }

    // redirect to home page/feed if known account
    if (ctx.method === 'GET' && ctx.url === '/' && ctx.session.a) {
        ctx.status = 302;
        //this.redirect(`/@${this.session.a}/feed`);
        ctx.redirect(`/trending/my`);
        return;
    }

    // normalize user name url from cased params
    if (
        ctx.method === 'GET'
        && (routeRegex.UserProfile.test(ctx.url)
            || routeRegex.PostNoCategory.test(ctx.url)
            || routeRegex.Post.test(ctx.url))
    ) {
        const p = ctx.originalUrl.toLowerCase();
        let userCheck = '';
        if (routeRegex.Post.test(ctx.url)) {
            userCheck = p.split('/')[2].slice(1);
        } else {
            userCheck = p.split('/')[1].slice(1);
        }
        if (userIllegalContent.includes(userCheck)) {
            console.log('Illegal content user found blocked', userCheck);
            ctx.status = 451;
            return;
        }
        if (p !== ctx.originalUrl) {
            ctx.status = 301;
            ctx.redirect(p);
            return;
        }
    }

    // normalize top category filtering from cased params
    if (ctx.method === 'GET' && routeRegex.CategoryFilters.test(ctx.url)) {
        const p = ctx.originalUrl.toLowerCase();
        if (p !== ctx.originalUrl) {
            ctx.status = 301;
            ctx.redirect(p);
            return;
        }
    }

    // this.url is a relative URL, it does not include the scheme
    const [pathString, queryString] = ctx.url.split('?');
    const urlParams = new URLSearchParams(queryString);

    let paramFound = false;
    if (ctx.url.indexOf('?') !== -1) {
        const paramsToProcess = ['ch', 'cn', 'r'];

        paramsToProcess.forEach((paramToProcess) => {
            if (urlParams.has(paramToProcess)) {
                const paramValue = urlParams.get(paramToProcess);
                if (paramValue) {
                    paramFound = true;
                    ctx.session[paramToProcess] = paramValue;
                    urlParams.delete(paramToProcess);
                }
            }
        });
    }

    if (paramFound) {
        const newQueryString = urlParams.toString();
        const redir = `${pathString.replace(/\/\//g, '/')}${newQueryString ? `?${newQueryString}` : ''}`;

        ctx.status = 302;
        ctx.redirect(redir);
    } else {
        await next();
    }
});

// load production middleware
if (env === 'production') {
    app.use(require('koa-conditional-get')());
    app.use(require('koa-etag')());
    app.use(require('koa-compressor')());
}

app.use(mount('/static', staticCache(path.join(__dirname, '../app/assets/static'), cacheOpts)));

async function robotsTxt(ctx, next) {
    await next();
    ctx.set('Cache-Control', 'public, max-age=86400000');
    ctx.type = 'text/plain';
    ctx.body = 'User-agent: *\nAllow: /';
}

app.use(mount('/robots.txt', robotsTxt));

// set user's uid - used to identify users in logs and some other places
// FIXME SECURITY PRIVACY cycle this uid after a period of time
app.use(async (ctx, next) => {
    const { last_visit } = ctx.session;
    // eslint-disable-next-line no-bitwise
    ctx.session.last_visit = (new Date().getTime() / 1000) | 0;
    const from_link = ctx.request.headers.referer;
    if (!ctx.session.uid) {
        ctx.session.uid = secureRandom.randomBuffer(13).toString('hex');
        ctx.session.new_visit = true;
        if (from_link) ctx.session.r = from_link;
    } else {
        ctx.session.new_visit = ctx.session.last_visit - last_visit > 1800;
        if (!ctx.session.r && from_link) {
            ctx.session.r = from_link;
        }
    }
    await next();
});

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

    app.use(async (ctx) => {
        await appRender(ctx, supportedLocales, resolvedAssets);
        const bot = ctx.state.isBot;
        if (bot) {
            console.log(`  --> ${ctx.method} ${ctx.originalUrl} ${ctx.status} (BOT '${bot}')`);
        }
    });
}

// Logging
if (env === 'production') {
    app.use(prod_logger());
} else {
    app.use(koa_logger());
}

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
} else if (env !== 'test') {
    // spawn a single thread if not running in production mode
    app.listen(port);
    if (process.send) process.send('online');
    console.log(`Application started on port ${port}`);
}

if (process.send) process.send('online');

// set PERFORMANCE_TRACING to the number of seconds desired for
// logging hardware stats to the console
if (process.env.PERFORMANCE_TRACING) setInterval(hardwareStats, 1000 * process.env.PERFORMANCE_TRACING);

module.exports = app;
