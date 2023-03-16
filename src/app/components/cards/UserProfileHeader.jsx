/* eslint react/prop-types: 0 */
import React from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import Icon from 'app/components/elements/Icon';
import Follow from 'app/components/elements/Follow';
import Tooltip from 'app/components/elements/Tooltip';
import DateJoinWrapper from 'app/components/elements/DateJoinWrapper';
import tt from 'counterpart';
import Userpic from 'app/components/elements/Userpic';
import AffiliationMap from 'app/utils/AffiliationMap';
import { proxifyImageUrl } from 'app/utils/ProxifyUrl';
import SanitizedLink from 'app/components/elements/SanitizedLink';
import { numberWithCommas } from 'app/utils/StateFunctions';
import TimeAgoWrapper from 'app/components/elements/TimeAgoWrapper';
import DropdownMenu from 'app/components/elements/DropdownMenu';

class UserProfileHeader extends React.Component {
    render() {
        const {
            current_user, accountname, profile, walletUrl, section, twitterUsername,
        } = this.props;
        const {
            name, location, about, website, cover_image
        } = profile
            ? profile.getIn(['metadata', 'profile']).toJS()
            : {};
        const website_label = website ? website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : null;
        const isMyAccount = current_user === accountname;

        let cover_image_style = {};
        if (cover_image) {
            cover_image_style = {
                backgroundImage: 'url(' + proxifyImageUrl(cover_image, '2048x512') + ')',
            };
        }

        const _lists = profile.get('blacklists').toJS();
        const blacklists = _lists.length > 0 && (
            <DropdownMenu
                title="Blacklisted on:"
                className="UserProfile__blacklists"
                items={_lists.map((list) => {
                    return { value: list };
                })}
                el="div"
            >
                <span className="account_warn">
                    (
                    {_lists.length}
                    )
                </span>
            </DropdownMenu>
        );

        const hideHivebuzzLevelBadge = () => {
            const badge = document.getElementById('hivebuzz-level-badge');
            if (badge) {
                badge.style.display = 'none';
            }
        };

        const _url = (tab) => `/@${accountname}${tab == 'blog' ? '' : '/' + tab}`;

        let top_active = section;
        if (['posts', 'comments', 'payout'].includes(section)) {
            top_active = 'posts';
        }

        const _tablink = (tab, label) => {
            const cls = tab === top_active ? 'active' : null;
            return (
                <Link to={_url(tab)} className={cls}>
                    {label}
                </Link>
            );
        };

        const top_menu = (
            <div className="row UserProfile__top-menu">
                <div className="columns small-9 medium-12 medium-expand">
                    <ul className="menu" style={{ flexWrap: 'wrap' }}>
                        <li>{_tablink('blog', tt('g.blog'))}</li>
                        <li>{_tablink('posts', tt('g.posts'))}</li>
                        <li>{_tablink('replies', tt('g.replies'))}</li>
                        <li>{_tablink('communities', tt('g.social'))}</li>
                        <li>{_tablink('notifications', tt('g.notifications'))}</li>
                        {/*
                        <li>{_tablink('comments', tt('g.comments'))}</li>
                        <li>{_tablink('payout', tt('voting_jsx.payout'))}</li>
                        */}
                    </ul>
                </div>
                <div className="columns shrink">
                    <ul className="menu" style={{ flexWrap: 'wrap' }}>
                        <li>
                            <a href={`${walletUrl}/@${accountname}`} target="_blank" rel="noopener noreferrer">
                                Wallet
                            </a>
                        </li>
                        {isMyAccount && <li>{_tablink('settings', tt('g.settings'))}</li>}
                    </ul>
                </div>
            </div>
        );

        return (
            <>
                <div className="UserProfile__banner row expanded">
                    <div className="column" style={cover_image_style}>
                        <div style={{ position: 'relative' }}>
                            <div className="UserProfile__buttons hide-for-small-only">
                                <Follow follower={current_user} following={accountname} />
                            </div>
                        </div>
                        <h1>
                            <div className="UserProfile__Userpic">
                                <Userpic account={accountname} hideIfDefault />
                            </div>
                            {name || accountname}
                            {' '}
                            <Tooltip
                                t={tt('user_profile.this_is_users_reputations_score_it_is_based_on_history_of_votes', {
                                    name: accountname,
                                })}
                            >
                                <span className="UserProfile__rep">
                                    (
                                    {Math.floor(profile.get('reputation'))}
                                    )
                                </span>
                            </Tooltip>
                            <Tooltip
                                t={tt('user_profile.hivebuzz_level_badge', {
                                    name: accountname,
                                })}
                            >
                                <a href={`https://hivebuzz.me/@${accountname}`} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={`https://hivebuzz.me/api/level/${accountname}?dead`}
                                        alt="Hivebuzz level badge"
                                        className="UserProfile__badge_image_hivebuzzlevel"
                                        id="hivebuzz-level-badge"
                                        onError={hideHivebuzzLevelBadge}
                                    />
                                </a>
                            </Tooltip>
                            {twitterUsername && (
                                <Tooltip
                                    t={tt('user_profile.twitter_badge')}
                                >
                                    <a href={`https://twitter.com/${twitterUsername}`} target="_blank" rel="noopener noreferrer">
                                        <Icon name="twitter" className="UserProfile__badge_image_twitter" />
                                    </a>
                                </Tooltip>
                            )}
                            {blacklists}
                            {AffiliationMap[accountname] ? (
                                <span className="affiliation">{tt('g.affiliation_' + AffiliationMap[accountname])}</span>
                            ) : null}
                        </h1>

                        <div>
                            {about && <p className="UserProfile__bio">{about}</p>}
                            <div className="UserProfile__stats">
                                <span>
                                    <Link to={`/@${accountname}/followers`}>
                                        {tt('user_profile.follower_count', {
                                            count: profile.getIn(['stats', 'followers'], 0),
                                        })}
                                    </Link>
                                </span>
                                <span>
                                    <Link to={`/@${accountname}`}>
                                        {tt('user_profile.post_count', {
                                            count: profile.get('post_count', 0),
                                        })}
                                    </Link>
                                </span>
                                <span>
                                    <Link to={`/@${accountname}/followed`}>
                                        {tt('user_profile.followed_count', {
                                            count: profile.getIn(['stats', 'following'], 0),
                                        })}
                                    </Link>
                                </span>
                                <span>
                                    {numberWithCommas(profile.getIn(['stats', 'sp'], 0))}
                                    {' '}
                                    HP
                                </span>
                                {profile.getIn(['stats', 'rank'], 0) > 0 && (
                                    <span>
                                        #
                                        {numberWithCommas(profile.getIn(['stats', 'rank']))}
                                    </span>
                                )}

                                <span>
                                    <br />
                                    <Link to={`/@${accountname}/lists/blacklisted`}>Blacklisted Users</Link>
                                </span>

                                <span>
                                    <Link to={`/@${accountname}/lists/muted`}>Muted Users</Link>
                                </span>

                                <span>
                                    <Link to={`/@${accountname}/lists/followed_blacklists`}>Followed Blacklists</Link>
                                </span>

                                <span>
                                    <Link to={`/@${accountname}/lists/followed_muted_lists`}>Followed Muted Lists</Link>
                                </span>
                            </div>

                            <p className="UserProfile__info">
                                {location && (
                                    <span>
                                        <Icon name="location" />
                                        {' '}
                                        {location}
                                    </span>
                                )}
                                {website && (
                                    <span>
                                        <Icon name="link" />
                                        {' '}
                                        <SanitizedLink url={website} text={website_label} />
                                    </span>
                                )}
                                <Icon name="calendar" />
                                {' '}
                                <DateJoinWrapper date={profile.get('created')} />
                                <Icon name="calendar" />
                                {' '}
                                Active
                                {' '}
                                <TimeAgoWrapper date={profile.get('active')} />
                            </p>
                        </div>
                        <div className="UserProfile__buttons_mobile show-for-small-only">
                            <Follow follower={current_user} following={accountname} what="blog" />
                        </div>
                    </div>
                </div>
                <div className="UserProfile__top-nav row expanded">{top_menu}</div>
            </>
        );
    }
}

export default connect((state, props) => {
    const walletUrl = state.app.get('walletUrl');
    let { section } = props.routeParams;
    const { list_type } = props.routeParams;
    if (!section) {
        if (list_type) {
            section = 'list';
        } else {
            section = 'blog';
        }
    }

    return {
        current_user: state.user.getIn(['current', 'username']),
        accountname: props.accountname,
        profile: props.profile,
        walletUrl,
        section,
    };
})(UserProfileHeader);
