/* global $STM_Config */
import { isDefaultImageSize, defaultSrcSet } from 'app/utils/ProxifyUrl';
import { getPhishingWarningMessage, getExternalLinkWarningMessage } from 'shared/HtmlReady'; // the only allowable title attributes for div and a tags

import { validateIframeUrl as validateEmbbeddedPlayerIframeUrl } from 'app/components/elements/EmbeddedPlayers';

export const allowedTags = `
    div, iframe, del,
    a, p, b, i, q, br, ul, li, ol, img, h1, h2, h3, h4, h5, h6, hr,
    blockquote, pre, code, em, strong, center, table, thead, tbody, tr, th, td,
    strike, sup, sub
`
    .trim()
    .split(/,\s*/);

// Medium insert plugin uses: div, figure, figcaption, iframe
export default (
    {
        large = true,
        highQualityPost = true,
        noImage = false,
        noImageText = '(Link not shown due to low ratings)',
        sanitizeErrors = [],
        noLink = false,
        noLinkText = '(Image not shown due to low ratings)',
    }
) => ({
    allowedTags,
    // figure, figcaption,

    // SEE https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    allowedAttributes: {
        // "src" MUST pass a whitelist (below)
        iframe: [
            'src',
            'width',
            'height',
            'frameborder',
            'allowfullscreen',
            'webkitallowfullscreen',
            'mozallowfullscreen',
            'sandbox',
            'class',
        ],

        // class attribute is strictly whitelisted (below)
        // and title is only set in the case of a phishing warning
        div: ['class', 'title'],

        // style is subject to attack, filtering more below
        td: ['style'],
        th: ['style'],
        img: ['src', 'srcset', 'alt', 'class'],

        // title is only set in the case of an external link warning
        a: ['href', 'rel', 'title', 'class', 'target'],
    },
    allowedSchemes: ['http', 'https', 'steem', 'esteem'],
    transformTags: {
        iframe: (tagName, attribs) => {
            const srcAtty = attribs.src;
            const widthAtty = attribs.width;
            const heightAtty = attribs.height;
            const {
                validUrl,
                useSandbox,
                sandboxAttributes,
                width,
                height,
                providerId,
            } = validateEmbbeddedPlayerIframeUrl(srcAtty, large, widthAtty, heightAtty);

            if (validUrl !== false) {
                const iframe = {
                    tagName: 'iframe',
                    attribs: {
                        frameborder: '0',
                        allowfullscreen: 'allowfullscreen',
                        webkitallowfullscreen: 'webkitallowfullscreen', // deprecated but required for vimeo : https://vimeo.com/forums/help/topic:278181
                        mozallowfullscreen: 'mozallowfullscreen', // deprecated but required for vimeo
                        src: validUrl,
                        width,
                        height,
                        class: `${providerId}-iframe`,
                    },
                };
                if (useSandbox) {
                    if (sandboxAttributes.length > 0) {
                        iframe.attribs.sandbox = sandboxAttributes.join(' ');
                    } else {
                        iframe.attribs.sandbox = true;
                    }
                }
                return iframe;
            }

            console.log('Blocked, did not match iframe "src" white list urls:', tagName, attribs);

            sanitizeErrors.push('Invalid iframe URL: ' + srcAtty);
            return { tagName: 'div', text: `(Unsupported ${srcAtty})` };
        },
        img: (tagName, attribs) => {
            if (noImage) return { tagName: 'i', text: noImageText };
            //See https://github.com/punkave/sanitize-html/issues/117
            let { src } = attribs;
            const { alt } = attribs;
            if (!/^(https?:)?\/\//i.test(src)) {
                console.log('Blocked, image tag src does not appear to be a url', tagName, attribs);
                sanitizeErrors.push('An image in this post did not save properly.');
                return { tagName: 'img', attribs: { src: 'brokenimg.jpg' } };
            }

            // replace http:// with // to force https when needed
            src = src.replace(/^http:\/\//i, '//');
            const atts = { src };
            if (alt && alt !== '') atts.alt = alt;
            if (isDefaultImageSize(src)) {
                atts.srcset = defaultSrcSet(src);
            }
            return { tagName, attribs: atts };
        },
        div: (tagName, attribs) => {
            const attys = {};
            const classWhitelist = [
                'pull-right',
                'pull-left',
                'text-justify',
                'text-rtl',
                'text-center',
                'text-right',
                'videoWrapper',
                'iframeWrapper',
                'redditWrapper',
                'tweetWrapper',
                'phishy',
            ];
            const validClass = classWhitelist.find((e) => attribs.class == e);
            if (validClass) attys.class = validClass;
            if (validClass === 'phishy' && attribs.title === getPhishingWarningMessage()) attys.title = attribs.title;
            return {
                tagName,
                attribs: attys,
            };
        },
        th: (tagName, attribs) => {
            const attys = {};
            const allowedStyles = ['text-align:right', 'text-align:left', 'text-align:center'];
            if (allowedStyles.indexOf(attribs.style) !== -1) {
                attys.style = attribs.style;
            }

            return {
                tagName,
                attribs: attys,
            };
        },
        td: (tagName, attribs) => {
            const attys = {};
            const allowedStyles = ['text-align:right', 'text-align:left', 'text-align:center'];
            if (allowedStyles.indexOf(attribs.style) !== -1) {
                attys.style = attribs.style;
            }

            return {
                tagName,
                attribs: attys,
            };
        },
        a: (tagName, attribs) => {
            if (noLink) {
                return {
                    tagName: 'i',
                    text: noLinkText,
                };
            }
            let { href } = attribs;
            if (!href) href = '#';
            href = href.trim();
            const attys = { href };
            // If it's not a (relative or absolute) hive URL...
            if (!href.match(`^(/(?!/)|https://${$STM_Config.site_domain})`)) {
                attys.target = '_blank';
                attys.rel = highQualityPost ? 'noreferrer noopener' : 'nofollow noreferrer noopener';
                attys.title = getExternalLinkWarningMessage();
                attys.class = 'external_link';
            }
            return {
                tagName,
                attribs: attys,
            };
        },
    },
});
