import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
// import LoadingIndicator  from 'app/components/elements/LoadingIndicator';
// import shouldComponentUpdate  from 'app/utils/shouldComponentUpdate';
import * as transactionActions from 'app/redux/TransactionReducer';
import Icon from 'app/components/elements/Icon';
import tt from 'counterpart';

const { string, func } = PropTypes;

export default class Reblog extends PureComponent {
    static propTypes = {
        account: string,
        author: string,
        permlink: string,
        reblog: func,
    };

    constructor(props) {
        super(props);
        // this.shouldComponentUpdate = shouldComponentUpdate(this, 'Reblog');
        const { account } = props;
        this.state = {
            active: account ? this.isReblogged(account) : false,
            loading: false,
        };
    }

    componentDidMount() {
        if (this.props.account) {
            const active = this.isReblogged(this.props.account);
            this.setState({ active });
        }
    }

    reblog = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.state.active) return;
        this.setState({ loading: true });
        const {
            reblog, account, author, permlink
        } = this.props;
        reblog(
            account,
            author,
            permlink,
            () => {
                this.setState({ active: true, loading: false });
                this.setReblogged(account);
            },
            () => {
                this.setState({ active: false, loading: false });
            }
        );
    };

    isReblogged(account) {
        const { author, permlink } = this.props;
        return getRebloggedList(account).includes(`${author}/${permlink}`);
    }

    setReblogged(account) {
        const { author, permlink } = this.props;
        clearRebloggedCache();
        const posts = getRebloggedList(account);
        posts.push(author + '/' + permlink);
        if (posts.length > 200) posts.shift(1);

        localStorage.setItem('reblogged_' + account, JSON.stringify(posts));
    }

    render() {
        const state = this.state.active ? 'active' : 'inactive';
        const loading = this.state.loading ? ' loading' : '';
        const { author, permlink } = this.props;

        return (
            <span className={'Reblog__button Reblog__button-' + state + loading}>
                <a href="#" onClick={this.reblog} title={`${tt('g.reblog')} @${author}/${permlink}`}>
                    <Icon name="reblog" />
                </a>
            </span>
        );
    }
}
module.exports = connect(
    (state, ownProps) => {
        const account = state.user.getIn(['current', 'username']) || state.offchain.get('account');
        return { ...ownProps, account };
    },
    (dispatch) => ({
        reblog: (account, author, permlink, successCallback, errorCallback) => {
            const json = ['reblog', { account, author, permlink }];
            dispatch(
                transactionActions.broadcastOperation({
                    type: 'custom_json',
                    confirm: 'This post will be added to your blog and shared with your followers.',
                    operation: {
                        id: 'follow',
                        required_posting_auths: [account],
                        json: JSON.stringify(json),
                        __config: { title: tt('g.reblog_this_post') },
                    },
                    successCallback,
                    errorCallback,
                })
            );
        },
    })
)(Reblog);

let lastAccount;
let cachedPosts;

function getRebloggedList(account) {
    if (!process.env.BROWSER) return [];

    if (lastAccount === account) return cachedPosts;

    lastAccount = account;
    const posts = localStorage.getItem('reblogged_' + account);
    try {
        cachedPosts = JSON.parse(posts) || [];
    } catch (e) {
        cachedPosts = [];
    }

    return cachedPosts;
}

function clearRebloggedCache() {
    lastAccount = null;
}
