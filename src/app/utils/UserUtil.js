/**
 *
 * @returns {boolean}
 */
export const isLoggedIn = () => typeof localStorage !== 'undefined' && !!localStorage.getItem('autopost2');

/**
 *
 * @returns {string}
 */
export const packLoginData = (
    username,
    password,
    memoWif,
    login_owner_pubkey,
    login_with_keychain,
    login_with_hive_signer,
    access_token,
    expires_in
) => Buffer.from(
        `${username}\t${password}\t${memoWif || ''}\t${login_owner_pubkey || ''}\t${login_with_keychain || ''}\t${
            login_with_hive_signer || ''
        }\t${access_token || ''}\t${expires_in || ''}`
    ).toString('hex');

export const calculateRcStats = (userRc) => {
    const manaRegenerationTime = 432000;
    const currentTime = parseInt((new Date().getTime() / 1000).toFixed(0));
    const stats = {
        resourceCreditsPercent: 0,
        resourceCreditsWaitTime: 0,
    };

    // Resource Credits
    const maxRcMana = parseFloat(userRc.max_rc);
    const rcManaElapsed = currentTime - parseInt(userRc.rc_manabar.last_update_time);
    let currentRcMana = parseFloat(userRc.rc_manabar.current_mana) + (rcManaElapsed * maxRcMana) / manaRegenerationTime;
    if (currentRcMana > maxRcMana) {
        currentRcMana = maxRcMana;
    }
    stats.resourceCreditsPercent = Math.round((currentRcMana * 100) / maxRcMana);
    stats.resourceCreditsWaitTime = ((100 - stats.resourceCreditsPercent) * manaRegenerationTime) / 100;

    return stats;
};

/**
 *
 * @returns {array} [username, password, memoWif, login_owner_pubkey, login_with_keychain,
 * login_with_hive_signer]
 */
export const extractLoginData = (data) => Buffer.from(data, 'hex').toString().split('\t');

export default {
    isLoggedIn,
    extractLoginData,
    calculateRcStats,
};
