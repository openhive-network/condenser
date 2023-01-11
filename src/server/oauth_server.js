import jwt from 'koa-jwt';
import { sign } from 'jsonwebtoken';
import koa_router from 'koa-router';
import config from 'config';

export default function useOauthServer(app) {
    const publicRouter = new koa_router();
    const privateRouter = new koa_router();
    privateRouter.use(jwt({ secret: 'shared-secret' }));

    const oauthServerConfig = config.get('oauth_server');
    console.log('bamboo app.oauthServerConfig', oauthServerConfig);

    const site_domain = config.get('site_domain');
    console.log('bamboo site_domain', site_domain);

    publicRouter.get('/oauth/authorize', async (ctx) => {
        const params = new URLSearchParams(ctx.URL.search);
        const date = new Date();
        console.log(`${date.toISOString()} Got request to /oauth/authorize`);
        console.log('request.body', ctx.request.body);
        console.log('response.body', ctx.response.body);
        console.log('ctx', ctx);

        if (!params.has('state') && !params.has('redirect_uri') && !params.has('scope')) {
            console.log('bamboo required parameters not found in search url');
            ctx.redirect('/');
            return;
        }

        ctx.redirect('/login.html?' + params.toString());
    });

    publicRouter.post('/oauth/token', async (ctx) => {

        //
        // TODO Check code parameter sent by client in uri.
        //

        const access_token = sign({ role: 'admin' }, 'shared-secret', {
            expiresIn: 300
          });
        const body = ctx.request.body;
        ctx.body = {
            state: body.state,

            // Can be JWT.
            // access_token: Math.random().toString(36).slice(2),
            access_token,

            expires_in: 60 * 60 * 12,
            // id_token should be JWT. Should contain user data and expire time.
            // id_token: 'angala-456',
            scope: 'login',
            token_type: 'Bearer',
        };
        ctx.status = 200;

        const date = new Date();
        console.log(`${date.toISOString()} Got request to /oauth/token`);
        console.log('request.body', ctx.request.body);
        console.log('response.body', ctx.response.body);
        console.log('ctx', ctx);
    });

    privateRouter.get('/oauth/userinfo', async (ctx) => {
        ctx.body = {
            email: 'wbarcik+stirlitz@syncad.com',
            email_verified: true,
            username: 'stirlitz',
            sid: "84c1b060-64ec-4ef3-bd50-1373fd6412573",
            sub: "8b0787d4-f750-44ab-8b98-d53545713e13"
        };
        ctx.status = 200;

        const date = new Date();
        console.log(`${date.toISOString()} Got request to /userinfo`);
        console.log('request.body', ctx.request.body);
        console.log('response.body', ctx.response.body);
        console.log('ctx', ctx);
    });

    app.use(publicRouter.routes()).use(publicRouter.allowedMethods());
    app.use(privateRouter.routes()).use(privateRouter.allowedMethods());

}
