import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import tt from 'counterpart';
import { SIGNUP_URL } from 'shared/constants';
import PostFull from 'app/components/cards/PostFull';
import NotFoundMessage from 'app/components/cards/NotFoundMessage';
import Comment, { sortComments } from 'app/components/cards/Comment';
import DropdownMenu from 'app/components/elements/DropdownMenu';
import { serverApiRecordEvent } from 'app/utils/ServerApiClient';
import { isLoggedIn } from 'app/utils/UserUtil';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import Pagination from "../cards/Pagination";

function isEmptyPost(post) {
    // check if the post doesn't exist
    // !dis may be enough but keep 'created' & 'body' test for potential compat
    return !post || (post.get('created') === '1970-01-01T00:00:00' && post.get('body') === '');
}

class Post extends React.Component {
    static propTypes = {
        post: PropTypes.string,
        content: PropTypes.object.isRequired,
        dis: PropTypes.object,
        sortOrder: PropTypes.string,
        loading: PropTypes.bool,
    };

    constructor() {
        super();
        this.state = {
            showNegativeComments: false,
            currentReplyPage: 1,
        };
        this.showSignUp = () => {
            serverApiRecordEvent('SignUp', 'Post Promo');
            window.location = SIGNUP_URL;
        };
    }

    toggleNegativeReplies = (e) => {
        this.setState({
            // eslint-disable-next-line react/no-access-state-in-setstate
            showNegativeComments: !this.state.showNegativeComments,
        });
        e.preventDefault();
    };

    onHideComment = () => {
        this.setState({ commentHidden: true });
    };

    showAnywayClick = () => {
        this.setState({ showAnyway: true });
    };

    render() {
        const { showSignUp } = this;
        const {
            content, sortOrder, post, dis, loading,
        } = this.props;
        const {
            showNegativeComments, commentHidden, showAnyway, currentReplyPage,
        } = this.state;

        if (!content || !dis) {
            if (loading) {
                return (
                    <center>
                        <LoadingIndicator type="circle" />
                    </center>
                );
            }

            if (isEmptyPost(dis)) {
                return <NotFoundMessage />;
            }
        }

        // A post should be hidden if it is not special, is not told to "show
        // anyway", and is designated "gray".
        let postBody;
        const special = dis.get('special');
        if (!special && !showAnyway && dis.getIn(['statshasMoreReplies', 'gray'], false)) {
            postBody = (
                <div className="Post">
                    <div className="row">
                        <div className="column">
                            <div className="PostFull">
                                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                                <p onClick={this.showAnywayClick}>
                                    {tt('promote_post_jsx.this_post_was_hidden_due_to_low_ratings')}
                                    .
                                    {' '}
                                    <button
                                        type="button"
                                        style={{ marginBottom: 0 }}
                                        className="button hollow tiny float-right"
                                        onClick={this.showAnywayClick}
                                    >
                                        {tt('g.show')}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        } else {
            postBody = <PostFull post={post} cont={content} />;
        }

        let replies = dis.get('replies').toJS();

        sortComments(content, replies, sortOrder);

        const nbRepliesPerPage = 100;
        const replyStartIndex = (currentReplyPage - 1) * nbRepliesPerPage;
        const replyEndIndex = replyStartIndex + (nbRepliesPerPage - 1);
        const nbReplies = replies.length;
        replies = replies.slice(replyStartIndex, replyEndIndex);

        const handlePaginationClick = (page) => {
            this.setState({ currentReplyPage: page });
            document.getElementById('comments').scrollIntoView();
        };

        const positiveComments = replies.map((reply) => {
            return (
                <div key={post + reply}>
                    <Comment
                        postref={reply}
                        cont={content}
                        sort_order={sortOrder}
                        showNegativeComments={showNegativeComments}
                        onHide={this.onHideComment}
                    />
                </div>
            );
        });

        const negativeGroup = commentHidden && (
            <div className="hentry Comment root Comment__negative_group">
                <p>
                    {showNegativeComments
                        ? tt('post_jsx.now_showing_comments_with_low_ratings')
                        : tt('post_jsx.comments_were_hidden_due_to_low_ratings')}
                    .
                    {' '}
                    <button type="button" className="button hollow tiny float-right" onClick={(e) => this.toggleNegativeReplies(e)}>
                        {showNegativeComments ? tt('g.hide') : tt('g.show')}
                    </button>
                </p>
            </div>
        );

        const sort_orders = ['trending', 'votes', 'new'];
        const sort_labels = [
            tt('post_jsx.comment_sort_order.trending'),
            tt('post_jsx.comment_sort_order.votes'),
            tt('post_jsx.comment_sort_order.age'),
        ];
        const sort_menu = [];
        let sort_label;
        const selflink = `/${dis.get('category')}/@${post}`;
        // eslint-disable-next-line no-plusplus
        for (let o = 0; o < sort_orders.length; ++o) {
            if (sort_orders[o] == sortOrder) sort_label = sort_labels[o];
            sort_menu.push({
                value: sort_orders[o],
                label: sort_labels[o],
                link: selflink + '?sort=' + sort_orders[o] + '#comments',
            });
        }

        const enableSignup = false;
        return (
            <div className="Post">
                <div className="row">
                    <div className="column">{postBody}</div>
                </div>
                {enableSignup && !isLoggedIn() && (
                    <div className="row">
                        <div className="column">
                            <div className="Post__promo">
                                {tt(
                                    'g.next_7_strings_single_block.authors_get_paid_when_people_like_you_upvote_their_post'
                                )}
                                .
                                <br />
                                {tt('g.next_7_strings_single_block.if_you_enjoyed_what_you_read_earn_amount')}
                                <br />
                                <button type="button" className="button e-btn" onClick={showSignUp}>
                                    {tt('loginform_jsx.sign_up_get_hive')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div id="comments" className="Post_comments row hfeed">
                    <div className="column large-12">
                        <div className="Post_comments__content">
                            {positiveComments.length ? (
                                <div className="Post__comments_sort_order float-right">
                                    {tt('post_jsx.sort_order')}
                                    : &nbsp;
                                    <DropdownMenu items={sort_menu} el="li" selected={sort_label} position="left" />
                                </div>
                            ) : null}
                            <Pagination
                                nbReplies={nbReplies}
                                currentReplyPage={currentReplyPage}
                                nbRepliesPerPage={nbRepliesPerPage}
                                replyStartIndex={replyStartIndex}
                                replyEndIndex={replyEndIndex}
                                onClick={handlePaginationClick}
                            />
                            {positiveComments}
                            <Pagination
                                nbReplies={nbReplies}
                                currentReplyPage={currentReplyPage}
                                nbRepliesPerPage={nbRepliesPerPage}
                                replyStartIndex={replyStartIndex}
                                replyEndIndex={replyEndIndex}
                                onClick={handlePaginationClick}
                            />
                            {negativeGroup}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default connect((state, ownProps) => {
    const currLocation = ownProps.router.getCurrentLocation();
    const { username, slug } = ownProps.routeParams;
    const post = username + '/' + slug;
    const content = state.global.get('content');
    const dis = content.get(post);

    return {
        post,
        content,
        dis,
        sortOrder: currLocation.query.sort || 'trending',
        loading: state.app.get('loading'),
    };
})(Post);
