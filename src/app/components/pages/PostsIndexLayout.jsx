/* eslint react/prop-types: 0 */
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { List } from 'immutable';
import { actions as fetchDataSagaActions } from 'app/redux/FetchDataSaga';
import SidebarLinks from 'app/components/elements/SidebarLinks';
import SidebarNewUsers from 'app/components/elements/SidebarNewUsers';
import Notices from 'app/components/elements/Notices';
import SteemMarket from 'app/components/elements/SteemMarket';
import CommunityPane from 'app/components/elements/CommunityPane';
import CommunityPaneMobile from 'app/components/elements/CommunityPaneMobile';
import Topics from './Topics';

const propTypes = {
    username: PropTypes.string,
    blogmode: PropTypes.bool,
    topics: PropTypes.object,
};

const defaultProps = {
    username: '',
    blogmode: false,
    topics: {},
};

class PostsIndexLayout extends React.Component {
    constructor(props) {
        super(props);

        const { subscriptions, getSubscriptions, username } = props;
        if (!subscriptions && username) getSubscriptions(username);
    }

    componentDidUpdate(prevProps) {
        const { subscriptions, getSubscriptions, username } = this.props;
        if (!subscriptions && username && username !== prevProps.username) getSubscriptions(username);
    }

    render() {
        const {
            topics, subscriptions, community, username, blogmode, isBrowser, children,
        } = this.props;

        return (
            <div className={'PostsIndex row ' + (blogmode ? 'layout-block' : 'layout-list')}>
                <article className="articles">
                    {community && (
                        <span className="hide-for-mq-large articles__header-select">
                            <CommunityPaneMobile community={community} username={username} />
                        </span>
                    )}
                    {children}
                </article>

                <aside className="c-sidebar c-sidebar--right">
                    {community && <CommunityPane community={community} username={username} />}
                    {isBrowser && !community && !username && <SidebarNewUsers />}
                    {isBrowser && !community && username && <SidebarLinks username={username} topics={topics} />}
                    {false && !community && <Notices />}
                    {!community && <SteemMarket />}
                </aside>

                <aside className="c-sidebar c-sidebar--left">
                    <Topics compact={false} username={username} subscriptions={subscriptions} topics={topics} />
                </aside>
            </div>
        );
    }
}

PostsIndexLayout.propTypes = propTypes;
PostsIndexLayout.defaultProps = defaultProps;

export default connect(
    (state, props) => {
        const username = state.user.getIn(['current', 'username']) || state.offchain.get('account');
        let community = state.global.getIn(['community', props.category], null);
        if (typeof community === 'string') {
            community = null;
        }

        return {
            blogmode: props.blogmode,
            community,
            subscriptions: state.global.getIn(['subscriptions', username], null),
            topics: state.global.getIn(['topics'], List()),
            isBrowser: process.env.BROWSER,
            username,
        };
    },
    (dispatch) => ({
        getSubscriptions: (account) => dispatch(fetchDataSagaActions.getSubscriptions(account)),
    })
)(PostsIndexLayout);
