// eslint-disable-next-line no-unused-vars
/* global describe, it, before, beforeEach, after, afterEach */

import { call, takeEvery } from 'redux-saga/effects';
import { callBridge } from 'app/utils/steemApi';
import * as transactionActions from 'app/redux/TransactionReducer';
import {
    createPermlink,
    createPatch,
    transactionWatches,
    broadcastOperation,
} from './TransactionSaga';

const operation = {
    type: 'comment',
    author: 'Alice',
    body:
        "The Body is a pretty long chunck of text that represents the user's voice, it seems they have much to say, and this is one place where they can do that.",
    category: 'hi',
    json_metadata: JSON.stringify({
        tags: ['hi'],
        app: 'steemit/0.1',
        format: 'markdown',
    }),
    parent_author: 'candide',
    parent_permlink: 'cool',
    title: 'test',
    __config: {},
    errorCallback: () => '',
    successCallback: () => '',
    memo: '#testing',
};

describe('TransactionSaga', () => {
    describe('watch user actions and trigger appropriate saga', () => {
        const gen = transactionWatches;
        it('should call the broadcastOperation saga with every transactionActions.BROADCAST_OPERATION action', () => {
            expect(gen).toEqual([takeEvery(transactionActions.BROADCAST_OPERATION, broadcastOperation)]);
        });
    });

    describe('createPatch', () => {
        it('should return undefined if empty arguments are passed', () => {
            const actual = createPatch('', '');
            expect(actual).toEqual(undefined);
        });
        it('should return the patch that reconciles two different strings', () => {
            const testString = 'there is something interesting going on here that I do not fully understand it is seemingly complex but it is actually quite simple';
            const actual = createPatch(testString, testString + 'ILU');
            expect(actual).toEqual('@@ -120,12 +120,15 @@\n quite simple\n+ILU\n');
        });
    });

    describe('createPermlink', () => {
        const gen = createPermlink(operation.title, operation.author);
        it('should call the api to get a permlink if the title is valid', () => {
            const actual = gen.next().value;
            const mockCall = call(callBridge, 'get_post_header', {
                author: operation.author,
                permlink: operation.title,
            });
            expect(actual).toEqual(mockCall);
        });
        it('should return a string containing the transformed data from the api', () => {
            const permlink = gen.next({ body: 'test' }).value;
            expect(permlink.indexOf('test') > -1).toEqual(true); // TODO: cannot deep equal due to date stamp at runtime.
        });
        it('should generate own permlink, independent of api if title is empty', () => {
            const gen2 = createPermlink('', operation.author);
            const actual = gen2.next().value;
            expect(actual.match(/^[a-z0-9]{6}$/) !== null).toEqual(true);
        });
    });

    /*describe('preBroadcast_comment', () => {
        let gen = preBroadcast_comment({ operation, username });

        it('should call createPermlink', () => {
            const permlink = gen.next(operation.title, operation.author).value;
            const actual = permlink.next().value;
            const expected = call(callBridge, 'get_post_header', {
                author: operation.author,
                permlink: operation.title,
            });
            expect(expected).toEqual(actual);
        });
        it('should return the comment options array.', () => {
            let actual = gen.next('mock-permlink-123').value;
            const expected = [
                [
                    'comment',
                    {
                        author: operation.author,
                        category: operation.category,
                        errorCallback: operation.errorCallback,
                        successCallback: operation.successCallback,
                        parent_author: operation.parent_author,
                        parent_permlink: operation.parent_permlink,
                        type: operation.type,
                        __config: operation.__config,
                        memo: operation.memo,
                        permlink: 'mock-permlink-123',
                        json_metadata: operation.json_metadata,
                        title: (operation.title || '').trim(),
                        body: operation.body,
                    },
                ],
            ];
            expect(actual).toEqual(expected);
        });
        it('should return a patch as body value if patch is smaller than body.', () => {
            const originalBod = operation.body + 'minor difference';
            operation.__config.originalBody = originalBod;
            gen = preBroadcast_comment({ operation, username });
            gen.next(
                operation.title,
                operation.author,
                operation.parent_author,
                operation.parent_permlink
            );
            const actual = gen.next('mock-permlink-123').value;
            const expected = createPatch(originalBod, operation.body);
            expect(actual[0][1].body).toEqual(expected);
        });
        it('should return body as body value if patch is larger than body.', () => {
            const originalBod = 'major difference';
            operation.__config.originalBody = originalBod;
            gen = preBroadcast_comment({ operation, username });
            gen.next(
                operation.title,
                operation.author,
                operation.parent_author,
                operation.parent_permlink
            );
            const actual = gen.next('mock-permlink-123').value;
            const expected = operation.body;
            expect(actual[0][1].body).toEqual(expected, 'utf-8');
        });
    });*/
});
