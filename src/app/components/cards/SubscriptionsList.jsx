import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import _ from 'lodash';
import 'react-tabs/style/react-tabs.css';
import tt from 'counterpart';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import { actions as fetchDataSagaActions } from 'app/redux/FetchDataSaga';
import Callout from 'app/components/elements/Callout';

class SubscriptionsList extends React.Component {
    componentWillMount() {
        const { username, getAccountSubscriptions } = this.props;
        if (username) {
            getAccountSubscriptions(username);
        }
    }

    componentDidUpdate(prevProps) {
        const { username, getAccountSubscriptions } = this.props;
        if (prevProps.username !== username) {
            getAccountSubscriptions(username);
        }
    }

    render() {
        const { subscriptions, loading, badges, username } = this.props;
        const badgesTypes = {
            activity: [],
            perso: [],
            meetup: [],
            challenge: [],
            badges: [],
        };
        const hivebuzzBadges = _.get(badges, 'hivebuzz', []);
        const peakdBadges = _.get(badges, 'peakd', []);
        const hasBadges = !_.isEmpty(hivebuzzBadges) || !_.isEmpty(peakdBadges);
        if (hivebuzzBadges) {
            hivebuzzBadges.forEach(badge => {
                const type = badge.get('type');
                let valid = true;
                if (
                    badgesTypes[type] === undefined ||
                    badgesTypes[type] === null
                )
                    valid = false;
                if (valid) {
                    badgesTypes[type].push(
                        <a
                            className="BadgesAchievements__badge_image"
                            key={badge.get('id')}
                            href={`https://hivebuzz.me/@${username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <img
                                src={badge.get('url')}
                                alt={badge.get('title')}
                                title={badge.get('title')}
                            />
                        </a>
                    );
                }
            });
        }
        if (peakdBadges) {
            peakdBadges.forEach(badge => {
                const type = badge.get('type');
                let valid = true;
                if (
                    badgesTypes[type] === undefined ||
                    badgesTypes[type] === null
                )
                    valid = false;
                if (valid) {
                    badgesTypes[type].push(
                        <a
                            className="BadgesAchievements__badge_image"
                            key={badge.get('id')}
                            href={`https://peakd.com/b/${badge.get('name')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <img
                                src={badge.get('url')}
                                alt={badge.get('title')}
                                title={badge.get('title')}
                                className="UserProfile__badge_image"
                            />
                        </a>
                    );
                }
            });
        }

        const renderItem = tuple => {
            const [hive, name, role, title] = tuple;
            return (
                <li key={hive}>
                    <Link to={'/trending/' + hive}>{name || hive}</Link>
                    <span className="user_role">{role}</span>
                    {title && <span className="affiliation">{title}</span>}
                </li>
            );
        };

        return (
            <div>
                <div className="article_section">
                    <h4>{tt('g.community_subscriptions')}</h4>
                    <p>{tt('g.community_subscriptions_description')}</p>
                    {!_.isEmpty(subscriptions) && (
                        <ul>{subscriptions.map(item => renderItem(item))}</ul>
                    )}
                    {_.isEmpty(subscriptions) &&
                        !loading && (
                            <Callout>
                                {tt('g.community_no_subscriptions')}
                            </Callout>
                        )}
                    {loading && (
                        <center>
                            <LoadingIndicator
                                style={{ marginBottom: '2rem' }}
                                type="circle"
                            />
                        </center>
                    )}
                </div>
                <div className="article_section">
                    <h4>{tt('g.badges_and_achievements')}</h4>
                    {hasBadges && (
                        <div>
                            <p>
                                {tt('g.badges_and_achievements_description')}{' '}
                                <a
                                    href="https://peakd.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Peakd
                                </a>{' '}
                                &{' '}
                                <a
                                    href="https://hivebuzz.me"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Hivebuzz
                                </a>
                                .
                            </p>
                            <div className="BadgesAchievements row">
                                <div className="BadgesAchievements_tabs_container">
                                    <Tabs>
                                        <TabList>
                                            {!_.isEmpty(badgesTypes.badges) && (
                                                <Tab>Badges</Tab>
                                            )}
                                            {!_.isEmpty(
                                                badgesTypes.activity
                                            ) && <Tab>Activity</Tab>}
                                            {!_.isEmpty(badgesTypes.perso) && (
                                                <Tab>Personal</Tab>
                                            )}
                                            {!_.isEmpty(badgesTypes.meetup) && (
                                                <Tab>Meetups</Tab>
                                            )}
                                            {!_.isEmpty(
                                                badgesTypes.challenge
                                            ) && <Tab>Challenges</Tab>}
                                        </TabList>
                                        {!_.isEmpty(badgesTypes.badges) && (
                                            <TabPanel>
                                                {badgesTypes.badges}
                                            </TabPanel>
                                        )}
                                        {!_.isEmpty(badgesTypes.activity) && (
                                            <TabPanel>
                                                {badgesTypes.activity}
                                            </TabPanel>
                                        )}
                                        {!_.isEmpty(badgesTypes.perso) && (
                                            <TabPanel>
                                                {badgesTypes.perso}
                                            </TabPanel>
                                        )}
                                        {!_.isEmpty(badgesTypes.meetup) && (
                                            <TabPanel>
                                                {badgesTypes.meetup}
                                            </TabPanel>
                                        )}
                                        {!_.isEmpty(badgesTypes.challenge) && (
                                            <TabPanel>
                                                {badgesTypes.challenge}
                                            </TabPanel>
                                        )}
                                    </Tabs>
                                </div>
                            </div>
                        </div>
                    )}
                    {!hasBadges && (
                        <p>{tt('g.badges_and_achievements_none')}</p>
                    )}
                </div>
            </div>
        );
    }
}

SubscriptionsList.defaultProps = {
    subscriptions: [],
    loading: true,
};

SubscriptionsList.propTypes = {
    username: PropTypes.string.isRequired,
    subscriptions: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)),
    loading: PropTypes.bool,
};

export default connect(
    (state, props) => {
        const { username } = props;
        const { user, global } = state;
        const isOwnAccount =
            user.getIn(['current', 'username'], '') === username;
        const loading = global.getIn(['subscriptions', 'loading']);
        const subscriptions = global.getIn(['subscriptions', username]);
        return {
            ...props,
            subscriptions: subscriptions ? subscriptions.toJS() : [],
            isOwnAccount,
            loading,
        };
    },
    dispatch => ({
        getAccountSubscriptions: username => {
            return dispatch(fetchDataSagaActions.getSubscriptions(username));
        },
    })
)(SubscriptionsList);
