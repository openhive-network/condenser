import React from 'react';
import { connect } from 'react-redux';
import tt from 'counterpart';
import * as globalActions from 'app/redux/GlobalReducer';
import * as transactionActions from 'app/redux/TransactionReducer';

const nothingToClaim = 'No rewards pending redemption.';

const getRewardsString = account => {
    const reward_hive =
        parseFloat(account.get('reward_hive_balance').split(' ')[0]) > 0
            ? account.get('reward_hive_balance')
            : null;
    const reward_hbd =
        parseFloat(account.get('reward_hbd_balance').split(' ')[0]) > 0
            ? account.get('reward_hbd_balance')
            : null;
    const reward_hp =
        parseFloat(account.get('reward_vesting_hive').split(' ')[0]) > 0
            ? account.get('reward_vesting_hive').replace('HIVE', 'HP')
            : null;

    const rewards = [];
    if (reward_hive) rewards.push(reward_hive);
    if (reward_hbd) rewards.push(reward_hbd);
    if (reward_hp) rewards.push(reward_hp);

    let rewards_str;
    switch (rewards.length) {
        case 3:
            rewards_str = `${rewards[0]}, ${rewards[1]} and ${rewards[2]}`;
            break;
        case 2:
            rewards_str = `${rewards[0]} and ${rewards[1]}`;
            break;
        case 1:
            rewards_str = `${rewards[0]}`;
            break;
        default:
            rewards_str = nothingToClaim;
    }
    return rewards_str;
};

class ClaimBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            claimed: false,
            empty: true,
            claimInProgress: false,
            rewards_str: props.account
                ? getRewardsString(props.account)
                : 'Loading...',
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.account !== prevProps.account) {
            const rewards_str = this.props.account
                ? getRewardsString(this.props.account)
                : 'Loading...';
            this.setState({
                rewards_str,
                empty: rewards_str == nothingToClaim,
            });
        }
    }

    claimRewardsSuccess = () => {
        this.setState({
            claimInProgress: false,
            claimed: true,
        });
    };

    handleClaimRewards = account => {
        this.setState({
            claimInProgress: true,
        }); // disable the claim button
        this.props.claimRewards(account, this.claimRewardsSuccess);
    };

    render() {
        const { account } = this.props;
        const { rewards_str } = this.state;
        if (!account) return null;
        if (this.state.empty) return null;

        if (this.state.claimed) {
            return (
                <div className="UserWallet__claimbox">
                    <strong>Claim successful.</strong>
                </div>
            );
        }

        return (
            <div className="UserWallet__claimbox">
                <strong>Unclaimed rewards: {rewards_str}</strong>
                <button
                    disabled={this.state.claimInProgress}
                    className="button"
                    onClick={e => {
                        e.preventDefault();
                        this.handleClaimRewards(account);
                    }}
                >
                    Redeem
                </button>
            </div>
        );
    }
}

const mapStateToProps = (state, ownProps) => {
    const accountName = ownProps.accountName;
    const currentUser = state.user.get('current');
    const account = state.global.getIn(['accounts', accountName]);
    const isOwnAccount =
        state.user.getIn(['current', 'username'], '') == accountName;
    return {
        account,
        currentUser,
        isOwnAccount,
    };
};

const mapDispatchToProps = dispatch => {
    return {
        claimRewards: (account, successCB) => {
            const username = account.get('name');
            const successCallback = () => {
                // TODO: do something here...
                successCB();
            };
            const operation = {
                account: username,
                reward_hive: account.get('reward_hive_balance'),
                reward_hbd: account.get('reward_hbd_balance'),
                reward_vests: account.get('reward_vesting_balance'),
            };

            dispatch(
                transactionActions.broadcastOperation({
                    type: 'claim_reward_balance',
                    operation,
                    successCallback,
                })
            );
        },
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(ClaimBox);
