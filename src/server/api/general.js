/*eslint no-underscore-dangle: "warn"*/
import koa_router from 'koa-router';
import config from 'config';
import { getRemoteIp, rateLimitReq } from 'server/utils/misc';
import coBody from 'co-body';
import Mixpanel from 'mixpanel';
import { PublicKey, Signature, hash } from '@hiveio/hive-js/lib/auth/ecc';
import { api } from '@hiveio/hive-js';

const axios = require('axios').default;

const mixpanel = config.get('mixpanel') ? Mixpanel.init(config.get('mixpanel')) : null;

const _stringval = (v) => (typeof v === 'string' ? v : JSON.stringify(v));

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
    const router = koa_router({ prefix: '/api/v1' });
    app.use(router.routes());

    router.post('/login_account', async (ctx) => {
        // if (rateLimitReq(this, this.req)) return;
        const params = ctx.request.body;
        const { account, signatures } = _parse(params);

        logRequest('login_account', ctx, { account });
        try {
            if (signatures) {
                if (!ctx.session.login_challenge) {
                    console.error('/login_account missing this.session.login_challenge');
                } else {
                    const [chainAccount] = await api.getAccountsAsync([account]);
                    if (!chainAccount) {
                        console.error('/login_account missing blockchain account', account);
                    } else {
                        const auth = { posting: false };
                        const bufSha = hash.sha256(JSON.stringify({ token: ctx.session.login_challenge }, null, 0));
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
                        verify('posting', signatures.posting, posting_pubkey, weight, weight_threshold);
                        if (auth.posting) ctx.session.a = account;
                    }
                }
            }

            ctx.body = JSON.stringify({
                status: 'ok',
            });
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
        // if (rateLimitReq(this, this.req)) return; - logout maybe immediately followed with login_attempt event
        logRequest('logout_account', ctx);
        try {
            ctx.session.a = null;
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
            console.log('-- /csp_violation -->', value, '--', ctx.request.headers['user-agent']);
        } else {
            console.log('-- /csp_violation [no csp-report] -->', params, '--', ctx.request.headers['user-agent']);
        }
        ctx.body = '';
    });

    router.post('/setUserPreferences', async (ctx) => {
        const params = ctx.request.body;
        const { payload } = _parse(params);
        console.log('-- /setUserPreferences -->', ctx.session.user, ctx.session.uid, payload);
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
            console.error('Error in /setUserPreferences api call', ctx.session.uid, error);
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
