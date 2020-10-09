import { call, put, takeLatest } from 'redux-saga/effects';
import * as userProfileActions from './UserProfilesReducer';
import { callBridge, getHivePowerForUser } from 'app/utils/steemApi';

const FETCH_PROFILE = 'userProfilesSaga/FETCH_PROFILE';

export const userProfilesWatches = [
    takeLatest(FETCH_PROFILE, fetchUserProfile),
];

export function* fetchUserProfile(action) {
    const { account, observer } = action.payload;
    const ret = yield call(callBridge, 'get_profile', { account, observer });
    const hive_power = yield getHivePowerForUser(account);

    if (!ret) throw new Error('Account not found');
    yield put(
        userProfileActions.addProfile({
            username: account,
            account: { ...ret, stats: { ...ret.stats, sp: hive_power } },
        })
    );
}

// Action creators
export const actions = {
    fetchProfile: payload => ({
        type: FETCH_PROFILE,
        payload,
    }),
};
