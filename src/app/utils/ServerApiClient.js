/* global $STM_csrf */
/* global $STM_Config */

/**
 * @typedef ExternalUser
 * @type {object}
 * @property {'hiveauth' | 'hivesigner' | 'keychain'} system
 * @property {string} hivesignerToken
 */

const axios = require('axios').default;

const requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

const requestBase = {
    method: 'POST',
    headers: requestHeaders,
};

/**
 *
 * @param {string} account
 * @param {Object} signatures
 * @param {{} | ExternalUser} externalUser
 * @returns
 */
export async function serverApiLogin(account, signatures = {}, externalUser = {}) {
    const defaultExternalUser = {
        system: '', // '' | 'hivesigner'
        hivesignerToken: '',
    };
    const requestExternalUser = { ...defaultExternalUser, ...externalUser};
    if (!process.env.BROWSER || window.$STM_ServerBusy) return undefined;
    const response = await axios.post(
        '/api/v1/login_account',
        {
            account,
            signatures,
            externalUser: requestExternalUser,
            _csrf: $STM_csrf
        },
        { headers: requestHeaders },
    );

    // Login to chat.
    if ($STM_Config.openhive_chat_iframe_integration_enable) {
        if (response.data && response.data.chatAuthToken) {
            document.querySelector("#chat-iframe").contentWindow.postMessage(
                {
                    event: 'login-with-token',
                    loginToken: response.data.chatAuthToken
                },
                `${$STM_Config.openhive_chat_uri}`,
            );
            // Should not be needed, but without this chat is not in
            // `embedded` mode sometimes.
            document.querySelector("iframe").contentWindow.postMessage(
                {
                    externalCommand: "go",
                    path: "/channel/general"
                },
                `${$STM_Config.openhive_chat_uri}`,
            );
        }
    }

    return response;
}

export function serverApiLogout() {
    if (!process.env.BROWSER || window.$STM_ServerBusy) return;
    const request = { ...requestBase, body: JSON.stringify({ _csrf: $STM_csrf }) };

    // Logout from chat.
    if ($STM_Config.openhive_chat_iframe_integration_enable) {
        document.querySelector("#chat-iframe").contentWindow.postMessage(
            {
                externalCommand: 'logout',
            },
            `${$STM_Config.openhive_chat_uri}`
        );
    }

    // eslint-disable-next-line consistent-return
    return fetch('/api/v1/logout_account', request);
}

let last_call;
export function serverApiRecordEvent(type, val, rate_limit_ms = 5000) {
    if (!process.env.BROWSER || window.$STM_ServerBusy) return;
    if (last_call && new Date() - last_call < rate_limit_ms) return;
    last_call = new Date();
/*
    const value = val && val.stack ? `${val.toString()} | ${val.stack}` : val;
    api.call('overseer.collect', { collection: 'event', metadata: { type, value } }, (error) => {
        if (error) console.warn('overseer error', error, error.data);
    });
 */
}

export function saveCords(x, y) {
    const request = { ...requestBase, body: JSON.stringify({ _csrf: $STM_csrf, x, y }) };
    fetch('/api/v1/save_cords', request);
}

export function setUserPreferences(payload) {
    if (!process.env.BROWSER || window.$STM_ServerBusy) return Promise.resolve();
    const request = { ...requestBase, body: JSON.stringify({ _csrf: $STM_csrf, payload }) };
    return fetch('/api/v1/setUserPreferences', request);
}

export function conductSearch(req) {
    const bodyWithCSRF = {
        ...req.body,
        _csrf: $STM_csrf,
    };
    const request = { ...requestBase, body: JSON.stringify(bodyWithCSRF) };
    return fetch('/api/v1/search', request);
}
