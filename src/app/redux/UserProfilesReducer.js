import { fromJS } from 'immutable';

// Action constants
const ADD_USER_PROFILE = 'user_profile/ADD';
const ADD_LISTED_ACCOUNTS = 'user_profile/LISTED';

const defaultState = fromJS({
    profiles: {},
    listed_accounts: {},
});

export default function reducer(state = defaultState, action) {
    const payload = action.payload;

    switch (action.type) {
        case ADD_USER_PROFILE: {
            if (payload) {
                return state.setIn(
                    ['profiles', payload.username],
                    fromJS(payload.account)
                );
            }
            return state;
        }

        case ADD_LISTED_ACCOUNTS: {
            if (payload) {
                return state.setIn(
                    ['listedAccounts', payload.username],
                    fromJS(payload.listed_accounts)
                );
            }
            return state;
        }

        default:
            return state;
    }
}

// Action creators
export const addProfile = payload => ({
    type: ADD_USER_PROFILE,
    payload,
});

export const addList = payload => ({
    type: ADD_LISTED_ACCOUNTS,
    payload,
});
