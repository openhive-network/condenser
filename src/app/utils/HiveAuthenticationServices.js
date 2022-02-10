import tt from 'counterpart';
import QRious from 'qrious';
import { PublicKey, Signature, hash } from '@hiveio/hive-js/lib/auth/ecc';

import { isLoggedIn, extractLoginData } from 'app/utils/UserUtil';

let HAS;
if (typeof window !== 'undefined') {
    HAS = require('hive-auth-wrapper');
    HAS.default.setOptions({
        host: 'wss://hive-auth.arcange.eu/',
    });
    console.log('Hive Auth: Loading...', HAS);
}

const APP_META = {
    name: 'Hive Blog',
    description: 'Hive Blog',
    icon: 'https://hive.blog/images/hive-blog-logo.png',
};

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
    HAS.default.broadcast(auth, type, operations, (event) => {
        if (event.cmd === 'sign_wait') {
            updateModalMessage(tt('hiveauthservices.broadcastInstructions'));
        } else {
            console.warn('Hive Auth: was expecting sign_wait');
            callbackFn({
                success: false,
                error: tt('hiveauthservices.unknownCommand'),
            });
        }
    })
        .then((response) => {
            if (response.cmd === 'sign_ack') {
                console.log('Hive Auth: broadcast successful', response);
                callbackFn({
                    success: true,
                });
            } else {
                callbackFn({
                    success: false,
                    error: tt('hiveauthservices.unknownCommand'),
                });
            }
        })
        .catch((err) => {
            console.warn('Hive Auth: server returned an error during broadcast', err);
            callbackFn({
                success: false,
                error: err.error || err.message,
            });
        });
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
    let visibilityChange;
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
        visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
        visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
        visibilityChange = "webkitvisibilitychange";
    }
    document.addEventListener(visibilityChange, () => {
        HAS.default.connect();
    }, false);

    updateLoginInstructions(tt('hiveauthservices.connecting'));

    setUsername(username);

    const status = HAS.default.status();

    if (!status.connected) {
        await HAS.default.connect();
    }

    const challenge = JSON.stringify({
        login: auth.username,
        ts: Date.now()
    });

    const challengeData = {
        key_type: 'posting',
        challenge,
    };

    console.log('Hive Auth: requesting authentication');
    HAS.default.authenticate(
        auth,
        APP_META,
        challengeData,
        (event) => {
            const {
                cmd, account, expire, key, uuid,
            } = event;
            const now = new Date().getTime();
            if (now < expire) {
                if (cmd === 'auth_wait') {
                    const authPayload = {
                        uuid,
                        account,
                        key,
                        host: 'wss://hive-auth.arcange.eu',
                    };

                    setKey(event.key);

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
                    console.warn(`Hive Auth: auth request returned an unknown command ${cmd}`);
                    clearLoginInstructions();
                    callbackFn({
                        success: false,
                        error: tt('hiveauthservices.unknownCommand'),
                    });
                }
            } else {
                console.warn('Hive Auth: token expired');
                clearLoginInstructions();
                callbackFn({
                    success: false,
                    error: tt('hiveauthservices.tokenExpired'),
                });
            }
        }
    )
        .then((res) => {
            const { cmd, data, uuid } = res;
            const { expire, token, challenge: challengeResponse } = data;
            switch (cmd) {
                case 'auth_ack':
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
                    break;

                case 'auth_nack':
                    console.warn('Hive Auth: user has rejected the auth request', uuid);
                    clearLoginInstructions();
                    callbackFn({
                        success: false,
                        error: tt('hiveauthservices.userRejectedRequest'),
                    });
                    break;

                default:
                    console.warn(`Hive Auth: auth request returned an unknown command ${cmd}`, uuid);
                    clearLoginInstructions();
                    callbackFn({
                        success: false,
                        error: tt('hiveauthservices.unknownCommand'),
                    });
                    break;
            }
        })
        .catch((err) => {
            console.error('Hive Auth: server returned an error during authentication', err.message);
            clearLoginInstructions();
            callbackFn({
                success: false,
                error: tt('hiveauthservices.requestExpired'),
            });
        });
};

const requestAndVerifyChallenge = async (type, callbackFn) => {
    console.log(`Hive Auth: requesting ${type} key challenge`);
    const qrElement = document.getElementById('hiveauth-qr');
    qrElement.classList.remove('show');
    updateLoginInstructions(tt('hiveauthservices.verifyPostingKeyInstructions'));

    const status = HAS.default.status();

    if (!status.connected) {
        await HAS.default.connect();
    }

    try {
        const challenge = JSON.stringify({
            login: auth.username,
            ts: Date.now()
        });
        const response = await HAS.default.challenge(auth, { key_type: type, challenge });
        const { cmd, uuid, data } = response;

        if (cmd === 'challenge_ack') {
            const verified = verifyChallenge(challenge, data);

            if(verified) {
                console.log("Hive Auth: challenge succeeded");
                callbackFn({
                    success: true,
                });
            } else {
                console.warn("Hive Auth: challenge failed", uuid);
                callbackFn({
                    success: false,
                    error: tt('hiveauthservices.publicKeyMatchingError'),
                });
            }
        } else {
            console.warn(`Hive Auth: challenge request returned an unknown command ${cmd}`, uuid);
            callbackFn({
                success: false,
                error: tt('hiveauthservices.unknownCommand'),
            });
        }
    } catch(e) {
        console.error("Hive Auth: challenge failed");
        callbackFn({
            success: false,
            error: tt('hiveauthservices.failedProcessingChallenge'),
        });
    }
};

export default {
    login,
    setUsername,
    setKey,
    setToken,
    setExpire,
    requestAndVerifyChallenge,
    isLoggedInWithHiveAuth,
    broadcast,
};
