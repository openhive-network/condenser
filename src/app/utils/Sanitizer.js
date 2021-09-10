import StripTags from 'striptags';
import RemoveMd from 'remove-markdown';

const getTextOnly = (text) => {
    let sanitizedText = StripTags(text);
    sanitizedText = RemoveMd(sanitizedText);
    sanitizedText = sanitizedText.replace(/[^a-zA-Z0-9-_. \n]/g, '');

    return sanitizedText;
};

export default {
    getTextOnly,
};
