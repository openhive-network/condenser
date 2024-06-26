import React from 'react';
import PropTypes from 'prop-types';
import { SRLWrapper } from "simple-react-lightbox";
import { Map } from 'immutable';
import { Link } from 'react-router';
import classnames from 'classnames';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/default.css';
import TimeAgoWrapper from 'app/components/elements/TimeAgoWrapper';
import Icon from 'app/components/elements/Icon';
import { connect } from 'react-redux';
import * as transactionActions from 'app/redux/TransactionReducer';
import * as globalActions from 'app/redux/GlobalReducer';
import Voting from 'app/components/elements/Voting';
import Reblog from 'app/components/elements/Reblog';
import MarkdownViewer from 'app/components/cards/MarkdownViewer';
import ReplyEditor from 'app/components/elements/ReplyEditor';
import { extractBodySummary } from 'app/utils/ExtractContent';
import Tag from 'app/components/elements/Tag';
import TagList from 'app/components/elements/TagList';
import Author from 'app/components/elements/Author';
import DMCAList from 'app/utils/DMCAList';
import ShareMenu from 'app/components/elements/ShareMenu';
import MuteButton from 'app/components/elements/MuteButton';
import FlagButton from 'app/components/elements/FlagButton';
import { serverApiRecordEvent } from 'app/utils/ServerApiClient';
import Userpic from 'app/components/elements/Userpic';
import { APP_DOMAIN, APP_NAME } from 'app/client_config';
import tt from 'counterpart';
import userIllegalContent from 'app/utils/userIllegalContent';
import ImageUserBlockList from 'app/utils/ImageUserBlockList';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import { allowDelete } from 'app/utils/StateFunctions';
import { Role } from 'app/utils/Community';
import UserNames from 'app/components/elements/UserNames';
import ContentEditedWrapper from '../elements/ContentEditedWrapper';
import { isUrlWhitelisted } from "../../utils/Phishing";
import PostCountDown from "../elements/PostCountDown";

function TimeAuthorCategory({ post }) {
    return (
        <span className="PostFull__time_author_category vcard">
            <Icon name="clock" className="space-right" />
            <TimeAgoWrapper date={post.get('created')} />
            {' '}
            {tt('g.in')}
            {' '}
            <Tag post={post} />
            {' '}
            {tt('g.by')}
            {' '}
            <Author post={post} showAffiliation />
        </span>
    );
}

function TimeAuthorCategoryLarge({ post }) {
    const jsonMetadata = post.get('json_metadata');
    let authoredBy;
    if (jsonMetadata instanceof Map) {
        authoredBy = jsonMetadata.get('author');
    }
    let author = post.get('author');
    let created = post.get('created');
    let updated = post.get('updated');

    const crossPostedBy = post.get('cross_posted_by');
    if (crossPostedBy) {
        author = post.get('cross_post_author');
        created = post.get('cross_post_created');
        updated = post.get('cross_post_updated');
    }

    return (
        <span className="PostFull__time_author_category_large vcard">
            <Userpic account={author} />
            <div className="right-side">
                <Author post={post} showAffiliation resolveCrossPost />
                {tt('g.in')}
                {' '}
                <Tag post={post} />
                {' • '}
                <TimeAgoWrapper date={created} />
                {' '}
                <ContentEditedWrapper createDate={created} updateDate={updated} />
                {authoredBy
                    && authoredBy !== author && (
                        <div className="PostFull__authored_by">
                            {tt('postfull_jsx.authored_by')}
                            {' '}
                            <a href={`/@${authoredBy}`}>
                                @
                                {authoredBy}
                            </a>
                        </div>
                    )}
            </div>
        </span>
    );
}

class PostFull extends React.Component {
    static propTypes = {
        // html props
        /* Show extra options (component is being viewed alone) */
        postref: PropTypes.string.isRequired,
        post: PropTypes.object.isRequired,

        // connector props
        username: PropTypes.string,
        deletePost: PropTypes.func.isRequired,
        showPromotePost: PropTypes.func.isRequired,
        showExplorePost: PropTypes.func.isRequired,
        togglePinnedPost: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        const { postref } = this.props;
        const _formId = `postFull-${postref}`;

        let editorReplyState;
        let editorEditState;
        if (process.env.BROWSER) {
            let showEditor = localStorage.getItem('showEditor-' + _formId);
            if (showEditor) {
                showEditor = JSON.parse(showEditor);
                if (showEditor.type === 'reply') {
                    editorReplyState = { showReply: true };
                }
                if (showEditor.type === 'edit') {
                    editorEditState = { showEdit: true };
                }
            }
        }

        if (process.env.BROWSER) {
            hljs.highlightAll();
        }

        this.state = {
            formId: _formId,
            PostFullReplyEditor: ReplyEditor(_formId + '-reply'),
            PostFullEditEditor: ReplyEditor(_formId + '-edit'),
            ...(editorReplyState && { ...editorReplyState }),
            ...(editorEditState && { ...editorEditState }),
            showMutedList: false,
        };

        this.fbShare = this.fbShare.bind(this);
        this.twitterShare = this.twitterShare.bind(this);
        this.redditShare = this.redditShare.bind(this);
        this.linkedInShare = this.linkedInShare.bind(this);
        this.showExplorePost = this.showExplorePost.bind(this);

        this.onShowReply = () => {
            const {
                state: { showReply, formId },
            } = this;
            this.setState({ showReply: !showReply, showEdit: false });
            saveOnShow(formId, !showReply ? 'reply' : null);
        };

        this.onShowEdit = () => {
            const {
                state: { showEdit, formId },
            } = this;
            this.setState({ showEdit: !showEdit, showReply: false });
            saveOnShow(formId, !showEdit ? 'edit' : null);
        };

        this.onDeletePost = () => {
            const {
                props: { deletePost, post },
            } = this;
            deletePost(post.get('author'), post.get('permlink'));
        };
    }

    fbShare(e) {
        const href = this.share_params.url;
        e.preventDefault();
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${href}`,
            'fbshare',
            'width=600, height=400, scrollbars=no'
        );
        serverApiRecordEvent('FbShare', this.share_params.link);
    }

    twitterShare(e) {
        serverApiRecordEvent('TwitterShare', this.share_params.link);
        e.preventDefault();
        const winWidth = 640;
        const winHeight = 320;
        // eslint-disable-next-line no-restricted-globals
        const winTop = screen.height / 2 - winWidth / 2;
        // eslint-disable-next-line no-restricted-globals
        const winLeft = screen.width / 2 - winHeight / 2;
        const s = this.share_params;
        const q = 'text=' + encodeURIComponent(s.title) + '&url=' + encodeURIComponent(s.url);
        window.open(
            'http://twitter.com/share?' + q,
            'Share',
            'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
        );
    }

    redditShare(e) {
        serverApiRecordEvent('RedditShare', this.share_params.link);
        e.preventDefault();
        const s = this.share_params;
        const q = 'title=' + encodeURIComponent(s.title) + '&url=' + encodeURIComponent(s.url);
        window.open('https://www.reddit.com/submit?' + q, 'Share');
    }

    linkedInShare(e) {
        serverApiRecordEvent('LinkedInShare', this.share_params.link);
        e.preventDefault();
        const winWidth = 720;
        const winHeight = 480;
        // eslint-disable-next-line no-restricted-globals
        const winTop = screen.height / 2 - winWidth / 2;
        // eslint-disable-next-line no-restricted-globals
        const winLeft = screen.width / 2 - winHeight / 2;
        const s = this.share_params;
        const q = 'title=' + encodeURIComponent(s.title) + '&url=' + encodeURIComponent(s.url) + '&source=Steemit&mini=true';
        window.open(
            'https://www.linkedin.com/shareArticle?' + q,
            'Share',
            'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
        );
    }

    postClickHandler = (e) => {
        if (e.target.classList.contains('external_link')) {
            const url = e.target.href;

            if (!isUrlWhitelisted(url)) {
                e.preventDefault();
                this.props.showExternalLinkWarning(url);
            }
        }
    };

    showPromotePost = () => {
        const { post } = this.props;
        if (!post) return;
        const author = post.get('author');
        const permlink = post.get('permlink');
        this.props.showPromotePost(author, permlink);
    };

    showExplorePost = () => {
        const permlink = this.share_params.link;
        const title = this.share_params.rawtitle;
        this.props.showExplorePost(permlink, title);
    };

    onTogglePin = (isPinned) => {
        const {
            community, username, post, postref
        } = this.props;
        if (!community || !username) {
            console.error('pin fail', this.props);
        }

        const key = ['content', postref, 'stats', 'is_pinned'];
        this.props.stateSet(key, !isPinned);

        const account = post.get('author');
        const permlink = post.get('permlink');
        this.props.togglePinnedPost(!isPinned, username, community, account, permlink);
    };

    render() {
        const {
            props: {
                username, post, community, viewer_role,
            },
            state: {
                PostFullReplyEditor, PostFullEditEditor, formId, showReply, showEdit
            },
            onShowReply,
            onShowEdit,
            onDeletePost,
        } = this;

        if (!post) return null;
        const content = post.toJS();
        const {
            author,
            permlink,
            parent_author,
            parent_permlink,
            community_title,
            cross_posted_by,
            cross_post_author: crossPostAuthor,
            cross_post_permlink: crossPostPermlink,
            cross_post_category: crossPostCategory,
        } = content;
        const { category, title } = content;
        const link = `/${category}/@${author}/${permlink}`;

        let crossPostedBy = cross_posted_by;
        if (crossPostedBy) {
            crossPostedBy = (
                <div className="articles__crosspost">
                    <p className="articles__crosspost-text">
                        <span className="articles__crosspost-icon">
                            <Icon name="cross-post" />
                        </span>
                        <UserNames names={[author]} />
                        {' '}
                        {tt('postsummary_jsx.crossposted')}
                        {' '}
                        <Link to={`/${crossPostCategory}/@${crossPostAuthor}/${crossPostPermlink}`}>this post</Link>
                        {' '}
                        {tt('g.in')}
                        {' '}
                        <Link to={`/created/${community}`}>{community_title}</Link>
                        {' '}
                        <TimeAgoWrapper date={post.get('created')} />
                    </p>
                    <hr />
                </div>
            );
        }

        if (process.env.BROWSER && title) document.title = title + ' — ' + APP_NAME;

        let content_body = crossPostedBy ? post.get('cross_post_body') : post.get('body');
        const bDMCAStop = DMCAList.includes(link);
        const bIllegalContentUser = userIllegalContent.includes(author);
        if (bDMCAStop) {
            content_body = tt('postfull_jsx.this_post_is_not_available_due_to_a_copyright_claim');
        }
        // detect illegal users
        if (bIllegalContentUser) {
            content_body = 'Not available for legal reasons.';
        }

        // TODO: get global loading state
        //loading = !bIllegalContentUser && !bDMCAStop && partial data loaded;
        const bShowLoading = false;

        // hide images if user is on blacklist
        const hideImages = ImageUserBlockList.includes(author);

        const replyParams = {
            author,
            permlink,
            parent_author,
            parent_permlink: post.get('depth') == 0 ? post.get('category') : parent_permlink,
            category,
            title,
            body: post.get('body'),
        };

        this.share_params = {
            link,
            url: 'https://' + APP_DOMAIN + link,
            rawtitle: title,
            title: title + ' — ' + APP_NAME,
            desc: extractBodySummary(post.get('body')),
        };

        const share_menu = [
            {
                onClick: this.fbShare,
                title: tt('postfull_jsx.share_on_facebook'),
                icon: 'facebook',
            },
            {
                onClick: this.twitterShare,
                title: tt('postfull_jsx.share_on_twitter'),
                icon: 'twitter',
            },
            {
                onClick: this.redditShare,
                title: tt('postfull_jsx.share_on_reddit'),
                icon: 'reddit',
            },
            {
                onClick: this.linkedInShare,
                title: tt('postfull_jsx.share_on_linkedin'),
                icon: 'linkedin',
            },
        ];

        const Editor = this.state.showReply ? PostFullReplyEditor : PostFullEditEditor;
        let renderedEditor = null;
        if (showReply || showEdit) {
            const editJson = showReply ? null : post.get('json_metadata');
            renderedEditor = (
                <div key="editor">
                    <Editor
                        {...replyParams}
                        type={this.state.showReply ? 'submit_comment' : 'edit'}
                        successCallback={() => {
                            this.setState({
                                showReply: false,
                                showEdit: false,
                            });
                            saveOnShow(formId, null);
                        }}
                        onCancel={() => {
                            this.setState({
                                showReply: false,
                                showEdit: false,
                            });
                            saveOnShow(formId, null);
                        }}
                        jsonMetadata={editJson}
                    />
                </div>
            );
        }
        const high_quality_post = post.get('payout') > 10.0;
        const full_power = post.get('percent_hbd') === 0;

        const isReply = post.get('depth') > 0;

        let post_header = (
            <div>
                {crossPostedBy}
                <h1 className="entry-title">
                    {post.get('title')}
                    {full_power && (
                        <span title={tt('g.powered_up_100')}>
                            <Icon name="hivepower" />
                        </span>
                    )}
                </h1>
            </div>
        );

        if (isReply) {
            const rooturl = post.get('url');
            const prnturl = `/${category}/@${parent_author}/${parent_permlink}`;
            post_header = (
                <div className="callout">
                    <div>
                        {tt('postfull_jsx.you_are_viewing_a_single_comments_thread_from')}
                        :
                    </div>
                    <h4>{post.get('title')}</h4>
                    <ul>
                        <li>
                            <Link to={rooturl}>{tt('postfull_jsx.view_the_full_context')}</Link>
                        </li>
                        {post.get('depth') > 1 && (
                            <li>
                                <Link to={prnturl}>{tt('postfull_jsx.view_the_direct_parent')}</Link>
                            </li>
                        )}
                    </ul>
                </div>
            );
        }

        const allowReply = Role.canComment(community, viewer_role);
        const canReblog = !isReply;
        const canPromote = false && !post.get('is_paidout') && !isReply;
        const canPin = post.get('depth') == 0 && Role.atLeast(viewer_role, 'mod');
        const canMute = username && Role.atLeast(viewer_role, 'mod');
        const canFlag = username && community && Role.atLeast(viewer_role, 'guest');
        const canReply = allowReply && post.get('depth') < 255;
        const canEdit = username === author && !showEdit;
        const canDelete = username === author && allowDelete(post);

        const isPinned = post.getIn(['stats', 'is_pinned'], false);

        let contentBody;

        if (bShowLoading) {
            contentBody = <LoadingIndicator type="circle-strong" />;
        } else {
            contentBody = (
                <SRLWrapper>
                    <MarkdownViewer
                        formId={formId + '-viewer'}
                        text={content_body}
                        large
                        highQualityPost={high_quality_post}
                        noImage={post.getIn(['stats', 'gray'])}
                        hideImages={hideImages}
                        lightbox
                    />
                </SRLWrapper>
            );
        }

        return (
            <div>
                <article
                    className={classnames('PostFull', 'hentry')}
                    itemScope
                    itemType="http://schema.org/Blog"
                    onClick={this.postClickHandler}
                >
                    {canFlag && <FlagButton post={post} />}
                    {showEdit ? (
                        renderedEditor
                    ) : (
                        <span>
                            <div className="PostFull__header">
                                {post_header}
                                <TimeAuthorCategoryLarge post={post} />
                            </div>
                            <PostCountDown post={post} />
                            <div className="PostFull__body entry-content">
                                {contentBody}
                            </div>
                            {content_body.length >= 1500 && <PostCountDown post={post} />}
                        </span>
                    )}

                    {canPromote && username && (
                        <button
                            type="button"
                            className="Promote__button float-right button hollow tiny"
                            onClick={this.showPromotePost}
                        >
                            {tt('g.promote')}
                        </button>
                    )}
                    {!isReply && <TagList post={post} />}
                    <div className="PostFull__footer row">
                        <div className="columns medium-12 large-9">
                            <TimeAuthorCategory post={post} />
                            <Voting post={post} />
                        </div>
                        <div className="RightShare__Menu small-11 medium-12 large-3 columns">
                            {canReblog && <Reblog author={author} permlink={permlink} />}
                            <span className="PostFull__reply">
                                {/* all */}
                                {canReply && <a role="link" tabIndex={0} onClick={onShowReply}>{tt('g.reply')}</a>}
                                {' '}
                                {/* mods */}
                                {canPin && (
                                    <a role="link" tabIndex={0} onClick={() => this.onTogglePin(isPinned)}>
                                        {isPinned ? tt('g.unpin') : tt('g.pin')}
                                    </a>
                                )}
                                {' '}
                                {canMute && <MuteButton post={post} />}
                                {' '}
                                {/* owner */}
                                {canEdit && <a role="link" tabIndex={0} onClick={onShowEdit}>{tt('g.edit')}</a>}
                                {' '}
                                {canDelete && <a role="link" tabIndex={0} onClick={onDeletePost}>{tt('g.delete')}</a>}
                            </span>
                            <span className="PostFull__responses">
                                <Link
                                    to={link}
                                    title={tt('g.responses', {
                                        count: post.get('children'),
                                    })}
                                >
                                    <Icon name="chatboxes" className="space-right" />
                                    {post.get('children')}
                                </Link>
                            </span>
                            <ShareMenu menu={share_menu} />
                            <button
                                type="button"
                                className="explore-post"
                                title={tt('g.share_this_post')}
                                onClick={this.showExplorePost}
                            >
                                <Icon name="link" className="chain-rotated" />
                            </button>
                        </div>
                        {crossPostedBy && (
                            <div className="PostFull__crosspost-footer columns large-12">
                                <Link
                                    className="button"
                                    to={`/${crossPostCategory}/@${crossPostAuthor}/${crossPostPermlink}`}
                                >
                                    Browse to the original post by @
                                    {crossPostAuthor}
                                </Link>
                            </div>
                        )}
                    </div>
                    <div className="row comment-editor">
                        <div className="column large-12 medium-10 small-12">{showReply && renderedEditor}</div>
                    </div>
                </article>
            </div>
        );
    }
}

export default connect(
    (state, ownProps) => {
        const postref = ownProps.post;
        const post = ownProps.cont.get(postref);

        const category = post.get('category');
        const community = state.global.getIn(['community', category, 'name']);

        return {
            post,
            postref,
            community,
            username: state.user.getIn(['current', 'username']),
            viewer_role: state.global.getIn(['community', community, 'context', 'role'], 'guest'),
        };
    },
    (dispatch) => ({
        deletePost: (author, permlink) => {
            dispatch(
                transactionActions.broadcastOperation({
                    type: 'delete_comment',
                    operation: { author, permlink },
                    confirm: tt('g.are_you_sure'),
                })
            );
        },
        stateSet: (key, value) => {
            dispatch(globalActions.set({ key, value }));
        },
        showPromotePost: (author, permlink) => {
            dispatch(
                globalActions.showDialog({
                    name: 'promotePost',
                    params: { author, permlink },
                })
            );
        },
        showExplorePost: (permlink, title) => {
            dispatch(
                globalActions.showDialog({
                    name: 'explorePost',
                    params: { permlink, title },
                })
            );
        },
        togglePinnedPost: (pinPost, username, community, account, permlink, successCallback, errorCallback) => {
            let action = 'unpinPost';
            if (pinPost) action = 'pinPost';

            const payload = [
                action,
                {
                    community,
                    account,
                    permlink,
                },
            ];

            return dispatch(
                transactionActions.broadcastOperation({
                    type: 'custom_json',
                    operation: {
                        id: 'community',
                        required_posting_auths: [username],
                        json: JSON.stringify(payload),
                    },
                    successCallback,
                    errorCallback,
                })
            );
        },
        showExternalLinkWarning: (url) => {
            dispatch(
                globalActions.showDialog({
                    name: 'externalLinkWarning',
                    params: { url },
                })
            );
        },
    })
)(PostFull);

const saveOnShow = (formId, type) => {
    if (process.env.BROWSER) {
        if (type) localStorage.setItem('showEditor-' + formId, JSON.stringify({ type }, null, 0));
        else {
            localStorage.removeItem('showEditor-' + formId);
            localStorage.removeItem('replyEditorData-' + formId + '-reply');
            localStorage.removeItem('replyEditorData-' + formId + '-edit');
        }
    }
};
