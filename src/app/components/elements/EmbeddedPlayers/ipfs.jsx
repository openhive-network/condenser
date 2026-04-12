import React from 'react';

/**
 * Regular expressions for detecting and validating IPFS video URLs
 *
 * Supports common IPFS gateway URL patterns:
 *   https://ipfs.skatehive.app/ipfs/{CID}
 *   https://ipfs.io/ipfs/{CID}
 *   https://gateway.ipfs.io/ipfs/{CID}
 *   https://cloudflare-ipfs.com/ipfs/{CID}
 *   https://dweb.link/ipfs/{CID}
 *   https://{CID}.ipfs.w3s.link
 *   https://{CID}.ipfs.dweb.link
 *
 * @type {{sanitize: RegExp, main: RegExp, contentId: RegExp, subdomain: RegExp}}
 */

// CID v0 (Qm...) or CID v1 (bafy...)
const cidPattern = '[A-Za-z0-9]{46,128}';

const regex = {
    // Matches path-based gateway iframe URLs: https://<gateway>/ipfs/<CID>
    sanitize: new RegExp(
        `^https?:\\/\\/[\\w.-]+\\/ipfs\\/(${cidPattern})`,
        'i'
    ),
    // Matches path-based gateway URLs in post text
    main: new RegExp(
        `https?:\\/\\/[\\w.-]+\\/ipfs\\/(${cidPattern})[^\\s]*`,
        'i'
    ),
    // Extracts the CID from a path-based URL
    contentId: new RegExp(
        `\\/ipfs\\/(${cidPattern})`,
        'i'
    ),
    // Matches subdomain-based gateway URLs: https://<CID>.ipfs.<gateway>
    subdomain: new RegExp(
        `^https?:\\/\\/(${cidPattern})\\.ipfs\\.[\\w.-]+`,
        'i'
    ),
};
export default regex;

/**
 * Configuration for HTML iframe's `sandbox` attribute
 * @type {useSandbox: boolean, sandboxAttributes: string[]}
 */
export const sandboxConfig = {
    useSandbox: false,
    sandboxAttributes: [],
    useVideoTag: true,
};

export function getIframeDimensions(...args) {
    const [large, , width, height] = args;
    if (width && height) {
        return { width, height };
    }
    return {
        width: large ? 640 : 480,
        height: large ? 360 : 270,
    };
}

/**
 * Check if the iframe code in the post editor is to an allowed IPFS URL
 * @param url
 * @returns {boolean|string}
 */
export function validateIframeUrl(url) {
    // Path-based: https://<gateway>/ipfs/<CID>
    const pathMatch = url.match(regex.sanitize);
    if (pathMatch) {
        return url.replace(/\?.*$/, '');
    }

    // Subdomain-based: https://<CID>.ipfs.<gateway>
    const subMatch = url.match(regex.subdomain);
    if (subMatch) {
        return url.replace(/\?.*$/, '');
    }

    return false;
}

/**
 * Rewrites the embedded URL to a normalized format
 * @param url
 * @returns {string|boolean}
 */
export function normalizeEmbedUrl(url) {
    const pathMatch = url.match(regex.contentId);
    if (pathMatch) {
        return url;
    }

    const subMatch = url.match(regex.subdomain);
    if (subMatch) {
        return url;
    }

    return false;
}

/**
 * Extract the content ID and other metadata from the URL
 * @param data
 * @returns {null|{id: string, url: string, canonical: string}}
 */
function extractMetadata(data) {
    if (!data) return null;

    const m = data.match(regex.main);
    if (m) {
        const cidMatch = m[0].match(regex.contentId);
        if (cidMatch) {
            return {
                id: cidMatch[1],
                url: m[0],
                canonical: m[0],
            };
        }
    }

    return null;
}

/**
 * Replaces the URL with a custom Markdown for embedded players
 * @param child
 * @param links
 * @returns {*}
 */
export function embedNode(child, links) {
    try {
        const { data } = child;
        const ipfs = extractMetadata(data);
        if (!ipfs) return child;

        child.data = data.replace(
            ipfs.url,
            `~~~ embed:${ipfs.id} ipfs metadata:${encodeURIComponent(ipfs.url)} ~~~`
        );

        if (links) links.add(ipfs.canonical);
    } catch (error) {
        console.log(error);
    }
    return child;
}

/**
 * Generates the Markdown/HTML code to override the detected URL with an iFrame
 * @param idx
 * @param id - The IPFS CID
 * @param width
 * @param height
 * @param metadata - The original full URL (URI-encoded)
 * @returns {*}
 */
export function genIframeMd(idx, id, width, height, metadata) {
    // Use the original URL if available, otherwise fall back to a public gateway
    const url = metadata ? decodeURIComponent(metadata) : `https://ipfs.io/ipfs/${id}`;
    const aspectRatioPercent = (height / width) * 100;
    return (
        <div
            key={`ipfs-${id}-${idx}`}
            className="videoWrapper"
            style={{
                position: 'relative',
                width: '100%',
                height: 0,
                paddingBottom: `${aspectRatioPercent}%`,
            }}
        >
            <video
                controls
                src={url}
                width={width}
                height={height}
                preload="metadata"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                }}
            >
                <track kind="captions" />
            </video>
        </div>
    );
}
