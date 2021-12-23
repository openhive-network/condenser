import xmldom from 'xmldom';
import tt from 'counterpart';
import hljs from 'highlight.js';
import linksRe, { any as linksAny } from 'app/utils/Links';
import { validate_account_name } from 'app/utils/ChainValidation';
import { proxifyImageUrl } from 'app/utils/ProxifyUrl';
import * as Phishing from 'app/utils/Phishing';
import { embedNode as EmbeddedPlayerEmbedNode, preprocessHtml } from 'app/components/elements/EmbeddedPlayers';
import { extractMetadata as youTubeId } from 'app/components/elements/EmbeddedPlayers/youtube';

export const getPhishingWarningMessage = () => tt('g.phishy_message');
export const getExternalLinkWarningMessage = () => tt('g.external_link_message');

const noop = () => {};
const DOMParser = new xmldom.DOMParser({
    errorHandler: { warning: noop, error: noop },
});
const XMLSerializer = new xmldom.XMLSerializer();

/**
 * Functions performed by HTMLReady
 *
 * State reporting
 *  - hashtags: collect all #tags in content
 *  - usertags: collect all @mentions in content
 *  - htmltags: collect all html <tags> used (for validation)
 *  - images: collect all image URLs in content
 *  - links: collect all href URLs in content
 *
 * Mutations
 *  - link()
 *    - ensure all <a> href's begin with a protocol. prepend https:// otherwise.
 *  - iframe()
 *    - wrap all <iframe>s in <div class="videoWrapper"> for responsive sizing
 *  - img()
 *    - change relative protocol to https://
 *  - linkifyNode()
 *    - scans text content to be turned into rich content
 *    - embedYouTubeNode()
 *      - identify plain youtube URLs and prep them for "rich embed"
 *    - linkify()
 *      - scan text for:
 *        - #tags, convert to <a> links
 *        - @mentions, convert to <a> links
 *        - naked URLs
 *          - if img URL, normalize URL and convert to <img> tag
 *          - otherwise, normalize URL and convert to <a> link
 *  - proxifyImages()
 *    - prepend proxy URL to any non-local <img> src's
 *
 * We could implement 2 levels of HTML mutation for maximum reuse:
 *  1. Normalization of HTML - non-proprietary, pre-rendering cleanup/normalization
 *    - (state reporting done at this level)
 *    - normalize URL protocols
 *    - convert naked URLs to images/links
 *    - convert embeddable URLs to <iframe>s
 *    - basic sanitization?
 *  2. hive.blog Rendering - add in proprietary hive.blog functions/links
 *    - convert <iframe>s to custom objects
 *    - linkify #tags and @mentions
 *    - proxify images
 *
 * TODO:
 *    - schema normalization
 *    - gracefully handle protocols like ftp, mailto
 */


/** Split the HTML on top-level elements. This allows react to compare separately, preventing excessive re-rendering.
 * Used in MarkdownViewer.jsx
 */
// export function sectionHtml (html) {
//   const doc = DOMParser.parseFromString(html, 'text/html')
//   const sections = Array(...doc.childNodes).map(child => XMLSerializer.serializeToString(child))
//   return sections
// }

/** Embed videos, link mentions and hashtags, etc...
    If hideImages and mutate is set to true all images will be replaced
    by <pre> elements containing just the image url.
*/
export default function (html, { mutate = true, hideImages = false } = {}) {
    const state = { mutate };
    state.hashtags = new Set();
    state.usertags = new Set();
    state.htmltags = new Set();
    state.images = new Set();
    state.links = new Set();
    try {
        const doc = DOMParser.parseFromString(preprocessHtml(html), 'text/html');
        traverse(doc, state);
        if (mutate) {
            if (hideImages) {
                // eslint-disable-next-line no-restricted-syntax
                for (const image of Array.from(doc.getElementsByTagName('img'))) {
                    const pre = doc.createElement('pre');
                    pre.setAttribute('class', 'image-url-only');
                    pre.appendChild(doc.createTextNode(image.getAttribute('src')));
                    image.parentNode.replaceChild(pre, image);
                }
            } else {
                proxifyImages(doc);
            }
        }
        if (!mutate) return state;
        return {
            html: doc ? XMLSerializer.serializeToString(doc) : '',
            ...state,
        };
    } catch (error) {
        // xmldom error is bad
        console.error('rendering error', JSON.stringify({ error: error.message, html }));
        return { html: '' };
    }
}

function traverse(node, state, depth = 0) {
    if (!node || !node.childNodes) return;
    Array.from(node.childNodes).forEach((child) => {
        // console.log(depth, 'child.tag,data', child.tagName, child.data)
        const tag = child.tagName ? child.tagName.toLowerCase() : null;
        if (tag) state.htmltags.add(tag);

        if (tag === 'img') img(state, child);
        else if (tag === 'iframe') iframe(state, child);
        else if (tag === 'a') link(state, child);
        else if (child.nodeName === '#text') linkifyNode(child, state);

        traverse(child, state, depth + 1);
    });
}

function traverseForCodeHighlight(node, depth = 0) {
    if (!node || !node.childNodes) return;
    Array.from(node.childNodes).forEach((child) => {
        const tag = child.tagName ? child.tagName.toLowerCase() : null;
        if (tag === 'code' && child.textContent.match(/\n/)) {
            const highlightedContent = hljs.highlightAuto(child.textContent).value;

            child.parentNode.replaceChild(DOMParser.parseFromString(`<code>${highlightedContent}</code>`), child);
        }

        traverseForCodeHighlight(child, depth + 1);
    });
}

export function highlightCodes(html) {
    if (html.match(/<code>.*?<\/code>/s)) {
        const doc = DOMParser.parseFromString(html, 'text/html');
        traverseForCodeHighlight(doc);
        return {
            html: doc ? XMLSerializer.serializeToString(doc) : '',
        };
    }

    return {
        html: null,
    };
}

function link(state, child) {
    const url = child.getAttribute('href');
    if (url) {
        state.links.add(url);
        if (state.mutate) {
            // If this link is not relative, http, https, hive -- add https.
            if (!/^((#)|(\/(?!\/))|(((hive|https?):)?\/\/))/.test(url)) {
                child.setAttribute('href', 'https://' + url);
            }

            // Unlink potential phishing attempts
            if (
                (url.indexOf('#') !== 0 // Allow in-page links
                    && child.textContent.match(/(www\.)?hive\.blog/i)
                    && !url.match(/https?:\/\/(.*@)?(www\.)?hive\.blog/i))
                || Phishing.looksPhishy(url)
            ) {
                const phishyDiv = child.ownerDocument.createElement('div');
                phishyDiv.textContent = `${child.textContent} / ${url}`;
                phishyDiv.setAttribute('title', getPhishingWarningMessage());
                phishyDiv.setAttribute('class', 'phishy');
                child.parentNode.replaceChild(phishyDiv, child);
            }
        }
    }
}

// wrap iframes in div.videoWrapper to control size/aspect ratio
function iframe(state, child) {
    const url = child.getAttribute('src');

    // @TODO move this into the centralized EmbeddedPlayer code
    if (url) {
        const { images, links } = state;
        const yt = youTubeId(url);

        if (yt && images && links) {
            links.add(yt.url);
            images.add('https://img.youtube.com/vi/' + yt.id + '/0.jpg');
        }
    }

    const { mutate } = state;
    if (!mutate) return;

    const tag = child.parentNode.tagName ? child.parentNode.tagName.toLowerCase() : child.parentNode.tagName;
    if (
        tag === 'div'
        && child.parentNode.classList
        && child.parentNode.classList.contains('videoWrapper')
        && child.parentNode.classList.contains('redditWrapper')
        && child.parentNode.classList.contains('tweetWrapper')
    ) {
        return;
    }

    const html = XMLSerializer.serializeToString(child);
    const width = child.attributes.getNamedItem('width');
    const height = child.attributes.getNamedItem('height');

    let aspectRatioPercent = 100;
    if (width && height) {
      aspectRatioPercent = (height.value / width.value) * 100;
    }

    child.parentNode.replaceChild(DOMParser.parseFromString(
    `<div class="iframeWrapper">${html}</div>`
    ), child);
    const styleAttr = document.createAttribute("style");
    styleAttr.value = `position: relative; width: 100%; height: 0; padding-bottom: ${aspectRatioPercent}%;`;
    child.attributes.setNamedItem(styleAttr);
}

function img(state, child) {
    const url = child.getAttribute('src');
    if (url) {
        state.images.add(url);
        if (state.mutate) {
            let url2 = url;
            if (/^\/\//.test(url2)) {
                // Change relative protocol imgs to https
                url2 = 'https:' + url2;
            }
            if (url2 !== url) {
                child.setAttribute('src', url2);
            }
        }
    }
}

function proxifyImages(doc) {
    if (!doc) return;

    Array.from(doc.getElementsByTagName('img')).forEach((node) => {
        const url = node.getAttribute('src');

        if (!linksRe.local.test(url)) {
            const proxifiedImageUrl = proxifyImageUrl(url, true);
            node.setAttribute('src', proxifiedImageUrl);
        }
    });
}

function linkifyNode(child, state) {
    try {
        const tag = child.parentNode.tagName ? child.parentNode.tagName.toLowerCase() : child.parentNode.tagName;
        if (tag === 'code') return;
        if (tag === 'a') return;

        const { mutate } = state;
        if (!child.data) return;

        child = EmbeddedPlayerEmbedNode(child, state.links, state.images);

        const data = XMLSerializer.serializeToString(child);
        const content = linkify(data, state.mutate, state.hashtags, state.usertags, state.images, state.links);
        if (mutate && content !== data) {
            const newChild = DOMParser.parseFromString(`<span>${content}</span>`);
            child.parentNode.replaceChild(newChild, child);
            // eslint-disable-next-line consistent-return
            return newChild;
        }
    } catch (error) {
        console.error('linkify_error', error);
    }
}

function linkify(content, mutate, hashtags, usertags, images, links) {
    // hashtag
    content = content.replace(/(^|\s)(#[-a-z\d]+)/gi, (tag) => {
        if (/#[\d]+$/.test(tag)) return tag; // Don't allow numbers to be tags
        const space = /^\s/.test(tag) ? tag[0] : '';
        const tag2 = tag.trim().substring(1);
        const tagLower = tag2.toLowerCase();
        if (hashtags) hashtags.add(tagLower);
        if (!mutate) return tag;
        return space + `<a href="/trending/${tagLower}">${tag}</a>`;
    });

    // usertag (mention)
    // Cribbed from https://github.com/twitter/twitter-text/blob/v1.14.7/js/twitter-text.js#L90
    content = content.replace(
        /(^|[^a-zA-Z0-9_!#$%&*@＠/=]|(^|[^a-zA-Z0-9_+~.-/#=]))[@＠]([a-z][-.a-z\d]+[a-z\d])/gi,
        (match, preceeding1, preceeding2, user) => {
            const userLower = user.toLowerCase();
            const valid = validate_account_name(userLower) == null;

            if (valid && usertags) usertags.add(userLower);

            const preceedings = (preceeding1 || '') + (preceeding2 || ''); // include the preceeding matches if they exist

            if (!mutate) return `${preceedings}${user}`;

            return valid ? `${preceedings}<a href="/@${userLower}">@${user}</a>` : `${preceedings}@${user}`;
        }
    );

    content = content.replace(linksAny('gi'), (ln) => {
        if (linksRe.image.test(ln)) {
            if (images) images.add(ln);
            return `<img src="${ln}" />`;
        }

        // do not linkify .exe or .zip urls
        if (/\.(zip|exe)$/i.test(ln)) return ln;

        // do not linkify phishy links
        if (Phishing.looksPhishy(ln)) return `<div title='${getPhishingWarningMessage()}' class='phishy'>${ln}</div>`;

        if (links) links.add(ln);
        return `<a href="${ln}">${ln}</a>`;
    });
    return content;
}
