import tt from 'counterpart';
import QRious from 'qrious';
import { PublicKey, Signature, hash } from '@hiveio/hive-js/lib/auth/ecc';
import { HasClient } from 'hive-auth-client';

import { isLoggedIn, extractLoginData } from 'app/utils/UserUtil';

const APP_META = {
    name: 'Hive Blog',
    description: 'Hive Blog',
    icon: 'https://hive.blog/images/hive-blog-logo.png',
};

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
    const [,,,,,,,, login_with_hiveauth, hiveauth_key, hiveauth_token, hiveauth_tokenexpires] = extractLoginData(data);
    return !!login_with_hiveauth
        && !!hiveauth_key
        && !!hiveauth_token
        && now < hiveauth_tokenexpires;
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
    client.addEventHandler('SignPending', () => {
        updateModalMessage(tt('hiveauthservices.broadcastInstructions'));
    });

    client.addEventHandler('SignSuccess', (message) => {
        console.log('Hive Auth: broadcast successful', message);
        callbackFn({
            success: true,
        });
    });

    client.addEventHandler('SignFailure', (error) => {
        console.warn('Hive Auth: broadcast failed', error);
        callbackFn({
            success: false,
            error: error.error || error.message,
        });
    });

    client.addEventHandler('SignError', (error) => {
        console.warn('Hive Auth: server returned an error during broadcast', error);
        callbackFn({
            success: false,
            error: error.error || error.message,
        });
    });

    client.broadcast(auth, type, operations);
};

const updateLoginInstructions = (message) => {
    const instructionsElement = document.getElementById('hiveauth-instructions');
    instructionsElement.innerHTML = message;
    instructionsElement.classList.add('show');
};

const clearLoginInstructions = () => {
    updateLoginInstructions('');
    const qrElement = document.getElementById('hiveauth-qr');
    const context = qrElement.getContext('2d');
    context.clearRect(0, 0, 200, 200);
};

const login = async (username, callbackFn) => {
    updateLoginInstructions(tt('hiveauthservices.connecting'));

    setUsername(username);

    const challenge = JSON.stringify({
        login: auth.username,
        ts: Date.now()
    });

    const challengeData = {
        key_type: 'posting',
        challenge,
    };

    console.log('Hive Auth: requesting authentication');

    client.addEventHandler('AuthPending', (message) => {
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
    });

    client.addEventHandler('AuthSuccess', (message) => {
        const {
            data, uuid, authData,
        } = message;
        const { expire, token, challenge: challengeResponse } = data;

        auth.token = authData.token;
        auth.key = authData.key;
        auth.expire = authData.expire;

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
    });

    client.addEventHandler('AuthFailure', (message) => {
        const { uuid } = message;
        console.warn('Hive Auth: user has rejected the auth request', uuid);
        clearLoginInstructions();
        callbackFn({
            success: false,
            error: tt('hiveauthservices.userRejectedRequest'),
        });
    });

    client.addEventHandler('RequestExpired', (error) => {
        console.error('Hive Auth: server returned an error during authentication', error.message);
        clearLoginInstructions();

        callbackFn({
            success: false,
            error: tt('hiveauthservices.requestExpired'),
        });
    });

    client.addEventHandler('AttachFailure', (error) => {
       console.error('Hive Auth: lost connection to server and failed re-attaching', error.message);
        clearLoginInstructions();
        callbackFn({
            success: false,
            error: 'Failed attaching',
        });
    });

    client.authenticate(auth, APP_META, challengeData);
};

export default {
    login,
    setUsername,
    setKey,
    setToken,
    setExpire,
    isLoggedInWithHiveAuth,
    broadcast,
};
