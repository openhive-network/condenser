import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'react-tooltip-lite';
import { connect } from 'react-redux';
import { imageProxy } from 'app/utils/ProxifyUrl';
import tt from "counterpart";

export const SIZE_SMALL = 'small';
export const SIZE_MED = 'medium';
export const SIZE_LARGE = 'large';

const sizeList = [SIZE_SMALL, SIZE_MED, SIZE_LARGE];

class Userpic extends Component {
    render() {
        if (this.props.hide) return null;

        const { account, size, punkId } = this.props;

        const url = `${imageProxy()}u/${account}/avatar${size}`;
        const style = { backgroundImage: `url(${url})` };
        return (
            <>
                <div className="Userpic" style={style} />
                {!!punkId && (
                    <Tooltip
                        content={tt('g.isPunkVerified', { punk_id: punkId })}
                        eventOff="onClick"
                        direction="down-start"
                        background="#ededed"
                        color="#000000"
                    >
                        <a href={`https://punks.usehive.com/punk/${punkId}`} target="_blank" rel="noopener noreferrer">
                            <img src="/images/nft-badge.svg" alt="NFT" className="Userpic__nft-badge" />
                        </a>
                    </Tooltip>
                )}
            </>
        );
    }
}

Userpic.propTypes = {
    account: PropTypes.string.isRequired,
    punkId: PropTypes.number,
};

export default connect((state, ownProps) => {
    const { account, size, hideIfDefault } = ownProps;

    let hide = false;
    if (hideIfDefault) {
        const url = state.userProfiles.getIn(['profiles', account, 'metadata', 'profile', 'profile_image'], null);
        hide = !url || !/^(https?:)\/\//.test(url);
    }

    return {
        account: account === 'steemitblog' ? 'steemitdev' : account,
        size: size && sizeList.indexOf(size) > -1 ? '/' + size : '',
        hide,
    };
})(Userpic);
