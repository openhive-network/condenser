const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const writeStats = require('./utils/write-stats');

const Webpack_isomorphic_tools_plugin = require('webpack-isomorphic-tools/plugin');
const webpack_isomorphic_tools_plugin =
    new Webpack_isomorphic_tools_plugin(require('./webpack-isotools-config'))
        .development();

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
    MiniCssExtractPlugin.loader,
    {
        loader: 'css-loader',
        options: {
            importLoaders: 1,
        },
    },
    postcss_loader,
];

const scss_loaders = [
    MiniCssExtractPlugin.loader,
    {
        loader: 'css-loader',
        options: {
            importLoaders: 1,
        },
    },
    postcss_loader,
    {
        loader: 'sass-loader'
    }
];

module.exports = {
    entry: {
        app: ['core-js/stable', './src/app/Main.js'],
        vendor: [
            'react',
            'react-dom',
            'react-router',
            '@hiveio/hive-js',
            'slate',
            'slate-drop-or-paste-images',
            'slate-insert-block-on-enter',
            'slate-trailing-block',
            'bytebuffer',
            'immutable',
            'autolinker',
            'pako',
            'remarkable',
            'picturefill'
        ]
    },
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: '[name].[hash].js',
        chunkFilename: '[id].[hash].js',
        publicPath: '/assets/'
    },
    module: {
        rules: [
            {
                test: /\.(jpe?g|png)/, use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 4096,
                            esModule: false,
                        },
                    },
                ],
            },
            {test: /\.js$|\.jsx$/, exclude: [/node_modules/, /\*\/app\/assets\/static\/\*\.js/], use: 'babel-loader'},
            {test: /\.svg$/, use: 'svg-inline-loader'},
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
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'disabled',
            generateStatsFile: true,
            statsOptions: { source: false }
        }),
        function () {
            this.plugin('done', writeStats);
        },
        webpack_isomorphic_tools_plugin,
        new MiniCssExtractPlugin()
    ],
    resolve: {
        alias: {
            react: path.join(__dirname, '../node_modules', 'react'),
            assets: path.join(__dirname, '../src/app/assets')
        },
        extensions: ['.js', '.json', '.jsx'],
        modules: [
            path.resolve(__dirname, '../src'),
            'node_modules'
        ]
    },
    externals: {
    }
};
