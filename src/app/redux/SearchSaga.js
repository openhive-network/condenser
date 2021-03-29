import { put, takeEvery, call } from 'redux-saga/effects';
import * as reducer from 'app/redux/SearchReducer';
import { conductSearch } from 'app/utils/ServerApiClient';

export const searchWatches = [takeEvery('search/SEARCH_DISPATCH', search)];

export function* search(action) {
    const { q, s, scroll_id } = action.payload;
    const append = !!scroll_id;
    yield put(reducer.searchPending({ pending: true }));
    try {
        const requestParams = {
            body: {
                q,
                sort: s ? s : 'relevance',
                scroll_id: scroll_id ? scroll_id : '',
            },
        };
        const searchResponse = yield call(conductSearch, requestParams);
        if (searchResponse.status >= 200 && searchResponse.status < 300) {
            const searchJSON = yield call([searchResponse, searchResponse.json]);
            yield put(reducer.searchResult({ ...searchJSON, append }));
        } else {
            yield put(reducer.searchError({ error: new Error('There was an error') }));
        }
    } catch (error) {
        yield put(reducer.searchError({ error }));
    }
    yield put(reducer.searchPending({ pending: false }));
}
