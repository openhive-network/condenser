import { fromJS } from 'immutable';
import { DEFAULT_LANGUAGE } from 'app//client_config';

// Action constants
const SHOW_LOGIN = 'user/SHOW_LOGIN';
const SHOW_LOGIN_WARNING = 'user/SHOW_LOGIN_WARNING';
const HIDE_LOGIN = 'user/HIDE_LOGIN';
const HIDE_LOGIN_WARNING = 'user/HIDE_LOGIN_WARNING';
export const SAVE_LOGIN_CONFIRM = 'user/SAVE_LOGIN_CONFIRM';
export const SAVE_LOGIN = 'user/SAVE_LOGIN';
const REMOVE_HIGH_SECURITY_KEYS = 'user/REMOVE_HIGH_SECURITY_KEYS';
const CHANGE_LANGUAGE = 'user/CHANGE_LANGUAGE';
const SHOW_PROMOTE_POST = 'user/SHOW_PROMOTE_POST';
const HIDE_PROMOTE_POST = 'user/HIDE_PROMOTE_POST';
const SHOW_HIVE_AUTH_MODAL = 'user/SHOW_HIVE_AUTH_MODAL';
const HIVE_AUTH_MODAL = 'user/HIVE_AUTH_MODAL';
export const CHECK_KEY_TYPE = 'user/CHECK_KEY_TYPE';
export const USERNAME_PASSWORD_LOGIN = 'user/USERNAME_PASSWORD_LOGIN';
export const SET_USER = 'user/SET_USER';
const CLOSE_LOGIN = 'user/CLOSE_LOGIN';
export const LOGIN_ERROR = 'user/LOGIN_ERROR';
export const LOGOUT = 'user/LOGOUT';
const KEYS_ERROR = 'user/KEYS_ERROR';
const ACCOUNT_AUTH_LOOKUP = 'user/ACCOUNT_AUTH_LOOKUP';
const SET_AUTHORITY = 'user/SET_AUTHORITY';
const HIDE_CONNECTION_ERROR_MODAL = 'user/HIDE_CONNECTION_ERROR_MODAL';
const SET = 'user/SET';
const SHOW_SIDE_PANEL = 'user/SHOW_SIDE_PANEL';
const HIDE_SIDE_PANEL = 'user/HIDE_SIDE_PANEL';
const SHOW_POST_ADVANCED_SETTINGS = 'user/SHOW_POST_ADVANCED_SETTINGS';
const HIDE_POST_ADVANCED_SETTINGS = 'user/HIDE_POST_ADVANCED_SETTINGS';
const HIDE_ANNOUNCEMENT = 'user/HIDE_ANNOUNCEMENT';
const SHOW_ANNOUNCEMENT = 'user/SHOW_ANNOUNCEMENT';
const GENERATE_SESSION_ID = 'user/GENERATE_SESSION_ID';

// Saga-related
export const UPLOAD_IMAGE = 'user/UPLOAD_IMAGE';

const defaultState = fromJS({
    current: {},
    show_login_modal: false,
    show_promote_post_modal: false,
    show_post_advanced_settings_modal: '', // formId
    pub_keys_used: null,
    locale: DEFAULT_LANGUAGE,
    show_side_panel: false,
    maybeLoggedIn: false,
    showAnnouncement: false,
    sessionId: '',
    show_hive_auth_modal: false,
});

export default function reducer(state = defaultState, action) {
    const { payload } = action;
    let show_login_modal;

    switch (action.type) {
        case SHOW_LOGIN: {
            let operation, loginDefault, login_type;
            if (payload) {
                operation = fromJS(payload.operation);
                loginDefault = fromJS(payload.loginDefault);
                login_type = payload.type;
            }
            return state.merge({
                login_error: undefined,
                show_login_modal: true,
                login_type,
                loginBroadcastOperation: operation,
                loginDefault,
            });
        }

        case SHOW_LOGIN_WARNING:
            return state.set('show_login_warning', true);

        case HIDE_LOGIN:
            return state.merge({
                show_login_modal: false,
                loginBroadcastOperation: undefined,
                loginDefault: undefined,
            });

        case HIDE_LOGIN_WARNING:
            return state.set('show_login_warning', false);

        case SAVE_LOGIN_CONFIRM:
            return state.set('saveLoginConfirm', payload);

        case SAVE_LOGIN:
            // Use only for low security keys (like posting only keys)
            return state;

        case REMOVE_HIGH_SECURITY_KEYS: {
            if (!state.hasIn(['current', 'private_keys'])) return state;
            let empty = false;
            state = state.updateIn(['current', 'private_keys'], (private_keys) => {
                if (!private_keys) return null;
                if (private_keys.has('active_private')) console.log('removeHighSecurityKeys');
                private_keys = private_keys.delete('active_private');
                empty = private_keys.size === 0;
                return private_keys;
            });
            if (empty) {
                // LOGOUT
                return defaultState.merge({ logged_out: true });
            }
            const username = state.getIn(['current', 'username']);
            state = state.setIn(['authority', username, 'active'], 'none');
            state = state.setIn(['authority', username, 'owner'], 'none');
            return state;
        }

        case CHANGE_LANGUAGE:
            return state.set('locale', payload);

        case SHOW_PROMOTE_POST:
            return state.set('show_promote_post_modal', true);

        case HIDE_PROMOTE_POST:
            return state.set('show_promote_post_modal', false);

        case SHOW_HIVE_AUTH_MODAL:
            return state.set('show_hive_auth_modal', true);

        case HIVE_AUTH_MODAL:
            return state.set('show_hive_auth_modal', false);

        case CHECK_KEY_TYPE:
            return state; // saga

        case USERNAME_PASSWORD_LOGIN:
            return state; // saga

        case SET_USER:
            show_login_modal = false;
            if (payload.show_login_modal != undefined) {
                show_login_modal = payload.show_login_modal;
                delete payload.show_login_modal;
            }
            return state.mergeDeep({
                current: payload,
                show_login_modal,
                show_login_warning: false,
                loginBroadcastOperation: undefined,
                loginDefault: undefined,
                logged_out: undefined,
            });

        case CLOSE_LOGIN:
            return state.merge({
                login_error: undefined,
                show_login_modal: false,
                loginBroadcastOperation: undefined,
                loginDefault: undefined,
            });

        case LOGIN_ERROR:
            return state.merge({
                login_error: payload.error,
                logged_out: undefined,
            });

        case LOGOUT:
            return defaultState.merge({ logged_out: true });

        case KEYS_ERROR:
            return state.merge({ keys_error: payload.error });

        case ACCOUNT_AUTH_LOOKUP:
            // AuthSaga
            return state;

        case SET_AUTHORITY: {
            // AuthSaga
            const { accountName, auth, pub_keys_used } = payload;
            state = state.setIn(['authority', accountName], fromJS(auth));
            if (pub_keys_used) state = state.set('pub_keys_used', pub_keys_used);
            return state;
        }

        case HIDE_CONNECTION_ERROR_MODAL:
            return state.set('hide_connection_error_modal', true);

        case SET:
            return state.setIn(Array.isArray(payload.key) ? payload.key : [payload.key], fromJS(payload.value));

        case SHOW_SIDE_PANEL:
            return state.set('show_side_panel', true);

        case HIDE_SIDE_PANEL:
            return state.set('show_side_panel', false);

        case SHOW_POST_ADVANCED_SETTINGS:
            return state.set('show_post_advanced_settings_modal', payload._formId);

        case HIDE_POST_ADVANCED_SETTINGS:
            return state.set('show_post_advanced_settings_modal', '');

        case SHOW_ANNOUNCEMENT:
            typeof sessionStorage !== 'undefined' && sessionStorage.setItem('hideAnnouncement', 'false');
            return state.set('showAnnouncement', true);

        case HIDE_ANNOUNCEMENT:
            typeof sessionStorage !== 'undefined' && sessionStorage.setItem('hideAnnouncement', 'true');
            return state.set('showAnnouncement', false);

        case GENERATE_SESSION_ID:
            const gRand = () => {
                return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
            };

            return state.set('sessionId', `${gRand() + gRand()}-${gRand()}-${gRand()}-${gRand()}-${gRand()}${gRand()}${gRand()}`);

        default:
            return state;
    }
}

// Action creators
export const showLogin = (payload) => ({
    type: SHOW_LOGIN,
    payload,
});

export const showLoginWarning = (payload) => ({
    type: SHOW_LOGIN_WARNING,
    payload,
});

export const hideLogin = (payload) => ({
    type: HIDE_LOGIN,
    payload,
});

export const hideLoginWarning = (payload) => ({
    type: HIDE_LOGIN_WARNING,
    payload,
});

export const saveLoginConfirm = (payload) => ({
    type: SAVE_LOGIN_CONFIRM,
    payload,
});

export const saveLogin = (payload) => ({
    type: SAVE_LOGIN,
    payload,
});

export const removeHighSecurityKeys = (payload) => ({
    type: REMOVE_HIGH_SECURITY_KEYS,
    payload,
});

export const changeLanguage = (payload) => ({
    type: CHANGE_LANGUAGE,
    payload,
});

export const showPromotePost = (payload) => ({
    type: SHOW_PROMOTE_POST,
    payload,
});

export const hidePromotePost = (payload) => ({
    type: HIDE_PROMOTE_POST,
    payload,
});

export const showHiveAuthModal = (payload) => ({
    type: SHOW_HIVE_AUTH_MODAL,
    payload,
});

export const hideHiveAuthModal = (payload) => ({
   type: HIVE_AUTH_MODAL,
   payload,
});

export const checkKeyType = (payload) => ({
    type: CHECK_KEY_TYPE,
    payload,
});

export const usernamePasswordLogin = (payload) => ({
    type: USERNAME_PASSWORD_LOGIN,
    payload,
});

export const setUser = (payload) => ({
    type: SET_USER,
    payload,
});

export const closeLogin = (payload) => ({
    type: CLOSE_LOGIN,
    payload,
});

export const loginError = (payload) => ({
    type: LOGIN_ERROR,
    payload,
});

export const logout = (payload) => ({
    type: LOGOUT,
    payload,
});

export const keysError = (payload) => ({
    type: KEYS_ERROR,
    payload,
});

export const accountAuthLookup = (payload) => ({
    type: ACCOUNT_AUTH_LOOKUP,
    payload,
});

export const setAuthority = (payload) => ({
    type: SET_AUTHORITY,
    payload,
});

export const hideConnectionErrorModal = (payload) => ({
    type: HIDE_CONNECTION_ERROR_MODAL,
    payload,
});

export const set = (payload) => ({
    type: SET,
    payload,
});

export const uploadImage = (payload) => ({
    type: UPLOAD_IMAGE,
    payload,
});

export const showSidePanel = () => ({
    type: SHOW_SIDE_PANEL,
});

export const hideSidePanel = () => {
    return {
        type: HIDE_SIDE_PANEL,
    };
};

export const showPostAdvancedSettings = (payload) => ({
    type: SHOW_POST_ADVANCED_SETTINGS,
    payload,
});

export const hidePostAdvancedSettings = () => ({
    type: HIDE_POST_ADVANCED_SETTINGS,
});

export const hideAnnouncement = () => ({
    type: HIDE_ANNOUNCEMENT,
});

export const showAnnouncement = () => ({
    type: SHOW_ANNOUNCEMENT,
});

export const generateSessionId = () => ({
    type: GENERATE_SESSION_ID,
});
