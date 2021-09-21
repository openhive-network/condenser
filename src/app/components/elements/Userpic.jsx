import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { imageProxy } from 'app/utils/ProxifyUrl';

export const SIZE_SMALL = 'small';
export const SIZE_MED = 'medium';
export const SIZE_LARGE = 'large';

const sizeList = [SIZE_SMALL, SIZE_MED, SIZE_LARGE];

class Userpic extends Component {
    render() {
        if (this.props.hide) return null;

        const { account, size, sessionId } = this.props;

        if (!sessionId) {
            return null;
        }

        const url = `${imageProxy()}u/${account}/avatar${size}?ord=${sessionId}`;
        const style = { backgroundImage: `url(${url})` };
        return <div className="Userpic" style={style} />;
    }
}

Userpic.propTypes = {
    account: PropTypes.string.isRequired,
};

export default connect((state, ownProps) => {
    const { account, size, hideIfDefault } = ownProps;

    let hide = false;
    if (hideIfDefault) {
        const url = state.userProfiles.getIn(['profiles', account, 'metadata', 'profile', 'profile_image'], null);
        hide = !url || !/^(https?:)\/\//.test(url);
    }

    const sessionId = state.user.get('sessionId');

    return {
        account: account === 'steemitblog' ? 'steemitdev' : account,
        size: size && sizeList.indexOf(size) > -1 ? '/' + size : '',
        hide,
        sessionId,
    };
})(Userpic);
