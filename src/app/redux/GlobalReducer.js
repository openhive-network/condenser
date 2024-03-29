import {
 Map, List, fromJS, Iterable
} from 'immutable';
import Sanitizer from 'app/utils/Sanitizer';

export const defaultState = Map({
    status: {},
});

// Action constants
const SET_COLLAPSED = 'global/SET_COLLAPSED';
const RECEIVE_STATE = 'global/RECEIVE_STATE';
const RECEIVE_NOTIFICATIONS = 'global/RECEIVE_NOTIFICATIONS';
const RECEIVE_UNREAD_NOTIFICATIONS = 'global/RECEIVE_UNREAD_NOTIFICATIONS';
const NOTIFICATIONS_LOADING = 'global/NOTIFICATIONS_LOADING';
const RECEIVE_ACCOUNT = 'global/RECEIVE_ACCOUNT';
const RECEIVE_ACCOUNTS = 'global/RECEIVE_ACCOUNTS';
const RECEIVE_POST_HEADER = 'global/RECEIVE_POST_HEADER';
const RECEIVE_COMMUNITY = 'global/RECEIVE_COMMUNITY';
const RECEIVE_COMMUNITIES = 'global/RECEIVE_COMMUNITIES';
const LOADING_SUBSCRIPTIONS = 'global/LOADING_SUBSCRIPTIONS';
const RECEIVE_SUBSCRIPTIONS = 'global/RECEIVE_SUBSCRIPTIONS';
const SYNC_SPECIAL_POSTS = 'global/SYNC_SPECIAL_POSTS';
const RECEIVE_CONTENT = 'global/RECEIVE_CONTENT';
const LINK_REPLY = 'global/LINK_REPLY';
const DELETE_CONTENT = 'global/DELETE_CONTENT';
const VOTED = 'global/VOTED';
const UNVOTED = 'global/UNVOTED';
const FETCHING_DATA = 'global/FETCHING_DATA';
const RECEIVE_DATA = 'global/RECEIVE_DATA';
const SET = 'global/SET';
const REMOVE = 'global/REMOVE';
const UPDATE = 'global/UPDATE';
const FETCH_JSON = 'global/FETCH_JSON';
const FETCH_JSON_RESULT = 'global/FETCH_JSON_RESULT';
const SHOW_DIALOG = 'global/SHOW_DIALOG';
const HIDE_DIALOG = 'global/HIDE_DIALOG';
const RECEIVE_REWARDS = 'global/RECEIVE_REWARDS';
const LAZY_UPDATE = 'global/LAZY_UPDATE';

const postKey = (author, permlink) => {
    if ((author || '') === '' || (permlink || '') === '') return null;
    return author + '/' + permlink;
};

/**
 * Transfrom nested JS object to appropriate immutable collection.
 *
 * @param {Object} account
 */

const transformAccount = (account) => fromJS(account, (key, value) => {
        if (key === 'witness_votes') return value.toSet();
        const isIndexed = Iterable.isIndexed(value);
        return isIndexed ? value.toList() : value.toOrderedMap();
    });

/**
 * Merging accounts: A get_state will provide a very full account but a get_accounts will provide a smaller version this makes sure we don't overwrite
 *
 * @param {Immutable.Map} state
 * @param {Immutable.Map} account
 *
 */

const mergeAccounts = (state, account) => {
    return state.updateIn(['accounts', account.get('name')], Map(), (a) => a.mergeDeep(account));
};

export default function reducer(state = defaultState, action = {}) {
    const { payload } = action;

    switch (action.type) {
        case SET_COLLAPSED: {
            return state.withMutations((map) => {
                map.updateIn(['content', payload.post], (value) => value.merge(Map({ collapsed: payload.collapsed })));
            });
        }

        case LAZY_UPDATE:
            // update edited post/comment in state
            const key = payload.author + '/' + payload.permlink;
            const update = {
                body: payload.body,
                title: payload.title,
                category: payload.category,
                stats: {
                    hide: false,
                    gray: false,
                    total_votes: 0,
                    flag_weight: 0,
                },
            };
            return state.updateIn(['content', key], Map(), (c) => c.mergeDeep(update));

        case RECEIVE_STATE: {
            if (Object.prototype.hasOwnProperty.call(payload, 'community')) {
                const communities = Object.keys(payload.community);
                for (let ci = 0; ci < communities.length; ci += 1) {
                    const community = payload.community[communities[ci]];
                    community.title = Sanitizer.getTextOnly(community.title);
                    community.description = Sanitizer.getTextOnly(community.description);
                    community.flag_text = Sanitizer.getTextOnly(community.flag_text);
                    community.about = Sanitizer.getTextOnly(community.about);

                    for (let ti = 0; ti < community.team.length; ti += 1) {
                        const member = community.team[ti];
                        community.team[ti][2] = Sanitizer.getTextOnly(member[2]);
                    }
                }
            }
            return state.mergeDeep(fromJS(payload));
        }

        case RECEIVE_NOTIFICATIONS: {
            console.log('Receive notifications', payload);
            return state.updateIn(['notifications', payload.name], Map(), (n) => n.withMutations((nmut) => nmut
                        .update('notifications', List(), (a) => a.concat(fromJS(payload.notifications)))
                        .set('isLastPage', payload.isLastPage)));
        }

        case RECEIVE_UNREAD_NOTIFICATIONS: {
            return state.setIn(
                ['notifications', payload.name, 'unreadNotifications'],
                Map(payload.unreadNotifications)
            );
        }

        case NOTIFICATIONS_LOADING: {
            return state.setIn(['notifications', 'loading'], payload);
        }

        case RECEIVE_ACCOUNT: {
            const account = transformAccount(payload.account);
            return mergeAccounts(state, account);
        }

        case RECEIVE_ACCOUNTS: {
            return payload.accounts.reduce((acc, curr) => {
                const transformed = transformAccount(curr);
                return mergeAccounts(acc, transformed);
            }, state);
        }

        case RECEIVE_POST_HEADER: {
            return state.update('headers', Map(), (a) => a.mergeDeep(fromJS(payload)));
        }

        case RECEIVE_COMMUNITIES: {
            let map = null;
            let idx = null;

            if (payload !== null) {
                map = Map(payload.map((c) => [c.name, fromJS(c)]));
                idx = List(payload.map((c) => c.name));
            }

            return state.setIn(['community'], map).setIn(['community_idx'], idx);
        }

        case RECEIVE_COMMUNITY: {
            return state.update('community', Map(), (a) => a.mergeDeep(payload));
        }

        case LOADING_SUBSCRIPTIONS: {
            return state.setIn(['subscriptions', 'loading'], payload);
        }

        case RECEIVE_SUBSCRIPTIONS: {
            return state.setIn(['subscriptions', payload.username], fromJS(payload.subscriptions));
        }
        case RECEIVE_REWARDS: {
            return state.set('rewards', fromJS(payload.rewards));
        }

        // Interleave special posts into the map of posts.
        case SYNC_SPECIAL_POSTS: {
            return payload.featuredPosts.concat(payload.promotedPosts).reduce((acc, specialPost) => {
                const author = specialPost.get('author');
                const permlink = specialPost.get('permlink');
                return acc.updateIn(['content', `${author}/${permlink}`], Map(), (p) => p.mergeDeep(specialPost));
            }, state);
        }

        case RECEIVE_CONTENT: {
            const content = fromJS(payload.content);
            const _key = content.get('author') + '/' + content.get('permlink');

            // merge content object into map
            let new_state = state.updateIn(['content', _key], Map(), (c) => c.mergeDeep(content));

            // merge vote info taking pending votes into account
            const votes_key = ['content', _key, 'active_votes'];
            const old_votes = state.getIn(votes_key, List());
            const new_votes = content.get('active_votes');
            const merged_votes = new_votes.merge(new_votes, old_votes);
            new_state = new_state.setIn(votes_key, merged_votes);

            // set creation-pending key (optimistic UI update)
            if (content.get('depth') == 0) {
                const category = content.get('category');
                const dkey = ['discussion_idx', category, '_created'];
                new_state = new_state.setIn(dkey, _key);
            }

            return new_state;
        }

        case LINK_REPLY: {
            const {
 author, permlink, parent_author = '', parent_permlink = ''
} = payload;
            const parent_key = postKey(parent_author, parent_permlink);
            if (!parent_key) return state;
            const _key = author + '/' + permlink;
            // Add key if not exist
            let updatedState = state.updateIn(
                ['content', parent_key, 'replies'],
                List(),
                (l) => (l.findIndex((i) => i === _key) === -1 ? l.push(_key) : l)
            );
            const children = updatedState.getIn(['content', parent_key, 'replies'], List()).size;
            updatedState = updatedState.updateIn(['content', parent_key, 'children'], 0, () => children);
            return updatedState;
        }

        case DELETE_CONTENT: {
            const { author, permlink } = payload;
            const _key = author + '/' + permlink;
            const content = state.getIn(['content', _key]);
            const parent_key = postKey(content.get('parent_author'), content.get('parent_permlink'));
            let updatedState = state.deleteIn(['content', _key]);
            if (parent_key) {
                updatedState = updatedState.updateIn(['content', parent_key, 'replies'], List(), (r) => r.filter((i) => i !== _key));
            }
            return updatedState;
        }

        case VOTED: {
            const {
                voter, author, permlink, weight
            } = payload;
            const vote = Map({ voter, percent: weight });
            const _key = ['content', author + '/' + permlink, 'active_votes'];
            let votes = state.getIn(_key, List());
            if (votes === null) {
                votes = List();
            }

            const idx = votes.findIndex((v) => v.get('voter') === voter);
            votes = idx === -1 ? votes.push(vote) : votes.set(idx, vote);

            // TODO: new state never returned -- masked by RECEIVE_CONTENT
            state = state.setIn(_key, votes);
            return state;
        }

        case UNVOTED: {
            const {
                voter, author, permlink,
            } = payload;
            const _key = ['content', author + '/' + permlink, 'active_votes'];
            let votes = state.getIn(_key, List());
            if (votes === null) {
                votes = List();
            }

            const idx = votes.findIndex((v) => v.get('voter') === voter);
            votes = votes.splice(idx, 1);
            // votes = idx === -1 ? votes.push(vote) : votes.set(idx, vote);

            // TODO: new state never returned -- masked by RECEIVE_CONTENT
            state = state.setIn(_key, votes);
            return state;
        }

        case FETCHING_DATA: {
            const { order, category } = payload;
            const new_state = state.updateIn(['status', category || '', order], () => {
                return { fetching: true };
            });
            return new_state;
        }

        case RECEIVE_DATA: {
            const {
 data, order, category, fetching, endOfData
} = payload;
            let new_state;

            // append content keys to `discussion_idx` list
            const _key = ['discussion_idx', category || '', order];
            new_state = state.updateIn(_key, List(), (list) => {
                return list.withMutations((posts) => {
                    data.forEach((value) => {
                        const __key = `${value.author}/${value.permlink}`;
                        if (!posts.includes(_key)) posts.push(__key);
                    });
                });
            });

            // append content to `content` map
            new_state = new_state.updateIn(['content'], (content) => {
                return content.withMutations((map) => {
                    data.forEach((value) => {
                        const __key = `${value.author}/${value.permlink}`;
                        map.set(__key, fromJS(value));
                    });
                });
            });

            // update status
            new_state = new_state.updateIn(['status', category || '', order], () => {
                if (endOfData) {
                    return { fetching, last_fetch: new Date() };
                }
                return { fetching };
            });
            return new_state;
        }

        case SET: {
            const { key: _key, value } = payload;
            const key_array = Array.isArray(_key) ? _key : [_key];
            return state.setIn(key_array, fromJS(value));
        }

        case REMOVE: {
            const _key = Array.isArray(payload.key) ? payload.key : [payload.key];
            return state.removeIn(_key);
        }

        case UPDATE: {
            const { key: _key, notSet = Map(), updater } = payload;
            return state.updateIn(_key, notSet, updater);
        }

        case FETCH_JSON: {
            return state;
        }

        case FETCH_JSON_RESULT: {
            const { id, result, error } = payload;
            return state.set(id, fromJS({ result, error }));
        }

        case SHOW_DIALOG: {
            const { name, params = {} } = payload;
            return state.update('active_dialogs', Map(), (d) => d.set(name, fromJS({ params })));
        }

        case HIDE_DIALOG: {
            return state.update('active_dialogs', (d) => d.delete(payload.name));
        }

        default:
            return state;
    }
}

// Action creators

export const setCollapsed = (payload) => ({
    type: SET_COLLAPSED,
    payload,
});

export const receiveState = (payload) => ({
    type: RECEIVE_STATE,
    payload,
});

export const receiveNotifications = (payload) => ({
    type: RECEIVE_NOTIFICATIONS,
    payload,
});

export const receiveUnreadNotifications = (payload) => ({
    type: RECEIVE_UNREAD_NOTIFICATIONS,
    payload,
});

export const notificationsLoading = (payload) => ({
    type: NOTIFICATIONS_LOADING,
    payload,
});

export const receiveRewards = (payload) => ({
    type: RECEIVE_REWARDS,
    payload,
});

export const receiveAccount = (payload) => ({
    type: RECEIVE_ACCOUNT,
    payload,
});

export const receiveAccounts = (payload) => ({
    type: RECEIVE_ACCOUNTS,
    payload,
});

export const receivePostHeader = (payload) => ({
    type: RECEIVE_POST_HEADER,
    payload,
});

export const receiveCommunities = (payload) => ({
    type: RECEIVE_COMMUNITIES,
    payload,
});

export const receiveCommunity = (payload) => ({
    type: RECEIVE_COMMUNITY,
    payload,
});

export const receiveSubscriptions = (payload) => ({
    type: RECEIVE_SUBSCRIPTIONS,
    payload,
});
export const loadingSubscriptions = (payload) => ({
    type: LOADING_SUBSCRIPTIONS,
    payload,
});

export const syncSpecialPosts = (payload) => ({
    type: SYNC_SPECIAL_POSTS,
    payload,
});

export const receiveContent = (payload) => ({
    type: RECEIVE_CONTENT,
    payload,
});

export const linkReply = (payload) => ({
    type: LINK_REPLY,
    payload,
});

export const deleteContent = (payload) => ({
    type: DELETE_CONTENT,
    payload,
});

export const voted = (payload) => ({
    type: VOTED,
    payload,
});

export const unvoted = (payload) => ({
    type: UNVOTED,
    payload,
});

export const fetchingData = (payload) => ({
    type: FETCHING_DATA,
    payload,
});

export const receiveData = (payload) => ({
    type: RECEIVE_DATA,
    payload,
});

// TODO: Find a better name for this
export const set = (payload) => ({
    type: SET,
    payload,
});

export const remove = (payload) => ({
    type: REMOVE,
    payload,
});

export const update = (payload) => ({
    type: UPDATE,
    payload,
});

export const fetchJson = (payload) => ({
    type: FETCH_JSON,
    payload,
});

export const fetchJsonResult = (payload) => ({
    type: FETCH_JSON_RESULT,
    payload,
});

export const showDialog = (payload) => ({
    type: SHOW_DIALOG,
    payload,
});

export const hideDialog = (payload) => ({
    type: HIDE_DIALOG,
    payload,
});

export const lazyUpdate = (payload) => ({
    type: LAZY_UPDATE,
    payload,
});
