const humanize = require('humanize-number');
const bytes = require('bytes');

module.exports = prod_logger;

function prod_logger() {
    return function* logger(next) {
        // request
        const start = new Date();
        const asset = this.originalUrl.indexOf('/assets/') === 0
            || this.originalUrl.indexOf('/images/') === 0
            || this.originalUrl.indexOf('/favicon.ico') === 0;
        if (!asset) console.log('  <-- ' + this.method + ' ' + this.originalUrl + ' ' + (this.session.uid || ''));
        try {
            yield next;
        } catch (err) {
            log(this, start, null, err, false);
            throw err;
        }
        const { length } = this.response;
        log(this, start, length, null, asset);
    };
}

function log(ctx, start, len, err, asset) {
    const status = err ? err.status || 500 : ctx.status || 404;

    let length;
    // eslint-disable-next-line no-bitwise
    if (~[204, 205, 304].indexOf(status)) {
        length = '';
    } else if (len == null) {
        length = '-';
    } else {
        length = bytes(len);
    }

    const upstream = err ? 'xxx' : '-->';

    if (!asset || err || ctx.status > 400) { console.log(
            '  ' + upstream + ' %s %s %s %s %s %s',
            ctx.method,
            ctx.originalUrl,
            status,
            time(start),
            length,
            ctx.session.uid || ''
        ); }
}

function time(start) {
    let delta = new Date() - start;
    delta = delta < 10000 ? delta + 'ms' : Math.round(delta / 1000) + 's';
    return humanize(delta);
}
