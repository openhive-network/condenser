import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import _ from 'lodash';
import 'react-tabs/style/react-tabs.css';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import { actions as fetchDataSagaActions } from 'app/redux/FetchDataSaga';
import Callout from 'app/components/elements/Callout';
import tt from 'counterpart';

class SubscriptionsList extends React.Component {
    static propTypes = {
        username: PropTypes.string.isRequired,
        subscriptions: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)),
        loading: PropTypes.bool,
    };

    static defaultProps = {
        subscriptions: [],
        loading: true,
    };

    constructor() {
        super();
    }

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
        console.log('badges', badges);
        const badgesTypes = {
            activity: [],
            perso: [],
            meetup: [],
            challenge: [],
            badges: [],
        };
        const hivebuzzBadges = _.get(badges, 'hivebuzz', []);
        const peakdBadges = _.get(badges, 'peakd', []);
        if (hivebuzzBadges) {
            hivebuzzBadges.forEach(badge => {
                const type = badge.get('type');
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
            });
        }
        if (peakdBadges) {
            peakdBadges.forEach(badge => {
                const type = badge.get('type');
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
                <div className=".article_section">
                    <h4>{tt('g.community_subscriptions')}</h4>
                    {subscriptions &&
                        subscriptions.length > 0 && (
                            <ul>
                                {subscriptions.map(item => renderItem(item))}
                            </ul>
                        )}
                    {subscriptions.length === 0 &&
                        !loading && (
                            <Callout>
                                Welcome! You don't have any subscriptions yet.
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
                <div className=".article_section">
                    <h4>{tt('g.badges_and_achievements')}</h4>
                    {(hivebuzzBadges.size > 0 || peakdBadges.size > 0) && (
                        <div className="BadgesAchievements row">
                            <div className="BadgesAchievements_tabs_container">
                                <Tabs>
                                    <TabList>
                                        {badgesTypes.badges.length > 0 && (
                                            <Tab>Badges</Tab>
                                        )}
                                        {badgesTypes.activity.length > 0 && (
                                            <Tab>Activity</Tab>
                                        )}
                                        {badgesTypes.perso.length > 0 && (
                                            <Tab>Personal</Tab>
                                        )}
                                        {badgesTypes.meetup.length > 0 && (
                                            <Tab>Meetups</Tab>
                                        )}
                                        {badgesTypes.challenge.length > 0 && (
                                            <Tab>Challenges</Tab>
                                        )}
                                    </TabList>
                                    {badgesTypes.badges.length > 0 && (
                                        <TabPanel>
                                            {badgesTypes.badges}
                                        </TabPanel>
                                    )}
                                    {badgesTypes.activity.length > 0 && (
                                        <TabPanel>
                                            {badgesTypes.activity}
                                        </TabPanel>
                                    )}
                                    {badgesTypes.perso.length > 0 && (
                                        <TabPanel>{badgesTypes.perso}</TabPanel>
                                    )}
                                    {badgesTypes.meetup.length > 0 && (
                                        <TabPanel>
                                            {badgesTypes.meetup}
                                        </TabPanel>
                                    )}
                                    {badgesTypes.challenge.length > 0 && (
                                        <TabPanel>
                                            {badgesTypes.challenge}
                                        </TabPanel>
                                    )}
                                </Tabs>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

export default connect(
    (state, props) => {
        const isOwnAccount =
            state.user.getIn(['current', 'username'], '') === props.username;
        const loading = state.global.getIn(['subscriptions', 'loading']);
        const subscriptions = state.global.getIn([
            'subscriptions',
            props.username,
        ]);
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
