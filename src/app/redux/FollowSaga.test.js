import { runSaga } from 'redux-saga';
import { api } from '@hiveio/hive-js';
import globalReducer, { defaultState } from './GlobalReducer';
import { actions, loadFollowPage, FOLLOW_PAGE_SIZE } from './FollowSaga';

jest.mock('@hiveio/hive-js', () => ({
    api: {
        getFollowersAsync: jest.fn(),
        getFollowingAsync: jest.fn(),
    },
}));

const followerRows = (from, count) => Array.from({ length: count }, (_, i) => ({
        follower: `user${from + i}`,
        following: 'gtg',
        what: ['blog'],
    }));

const createStore = (global = defaultState) => {
    let state = { global };
    return {
        dispatch: (action) => {
            state = { global: globalReducer(state.global, action) };
        },
        getState: () => state,
    };
};

const run = (store, payload) => runSaga(store, loadFollowPage, actions.loadFollowPage(payload)).done;

const page = (store) => store.getState().global.getIn(['follow_pages', 'getFollowersAsync', 'gtg']);

describe('FollowSaga loadFollowPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    it('requests a single page and keeps it apart from the complete follow lists', async () => {
        api.getFollowersAsync.mockResolvedValue(followerRows(0, FOLLOW_PAGE_SIZE + 2));
        const store = createStore();

        await run(store, { method: 'getFollowersAsync', account: 'gtg' });

        expect(api.getFollowersAsync).toHaveBeenCalledTimes(1);
        expect(api.getFollowersAsync).toHaveBeenCalledWith('gtg', '', 'blog', FOLLOW_PAGE_SIZE + 2);
        expect(page(store).get('users').size).toBe(FOLLOW_PAGE_SIZE);
        expect(page(store).get('users').first()).toBe('user0');
        expect(page(store).get('users').last()).toBe(`user${FOLLOW_PAGE_SIZE - 1}`);
        expect(page(store).get('hasMore')).toBe(true);
        expect(page(store).get('loading')).toBe(false);
        expect(store.getState().global.get('follow')).toBeUndefined();
    });

    it('reuses a loaded first page when the tab is opened again', async () => {
        api.getFollowersAsync.mockResolvedValue(followerRows(0, 3));
        const store = createStore();

        await run(store, { method: 'getFollowersAsync', account: 'gtg' });
        await run(store, { method: 'getFollowersAsync', account: 'gtg' });

        expect(api.getFollowersAsync).toHaveBeenCalledTimes(1);
        expect(page(store).get('users').toArray()).toEqual(['user0', 'user1', 'user2']);
        expect(page(store).get('hasMore')).toBe(false);
    });

    it('appends the next page from the last shown account, dropping the echoed start', async () => {
        const store = createStore();
        api.getFollowersAsync.mockResolvedValueOnce(followerRows(0, FOLLOW_PAGE_SIZE + 2));
        await run(store, { method: 'getFollowersAsync', account: 'gtg' });

        const lastShown = `user${FOLLOW_PAGE_SIZE - 1}`;
        api.getFollowersAsync.mockResolvedValueOnce(followerRows(FOLLOW_PAGE_SIZE - 1, 11));
        await run(store, { method: 'getFollowersAsync', account: 'gtg', more: true });

        expect(api.getFollowersAsync).toHaveBeenLastCalledWith('gtg', lastShown, 'blog', FOLLOW_PAGE_SIZE + 2);
        const users = page(store).get('users');
        expect(users.size).toBe(FOLLOW_PAGE_SIZE + 10);
        expect(users.toSet().size).toBe(users.size);
        expect(users.last()).toBe(`user${FOLLOW_PAGE_SIZE + 9}`);
        expect(page(store).get('hasMore')).toBe(false);

        await run(store, { method: 'getFollowersAsync', account: 'gtg', more: true });
        expect(api.getFollowersAsync).toHaveBeenCalledTimes(2);
    });

    it('reads the following name for the Followed list', async () => {
        api.getFollowingAsync.mockResolvedValue([{ follower: 'gtg', following: 'alice', what: ['blog'] }]);
        const store = createStore();

        await run(store, { method: 'getFollowingAsync', account: 'gtg' });

        expect(
            store.getState().global.getIn(['follow_pages', 'getFollowingAsync', 'gtg', 'users']).toArray()
        ).toEqual(['alice']);
    });

    it('forgets a failed first page so opening the tab again retries', async () => {
        api.getFollowersAsync.mockRejectedValueOnce(new Error('node down'));
        const store = createStore();

        await run(store, { method: 'getFollowersAsync', account: 'gtg' });
        expect(page(store)).toBeUndefined();

        api.getFollowersAsync.mockResolvedValueOnce(followerRows(0, 1));
        await run(store, { method: 'getFollowersAsync', account: 'gtg' });
        expect(page(store).get('users').toArray()).toEqual(['user0']);
    });
});
