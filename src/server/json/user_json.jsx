import koa_router from 'koa-router';
import { routeRegex } from 'app/ResolveRoute';
import { api } from '@hiveio/hive-js';
import GDPRUserList from 'app/utils/GDPRUserList';

export default function useUserJson(app) {
    const router = koa_router();
    app.use(router.routes());

    router.get(routeRegex.UserJson, async (ctx) => {
        // validate and build user details in JSON
        const user_name = ctx.url.match(routeRegex.UserJson)[1].replace('@', '');
        let user = '';
        let status = '';

        const [chainAccount] = await api.getAccountsAsync([user_name]);

        if (GDPRUserList.includes(user_name)) {
            user = 'Content unavailable';
            status = '451';
        } else if (chainAccount) {
            user = chainAccount;
            try {
                user.json_metadata = JSON.parse(user.json_metadata);
            } catch (e) {
                user.json_metadata = '';
            }
            status = '200';
        } else {
            user = 'No account found';
            status = '404';
        }
        // return response and status code
        ctx.body = { user, status };
    });
}
