const webpack = require('webpack');
const git = require('git-rev-sync');
const baseConfig = require('./base.config');

module.exports = {
    ...baseConfig,
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                BROWSER: JSON.stringify(true),
                NODE_ENV: JSON.stringify('production'),
                VERSION: JSON.stringify(git.long())
            }
        }),
        ...baseConfig.plugins,
        // Fix window.onerror
        // See https://github.com/webpack/webpack/issues/5681#issuecomment-345861733
        new webpack.SourceMapDevToolPlugin({
            module: true,
            columns: false,
            moduleFilenameTemplate: (info) => { return `${info.resourcePath}?${info.loaders}`; }
        })
    ]
};
