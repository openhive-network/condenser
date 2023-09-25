import Router from 'koa-router';
import axios from 'axios';
import config from 'config';
import secureRandom from 'secure-random';
import renderServerPage from './server-page';

const ssoHeaders = [
    ['Access-Control-Allow-Origin', `${config.get('openhive_chat_uri')}`],
    ['Access-Control-Allow-Credentials', 'true'],
    ['Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'],
    ['Access-Control-Allow-Methods', 'POST, OPTIONS'],
];

/**
 * @typedef ResultToken
 * @type {object}
 * @property {boolean} success
 * @property {string} error
 * @property {object} [data]
 */

export const rocketChatApiUri = `${config.get('openhive_chat_api_uri')}/api/v1`;

export const rocketChatAdminUserAuthHeaders = {
    'X-User-Id': config.get('openhive_chat_admin_user_id'),
    'X-Auth-Token': config.get('openhive_chat_admin_user_token'),
};

/**
 * Get authToken for user (admin action). This will work only if Rocket
 * Chat was started with env variable `CREATE_TOKENS_FOR_USERS=true`.
 *
 * @export
 * @param {string} [username='']
 * @returns {Promise<ResultToken>}
 */
export async function getRCAuthToken(username = '') {

    //
    // TODO We request a new login token on each call to this function,
    // so this happens on each page reload as well. It's likely
    // unnecessary and causes storing a lot of tokens for users in
    // database on Rocket Chat's side. We should save token in session
    // on the first call and output token existing in session on
    // subsequent calls. But how to know when token in session has
    // expired? Possible solutions:
    //
    // 1. We should request a new token, when login via iframe fails.
    // 2. Output expiry time from Rocket Chat.
    //

    try {
        const requestConfig = {
            headers: rocketChatAdminUserAuthHeaders,
            timeout: 1000 * 30
        };
        const url = `${rocketChatApiUri}/users.createToken`;
        const responseData = (
                await axios.post(url, {username}, requestConfig)
                ).data;
        // Succesful response looks like this:
        //
        // {
        //     "data": {
        //       "userId": "YYAveLvzKCMSQkrTG",
        //       "authToken": "pSQctfITPgmOJ9mJf7hHK0trxPSTpqYBVonNzrP2uas"
        //     },
        //     "success": true
        // }
        if (responseData.success) {
            return {
                success: true,
                error: '',
                data: {...responseData.data, ...{username}},
            };
        }
        return {
            success: false,
            error: responseData.error
                    || 'getRCAuthToken unspecified in responseData3'
        };
    } catch (error) {
        console.error('getRCAuthToken error', error);
        return {
            success: false,
            error: 'getRCAuthToken unknown'
        };
    }
}

/**
 * Check if user exists in Rocket Chat, and create user if one doesn't
 * exist. Then get Rocket Chat login token for this user and return it.
 *
 * @export
 * @param {string} [username='']
 * @returns {Promise<ResultToken>}
 */
export async function getChatAuthToken(username = '') {

    console.log(`Running getChatAuthToken for user ${username}`);

    const requestConfig = {
        headers: rocketChatAdminUserAuthHeaders,
        timeout: 1000 * 30,
    };
    let responseData1;

    try {
        const url1 = `${rocketChatApiUri}/users.info`;
        responseData1 = (await axios.get(url1,
                {...requestConfig, ...{params: {username}}})).data;
    } catch (error) {
        if (error.response && error.response.data
                && error.response.data.error === 'User not found.') {
            responseData1 = error.response.data;
        } else {
            console.error('Error code 2 in getChatAuthToken', error);
            return {
                success: false,
                error: 'Error code 2'
            };
        }
    }

    if (responseData1.success) {
        // User exists.
        if (responseData1.user.active) {
            // User is active, so we'll output token.
            return getRCAuthToken(username);
        }
        return {
            success: false,
            error: 'User is inactive'
        };
    }

    // If user doesn't exist, let's create a user, when the setiings
    // allow to do this.
    if (responseData1.error === 'User not found.') {
        if (config.get('openhive_chat_iframe_create_users') === 'yes') {
            const url2 = `${rocketChatApiUri}/users.create`;
            const data2 = {
                name: username,
                username,
                email: '',
                password: secureRandom.randomBuffer(16).toString('hex'),
                active: true,
                joinDefaultChannels: true,
                sendWelcomeEmail: false
            };
            try {
                const responseData2 = (
                    await axios.post(url2, data2, requestConfig)
                    ).data;
                if (responseData2.success) {
                    return getRCAuthToken(username);
                }
                return {
                    success: false,
                    error: 'Error code 4. ' + responseData2.error
                };
            } catch (error) {
                console.error('Error code 3 in getChatAuthToken', error);
                return {
                    success: false,
                    error: 'Error code 3'
                };
            }
        } else {
            return {
                success: false,
                error: 'User does not exist'
            };
        }
    }

    return {
        success: false,
        error: 'Error code 1'
    };
}

/**
 * Koa middleware for integration with Rocket Chat via iframe.
 *
 * @export
 * @param {Object} app Koa application
 */
export default function useRocketChat(app) {

    const router = new Router();

    //
    // You can set this endpoint as "Iframe URL" in Rocket Chat.
    //
    router.get('/chat/parking', async (ctx) => {
        const content = `
            <p>
                Please login to Hive Blog to see chat
            </p>
        `;
        ctx.body = renderServerPage('Chat', content);
    });


    //
    // You can set this endpoint as "Iframe URL" in Rocket Chat.
    //
    router.get('/chat/login', async (ctx) => {
        //
        // See https://developer.rocket.chat/rocket.chat/iframe-integration/iframe-events
        //
        const script = `
            const onMessageReceivedFromIframe = (event) => {
                if (event.origin !== "${config.get('openhive_chat_uri')}") {
                    return;
                }
            };

            const addIframeListener = () => {
                window.addEventListener(
                    "message",
                    onMessageReceivedFromIframe
                    );
            };
            addIframeListener();

            const callCustomOauthLogin = (service) => {
                window.parent.postMessage(
                    {
                        externalCommand: 'call-custom-oauth-login',
                        service: service,
                        redirectUrl: "${config.get('openhive_chat_uri')}",
                    },
                    "${config.get('openhive_chat_uri')}"
                    );
            }
        `;

        const content = `
            <p>
                <input type=button onclick="callCustomOauthLogin('hiveblog')"
                    value="Login with Hive.Blog">
            </p>
            <p>
                <input type=button onclick="callCustomOauthLogin('hivesigner')"
                    value="Login with Hivesigner">
            </p>
        `;

        ctx.body = renderServerPage('Chat Login', content, script);
    });


    //
    // Set this endpoint as "Iframe API URL" in Rocket Chat.
    //
    router.post('/chat/sso', async (ctx) => {

        ssoHeaders.forEach((header) => {
            ctx.set(header[0], header[1]);
        });

        ctx.status = 401;

        let user;
        if (ctx.session.a) {
            user = ctx.session.a;
        } else if (ctx.session.externalUser
                && ctx.session.externalUser.system === 'hivesigner') {
            user = ctx.session.externalUser.user;
        }

        if (user) {
            const result = await getChatAuthToken(user);
            if (result.success) {
                ctx.status = 200;
                ctx.body = {
                    loginToken: result.data.authToken
                };
            }
        }
    });

    //
    // Set this endpoint as "Iframe API URL" in Rocket Chat.
    //
    router.options('/chat/sso', async (ctx) => {
        ssoHeaders.forEach((header) => {
            ctx.set(header[0], header[1]);
        });
    });

    app.use(router.routes()).use(router.allowedMethods());
}
