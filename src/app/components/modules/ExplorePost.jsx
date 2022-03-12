import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Icon from 'app/components/elements/Icon';
import CopyToClipboard from 'react-copy-to-clipboard';
import tt from 'counterpart';

class ExplorePost extends Component {
    static propTypes = {
        permlink: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            copied: false,
            copiedMD: false,
        };
        this.onCopy = this.onCopy.bind(this);
        this.onCopyMD = this.onCopyMD.bind(this);
    }

    onCopy() {
        this.setState({
            copied: true,
        });
    }

    onCopyMD() {
        this.setState({
            copiedMD: true,
        });
    }

    render() {
        const link = this.props.permlink;
        const title = this.props.title;

        const altDapps = {
            frontends: [
                'https://peakd.com',
                'https://ecency.com',
                'https://www.waivio.com',
            ],
            blockExplorers: [
                'https://hiveblocks.com',
                'https://hive.ausbit.dev',
                'https://hiveblockexplorer.com',
            ],
        };

        const hiveblog = 'https://hive.blog' + link;
        const hiveblogMd = '[' + title + '](https://hive.blog' + link + ')';
        const text = this.state.copied == true ? tt('explorepost_jsx.copied') : tt('explorepost_jsx.copy');
        const textMD = this.state.copiedMD == true ? tt('explorepost_jsx.copied') : tt('explorepost_jsx.copy');

        return (
            <span className="ExplorePost">
                <h4>{tt('g.share_this_post')}</h4>
                <hr />
                <div>URL to this post:</div>
                <div className="input-group">
                    <input
                        className="input-group-field share-box"
                        type="text"
                        value={hiveblog}
                        onChange={(e) => e.preventDefault()}
                    />
                    <CopyToClipboard
                        text={hiveblog}
                        onCopy={this.onCopy}
                        className="ExplorePost__copy-button input-group-label"
                    >
                        <span>{text}</span>
                    </CopyToClipboard>
                </div>
                <div>Markdown code for a link to this post:</div>
                <div className="input-group">
                    <input
                        className="input-group-field share-box"
                        type="text"
                        value={hiveblogMd}
                        onChange={(e) => e.preventDefault()}
                    />
                    <CopyToClipboard
                        text={hiveblogMd}
                        onCopy={this.onCopyMD}
                        className="ExplorePost__copy-button input-group-label"
                    >
                        <span>{textMD}</span>
                    </CopyToClipboard>
                </div>
                <h5>{tt('explorepost_jsx.alternative_sources')}</h5>
                <ul>
                    {altDapps.frontends.map((site) => {
                        return (
                            <li key={site}>
                                <a href={site + link} target="_blank" rel="noopener noreferrer">
                                    {site}
                                    {' '}
                                    <Icon name="extlink" />
                                </a>
                            </li>
                        );
                    })}
                </ul>
                <h5>{tt('explorepost_jsx.block_explorers')}</h5>
                <ul>
                    {altDapps.blockExplorers.map((site) => {
                        return (
                            <li key={site}>
                                <a href={site + link} target="_blank" rel="noopener noreferrer">
                                    {site}
                                    {' '}
                                    <Icon name="extlink" />
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </span>
        );
    }
}

export default connect()(ExplorePost);
