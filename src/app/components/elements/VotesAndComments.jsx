import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import Icon from 'app/components/elements/Icon';
// import shouldComponentUpdate  from 'app/utils/shouldComponentUpdate';
import tt from 'counterpart';

class VotesAndComments extends PureComponent {
    static propTypes = {
        commentsLink: PropTypes.string.isRequired,

        // Redux connect properties
        comments: PropTypes.number,
        totalVotes: PropTypes.number,
    };

    render() {
        const { comments, commentsLink, totalVotes } = this.props;
        let comments_tooltip = tt('votesandcomments_jsx.no_responses_yet_click_to_respond');
        if (comments > 0) comments_tooltip = tt('votesandcomments_jsx.response_count_tooltip', { count: comments });

        return (
            <span className="VotesAndComments">
                <span
                    className="VotesAndComments__votes"
                    title={tt('votesandcomments_jsx.vote_count', {
                        count: totalVotes,
                    })}
                >
                    <Icon size="1x" name="chevron-up-circle" />
                    &nbsp;
                    {totalVotes}
                </span>
                <span className={'VotesAndComments__comments' + (comments === 0 ? ' no-comments' : '')}>
                    <Link to={commentsLink} title={comments_tooltip}>
                        <Icon name={comments > 1 ? 'chatboxes' : 'chatbox'} />
                        &nbsp;
                        {comments}
                    </Link>
                </span>
            </span>
        );
    }
}

export default connect((state, props) => {
    return {
        totalVotes: props.post.getIn(['stats', 'total_votes']),
        comments: props.post.get('children'),
    };
})(VotesAndComments);
