import Router from 'koa-router';
import axios from 'axios';
import config from 'config';
import secureRandom from 'secure-random';

/**
 * @typedef ResultToken
 * @type {object}
 * @property {boolean} success
 * @property {string} error
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
    try {
        const requestConfig = {
            headers: rocketChatAdminUserAuthHeaders,
        };
        const url = `${rocketChatApiUri}/users.createToken`;
        const responseData = (await axios.post(url, {username}, requestConfig)).data;
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
                data: {...responseData.data, ...{username}},
            };
        }
        return {
            success: false,
            error: responseData.error || 'getRCAuthToken unspecified in responseData3'
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

    console.log('bamboo getChatAuthToken responseData1', responseData1);

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

    if (responseData1.error === 'User not found.') {
        if (config.get('openhive_chat_iframe_create_users') === 'yes') {
            // User doesn't exist, let's create user.
            const url2 = `${rocketChatApiUri}/users.create`;
            const data2 = {
                name: '',
                username,
                email: '',
                password: secureRandom.randomBuffer(16).toString('hex'),
                active: true,
                joinDefaultChannels: true, // TODO Is this a good idea?
                sendWelcomeEmail: false
            };
            try {
                const responseData2 = (await axios.post(url2, data2, requestConfig)).data;
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
    // Set this endpoint as "Iframe URL" in Rocket Chat.
    //
    router.get('/chat/parking', async (ctx) => {
        ctx.body = `
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/ico" href="/favicon.ico" />
    <title>Chat - hive.blog</title>

    <style>

        body {
            max-width: 35em;
            margin: 0 auto;
            font-family: Tahoma, Verdana, Arial, sans-serif;
            padding: 20px;
        }
        .center-x {
            margin-left: auto;
            margin-right: auto;
        }
        .center-text {
            text-align: center;
        }

    </style>

</head>

<body>

    <div class="center-x" style="color: white;">
        <h1>Chat</h1>
        <p>
            Please login to Hive Blog to see chat
        </p>
    </div>

</body>
</html>
`;
    });

    //
    // Set this endpoint as "Iframe API URL" in Rocket Chat.
    //
    router.post('/chat/sso', async (ctx) => {
        ctx.set('Access-Control-Allow-Origin', `${config.get('openhive_chat_api_uri')}`);
        ctx.set('Access-Control-Allow-Credentials', 'true');
        ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        ctx.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

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

    app.use(router.routes()).use(router.allowedMethods());
}
