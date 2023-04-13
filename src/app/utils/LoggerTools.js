// tslint:disable-next-line: max-line-length
// export const RE_LOCAL_DOMAIN = /^(localhost|^[a-zA-Z0-9_-]+\.localhost\.[a-zA-Z0-9_-]+|127\..+|192\..+)$/;
// We enable `localhost` alone, and anything.anything.localhost.anything
export const RE_LOCAL_DOMAIN = /^(localhost|([a-zA-Z0-9_-]+\.){0,}localhost\.[a-zA-Z0-9_-]+|127\..+|192\..+)$/;
export const RE_TEST_DOMAIN = /\.wet\.ovh$|\.dry\.ovh$|\.engrave\.dev$/;

/**
 * Class for pure JS methods, without any dependencies, even to our
 * application.
 *
 * @export
 * @class LoggerTools
 */
export class LoggerTools {

    /**
     *
     *
     * @static
     * @param {*} [hostname=window.location.hostname]
     * @returns
     * @memberof LoggerTools
     */
    static isLocalDomain(hostname = window?.location?.hostname) {
        return RE_LOCAL_DOMAIN.test(hostname);
    }

    /**
     *
     *
     * @static
     * @param {*} [hostname=window.location.hostname]
     * @returns {boolean}
     * @memberof LoggerTools
     */
    static isTestDomain(hostname = window?.location?.hostname) {
        return RE_TEST_DOMAIN.test(hostname);
    }

}
