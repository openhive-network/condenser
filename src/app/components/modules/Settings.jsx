import React from 'react';
import { connect } from 'react-redux';
import tt from 'counterpart';
import * as userActions from 'app/redux/UserReducer';
import * as transactionActions from 'app/redux/TransactionReducer';
import * as appActions from 'app/redux/AppReducer';
import o2j from 'shared/clash/object2json';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import reactForm from 'app/utils/ReactForm';
import Dropzone from 'react-dropzone';
import MuteList from 'app/components/elements/MuteList';
import { isLoggedIn } from 'app/utils/UserUtil';
import * as api from '@hiveio/hive-js';
import Cookies from 'universal-cookie';

//TODO?: Maybe move this to a config file somewhere?
const KNOWN_API_NODES = ['api.hive.blog', 'rpc.ausbit.dev', 'anyx.io', 'api.ha.deathwing.me', 'api.deathwing.me'];

class Settings extends React.Component {
    constructor(props) {
        super(props);
        const cookies = new Cookies();
        this.state = {
            errorMessage: '',
            successMessage: '',
            progress: {},
            expand_advanced: false,
            cookies,
            endpoint_error_message: '',
        };
        this.initForm(props);
        this.onNsfwPrefChange = this.onNsfwPrefChange.bind(this);
        this.resetEndpointOptions = this.resetEndpointOptions.bind(this);
    }

    UNSAFE_componentWillMount() {
        const { account } = this.props;
        if (account) {
            this.initForm(this.props);
        }
    }

    componentDidUpdate(prevProps) {
        const { account } = this.props;
        if (prevProps.account !== account && account) {
            this.initForm(this.props);
        }
    }

    componentDidMount() {
        //Create the cookies if they don't already exist
        let endpoints = [];
        if (!this.state.cookies.get('user_preferred_api_endpoint')) {
            const default_endpoint = 'https://api.hive.blog';
            this.state.cookies.set('user_preferred_api_endpoint', default_endpoint, { path: '/', maxAge: 1000000000 });
        }

        if (!this.state.cookies.get('user_api_endpoints')) {
            endpoints = api.config.get('alternative_api_endpoints');
            for (const node of KNOWN_API_NODES) endpoints.push('https://' + node);
            this.state.cookies.set('user_api_endpoints', endpoints, { path: '/', maxAge: 1000000000 });
        } else endpoints = this.state.cookies.get('user_api_endpoints');

        const preferred = this.getPreferredApiEndpoint();
        api.api.setOptions({ url: preferred });
        this.synchronizeLists();
    }

    initForm(props) {
        reactForm({
            instance: this,
            name: 'accountSettings',
            fields: [
                'profile_image',
                'cover_image',
                'name',
                'about',
                'location',
                'website',
                'witness_owner',
                'witness_description',
                'account_is_witness',
                'blacklist_description',
                'muted_list_description',
            ],
            initialValues: props.profile,
            validation: (values) => {
                return {
                    profile_image:
                        values.profile_image && !/^https?:\/\//.test(values.profile_image)
                            ? tt('settings_jsx.invalid_url')
                            : null,
                    cover_image:
                        values.cover_image && !/^https?:\/\//.test(values.cover_image)
                            ? tt('settings_jsx.invalid_url')
                            : null,
                    name:
                        values.name && values.name.length > 20
                            ? tt('settings_jsx.name_is_too_long')
                            : values.name && /^\s*@/.test(values.name)
                              ? tt('settings_jsx.name_must_not_begin_with')
                              : null,
                    about: values.about && values.about.length > 160 ? tt('settings_jsx.about_is_too_long') : null,
                    location:
                        values.location && values.location.length > 30 ? tt('settings_jsx.location_is_too_long') : null,
                    website:
                        values.website && values.website.length > 100
                            ? tt('settings_jsx.website_url_is_too_long')
                            : values.website && !/^https?:\/\//.test(values.website)
                              ? tt('settings_jsx.invalid_url')
                              : null,
                    witness_owner:
                        values.witness_owner && values.witness_owner.length > 30
                            ? tt('settings_jsx.witness_owner_is_too_long')
                            : null,
                    witness_description:
                        values.witness_description && values.witness_description.length > 512
                            ? tt('settings_jsx.witness_description_is_too_long')
                            : null,
                    blacklist_description:
                        values.blacklist_description && values.blacklist_description.length > 256
                            ? 'description is too long'
                            : null,
                    muted_list_description:
                        values.muted_list_description && values.muted_list_description.length > 256
                            ? 'description is too long'
                            : null,
                };
            },
        });
        this.handleSubmitForm = this.state.accountSettings.handleSubmit((args) => this.handleSubmit(args));
    }

    onDrop = (acceptedFiles, rejectedFiles) => {
        if (!acceptedFiles.length) {
            if (rejectedFiles.length) {
                this.setState({
                    progress: { error: 'Please insert only image files.' },
                });
                console.log('onDrop Rejected files: ', rejectedFiles);
            }
            return;
        }
        const file = acceptedFiles[0];
        this.upload(file, file.name);
    };

    onOpenClick = (imageName) => {
        this.setState({
            imageInProgress: imageName,
        });
        this.dropzone.open();
    };

    upload = (file = '') => {
        const { uploadImage } = this.props;
        this.setState({
            progress: { message: tt('settings_jsx.uploading_image') + '...' },
        });
        uploadImage(file, (progress) => {
            if (progress.url) {
                this.setState({ progress: {} });
                const { url } = progress;
                const image_md = `${url}`;
                let field;
                if (this.state.imageInProgress === 'profile_image') {
                    field = this.state.profile_image;
                } else if (this.state.imageInProgress === 'cover_image') {
                    field = this.state.cover_image;
                } else {
                    return;
                }
                field.props.onChange(image_md);
            } else {
                this.setState({ progress });
            }
            setTimeout(() => {
                this.setState({ progress: {} });
            }, 4000); // clear message
        });
    };

    handleSubmit = ({ updateInitialValues }) => {
        let { metaData } = this.props;
        if (!metaData) metaData = {};
        if (!metaData.profile) metaData.profile = {};
        delete metaData.user_image; // old field... cleanup

        const {
            profile_image,
            cover_image,
            name,
            about,
            location,
            website,
            witness_owner,
            witness_description,
            blacklist_description,
            muted_list_description,
        } = this.state;

        // Update relevant fields
        metaData.profile.profile_image = profile_image.value;
        metaData.profile.cover_image = cover_image.value;
        metaData.profile.name = name.value;
        metaData.profile.about = about.value;
        metaData.profile.location = location.value;
        metaData.profile.website = website.value;
        metaData.profile.witness_owner = witness_owner.value;
        metaData.profile.witness_description = witness_description.value;
        metaData.profile.blacklist_description = blacklist_description.value;
        metaData.profile.muted_list_description = muted_list_description.value;
        metaData.profile.version = 2; // signal upgrade to posting_json_metadata

        // Remove empty keys
        if (!metaData.profile.profile_image) delete metaData.profile.profile_image;
        if (!metaData.profile.cover_image) delete metaData.profile.cover_image;
        if (!metaData.profile.name) delete metaData.profile.name;
        if (!metaData.profile.about) delete metaData.profile.about;
        if (!metaData.profile.location) delete metaData.profile.location;
        if (!metaData.profile.website) delete metaData.profile.website;
        if (!metaData.profile.witness_owner) delete metaData.profile.witness_owner;
        if (!metaData.profile.witness_description) delete metaData.profile.witness_description;
        if (!metaData.profile.blacklist_description) delete metaData.profile.blacklist_description;
        if (!metaData.profile.muted_list_description) delete metaData.profile.muted_list_description;

        const { account, updateAccount } = this.props;
        this.setState({ loading: true });
        updateAccount({
            account: account.get('name'),
            json_metadata: '',
            posting_json_metadata: JSON.stringify(metaData),
            errorCallback: (e) => {
                if (e === 'Canceled') {
                    this.setState({
                        loading: false,
                        errorMessage: '',
                    });
                } else {
                    console.log('updateAccount ERROR', e);
                    this.setState({
                        loading: false,
                        errorMessage: tt('g.server_returned_error'),
                    });
                }
            },
            successCallback: () => {
                this.setState({
                    loading: false,
                    errorMessage: '',
                    successMessage: tt('settings_jsx.saved'),
                });
                // remove successMessage after a while
                setTimeout(() => this.setState({ successMessage: '' }), 4000);
                updateInitialValues();
            },
        });
    };

    onNsfwPrefChange(e) {
        this.props.setUserPreferences({
            ...this.props.user_preferences,
            nsfwPref: e.currentTarget.value,
        });
    }

    handleDefaultBlogPayoutChange = (event) => {
        this.props.setUserPreferences({
            ...this.props.user_preferences,
            defaultBlogPayout: event.target.value,
        });
    };

    handleDefaultCommentPayoutChange = (event) => {
        this.props.setUserPreferences({
            ...this.props.user_preferences,
            defaultCommentPayout: event.target.value,
        });
    };

    handleLanguageChange = (event) => {
        const locale = event.target.value;
        const userPreferences = { ...this.props.user_preferences, locale };
        this.props.setUserPreferences(userPreferences);
    };

    handleReferralSystemChange = (event) => {
        this.props.setUserPreferences({
            ...this.props.user_preferences,
            referralSystem: event.target.value,
        });
    };

    getPreferredApiEndpoint = () => {
        let preferred_api_endpoint = 'https://api.hive.blog';
        if (this.state.cookies.get('user_preferred_api_endpoint')) preferred_api_endpoint = this.state.cookies.get('user_preferred_api_endpoint');
        return preferred_api_endpoint;
    };

    resetEndpointOptions = () => {
        this.state.cookies.set('user_preferred_api_endpoint', 'https://api.hive.blog', {
            path: '/',
            maxAge: 1000000000,
        });
        this.state.cookies.set('user_api_endpoints', [], { path: '/', maxAge: 1000000000 });
        const preferred_api_endpoint = 'https://api.hive.blog';
        const alternative_api_endpoints = api.config.get('alternative_api_endpoints');
        alternative_api_endpoints.length = 0;
        for (const node of KNOWN_API_NODES) alternative_api_endpoints.push('https://' + node);
        api.api.setOptions({ url: preferred_api_endpoint });

        const { cookies } = this.state;
        cookies.set('user_preferred_api_endpoint', preferred_api_endpoint, { path: '/', maxAge: 1000000000 });
        cookies.set('user_api_endpoints', alternative_api_endpoints, { path: '/', maxAge: 1000000000 });
        this.setState({ cookies, endpoint_error_message: '' });
    };

    synchronizeLists = () => {
        const preferred = this.getPreferredApiEndpoint();
        const alternative_api_endpoints = api.config.get('alternative_api_endpoints');
        const user_endpoints = this.state.cookies.get('user_api_endpoints');
        api.api.setOptions({ url: preferred });
        alternative_api_endpoints.length = 0;
        for (const user_endpoint of user_endpoints) alternative_api_endpoints.push(user_endpoint);
    };

    setPreferredApiEndpoint = (event) => {
        const { cookies } = this.state;
        cookies.set('user_preferred_api_endpoint', event.target.value, { path: '/', maxAge: 1000000000 });
        this.setState({ cookies, endpoint_error_message: '' }); //doing it this way to force a re-render, otherwise the option doesn't look updated even though it is
        api.api.setOptions({ url: event.target.value });
    };

    generateAPIEndpointOptions = () => {
        const user_endpoints = this.state.cookies.get('user_api_endpoints');

        if (user_endpoints === null || user_endpoints === undefined) return;

        const preferred_api_endpoint = this.getPreferredApiEndpoint();
        const entries = [];
        for (let ei = 0; ei < user_endpoints.length; ei += 1) {
            const endpoint = user_endpoints[ei];
            const entry = (
                <tr key={endpoint + 'key'}>
                    <td>{endpoint}</td>
                    <td>
                        <input
                            type="radio"
                            value={endpoint}
                            checked={endpoint === preferred_api_endpoint}
                            onChange={(e) => this.setPreferredApiEndpoint(e)}
                        />
                    </td>
                    <td style={{ fontSize: '20px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                this.removeAPIEndpoint(endpoint);
                            }}
                        >
                            {'\u2612'}
                        </button>
                    </td>
                </tr>
            );
            entries.push(entry);
        }
        return entries;
    };

    toggleShowAdvancedSettings = () => {
        // eslint-disable-next-line react/no-access-state-in-setstate
        this.setState({ expand_advanced: !this.state.expand_advanced });
    };

    addAPIEndpoint = (value) => {
        this.setState({ endpoint_error_message: '' });
        const validated = /^https?:\/\//.test(value);
        if (!validated) {
            this.setState({
                endpoint_error_message: tt('settings_jsx.error_bad_url'),
            });
            return;
        }

        const { cookies } = this.state;
        const endpoints = cookies.get('user_api_endpoints');
        if (endpoints === null || endpoints === undefined) {
            this.setState({
                endpoint_error_message: tt('settings_jsx.error_bad_cookie'),
            });
            return;
        }

        for (const endpoint of endpoints) {
            if (endpoint === value) {
                this.setState({
                    endpoint_error_message: tt('settings_jsx.error_already_exists'),
                });
                return;
            }
        }

        endpoints.push(value);
        cookies.set('user_api_endpoints', endpoints, { path: '/', maxAge: 1000000000 });
        this.setState({ cookies }, () => {
            this.synchronizeLists();
        });
    };

    removeAPIEndpoint = (value) => {
        this.setState({ endpoint_error_message: '' });
        //don't remove the active endpoint
        //don't remove it if it is the only endpoint in the list
        const active_endpoint = this.getPreferredApiEndpoint();
        if (value === active_endpoint) {
            this.setState({
                endpoint_error_message: tt('settings_jsx.error_cant_remove_active'),
            });
            return;
        }

        const { cookies } = this.state;
        const endpoints = cookies.get('user_api_endpoints');
        if (endpoints === null || endpoints === undefined) {
            this.setState({
                endpoint_error_message: tt('settings_jsx.error_bad_cookie'),
            });
            return;
        }

        if (endpoints.length == 1) {
            this.setState({
                endpoint_error_message: tt('settings_jsx.error_cant_remove_all'),
            });
            return;
        }

        const new_endpoints = [];
        for (const endpoint of endpoints) {
            if (endpoint !== value) {
                new_endpoints.push(endpoint);
            }
        }

        cookies.set('user_api_endpoints', new_endpoints, { path: '/', maxAge: 1000000000 });
        this.setState({ cookies }, () => {
            this.synchronizeLists();
        });
    };

    render() {
        const { state, props } = this;
        const {
            ignores, accountname, isOwnAccount, user_preferences,
        } = this.props;

        const { submitting, valid, touched } = this.state.accountSettings;
        const disabled = !props.isOwnAccount || state.loading || submitting || !valid || !touched;

        const {
            profile_image,
            cover_image,
            name,
            about,
            location,
            website,
            witness_owner,
            witness_description,
            progress,
            account_is_witness,
            blacklist_description,
            muted_list_description,
        } = this.state;

        const endpoint_options = this.generateAPIEndpointOptions();

        return (
            <div className="Settings">
                <div className="row">
                    {isLoggedIn()
                    && isOwnAccount && (
                        <form onSubmit={this.handleSubmitForm} className="large-12 columns">
                            <h4>{tt('settings_jsx.public_profile_settings')}</h4>
                            {progress.message && <div className="info">{progress.message}</div>}
                            {progress.error && (
                                <div className="error">
                                    {tt('reply_editor.image_upload')}
                                    {': '}
                                    {progress.error}
                                </div>
                            )}
                            <div className="form__fields row">
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.profile_image_url')}
                                        <Dropzone
                                            onDrop={this.onDrop}
                                            className="none"
                                            disableClick
                                            multiple={false}
                                            accept="image/*"
                                            ref={(node) => {
                                                this.dropzone = node;
                                            }}
                                        >
                                            <input type="url" {...profile_image.props} autoComplete="off" />
                                        </Dropzone>
                                        <a role="link" tabIndex={0} onClick={() => this.onOpenClick('profile_image')}>
                                            {tt('settings_jsx.upload_image')}
                                        </a>
                                    </label>
                                    <div className="error">
                                        {profile_image.blur && profile_image.touched && profile_image.error}
                                    </div>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.cover_image_url')}
                                        {' '}
                                        <small>(Optimal: 2048 x 512 pixels)</small>
                                        <input type="url" {...cover_image.props} autoComplete="off" />
                                        <a role="link" tabIndex={0} onClick={() => this.onOpenClick('cover_image')}>
                                            {tt('settings_jsx.upload_image')}
                                        </a>
                                    </label>
                                    <div className="error">
                                        {cover_image.blur && cover_image.touched && cover_image.error}
                                    </div>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.profile_name')}
                                        <input type="text" {...name.props} maxLength="20" autoComplete="off" />
                                    </label>
                                    <div className="error">{name.touched && name.error}</div>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.profile_about')}
                                        <input type="text" {...about.props} maxLength="160" autoComplete="off" />
                                    </label>
                                    <div className="error">{about.touched && about.error}</div>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.profile_location')}
                                        <input type="text" {...location.props} maxLength="30" autoComplete="off" />
                                    </label>
                                    <div className="error">{location.touched && location.error}</div>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.profile_website')}
                                        <input type="url" {...website.props} maxLength="100" autoComplete="off" />
                                    </label>
                                    <div className="error">{website.blur && website.touched && website.error}</div>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        Blacklist Description
                                        <input
                                            type="text"
                                            maxLength="256"
                                            autoComplete="off"
                                            {...blacklist_description.props}
                                        />
                                    </label>
                                    <div className="error">{website.blur && website.touched && website.error}</div>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        Mute List Description
                                        <input
                                            type="text"
                                            maxLength="256"
                                            autoComplete="off"
                                            {...muted_list_description.props}
                                        />
                                    </label>
                                    <div className="error">{website.blur && website.touched && website.error}</div>
                                </div>
                                {account_is_witness.value && (
                                    <div className="form__field column small-12 medium-6 large-4">
                                        <label>
                                            {tt('settings_jsx.profile_witness_description')}
                                            <input
                                                type="text"
                                                {...witness_description.props}
                                                maxLength="160"
                                                autoComplete="off"
                                            />
                                        </label>
                                        <div className="error">
                                            {witness_description.touched && witness_description.error}
                                        </div>
                                    </div>
                                )}
                                {account_is_witness.value && (
                                    <div className="form__field column small-12 medium-6 large-4">
                                        <label>
                                            {tt('settings_jsx.profile_witness_owner')}
                                            <input
                                                type="text"
                                                {...witness_owner.props}
                                                maxLength="30"
                                                autoComplete="off"
                                            />
                                        </label>
                                        <div className="error">{witness_owner.touched && witness_owner.error}</div>
                                    </div>
                                )}
                            </div>
                            {state.loading && (
                                <span>
                                    <br />
                                    <LoadingIndicator type="circle" />
                                    <br />
                                </span>
                            )}
                            {!state.loading && (
                                <input
                                    type="submit"
                                    className="button slim"
                                    value={tt('settings_jsx.update')}
                                    disabled={disabled}
                                />
                            )}
                            {' '}
                            {state.errorMessage ? (
                                <small className="error">{state.errorMessage}</small>
                            ) : state.successMessage ? (
                                <small className="success uppercase">{state.successMessage}</small>
                            ) : null}
                        </form>
                    )}
                </div>

                {isOwnAccount && (
                    <div className="row">
                        <div className="large-12 columns">
                            <br />
                            <br />
                            <h4>{tt('settings_jsx.preferences')}</h4>
                            <div className="form__fields row">
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('g.choose_language')}
                                        <select
                                            defaultValue={user_preferences.locale}
                                            onChange={this.handleLanguageChange}
                                        >
                                            <option value="en">English</option>
                                            <option value="es">Spanish Español</option>
                                            <option value="ru">Russian русский</option>
                                            <option value="fr">French français</option>
                                            <option value="it">Italian italiano</option>
                                            <option value="ko">Korean 한국어</option>
                                            <option value="ja">Japanese 日本語</option>
                                            <option value="pl">Polish</option>
                                            <option value="zh">Chinese 简体中文</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.not_safe_for_work_nsfw_content')}
                                        <select value={user_preferences.nsfwPref} onChange={this.onNsfwPrefChange}>
                                            <option value="hide">{tt('settings_jsx.always_hide')}</option>
                                            <option value="warn">{tt('settings_jsx.always_warn')}</option>
                                            <option value="show">{tt('settings_jsx.always_show')}</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.choose_default_blog_payout')}
                                        <select
                                            defaultValue={user_preferences.defaultBlogPayout || '50%'}
                                            onChange={this.handleDefaultBlogPayoutChange}
                                        >
                                            <option value="0%">{tt('reply_editor.decline_payout')}</option>
                                            <option value="50%">{tt('reply_editor.default_50_50')}</option>
                                            <option value="100%">{tt('reply_editor.power_up_100')}</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.choose_default_comment_payout')}
                                        <select
                                            defaultValue={user_preferences.defaultCommentPayout || '50%'}
                                            onChange={this.handleDefaultCommentPayoutChange}
                                        >
                                            <option value="0%">{tt('reply_editor.decline_payout')}</option>
                                            <option value="50%">{tt('reply_editor.default_50_50')}</option>
                                            <option value="100%">{tt('reply_editor.power_up_100')}</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="form__field column small-12 medium-6 large-4">
                                    <label>
                                        {tt('settings_jsx.default_beneficiaries')}
                                        <select
                                            defaultValue={user_preferences.referralSystem}
                                            onChange={this.handleReferralSystemChange}
                                        >
                                            <option value="enabled">
                                                {tt('settings_jsx.default_beneficiaries_enabled')}
                                            </option>
                                            <option value="disabled">
                                                {tt('settings_jsx.default_beneficiaries_disabled')}
                                            </option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <br />
                <div className="row">
                    <div className="large-12 columns">
                        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                        <h4 onClick={this.toggleShowAdvancedSettings}>
                            {tt('settings_jsx.advanced') + ' '}
                            {' '}
                            {this.state.expand_advanced ? '\u25BC' : '\u25B2'}
                        </h4>
                        {this.state.expand_advanced && (
                            <div>
                                <b>{tt('settings_jsx.api_endpoint_options')}</b>
                                <table style={{ width: '60%' }}>
                                    <thead />
                                    <tbody>
                                        <tr>
                                            <td style={{ width: '50%' }}>
                                                <b>{tt('settings_jsx.endpoint')}</b>
                                            </td>
                                            <td style={{ width: '25%' }}>
                                                <b>{tt('settings_jsx.preferred')}</b>
                                            </td>
                                            <td style={{ width: '25%' }}>
                                                <b>{tt('settings_jsx.remove')}</b>
                                            </td>
                                        </tr>
                                        {endpoint_options}
                                    </tbody>
                                </table>
                                <h4>
                                    <b>{tt('settings_jsx.add_api_endpoint')}</b>
                                </h4>
                                <table style={{ width: '60%' }}>
                                    <thead />
                                    <tbody>
                                        <tr>
                                            <td style={{ width: '40%' }}>
                                                <input type="text" ref={(el) => (this.new_endpoint = el)} />
                                            </td>
                                            <td
                                                style={{
                                                    width: '20%',
                                                    fontSize: '30px',
                                                }}
                                            >
                                                <button type="button" onClick={() => this.addAPIEndpoint(this.new_endpoint.value)}>
                                                    {'\u2713'}
                                                </button>
                                            </td>
                                            <td>
                                                <div className="error">{this.state.endpoint_error_message}</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                                <span className="button" onClick={this.resetEndpointOptions}>
                                    {tt('settings_jsx.reset_endpoints')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                {ignores && ignores.size > 0 && (
                    <div className="row">
                        <div className="small-12 medium-6 large-4 large-6 columns">
                            <br />
                            <h4>Muted Users</h4>
                            <MuteList account={accountname} users={ignores} />
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

function read_profile_v2(account) {
    if (!account) return {};
    const accountIsWitness = account.get('account_is_witness');

    // use new `posting_json_md` if {version: 2} is present
    let md = o2j.ifStringParseJSON(account.get('posting_json_metadata'));
    if (md && md.profile) {
        md.profile.account_is_witness = accountIsWitness;
    }
    if (md && md.profile && md.profile.version) return md;

    // otherwise, fall back to `json_metadata`
    md = o2j.ifStringParseJSON(account.get('json_metadata'));
    if (typeof md === 'string') md = o2j.ifStringParseJSON(md); // issue #1237, double-encoded
    return md;
}

export default connect(
    // mapStateToProps
    (state, ownProps) => {
        const { accountname } = ownProps.routeParams;

        const isOwnAccount = state.user.getIn(['current', 'username'], '') == accountname;
        const ignores = isOwnAccount && state.global.getIn(['follow', 'getFollowingAsync', accountname, 'ignore_result']);
        const account = state.global.getIn(['accounts', accountname]);

        const metaData = read_profile_v2(account);
        const profile = metaData && metaData.profile ? metaData.profile : {};
        const user_preferences = state.app.get('user_preferences').toJS();

        return {
            account,
            metaData,
            accountname,
            isOwnAccount,
            ignores,
            walletUrl: state.app.get('walletUrl'),
            profile,
            follow: state.global.get('follow'),
            user_preferences,
            ...ownProps,
        };
    },
    // mapDispatchToProps
    (dispatch) => ({
        changeLanguage: (language) => {
            dispatch(userActions.changeLanguage(language));
        },
        uploadImage: (file, progress) => dispatch(userActions.uploadImage({ file, progress })),
        updateAccount: ({ successCallback, errorCallback, ...operation }) => {
            const options = {
                type: 'account_update2',
                operation,
                successCallback,
                errorCallback,
            };
            dispatch(transactionActions.broadcastOperation(options));
        },
        setUserPreferences: (payload) => {
            dispatch(appActions.setUserPreferences(payload));
        },
    })
)(Settings);
