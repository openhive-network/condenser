import Router from 'koa-router';
import axios from 'axios';
import config from 'config';
import secureRandom from 'secure-random';

export const rocketChatApiUri = `${config.get('openhive_chat_uri')}/api/v1`;

export const rocketChatAdminUserAuthHeaders = {
    'X-User-Id': config.get('openhive_chat_admin_user_id'),
    'X-Auth-Token': config.get('openhive_chat_admin_user_token'),
};


export async function getRCAuthToken(username = '') {
    // Get authToken for user. This will work only if Rocket
    // Chat was started with env variable
    // `CREATE_TOKENS_FOR_USERS=true`

    try {
        const requestConfig = {
            headers: rocketChatAdminUserAuthHeaders,
        };
        const url3 = `${rocketChatApiUri}/users.createToken`;
        const responseData3 = (await axios.post(url3, {username}, requestConfig)).data;
        // Succesful response looks like this:
        //
        // {
        //     "data": {
        //       "userId": "YYAveLvzKCMSQkrTG",
        //       "authToken": "pSQctfITPgmOJ9mJf7hHK0trxPSTpqYBVonNzrP2uas"
        //     },
        //     "success": true
        // }
        if (responseData3.success) {
            return {
                success: true,
                data: {...responseData3.data, ...{username}},
            };
        }
        return {
            success: false,
            error: responseData3.error || 'getRCAuthToken unspecified in responseData3'
        };
    } catch (error) {
        console.error('getRCAuthToken error', error);
        return {
            success: false,
            error: 'getRCAuthToken unknown'
        };
    }
}


export async function getChatAuthToken(username = '') {

    // TODO Log request.

    try {
        const requestConfig = {
            headers: rocketChatAdminUserAuthHeaders,
        };

        const url1 = `${rocketChatApiUri}/users.info`;
        const responseData1 = (await axios.get(url1,
                {...requestConfig, ...{params: {username}}})).data;
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
            // User doesn't exist. Let's create a user.
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
            const responseData2 = (await axios.post(url2, data2, requestConfig)).data;
            if (responseData2.success) {
                return getRCAuthToken(username);
            }
            return {
                success: false,
                error: responseData2.error || 'getChatAuthToken unspecified in responseData2'
            };
        }
        return {
            success: false,
            error: responseData1.error || 'getChatAuthToken unspecified in responseData1'
        };

    } catch (error) {
        console.error('Error in getToken', error);
        return {
            success: false,
            error: 'getChatAuthToken unknown'
        };
    }
}


export default function useRocketChat(app) {
    const router = new Router();

    router.get('/chat/parking', async (ctx) => {
        ctx.body=`
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

    <div class="center-x">
        <h1>Chat</h1>
        <p>
            Please login to see chat
        </p>
    </div>

</body>
</html>
`;
    });

    router.get('/api/v1/chat/sso', async (ctx) => {
        console.log('Got request GET /api/v1/chat/sso');
        ctx.body = {
            status: 'ok',
        };
    });

    router.post('/api/v1/chat/sso', async (ctx) => {
        console.log('Got request POST /api/v1/chat/sso');

        ctx.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        ctx.set('Access-Control-Allow-Credentials', 'true');
        ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');

        ctx.body = {
            status: 'ok',
        };
    });

    router.get('/api/v1/chat/token', async (ctx) => {
        let result = {
            success: false,
            error: 'User is not logged in or user is logged in with unsupported method'
        };
        if (ctx.session.a) {
            result = await getChatAuthToken(ctx.session.a);
        } else if (ctx.session.externalUser && ctx.session.externalUser.system === 'hivesigner') {
            result = await getChatAuthToken(ctx.session.a);
        }
        ctx.body = result;
    });

    app.use(router.routes()).use(router.allowedMethods());
}

// async function test(username = '') {
//     const result = await getChatAuthToken(username);
//     console.log('result', result);
// }

// test('angala3');
