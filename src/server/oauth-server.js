import jwt from 'koa-jwt';
import { sign, verify } from 'jsonwebtoken';
import koa_router from 'koa-router';
import auth from 'basic-auth';
import { assert } from 'koa/lib/context';
import config from 'config';

//
// TODO In case of error oauth server should reponsd with redirection to
// redirect_uri with explanation of error.
//

/**
 * Validates Oauth request parameter "client_id" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterClientId(params) {
    // TODO In this case we should swallow error and reject request.
    const oauthServerConfig = config.get('oauth_server');
    assert(params.has('client_id'), 400,
            'Parameter "client_id" is required');
    assert((oauthServerConfig.clients).has(params.get('client_id')), 400,
            'Parameter "client_id" does not match any registered clients');
}

/**
 * Validates Oauth request parameter "redirect_uri" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterRedirectUri(params) {
    // TODO In this case we should swallow error and reject request.
    const oauthServerConfig = config.get('oauth_server');
    assert(params.has('redirect_uri'), 400,
            'Parameter "redirect_uri" is required');
    assert((oauthServerConfig.clients[params.get('client_id')].redirect_uris).includes(params.get('redirect_uri')), 400,
            'Parameter "redirect_uri" does not match any registered redirected_uris');
}

/**
 * Validates Oauth request parameter "scope" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterScope(params) {
    if (!params.has('scope')) {
        return {
            error_code: 'invalid_request',
            error_description: 'Missing required parameter "scope"',
        };
    }
    if (!params.get('scope').trim().split(/ +/).includes('openid')) {
        return {
            error_code: 'invalid_scope',
            error_description: 'Missing required string "openid" in "scope"',
        };
    }
    return null;
}

/**
 * Validates Oauth request parameter "response_type" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterResponseType(params) {
    if (!params.has('response_type')) {
        return {
            error_code: 'invalid_request',
            error_description: 'Missing required parameter "response_type"',
        };
    }
    if (!(params.get('response_type') === 'code')) {
        return {
            error_code: 'unsupported_response_type',
            error_description: 'Server does not support requested "response_type"',
        };
    }
    return null;
}

/**
 * Validates Oauth request parameter "grant_type" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterGrantType(params) {
    assert(params.has('grant_type'), 400,
            'Parameter "grant_type" is required');
    assert(params.get('grant_type') === 'authorization_code', 400,
            'Parameter "grant_type" should be equal to string "authorization_code"');
}

/**
 * Validates Oauth request parameter "code" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterCode(params) {
    assert(params.has('code'), 400,
            'Parameter "code" is required');
    assert(params.get('code'), 400,
            'Parameter "code" must not be empty');
}

function doOuathErrorRedirect(params, error, ctx) {
    const responseParams = new URLSearchParams(error);
    if (params.get('state')) {
        responseParams.set('state', params.get('state'));
    }
    ctx.redirect(params.get('redirect_uri') + '?' + responseParams.toString());
}


/**
 * A simple oauth server created ad hoc to handle login for
 * openhive.chat website. The server implements only [Authentication
 * using the Authorization Code
 * Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth).
 * See also [Error
 * Response](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.2.1).
 *
 * @export
 * @param {*} app: Koa
 */
export default function useOauthServer(app) {
    const publicRouter = new koa_router();
    const privateRouter = new koa_router();
    // TODO Is it safe to use server_session_secret here?
    const jwtSecret = config.get('server_session_secret');
    privateRouter.use(jwt({ secret: jwtSecret }));
    const oauthServerConfig = config.get('oauth_server');

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

        let validationError = validateOauthRequestParameterScope(params);
        if (validationError) {
            doOuathErrorRedirect(params, validationError, ctx);
            return;
        }

        validationError = validateOauthRequestParameterResponseType(params);
        if (validationError) {
            doOuathErrorRedirect(params, validationError, ctx);
            return;
        }

        if (ctx.session.a) {
            // When we have user in session,
            // redirect to client's redirect_uri with code.
            const expiresIn = 5 * 60;
            const scope = 'openid profile';
            const jwtOptions = {
                issuer: ctx.request.host,
                subject: ctx.session.a,
                audience: params.get('client_id'),
                expiresIn,
            };
            const payload = {
                username: ctx.session.a,
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
            // redirected to this endpoint again, but user should exist
            // in session then.
            params.set('redirect_to', '/oauth/authorize');
            ctx.redirect('/login.html?' + params.toString());
        }
    });

    publicRouter.post('/oauth/token', async (ctx) => {

        // TODO In case of error we should respond with application/json
        // media type with HTTP response code of 400

        // Check user and password in basic auth.
        const client = auth(ctx);
        assert((oauthServerConfig.clients).has(client.name), 401,
            'Invalid user or password');
        assert(oauthServerConfig.clients[client.name].secret === client.pass,
            401, 'Invalid user or password');

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
        } catch (error) {
            console.log('Invalid jwt token (code). Error: ', error.toString());
        }
        assert(verifiedToken, 400, 'Invalid parameter "code"');

        // Validate JWT claims.
        assert(verifiedToken.payload.iss === ctx.request.host, 401, 'Invalid jwt token issuer');
        assert(verifiedToken.payload.aud === params.get('client_id'), 401, 'Invalid jwt token audience');

        // Create and output access_token
        const expiresIn = 60 * 60;
        const scope = verifiedToken.payload.scope;
        const subject = verifiedToken.payload.sub;
        const audience = verifiedToken.payload.aud;
        const state = ctx.request.body.state;
        const issuer = ctx.request.host;

        const jwtOptions = {
            issuer,
            subject,
            audience,
            expiresIn,
        };
        const payload = {
            username: verifiedToken.payload.username,
            scope: verifiedToken.payload.scope,
        };
        const access_token = sign(payload, jwtSecret, jwtOptions);

        ctx.body = {
            state,
            access_token,
            expires_in: expiresIn,
            scope,
            token_type: 'Bearer',
        };
        ctx.status = 200;

        const date = new Date();
        console.log(`${date.toISOString()} Got request to /oauth/token`);
        console.log('ctx', ctx);
        console.log('verifiedToken', verifiedToken);
        console.log('request', ctx.request);
        console.log('request.body', ctx.request.body);
        console.log('response.body', ctx.response.body);
    });

    privateRouter.get('/oauth/userinfo', async (ctx) => {

        // ctx.state.user is a payload from jwt token
        assert(ctx.state.user.iss === ctx.request.host, 401, 'Invalid jwt token issuer');
        assert(Object.keys(oauthServerConfig.clients).includes(ctx.state.user.aud), 401, 'Invalid jwt token audience');

        ctx.body = {
            username: ctx.state.user.username,
            email: `${ctx.state.user.username}@openhive.chat`,
            email_verified: true,
            sub: ctx.state.user.username,
        };
        ctx.status = 200;

        const date = new Date();
        console.log(`${date.toISOString()} Got request to /userinfo`);
        console.log('ctx', ctx);
        console.log('ctx.state.user', ctx.state.user);
        console.log('request.body', ctx.request.body);
        console.log('response.body', ctx.response.body);
    });

    app.use(publicRouter.routes()).use(publicRouter.allowedMethods());
    app.use(privateRouter.routes()).use(privateRouter.allowedMethods());

}
