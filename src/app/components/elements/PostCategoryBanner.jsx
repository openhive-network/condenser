import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { actions as fetchDataSagaActions } from 'app/redux/FetchDataSaga';

class PostCategoryBanner extends React.Component {
    constructor(props) {
        super(props);

        const { username, subscriptions, getAccountSubscriptions } = props;

        if (username && subscriptions.length === 0) {
            getAccountSubscriptions(username);
        }
    }

    render() {
        const { subscriptions, onChange, category } = this.props;
        const onCommunitySelected = (e) => {
            const destination = e.target.value;
            onChange(destination);
        };

        return (
            <div className="PostCategoryBanner">
                <div className="postTo">
                    <small>
                        Posting to:
                        {' '}
                        <select
                            className="PostCategoryBanner--community-selector"
                            value={category || ''}
                            onChange={onCommunitySelected}
                        >
                            <option value="blog">My blog</option>
                            <optgroup label="Subscribed Community">
                                {subscriptions
                                    && subscriptions.map((entry) => {
                                        const [hive, name] = entry;
                                        return (
                                            <option value={hive} key={hive}>
                                                {name}
                                            </option>
                                        );
                                    })}
                            </optgroup>
                        </select>
                    </small>
                </div>
            </div>
        );
    }
}

PostCategoryBanner.propTypes = {
    username: PropTypes.string.isRequired,
    category: PropTypes.string,
    subscriptions: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)),
};

PostCategoryBanner.defaultProps = {
    category: 'blog',
    subscriptions: [],
};

export default connect(
    (state, ownProps) => {
        const { user, global } = state;
        const username = user.getIn(['current', 'username'], null);
        const subscriptions = global.getIn(['subscriptions', username]);

        return {
            ...ownProps,
            username,
            subscriptions: subscriptions ? subscriptions.toJS() : [],
        };
    },
    (dispatch) => ({
        getAccountSubscriptions: (username) => {
            return dispatch(fetchDataSagaActions.getSubscriptions(username));
        },
    })
)(PostCategoryBanner);
