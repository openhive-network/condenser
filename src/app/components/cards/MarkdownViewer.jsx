import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Remarkable } from 'remarkable';
import sanitizeConfig, { noImageText } from 'app/utils/SanitizeConfig';
import sanitize from 'sanitize-html';
import HtmlReady, { highlightCodes } from 'shared/HtmlReady';
import tt from 'counterpart';
import { generateMd as EmbeddedPlayerGenerateMd } from 'app/components/elements/EmbeddedPlayers';
import RemarkableSpoiler from '@quochuync/remarkable-spoiler';
import '@quochuync/remarkable-spoiler/styles.css';

class MarkdownViewer extends Component {
    static propTypes = {
        // HTML properties
        text: PropTypes.string,
        className: PropTypes.string,
        large: PropTypes.bool,
        highQualityPost: PropTypes.bool,
        noImage: PropTypes.bool,
        allowDangerousHTML: PropTypes.bool,
        hideImages: PropTypes.bool, // whether to replace images with just a span containing the src url
        breaks: PropTypes.bool, // true to use bastardized markdown that cares about newlines
        // used for the ImageUserBlockList
        lightbox: PropTypes.bool,
    };

    static defaultProps = {
        allowDangerousHTML: false,
        breaks: true,
        className: '',
        hideImages: false,
        large: false,
        lightbox: false,
    };

    constructor() {
        super();
        this.state = { allowNoImage: true };
    }

    shouldComponentUpdate(np, ns) {
        return (
            np.text !== this.props.text || np.large !== this.props.large || ns.allowNoImage !== this.state.allowNoImage
        );
    }

    onAllowNoImage = () => {
        this.setState({ allowNoImage: false });
    };

    render() {
        const { noImage, hideImages, lightbox } = this.props;
        const { allowNoImage } = this.state;
        let { text } = this.props;
        if (!text) text = ''; // text can be empty, still view the link meta data
        const { large, highQualityPost } = this.props;

        let html = false;
        // See also ReplyEditor isHtmlTest
        const m = text.match(/^<html>([\S\s]*)<\/html>$/);
        if (m && m.length === 2) {
            html = true;
            text = m[1];
        } else {
            // See also ReplyEditor isHtmlTest
            html = /^<p>[\S\s]*<\/p>/.test(text);
        }

        // Strip out HTML comments. "JS-DOS" bug.
        text = text.replace(/<!--([\s\S]+?)(-->|$)/g, '(html comment removed: $1)');

        const renderer = new Remarkable({
            html: true, // remarkable renders first then sanitize runs...
            xhtmlOut: true,
            breaks: this.props.breaks,
            typographer: false, // https://github.com/jonschlinkert/remarkable/issues/142#issuecomment-221546793
            quotes: '“”‘’',
        });

        renderer.use(RemarkableSpoiler);

        let renderedText = html ? text : renderer.render(text);

        // If content isn't wrapped with an html element at this point, add it.
        if (!renderedText.indexOf('<html>') !== 0) {
            renderedText = '<html>' + renderedText + '</html>';
        }

        // Embed videos, link mentions and hashtags, etc...
        if (renderedText) renderedText = HtmlReady(renderedText, { hideImages, lightbox }).html;

        // Complete removal of javascript and other dangerous tags..
        // The must remain as close as possible to dangerouslySetInnerHTML
        let cleanText = renderedText;
        if (this.props.allowDangerousHTML === true) {
            console.log('WARN\tMarkdownViewer rendering unsanitized content');
        } else {
            cleanText = sanitize(
                renderedText,
                sanitizeConfig({
                    large,
                    highQualityPost,
                    noImage: noImage && allowNoImage,
                })
            );
        }

        if (/<\s*script/gi.test(cleanText)) {
            // Not meant to be complete checking, just a secondary trap and red flag (code can change)
            console.error('Refusing to render script tag in post text', cleanText);
            return <div />;
        }

        // Needs to be done here so that the tags added by HighlightJS won't be filtered of by the sanitizer
        const higlightedText = highlightCodes(cleanText).html;
        if (higlightedText) {
            cleanText = higlightedText;
        }

        const noImageActive = cleanText.indexOf(noImageText) !== -1;

        // In addition to inserting the youtube component, this allows
        // react to compare separately preventing excessive re-rendering.
        let idx = 0;
        const sections = [];

        function checksum(s) {
            let chk = 0x12345678;
            const len = s.length;
            for (let i = 0; i < len; i += 1) {
                chk += s.charCodeAt(i) * (i + 1);
            }

            // eslint-disable-next-line no-bitwise
            return (chk & 0xffffffff).toString(16);
        }

        // HtmlReady inserts ~~~ embed:${id} type ~~~
        for (let section of cleanText.split('~~~ embed:')) {
            const embedMd = EmbeddedPlayerGenerateMd(section, idx, large);
            if (embedMd) {
                const { section: newSection, markdown } = embedMd;
                section = newSection;
                sections.push(markdown);

                if (section === '') {
                    // eslint-disable-next-line no-continue
                    continue;
                }
            }

            sections.push(<div key={checksum(section)} dangerouslySetInnerHTML={{ __html: section }} />);

            idx += 1;
        }

        const cn = 'Markdown'
            + (this.props.className ? ` ${this.props.className}` : '')
            + (html ? ' html' : '')
            + (large ? '' : ' MarkdownViewer--small');

        return (
            <div className={'MarkdownViewer ' + cn}>
                {sections}
                {noImageActive && allowNoImage && (
                    <div
                        role="link"
                        tabIndex={0}
                        key="hidden-content"
                        onClick={this.onAllowNoImage}
                        className="MarkdownViewer__negative_group"
                    >
                        {tt('markdownviewer_jsx.images_were_hidden_due_to_low_ratings')}
                        <button type="button" style={{ marginBottom: 0 }} className="button hollow tiny float-right">
                            {tt('g.show')}
                        </button>
                    </div>
                )}
            </div>
        );
    }
}

export default connect((state, ownProps) => {
    return { ...ownProps };
})(MarkdownViewer);
