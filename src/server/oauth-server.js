import jwt from 'koa-jwt';
import { sign, verify } from 'jsonwebtoken';
import koa_router from 'koa-router';
import auth from 'basic-auth';
import { assert } from 'koa/lib/context';
import { api } from '@hiveio/hive-js';
import config from 'config';

/**
 * Validates Oauth request parameter "client_id" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterClientId(params) {
    const oauthServerConfig = config.get('oauth_server');
    if (!params.has('client_id')) {
        return {
            error: 'invalid_request',
            error_description: "Missing required parameter 'client_id'",
        };
    }
    if (!(oauthServerConfig.clients).has(params.get('client_id'))) {
        return {
            error: 'invalid_request',
            error_description: "Missing required parameter 'client_id'",
        };
    }
    return null;
}

/**
 * Validates Oauth request parameter "redirect_uri" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterRedirectUri(params) {
    const oauthServerConfig = config.get('oauth_server');
    if (!params.has('redirect_uri')) {
        return {
            error: 'invalid_request',
            error_description: "Missing required parameter 'redirect_uri'",
        };
    }
    if (!(oauthServerConfig.clients[params.get('client_id')].redirect_uris)
            .includes(params.get('redirect_uri'))) {
        return {
            error: 'invalid_request',
            error_description: "Parameter 'redirect_uri' does not match any registered 'redirected_uris'",
        };
    }
    return null;
}

/**
 * Validates Oauth request parameter "scope" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterScope(params) {
    if (!params.has('scope')) {
        return {
            error: 'invalid_request',
            error_description: "Missing required parameter 'scope'",
        };
    }

    const requestedScope = params.get('scope').trim().split(/ +/);
    if (!requestedScope.includes('openid')) {
        return {
            error: 'invalid_scope',
            error_description: "Missing required string 'openid' in 'scope'",
        };
    }

    const allowedScope = (config.get('oauth_server'))
            .clients[params.get('client_id')].scope;
    for (const scope of requestedScope) {
        if (!allowedScope.includes(scope)) {
            return {
                error: 'invalid_scope',
                error_description: `Scope '${scope}' is not allowed`,
            };
        }
    }

    return null;
}

/**
 * Validates Oauth request parameter "response_type" in url search
 * string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterResponseType(params) {
    if (!params.has('response_type')) {
        return {
            error: 'invalid_request',
            error_description: "Missing required parameter 'response_type'",
        };
    }
    if (!(params.get('response_type') === 'code')) {
        return {
            error: 'unsupported_response_type',
            error_description: "Server does not support requested 'response_type'",
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
    if (!params.has('grant_type')) {
        return {
            error: 'invalid_request',
            error_description: "Missing required parameter 'grant_type'",
        };
    }
    if (!(params.get('grant_type') === 'authorization_code')) {
        return {
            error: 'invalid_request',
            error_description: "Server does not support requested 'grant_type'",
        };
    }
    return null;
}

/**
 * Validates Oauth request parameter "code" in url search string.
 *
 * @param {*} params: URLSearchParams
 */
function validateOauthRequestParameterCode(params) {
    if (!params.has('code')) {
        return {
            error: 'invalid_request',
            error_description: "Missing required parameter 'code'",
        };
    }
    if (!params.get('code')) {
        return {
            error: 'invalid_request',
            error_description: "Parameter 'code' must not be empty",
        };
    }
    return null;
}

function ouathErrorRedirect(params, error, ctx) {
    const responseParams = new URLSearchParams(error);
    if (params.get('state')) {
        responseParams.set('state', params.get('state'));
    }
    ctx.redirect(params.get('redirect_uri') + '?'
            + responseParams.toString());
}


/**
 * A simple oauth server created only to handle login for openhive.chat
 * website. The server implements only [Authentication using the
 * Authorization Code
 * Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth).
 * See also [Error
 * Response](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.2.1).
 *
 * Warning: this server does not comply to all rules specified at
 * https://openid.net/specs/openid-connect-core-1_0.
 *
 * @export
 * @param {*} app: Koa
 */
export default function useOauthServer(app) {

    //
    // jwtSecret should be 256 bit length. You can generate it this way,
    // for instance:
    // ```
    // const crypto = require('crypto');
    // crypto.randomBytes(32).toString('base64');
    // ```
    //
    const jwtSecret = config.get('server_session_secret');

    const oauthServerConfig = config.get('oauth_server');
    const publicRouter = new koa_router();
    const privateRouter = new koa_router();
    privateRouter.use(jwt({ secret: jwtSecret }));

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

    // Authorization endpoint.
    publicRouter.get('/oauth/authorize', async (ctx) => {
        const params = new URLSearchParams(ctx.URL.search);

        const date = new Date();
        console.log(`${date.toISOString()} Got request to /oauth/authorize`);
        console.log('request.body', ctx.request.body);
        console.log('response.body', ctx.response.body);
        console.log('ctx', ctx);

        // Validate request parameters.
        let validationError = validateOauthRequestParameterClientId(params);
        if (validationError) {
            ctx.body = validationError;
            return;
        }

        validationError = validateOauthRequestParameterRedirectUri(params);
        if (validationError) {
            ctx.body = validationError;
            return;
        }

        validationError = validateOauthRequestParameterScope(params);
        if (validationError) {
            ouathErrorRedirect(params, validationError, ctx);
            return;
        }

        validationError = validateOauthRequestParameterResponseType(params);
        if (validationError) {
            ouathErrorRedirect(params, validationError, ctx);
            return;
        }

        // Response.
        ctx.session.a = 'stirlitz';
        if (ctx.session.a) {
            // When we have user in session,
            // redirect to client's redirect_uri with "code".
            const expiresIn = 60 * 5;
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
                redirect_uri: params.get('redirect_uri'),
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

    // Token endpoint.
    publicRouter.post('/oauth/token', async (ctx) => {

        // Check user and password in basic auth.
        const client = auth(ctx);
        assert((oauthServerConfig.clients).has(client.name), 401);
        assert(oauthServerConfig.clients[client.name].secret === client.pass, 401);

        // Validate request body.
        const params = new URLSearchParams(ctx.request.body);
        params.set('client_id', client.name);

        let validationError = validateOauthRequestParameterClientId(params);
        if (validationError) {
            ctx.status = 400;
            ctx.body = validationError;
            return;
        }

        // Not needed, but doesn't hurt.
        validationError = validateOauthRequestParameterRedirectUri(params);
        if (validationError) {
            ctx.status = 400;
            ctx.body = validationError;
            return;
        }

        validationError = validateOauthRequestParameterGrantType(params);
        if (validationError) {
            ctx.status = 400;
            ctx.body = validationError;
            return;
        }

        validationError = validateOauthRequestParameterCode(params);
        if (validationError) {
            ctx.status = 400;
            ctx.body = validationError;
            return;
        }

        // Verify code parameter sent by client in uri.
        let verifiedCode;
        try {
            verifiedCode = verify(ctx.request.body.code, jwtSecret,
                    { complete: true });
        } catch (error) {
            const error_description = `Invalid jwt token (code). ${error.toString()}`;
            console.log(error_description);
            ctx.status = 400;
            ctx.body = {
                error: 'invalid_request',
                error_description,
            };
            return;
        }

        // Validate JWT claims.
        if (verifiedCode.payload.iss !== ctx.request.host) {
            ctx.status = 400;
            ctx.body = {
                error: 'invalid_request',
                error_description: "Invalid jwt token (code) issuer",
            };
            return;
        }

        if (verifiedCode.payload.aud !== params.get('client_id')) {
            ctx.status = 400;
            ctx.body = {
                error: 'invalid_request',
                error_description: "Invalid jwt token (code) audience",
            };
            return;
        }

        if (verifiedCode.payload.redirect_uri !== params.get('redirect_uri')) {
            ctx.status = 400;
            ctx.body = {
                error: 'invalid_request',
                error_description: "Invalid parameter redirect_uri",
            };
            return;
        }

        // Create and output access_token and id_token.

        const expiresIn = 60 * 60;
        const scope = verifiedCode.payload.scope;
        const subject = verifiedCode.payload.sub;
        const audience = verifiedCode.payload.aud;
        const state = ctx.request.body.state;
        const issuer = ctx.request.host;

        const access_token_jwtOptions = {
            issuer,
            subject,
            audience,
            expiresIn: 60 * 5,
        };
        const access_token_payload = {
            username: verifiedCode.payload.username,
            scope: verifiedCode.payload.scope,
        };
        const access_token = sign(access_token_payload, jwtSecret, access_token_jwtOptions);

        const id_token_jwtOptions = {
            issuer,
            subject,
            audience,
            expiresIn: 60 * 60 * 12,
        };
        const id_token_payload = {
            username: verifiedCode.payload.username,
        };
        const id_token = sign(id_token_payload, jwtSecret, id_token_jwtOptions);

        ctx.body = {
            state,
            id_token,
            access_token,
            expires_in: expiresIn,
            scope,
            token_type: 'Bearer',
        };
        ctx.status = 200;

        const date = new Date();
        console.log(`${date.toISOString()} Got request to /oauth/token`);
        console.log('ctx', ctx);
        console.log('verifiedCode', verifiedCode);
        console.log('request', ctx.request);
        console.log('request.body', ctx.request.body);
        console.log('response.body', ctx.response.body);
    });

    // Userinfo endpoint.
    privateRouter.get('/oauth/userinfo', async (ctx) => {

        // ctx.state.user is a payload from jwt token

        if (ctx.state.user.iss !== ctx.request.host) {
            ctx.status = 401;
            ctx.body = {
                error: 'invalid_request',
                error_description: "Invalid jwt token (bearer) issuer",
            };
            return;
        }

        if (!Object.keys(oauthServerConfig.clients).includes(ctx.state.user.aud)) {
            ctx.status = 401;
            ctx.body = {
                error: 'invalid_request',
                error_description: "Invalid jwt token (bearer) audience",
            };
            return;
        }

        //
        // TODO Get user's profile data from posting_json_metadata, see
        // https://hiveblocks.com/@gandalf. Then use that data to
        // improve response here.
        //
        const [chainAccount] = await api.getAccountsAsync([ctx.state.user.sub]);
        if (!chainAccount) {
            console.error('missing blockchain account', ctx.state.user.sub);
        }
        console.log('chainAccount', chainAccount);

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
