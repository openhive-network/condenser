/*eslint no-shadow: "warn"*/
import {
 fromJS, Map, OrderedSet
} from 'immutable';
import { call, put, select } from 'redux-saga/effects';
import { api } from '@hiveio/hive-js';

import * as globalActions from 'app/redux/GlobalReducer';

/**
    This loadFollows both 'blog' and 'ignore'
*/

// Test limit with 2 (not 1, infinate looping)
// eslint-disable-next-line import/prefer-default-export
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
                    const accountNameKey = method === 'getFollowingAsync' ? 'following' : 'follower';
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
