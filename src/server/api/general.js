/*eslint no-underscore-dangle: "warn"*/
import koa_router from 'koa-router';
import Joi from 'joi';
import config from 'config';
import { assert } from 'koa/lib/context';
import { getRemoteIp, rateLimitReq } from 'server/utils/misc';
import coBody from 'co-body';
import Mixpanel from 'mixpanel';
import { PublicKey, Signature, hash } from '@hiveio/hive-js/lib/auth/ecc';
import { api } from '@hiveio/hive-js';
import { getChatAuthToken } from '../rocket-chat';

const RE_EXTERNAL_USER_SYSTEM = /^(hiveauth|hivesigner|keychain)$/;

const axios = require('axios').default;

const mixpanel = config.get('mixpanel') ? Mixpanel.init(config.get('mixpanel')) : null;

// eslint-disable-next-line no-underscore-dangle
const _stringval = (v) => (typeof v === 'string' ? v : JSON.stringify(v));

// eslint-disable-next-line no-underscore-dangle
const _parse = (params) => {
    if (typeof params === 'string') {
        try {
            return JSON.parse(params);
        } catch (error) {
            console.error('json_parse', error, params);
            return {};
        }
    } else {
        return params;
    }
};

function logRequest(path, ctx, extra) {
    const d = { ip: getRemoteIp(ctx.request) };
    if (ctx.session) {
        if (ctx.session.user) {
            d.user = ctx.session.user;
        }
        if (ctx.session.uid) {
            d.uid = ctx.session.uid;
        }
        if (ctx.session.a) {
            d.account = ctx.session.a;
        }
        if (ctx.session.externalUser) {
            d.externalUser_user = ctx.session.externalUser.user;
            d.externalUser_system = ctx.session.externalUser.system;
        }
    }
    if (extra) {
        Object.keys(extra).forEach((k) => {
            const nk = d[k] ? '_' + k : k;
            d[nk] = extra[k];
        });
    }
    const info = Object.keys(d)
        .map((k) => `${k}=${_stringval(d[k])}`)
        .join(' ');
    console.log(`-- /${path} --> ${info}`);
}

export default function useGeneralApi(app) {
    const router = new koa_router({ prefix: '/api/v1' });
    app.use(router.routes());

    router.post('/login_account', async (ctx) => {

        // if (rateLimitReq(this, this.req)) return;

        // Validate request body.
        // TODO Validation rules below should be stricter.
        const schema = Joi.object({
            _csrf: Joi.string().required(),
            account: Joi.string().required(),
            signatures: Joi.object().keys({
                posting: Joi.string()
            }),
            externalUser: Joi.object().keys({
                system: Joi.string().required().allow('')
                        .pattern(RE_EXTERNAL_USER_SYSTEM),
                hivesignerToken: Joi.string().allow('')
            })
        });
        const validationResult = schema.validate(_parse(ctx.request.body));
        assert(!validationResult.error, 401, 'Invalid params');

        const { account, signatures, externalUser } = validationResult.value;
        logRequest('login_account', ctx, { account });
        let loginType = 'login';
        try {
            if (signatures && Object.keys(signatures).length > 0) {
                if (!ctx.session.login_challenge) {
                    console.error('/login_account missing this.session.login_challenge');
                } else {
                    const [chainAccount] = await api.getAccountsAsync([account]);
                    if (!chainAccount) {
                        console.error('/login_account missing blockchain account',
                                account);
                    } else {
                        const auth = { posting: false };
                        const bufSha = hash.sha256(
                            JSON.stringify({ token: ctx.session.login_challenge }, null, 0)
                            );
                        const verify = (type, sigHex, pubkey, weight, weight_threshold) => {
                            if (!sigHex) return;
                            if (weight !== 1 || weight_threshold !== 1) {
                                console.error(
                                    `/login_account login_challenge unsupported ${type} auth configuration: ${account}`
                                );
                            } else {
                                const sig = parseSig(sigHex);
                                const public_key = PublicKey.fromString(pubkey);
                                const verified = sig.verifyHash(bufSha, public_key);
                                if (!verified) {
                                    console.error(
                                        '/login_account verification failed',
                                        ctx.session.uid,
                                        account,
                                        pubkey
                                    );
                                }
                                auth[type] = verified;
                            }
                        };
                        const {
                            posting: {
                                key_auths: [[posting_pubkey, weight]],
                                weight_threshold,
                            },
                        } = chainAccount;
                        verify('posting', signatures.posting,
                                posting_pubkey, weight, weight_threshold);
                        if (ctx.session.a === account) loginType = 'resume';
                        if (auth.posting) ctx.session.a = account;
                    }
                }
            } else if (externalUser && externalUser.system === 'hivesigner') {
                try {
                    const headers = {
                        Accept: 'application/json',
                        Authorization: externalUser.hivesignerToken,
                    };
                    const response = await axios.get(
                            'https://hivesigner.com/api/me',
                            {
                                headers,
                                timeout: 1000 * 30,
                            }
                        );
                    if (ctx.session.externalUser?.user === account) loginType = 'resume';
                    if (response.data.user === account) {
                        ctx.session.externalUser = { ...{user: account}, ...externalUser};
                    }
                } catch (error) {
                    console.error(`Got error, not setting session.externalUser for ${account}`, error);
                }
            } else {
                if (ctx.session.externalUser?.user === account) loginType = 'resume';
                ctx.session.externalUser = { ...{user: account}, ...externalUser};
            }

            ctx.body = {
                status: 'ok',
                loginType,
            };

            // Add auth token for chat to response.
            if (config.get('openhive_chat_iframe_integration_enable') === 'yes') {
                let result = {};
                if (ctx.session.a) {
                    result = await getChatAuthToken(ctx.session.a);
                } else if (ctx.session.externalUser && ctx.session.externalUser.system === 'hivesigner') {
                    result = await getChatAuthToken(ctx.session.externalUser.user);
                }
                if (result.success) {
                    ctx.body.chatAuthToken = result.data.authToken;
                }
            }

            const remote_ip = getRemoteIp(ctx.request);
            if (mixpanel) {
                mixpanel.people.set(ctx.session.uid, {
                    ip: remote_ip,
                    $ip: remote_ip,
                });
                mixpanel.people.increment(ctx.session.uid, 'Logins', 1);
            }
        } catch (error) {
            console.error('Error in /login_account api call', ctx.session.uid, error.message);
            ctx.body = JSON.stringify({
                error: error.message,
            });
            ctx.status = 500;
        }
    });

    router.post('/logout_account', async (ctx) => {
        // logout maybe immediately followed with login_attempt event
        // if (rateLimitReq(this, this.req)) return;

        logRequest('logout_account', ctx);
        try {
            ctx.session.a = null;
            ctx.session.externalUser = null;
            ctx.session.oauthConsents = null;
            ctx.body = JSON.stringify({ status: 'ok' });
        } catch (error) {
            console.error('Error in /logout_account api call', ctx.session.uid, error);
            ctx.body = JSON.stringify({ error: error.message });
            ctx.status = 500;
        }
    });

    router.post('/csp_violation', async (ctx) => {
        if (rateLimitReq(ctx, ctx.request)) return;
        let params;
        try {
            params = await coBody(ctx);
        } catch (error) {
            console.log('-- /csp_violation error -->', error);
        }
        if (params && params['csp-report']) {
            const csp_report = params['csp-report'];
            const value = `${csp_report['document-uri']} : ${csp_report['blocked-uri']}`;
            console.log('-- /csp_violation -->', value, '--',
                    ctx.request.headers['user-agent']);
        } else {
            console.log('-- /csp_violation [no csp-report] -->', params,
                    '--', ctx.request.headers['user-agent']);
        }
        ctx.body = '';
    });

    router.post('/setUserPreferences', async (ctx) => {
        const params = ctx.request.body;
        const { payload } = _parse(params);
        console.log('-- /setUserPreferences -->', ctx.session.user,
                ctx.session.uid, payload);
        if (!ctx.session.a) {
            ctx.body = 'missing logged in account';
            ctx.status = 500;
            return;
        }
        try {
            const json = JSON.stringify(payload);
            if (json.length > 1024) throw new Error('the data is too long');
            ctx.session.user_prefs = json;
            ctx.body = JSON.stringify({ status: 'ok' });
        } catch (error) {
            console.error('Error in /setUserPreferences api call',
                    ctx.session.uid, error);
            ctx.body = JSON.stringify({ error: error.message });
            ctx.status = 500;
        }
    });

    router.post('/search', async (ctx) => {
        try {
            const response = await axios.post(
                'https://api.hivesearcher.com/search',
                {
                    ...ctx.request.body,
                    _csrf: undefined,
                },
                {
                    headers: {
                        Accept: 'application/json',
                        Authorization: config.get('esteem_elastic_search_api_key'),
                        'Content-Type': 'application/json',
                    },
                },
            );
            ctx.body = JSON.stringify(response.data);
            ctx.status = 200;
        } catch (error) {
            console.error('Error in /search api call', ctx.session.uid, error);
            ctx.body = JSON.stringify({ error: error.message });
            ctx.status = 500;
        }
    });
}

const parseSig = (hexSig) => {
    try {
        return Signature.fromHex(hexSig);
    } catch (e) {
        return null;
    }
};
