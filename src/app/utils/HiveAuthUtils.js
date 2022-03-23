/* global $STM_Config */
import tt from 'counterpart';
import QRious from 'qrious';
import { PublicKey, Signature, hash } from '@hiveio/hive-js/lib/auth/ecc';
import { HasClient } from 'hive-auth-client';

import { isLoggedIn, extractLoginData } from 'app/utils/UserUtil';

const client = new HasClient('hive-auth.arcange.eu', '', true);

const auth = {
    username: undefined,
    token: undefined,
    expire: undefined,
    key: undefined,
};

const setUsername = (username) => {
    auth.username = username;
};

const setToken = (token) => {
    auth.token = token;
};

const setExpire = (expire) => {
    auth.expire = expire;
};

const setKey = (key) => {
    auth.key = key;
};

const isLoggedInWithHiveAuth = () => {
    if (!isLoggedIn()) {
        return false;
    }

    const now = new Date().getTime();
    const data = localStorage.getItem('autopost2');
    const [,,,,,,,, login_with_hiveauth, hiveauth_key, hiveauth_token, hiveauth_token_expires] = extractLoginData(data);
    return !!login_with_hiveauth
        && !!hiveauth_key
        && !!hiveauth_token
        && now < hiveauth_token_expires;
};

const verifyChallenge = (challenge, data) => {
    // Validate signature against account public key
    const sig = Signature.fromHex(data.challenge);
    const buf = hash.sha256(challenge, null, 0);
    return sig.verifyHash(buf, PublicKey.fromString(data.pubkey));
};

const updateModalMessage = (message) => {
    const instructionsContainer = document.getElementById('hive-auth-instructions');
    if (instructionsContainer) {
        instructionsContainer.innerHTML = message;
    }
};

const broadcast = (operations, type, callbackFn) => {
    const handleSignPending = () => {
        updateModalMessage(tt('hiveauthservices.broadcastInstructions'));
    };

    const handleSignSuccess = (message) => {
        console.log('Hive Auth: broadcast successful', message);
        callbackFn({
            success: true,
        });
        removeEventHandlers();
    };

    const handleSignFailure = (error) => {
        console.warn('Hive Auth: broadcast failed', error);
        callbackFn({
            success: false,
            error: error.error || error.message,
        });
        removeEventHandlers();
    };

    const handleSignError = (error) => {
        console.warn('Hive Auth: server returned an error during broadcast', error);
        callbackFn({
            success: false,
            error: error.error || error.message,
        });
        removeEventHandlers();
    };

    const handleRequestExpired = (error) => {
        console.error('Hive Auth: server returned an error during broadcast', error.message);
        updateModalMessage(tt('hiveauthservices.requestExpired'));

        callbackFn({
            success: false,
            error: tt('hiveauthservices.requestExpired'),
        });

        removeEventHandlers();
    };

    const handleAttachFailure = (error) => {
        console.error('Hive Auth: lost connection to server and failed re-attaching', error.message);
        clearLoginInstructions();
        callbackFn({
            success: false,
            error: tt('hiveauthservices.failedAttaching'),
        });
        removeEventHandlers();
    };

    const removeEventHandlers = () => {
        client.removeEventHandler('SignPending', handleSignPending);
        client.removeEventHandler('SignSuccess', handleSignSuccess);
        client.removeEventHandler('SignFailure', handleSignFailure);
        client.removeEventHandler('SignError', handleSignError);
        client.removeEventHandler('RequestExpired', handleRequestExpired);
        client.removeEventHandler('AttachFailure', handleAttachFailure);
    };

    client.addEventHandler('SignPending', handleSignPending);
    client.addEventHandler('SignSuccess', handleSignSuccess);
    client.addEventHandler('SignFailure', handleSignFailure);
    client.addEventHandler('SignError', handleSignError);
    client.addEventHandler('RequestExpired', handleRequestExpired);
    client.addEventHandler('AttachFailure', handleAttachFailure);
    client.broadcast(auth, type, operations);
};

const signChallenge = (data, keyType = 'posting', callbackFn) => {
    const handleChallengePending = () => {
        updateModalMessage(tt('hiveauthservices.broadcastInstructions'));
    };

    const handleChallengeSuccess = (e) => {
        console.log('Hive Auth: challenge success', e);
        callbackFn({
            result: e.data.challenge,
            success: true,
        });
        removeEventHandlers();
    };

    const handleChallengeFailure = (e) => {
        console.error('Hive Auth: challenge failure', e);
        callbackFn({
            success: false,
            error: tt('hiveauthservices.challengeError'),
        });
        removeEventHandlers();
    };

    const handleChallengeError = (e) => {
        console.error('Hive Auth: challenge error', e);
        callbackFn({
            success: false,
            error: tt('hiveauthservices.challengeError'),
        });
        removeEventHandlers();
    };

    const removeEventHandlers = () => {
        client.removeEventHandler('ChallengePending', handleChallengePending);
        client.removeEventHandler('ChallengeSuccess', handleChallengeSuccess);
        client.removeEventHandler('ChallengeFailure', handleChallengeFailure);
        client.removeEventHandler('ChallengeError', handleChallengeError);
    };

    client.addEventHandler('ChallengePending', handleChallengePending);
    client.addEventHandler('ChallengeSuccess', handleChallengeSuccess);
    client.addEventHandler('ChallengeFailure', handleChallengeFailure);
    client.addEventHandler('ChallengeError', handleChallengeError);
    client.challenge(auth, {
        key_type: keyType,
        challenge: data,
    });
};

const updateLoginInstructions = (message) => {
    const instructionsElement = document.getElementById('hiveauth-instructions');
    if (instructionsElement) {
        instructionsElement.innerHTML = message;
        instructionsElement.classList.add('show');
    }
};

const clearLoginInstructions = () => {
    updateLoginInstructions('');
    const qrElement = document.getElementById('hiveauth-qr');
    if (qrElement) {
        const context = qrElement.getContext('2d');
        context.clearRect(0, 0, 200, 200);
    }
};

const login = async (username, challenge, callbackFn) => {
    updateLoginInstructions(tt('hiveauthservices.connecting'));

    setUsername(username);

    const challengeData = {
        key_type: 'posting',
        challenge,
    };

    console.log('Hive Auth: requesting authentication');

    const handleAuthPending = (message) => {
        const {
            account, expire, key, uuid,
        } = message;
        const now = new Date().getTime();
        if (now < expire) {
            const authPayload = {
                uuid,
                account,
                key,
                host: 'wss://hive-auth.arcange.eu',
            };

            setKey(key);

            const authUri = `has://auth_req/${btoa(JSON.stringify(authPayload))}`;

            console.log('Hive Auth: Generating QR code');
            const qrLinkElement = document.getElementById('hiveauth-qr-link');
            const qrElement = document.getElementById('hiveauth-qr');
            const QR = new QRious({
                element: qrElement,
                background: 'white',
                backgroundAlpha: 0.8,
                foreground: 'black',
                size: 200,
            });
            QR.value = authUri;
            qrLinkElement.href = authUri;
            qrLinkElement.classList.add('show');

            updateLoginInstructions(tt('hiveauthservices.qrInstructions'));
        } else {
            console.warn('Hive Auth: token expired');
            clearLoginInstructions();
            callbackFn({
                success: false,
                error: tt('hiveauthservices.tokenExpired'),
            });
        }
    };

    const handleAuthSuccess = (message) => {
        const {
            data, uuid, authData: { token, key, expire },
        } = message;
        const { challenge: challengeResponse } = data;

        auth.token = token;
        auth.key = key;
        auth.expire =expire;

        console.log('Hive Auth: user has approved the auth request', challengeResponse);
        const verified = verifyChallenge(challenge, challengeResponse);

        if(verified) {
            console.log("Hive Auth: challenge succeeded");
            callbackFn({
                success: true,
                hiveAuthData: {
                    key: auth.key,
                    token,
                    expire,
                    uuid,
                    challengeHex: challengeResponse.challenge,
                }
            });
        } else {
            console.error("Hive Auth: challenge failed");
            clearLoginInstructions();
            callbackFn({
                success: false,
                error: tt('hiveauthservices.challengeValidationFailed'),
            });
        }

        removeEventHandlers();
    };

    const handleAuthFailure = (message) => {
        const { uuid } = message;
        console.warn('Hive Auth: user has rejected the auth request', uuid);
        clearLoginInstructions();
        callbackFn({
            success: false,
            error: tt('hiveauthservices.userRejectedRequest'),
        });
        removeEventHandlers();
    };

    const handleRequestExpired = (error) => {
        console.error('Hive Auth: server returned an error during authentication', error.message);
        clearLoginInstructions();
        updateModalMessage(tt('hiveauthservices.requestExpired'));

        callbackFn({
            success: false,
            error: tt('hiveauthservices.requestExpired'),
        });

        removeEventHandlers();
    };

    const handleAttachFailure = (error) => {
        console.error('Hive Auth: lost connection to server and failed re-attaching', error.message);
        clearLoginInstructions();
        callbackFn({
            success: false,
            error: tt('hiveauthservices.failedAttaching'),
        });
        removeEventHandlers();
    };

    const removeEventHandlers = () => {
        client.removeEventHandler('AuthPending', handleAuthPending);
        client.removeEventHandler('AuthSuccess', handleAuthSuccess);
        client.removeEventHandler('AuthFailure', handleAuthFailure);
        client.removeEventHandler('RequestExpired', handleRequestExpired);
        client.removeEventHandler('AttachFailure', handleAttachFailure);
    };

    client.addEventHandler('AuthPending', handleAuthPending);
    client.addEventHandler('AuthSuccess', handleAuthSuccess);
    client.addEventHandler('AuthFailure', handleAuthFailure);
    client.addEventHandler('RequestExpired', handleRequestExpired);
    client.addEventHandler('AttachFailure', handleAttachFailure);

    client.authenticate(
        auth,
        {
            name: 'Hive Blog',
            description: 'Hive Blog',
            icon: `${window.location.protocol}//${$STM_Config.site_domain}/images/hive-blog-twshare.png`,
        },
        challengeData
    );
};

const logout = () => {
    auth.username = undefined;
    auth.token = undefined;
    auth.expire = undefined;
    auth.key = undefined;
};

export default {
    login,
    logout,
    setUsername,
    setKey,
    setToken,
    setExpire,
    isLoggedInWithHiveAuth,
    broadcast,
    signChallenge,
};
