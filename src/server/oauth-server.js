import jwt from 'koa-jwt';
import { sign, verify, decode } from 'jsonwebtoken';
import koa_router from 'koa-router';
import auth from 'basic-auth';
import { assert } from 'koa/lib/context';
import config from 'config';

/**
 * Validates Oauth request parameter "client_id" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
const validateOauthRequestParameterClientId = (params) => {
    const oauthServerConfig = config.get('oauth_server');
    assert(params.has('client_id'), 400,
            'Parameter "client_id" is required');
    assert((oauthServerConfig.clients).has(params.get('client_id')), 400,
            'Parameter "client_id" does not match any registered clients');
};

/**
 * Validates Oauth request parameter "redirect_uri" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
const validateOauthRequestParameterRedirectUri = (params) => {
    const oauthServerConfig = config.get('oauth_server');
    assert(params.has('redirect_uri'), 400,
            'Parameter "redirect_uri" is required');
    assert((oauthServerConfig.clients[params.get('client_id')].redirect_uris).includes(params.get('redirect_uri')), 400,
            'Parameter "redirect_uri" does not match any registered redirected_uris');
};

/**
 * Validates Oauth request parameter "scope" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
const validateOauthRequestParameterScope = (params) => {
    assert(params.has('scope'), 400,
            'Parameter "scope" is required');
    assert(params.get('scope').trim().split(/ +/).includes('openid'), 400,
            'Parameter "scope" must contain string "openid"');
};

/**
 * Validates Oauth request parameter "response_type" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
const validateOauthRequestParameterResponseType = (params) => {
    assert(params.has('response_type'), 400,
            'Parameter "response_type" is required');
    assert(params.get('response_type') === 'code', 400,
            'Parameter "response_type" should be equal to string "code"');
};

/**
 * Validates Oauth request parameter "grant_type" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
const validateOauthRequestParameterGrantType = (params) => {
    assert(params.has('grant_type'), 400,
            'Parameter "grant_type" is required');
    assert(params.get('grant_type') === 'authorization_code', 400,
            'Parameter "grant_type" should be equal to string "authorization_code"');
};

/**
 * Validates Oauth request parameter "code" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
const validateOauthRequestParameterCode = (params) => {
    assert(params.has('code'), 400,
            'Parameter "code" is required');
    assert(params.get('code'), 400,
            'Parameter "code" must not be empty');
};


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

    // Custom 401 handling – expose jwt errors in response, but don't do
    // this on production.
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

        // Validate request search parameters.
        validateOauthRequestParameterClientId(params);
        validateOauthRequestParameterRedirectUri(params);
        validateOauthRequestParameterScope(params);
        validateOauthRequestParameterResponseType(params);

        if (ctx.session.a) {
            // When we have user in session,
            // redirect to client's redirect_uri with code.
            const expiresIn = 5 * 60;
            const scope = 'openid profile';
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
            const code = sign(payload, jwtSecret, jwtOptions);
            const responseParams = new URLSearchParams();
            responseParams.set('code', code);
            responseParams.set('state', params.get('state'));
            ctx.redirect(params.get('redirect_uri') + '?'
                    + responseParams.toString());
        } else {
            // Redirect to login page. After login user agent will be
            // redirected to this endpoint again, but a user will exist.
            params.set('redirect_to', '/oauth/authorize');
            ctx.redirect('/login.html?' + params.toString());
        }
    });

    publicRouter.post('/oauth/token', async (ctx) => {

        // Check basic auth.
        const client = auth(ctx);
        console.log('client', client);
        assert((oauthServerConfig.clients).has(client.name), 401,
            'Invalid user or password');
        assert(oauthServerConfig.clients[client.name].secret === client.pass,
            401, 'Invalid user or password');

        // Example request.body sent by openhive.chat {
        //     code: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InN0aXJsaXR6Iiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSIsImlhdCI6MTY3MzUyNzgzNiwiZXhwIjoxNjczNTI4MTM2LCJhdWQiOiJvcGVuaGl2ZS5jaGF0IiwiaXNzIjoiaGl2ZS5ibG9nIiwic3ViIjoic3RpcmxpdHoifQ.xSa9tJFhpGcv8VRzCeMNcad_NgrBQHjJForpbtXEyBE',
        //     redirect_uri: 'http://localhost:3000/_oauth/hiveblog',
        //     grant_type: 'authorization_code',
        //     state: 'eyJsb2dpblN0eWxlIjoicmVkaXJlY3QiLCJjcmVkZW50aWFsVG9rZW4iOiJwdm1DNG1HWjBPYV9KaDd1OW9hR1pTSkJXeTNRX1VRelN1elVDMDFKZXUyIiwiaXNDb3Jkb3ZhIjpmYWxzZSwicmVkaXJlY3RVcmwiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAvaG9tZSJ9'
        //   }

        // Validate request body.
        const params = new URLSearchParams(ctx.request.body);
        params.set('client_id', client.name);
        validateOauthRequestParameterClientId(params);
        validateOauthRequestParameterRedirectUri(params);
        validateOauthRequestParameterGrantType(params);
        validateOauthRequestParameterCode(params);

        // Verify code parameter sent by client in uri.
        let verifiedToken;
        try {
            verifiedToken = verify(ctx.request.body.code, jwtSecret,
                    { complete: true });
            // const verifiedToken = verify(ctx.request.body.code, Buffer.from(jwtSecret, 'base64'));
        } catch (error) {
            console.log('Invalid jwt token (code). Error: ', error.toString());
        }
        assert(verifiedToken, 400, 'Invalid parameter "code"');
        console.log('verifiedToken', verifiedToken);

        // TODO Validate JWT claims.


        // Output access_token
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
