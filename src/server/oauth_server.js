import jwt from 'koa-jwt';
import { sign, verify, decode } from 'jsonwebtoken';
import koa_router from 'koa-router';
import config from 'config';

export default function useOauthServer(app) {
    const publicRouter = new koa_router();
    const privateRouter = new koa_router();
    // TODO Is it safe to use server_session_secret here?
    const jwtSecret = config.get('server_session_secret');
    privateRouter.use(jwt({ secret: jwtSecret }));

    const oauthServerConfig = config.get('oauth_server');
    console.log('bamboo app.oauthServerConfig', oauthServerConfig);

    const site_domain = config.get('site_domain');
    console.log('bamboo site_domain', site_domain);

    // Custom 401 handling – expose jwt errors in response.
    // Don't enable this on production.
    if (process.env.NODE_ENV === 'development') {
        app.use(async (ctx, next) => {
            return next().catch((err) => {
                if (err.status === 401) {
                    ctx.status = 401;
                    const errMessage = err.originalError
                        ? err.originalError.message
                        : err.message;
                    ctx.body = {
                        error: errMessage
                    };
                    ctx.set("X-Status-Reason", errMessage);
                } else {
                    throw err;
                }
            });
        });
    }

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

        const expiresIn = 60 * 60;
        const scope = 'openid profile';
        const state = ctx.request.body.state;

        const jwtOptions = {
            issuer: 'hive.blog',
            subject: 'stirlitz',
            audience: 'openhive.chat',
            expiresIn,
        };
        const payload = {
            username: 'stirlitz',
            scope,
        };
        const access_token = sign(payload, jwtSecret, jwtOptions);

        ctx.body = {
            state,

            // Can be JWT.
            // access_token: Math.random().toString(36).slice(2),
            access_token,

            expires_in: expiresIn,

            // id_token should be JWT. Should contain user data and expire time.
            // id_token: 'angala-456',

            scope,
            token_type: 'Bearer',
        };
        ctx.status = 200;

        const date = new Date();
        console.log(`${date.toISOString()} Got request to /oauth/token`);
        console.log('request', ctx.request);
        console.log('request.body', ctx.request.body);
        console.log('response.body', ctx.response.body);
        console.log('ctx', ctx);
    });

    privateRouter.get('/oauth/userinfo', async (ctx) => {

        console.log('bamboo ctx.state', ctx.state);

        const token = ctx.request.header.authorization
            ? ctx.request.header.authorization.trim().split(' ').pop()
            : '';
        console.log('token', token);

        const decodedToken = decode(token, { complete: true });
        console.log('decodedToken', decodedToken);

        const verifiedToken = verify(token, jwtSecret, { complete: true });
        // const verifiedToken = verify(token, Buffer.from(jwtSecret, 'base64'));
        console.log('verifiedToken', verifiedToken);

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
