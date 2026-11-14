const webpack = require('webpack');
const git = require('git-rev-sync');
const baseConfig = require('./base.config');

module.exports = {
    ...baseConfig,
    devtool: 'source-map',
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                BROWSER: JSON.stringify(true),
                NODE_ENV: JSON.stringify('production'),
                // SOURCE_COMMIT is passed by CI's docker build
                VERSION: JSON.stringify(process.env.SOURCE_COMMIT || git.long())
            }
        }),
        ...baseConfig.plugins,
    ],
};
