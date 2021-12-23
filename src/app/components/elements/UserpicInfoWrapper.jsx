import React from 'react';
import classnames from 'classnames';
import tt from 'counterpart';
import HumanizeDuration from 'humanize-duration';
import Tooltip from 'react-tooltip-lite';
import _ from 'lodash';
import { dispatcher } from 'react-dispatch';
import { connect } from 'react-redux';
import { api } from '@hiveio/hive-js';
import { calculateRcStats } from 'app/utils/UserUtil';
import { EVENT_OPERATION_BROADCAST } from 'shared/constants';

class UserInfoToolbar extends React.Component {
    constructor(props) {
        super(props);
        this.state = { userRc: undefined };
        this.listenerActive = null;
    }

    async getUserRc(username) {
        const res = await api.callAsync('rc_api.find_rc_accounts', { accounts: [username] });
        const rcAccounts = _.get(res, 'rc_accounts');

        if (rcAccounts) {
            this.setState({ userRc: rcAccounts[0] });
        }
    }

    componentDidMount() {
        dispatcher.on(EVENT_OPERATION_BROADCAST, () => {
            console.log('EVENT_OPERATION_BROADCAST event received');
            this.getUserRc(currentUser);
        });

        const { currentUser } = this.props;
        this.getUserRc(currentUser);
    }

    componentWillUnmount() {
        dispatcher.off(EVENT_OPERATION_BROADCAST);
    }

    render() {
        const { children } = this.props;
        const { userRc } = this.state;

        if (!userRc) {
            return children;
        }

        const accountStats = calculateRcStats(userRc);
        const { resourceCreditsPercent, resourceCreditsWaitTime } = accountStats;

        let rcWaitTimeMesssage = '';
        if (resourceCreditsWaitTime > 0) {
            rcWaitTimeMesssage = tt('g.rcFullIn', { duration: HumanizeDuration(resourceCreditsWaitTime * 1000, { largest: 2 })});
        }

        return (
            <Tooltip
                content={`${tt('g.rcLevel', { rc_percent: resourceCreditsPercent})} ${rcWaitTimeMesssage}`}
                eventOff="onClick"
            >
                <div
                    className={classnames(
                        'Userpic__infowrapper',
                        'progress-circle',
                        `p${accountStats.resourceCreditsPercent}`,
                        accountStats.resourceCreditsPercent > 50 && 'over50',
                    )}
                >
                    <span>{children}</span>
                    <div className="left-half-clipper">
                        <div className="first50-bar" />
                        <div className="value-bar" />
                    </div>
                </div>
            </Tooltip>
        );
    }
}

export { UserInfoToolbar as _Header_ };

export default connect((state) => {
    const currentUser = state.user.getIn(['current', 'username']);
    return {
        currentUser,
        profile: state.userProfiles.getIn(['profiles', currentUser]),
    };
})(UserInfoToolbar);
