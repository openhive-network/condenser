import React from 'react';

/**
 * Regular expressions for detecting and validating provider URLs
 * https://open.spotify.com/show/6C1Q7ITJKvZVosOdC9M1RM?si=dKAVgQw4Squbnnt5R68bdg
 * https://open.spotify.com/episode/7iVhSqisUmWEEHmEG67gxS?si=eNP1iEsmRBCed0SFo4n_QA
 * https://open.spotify.com/playlist/5UV4uC6N0lZ7q9ui3yIbqn?si=v-oAN2mOT5i4bFk0NrRjqw
 * @type {{htmlReplacement: RegExp, main: RegExp, sanitize: RegExp}}
 */
const regex = {
    main: /(?:https?:\/\/(?:(?:open.spotify.com\/(playlist|show|episode)\/(.*))))/i,
    sanitize: /^https:\/\/open\.spotify\.com\/(embed|embed-podcast)\/(playlist|show|episode)\/(.*)/i,
};

export default regex;

export function getIframeDimensions() {
    return {
        width: '100%',
        height: '240',
    };
}

/**
 * Configuration for HTML iframe's `sandbox` attribute
 * @type {useSandbox: boolean, sandboxAttributes: string[]}
 */
export const sandboxConfig = {
    useSandbox: true,
    sandboxAttributes: [
        'allow-scripts',
        'allow-same-origin',
        'allow-popups',
        'allow-forms',
    ],
};

/**
 * Check if the iframe code in the post editor is to an allowed URL
 * <iframe src="https://open.spotify.com/embed/playlist/37i9dQZF1DWSDCcNkUu5tr" width="300" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
 * <iframe src="https://open.spotify.com/embed-podcast/show/6C1Q7ITJKvZVosOdC9M1RM" width="100%" height="232" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
 * <iframe src="https://open.spotify.com/embed-podcast/episode/49EzBVgb4exGi2AIRKmTGK" width="100%" height="232" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
 * @param url
 * @returns {boolean|*}
 */
export function validateIframeUrl(url) {
    const match = url.match(regex.sanitize);

    if (!match || match.length !== 4) {
        return false;
    }

    return `https://open.spotify.com/${match[1]}/${match[2]}/${match[3]}`;
}

/**
 * Extract the content ID and other metadata from the URL
 * @param data
 * @returns {null|{id: *, canonical: string, url: *}}
 */
function extractMetadata(data) {
    if (!data) return null;
    const m = data.match(regex.main);
    if (!m || m.length < 2) return null;

    const startTime = m.input.match(/t=(\d+)s?/);
    const embed = m[1] === 'playlist' ? 'embed' : 'embed-podcast';

    return {
        id: `${embed}/${m[1]}/${m[2]}`,
        url: m[0],
        startTime: startTime ? startTime[1] : 0,
        canonical: `https://open.spotify.com/${m[1]}/${m[2]}`,
    };
}

/**
 * Replaces the URL with a custom Markdown for embedded players
 * @param child
 * @param links
 * @returns {*}
 */
export function embedNode(child, links /*images*/) {
    try {
        const { data } = child;
        const spotify = extractMetadata(data);
        if (!spotify) return child;

        child.data = data.replace(
            spotify.url,
            `~~~ embed:${spotify.id} spotify ~~~`
        );

        if (links) links.add(spotify.canonical);
        // if(images) images.add(spotify.thumbnail) // not available
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
 * @returns {*}
 */
export function genIframeMd(idx, id, width, height) {
    const url = `https://open.spotify.com/${id}`;

    let sandbox = sandboxConfig.useSandbox;
    if (sandbox) {
        if (
            Object.prototype.hasOwnProperty.call(
                sandboxConfig,
                'sandboxAttributes'
            )
        ) {
            sandbox = sandboxConfig.sandboxAttributes.join(' ');
        }
    }
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
        <div key={`spotify-${id}-${idx}`} className="videoWrapper">
            <iframe
                title="spotify embedded player"
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...iframeProps}
            />
        </div>
    );
}
