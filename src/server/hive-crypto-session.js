import sodium from 'libsodium-wrappers';
import session from 'koa-session';

export default function hiveCryptoSession(app, opts) {
    opts = opts || {};

    if (opts.signed === undefined) {
        opts.signed = true;
    }

    let secret;
    try {
        secret = Buffer.from(opts.crypto_key, 'base64');
        if(secret.length !== sodium.crypto_secretbox_KEYBYTES) {
            throw new Error(`Crypto key should decode to ${sodium.crypto_secretbox_KEYBYTES} bytes in length`);
        }
    } catch(error) {
        throw new Error('Missing or invalid options.crypto_key', error);
    }

    opts.encode = encode;
    opts.decode = decode;

    app.use(session(opts, app));

    function encode(body) {
        try {
            body = JSON.stringify(body);
            const plainbuf = Buffer.from(body);
            const cipherbuf = encrypt(plainbuf, secret);
            // console.log(`crypto-session:${cipherbuf.toString('base64')}`);
            return `crypto-session:${cipherbuf.toString('base64')}`;
        } catch(err) {
            console.error('hive-crypto-session: encode error resetting session', body, err, (err ? err.stack : undefined));
            return encrypt(Buffer.from('').toString('base64'), secret);
        }
    }

    function decode(text) {
        try {
            if(!/^crypto-session:/.test(text)) {
                throw 'Unrecognized encrypted session format.';
            }

            text = text.substring('crypto-session:'.length);
            const buf = Buffer.from(text, 'base64');
            const body = decrypt(buf, secret).toString('utf8');
            const json = JSON.parse(body);

            // check if the cookie is expired
            if (!json._expire) return null;
            if (json._expire < Date.now()) return null;

            return json;
        } catch(err) {
            console.log(err);
            try {
                const jsonString = Buffer.from(text, 'base64').toString('utf8');
                JSON.parse(jsonString);
                // Already JSON
                console.log('hive-crypto-session: Encrypting plaintext session.', jsonString);
                return text;
            } catch(error2) { // debug('decode %j error: %s', json, err);
                throw new Error('hive-crypto-session: Discarding session: ' + text);
            }
        }
    }
}

/**
 @arg {Buffer} buf
 @return {Buffer}
 */
function encrypt(buf, secret) {
    const nonce = Buffer.from(sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES));
    const ciphertext = sodium.crypto_secretbox_easy(buf, nonce, secret);
    return Buffer.concat([nonce, Buffer.from(ciphertext)]);
}

/**
 @arg {Buffer} buf
 @return Buffer
 */
function decrypt(buf, secret) {
    const nonce = buf.slice(0, sodium.crypto_box_NONCEBYTES);
    const cipherbuf = buf.slice(sodium.crypto_box_NONCEBYTES);
    return sodium.crypto_secretbox_open_easy(cipherbuf, nonce, secret, 'text');
}
