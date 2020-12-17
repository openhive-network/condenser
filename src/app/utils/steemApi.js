import { api } from '@hiveio/hive-js';
import Big from 'big.js';
import { ifHive } from 'app/utils/Community';
import stateCleaner from 'app/redux/stateCleaner';
import {
    fetchCrossPosts,
    augmentContentWithCrossPost,
} from 'app/utils/CrossPosts';

export async function callBridge(method, params) {
    // [JES] Hivemind throws an exception if you call for my/[trending/payouts/new/etc] with a null observer
    // so just delete the 'my' tag if there is no observer specified
    if (
        method === 'get_ranked_posts' &&
        params &&
        (params.observer === null || params.observer === undefined) &&
        params.tag === 'my'
    ) {
        delete params.tag;
        delete params.observer;
    }

    if (
        method !== 'account_notifications' &&
        method !== 'unread_notifications' &&
        method !== 'list_all_subscriptions' &&
        method !== 'get_post_header' &&
        (params.observer === null || params.observer === undefined)
    )
        params.observer = $STM_Config.default_observer;

    console.log(
        'call bridge',
        method,
        params && JSON.stringify(params).substring(0, 200)
    );

    return new Promise(function(resolve, reject) {
        api.call('bridge.' + method, params, function(err, data) {
            if (err) {
                // [JES] This is also due to a change in hivemind that we've requested a change for.
                // The condenser uses this call to make sure the permlink it generates is unique by asking
                // hivemind for the post header with the generated permlink. Hivemind used to just return
                // an emptry result if it wasn't found, but now it throws an exception instead. This allows
                // the condenser to get past the unique check but we don't actually know if it's unique at this point.
                // If it isn't, the final broadcast transaction will fail and the post won't create, so I'm really
                // just pushing the error further down the chain and hoping the generated permlinks are unique.
                // Once hivemind is fixed to return an empty result instead of an exception again, this code
                // can be removed
                if (method === 'get_post_header') {
                    resolve({ result: [] });
                }
                reject(err);
            } else resolve(data);
        });
    });
}

export function getHivePowerForUser(account) {
    return new Promise(async (resolve, reject) => {
        try {
            const fullAccounts = await api.callAsync(
                'database_api.find_accounts',
                { accounts: [account] }
            );

            api.getDynamicGlobalProperties((error, result) => {
                if (error) return reject(error);

                try {
                    const {
                        total_vesting_fund_hive,
                        total_vesting_shares,
                    } = result;
                    const totalHive = total_vesting_fund_hive.split(' ')[0];
                    const totalVests = total_vesting_shares.split(' ')[0];

                    const post_voting_power =
                        fullAccounts['accounts'][0]['post_voting_power'];
                    /**
                     * old implementation instead of getting hive/vests dynamically
                     * This magic number is coming from
                     * https://gitlab.syncad.com/hive/hivemind/-/blame/d2d5ef25107908db09438da5ee3da9d6fcb976bc/hive/server/bridge_api/objects.py
                     */
                    //    const MAGIC_NUMBER = 0.0005037;

                    const hiveDividedByVests = new Big(totalHive)
                        .div(new Big(totalVests))
                        .toFixed(7);

                    const hive_power = new Big(post_voting_power.amount)
                        .times(new Big(hiveDividedByVests))
                        .times(1 / Math.pow(10, post_voting_power.precision))
                        .toFixed(0);
                    resolve(hive_power);
                } catch (err) {
                    return 0;
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

export async function getStateAsync(url, observer, ssr = false) {
    console.log('getStateAsync');
    if (observer === undefined) observer = null;

    const { page, tag, sort, key } = parsePath(url);

    console.log('GSA', url, observer, ssr);
    let state = {
        accounts: {},
        community: {},
        content: {},
        discussion_idx: {},
        profiles: {},
    };

    // load `content` and `discussion_idx`
    if (page == 'posts' || page == 'account') {
        const posts = await loadPosts(sort, tag, observer);
        state['content'] = posts['content'];
        state['discussion_idx'] = posts['discussion_idx'];
    } else if (page == 'thread') {
        const posts = await loadThread(key[0], key[1]);
        state['content'] = posts['content'];
    } else {
        // no-op
    }

    // append `community` key
    if (tag && ifHive(tag)) {
        try {
            state['community'][tag] = await callBridge('get_community', {
                name: tag,
                observer: observer,
            });
        } catch (e) {}
    }

    // for SSR, load profile on any profile page or discussion thread author
    const account =
        tag && tag[0] == '@'
            ? tag.slice(1)
            : page == 'thread' ? key[0].slice(1) : null;
    if (ssr && account) {
        // TODO: move to global reducer?
        const profile = await callBridge('get_profile', { account });
        const hive_power = await getHivePowerForUser(account);

        if (profile && profile['name']) {
            state['profiles'][account] = {
                ...profile,
                stats: {
                    ...profile.stats,
                    sp: hive_power,
                },
            };
        }
    }

    if (ssr) {
        // append `topics` key
        state['topics'] = await callBridge('get_trending_topics', {
            limit: 12,
        });
    }

    const cleansed = stateCleaner(state);
    return cleansed;
}

async function loadThread(account, permlink) {
    const author = account.slice(1);
    const content = await callBridge('get_discussion', { author, permlink });

    if (content) {
        const {
            content: preppedContent,
            keys,
            crossPosts,
        } = await fetchCrossPosts([Object.values(content)[0]], author);
        if (crossPosts) {
            const crossPostKey = content[keys[0]].cross_post_key;
            content[keys[0]] = preppedContent[keys[0]];
            content[keys[0]] = augmentContentWithCrossPost(
                content[keys[0]],
                crossPosts[crossPostKey]
            );
        }
    }

    return { content };
}

async function loadPosts(sort, tag, observer) {
    console.log('loadPosts');
    const account = tag && tag[0] == '@' ? tag.slice(1) : null;

    let posts;
    if (account) {
        const params = { sort, account, observer };
        posts = await callBridge('get_account_posts', params);
    } else {
        const params = { sort, tag, observer };
        posts = await callBridge('get_ranked_posts', params);
    }

    const { content, keys, crossPosts } = await fetchCrossPosts(
        posts,
        observer
    );

    if (Object.keys(crossPosts).length > 0) {
        for (let ki = 0; ki < keys.length; ki += 1) {
            const contentKey = keys[ki];
            let post = content[contentKey];

            if (Object.prototype.hasOwnProperty.call(post, 'cross_post_key')) {
                post = augmentContentWithCrossPost(
                    post,
                    crossPosts[post.cross_post_key]
                );
            }
        }
    }

    const discussion_idx = {};
    discussion_idx[tag] = {};
    discussion_idx[tag][sort] = keys;

    return { content, discussion_idx };
}

function parsePath(url) {
    // strip off query string
    url = url.split('?')[0];

    // strip off leading and trailing slashes
    if (url.length > 0 && url[0] == '/') url = url.substring(1, url.length);
    if (url.length > 0 && url[url.length - 1] == '/')
        url = url.substring(0, url.length - 1);

    // blank URL defaults to `trending`
    if (url === '') url = 'trending';

    const part = url.split('/');
    const parts = part.length;
    const sorts = [
        'trending',
        'promoted',
        'hot',
        'created',
        'payout',
        'payout_comments',
        'muted',
    ];
    const acct_tabs = [
        'blog',
        'feed',
        'posts',
        'comments',
        'replies',
        'payout',
    ];

    let page = null;
    let tag = null;
    let sort = null;
    let key = null;

    if (parts == 1 && sorts.includes(part[0])) {
        page = 'posts';
        sort = part[0];
        tag = '';
    } else if (parts == 2 && sorts.includes(part[0])) {
        page = 'posts';
        sort = part[0];
        tag = part[1];
    } else if (parts == 3 && part[1][0] == '@') {
        page = 'thread';
        tag = part[0];
        key = [part[1], part[2]];
    } else if (parts == 1 && part[0][0] == '@') {
        page = 'account';
        sort = 'blog';
        tag = part[0];
    } else if (parts == 2 && part[0][0] == '@') {
        if (acct_tabs.includes(part[1])) {
            page = 'account';
            sort = part[1];
        } else {
            // settings, followers, notifications, etc (no-op)
        }
        tag = part[0];
    } else {
        // no-op URL
    }

    return { page, tag, sort, key };
}
