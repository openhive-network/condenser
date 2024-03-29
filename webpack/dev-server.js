const Koa = require('koa');
const webpack = require('webpack');
const fs = require('fs');

const koaWebPackDevMiddleWare = require('../src/server/utils/koa-webpack-dev-middleware');

if(!fs.existsSync('tmp')) {
    fs.mkdirSync('tmp');
}

process.env.BABEL_ENV = 'browser';
process.env.NODE_ENV = 'development';

const webpackDevConfig = require('./dev.config');

const app = new Koa();
const compiler = webpack(webpackDevConfig);

const PORT = process.env.PORT ? parseInt(process.env.PORT) + 1 : 8081;

const server_options = {
    publicPath: '/assets/',
    // hot: true,
    stats: {
        assets: true,
        colors: true,
        version: false,
        hash: false,
        timings: true,
        chunks: false,
        chunkModules: false
    }
};

app.use(koaWebPackDevMiddleWare(compiler, server_options));
// app.use(require('koa-webpack-hot-middleware')(compiler));

app.listen(PORT, '0.0.0.0', () => {
    console.log('`webpack-dev-server` listening on port %s', PORT);
});
