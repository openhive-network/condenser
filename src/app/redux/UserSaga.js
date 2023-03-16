/*global $STM_Config*/
import { fromJS, Set } from 'immutable';
import {
    call, put, select, fork, take, takeLatest
} from 'redux-saga/effects';
import { api, auth } from '@hiveio/hive-js';
import { PrivateKey, Signature, hash } from '@hiveio/hive-js/lib/auth/ecc';

import { accountAuthLookup } from 'app/redux/AuthSaga';
import { getAccount } from 'app/redux/SagaShared';
import * as userActions from 'app/redux/UserReducer';
import { isLoggedInWithKeychain } from 'app/utils/HiveKeychain';
import HiveAuthUtils from 'app/utils/HiveAuthUtils';
import { packLoginData, extractLoginData } from 'app/utils/UserUtil';
import { browserHistory } from 'react-router';
import {
    serverApiLogin,
    serverApiLogout,
    serverApiRecordEvent,
} from 'app/utils/ServerApiClient';
import { loadFollows } from 'app/redux/FollowSaga';
import translate from 'app/Translator';
import DMCAUserList from 'app/utils/DMCAUserList';
import { setHiveSignerAccessToken, isLoggedInWithHiveSigner, hiveSignerClient } from 'app/utils/HiveSigner';

// eslint-disable-next-line import/prefer-default-export
export const userWatches = [
    takeLatest('user/lookupPreviousOwnerAuthority', lookupPreviousOwnerAuthority),
    takeLatest(userActions.CHECK_KEY_TYPE, checkKeyType),
    // takeLeading https://redux-saga.js.org/docs/api/#notes-5
    fork(function* () {
        while (true) {
            const action = yield take(userActions.USERNAME_PASSWORD_LOGIN);
            yield call(usernamePasswordLogin, action);
        }
    }),
    takeLatest(userActions.SAVE_LOGIN, saveLogin_localStorage),
    takeLatest(userActions.LOGOUT, logout),
    takeLatest(userActions.LOGIN_ERROR, loginError),
    takeLatest(userActions.UPLOAD_IMAGE, uploadImage),
];

/**
 * Check if there is an ongoing oauth process and user in application.
 * If yes, return uri for redirection.
 *
 * @param {string} username
 * @returns
 */
function oauthRedirect(username) {
    try {
        const oauthItem = sessionStorage.getItem('oauth');
        if (!oauthItem) {
            return '';
        }
        sessionStorage.removeItem('oauth');

        // User must not be empty.
        if (!username) {
            return '';
        }

        // Redirect to backend authorization endpoint.
        const params = new URLSearchParams(oauthItem);
        return `/oauth/authorize?${params.toString()}`;
    } catch (error) {
        // Do nothing – sessionStorage is unavailable, probably.
    }

    return '';
}

function effectiveVests(account) {
    const vests = parseFloat(account.get('vesting_shares'));
    const delegated = parseFloat(account.get('delegated_vesting_shares'));
    const received = parseFloat(account.get('received_vesting_shares'));
    return vests - delegated + received;
}

function* shouldShowLoginWarning({ username, password }) {
    // If it's a master key, show the warning.
    if (!auth.isWif(password)) {
        const account = (yield api.getAccountsAsync([username]))[0];
        if (!account) {
            console.error('shouldShowLoginWarning - account not found');
            return false;
        }
        const pubKey = PrivateKey.fromSeed(username + 'posting' + password)
            .toPublicKey()
            .toString();
        const postingPubKeys = account.posting.key_auths[0];
        return postingPubKeys.includes(pubKey);
    }

    // For any other case, don't show the warning.
    return false;
}

/**
 @arg {object} action action.username - Unless a WIF is provided, this is hashed
 with the password and key_type to create private keys.
 @arg {object} action action.password - Password or WIF private key. A WIF becomes
 the posting key, a password can create all three key_types: active,
 owner, posting keys.
 */
function* checkKeyType(action) {
    if (yield call(shouldShowLoginWarning, action.payload)) {
        yield put(userActions.showLoginWarning(action.payload));
    } else {
        yield put(userActions.usernamePasswordLogin(action.payload));
    }
}

/**
 @arg {object} action action.username - Unless a WIF is provided, this is hashed
 with the password and key_type to create private keys.
 @arg {object} action action.password - Password or WIF private key. A WIF becomes
 the posting key, a password can create all three key_types: active,
 owner, posting keys.
 */
function* usernamePasswordLogin(action) {
    // This is a great place to mess with session-related user state (:
    // If the user hasn't previously hidden the announcement in this session,
    // or if the user's browser does not support session storage,
    // show the announcement.
    if (
        typeof sessionStorage === 'undefined'
        || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hideAnnouncement') !== 'true')
    ) {
        // Uncomment to re-enable announcment
        // TODO: use config to enable/disable
        //yield put(userActions.showAnnouncement());
    }

    // Sets 'loading' while the login is taking place. The key generation can
    // take a while on slow computers.
    const loginResult = yield call(usernamePasswordLogin2, action.payload);
    const current = yield select((state) => state.user.get('current'));
    const username = current ? current.get('username') : null;

    if (username) {
        yield put(userActions.generateSessionId());
        if (!(loginResult && loginResult.redirect_to)) {
            yield fork(loadFollows, 'getFollowingAsync', username, 'blog');
            yield fork(loadFollows, 'getFollowingAsync', username, 'ignore');
        }
    }
}

const clean = (value) => (value == null || value === '' || /null|undefined/.test(value) ? undefined : value);

function* usernamePasswordLogin2(options) {
    let {
        username,
        password,
        access_token,
        expires_in,
        hiveauth_key,
        hiveauth_token,
        hiveauth_token_expires,
    } = options;

    const {
        useKeychain,
        useHiveSigner,
        useHiveAuth,
        lastPath,
        saveLogin,
        operationType /*high security*/,
        afterLoginRedirectToWelcome,
    } = options;

    const user = yield select((state) => state.user);
    const loginType = user.get('login_type');
    const justLoggedIn = loginType === 'basic';
    console.log('Login type:', loginType, 'Just logged in?', justLoggedIn, 'username:', username);

    // login, using saved password
    let feedURL = '';
    let autopost, memoWif, login_owner_pubkey, login_wif_owner_pubkey, login_with_keychain, login_with_hivesigner,
        login_with_hiveauth;
    if (!username && !password) {
        const data = localStorage.getItem('autopost2');

        if (data) {
            // auto-login with a low security key (like a posting key)
            autopost = true; // must use semi-colon
            // The 'password' in this case must be the posting private wif .. See setItme('autopost')
            [
                username,
                password,
                memoWif,
                login_owner_pubkey,
                login_with_keychain,
                login_with_hivesigner,
                access_token,
                expires_in,
                login_with_hiveauth,
                hiveauth_key,
                hiveauth_token,
                hiveauth_token_expires,
            ] = extractLoginData(data);
            memoWif = clean(memoWif);
            login_owner_pubkey = clean(login_owner_pubkey);
        }
    }

    // no saved password
    if (
        !username
        || !(
            password
            || useKeychain
            || login_with_keychain
            || useHiveAuth
            || login_with_hiveauth
            || useHiveSigner
            || login_with_hivesigner
        )
    ) {
        const offchain_account = yield select((state) => state.offchain.get('account'));
        if (offchain_account) serverApiLogout();
        return;
    }

    let userProvidedRole; // login via:  username/owner
    if (username.indexOf('/') > -1) {
        // "alice/active" will login only with Alices active key
        [username, userProvidedRole] = username.split('/');
    }

    yield select((state) => state.global.get('pathname'));
    const isRole = (role, fn) => (!userProvidedRole || role === userProvidedRole ? fn() : undefined);

    const account = yield call(getAccount, username);
    if (!account) {
        yield put(userActions.loginError({ error: 'Username does not exist' }));
        return;
    }
    //dmca user block
    if (username && DMCAUserList.includes(username)) {
        yield put(userActions.loginError({ error: translate('terms_violation') }));
        return;
    }
    //check for defaultBeneficiaries
    let defaultBeneficiaries;
    try {
        const json_metadata = JSON.parse(account.get('json_metadata'));
        if (json_metadata.beneficiaries) {
            defaultBeneficiaries = json_metadata.beneficiaries;
        } else {
            defaultBeneficiaries = [];
        }
    } catch (error) {
        defaultBeneficiaries = [];
    }
    yield put(
        userActions.setUser({
            defaultBeneficiaries,
            show_login_modal: useHiveAuth && document.location.pathname !== '/login.html',
        })
    );
    // return if already logged in using steem keychain
    if (login_with_keychain) {
        console.log('Logged in using Hive Keychain');
        yield put(
            userActions.setUser({
                username,
                login_with_keychain: true,
                effective_vests: effectiveVests(account),
            })
        );
        const externalUser = {system: 'keychain'};
        const response = yield serverApiLogin(username, {}, externalUser);
        yield response.data;

        // Redirect, when we are in oauth flow.
        const oauthRedirectTo = oauthRedirect(username);
        if (oauthRedirectTo) {
            window.location.replace(oauthRedirectTo);
            return {redirect_to: oauthRedirectTo};
        }

        return;
    }

    // return if already logged in using HiveAuth
    if (
        login_with_hiveauth
    ) {
        const now = new Date().getTime();
        const isTokenValid = now < hiveauth_token_expires;

        if (
            hiveauth_key
            && hiveauth_token
            && isTokenValid
        ) {
            console.log('Logged in using HiveAuth');
            HiveAuthUtils.setUsername(username);
            HiveAuthUtils.setKey(hiveauth_key);
            HiveAuthUtils.setToken(hiveauth_token);
            HiveAuthUtils.setExpire(hiveauth_token_expires);
            yield put(
                userActions.setUser({
                    username,
                    login_with_hiveauth: true,
                    effective_vests: effectiveVests(account),
                })
            );
            const externalUser = {system: 'hiveauth'};
            const response = yield serverApiLogin(username, {}, externalUser);
            yield response.data;
            // Redirect, when we are in oauth flow.
            const oauthRedirectTo = oauthRedirect(username);
            if (oauthRedirectTo) {
                window.location.replace(oauthRedirectTo);
                return {redirect_to: oauthRedirectTo};
            }
        } else {
            console.log('HiveAuth token has expired');
            HiveAuthUtils.logout();
            yield put(
                userActions.logout({ type: 'default' })
            );
            yield serverApiLogout();
        }

        return;
    }

    // return if already logged in using HiveSigner
    if (login_with_hivesigner) {
        console.log('Logged in using HiveSigner');
        if (access_token) {
            setHiveSignerAccessToken(username, access_token);
            yield put(
                userActions.setUser({
                    username,
                    login_with_hivesigner: true,
                    access_token,
                    expires_in,
                    effective_vests: effectiveVests(account),
                })
            );
        }
        const externalUser = {system: 'hivesigner', hivesignerToken: access_token};
        const response = yield serverApiLogin(username, {}, externalUser);
        yield response.data;

        // Redirect, when we are in oauth flow.
        const oauthRedirectTo = oauthRedirect(username);
        if (oauthRedirectTo) {
            window.location.replace(oauthRedirectTo);
            return {redirect_to: oauthRedirectTo};
        }

        return;
    }

    let private_keys;
    if (!useKeychain && !useHiveSigner && !useHiveAuth) {
        try {
            const private_key = PrivateKey.fromWif(password);
            login_wif_owner_pubkey = private_key.toPublicKey().toString();
            private_keys = fromJS({
                owner_private: isRole('owner', () => private_key),
                posting_private: isRole('posting', () => private_key),
                active_private: isRole('active', () => private_key),
                memo_private: private_key,
            });
        } catch (e) {
            // Password (non wif)
            login_owner_pubkey = PrivateKey.fromSeed(username + 'owner' + password)
                .toPublicKey()
                .toString();
            private_keys = fromJS({
                posting_private: isRole('posting', () => PrivateKey.fromSeed(username + 'posting' + password)),
                active_private: isRole('active', () => PrivateKey.fromSeed(username + 'active' + password)),
                memo_private: PrivateKey.fromSeed(username + 'memo' + password),
            });
        }
        if (memoWif) private_keys = private_keys.set('memo_private', PrivateKey.fromWif(memoWif));

        yield call(accountAuthLookup, {
            payload: {
                account,
                private_keys,
                login_owner_pubkey,
            },
        });
        let authority = yield select((state) => state.user.getIn(['authority', username]));

        const hasActiveAuth = authority.get('active') === 'full';
        if (hasActiveAuth) {
            console.log('Rejecting due to detected active auth');
            yield put(userActions.loginError({ error: 'active_login_blocked' }));
            return;
        }

        const hasOwnerAuth = authority.get('owner') === 'full';
        if (hasOwnerAuth) {
            console.log('Rejecting due to detected owner auth');
            yield put(userActions.loginError({ error: 'owner_login_blocked' }));
            return;
        }

        const accountName = account.get('name');
        authority = authority.set('active', 'none');
        yield put(userActions.setAuthority({ accountName, auth: authority }));
        const fullAuths = authority.reduce((r, _auth, type) => (_auth === 'full' ? r.add(type) : r), Set());
        if (!fullAuths.size) {
            console.log('No full auths');
            yield put(userActions.hideLoginWarning());
            localStorage.removeItem('autopost2');
            const owner_pub_key = account.getIn(['owner', 'key_auths', 0, 0]);

            if (login_owner_pubkey === owner_pub_key || login_wif_owner_pubkey === owner_pub_key) {
                yield put(userActions.loginError({ error: 'owner_login_blocked' }));
                return;
            }

            if (hasActiveAuth) {
                yield put(userActions.loginError({ error: 'active_login_blocked' }));
                return;
            }

            const generated_type = password[0] === 'P' && password.length > 40;
            serverApiRecordEvent(
                'login_attempt',
                JSON.stringify({
                    name: username,
                    login_owner_pubkey,
                    owner_pub_key,
                    generated_type,
                })
            );
            yield put(userActions.loginError({ error: 'Incorrect Password' }));
            return;

            /* old unreachable code...
            const generated_type = password[0] === 'P' && password.length > 40;
            serverApiRecordEvent(
                'login_attempt',
                JSON.stringify({
                    name: username,
                    login_owner_pubkey,
                    owner_pub_key,
                    generated_type,
                })
            );
            yield put(userActions.loginError({ error: 'Incorrect Password' }));
            return;
             */
        }
        if (authority.get('posting') !== 'full') private_keys = private_keys.remove('posting_private');
        if (authority.get('active') !== 'full') private_keys = private_keys.remove('active_private');

        const owner_pubkey = account.getIn(['owner', 'key_auths', 0, 0]);
        const active_pubkey = account.getIn(['active', 'key_auths', 0, 0]);
        const posting_pubkey = account.getIn(['posting', 'key_auths', 0, 0]);

        const memo_pubkey = private_keys.has('memo_private')
            ? private_keys.get('memo_private').toPublicKey().toString()
            : null;

        if (account.get('memo_key') !== memo_pubkey || memo_pubkey === owner_pubkey || memo_pubkey === active_pubkey)
            // provided password did not yield memo key, or matched active/owner
        { private_keys = private_keys.remove('memo_private'); }

        if (posting_pubkey === owner_pubkey || posting_pubkey === active_pubkey) {
            yield put(
                userActions.loginError({
                    error:
                        'This login gives owner or active permissions and should not be used here.  Please provide a posting only login.',
                })
            );
            localStorage.removeItem('autopost2');
            return;
        }
        if (username) feedURL = '/@' + username + '/feed';

        // If user is signing operation by operaion and has no saved login, don't save to RAM
        if (!operationType || saveLogin) {
            // Keep the posting key in RAM but only when not signing an operation.
            // No operation or the user has checked: Keep me logged in...
            yield put(
                userActions.setUser({
                    username,
                    private_keys,
                    login_owner_pubkey,
                    effective_vests: effectiveVests(account),
                })
            );
        } else {
            yield put(
                userActions.setUser({
                    username,
                    effective_vests: effectiveVests(account),
                })
            );
        }
    }
    try {
        // const challengeString = yield serverApiLoginChallenge()
        const offchainData = yield select((state) => state.offchain);
        const serverAccount = offchainData.get('account');
        const challengeString = offchainData.get('login_challenge');
        if (!serverAccount && challengeString) {
            console.log('No server account, but challenge string');
            const signatures = {};
            const challenge = { token: challengeString };
            const buf = JSON.stringify(challenge, null, 0);
            const bufSha = hash.sha256(buf);
            const externalUser = {};

            if (useKeychain) {
                const response = yield new Promise((resolve) => {
                    window.hive_keychain.requestSignBuffer(username, buf, 'Posting', (res) => {
                        resolve(res);
                    });
                });
                if (response.success) {
                    signatures.posting = response.result;
                } else {
                    yield put(userActions.loginError({error: response.message}));
                    return;
                }
                feedURL = '/@' + username + '/feed';
                yield put(
                    userActions.setUser({
                        username,
                        login_with_keychain: true,
                        effective_vests: effectiveVests(account),
                    })
                );
                externalUser.system = 'keychain';
            } else if (useHiveAuth) {
                const authResponse = yield new Promise((resolve) => {
                    HiveAuthUtils.login(username, buf, (res) => {
                        resolve(res);
                    });
                });

                if (authResponse.success) {
                    const {
                        token, expire, key, challengeHex,
                    } = authResponse.hiveAuthData;
                    signatures.posting = challengeHex;

                    yield put(
                        userActions.setUser({
                            username,
                            login_with_hiveauth: true,
                            hiveauth_key: key,
                            hiveauth_token: token,
                            hiveauth_token_expires: expire,
                            effective_vests: effectiveVests(account),
                        })
                    );
                } else {
                    yield put(userActions.loginError({
                        error: authResponse.error,
                    }));
                    return;
                }

                feedURL = '/@' + username + '/feed';
                externalUser.system = 'hiveauth';
            } else if (useHiveSigner) {
                if (access_token) {
                    // redirect url
                    feedURL = '/@' + username + '/feed';
                    // set access setHiveSignerAccessToken
                    setHiveSignerAccessToken(username, access_token);
                    // set user data
                    yield put(
                        userActions.setUser({
                            username,
                            login_with_hivesigner: true,
                            access_token,
                            expires_in,
                            effective_vests: effectiveVests(account),
                        })
                    );
                }
                externalUser.system = 'hivesigner';
                externalUser.hivesignerToken = access_token;
            } else {
                const sign = (role, d) => {
                    if (!d) return;
                    const sig = Signature.signBufferSha256(bufSha, d);
                    signatures[role] = sig.toHex();
                };
                sign('posting', private_keys.get('posting_private'));
                // sign('active', private_keys.get('active_private'))
            }

            console.log('Logging in as', username);
            let response;
            if ((Object.keys(signatures)).length > 0) {
                response = yield serverApiLogin(username, signatures);
            } else {
                response = yield serverApiLogin(username, {}, externalUser);
            }

            yield response.data;

        }
    } catch (error) {
        // Does not need to be fatal
        console.error('Server Login Error', error);
    }

    if (!autopost && saveLogin) yield put(userActions.saveLogin());

    // Redirect, when we are in oauth flow.
    const oauthRedirectTo = oauthRedirect(username);
    if (oauthRedirectTo) {
        window.location.replace(oauthRedirectTo);
        return {redirect_to: oauthRedirectTo};
    }

    // Redirect to the appropriate page after login.
    const path = useHiveSigner ? lastPath : document.location.pathname;
    if (afterLoginRedirectToWelcome) {
        browserHistory.push('/welcome');
    } else if (feedURL && path === '/login.html') {
        browserHistory.push('/trending/my');
    } else if (feedURL && path === '/') {
        // browserHistory.push(feedURL);
        browserHistory.push('/trending/my');
    } else if (useHiveSigner && lastPath) {
        browserHistory.push(lastPath);
    }
}

function* saveLogin_localStorage() {
    if (!process.env.BROWSER) {
        console.error('Non-browser environment, skipping localstorage');
        return;
    }
    localStorage.removeItem('autopost2');
    const [
        username,
        private_keys,
        login_owner_pubkey,
        login_with_keychain,
        login_with_hivesigner,
        access_token,
        expires_in,
        login_with_hiveauth,
        hiveauth_key,
        hiveauth_token,
        hiveauth_token_expires,
    ] = yield select((state) => [
        state.user.getIn(['current', 'username']),
        state.user.getIn(['current', 'private_keys']),
        state.user.getIn(['current', 'login_owner_pubkey']),
        state.user.getIn(['current', 'login_with_keychain']),
        state.user.getIn(['current', 'login_with_hivesigner']),
        state.user.getIn(['current', 'access_token']),
        state.user.getIn(['current', 'expires_in']),
        state.user.getIn(['current', 'login_with_hiveauth']),
        state.user.getIn(['current', 'hiveauth_key']),
        state.user.getIn(['current', 'hiveauth_token']),
        state.user.getIn(['current', 'hiveauth_token_expires']),
    ]);
    if (!username) {
        console.error('Not logged in');
        return;
    }
    // Save the lowest security key
    const posting_private = private_keys && private_keys.get('posting_private');
    if (!login_with_keychain && !login_with_hivesigner && !login_with_hiveauth && !posting_private) {
        console.error('No posting key to save?');
        return;
    }
    const account = yield select((state) => state.global.getIn(['accounts', username]));
    if (!account) {
        console.error('Missing global.accounts[' + username + ']');
        return;
    }
    const postingPubkey = posting_private ? posting_private.toPublicKey().toString() : 'none';
    try {
        account.getIn(['active', 'key_auths']).forEach((_auth) => {
            if (_auth.get(0) === postingPubkey) throw 'Login will not be saved, posting key is the same as active key';
        });
        account.getIn(['owner', 'key_auths']).forEach((_auth) => {
            if (_auth.get(0) === postingPubkey) throw 'Login will not be saved, posting key is the same as owner key';
        });
    } catch (e) {
        console.error('login_auth_err', e);
        return;
    }

    const memoKey = private_keys ? private_keys.get('memo_private') : null;
    const memoWif = memoKey && memoKey.toWif();
    const postingPrivateWif = posting_private ? posting_private.toWif() : 'none';
    const data = packLoginData(
        username,
        postingPrivateWif,
        memoWif,
        login_owner_pubkey,
        login_with_keychain,
        login_with_hivesigner,
        access_token,
        expires_in,
        login_with_hiveauth,
        hiveauth_key,
        hiveauth_token,
        hiveauth_token_expires,
    );
    // autopost is a auto login for a low security key (like the posting key)
    localStorage.setItem('autopost2', data);
}

function* logout(action) {
    const payload = (action || {}).payload || {};
    const logoutType = payload.type || 'default';
    // eslint-disable-next-line prefer-rest-params
    console.log('Logging out', arguments, 'logout type', logoutType);

    // Just in case it is still showing
    yield put(userActions.saveLoginConfirm(false));

    if (process.env.BROWSER) {
        localStorage.removeItem('autopost2');
    }

    HiveAuthUtils.logout();
    yield serverApiLogout();
}

// eslint-disable-next-line require-yield
function* loginError({
                         // eslint-disable-next-line no-empty-pattern
                         payload: {
                             /*error*/
                         },
                     }) {
    serverApiLogout();
}

/**
 If the owner key was changed after the login owner key, this function will
 find the next owner key history record after the change and store it under
 user.previous_owner_authority.
 */
// eslint-disable-next-line no-empty-pattern
function* lookupPreviousOwnerAuthority({ payload: {} }) {
    const current = yield select((state) => state.user.getIn(['current']));
    if (!current) return;

    const login_owner_pubkey = current.get('login_owner_pubkey');
    if (!login_owner_pubkey) return;

    const username = current.get('username');
    const key_auths = yield select((state) => state.global.getIn(['accounts', username, 'owner', 'key_auths']));
    if (key_auths && key_auths.find((key) => key.get(0) === login_owner_pubkey)) {
        return;
    }
    // Owner history since this index was installed July 14
    let owner_history = fromJS(yield call([api, api.getOwnerHistoryAsync], username));
    if (owner_history.count() === 0) return;
    owner_history = owner_history.sort((b, a) => {
        // Sort decending
        const aa = a.get('last_valid_time');
        const bb = b.get('last_valid_time');
        return aa < bb ? -1 : aa > bb ? 1 : 0;
    });
    const previous_owner_authority = owner_history.find((o) => {
        // eslint-disable-next-line no-shadow
        const auth = o.get('previous_owner_authority');
        const weight_threshold = auth.get('weight_threshold');
        const key3 = auth
            .get('key_auths')
            .find((key2) => key2.get(0) === login_owner_pubkey && key2.get(1) >= weight_threshold);
        return key3 ? auth : null;
    });
    if (!previous_owner_authority) {
        console.log('UserSaga ---> Login owner does not match owner history');
        return;
    }
    yield put(userActions.setUser({ previous_owner_authority }));
}

function* uploadImage({
                          payload: {
                              file, dataUrl, filename = 'image.txt', progress
                          }
                      }) {
    // eslint-disable-next-line no-underscore-dangle
    const _progress = progress;
    progress = (msg) => {
        _progress(msg);
    };

    const stateUser = yield select((state) => state.user);
    const username = stateUser.getIn(['current', 'username']);
    const keychainLogin = isLoggedInWithKeychain();
    const hiveSignerLogin = isLoggedInWithHiveSigner();
    const hiveAuthLogin = HiveAuthUtils.isLoggedInWithHiveAuth();

    const d = stateUser.getIn(['current', 'private_keys', 'posting_private']);
    if (!username) {
        progress({ error: 'Please login first.' });
        return;
    }

    if (!(keychainLogin || hiveSignerLogin || hiveAuthLogin || d)) {
        progress({ error: 'Login with your posting key' });
        return;
    }

    if (!file && !dataUrl) {
        console.error('uploadImage required: file or dataUrl');
        return;
    }

    let data, dataBs64;
    if (file) {
        // drag and drop
        const reader = new FileReader();
        data = yield new Promise((resolve) => {
            reader.addEventListener('load', () => {
                const result = Buffer.from(reader.result, 'binary');
                resolve(result);
            });
            reader.readAsBinaryString(file);
        });
    } else {
        // recover from preview
        const commaIdx = dataUrl.indexOf(',');
        dataBs64 = dataUrl.substring(commaIdx + 1);
        data = Buffer.from(dataBs64, 'base64');
    }

    // The challenge needs to be prefixed with a constant (both on the server and checked on the client) to make sure the server can't easily make the client sign a transaction doing something else.
    const prefix = Buffer.from('ImageSigningChallenge');
    const buf = Buffer.concat([prefix, data]);
    const bufSha = hash.sha256(buf);

    const formData = new FormData();
    if (file) {
        formData.append('file', file);
    } else {
        // formData.append('file', file, filename) <- Failed to add filename=xxx to Content-Disposition
        // Can't easily make this look like a file so this relies on the server supporting: filename and filebinary
        formData.append('filename', filename);
        formData.append('filebase64', dataBs64);
    }

    let sig;
    let postUrl;
    if (hiveSignerLogin) {
        // verify user with access_token for HiveSigner login
        postUrl = `${$STM_Config.upload_image}/hs/${hiveSignerClient.accessToken}`;
    } else if (keychainLogin) {
        const response = yield new Promise((resolve) => {
            window.hive_keychain.requestSignBuffer(username, JSON.stringify(buf), 'Posting', (res) => {
                resolve(res);
            });
        });
        if (response.success) {
            sig = response.result;
            postUrl = `${$STM_Config.upload_image}/${username}/${sig}`;
        } else {
            progress({ error: response.message });
            return;
        }
    } else if (hiveAuthLogin) {
        yield put(userActions.showHiveAuthModal());
        const dataSha256 = Buffer.from(hash.sha256(data));
        const checksumBuf = Buffer.concat([prefix, dataSha256]);
        const response = yield new Promise((resolve) => {
            HiveAuthUtils.signChallenge(JSON.stringify(checksumBuf, null, 0), 'posting', (res) => {
                resolve(res);
            });
        });

        yield put(userActions.hideHiveAuthModal());
        if (response.success) {
            sig = response.result;
        } else {
            progress({ error: response.error });
            return;
        }
        postUrl = `${$STM_Config.upload_image}/cs/${username}/${sig}`;
    } else {
        sig = Signature.signBufferSha256(bufSha, d).toHex();
        postUrl = `${$STM_Config.upload_image}/${username}/${sig}`;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', postUrl);
    xhr.onload = function () {
        console.log(xhr.status, xhr.responseText);
        if (xhr.status === 200) {
            try {
                const res = JSON.parse(xhr.responseText);
                const { error } = res;
                if (error) {
                    console.error('upload_error', error, xhr.responseText);
                    progress({ error: 'Error: ' + error });
                    return;
                }

                const { url } = res;
                progress({ url });
            } catch (e) {
                console.error('upload_error2', 'not json', e, xhr.responseText);
                progress({ error: 'Error: response not JSON' });
            }
        } else {
            console.error('upload_error3', xhr.status, xhr.statusText);
            progress({ error: `Error: ${xhr.status}: ${xhr.statusText}` });
        }
    };
    xhr.onerror = function (error) {
        console.error('xhr', filename, error);
        progress({ error: 'Unable to contact the server.' });
    };
    xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progress({ message: `Uploading ${percent}%` });
        }
    };
    xhr.send(formData);
}
