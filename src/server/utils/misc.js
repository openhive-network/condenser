import path from 'path';
import fs from 'fs';

export function getRemoteIp(request) {
    const remote_address = request.headers['x-forwarded-for'] || request.ip;
    const ip_match = remote_address ? remote_address.match(/(\d+\.\d+\.\d+\.\d+)/) : null;
    return ip_match ? ip_match[1] : remote_address;
}

const ip_last_hit = new Map();
export function rateLimitReq(ctx, request) {
    const ip = request.headers['x-forwarded-for'] || request.ip;
    const now = Date.now();

    // purge hits older than minutes_max
    ip_last_hit.forEach((v) => {
        const seconds = (now - v) / 1000;
        if (seconds > 1) {
            ip_last_hit.delete(ip);
        }
    });

    let result = false;
    // if ip is still in the map, abort
    if (ip_last_hit.has(ip)) {
        // console.log(`api rate limited for ${ip}: ${req}`);
        // throw new Error(`Rate limit reached: one call per ${minutes_max} minutes allowed.`);
        console.error(`Rate limit reached: one call per 1 second allowed.`);
        ctx.status = 429;
        ctx.body = 'Too Many Requests';
        result = true;
    }

    // record api hit
    ip_last_hit.set(ip, now);
    return result;
}

export function checkCSRF(ctx, csrf) {
    try {
        ctx.assertCSRF(csrf);
    } catch (e) {
        ctx.status = 403;
        ctx.body = 'invalid csrf token';
        console.log('-- invalid csrf token -->', e, ctx.request.method, ctx.request.url, ctx.session.uid);
        return false;
    }
    return true;
}

export function getSupportedLocales() {
    const locales = [];
    const files = fs.readdirSync(path.join(__dirname, '../../..', 'src/app/locales'));
    // eslint-disable-next-line no-restricted-syntax
    for (const filename of files) {
        const match_res = filename.match(/(\w+)\.json?$/);
        if (match_res) locales.push(match_res[1]);
    }
    return locales;
}

export default {
    getRemoteIp,
    rateLimitReq,
    checkCSRF,
    getSupportedLocales,
};
