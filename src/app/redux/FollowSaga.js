/*eslint no-shadow: "warn"*/
import {
 fromJS, List, Map, OrderedSet
} from 'immutable';
import {
 call, put, select, takeEvery
} from 'redux-saga/effects';
import { api } from '@hiveio/hive-js';

import * as globalActions from 'app/redux/GlobalReducer';

/**
    This loadFollows both 'blog' and 'ignore'
*/

const LOAD_FOLLOW_PAGE = 'followSaga/LOAD_FOLLOW_PAGE';

export const FOLLOW_PAGE_SIZE = 100;

export const followWatches = [takeEvery(LOAD_FOLLOW_PAGE, loadFollowPage)];

const accountNameKeyFor = (method) => (method === 'getFollowingAsync' ? 'following' : 'follower');

// Test limit with 2 (not 1, infinate looping)
export function* loadFollows(method, account, type, force = false) {
    if (yield select((state) => state.global.getIn(['follow', method, account, type + '_loading']))) {
        return; //already loading
    }

    if (!force) {
        const hasResult = yield select((state) => state.global.hasIn(['follow', method, account, type + '_result']));
        if (hasResult) {
            return; //already loaded
        }
    }

    yield put(
        globalActions.update({
            key: ['follow', method, account],
            notSet: Map(),
            updater: (m) => m.set(type + '_loading', true),
        })
    );

    yield loadFollowsLoop(method, account, type);
}

function* loadFollowsLoop(method, account, type, start = '', limit = 1000) {
    const res = fromJS(yield api[method](account, start, type, limit));

    let cnt = 0;
    let lastAccountName = null;

    yield put(
        globalActions.update({
            key: ['follow_inprogress', method, account],
            notSet: Map(),
            updater: (m) => {
                m = m.asMutable();
                res.forEach((value) => {
                    cnt += 1;

                    const whatList = value.get('what');
                    const accountNameKey = accountNameKeyFor(method);
                    // eslint-disable-next-line no-multi-assign
                    const accountName = (lastAccountName = value.get(accountNameKey));
                    whatList.forEach((what) => {
                        //currently this is always true: what === type
                        m.update(what, OrderedSet(), (s) => s.add(accountName));
                    });
                });
                return m.asImmutable();
            },
        })
    );

    if (cnt === limit) {
        // This is paging each block of up to limit results
        yield call(loadFollowsLoop, method, account, type, lastAccountName);
    } else {
        // This condition happens only once at the very end of the list.
        // Every account has a different followers and following list for: blog, ignore
        yield put(
            globalActions.update({
                key: [],
                updater: (m) => {
                    m = m.asMutable();

                    const result = m.getIn(['follow_inprogress', method, account, type], OrderedSet());
                    m.deleteIn(['follow_inprogress', method, account, type]);
                    m.updateIn(['follow', method, account], Map(), (mm) => mm.merge({
                            // Count may be set separately without loading the full xxx_result set
                            [type + '_count']: result.size,
                            [type + '_result']: result.reverse(),
                            [type + '_loading']: false,
                        }));
                    return m.asImmutable();
                },
            })
        );
    }
}

/**
    Loads one page of an account's 'blog' followers or following for display.
    Pages are kept under `follow_pages`, apart from the complete lists in `follow` that the
    follow buttons and transactions rely on, so a partial page never stands in for a full list.

    payload: { method: 'getFollowersAsync' | 'getFollowingAsync', account, more }
    Without `more` an already loaded first page is reused; with `more` the next page is appended.
*/
export function* loadFollowPage(action) {
    const { method, account, more = false } = action.payload;
    const key = ['follow_pages', method, account];
    const page = yield select((state) => state.global.getIn(key));

    if (page && (page.get('loading') || !more || !page.get('hasMore'))) {
        return;
    }

    yield put(
        globalActions.update({
            key,
            notSet: Map({ users: List(), hasMore: false }),
            updater: (m) => m.set('loading', true),
        })
    );

    const start = page ? page.get('users').last() : '';
    const accountNameKey = accountNameKeyFor(method);
    // The start account may or may not be echoed back; one extra row covers that case and a
    // second one tells whether another page exists, without fetching that page.
    let res;
    try {
        res = yield call([api, api[method]], account, start, 'blog', FOLLOW_PAGE_SIZE + 2);
    } catch (error) {
        console.error('~~ Saga loadFollowPage error ~~>', method, account, error);
        // Leave the list retryable: a failed first page is forgotten, a failed later page keeps `hasMore`.
        yield put(
            page
                ? globalActions.update({ key, updater: (m) => m.set('loading', false) })
                : globalActions.remove({ key })
        );
        return;
    }
    const names = (res || []).map((row) => row[accountNameKey]).filter((name) => name !== start);

    yield put(
        globalActions.update({
            key,
            updater: (m) => m.merge({
                    users: m.get('users').concat(names.slice(0, FOLLOW_PAGE_SIZE)),
                    hasMore: names.length > FOLLOW_PAGE_SIZE,
                    loading: false,
                }),
        })
    );
}

export const actions = {
    loadFollowPage: (payload) => ({
        type: LOAD_FOLLOW_PAGE,
        payload,
    }),
};
