import React, { useCallback, useState } from 'react';
import { connect } from 'react-redux';
import {Long} from "bytebuffer";
import { Link } from 'react-router';
import tt from 'counterpart';

import Comment, { commentUrl } from './Comment';
import DropdownMenu from "../elements/DropdownMenu";
import Pagination from "./Pagination";

const Comments = (props) => {
    const {
        content, post, sortOrder, rootRef,
    } = props;
    const [currentReplyPage, setCurrentReplyPage] = useState(1);
    const initialDepth = post.get('depth');
    let replies = post.get('replies').toJS();

    const sortComments = useCallback((cont, comments, sort_order) => {
        const rshares = (_post) => Long.fromString(String(_post.get('net_rshares')));
        const demote = (_post) => _post.getIn(['stats', 'gray']);
        const upvotes = (_post) => _post.get('active_votes').filter((v) => v.get('rshares') != '0').size;
        const ts = (_post) => Date.parse(_post.get('created'));
        const payout = (_post) => _post.get('payout');

        const sort_orders = {
            votes: (pa, pb) => {
                return upvotes(cont.get(pb)) - upvotes(cont.get(pa));
            },
            new: (pa, pb) => {
                const a = cont.get(pa);
                const b = cont.get(pb);
                if (demote(a) != demote(b)) return demote(a) ? 1 : -1;
                return ts(b) - ts(a);
            },
            trending: (pa, pb) => {
                const a = cont.get(pa);
                const b = cont.get(pb);
                if (demote(a) != demote(b)) return demote(a) ? 1 : -1;
                if (payout(a) !== payout(b)) return payout(b) - payout(a);
                return rshares(b).compare(rshares(a));
            },
        };
        comments.sort(sort_orders[sort_order]);
    }, []);

    const constructCommentList = useCallback((commentIdentifier) => {
        if (!commentIdentifier) {
            return null;
        }

        const comment = content.get(commentIdentifier);
        if (!comment) {
            return null;
        }

        const commentDepth = comment.get('depth');
        const childComments = comment.get('replies').toJS();
        sortComments(content, childComments, sortOrder);

        const currentDepth = commentDepth - initialDepth;

        if (currentDepth > 7) {
            return (
                <Link
                    key={rootRef + commentIdentifier}
                    to={commentUrl(comment.toJS())}
                >
                    {tt('notificationslist_jsx.load_more')}
                </Link>
            );
        }

        return (
            <div key={rootRef + commentIdentifier}>
                <Comment
                    postref={commentIdentifier}
                    cont={content}
                    sort_order={sortOrder}
                    showNegativeComments
                    depth={currentDepth}
                    rootComment={rootRef}
                >
                    {childComments && childComments.map(constructCommentList)}
                </Comment>
            </div>
        );
    }, [content, initialDepth]);

    sortComments(content, replies, sortOrder);

    const nbRepliesPerPage = 50;
    const replyStartIndex = (currentReplyPage - 1) * nbRepliesPerPage;
    const replyEndIndex = replyStartIndex + (nbRepliesPerPage - 1);
    const nbReplies = replies.length;
    replies = replies.slice(replyStartIndex, replyEndIndex);

    const handlePaginationClick = (page) => {
        setCurrentReplyPage(page);
        document.getElementById('comments').scrollIntoView();
    };

    const selflink = `/${post.get('category')}/@${rootRef}`;
    console.log('DEBUG: selflink', selflink);
    const sort_menu = [];
    const sort_orders = ['trending', 'votes', 'new'];
    const sort_labels = [
        tt('post_jsx.comment_sort_order.trending'),
        tt('post_jsx.comment_sort_order.votes'),
        tt('post_jsx.comment_sort_order.age'),
    ];

    let sort_label;
    for (let o = 0; o < sort_orders.length; o += 1) {
        if (sort_orders[o] === sortOrder) {
            sort_label = sort_labels[o];
        }

        sort_menu.push({
            value: sort_orders[o],
            label: sort_labels[o],
            link: selflink + '?sort=' + sort_orders[o] + '#comments',
        });
    }

    return (
        <div className="Post_comments__content">
            <div className="Post__comments_sort_order float-right">
                {tt('post_jsx.sort_order')}
                : &nbsp;
                <DropdownMenu items={sort_menu} el="li" selected={sort_label} position="left" />
            </div>
            <Pagination
                nbReplies={nbReplies}
                currentReplyPage={currentReplyPage}
                nbRepliesPerPage={nbRepliesPerPage}
                replyStartIndex={replyStartIndex}
                replyEndIndex={replyEndIndex}
                onClick={handlePaginationClick}
            />
            {replies.map(constructCommentList)}
            <Pagination
                nbReplies={nbReplies}
                currentReplyPage={currentReplyPage}
                nbRepliesPerPage={nbRepliesPerPage}
                replyStartIndex={replyStartIndex}
                replyEndIndex={replyEndIndex}
                onClick={handlePaginationClick}
            />
        </div>
    );
};

export default connect(

)(Comments);
