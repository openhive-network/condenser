import remarkableStripper from 'app/utils/RemarkableStripper';
import sanitize from 'sanitize-html';
import { htmlDecode } from 'app/utils/Html';
import HtmlReady from 'shared/HtmlReady';
import { Remarkable } from 'remarkable';
import _ from 'lodash';

const remarkable = new Remarkable({ html: true });

const getValidImage = (array) => {
    return array && Array.isArray(array) && array.length >= 1 && typeof array[0] === 'string' ? array[0] : null;
};

export function extractRtags(body = null) {
    let rtags;
    {
        const isHtml = /^<html>([\S\s]*)<\/html>$/.test(body);
        const htmlText = isHtml
            ? body
            : remarkable.render(body.replace(/<!--([\s\S]+?)(-->|$)/g, '(html comment removed: $1)'));
        rtags = HtmlReady(htmlText, { mutate: false });
    }

    return rtags;
}

export function extractImageLink(json_metadata, body = null) {
    const json = json_metadata || {};

    let jsonImage;
    if (typeof json.get === 'function') {
        jsonImage = json.get('image');
    } else {
        jsonImage = _.get(json, 'image');
    }
    let image_link;

    try {
        image_link = jsonImage ? getValidImage(Array.from(jsonImage)) : null;
    } catch (error) {
        // Nothing
    }

    // If nothing found in json metadata, parse body and check images/links
    if (!image_link) {
        const rtags = extractRtags(body);

        if (rtags.images) {
            [image_link] = Array.from(rtags.images);
        }
    }

    return image_link;
}

/**
 * Short description - remove bold and header, links with titles.
 *
 * if `strip_quotes`, try to remove any block quotes at beginning of body.
 */
export function extractBodySummary(body, stripQuotes = false) {
    let desc = body;

    if (stripQuotes) desc = desc.replace(/(^(\n|\r|\s)*)>([\s\S]*?).*\s*/g, '');
    desc = remarkableStripper.render(desc); // render markdown to html
    desc = sanitize(desc, { allowedTags: [] }); // remove all html, leaving text
    desc = htmlDecode(desc);

    // Strip any raw URLs from preview text
    desc = desc.replace(/(hive|https)?:\/\/[^\s]+/g, '');

    // Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
    // eslint-disable-next-line prefer-destructuring
    desc = desc.trim().split('\n')[0];

    if (desc.length > 200) {
        desc = desc.substring(0, 200).trim();

        // Truncate, remove the last (likely partial) word (along with random punctuation), and add ellipses
        desc = desc
            .substring(0, 180)
            .trim()
            .replace(/[,!?]?\s+[^\s]+$/, '…');
    }

    return desc;
}

export function getPostSummary(jsonMetadata, body, stripQuotes = false) {
    let shortDescription;
    if (jsonMetadata && typeof jsonMetadata.get === 'function') {
        shortDescription = jsonMetadata.get('description');
    } else {
        shortDescription = _.get(jsonMetadata, 'description');
    }

    if (!shortDescription) {
        return extractBodySummary(body, stripQuotes);
    }

    return shortDescription;
}
