import { isLoggedIn, extractLoginData } from 'app/utils/UserUtil';
import hivesigner from 'hivesigner';
import { APP_URL, HIVE_SIGNER_APP } from 'app/client_config';
import { encodeOps } from 'hive-uri';

const isBrowser = () => typeof window !== 'undefined' && window;

const HOST_URL = isBrowser() ? window.location.protocol + '//' + window.location.host : APP_URL;

const HIVE_SIGNER_URL = 'https://hivesigner.com';

export const hiveSignerClient = new hivesigner.Client({
    app: HIVE_SIGNER_APP,
    callbackURL: `${HOST_URL}/login/hivesigner`,
    // scope: ['vote', 'comment'],
});

/**
 *
 * @returns {boolean}
 */
export function isLoggedInWithHiveSigner() {
    if (!isLoggedIn()) {
        return false;
    }
    const data = localStorage.getItem('autopost2');
    const [, , , , , login_with_hive_signer] = extractLoginData(data);
    return !!login_with_hive_signer;
}
/**
 * Set HiveSigner access Token in hiveSignerClient
 *
 * @param {string} username
 * @param {string} access_token
 */
export const setHiveSignerAccessToken = (username, access_token) => {
    // set access token for Hive Signer
    console.log(`HiveSigner: set access token for @${username}`);
    hiveSignerClient.setAccessToken(access_token);
};

export const sendOperationsWithHiveSigner = (ops, params, cb) => {
    if (!params) params = {};
    if (!params.callback && isBrowser()) {
        params.callback = window.location.href;
    }
    const uri = encodeOps(ops, params);
    const webUrl = uri.replace('hive://', `${HIVE_SIGNER_URL}/`);
    if (cb && isBrowser()) {
        window.location = webUrl;
    }
    return webUrl;
};
