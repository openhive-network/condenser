import React from 'react';

/**
 * Regular expressions for detecting and validating provider URLs
 * @type {{htmlReplacement: RegExp, main: RegExp}}
 */
// <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@quochuync/video/7009483703462202625" data-video-id="7009483703462202625" style="max-width: 605px;min-width: 325px;" > <section> <a target="_blank" title="@quochuync" href="https://www.tiktok.com/@quochuync">@quochuync</a> <p>Making an aluminium flat bar mark tree. <a title="chime" target="_blank" href="https://www.tiktok.com/tag/chime">##chime</a> <a title="windchime" target="_blank" href="https://www.tiktok.com/tag/windchime">##windchime</a> <a title="marktree" target="_blank" href="https://www.tiktok.com/tag/marktree">##marktree</a> <a title="percussion" target="_blank" href="https://www.tiktok.com/tag/percussion">##percussion</a> <a title="musicinstrument" target="_blank" href="https://www.tiktok.com/tag/musicinstrument">##musicinstrument</a> <a title="music" target="_blank" href="https://www.tiktok.com/tag/music">##music</a> <a title="crafts" target="_blank" href="https://www.tiktok.com/tag/crafts">##crafts</a> <a title="diy" target="_blank" href="https://www.tiktok.com/tag/diy">##diy</a></p> <a target="_blank" title="♬ original sound - Quốc Huy" href="https://www.tiktok.com/music/original-sound-7009483610071845634">♬ original sound - Quốc Huy</a> </section> </blockquote> <script async src="https://www.tiktok.com/embed.js"></script>
const regex = {
    main: /^https:\/\/www.tiktok.com\/@([A-Za-z0-9_\-/.]+)\/video\/([^?]+)(.*)$/i,
    htmlReplacement: /<blockquote class="tiktok-embed" cite="https:\/\/www.tiktok.com\/@([A-Za-z0-9_\-/.]+)\/video\/([0-9]*?)".*<\/script>/i,
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
 * Extract the content ID and other metadata from the URL
 * @param data
 * @returns {null|{id: *, canonical: string, url: *}}
 */
export function extractMetadataFromEmbedCode(data) {
    if (!data) return null;

    const match = data.match(regex.htmlReplacement);

    if (match) {
        const author = match[1];
        const id = match[2];
        const url = match[0];

        return {
            id,
            fullId: id,
            url,
            canonical: url,
            thumbnail: null,
            author,
        };
    }

    return null;
}

/**
 * Extract the content ID and other metadata from the URL
 * @param data
 * @returns {null|{id: *, canonical: string, url: *}}
 */
export function extractMetadata(data) {
    if (!data) return null;

    const match = data.match(regex.main);
    if (match) {
        const url = match[0];
        const author = match[1];
        const id = match[2];

        return {
            id,
            fullId: id,
            url,
            canonical: null,
            thumbnail: null,
            author,
        };
    }

    return null;
}

function generateTikTokCode(metadata) {
    let tiktokCode = '';
    if (metadata) {
        let [author, id] = Buffer.from(metadata, 'base64').toString().split('|');

        // Sanitizing input
        author = author.replace(/(<([^>]+)>)/gi, '');
        id = id.replace(/[^0-9]/gi, '');

        tiktokCode = `<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@${author}/video/${id}" `
            + 'data-video-id="7009483703462202625" style="max-width: 605px;min-width: 325px;" > '
            + '<section/> '
            + '</blockquote>';
    }

    return {
        __html: tiktokCode,
    };
}

/**
 * Generates the Markdown/HTML code to override the detected URL with an iFrame
 * @param idx
 * @param tiktokId
 * @param width
 * @param height
 * @param metadata
 * @returns {*}
 */
export function genIframeMd(idx, tiktokId, width, height, metadata) {
    if (typeof window !== 'undefined') {
        return (
            <div
                key={`tiktok-${tiktokId}-${idx}`}
                className="iframeWrapper"
                dangerouslySetInnerHTML={generateTikTokCode(metadata)}
            />
        );
    }

    return null;
}

/**
 * Replaces the URL with a custom Markdown for embedded players
 * @param child
 * @returns {*}
 */
export function embedNode(child) {
    try {
        const { data } = child;
        const tiktok = extractMetadata(data);

        if (tiktok) {
            const metadata = `${tiktok.author}|${tiktok.id}`;
            child.data = data.replace(
                regex.main,
                `~~~ embed:${tiktok.id} tiktok metadata:${Buffer.from(metadata).toString('base64')} ~~~`
            );
        }
    } catch (error) {
        console.log(error);
    }

    return child;
}

/**
 * Pre-process HTML codes from the Markdown before it gets transformed
 * @param child
 * @returns {string}
 */
export function preprocessHtml(child) {
    try {
        if (typeof child === 'string') {
            const tiktok = extractMetadataFromEmbedCode(child);
            if (tiktok) {
                const metadata = `${tiktok.author}|${tiktok.id}`;
                child = child.replace(
                    regex.htmlReplacement,
                    `~~~ embed:${tiktok.id} tiktok metadata:${Buffer.from(metadata).toString('base64')} ~~~`
                );
            }
        }
    } catch (error) {
        console.log(error);
    }

    return child;
}
