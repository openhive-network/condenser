import config from 'config';

import * as steem from '@hiveio/hive-js';

const path = require('path');

const ROOT = path.join(__dirname, '../..');

// Tell `require` calls to look into `/app` also
// it will avoid `../../../../../` require strings

// use Object.assign to bypass transform-inline-environment-variables-babel-plugin (process.env.NODE_PATH= will not work)
Object.assign(process.env, { NODE_PATH: path.resolve(__dirname, '..') });

// eslint-disable-next-line no-underscore-dangle
require('module').Module._initPaths();

// Load Intl polyfill
// require('utils/intl-polyfill')(require('./config/init').locales);

const alternativeApiEndpoints = config.get('alternative_api_endpoints').split(' ');

global.$STM_Config = {
    fb_app: config.get('facebook_app_id'),
    steemd_connection_client: config.get('steemd_connection_client'),
    steemd_connection_server: config.get('steemd_connection_server'),
    steemd_use_appbase: config.get('steemd_use_appbase'),
    address_prefix: config.get('address_prefix'),
    img_proxy_prefix: config.get('img_proxy_prefix'),
    read_only_mode: config.get('read_only_mode'),
    upload_image: config.get('upload_image'),
    site_domain: config.get('site_domain'),
    google_analytics_id: config.get('google_analytics_id'),
    wallet_url: config.get('wallet_url'),
    failover_threshold: config.get('failover_threshold'),
    alternative_api_endpoints: alternativeApiEndpoints,
    referral: config.get('referral'),
    rebranded_api: true,
    default_observer: config.get('default_observer'),
};

const WebpackIsomorphicTools = require('webpack-isomorphic-tools');
const WebpackIsomorphicToolsConfig = require('../../webpack/webpack-isotools-config');

global.webpackIsomorphicTools = new WebpackIsomorphicTools(WebpackIsomorphicToolsConfig);

global.webpackIsomorphicTools.server(ROOT, () => {
    steem.api.setOptions({
        url: config.steemd_connection_server,
        retry: {
            retries: 10,
            factor: 5,
            minTimeout: 50, // start at 50ms
            maxTimeout: 60 * 1000,
            randomize: true,
        },
        useAppbaseApi: !!config.steemd_use_appbase,
        alternative_api_endpoints: alternativeApiEndpoints,
        failover_threshold: config.get('failover_threshold'),
        rebranded_api: true,
    });
    steem.config.set('address_prefix', config.get('address_prefix'));
    steem.config.set('rebranded_api', true);

    // const CliWalletClient = require('shared/api_client/CliWalletClient').default;
    // if (process.env.NODE_ENV === 'production') connect_promises.push(CliWalletClient.instance().connect_promise());
    try {
        // eslint-disable-next-line global-require
        require('./server');
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
});
