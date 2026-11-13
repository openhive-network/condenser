/* eslint react/prop-types: 0 */
import React from 'react';
import UserListRow from 'app/components/cards/UserListRow';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import tt from 'counterpart';

class UserList extends React.Component {
    _onClickLoadMore = (e) => {
        e.preventDefault();
        this.props.onLoadMore();
    };

    render() {
        const {
            users, title, loading, hasMore, onLoadMore,
        } = this.props;

        if (!users) {
            return (
                <div className="UserList">
                    <div className="row">
                        <div className="column small-12">
                            <h3>{title}</h3>
                            Loading...
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="UserList">
                <div className="row">
                    <div className="column small-12">
                        <h3>{title}</h3>
                        <table>
                            <tbody>
                                {users.map((user) => <UserListRow user={user} key={user} />).toArray()}
                            </tbody>
                        </table>
                        {loading && (
                            <center>
                                <LoadingIndicator type="circle" />
                            </center>
                        )}
                        {!loading && hasMore && onLoadMore && (
                            <center>
                                <a href="#" onClick={this._onClickLoadMore}>
                                    <strong>{tt('notificationslist_jsx.load_more')}</strong>
                                </a>
                            </center>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}

export default UserList;
