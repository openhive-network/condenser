const webpack = require('webpack');
const git = require('git-rev-sync');
const LiveReloadPlugin = require('webpack-livereload-plugin');
const baseConfig = require('./base.config');
const startKoa = require('./utils/start-koa');

// var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// baseConfig.plugins.push(new BundleAnalyzerPlugin());

module.exports = {
    ...baseConfig,
    // devtool: 'eval-cheap-module-source-map',
    module: {
        ...baseConfig.module,
        rules: [
            ...baseConfig.module.rules,
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                BROWSER: JSON.stringify(true),
                NODE_ENV: JSON.stringify('development'),
                VERSION: JSON.stringify(git.long())
            }
        }),
        ...baseConfig.plugins,
        function () {
            console.log("Please wait for app server startup (~60s) after webpack server startup...");
            this.hooks.done.tap('StartKoa', startKoa);
        },
        new LiveReloadPlugin({
            appendScriptTag: true,
        }),
    ]
};
