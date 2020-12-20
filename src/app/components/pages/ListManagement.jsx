import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import UserProfileHeader from 'app/components/cards/UserProfileHeader';
import { actions as UserProfilesSagaActions } from 'app/redux/UserProfilesSaga';
import * as hive_api from '@hiveio/hive-js';
import * as transactionActions from 'app/redux/TransactionReducer';
import debounce from 'lodash.debounce';
import { Link } from 'react-router';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import tt from 'counterpart';
import { callBridge } from 'app/utils/steemApi';
import 'app/components/cards/Comment';

class ListManagement extends React.Component {
    static propTypes = {
        username: PropTypes.string,
        accountname: PropTypes.string,
        list_type: PropTypes.string,
        profile: PropTypes.object,
    };

    constructor(props) {
        super(props);
        this.state = {
            all_listed_accounts: [],
            account_filter: '',
            unmatched_accounts: [],
            validated_accounts: [],
            is_busy: false,
            start_index: 0,
            entries_per_page: 10,
            error_message: '',
            updates_are_pending: false,
            first_time_user: false,
            expand_welcome_panel: false,
            warning_message: '',
        };
        this.handle_filter_change = this.handle_filter_change.bind(this);
        this.validate_accounts_to_add = this.validate_accounts_to_add.bind(
            this
        );
        this.broadcastFollowOperation = this.broadcastFollowOperation.bind(
            this
        );
        this.handle_page_select = this.handle_page_select.bind(this);
        this.get_accounts_from_api = this.get_accounts_from_api.bind(this);
        this.is_user_following_any_lists = this.is_user_following_any_lists.bind(
            this
        );
        this.toggle_help = this.toggle_help.bind(this);
        this.dismiss_intro = this.dismiss_intro.bind(this);
        this.follow_hive_blog_lists = this.follow_hive_blog_lists.bind(this);
    }

    componentDidMount() {
        this.get_accounts_from_api();
        this.timer = setInterval(() => {
            this.get_accounts_from_api();
        }, 5000);
        this.is_user_following_any_lists();
    }

    componentWillMount() {
        const {
            profile,
            accountname,
            fetchProfile,
            username,
            list_type,
        } = this.props;
        if (!profile) fetchProfile(accountname, username);
    }

    componentWillUnmount() {
        clearInterval(this.timer);
    }

    componentDidUpdate(prevProps) {
        if (
            prevProps.accountname !== this.props.accountname ||
            prevProps.username !== this.props.username
        ) {
            if (!this.props.profile)
                fetchProfile(this.props.accountname, this.props.username);
        }

        if (prevProps.list_type !== this.props.list_type) {
            this.get_accounts_from_api();
            this.setState({ account_filter: '', start_index: 0 });
            this.searchbox.value = '';
        }
    }

    is_user_following_any_lists() {
        const { username } = this.props;
        callBridge('does_user_follow_any_lists', { observer: username })
            .then(
                async result => {
                    this.setState({ first_time_user: !result });
                },
                async error => {
                    console.log(
                        'bridge_api.does_user_follow_any_lists returned an error: ',
                        error.toString()
                    );
                }
            )
            .catch(error => {
                console.log(
                    'bridge_api.does_user_follow_any_lists returned an error: ',
                    error.toString()
                );
            });
    }

    get_accounts_from_api() {
        const { accountname, list_type } = this.props;
        let sort_type = '';
        switch (list_type) {
            case 'blacklisted':
                sort_type = 'blacklisted';
                break;
            case 'followed_blacklists':
                sort_type = 'follow_blacklist';
                break;
            case 'muted':
                sort_type = 'muted';
                break;
            case 'followed_muted_lists':
                sort_type = 'follow_muted';
                break;
            default:
                sort_type = '';
                return;
        }

        callBridge('get_follow_list', {
            observer: accountname,
            follow_type: sort_type,
        })
            .then(
                async result => {
                    if (
                        this.state.updates_are_pending &&
                        result.length != this.state.all_listed_accounts.length
                    ) {
                        //updates came through, so set pending to false
                        this.setState({
                            updates_are_pending: false,
                            warning_message: '',
                        });
                        this.multiadd = '';
                    }
                    this.setState({ all_listed_accounts: result });
                },
                async error => {
                    console.log('callBridge returned an error: ', error);
                    this.setState({ error: error.toString() });
                }
            )
            .catch(error => {
                console.log('callBridge returned an error: ', error);
                this.setState({ error: error.toString() });
            });
    }

    get_filtered_accounts() {
        let matches = [];
        let loaded_accounts = this.state.all_listed_accounts;
        if (!loaded_accounts || loaded_accounts.length == 0) return [];
        for (var account of loaded_accounts) {
            if (account.name.includes(this.state.account_filter))
                matches.push(account);
        }
        return matches;
    }

    get_accounts_to_display() {
        let accounts = [];
        if (this.state.account_filter === '')
            accounts = this.state.all_listed_accounts;
        else accounts = this.get_filtered_accounts();

        if (!accounts || accounts.length == 0) return [];

        let result = [];
        let end_index = Math.min(
            accounts.length,
            this.state.start_index + this.state.entries_per_page
        );
        for (var i = this.state.start_index; i < end_index; i++) {
            result.push(accounts[i]);
        }

        return result;
    }

    get_list_length() {
        if (!this.state.all_listed_accounts) return 0;
        if (this.state.account_filter === '')
            return this.state.all_listed_accounts.length;
        else return this.get_filtered_accounts().length;
    }

    handle_page_select(direction) {
        let new_index = this.state.start_index;
        switch (direction) {
            case 'next':
                new_index =
                    this.state.start_index + this.state.entries_per_page;
                break;
            case 'previous':
                new_index =
                    this.state.start_index - this.state.entries_per_page;
                break;
            case 'first':
                new_index = 0;
                break;
            case 'last':
                new_index =
                    (Math.ceil(
                        this.get_list_length() / this.state.entries_per_page
                    ) -
                        1) *
                    this.state.entries_per_page;
                break;
            default:
                new_index = 0;
                break;
        }

        if (new_index > this.get_list_length()) return;
        else if (new_index < 0) new_index = 0;

        this.setState({ start_index: new_index });
    }

    validate_accounts_to_add = debounce(text => {
        if (text === '') {
            this.setState({ unmatched_accounts: [], validated_accounts: [] });
        }
        text = text.replace(/\s+/g, '');
        this.setState({ unmatched_accounts: [] });
        let accounts = [];
        let validated_accounts = [];
        let all_users = text.split(',');
        if (this.state.error_message !== '')
            this.setState({ error_message: '' });
        if (all_users.length > 100)
            this.setState({
                warning_message:
                    'You are adding a large number of accounts. Numerous brodcast operations will be required.',
            });
        else this.setState({ warning_message: '' });

        let names_only = this.state.all_listed_accounts.map(item => {
            return item.name;
        });

        for (var user of all_users) {
            if (user !== '') accounts.push(user);
        }

        hive_api.api.getAccounts(accounts, (error, result) => {
            let bad_accounts = [];
            let result_string = JSON.stringify(result);
            for (var check_user of all_users) {
                if (check_user === '') continue;
                if (names_only.includes(check_user)) {
                    bad_accounts.push(check_user);
                    continue;
                }
                if (!result_string.includes(check_user))
                    bad_accounts.push(check_user);
                else validated_accounts.push(check_user);

                if (error) {
                    console.log(
                        'hiveio/hive-js returned an error when fetching accounts: ',
                        error
                    );
                }
            }

            this.setState({
                validated_accounts: validated_accounts,
                unmatched_accounts: bad_accounts,
            });
        });
    }, 300);

    toggle_help() {
        let expand_welcome_panel = this.state.expand_welcome_panel;
        this.setState({ expand_welcome_panel: !expand_welcome_panel });
    }

    dismiss_intro() {
        //Subscribes them to blacklist and mute list of the hive.blog account
        this.setState({ expand_welcome_panel: false, first_time_user: false });
        this.handle_reset_list(true);
    }

    broadcastFollowOperation() {
        if (this.state.is_busy) {
            console.log(tt('list_management_jsx.busy'));
            return;
        }
        let what = '';
        switch (this.props.list_type) {
            case 'blacklisted':
                what = 'blacklist';
                break;
            case 'followed_blacklists':
                what = 'follow_blacklist';
                break;
            case 'muted':
                what = 'ignore';
                break;
            case 'followed_muted_lists':
                what = 'follow_muted';
                break;
            default:
                return;
        }

        let follower = this.props.username;
        let following = this.state.validated_accounts;

        let followings = [];
        if (following.length > 100) {
            let i = 0;
            while (following.length > 0) {
                let new_following = following.splice(0, 100);
                followings.push(new_following);
            }
        } else {
            followings.push(following);
        }

        this.setState({ is_busy: true });
        for (var following_list of followings) {
            this.props.updateList(follower, following_list, what, () => {});
        }
        this.setState({
            is_busy: false,
            validated_accounts: [],
            unmatched_accounts: [],
            updates_are_pending: true,
        });
        this.multiadd.value = '';
    }

    generate_table_rows() {
        let show_button =
            this.props.username === this.props.accountname ? 'inline' : 'none';
        let listed_accounts = this.get_accounts_to_display();
        let items = [];
        let button_text = '';
        let include_blacklist_description = false;
        let include_mute_list_description = false;
        switch (this.props.list_type) {
            case 'blacklisted':
                button_text = tt('list_management_jsx.button_unblacklist');
                break;
            case 'muted':
                button_text = tt('list_management_jsx.button_unmute');
                break;
            case 'followed_blacklists':
                button_text = tt(
                    'list_management_jsx.button_unfollow_blacklist'
                );
                include_blacklist_description = true;
                break;
            case 'followed_muted_lists':
                button_text = tt(
                    'list_management_jsx.button_unfollow_muted_list'
                );
                include_mute_list_description = true;
                break;
            default:
                button_text = '???';
                break;
        }
        if (this.state.is_busy)
            button_text = tt('list_management_jsx.button_busy');

        if (listed_accounts.length == 0) {
            let item = (
                <tr key={'empty_tr'}>
                    <td colSpan="2" style={{ width: '75%' }}>
                        <center>
                            <b>
                                {this.state.account_filter === ''
                                    ? tt('list_management_jsx.empty_list')
                                    : tt(
                                          'list_management_jsx.no_results_found'
                                      )}
                            </b>
                        </center>
                    </td>
                </tr>
            );
            items.push(item);
            return items;
        }

        for (var account of listed_accounts) {
            let item = (
                <tr key={account.name + 'tr'}>
                    <td style={{ width: '75%', whiteSpace: 'nowrap' }}>
                        <Link to={'/@' + account.name}>
                            <strong>{account.name}</strong>
                        </Link>
                        {include_blacklist_description && (
                            <div style={{ display: 'inline' }}>
                                &nbsp;&nbsp;{account.blacklist_description ==
                                null
                                    ? ''
                                    : account.blacklist_description}
                            </div>
                        )}
                        {include_mute_list_description && (
                            <div style={{ display: 'inline' }}>
                                &nbsp;&nbsp;{account.mute_list_description ==
                                null
                                    ? ''
                                    : account.mute_list_description}
                            </div>
                        )}
                    </td>
                    <td>
                        <span
                            style={{
                                display: show_button,
                                whiteSpace: 'nowrap',
                            }}
                            className="button slim hollow secondary"
                            onClick={this.handle_unlist.bind(
                                this,
                                account.name
                            )}
                        >
                            {button_text}
                        </span>
                    </td>
                </tr>
            );
            items.push(item);
        }

        return items;
    }

    handle_filter_change(event) {
        this.setState({ account_filter: event.target.value, start_index: 0 });
    }

    handle_reset_list(reset_all) {
        if (this.state.is_busy) {
            console.log(tt('list_management_jsx.busy'));
            return;
        }

        let what = '';
        switch (this.props.list_type) {
            case 'blacklisted':
                what = 'reset_blacklist';
                break;
            case 'followed_blacklists':
                what = 'reset_follow_blacklist';
                break;
            case 'muted':
                what = 'reset_mute_list';
                break;
            case 'followed_muted_lists':
                what = 'reset_follow_muted_list';
                break;
            default:
                return;
        }

        if (reset_all) what = 'reset_all_lists';

        let follower = this.props.username;
        let following = 'all'; //there is an 'all' account, but it appears unused so i'm stealing their identity for this
        this.setState({ is_busy: true });
        this.props.updateList(follower, following, what, () => {
            setTimeout(() => {
                this.follow_hive_blog_lists();
            }, 5000);
        });
    }

    follow_hive_blog_lists() {
        let follower = this.props.username;
        let following = 'hive.blog';
        let what = 'follow_muted';
        this.props.updateList(follower, following, what, () => {
            setTimeout(() => {
                //[JES] Uncomment after hivemind follow bug gets fixed
                //let what = 'follow_blacklist';
                //this.props.updateList(follower, following, what, () => {});
                this.setState({ is_busy: false, updates_are_pending: false });
                //this.get_accounts_from_api();
            }, 1000);
        });
    }

    handle_unlist(account) {
        if (this.state.is_busy) {
            console.log(tt('list_management_jsx.busy'));
            return;
        }
        let what = '';
        switch (this.props.list_type) {
            case 'blacklisted':
                what = 'unblacklist';
                break;
            case 'followed_blacklists':
                what = 'unfollow_blacklist';
                break;
            case 'muted':
                what = '';
                break;
            case 'followed_muted_lists':
                what = 'unfollow_muted';
                break;
            default:
                return;
        }

        let follower = this.props.username;
        let following = account;
        this.setState({ is_busy: true });
        this.props.updateList(follower, following, what, () => {
            this.setState({ is_busy: false, updates_are_pending: true });
            this.get_accounts_from_api();
        });
    }

    render() {
        if (!this.props.profile)
            return (
                <center>
                    <LoadingIndicator type="circle" />
                </center>
            );

        let blacklist_description = this.props.profile
            .get('metadata')
            .get('profile')
            .get('blacklist_description');
        if (!blacklist_description)
            blacklist_description =
                "User hasn't added a description to their blacklist yet";
        let mute_list_description = this.props.profile
            .get('metadata')
            .get('profile')
            .get('muted_list_description');
        if (!mute_list_description)
            mute_list_description =
                "User hasn't added a description to their mute list yet";

        let list_rows = this.generate_table_rows();
        let list_length = this.get_list_length();

        let viewing_own_page = this.props.username === this.props.accountname;

        let header_text = '',
            add_to_text = '',
            button_text = '',
            description_text = '',
            reset_button_text = '';
        let reset_all_button_text = tt('list_management_jsx.reset_all_lists');
        switch (this.props.list_type) {
            case 'blacklisted':
                header_text =
                    tt('list_management_jsx.blacklisted_header') +
                    this.props.accountname;
                add_to_text = tt('list_management_jsx.add_to_blacklist');
                button_text = tt('list_management_jsx.button_blacklist');
                description_text = 'List Description: ';
                reset_button_text = tt('list_management_jsx.reset_blacklist');
                break;
            case 'muted':
                header_text =
                    tt('list_management_jsx.muted_header') +
                    this.props.accountname;
                add_to_text = tt('list_management_jsx.add_to_muted_list');
                button_text = tt('list_management_jsx.button_mute');
                description_text = 'List Description: ';
                reset_button_text = tt('list_management_jsx.reset_muted_list');
                break;
            case 'followed_blacklists':
                header_text = tt(
                    'list_management_jsx.followed_blacklists_header'
                );
                add_to_text = tt('list_management_jsx.follow_blacklists');
                button_text = tt(
                    'list_management_jsx.button_follow_blacklists'
                );
                reset_button_text = tt(
                    'list_management_jsx.reset_followed_blacklists'
                );
                break;
            case 'followed_muted_lists':
                header_text = tt(
                    'list_management_jsx.followed_muted_lists_header'
                );
                add_to_text = tt('list_management_jsx.follow_muted_lists');
                button_text = tt(
                    'list_management_jsx.button_follow_muted_lists'
                );
                reset_button_text = tt(
                    'list_management_jsx.reset_followed_muted_list'
                );
                break;
        }

        if (this.state.is_busy)
            button_text = tt('list_management_jsx.button_busy');

        let current_page_number =
            Math.floor(this.state.start_index / this.state.entries_per_page) +
            1;
        let total_pages = Math.max(
            Math.ceil(list_length / this.state.entries_per_page),
            1
        );

        return (
            <div>
                <div className="UserProfile">
                    <UserProfileHeader
                        current_user={this.props.username}
                        accountname={this.props.accountname}
                        profile={this.props.profile}
                    />
                </div>
                <p />

                <center>
                    <span onClick={this.toggle_help}>
                        {' '}
                        <h5>
                            <u>{tt('list_management_jsx.what_is_this')}</u>{' '}
                            {!this.state.first_time_user &&
                                !this.state.expand_welcome_panel}
                        </h5>
                    </span>
                </center>

                {((this.state.first_time_user && viewing_own_page) ||
                    this.state.expand_welcome_panel) && (
                    <div>
                        <center>
                            <table style={{ width: '35%', border: 2 }}>
                                <thead />

                                <tbody>
                                    <tr>
                                        <td>
                                            <center>
                                                {this.state.first_time_user &&
                                                    viewing_own_page && (
                                                        <h5>
                                                            {tt(
                                                                'list_management_jsx.welcome_header'
                                                            )}
                                                        </h5>
                                                    )}
                                            </center>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td>
                                            <center>
                                                {tt(
                                                    'list_management_jsx.info1'
                                                )}{' '}
                                                {tt(
                                                    'list_management_jsx.info2'
                                                )}{' '}
                                                <Link
                                                    to={
                                                        '/@' +
                                                        this.props.username +
                                                        '/settings'
                                                    }
                                                >
                                                    {tt(
                                                        'list_management_jsx.info3'
                                                    )}
                                                </Link>
                                                {tt(
                                                    'list_management_jsx.info4'
                                                )}{' '}
                                                {tt(
                                                    'list_management_jsx.info5'
                                                )}
                                                <p />
                                                {tt(
                                                    'list_management_jsx.info6'
                                                )}
                                            </center>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            {viewing_own_page &&
                                this.state.first_time_user && (
                                    <div>
                                        {tt('list_management_jsx.info7')} <br />
                                        <span
                                            className="button slim hollow secondary"
                                            onClick={e => {
                                                this.dismiss_intro();
                                            }}
                                        >
                                            {tt(
                                                'list_management_jsx.acknowledge'
                                            )}
                                        </span>
                                    </div>
                                )}
                        </center>
                    </div>
                )}
                <p />

                <div>
                    <center>
                        <h5>
                            <b>{header_text}</b>
                        </h5>
                        {(this.props.list_type === 'blacklisted' ||
                            this.props.list_type === 'muted') && (
                            <h6>
                                {tt(
                                    'list_management_jsx.list_description_placement'
                                )}{' '}
                                {this.props.list_type === 'blacklisted'
                                    ? blacklist_description
                                    : mute_list_description}
                            </h6>
                        )}

                        <p />

                        <table style={{ width: '35%' }}>
                            <thead />

                            <tbody>{list_rows}</tbody>
                        </table>

                        {list_length > this.state.entries_per_page && (
                            <span
                                className="button slim hollow secondary"
                                value="first"
                                onClick={e => {
                                    this.handle_page_select('first');
                                }}
                            >
                                {tt('list_management_jsx.first')}
                            </span>
                        )}
                        {list_length > this.state.entries_per_page && (
                            <span
                                className="button slim hollow secondary"
                                value="prev"
                                onClick={e => {
                                    this.handle_page_select('previous');
                                }}
                            >
                                {tt('list_management_jsx.previous')}
                            </span>
                        )}
                        {list_length > this.state.entries_per_page && (
                            <span
                                className="button slim hollow secondary"
                                value="next"
                                onClick={e => {
                                    this.handle_page_select('next');
                                }}
                            >
                                {tt('list_management_jsx.next')}
                            </span>
                        )}
                        {list_length > this.state.entries_per_page && (
                            <span
                                className="button slim hollow secondary"
                                value="last"
                                onClick={e => {
                                    this.handle_page_select('last');
                                }}
                            >
                                {tt('list_management_jsx.last')}
                            </span>
                        )}
                        {list_length > 0 && (
                            <div>
                                {tt('list_management_jsx.users_on_list', {
                                    user_count: list_length,
                                })}
                            </div>
                        )}
                        {list_length > this.state.entries_per_page && (
                            <div>
                                {tt('list_management_jsx.page_count', {
                                    current: current_page_number,
                                    total: total_pages,
                                })}
                            </div>
                        )}

                        {this.props.username === this.props.accountname && (
                            <div>
                                <p />
                                <p />
                                <h5>
                                    <b>
                                        {tt(
                                            'list_management_jsx.add_users_to_list'
                                        )}
                                    </b>
                                </h5>
                                <h6>
                                    {tt('list_management_jsx.multi_add_notes')}
                                </h6>
                                <center>
                                    <table style={{ width: '35%' }}>
                                        <thead />
                                        <tbody>
                                            <tr>
                                                <td
                                                    style={{
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <center>
                                                        <input
                                                            style={{
                                                                width: '60%',
                                                                whiteSpace:
                                                                    'nowrap',
                                                            }}
                                                            type="text"
                                                            name="multiadd"
                                                            ref={el =>
                                                                (this.multiadd = el)
                                                            }
                                                            onChange={e => {
                                                                this.validate_accounts_to_add(
                                                                    e.target
                                                                        .value
                                                                );
                                                            }}
                                                        />
                                                    </center>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td
                                                    style={{
                                                        width: '60%',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <center>
                                                        {this.state
                                                            .validated_accounts
                                                            .length > 0 && (
                                                            <span
                                                                className="button slim hollow secondary"
                                                                onClick={
                                                                    this
                                                                        .broadcastFollowOperation
                                                                }
                                                            >
                                                                {button_text}
                                                            </span>
                                                        )}
                                                    </center>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {this.state.unmatched_accounts.length >
                                        0 && (
                                        <div style={{ color: 'red' }}>
                                            <b>
                                                {tt(
                                                    'list_management_jsx.unknown_accounts'
                                                )}{' '}
                                                {this.state.unmatched_accounts.join(
                                                    ', '
                                                )}
                                            </b>
                                        </div>
                                    )}
                                </center>
                            </div>
                        )}

                        <h5>
                            <b>Search This List</b>
                        </h5>
                        <table style={{ width: '35%' }}>
                            <thead />
                            <tbody>
                                <tr>
                                    <td
                                        colSpan="2"
                                        style={{ textAlign: 'right' }}
                                    >
                                        <center>
                                            <input
                                                type="text"
                                                ref={el =>
                                                    (this.searchbox = el)
                                                }
                                                style={{ width: '350px' }}
                                                onChange={
                                                    this.handle_filter_change
                                                }
                                            />
                                        </center>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <p />
                        <h5>
                            <b>{tt('list_management_jsx.reset_header')}</b>
                        </h5>
                        <span
                            className="button slim hollow secondary"
                            onClick={this.handle_reset_list.bind(this, false)}
                        >
                            {this.state.is_busy
                                ? tt('list_management_jsx.button_busy')
                                : reset_button_text}
                        </span>
                        <span
                            className="button slim hollow secondary"
                            // onClick={this.handle_reset_list.bind(this, true)}
                            disabled="true"
                        >
                            {this.state.is_busy
                                ? tt('list_management_jsx.button_busy')
                                : reset_all_button_text}
                        </span>

                        {this.state.updates_are_pending && (
                            <div style={{ color: 'red' }}>
                                <b>
                                    {tt(
                                        'list_management_jsx.updates_are_pending'
                                    )}
                                </b>
                            </div>
                        )}
                        {this.state.error_message !== '' && (
                            <div style={{ color: 'red' }}>
                                <b>{this.state.error_message}</b>
                            </div>
                        )}
                        {this.state.warning_message !== '' && (
                            <div style={{ color: 'orange' }}>
                                <b>{this.state.warning_message}</b>
                            </div>
                        )}
                    </center>
                </div>
            </div>
        );
    }
}

module.exports = {
    path: '@:accountname/lists/:list_type',
    component: connect(
        (state, ownProps) => {
            const username = state.user.getIn(['current', 'username']);
            const list_type = ownProps.routeParams.list_type;
            const accountname = ownProps.routeParams.accountname.toLowerCase();
            const profile = state.userProfiles.getIn(['profiles', accountname]);
            return {
                username,
                list_type,
                accountname,
                profile,
            };
        },
        dispatch => ({
            fetchProfile: (account, observer) =>
                dispatch(
                    UserProfilesSagaActions.fetchProfile({ account, observer })
                ),
            updateList: (follower, following, type, callback) => {
                const what = type ? [type] : [];
                const json = ['follow', { follower, following, what }];
                console.log('about to dispatch broadcastOperation!');
                dispatch(
                    transactionActions.broadcastOperation({
                        type: 'custom_json',
                        operation: {
                            id: 'follow',
                            required_posting_auths: [follower],
                            json: JSON.stringify(json),
                        },
                        successCallback: callback,
                        errorCallback: callback,
                    })
                );
            },
            fetchListedAccounts: (observer, list_type) => {
                dispatch(
                    UserProfilesSagaActions.fetchLists({ observer, list_type })
                );
            },
            //TODO: add sagas for fetching various listed users
        })
    )(ListManagement),
};
