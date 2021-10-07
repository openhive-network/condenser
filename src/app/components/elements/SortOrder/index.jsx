import React from 'react';
import PropTypes from 'prop-types';
import tt from 'counterpart';
import { Link, browserHistory } from 'react-router';

import NativeSelect from 'app/components/elements/NativeSelect';

const SortOrder = ({
 topic, sortOrder, horizontal, pathname
}) => {
    let tag = topic || '';
    let sort = sortOrder;

    if (sort === 'feed') {
        tag = '';
        sort = 'created';
    }

    if (pathname === '/') {
        tag = '';
        sort = 'trending';
    }

    const sorts = (_tag, topMenu = false) => {
        if (_tag !== '') _tag = `/${_tag}`;

        const out = [
            {
                label: tt('main_menu.trending'),
                value: `/trending${_tag}`,
            },
            {
                label: tt('main_menu.hot'),
                value: `/hot${_tag}`,
            },
        ];

        if (!topMenu) {
            out.push({
                label: tt('g.new'),
                value: `/created${_tag}`,
            });

            /*
            out.push({
                label: tt('g.promoted'),
                value: `/promoted${tag}`,
            });
            */

            out.push({
                label: tt('g.payouts'),
                value: `/payout${_tag}`,
            });

            out.push({
                label: 'Muted',
                value: `/muted${_tag}`,
            });
        }

        return out;
    };

    // vertical dropdown
    if (!horizontal) {
        const url = (_sort, _tag = null) => (_tag ? `/${_sort}/${_tag}` : `/${_sort}`);
        return (
            <NativeSelect
                currentlySelected={url(sort, tag)}
                options={sorts(tag, false)}
                onChange={(el) => browserHistory.replace(el.value)}
            />
        );
    }

    // site header
    return (
        <ul className="nav__block-list">
            {sorts('', true).map((i) => {
                const active = i.value === `/${sort}`;
                const cls = active ? 'nav__block-list-item--active' : '';
                return (
                    <li key={i.value} className={`nav__block-list-item ${cls}`}>
                        <Link to={i.value}>{i.label}</Link>
                    </li>
                );
            })}
        </ul>
    );
};

SortOrder.propTypes = {
    topic: PropTypes.string,
    sortOrder: PropTypes.string,
    horizontal: PropTypes.bool,
    pathname: PropTypes.string,
};

SortOrder.defaultProps = {
    horizontal: false,
    topic: '',
    sortOrder: '',
    pathname: '',
};

export default SortOrder;
