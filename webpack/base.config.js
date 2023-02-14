const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Webpack_isomorphic_tools_plugin = require('webpack-isomorphic-tools/plugin');
const writeStats = require('./utils/write-stats');

// eslint-disable-next-line global-require
const webpack_isomorphic_tools_plugin = new Webpack_isomorphic_tools_plugin(require('./webpack-isotools-config')).development();

const devMode = process.env.NODE_ENV !== 'production';

const plugins = [
        new BundleAnalyzerPlugin({
            analyzerMode: 'disabled',
            generateStatsFile: true,
            statsOptions: { source: false }
        }),
        function () {
            this.hooks.done.tap('WriteStats', writeStats);
        },
        webpack_isomorphic_tools_plugin,
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ];
if (!devMode) {
    plugins.push(new MiniCssExtractPlugin({
        filename: devMode ? '[name].css' : '[name].[contenthash].css',
        chunkFilename: devMode ? '[id].css' : '[id].[contenthash].css',
    }));
}

const postcss_loader = {
    loader: 'postcss-loader',
    options: {
        postcssOptions: {
            plugins: [
                'autoprefixer',
            ],
        },
    },
};

const css_loaders = [
    devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
    {
        loader: 'css-loader',
        options: {
            importLoaders: 1,
            esModule: false,
        },
    },
    postcss_loader,
];

const scss_loaders = [
    devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
    {
        loader: 'css-loader',
        options: {
            importLoaders: 1,
            esModule: false,
        },
    },
    postcss_loader,
    {
        loader: 'sass-loader'
    }
];

module.exports = {
    mode: devMode ? 'development' : 'production',
    entry: {
        app: ['core-js/stable', './src/app/Main.js'],
    },
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: '[name].[contenthash].js',
        sourceMapFilename: '[name].[contenthash].js.map',
        chunkFilename: '[id].[contenthash].js',
        publicPath: '/assets/'
    },
    module: {
        rules: [
            {
                test: /\.(jpe?g|png)/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 4096,
                            esModule: false,
                        },
                    },
                ],
            },
            {
                test: /\.js$|\.jsx$/,
                exclude: [
                    /node_modules/,
                    /\*\/app\/assets\/static\/\*\.js/
                ],
                use: 'babel-loader'
            },
            {
                test: /\.svg$/,
                use: 'svg-inline-loader'
            },
            {
                test: require.resolve("blueimp-file-upload"),
                use: "imports?define=>false"
            },
            {
                test: /\.css$/,
                use: css_loaders
            },
            {
                test: /\.scss$/,
                use: scss_loaders
            },
            {
                test: /\.md/,
                use: [
                    {
                        loader: 'raw-loader',
                        options: {
                            esModule: false,
                        },
                    },
                ],
            }
        ]
    },
    plugins,
    resolve: {
        alias: {
            react: path.join(__dirname, '../node_modules', 'react'),
            assets: path.join(__dirname, '../src/app/assets'),
            app: path.resolve(__dirname, '../src/app'),
        },
        extensions: ['.js', '.json', '.jsx'],
        modules: [
            path.resolve(__dirname, '../src'),
            'node_modules'
        ],
        fallback: {
            stream: require.resolve('stream-browserify'),
            crypto: require.resolve('crypto-browserify'),
            vm: require.resolve('vm-browserify'),
            buffer: require.resolve('buffer/'),
        },
    },
    externals: {},
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'all',
                },
            },
        },
    },
};
