import { fromJS } from 'immutable';
import {
 call, put, select, takeEvery, takeLatest
} from 'redux-saga/effects';
import { api } from '@hiveio/hive-js';
import { setUserPreferences } from 'app/utils/ServerApiClient';
import { callBridge } from 'app/utils/steemApi';
import * as globalActions from './GlobalReducer';
import * as appActions from './AppReducer';
import * as transactionActions from './TransactionReducer';

const wait = (ms) => new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });

export const sharedWatches = [
    takeLatest(
        [appActions.SET_USER_PREFERENCES, appActions.TOGGLE_NIGHTMODE, appActions.TOGGLE_BLOGMODE],
        saveUserPreferences
    ),
    takeEvery('transaction/ERROR', showTransactionErrorNotification),
];

export function* getAccount(username, force = false) {
    let account = yield select((state) => state.global.get('accounts').get(username));

    // hive never serves `owner` prop (among others)
    const isLite = !!account && !account.get('owner');

    if (!account || force || isLite) {
        console.log('getAccount: loading', username, 'force?', force, 'lite?', isLite);

        [account] = yield call([api, api.getAccountsAsync], [username]);
        const accountWitness = yield call([api, api.callAsync], 'condenser_api.get_witness_by_account', [username]);

        if (account) {
            if (accountWitness) {
                account.account_is_witness = true;
            }

            account = fromJS(account);
            yield put(globalActions.receiveAccount({ account }));
        }
    }
    return account;
}

function* showTransactionErrorNotification() {
    const errors = yield select((state) => state.transaction.get('errors'));
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, message] of errors) {
        // Do not display a notification for the bandwidthError key.
        if (key !== 'bandwidthError') {
            yield put(appActions.addNotification({ key, message }));
            yield put(transactionActions.deleteError({ key }));
        }
    }
}

export function* getContent({
 author, permlink, resolve, reject
}) {
    let content;
    while (!content) {
        console.log('getContent', author, permlink);
        content = yield call([api, api.getContentAsync], author, permlink);
        try {
            const converted = JSON.parse(content);
            if (converted.result && converted.result.length === 0) {
                content = null;
            }
        } catch (exception) {
            console.log('SagaShared::getContent()', exception.message);
        }

        if (content !== null && content.author == '') {
            // retry if content not found. #1870
            content = null;
            yield call(wait, 3000);
        }
    }

    //console.log('raw content> ', dbg(content));
    content = yield call(callBridge, 'normalize_post', { post: content });
    //console.log('normalized> ', dbg(content));

    yield put(globalActions.receiveContent({ content }));
    if (resolve && content) {
        resolve(content);
    } else if (reject && !content) {
        reject();
    }
}

/**
 * Save this user's preferences, either directly from the submitted payload or from whatever's saved in the store currently.
 *
 * @param {Object?} params.payload
 */
function* saveUserPreferences({ payload }) {
    if (payload) {
        yield setUserPreferences(payload);
    }

    const prefs = yield select((state) => state.app.get('user_preferences'));
    yield setUserPreferences(prefs.toJS());
}
