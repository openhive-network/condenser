import { fromJS } from 'immutable';

// Action constants
const ADD_USER_PROFILE = 'user_profile/ADD';
const ADD_LISTED_ACCOUNTS = 'user_profile/LISTED';
const ADD_HIVEBUZZ_BADGES = 'user_profile/HIVEBUZZ_BADGES';
const ADD_PEAKD_BADGES = 'user_profile/PEAKD_BADGES';

const defaultState = fromJS({
    profiles: {},
});

export default function reducer(state = defaultState, action) {
    const payload = action.payload;

    switch (action.type) {
        case ADD_USER_PROFILE: {
            console.log('JSON account', JSON.stringify(payload));
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

export const addList = payload => ({
    type: ADD_LISTED_ACCOUNTS,
    payload,
});
