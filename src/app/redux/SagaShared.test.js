import { runSaga } from 'redux-saga';
import { api } from '@hiveio/hive-js';
import { Map } from 'immutable';
import globalReducer, { defaultState } from './GlobalReducer';
import { getAccount } from './SagaShared';

jest.mock('@hiveio/hive-js', () => ({
    api: {
        getAccountsAsync: jest.fn(),
        callAsync: jest.fn(),
    },
}));

const createStore = () => {
    let state = { global: defaultState.set('accounts', Map()) };
    return {
        dispatch: (action) => {
            state = { global: globalReducer(state.global, action) };
        },
        getState: () => state,
    };
};

const loadAccount = async (name) => {
    const store = createStore();
    await runSaga(store, getAccount, name).done;
    return store.getState().global.getIn(['accounts', name]);
};

describe('SagaShared getAccount', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        api.getAccountsAsync.mockImplementation(async ([name]) => [{ name, owner: {} }]);
    });

    afterEach(() => {
        console.log.mockRestore();
    });

    it('looks up witness status through database_api.find_witnesses', async () => {
        api.callAsync.mockResolvedValue({ witnesses: [{ owner: 'gtg' }] });

        const account = await loadAccount('gtg');

        expect(api.callAsync).toHaveBeenCalledWith('database_api.find_witnesses', { owners: ['gtg'] });
        expect(account.get('account_is_witness')).toBe(true);
    });

    it('leaves witness status unset for an account that is not a witness', async () => {
        api.callAsync.mockResolvedValue({ witnesses: [] });

        const account = await loadAccount('alice');

        expect(account.get('name')).toBe('alice');
        expect(account.get('account_is_witness')).toBeUndefined();
    });
});
