import { call, put, takeLatest } from 'redux-saga/effects';
import * as userProfileActions from './UserProfilesReducer';
import { callBridge } from 'app/utils/steemApi';

const FETCH_PROFILE = 'userProfilesSaga/FETCH_PROFILE';
const FETCH_LISTS = 'userProfilesSaga/FETCH_LISTS';

export const userProfilesWatches = [
    takeLatest(FETCH_PROFILE, fetchUserProfile),
    takeLatest(FETCH_LISTS, fetchLists),
];

export function* fetchLists(action) {
    const { observer, follow_type } = action.payload;
    const ret = yield call(callBridge, 'get_follow_list', {
        observer,
        follow_type,
    });
    if (!ret) throw new Error('Account not found');
    yield put(
        userProfileActions.addList({ username: observer, listed_accounts: ret })
    );
}

export function* fetchUserProfile(action) {
    const { account, observer } = action.payload;
    const ret = yield call(callBridge, 'get_profile', { account, observer });
    if (!ret) throw new Error('Account not found');
    yield put(
        userProfileActions.addProfile({ username: account, account: ret })
    );
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
};
