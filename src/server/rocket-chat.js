import Router from 'koa-router';
import axios from 'axios';
import config from 'config';

export const rocketChatApiUri = `${config.get('openhive_chat_uri')}/api/v1`;
export const rocketChatAdminUserAuthHeaders = {
    'X-User-Id': config.get('openhive_chat_admin_user_id'),
    'X-Auth-Token': config.get('openhive_chat_admin_user_token'),
};

export async function checkIfUserExists(username = '') {
    const url = `${rocketChatApiUri}/users.info`;
    const requestConfig = {
        headers: rocketChatAdminUserAuthHeaders,
        params: {
            username
        },
    };
    let response;
    try {
        response = (await axios.post(url, {}, requestConfig)).data;
    } catch (error) {
        console.error('Error in checkIfUserExists', error);
        throw error;
    }
    if (response && response.success) {
        return response;
    }
}


export default function useRocketChat(app) {
    const router = new Router();

    router.get('/chat/sso', async (ctx) => {
        ctx.body = {
            status: 'ok',
        };
    });

    router.post('/chat/sso', async (ctx) => {
        ctx.body = {
            status: 'ok',
        };
    });

    router.get('/chat/token', async (ctx) => {

    });

    app.use(router.routes()).use(router.allowedMethods());
}
