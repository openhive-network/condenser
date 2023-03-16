/*global $STM_Config*/
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import AppPropTypes from 'app/utils/AppPropTypes';
import Header from 'app/components/modules/Header';
import * as userActions from 'app/redux/UserReducer';
import classNames from 'classnames';
import ConnectedSidePanel from 'app/components/modules/ConnectedSidePanel';
import CloseButton from 'app/components/elements/CloseButton';
import Dialogs from 'app/components/modules/Dialogs';
import Modals from 'app/components/modules/Modals';
import WelcomePanel from 'app/components/elements/WelcomePanel';
import tt from 'counterpart';
import { VIEW_MODE_WHISTLE } from 'shared/constants';
import SimpleReactLightbox from 'simple-react-lightbox';
import RocketChatWidget from 'app/components/modules/RocketChatWidget';

class App extends React.Component {

    static propTypes = {
        error: PropTypes.string,
        children: AppPropTypes.Children,
        pathname: PropTypes.string,
        category: PropTypes.string,
        order: PropTypes.string,
        loginUser: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        // TODO: put both of these and associated toggles into Redux Store.
        this.state = {
            showCallout: true,
            showBanner: true,
        };
        this.listenerActive = null;

        if (process.env.BROWSER) localStorage.removeItem('autopost'); // July 14 '16 compromise, renamed to autopost2
        props.loginUser();
    }

    componentDidMount() {
        const { nightmodeEnabled } = this.props;
        this.toggleBodyNightmode(nightmodeEnabled);
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {
            pathname, new_visitor, nightmodeEnabled, showAnnouncement
        } = this.props;
        const n = nextProps;
        return (
            pathname !== n.pathname
            || new_visitor !== n.new_visitor
            || this.state.showBanner !== nextState.showBanner
            || this.state.showCallout !== nextState.showCallout
            || nightmodeEnabled !== n.nightmodeEnabled
            || showAnnouncement !== n.showAnnouncement
        );
    }

    componentDidUpdate() {
        const { nightmodeEnabled } = this.props;
        this.toggleBodyNightmode(nightmodeEnabled);
    }

    toggleBodyNightmode(nightmodeEnabled) {
        if (nightmodeEnabled) {
            document.body.classList.remove('theme-light');
            document.body.classList.add('theme-dark');
        } else {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
        }
    }

    setShowBannerFalse = () => {
        this.setState({ showBanner: false });
    };

    render() {
        const {
            params, children, new_visitor, nightmodeEnabled, viewMode, pathname, category, order
        } = this.props;

        const whistleView = viewMode === VIEW_MODE_WHISTLE;
        const headerHidden = whistleView;
        const params_keys = Object.keys(params);
        const ip = pathname === '/'
            || (params_keys.length === 2 && params_keys[0] === 'order' && params_keys[1] === 'category');
        const alert = this.props.error;
        let callout = null;
        if (this.state.showCallout && alert) {
            callout = (
                <div className="App__announcement row">
                    <div className="column">
                        <div className={classNames('callout', { alert })}>
                            <CloseButton onClick={() => this.setState({ showCallout: false })} />
                            <p>{alert}</p>
                        </div>
                    </div>
                </div>
            );
        } else if (false && ip && this.state.showCallout) {
            callout = (
                <div className="App__announcement row">
                    <div className="column">
                        <div className={classNames('callout success', { alert })}>
                            <CloseButton onClick={() => this.setState({ showCallout: false })} />
                            <ul>
                                <li>
                                    <a href="https://steemit.com/steemit/@steemitblog/steemit-com-is-now-open-source">
                                        ...STORY TEXT...
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            );
        }
        if ($STM_Config.read_only_mode && this.state.showCallout) {
            callout = (
                <div className="App__announcement row">
                    <div className="column">
                        <div className={classNames('callout warning', { alert })}>
                            <CloseButton onClick={() => this.setState({ showCallout: false })} />
                            <p>{tt('g.read_only_mode')}</p>
                        </div>
                    </div>
                </div>
            );
        }

        const themeClass = nightmodeEnabled ? ' theme-dark' : ' theme-light';

        return (
            <SimpleReactLightbox>
                <div
                    className={classNames('App', themeClass, {
                        'index-page': ip,
                        'whistle-view': whistleView,
                        withAnnouncement: this.props.showAnnouncement,
                    })}
                    ref="App_root"
                >
                    <ConnectedSidePanel alignment="right" />

                    {headerHidden ? null : <Header pathname={pathname} category={category} order={order} />}

                    <div className="App__content">
                        {process.env.BROWSER && ip && new_visitor && this.state.showBanner ? (
                            <WelcomePanel setShowBannerFalse={this.setShowBannerFalse} />
                        ) : null}
                        {callout}
                        {children}
                    </div>

                    {
                        process.env.BROWSER && $STM_Config.openhive_chat_iframe_integration_enable && (
                            <RocketChatWidget
                                iframeSrc={`${$STM_Config.openhive_chat_uri}/channel/general`}
                                anchor="right"
                                closeText="Close"
                            />
                        )
                    }

                    <Dialogs />
                    <Modals />
                    <div className="lightbox" id="lightbox-container">
                        <span />
                    </div>
                </div>
            </SimpleReactLightbox>
        );
    }
}

export default connect(
    (state, ownProps) => {
        return {
            viewMode: state.app.get('viewMode'),
            error: state.app.get('error'),
            new_visitor:
                !state.user.get('current')
                && !state.offchain.get('user')
                && !state.offchain.get('account')
                && state.offchain.get('new_visit'),

            nightmodeEnabled: state.app.getIn(['user_preferences', 'nightmode']),
            pathname: ownProps.location.pathname,
            order: ownProps.params.order,
            category: ownProps.params.category,
            showAnnouncement: state.user.get('showAnnouncement'),
        };
    },
    (dispatch) => ({
        loginUser: () => dispatch(userActions.usernamePasswordLogin({})),
    })
)(App);
