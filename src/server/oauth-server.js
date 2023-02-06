import jwt from 'koa-jwt';
import { sign, verify } from 'jsonwebtoken';
import Router from 'koa-router';
import auth from 'basic-auth';
import { assert } from 'koa/lib/context';
import { api } from '@hiveio/hive-js';
import config from 'config';

/**
 * @typedef OauthErrorMessage
 * @type {object}
 * @property {string} error
 * @property {string} error_description
 */


/**
 * Returns standard error message (object) for function validating
 * matching of required parameter.
 *
 * @export
 * @param {string} [parameter='']
 * @returns {OauthErrorMessage}
 */
export function getOauthErrorMessageParameterUnmatched(parameter = '') {
    const message = {
        error: 'invalid_request',
        error_description: `Parameter '${parameter}' `
                + "does not match any registered values",
    };
    return message;
}

/**
 * Returns standard error message (object) for function validating
 * existence of required parameter.
 *
 * @export
 * @param {string} [parameter='']
 * @returns {OauthErrorMessage}
 */
export function getOauthErrorMessageParameterMissing(parameter = '') {
    const message = {
        error: 'invalid_request',
        error_description: `Missing required parameter '${parameter}'`,
    };
    return message;
}

/**
 * Validate Oauth request parameter `client_id`.
 *
 * @param {URLSearchParams} params
 * @returns {null | OauthErrorMessage} Null when validation passes,
 * otherwise OauthErrorMessage
 */
export function validateOauthRequestParameterClientId(params) {
    const oauthServerConfig = config.get('oauth_server');
    const parameter = 'client_id';
    if (!params.has(parameter)) {
        return getOauthErrorMessageParameterMissing(parameter);
    }
    if (!(oauthServerConfig.clients).has(params.get(parameter))) {
        return getOauthErrorMessageParameterUnmatched(parameter);
    }
    return null;
}

/**
 * Validate Oauth request parameter `redirect_uri`.
 *
 * @param {URLSearchParams} params
 * @returns {null | OauthErrorMessage} Null when validation passes,
 * otherwise OauthErrorMessage
 */
export function validateOauthRequestParameterRedirectUri(params) {
    const oauthServerConfig = config.get('oauth_server');
    const parameter = 'redirect_uri';
    if (!params.has(parameter)) {
        return getOauthErrorMessageParameterMissing(parameter);
    }
    if (!(oauthServerConfig
                .clients[params.get('client_id')]
                .redirect_uris)
                .includes(params.get(parameter))
                ) {
        return getOauthErrorMessageParameterUnmatched(parameter);
    }
    return null;
}

/**
 * Validate Oauth request parameter `scope`.
 *
 * @param {URLSearchParams} params
 * @returns {null | OauthErrorMessage} Null when validation passes,
 * otherwise OauthErrorMessage
 */
export function validateOauthRequestParameterScope(params) {
    const parameter = 'scope';
    if (!params.has(parameter)) {
        return getOauthErrorMessageParameterMissing(parameter);
    }

    const requestedScope = params.get(parameter).trim().split(/ +/);

    if (!requestedScope.includes('openid')) {
        return {
            error: 'invalid_scope',
            error_description: `Missing required string 'openid' in '${parameter}'`,
        };
    }

    const allowedScope = (config.get('oauth_server'))
            .clients[params.get('client_id')][parameter];
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
 * Validate Oauth request parameter `response_type`.
 *
 * @param {URLSearchParams} params
 * @returns {null | OauthErrorMessage} Null when validation passes,
 * otherwise OauthErrorMessage
 */
export function validateOauthRequestParameterResponseType(params) {
    const parameter = 'response_type';
    if (!params.has(parameter)) {
        return getOauthErrorMessageParameterMissing(parameter);
    }
    if (!(params.get(parameter) === 'code')) {
        return {
            error: 'unsupported_response_type',
            error_description: `Server does not support requested '${parameter}'`,
        };
    }
    return null;
}

/**
 * Validate Oauth request parameter `grant_type`.
 *
 * @param {URLSearchParams} params
 * @returns {null | OauthErrorMessage} Null when validation passes,
 * otherwise OauthErrorMessage
 */
export function validateOauthRequestParameterGrantType(params) {
    const parameter = 'grant_type';
    if (!params.has(parameter)) {
        return getOauthErrorMessageParameterMissing(parameter);
    }
    if (!(params.get(parameter) === 'authorization_code')) {
        return {
            error: 'invalid_request',
            error_description: `Server does not support requested '${parameter}'`,
        };
    }
    return null;
}

/**
 * Validate Oauth request parameter `code`.
 *
 * @param {URLSearchParams} params
 * @returns {null | OauthErrorMessage} Null when validation passes,
 * otherwise OauthErrorMessage
 */
export function validateOauthRequestParameterCode(params) {
    const parameter = 'code';
    if (!params.has(parameter)) {
        return getOauthErrorMessageParameterMissing(parameter);
    }
    if (!params.get(parameter)) {
        return {
            error: 'invalid_request',
            error_description: `Parameter '${parameter}' must not be empty`,
        };
    }
    return null;
}

/**
 * Redirects user agent to `redirect_uri`, in case of error in Oauth
 * request.
 *
 * @param {URLSearchParams} params
 * @param {OauthErrorMessage} error
 * @param {Object} ctx
 * @param {boolean} doRedirect
 * @returns {string}
 */
export function ouathErrorRedirect(params, error, ctx, doRedirect = true) {
    const responseParams = new URLSearchParams(error);
    if (params.get('state')) {
        responseParams.set('state', params.get('state'));
    }
    const redirectTo = params.get('redirect_uri') + '?'
            + responseParams.toString();
    if (doRedirect) {
        ctx.redirect(redirectTo);
    }

    const date = new Date();
    console.log(`${date.toISOString()} doing ouathErrorRedirect`);
    console.log('request.body', ctx.request.body);
    console.log('response.body', ctx.response.body);
    console.log('ctx', ctx);

    return redirectTo;

}

/**
 * Get Hive user's profile data from posting_json_metadata. Then output
 * properties as standard or custom id_token jwt claims.
 *
 * @param {String} hiveUsername
 * @returns {Promise<Object>}
 */
export async function getHiveUserProfile(hiveUsername) {
    const hiveUserProfile = {};

    //
    // Add fake email, to allow changing User Profile in Rocket Chat.
    // Not needed, when
    // [patch](https://github.com/RocketChat/Rocket.Chat/pull/22438/files)
    // has been applied in Rocket Chat.
    //

    // hiveUserProfile.email = `${hiveUsername}@openhive.chat`;
    // hiveUserProfile.email_verified = true;

    // Add other properties to user profile.
    try {
        const [chainAccount] = await api.getAccountsAsync([hiveUsername]);
        if (!chainAccount) {
            console.error(
                'gethiveUserProfile error: missing blockchain account',
                hiveUsername
                );
            return hiveUserProfile;
        }

        if (Object.prototype.hasOwnProperty
                .call(chainAccount, 'posting_json_metadata')) {
            const postingJsonMetadata = JSON.parse(
                    chainAccount.posting_json_metadata
                    );
            if (Object.prototype.hasOwnProperty
                    .call(postingJsonMetadata, 'profile')) {

                if (Object.prototype.hasOwnProperty
                        .call(postingJsonMetadata.profile, 'name')) {
                    hiveUserProfile.name = postingJsonMetadata.profile.name;
                }

                // The property `profile_image` is read in Rocket
                // Chat on each login, but changes don't cause
                // changing existing avatar. However a new image is
                // addded to the list of available avatars in Rocket
                // Chat.
                if (Object.prototype.hasOwnProperty
                        .call(postingJsonMetadata.profile, 'profile_image')) {
                    hiveUserProfile.picture = postingJsonMetadata
                            .profile.profile_image;
                }

                // The property `website` does nothing in Rocket
                // Chat – there's not such field there.
                if (Object.prototype.hasOwnProperty
                        .call(postingJsonMetadata.profile, 'website')) {
                    hiveUserProfile.website = postingJsonMetadata
                            .profile.website;
                }
            }
        }

        // TODO We can also try to read profile from
        // chainAccount.json_metadata, when
        // chainAccount.posting_json_metadata doesn't exist.

    } catch (error) {
        console.error('gethiveUserProfile error', error);
    }
    return hiveUserProfile;
}


/**
 * Oauth server module created to handle login for openhive.chat
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
 * @param {Object} app Koa application
 */
export default function oauthServer(app) {

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
    const publicRouter = new Router();
    const privateRouter = new Router();
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
        console.log('ctx.session', ctx.session);
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

        // We redirect user to the page telling that user should logout
        // from unsupported external system and retry doinglogin via
        // supported method.
        if (ctx.session.externalUser
                && ctx.session.externalUser.system !== 'hivesigner') {
            validationError = {
                error: 'temporarily_unavailable',
                error_description:
                    "User is logged in via unsupported external system now. "
                    + "Server cannot continue Oauth flow."
            };
        const redirectTo = ouathErrorRedirect(params, validationError, ctx, false);
        ctx.body=`
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/ico" href="/favicon.ico" />
    <title>Oauth Flow Error - hive.blog</title>

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

        #countdown {
            font-weight: bold;
            color: red;
        }
    </style>

    <script>

        var timeleft = 10;
        var downloadTimer = setInterval(function(){
            if(timeleft <= 0){
                clearInterval(downloadTimer);
                document.getElementById("countdown").innerHTML = "0 seconds";
                window.location.replace("${redirectTo}");
            } else {
                document.getElementById("countdown").innerHTML = timeleft + " seconds";
            }
            timeleft -= 1;
        }, 1000);

    </script>

</head>

<body>

    <div class="center-x">
        <h1>Oauth Flow Error</h1>
        <p>
            We cannot continue Oauth flow for application
            ${oauthServerConfig.clients[params.get('client_id')].name}, because
            you're logged in via unsupported method in Hive Blog.
        </p>
        <p>
            Please do logout in application <a href="/" target="_blank">Hive Blog</a>
            and try again.
        </p>
        <p>
            We'll redirect you back to application
            <a href="${redirectTo}">${oauthServerConfig.clients[params.get('client_id')].name}</a>
            in <span id="countdown"></span>.
        </p>
    </div>

</body>
</html>
`;
            return;
        }

        // Final response, when everything is OK.
        if (ctx.session.a
                || (
                    ctx.session.externalUser
                    && ctx.session.externalUser.system === 'hivesigner'
                )
                ) {
            // When we have user in session,
            // redirect to client's redirect_uri with "code".
            const expiresIn = 60 * 5;
            const scope = 'openid profile';
            const jwtOptions = {
                issuer: ctx.request.host,
                subject: ctx.session.a || ctx.session.externalUser.user,
                audience: params.get('client_id'),
                expiresIn,
            };
            const payload = {
                username: ctx.session.a || ctx.session.externalUser.user,
                scope,
                redirect_uri: params.get('redirect_uri'),
            };
            const code = sign(payload, jwtSecret, jwtOptions);
            const responseParams = new URLSearchParams();
            responseParams.set('code', code);
            responseParams.set('state', params.get('state'));
            ctx.redirect(params.get('redirect_uri') + '?'
                    + responseParams.toString());
            return;
        }

        // When we're here, we have no user in application, so we need
        // to redirect to login page. After login user agent will be
        // redirected to this endpoint again, but user should exist in
        // session then.
        params.set('redirect_to', '/oauth/authorize');
        params.set('client_name',
                oauthServerConfig.clients[params.get('client_id')].name);
        ctx.redirect('/login.html?' + params.toString());
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

        // Not required here, but doesn't hurt.
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

        // Verify code parameter sent by client.
        let verifiedCode;
        try {
            verifiedCode = verify(ctx.request.body.code, jwtSecret,
                    { complete: true });
        } catch (error) {
            const error_description = `Invalid jwt token (code). ${error.toString()}`;
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

        if (verifiedCode.payload.redirect_uri
                    !== params.get('redirect_uri')) {
            ctx.status = 400;
            ctx.body = {
                error: 'invalid_request',
                error_description: "Invalid parameter redirect_uri",
            };
            return;
        }

        // Create and output access_token and id_token.

        const expiresIn = 60 * 5;
        const scope = verifiedCode.payload.scope;
        const subject = verifiedCode.payload.sub;
        const audience = verifiedCode.payload.aud;
        const state = ctx.request.body.state;
        const issuer = ctx.request.host;

        const access_token_jwtOptions = {
            issuer,
            subject,
            audience,
            expiresIn,
        };
        const access_token_payload = {
            username: verifiedCode.payload.username,
            scope: verifiedCode.payload.scope,
        };
        const access_token = sign(access_token_payload, jwtSecret,
                access_token_jwtOptions);

        const id_token_jwtOptions = {
            issuer,
            subject,
            audience,
            expiresIn: 60 * 60,
        };
        const hiveUserProfile = await getHiveUserProfile(verifiedCode.payload.username);
        const id_token_payload_simple = {
            username: verifiedCode.payload.username,
        };
        const id_token_payload = {...id_token_payload_simple, ...hiveUserProfile};
        const id_token = sign(id_token_payload, jwtSecret,
                id_token_jwtOptions);

        ctx.body = {
            state,
            id_token,
            access_token,
            expires_in: expiresIn,
            scope,
            token_type: 'Bearer',
        };
        ctx.status = 200;

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

        const body = {
            username: ctx.state.user.username,
            sub: ctx.state.user.username,
        };

        const hiveUserProfile = await getHiveUserProfile(ctx.state.user.sub);

        console.log('hiveUserProfile', hiveUserProfile);

        ctx.body = {...body, ...hiveUserProfile};
        ctx.status = 200;

    });

    app.use(publicRouter.routes()).use(publicRouter.allowedMethods());
    app.use(privateRouter.routes()).use(privateRouter.allowedMethods());

}
