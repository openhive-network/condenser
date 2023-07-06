/*global $STM_Config*/
import React from 'react';
import PropTypes from 'prop-types';
import { Link, browserHistory } from 'react-router';
import { connect } from 'react-redux';
import Headroom from 'react-headroom';
import Tooltip from 'react-tooltip-lite';
import resolveRoute from 'app/ResolveRoute';
import tt from 'counterpart';
import { APP_NAME } from 'app/client_config';
import ElasticSearchInput from 'app/components/elements/ElasticSearchInput';
import IconButton from 'app/components/elements/IconButton';
import DropdownMenu from 'app/components/elements/DropdownMenu';
import * as userActions from 'app/redux/UserReducer';
import * as appActions from 'app/redux/AppReducer';
import { startPolling } from 'app/redux/PollingSaga';
import { actions as fetchDataSagaActions } from 'app/redux/FetchDataSaga';
import Userpic from 'app/components/elements/Userpic';
import UserpicInfoWrapper from 'app/components/elements/UserpicInfoWrapper';
import { SIGNUP_URL } from 'shared/constants';
import SteemLogo from 'app/components/elements/SteemLogo';
import Announcement from 'app/components/elements/Announcement';
import { Map } from 'immutable';
import { extractLoginData } from 'app/utils/UserUtil';

class Header extends React.Component {
    static propTypes = {
        current_account_name: PropTypes.string,
        display_name: PropTypes.string,
        pathname: PropTypes.string,
        // eslint-disable-next-line react/no-unused-prop-types
        getUnreadAccountNotifications: PropTypes.func,
        startNotificationsPolling: PropTypes.func,
        loggedIn: PropTypes.bool,
        unreadNotificationCount: PropTypes.number,
    };

    constructor(props) {
        super(props);

        this.state = {
            showAnnouncement: this.props.showAnnouncement,
        };

        const { loggedIn, current_account_name, startNotificationsPolling } = props;
        if (loggedIn) {
            startNotificationsPolling(current_account_name);
        }
    }

    // Consider refactor.
    // I think 'last sort order' is something available through react-router-redux history.
    // Therefore no need to store it in the window global like this.
    componentDidUpdate(prevProps) {
        if (prevProps.pathname !== this.props.pathname) {
            const route = resolveRoute(prevProps.pathname);
            if (route && route.page === 'PostsIndex' && route.params && route.params.length > 0) {
                const sort_order = route.params[0] !== 'home' ? route.params[0] : null;
                if (sort_order) {
                    window.last_sort_order = sort_order;
                    this.last_sort_order = sort_order;
                }
            }
        }
    }

    hideAnnouncement() {
        this.setState({ showAnnouncement: false });
        this.props.hideAnnouncement();
    }

    render() {
        const {
            pathname,
            username,
            showLogin,
            logout,
            loggedIn,
            toggleNightmode,
            nightmodeEnabled,
            showSidePanel,
            navigate,
            display_name,
            // content,
            walletUrl,
            unreadNotificationCount,
            notificationActionPending,
            login_with_keychain,
            login_with_hivesigner,
            login_with_hiveauth,
        } = this.props;

        const { showAnnouncement } = this.state;

        /*Set the document.title on each header render.*/
        const route = resolveRoute(pathname);
        let page_title = route.page;
        let sort_order = '';
        let topic = '';
        if (route.page === 'PostsIndex') {
            sort_order = route.params[0];
            if (sort_order === 'home') {
                page_title = 'My Friends'; //tt('header_jsx.home');
            } else {
                topic = route.params.length > 1 ? route.params[1] || '' : '';

                let prefix = route.params[0];
                if (prefix == 'created') prefix = 'New';
                if (prefix == 'payout') prefix = 'Pending';
                if (prefix == 'payout_comments') prefix = 'Pending';
                if (prefix == 'muted') prefix = 'Muted';
                page_title = prefix;
                if (topic !== '') {
                    let name = this.props.community.getIn([topic, 'title'], '#' + topic);
                    if (name == '#my') name = 'My Communities';
                    page_title = `${name} / ${page_title}`;
                } else {
                    page_title += ' posts';
                }
            }
        } else if (route.page === 'Post') {
            // @TODO check what this should be
        } else if (route.page == 'SubmitPost') {
            page_title = tt('header_jsx.create_a_post');
        } else if (route.page == 'Privacy') {
            page_title = tt('navigation.privacy_policy');
        } else if (route.page == 'Tos') {
            page_title = tt('navigation.terms_of_service');
        } else if (route.page == 'CommunityRoles') {
            page_title = 'Community Roles';
        } else if (route.page === 'UserProfile') {
            const user_name = route.params[0].slice(1);
            const user_title = display_name ? `${display_name} (@${user_name})` : user_name;
            page_title = user_title;
            if (route.params[1] === 'followers') {
                page_title = tt('header_jsx.people_following', {
                    username: user_title,
                });
            }
            if (route.params[1] === 'followed') {
                page_title = tt('header_jsx.people_followed_by', {
                    username: user_title,
                });
            }
            if (route.params[1] === 'replies') {
                page_title = tt('header_jsx.replies_to', {
                    username: user_title,
                });
            }
            if (route.params[1] === 'posts') {
                page_title = tt('header_jsx.posts_by', {
                    username: user_title,
                });
            }
            if (route.params[1] === 'comments') {
                page_title = tt('header_jsx.comments_by', {
                    username: user_title,
                });
            }
        } else if (route.page === 'ListManagement') {
            page_title = 'Manage Lists';
        }

        // Format first letter of all titles and lowercase user name
        if (route.page !== 'UserProfile') {
            page_title = page_title.charAt(0).toUpperCase() + page_title.slice(1);
        }

        if (
            process.env.BROWSER
            && route.page !== 'Post'
            && route.page !== 'PostNoCategory'
        ) document.title = page_title + ' — ' + APP_NAME;

        //const _feed = current_account_name && `/@${current_account_name}/feed`;
        //const logo_link = _feed && pathname != _feed ? _feed : '/';
        const logo_link = '/';

        //TopRightHeader Stuff
        const defaultNavigate = (e) => {
            if (e.metaKey || e.ctrlKey) {
                // prevent breaking anchor tags
            } else {
                e.preventDefault();
            }
            const a = e.target.nodeName.toLowerCase() === 'a' ? e.target : e.target.parentNode;
            browserHistory.push(a.pathname + a.search + a.hash);
        };

        // Since navigate isn't set, defaultNavigate will always be used.
        const nav = navigate || defaultNavigate;

        const submit_story = $STM_Config.read_only_mode ? null : (
            <Link to="/submit.html">
                <IconButton />
            </Link>
        );

        const replies_link = `/@${username}/replies`;
        const account_link = `/@${username}`;
        const comments_link = `/@${username}/comments`;
        const notifs_link = `/@${username}/notifications`;
        const wallet_link = `${walletUrl}/@${username}`;
        const notif_label = tt('g.notifications') + (unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : '');

        const user_menu = [
            { link: account_link, icon: 'profile', value: tt('g.profile') },
            { link: notifs_link, icon: 'clock', value: notif_label },
            { link: comments_link, icon: 'chatbox', value: tt('g.comments') },
            { link: replies_link, icon: 'reply', value: tt('g.replies') },
            //{ link: settings_link, icon: 'cog', value: tt('g.settings') },
            {
                link: '#',
                icon: 'eye',
                onClick: toggleNightmode,
                value: tt('g.toggle_nightmode'),
            },
            { link: wallet_link, icon: 'wallet', value: tt('g.wallet') },
            {
                link: '#',
                icon: 'enter',
                onClick: logout,
                value: tt('g.logout'),
            },
        ];

        let loginProvider;
        let loginProviderLogo;
        let loginProviderLogoWidth;
        switch(true) {
            case !!login_with_keychain:
                loginProvider = 'Hive Keychain';
                loginProviderLogo = '/images/hivekeychain.png';
                loginProviderLogoWidth = '16';
                break;

            case !!login_with_hiveauth:
                loginProvider = 'HiveAuth';
                loginProviderLogo = '/images/hiveauth.png';
                loginProviderLogoWidth = '16';
                break;

            case !!login_with_hivesigner:
                loginProvider = 'Hive Signer';
                loginProviderLogo = '/images/hivesigner.svg';
                loginProviderLogoWidth = '80';
                break;

            default:
                loginProvider = 'Hive private key';
                loginProviderLogo = '/images/hive-blog-logo.svg';
                loginProviderLogoWidth = '64';
                break;
        }

        return (
            <Headroom>
                <header className="Header">
                    {showAnnouncement && (
                        <Announcement
                            onClose={(e) => this.hideAnnouncement(e)}
                        />
                    )}
                    {/*<div className="beta-disclaimer">
                            Viewing <strong>Hive.blog beta</strong>. Note that
                            availability of features or service may change at
                            any time.
                        </div>*/}

                    <nav className="row Header__nav">
                        <div className="small-6 medium-4 large-3 columns Header__logotype">
                            <Link to={logo_link}>
                                <SteemLogo nightmodeEnabled={nightmodeEnabled} />
                            </Link>
                        </div>

                        <div className="large-5 columns show-for-large large-centered Header__sort">
                            <ul className="nav__block-list">
                                <li className="nav__block-list-item">
                                    <Link to="/">Posts</Link>
                                </li>
                                <li className="nav__block-list-item">
                                    <Link to={`${walletUrl}/proposals`} target="_blank" rel="noopener noreferrer">
                                        Proposals
                                    </Link>
                                </li>
                                <li className="nav__block-list-item">
                                    <Link to={`${walletUrl}/~witnesses`} target="_blank" rel="noopener noreferrer">
                                        Witnesses
                                    </Link>
                                </li>
                                <li className="nav__block-list-item">
                                    <Link to="https://hive.io/eco/" target="_blank" rel="noopener noreferrer">
                                        Our dApps
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div className="small-6 medium-8 large-4 columns Header__buttons">
                            {/*NOT LOGGED IN SIGN IN AND SIGN UP LINKS*/}
                            {!loggedIn && (
                                <span className="Header__user-signup show-for-medium">
                                    <a className="Header__login-link" href="/login.html" onClick={showLogin}>
                                        {tt('g.login')}
                                    </a>
                                    <a className="Header__signup-link" href={SIGNUP_URL}>
                                        {tt('g.sign_up')}
                                    </a>
                                </span>
                            )}

                            {/*CUSTOM SEARCH*/}
                            <span className="Header__search--desktop">
                                <ElasticSearchInput redirect />
                            </span>
                            <span className="Header__search">
                                <a href="/search">
                                    <IconButton icon="magnifyingGlass" />
                                </a>
                            </span>

                            {/*SUBMIT STORY*/}
                            {submit_story}
                            {/*USER AVATAR */}
                            {loggedIn && (
                                <DropdownMenu
                                    className="Header__usermenu"
                                    items={user_menu}
                                    title={(
                                        <div>
                                            {username}
                                            {' '}
                                            <Tooltip
                                                content={`Logged in with ${loginProvider}`}
                                                eventOff="onClick"
                                                className="login-provider-tooltip"
                                            >
                                                <img
                                                    alt={loginProvider}
                                                    width={loginProviderLogoWidth}
                                                    src={loginProviderLogo}
                                                />
                                            </Tooltip>
                                        </div>
                                    )}
                                    el="span"
                                    position="left"
                                >
                                    <li className="Header__userpic ">
                                        <UserpicInfoWrapper>
                                            <Userpic account={username} />
                                        </UserpicInfoWrapper>
                                    </li>
                                    {!notificationActionPending && unreadNotificationCount > 0 && (
                                        <div className="Header__notification">
                                            <span>{unreadNotificationCount}</span>
                                        </div>
                                    )}
                                </DropdownMenu>
                            )}
                            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                            <span onClick={showSidePanel} className="toggle-menu Header__hamburger">
                                <span className="hamburger" />
                            </span>
                        </div>
                    </nav>
                </header>
            </Headroom>
        );
    }
}

export { Header as _Header_ };

const mapStateToProps = (state, ownProps) => {
    // SSR code split.
    if (!process.env.BROWSER) {
        return {
            username: null,
            loggedIn: false,
            community: state.global.get('community', Map({})),
        };
    }

    // display name used in page title
    let display_name;
    const route = resolveRoute(ownProps.pathname);
    if (route.page === 'UserProfile') {
        display_name = state.userProfiles.getIn(
            ['profiles', route.params[0].slice(1), 'metadata', 'profile', 'name'],
            null
        );
    }

    const username = state.user.getIn(['current', 'username']);
    const loggedIn = !!username;
    const current_account_name = username ? username : state.offchain.get('account');

    const content = state.global.get('content'); // TODO: needed for SSR?
    let unreadNotificationCount = 0;
    if (loggedIn && state.global.getIn(['notifications', current_account_name, 'unreadNotifications'])) {
        unreadNotificationCount = state.global.getIn([
            'notifications',
            current_account_name,
            'unreadNotifications',
            'unread',
        ]);
    }

    const loginData = localStorage.getItem('autopost2');
    const [,,,,
        login_with_keychain, login_with_hivesigner,,,
        login_with_hiveauth,,,,
    ] = extractLoginData(loginData);

    return {
        username,
        loggedIn,
        community: state.global.get('community', Map({})),
        nightmodeEnabled: state.app.getIn(['user_preferences', 'nightmode']),
        display_name,
        current_account_name,
        showAnnouncement: state.user.get('showAnnouncement'),
        walletUrl: state.app.get('walletUrl'),
        content,
        unreadNotificationCount,
        notificationActionPending: state.global.getIn(['notifications', 'loading']),
        ...ownProps,
        login_with_keychain,
        login_with_hivesigner,
        login_with_hiveauth,
    };
};

const mapDispatchToProps = (dispatch) => ({
    showLogin: (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        dispatch(userActions.showLogin({ type: 'basic' }));
    },
    logout: (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        dispatch(userActions.logout({ type: 'default' }));
    },
    toggleNightmode: (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        dispatch(appActions.toggleNightmode());
    },
    showSidePanel: (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        dispatch(userActions.showSidePanel());
    },
    hideSidePanel: () => {
        dispatch(userActions.hideSidePanel());
    },
    getUnreadAccountNotifications: (username) => {
        const query = {
            account: username,
        };
        return dispatch(fetchDataSagaActions.getUnreadAccountNotifications(query));
    },
    hideAnnouncement: () => dispatch(userActions.hideAnnouncement()),
    startNotificationsPolling: (username) => {
        const query = {
            account: username,
        };
        const params = {
            pollAction: fetchDataSagaActions.getUnreadAccountNotifications,
            pollPayload: query,
            delay: 600000, // The delay between successive polls
        };
        return dispatch(startPolling(params));
    },
});

const connectedHeader = connect(mapStateToProps, mapDispatchToProps)(Header);

export default connectedHeader;
