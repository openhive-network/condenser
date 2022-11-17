import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { IntlProvider } from 'react-intl';
import { fromJS, Map } from 'immutable';
import renderer from 'react-test-renderer';
import rootReducer from 'app/redux/RootReducer';
import configureMockStore from 'redux-mock-store';

import Voting from './Voting';
import { render, fireEvent } from '../../../test/unit/tools';

global.window = {};
window.localStorage = global.localStorage;

const mockGlobal = Map({
    props: Map({ hbd_print_rate: 99 }),
    feed_price: Map({
        base: '5 HBD',
        quote: '10 HIVE',
    }),
    content: Map({
        test: Map({
            author: 'Jane Doe',
            permlink: 'zip',
            active_votes: Map({}),
            stats: {
                total_votes: 1,
            },
            max_accepted_payout: '999999 HBD',
            percent_hbd: 0,
            pending_payout_value: '10 HBD',
            payout_at: '2018-03-30T10:00:00Z',
            pending_payout_sbd: 99,
        }),
    }),
});

const mockUser = Map({ current: Map({ username: 'Janice' }) });

const voteTestObj = fromJS({
    stats: {
        total_votes: 1,
    },
    max_accepted_payout: '999999 HBD',
    percent_hbd: 0,
    pending_payout_value: '10 HBD',
    payout_at: '2018-03-30T10:00:00Z',
});

describe('Voting', () => {
    it('should render flag if user is logged in and flag prop is true.', () => {
        const mockStore = configureMockStore()({
            global: mockGlobal,
            offchain: {},
            user: mockUser,
            transaction: {},
            discussion: {},
            routing: {},
            app: {},
        });
        const { container, getByTitle } = render(
            <Voting
                flag
                vote={() => {}}
                post={voteTestObj}
                price_per_hive={1}
                hbd_print_rate={10000}
                store={mockStore}
            />
        );
        expect(container.firstChild).toHaveClass('Voting');
        expect(getByTitle('Downvote')).toHaveClass('flag');
    });

    it('should dispatch an action when flag is clicked and myVote is negative', () => {
        const mockStore = configureMockStore()({
            global: mockGlobal,
            offchain: {},
            user: mockUser,
            transaction: {},
            discussion: {},
            routing: {},
            app: {},
        });
        const { getByTitle } = render(
            <Voting
                flag
                myVote={-666}
                vote={() => {}}
                post={voteTestObj}
                price_per_hive={1}
                hbd_print_rate={10000}
                store={mockStore}
            />
        );

        const downvoteBtn = getByTitle('Downvote');
        expect(downvoteBtn).toHaveClass('flag');
        fireEvent.click(downvoteBtn);

        expect(mockStore.getActions()[0].type).toEqual('transaction/BROADCAST_OPERATION');
        expect(mockStore.getActions()[0].payload.operation.weight).toEqual(0);
        expect(mockStore.getActions()[0].payload.operation.voter).toEqual('Janice');
    });

    it('should render upvote and should not render flag if user is logged in and flag prop is false.', () => {
        const mockStore = configureMockStore()({
            global: mockGlobal,
            offchain: {},
            user: mockUser,
            transaction: {},
            discussion: {},
            routing: {},
            app: {},
        });
        const { container, getByTitle } = render(
            <Voting
                flag={false}
                vote={() => {}}
                post={voteTestObj}
                price_per_hive={1}
                hbd_print_rate={10000}
                store={mockStore}
            />
        );
        expect(getByTitle('Downvote')).toBeInTheDocument();
        expect(container.getElementsByClassName('upvote')).toHaveLength(1);
    });

    it('should dispatch an action with payload when upvote button is clicked.', () => {
        const mockStore = configureMockStore()({
            global: mockGlobal,
            offchain: {},
            user: mockUser,
            transaction: {},
            discussion: {},
            routing: {},
            app: {},
        });
        const { getByTestId } = render(
            <Voting
                flag={false}
                vote={() => {}}
                post={voteTestObj}
                price_per_hive={1}
                hbd_print_rate={10000}
                store={mockStore}
            />
        );

        const upvoteBtn = getByTestId('upvote-btn');
        fireEvent.click(upvoteBtn);

        expect(mockStore.getActions()[0].type).toEqual('transaction/BROADCAST_OPERATION');
        expect(mockStore.getActions()[0].payload.operation.weight).toEqual(10000);
        expect(mockStore.getActions()[0].payload.operation.voter).toEqual('Janice');
    });

    it('should show all HP if percent_hbd is 0', () => {
        const post_obj = fromJS({
            stats: {
                total_votes: 1,
            },
            max_accepted_payout: '999999 HBD',
            percent_hbd: 0,
            pending_payout_value: '10 HBD',
            payout_at: '2018-03-30T10:00:00Z',
        });
        const store = createStore(rootReducer);
        const component = renderer.create(
            <Provider store={store}>
                <IntlProvider locale="en">
                    <Voting vote={() => {}} post={post_obj} price_per_hive={1} hbd_print_rate={10000} />
                </IntlProvider>
            </Provider>
        );
        expect(JSON.stringify(component.toJSON())).toContain('0.00 HBD, 10.00 HP');
    });

    it('should omit liquid hive if print rate is 10000', () => {
        const store = createStore(rootReducer);
        const post_obj = fromJS({
            stats: {
                total_votes: 1,
            },
            max_accepted_payout: '999999 HBD',
            percent_hbd: 10000,
            pending_payout_value: '10 HBD',
            payout_at: '2018-03-30T10:00:00Z',
        });
        const component = renderer.create(
            <Provider store={store}>
                <IntlProvider locale="en">
                    <Voting vote={() => {}} post={post_obj} price_per_hive={1} hbd_print_rate={10000} />
                </IntlProvider>
            </Provider>
        );
        expect(JSON.stringify(component.toJSON())).toContain('5.00 HBD, 5.00 HP');
    });

    it('should show liquid hive if print rate is < 10000', () => {
        const post_obj = fromJS({
            stats: {
                total_votes: 1,
            },
            max_accepted_payout: '999999 HBD',
            percent_hbd: 10000,
            pending_payout_value: '10 HBD',
            payout_at: '2018-03-30T10:00:00Z',
        });
        const store = createStore(rootReducer);
        const component = renderer.create(
            <Provider store={store}>
                <IntlProvider locale="en">
                    <Voting vote={() => {}} post={post_obj} price_per_hive={1} hbd_print_rate={5000} />
                </IntlProvider>
            </Provider>
        );
        expect(JSON.stringify(component.toJSON())).toContain('2.50 HBD, 2.50 HIVE, 5.00 HP');
    });
});
