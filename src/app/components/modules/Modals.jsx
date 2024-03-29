import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import CloseButton from 'app/components/elements/CloseButton';
import Reveal from 'app/components/elements/Reveal';
import { NotificationStack } from 'react-notification';
import tt from 'counterpart';
import * as userActions from 'app/redux/UserReducer';
import * as appActions from 'app/redux/AppReducer';
import * as transactionActions from 'app/redux/TransactionReducer';
import LoginForm from 'app/components/modules/LoginForm';
import ConfirmTransactionForm from 'app/components/modules/ConfirmTransactionForm';
// import shouldComponentUpdate  from 'app/utils/shouldComponentUpdate';
import PostAdvancedSettings from 'app/components/modules/PostAdvancedSettings';

class Modals extends PureComponent {
    static defaultProps = {
        username: '',
        notifications: undefined,
        removeNotification: () => {},
        show_bandwidth_error_modal: false,
        show_confirm_modal: false,
        show_login_modal: false,
        show_post_advanced_settings_modal: '',
        loginBroadcastOperation: undefined,
        show_hive_auth_modal: false,
        hideHiveAuthModal: false,
        nightmodeEnabled: false,
    };

    static propTypes = {
        show_login_modal: PropTypes.bool,
        show_confirm_modal: PropTypes.bool,
        show_bandwidth_error_modal: PropTypes.bool,
        show_post_advanced_settings_modal: PropTypes.string,
        hideLogin: PropTypes.func.isRequired,
        username: PropTypes.string,
        hideConfirm: PropTypes.func.isRequired,
        hideBandwidthError: PropTypes.func.isRequired,
        hidePostAdvancedSettings: PropTypes.func.isRequired,
        // eslint-disable-next-line react/forbid-prop-types
        notifications: PropTypes.object,
        removeNotification: PropTypes.func,
        loginBroadcastOperation: PropTypes.shape({
            type: PropTypes.string,
            username: PropTypes.string,
            successCallback: PropTypes.func,
            errorCallback: PropTypes.func,
        }),
        show_hive_auth_modal: PropTypes.bool,
        hideHiveAuthModal: PropTypes.func,
        nightmodeEnabled: PropTypes.bool,
    };

    render() {
        const {
            show_login_modal,
            show_confirm_modal,
            show_bandwidth_error_modal,
            show_post_advanced_settings_modal,
            hideLogin,
            hideConfirm,
            notifications,
            removeNotification,
            hideBandwidthError,
            hidePostAdvancedSettings,
            username,
            show_hive_auth_modal,
            hideHiveAuthModal,
            nightmodeEnabled,
        } = this.props;

        const notifications_array = notifications
            ? notifications.toArray().map((n) => {
                  n.onClick = () => removeNotification(n.key);
                  return n;
              })
            : [];

        const buySteemPower = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            const new_window = window.open();
            new_window.opener = null;
            new_window.location = 'https://blocktrades.us/?input_coin_type=eth&output_coin_type=steem_power&receive_address=' + username;
        };
        return (
            <div className="modal-window">
                {show_login_modal && (
                    <Reveal
                        onHide={() => {
                            hideLogin();
                        }}
                        show={show_login_modal}
                    >
                        <LoginForm onCancel={hideLogin} />
                    </Reveal>
                )}
                {show_confirm_modal && (
                    <Reveal onHide={hideConfirm} show={show_confirm_modal}>
                        <CloseButton onClick={hideConfirm} />
                        <ConfirmTransactionForm onCancel={hideConfirm} />
                    </Reveal>
                )}
                {show_bandwidth_error_modal && (
                    <Reveal onHide={hideBandwidthError} show={show_bandwidth_error_modal}>
                        <div>
                            <CloseButton onClick={hideBandwidthError} />
                            <h4>{tt('modals_jsx.your_transaction_failed')}</h4>
                            <hr />
                            <h5>{tt('modals_jsx.out_of_bandwidth_title')}</h5>
                            <p>{tt('modals_jsx.out_of_bandwidth_reason')}</p>
                            <p>{tt('modals_jsx.out_of_bandwidth_reason_2')}</p>
                            <p>{tt('modals_jsx.out_of_bandwidth_option_title')}</p>
                            <ol>
                                <li>{tt('modals_jsx.out_of_bandwidth_option_1')}</li>
                                <li>{tt('modals_jsx.out_of_bandwidth_option_2')}</li>
                                <li>{tt('modals_jsx.out_of_bandwidth_option_3')}</li>
                            </ol>
                            <button type="button" className="button" onClick={buySteemPower}>
                                {tt('g.buy_hive_power')}
                            </button>
                        </div>
                    </Reveal>
                )}
                {show_post_advanced_settings_modal && (
                    <Reveal
                        onHide={hidePostAdvancedSettings}
                        show={!!show_post_advanced_settings_modal}
                    >
                        <CloseButton onClick={hidePostAdvancedSettings} />
                        <PostAdvancedSettings formId={show_post_advanced_settings_modal} />
                    </Reveal>
                )}
                {show_hive_auth_modal && (
                    <Reveal onHide={hideHiveAuthModal} show={!!show_hive_auth_modal}>
                        <CloseButton onClick={hideHiveAuthModal} />
                        <div>
                            <div className="hiveauth-banner">
                                <img
                                    src={`/images/hiveauth-banner-${nightmodeEnabled ? 'dark' : 'light'}.png`}
                                    alt="HiveAuth"
                                    width="100%"
                                />
                            </div>
                            <div
                                className="hiveauth-instructions"
                                id="hive-auth-instructions"
                            >
                                {tt('hiveauthservices.pleaseWait')}
                            </div>
                        </div>
                    </Reveal>
                )}
                <NotificationStack
                    notifications={notifications_array}
                    onDismiss={(n) => removeNotification(n.key)}
                />
            </div>
        );
    }
}

export default connect(
    (state) => {
        const rcErr = state.transaction.getIn(['errors', 'bandwidthError']);
        // get the onErrorCB and call it on cancel
        const show_login_modal = state.user.get('show_login_modal');
        let loginBroadcastOperation = {};
        if (show_login_modal && state.user && state.user.getIn(['loginBroadcastOperation'])) {
            loginBroadcastOperation = state.user.getIn(['loginBroadcastOperation']).toJS();
        }
        return {
            username: state.user.getIn(['current', 'username']),
            show_login_modal,
            show_confirm_modal: state.transaction.get('show_confirm_modal'),
            show_promote_post_modal: state.user.get('show_promote_post_modal'),
            notifications: state.app.get('notifications'),
            show_bandwidth_error_modal: rcErr,
            show_post_advanced_settings_modal: state.user.get('show_post_advanced_settings_modal'),
            loginBroadcastOperation,
            show_hive_auth_modal: state.user.get('show_hive_auth_modal'),
            nightmodeEnabled: state.app.getIn(['user_preferences', 'nightmode']),
        };
    },
    (dispatch) => ({
        hideLogin: (e) => {
            if (e) e.preventDefault();
            dispatch(userActions.hideLogin());
        },
        hideConfirm: (e) => {
            if (e) e.preventDefault();
            dispatch(transactionActions.hideConfirm());
        },
        hidePromotePost: (e) => {
            if (e) e.preventDefault();
            dispatch(userActions.hidePromotePost());
        },
        hideBandwidthError: (e) => {
            if (e) e.preventDefault();
            dispatch(transactionActions.dismissError({ key: 'bandwidthError' }));
        },
        hidePostAdvancedSettings: (e) => {
            if (e) e.preventDefault();
            dispatch(userActions.hidePostAdvancedSettings());
        },
        hideHiveAuthModal: (e) => {
            if (e) e.preventDefault();
            dispatch(userActions.hideHiveAuthModal());
        },
        // example: addNotification: ({key, message}) => dispatch({type: 'ADD_NOTIFICATION', payload: {key, message}}),
        removeNotification: (key) => dispatch(appActions.removeNotification({ key })),
    })
)(Modals);
