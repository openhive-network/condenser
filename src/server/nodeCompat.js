const util = require('util');

// Restores util APIs that Node 23 removed but unmaintained dependencies still call. Must load before those
// dependencies, as some capture the function at require time.

// require-hacker@3.0.1 (webpack-isomorphic-tools' asset loader, no newer release) calls util.isRegExp.
if (!util.isRegExp) {
    util.isRegExp = util.types.isRegExp;
}

// counterpart@0.17.9 (latest 0.18.6 is unchanged) calls util.isDate in localize(); drop once counterpart is replaced.
if (!util.isDate) {
    util.isDate = util.types.isDate;
}
