import BadDomains from '@hiveio/hivescript/bad-domains.json';
import GoodDomains from '@hiveio/hivescript/good-domains.json';

/**
 * Does this URL look like a phishing attempt?
 *
 * @param {string} questionableUrl
 * @returns {boolean}
 */
// eslint-disable-next-line import/prefer-default-export
export const looksPhishy = (questionableUrl) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const domain of BadDomains) {
        if (questionableUrl.toLocaleLowerCase().indexOf(domain) > -1) return true;
    }

    return false;
};

export const isUrlWhitelisted = (url) => {
    for (let di = 0; di < GoodDomains.length; di += 1) {
        const domain = GoodDomains[di];

        if (url.toLocaleLowerCase().indexOf(domain) !== -1) {
            return true;
        }
    }

    return false;
};
