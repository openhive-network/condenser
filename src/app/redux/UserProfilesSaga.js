import { call, put, takeLatest } from 'redux-saga/effects';
import { callBridge, getHivePowerForUser } from 'app/utils/steemApi';
import HivebuzzApi from 'app/utils/hivebuzzApi';
import PeakdApi from 'app/utils/peakdApi';
import * as userProfileActions from './UserProfilesReducer';

const FETCH_PROFILE = 'userProfilesSaga/FETCH_PROFILE';
const FETCH_LISTS = 'userProfilesSaga/FETCH_LISTS';
const FETCH_HIVEBUZZ_BADGES = 'userProfileSaga/FETCH_HIVEBUZZ_BADGES';
const FETCH_PEAKD_BADGES = 'userProfileSaga/FETCH_PEAKD_BADGES';

export const userProfilesWatches = [
    takeLatest(FETCH_PROFILE, fetchUserProfile),
    takeLatest(FETCH_HIVEBUZZ_BADGES, fetchUserHivebuzzBadges),
    takeLatest(FETCH_PEAKD_BADGES, fetchUserPeakdBadges),
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

export function* fetchUserHivebuzzBadges(action) {
    const { account } = action.payload;
    try {
        const ret = yield call(HivebuzzApi.getBadges, { account });
        if (!ret) {
            console.error('Hivebuzz badges error');
            yield put(
                userProfileActions.setError({
                    error: true,
                })
            );
        } else {
            yield put(
                userProfileActions.addHivebuzzBadges({
                    username: account,
                    badges: [...ret],
                })
            );
        }
    } catch (e) {
        console.error('Hivebuzz badges error');
        yield put(
            userProfileActions.setError({
                error: true,
            })
        );
    }
}

export function* fetchUserPeakdBadges(action) {
    const { account } = action.payload;
    try {
        const ret = yield call(PeakdApi.getBadges, { account });
        if (!ret) {
            console.error('Peakd badges error');
            yield put(
                userProfileActions.setError({
                    error: true,
                })
            );
        } else {
            yield put(
                userProfileActions.addPeakdBadges({
                    username: account,
                    badges: [...ret],
                })
            );
        }
    } catch (e) {
        console.error('Peakd badges error');
        yield put(
            userProfileActions.setError({
                error: true,
            })
        );
    }
}

// Action creators
export const actions = {
    fetchProfile: payload => ({
        type: FETCH_PROFILE,
        payload,
    }),
    fetchLists: payload => ({
        type: FETCH_LISTS,
        payload,
    }),
    fetchHivebuzzBadges: payload => ({
        type: FETCH_HIVEBUZZ_BADGES,
        payload,
    }),
    fetchPeakdBadges: payload => ({
        type: FETCH_PEAKD_BADGES,
        payload,
    }),
};
