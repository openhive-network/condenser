import React from 'react';

/**
 * Regular expressions for detecting and validating provider URLs
 * @type {{htmlReplacement: RegExp, main: RegExp, sanitize: RegExp}}
 */
const regex = {
    sanitize: /^(https?:)?\/\/www\.youtube\.com\/(embed|shorts)\/.*/i,
    //main: new RegExp(urlSet({ domain: '(?:(?:.*.)?youtube.com|youtu.be)' }), flags),
    // eslint-disable-next-line no-useless-escape
    main: /(?:https?:\/\/)(?:www\.)?(?:(?:youtube\.com\/watch\?v=)|(?:youtu.be\/)|(?:youtube\.com\/(embed|shorts)\/))([A-Za-z0-9_\-]+)[^ ]*/i,
    // eslint-disable-next-line no-useless-escape
    contentId: /(?:(?:youtube\.com\/watch\?v=)|(?:youtu.be\/)|(?:youtube\.com\/(embed|shorts)\/))([A-Za-z0-9_\-]+)/i,
};
export default regex;

/**
 * Configuration for HTML iframe's `sandbox` attribute
 * @type {useSandbox: boolean, sandboxAttributes: string[]}
 */
export const sandboxConfig = {
    useSandbox: false,
    sandboxAttributes: [],
};

/**
 * Check if the iframe code in the post editor is to an allowed URL
 * <iframe width="560" height="315" src="https://www.youtube.com/embed/KOnk7Nbqkhs" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
 * @param url
 * @returns {boolean|*}
 */
export function validateIframeUrl(url) {
    const match = url.match(regex.sanitize);

    if (match) {
        // strip query string (yt: autoplay=1,controls=0,showinfo=0, etc)
        return url.replace(/\?.+$/, '');
    }

    return false;
}

/**
 * Rewrites the embedded URL to a normalized format
 * @param url
 * @returns {string|boolean}
 */
export function normalizeEmbedUrl(url) {
    const match = url.match(regex.contentId);

    if (match && match.length >= 2) {
        return `https://youtube.com/embed/${match[1]}`;
    }

    return false;
}

/**
 * Extract the content ID and other metadata from the URL
 * @param data
 * @returns {null|{id: *, canonical: string, url: *}}
 */
export function extractMetadata(data) {
    if (!data) return null;

    const m1 = data.match(regex.main);
    const url = m1 ? m1[0] : null;

    if (!url) return null;

    const m2 = url.match(regex.contentId);
    const id = m2 && m2.length >= 2 ? m2[2] : null;
    console.log('m2', m2);

    if (!id) return null;

    const startTime = url.match(/t=(\d+)s?/);
    return {
        id,
        url,
        canonical: url,
        startTime: startTime ? startTime[1] : 0,
        thumbnail: 'https://img.youtube.com/vi/' + id + '/0.jpg',
    };
}

/**
 * Replaces the URL with a custom Markdown for embedded players
 * @param child
 * @param links
 * @returns {*}
 */
export function embedNode(child, links, images) {
    try {
        const yt = extractMetadata(child.data);

        if (!yt) return child;

        if (yt.startTime) {
            child.data = child.data.replace(yt.url, `~~~ embed:${yt.id} youtube ${yt.startTime} ~~~`);
        } else {
            child.data = child.data.replace(yt.url, `~~~ embed:${yt.id} youtube ~~~`);
        }

        if (links) links.add(yt.url);
        if (images) images.add(yt.thumbnail);
    } catch (error) {
        console.log(error);
    }

    return child;
}

/**
 * Generates the Markdown/HTML code to override the detected URL with an iFrame
 * @param idx
 * @param id
 * @param width
 * @param height
 * @param startTime
 * @returns {*}
 */
export function genIframeMd(idx, id, width, height, startTime = 0) {
    const url = `https://www.youtube.com/embed/${id}?enablejsapi=0&rel=0&origin=https://hive.blog&start=${startTime}`;

    let sandbox = sandboxConfig.useSandbox;
    if (sandbox) {
        if (Object.prototype.hasOwnProperty.call(sandboxConfig, 'sandboxAttributes')) {
            sandbox = sandboxConfig.sandboxAttributes.join(' ');
        }
    }
    const aspectRatioPercent = (height / width) * 100;
    const iframeProps = {
        src: url,
        width,
        height,
        frameBorder: '0',
        webkitallowfullscreen: 'webkitallowfullscreen',
        mozallowfullscreen: 'mozallowfullscreen',
        allowFullScreen: 'allowFullScreen',
    };
    if (sandbox) {
        iframeProps.sandbox = sandbox;
    }

    return (
        <div
            key={`youtube-${id}-${idx}`}
            className="videoWrapper"
            style={{
                position: 'relative',
                width: '100%',
                height: 0,
                paddingBottom: `${aspectRatioPercent}%`,
            }}
        >
            <iframe
                title="Youtube embedded player"
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...iframeProps}
            />
        </div>
    );
}
