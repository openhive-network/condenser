const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');

const css_loaders = [
    { loader: 'style-loader' },
    { loader: 'css-loader' },
    { loader: 'postcss-loader' }
];

const scss_loaders = [
    { loader: 'css-loader' },
    { loader: 'postcss-loader' },
    {
        loader: 'sass-loader',
        options: {
            sourceMap: true,
            data: '@import "app";',
            includePaths: [
                path.join(__dirname, '../src/app/assets/stylesheets'),
            ]
        }
    },
];

module.exports = {
    stories: [
        // "../src/**/*.stories.mdx",
        "../src/**/*.stories.@(js|jsx|ts|tsx)"
    ],
    addons: [
        "@storybook/addon-links",
        "@storybook/addon-essentials",
        "@storybook/addon-knobs",
        "storybook-addon-intl/register",
        '@storybook/addon-postcss',
        {
            name: '@storybook/addon-postcss',
            options: {
                postcssLoaderOptions: {
                    implementation: require('postcss'),
                },
            },
        },
    ],
    webpackFinal: async (config, { configType }) => {
        config.resolve = {
            alias: {
                assets: path.resolve(__dirname, '../src/app/assets/'),
                app: path.resolve(__dirname, '../src/app/'),
            },
            extensions: ['.js', '.json', '.jsx'],
            modules: [
                path.resolve(__dirname, '../src'),
                'node_modules'
            ]
        };

        config.module = {
            rules: [
                {test: /\.(jpe?g|png)/, use: 'url-loader?limit=4096'},
                // {test: /\.json$/, use: 'json-loader'},
                {test: /\.js$|\.jsx$/, exclude: /node_modules/, use: 'babel-loader'},
                {test: /\.svg$/, use: 'svg-inline-loader'},
                {
                    test: /\.css$/,
                    use: css_loaders
                },
                {
                    test: /\.scss$/,
                    use: ExtractTextPlugin.extract({
                        fallback: 'style-loader',
                        use: scss_loaders
                    })
                },
            ]
        };

        return {
            ...config,
        };
    },
}
