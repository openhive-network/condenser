import { fromJS } from 'immutable';

// Action constants
const ADD_USER_PROFILE = 'user_profile/ADD';
const ADD_LISTED_ACCOUNTS = 'user_profile/LISTED';
const ADD_HIVEBUZZ_BADGES = 'user_profile/HIVEBUZZ_BADGES';
const ADD_PEAKD_BADGES = 'user_profile/PEAKD_BADGES';
const SET_ERROR = 'user_profile/ERROR';

const defaultState = fromJS({
    profiles: {},
    error: false,
    hivebuzzBadges: [],
    peakdBadges: [],
});

export default function reducer(state = defaultState, action) {
    const { payload } = action;

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

        case ADD_HIVEBUZZ_BADGES: {
            if (payload) {
                return state.setIn(
                    ['hivebuzzBadges', payload.username],
                    fromJS(
                        payload.badges
                            .filter(o => {
                                return o.state === 'on';
                            })
                            .map(o => {
                                return {
                                    id: o.id,
                                    type: o.type,
                                    name: o.name,
                                    title: o.title,
                                    url: o.url,
                                };
                            })
                    )
                );
            }
            return state;
        }

        case ADD_PEAKD_BADGES: {
            if (payload) {
                return state.setIn(
                    ['peakdBadges', payload.username],
                    fromJS(
                        payload.badges.map(o => {
                            return {
                                id: `${o.account}-${o.name}`,
                                type: 'badges',
                                name: o.name,
                                title: o.title,
                                url: `https://images.hive.blog/u/${
                                    o.name
                                }/avatar/small`,
                            };
                        })
                    )
                );
            }
            return state;
        }

        case SET_ERROR: {
            if (payload) {
                const { error } = payload;
                return state.setIn(['error'], error);
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

export const addHivebuzzBadges = payload => ({
    type: ADD_HIVEBUZZ_BADGES,
    payload,
});

export const addPeakdBadges = payload => ({
    type: ADD_PEAKD_BADGES,
    payload,
});

export const setError = payload => ({
    type: SET_ERROR,
    payload,
});

export const addList = payload => ({
    type: ADD_LISTED_ACCOUNTS,
    payload,
});
