/*global $STM_Config*/
import koa_router from 'koa-router';

const redirects = [
    // example: [/\/about(\d+)-(.+)/, '/about?$0:$1', 302],
    [/^\/recent\/?$/, '/created'],
    [/^\/pick_account.*/, 'https://signup.hive.io'],
    [/\/(@[\w.\d-]+)\/transfers/, `${$STM_Config.wallet_url}/$0/transfers`, 301],
    [/\/~witnesses/, `${$STM_Config.wallet_url}/~witnesses`, 301],
];

export default function useRedirects(app) {
    const router = koa_router();

    app.use(router.routes());

    redirects.forEach((redirectConfig) => {
        // eslint-disable-next-line require-yield
        router.get(redirectConfig[0], async (ctx) => {
            const dest = Object.keys(ctx.params).reduce((value, key) => {
                return value.replace('$' + key, ctx.params[key]);
            }, redirectConfig[1]);
            console.log(`server redirect: [${redirectConfig[0]}] ${ctx.request.url} -> ${dest}`);
            ctx.status = redirectConfig[2] || 301;
            ctx.redirect(dest);
        });
    });
}
