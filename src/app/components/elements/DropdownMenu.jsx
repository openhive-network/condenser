import React from 'react';
import PropTypes from 'prop-types';
import { browserHistory } from 'react-router';
import Icon from 'app/components/elements/Icon';
import { findParent } from 'app/utils/DomUtils';
import VerticalMenu from './VerticalMenu';

const propTypes = {
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    selected: PropTypes.string,
    children: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.element]),
    className: PropTypes.string,
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    href: PropTypes.string,
    el: PropTypes.string.isRequired,
};

const defaultProps = {
    selected: undefined,
    children: undefined,
    className: undefined,
    title: undefined,
    href: undefined,
};

export default class DropdownMenu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            shown: false,
            selected: props.selected,
        };
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.hide);
    }

    toggle = (e) => {
        const { shown } = this.state;
        if (shown) this.hide(e);
        else this.show(e);
    };

    show = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ shown: true });
        document.addEventListener('click', this.hide);
    };

    hide = (e) => {
        // Do not hide the dropdown if there was a click within it.
        const inside_dropdown = !!findParent(e.target, 'VerticalMenu');
        if (inside_dropdown) return;

        e.preventDefault();
        e.stopPropagation();
        this.setState({ shown: false });
        document.removeEventListener('click', this.hide);
    };

    navigate = (e) => {
        const a = e.target.nodeName.toLowerCase() === 'a' ? e.target : e.target.parentNode;
        this.setState({ show: false });
        if (a.host !== window.location.host) return;
        e.preventDefault();
        browserHistory.push(a.pathname + a.search);
    };

    getSelectedLabel = (items, selected) => {
        const selectedEntry = items.find((i) => i.value === selected);
        const selectedLabel = selectedEntry && selectedEntry.label ? selectedEntry.label : selected;
        return selectedLabel;
    };

    render() {
        const {
            el, items, selected, children, className, title, href, position
        } = this.props;
        const hasDropdown = items.length > 0;

        let entry = children || (
            <span>
                {this.getSelectedLabel(items, selected)}
                {hasDropdown && <Icon name="dropdown-arrow" />}
            </span>
        );

        if (hasDropdown) { entry = (
            <a key="entry" href={href || '#'} onClick={this.toggle}>
                {entry}
            </a>
        ); }

        const menu = <VerticalMenu key="menu" title={title} items={items} hideValue={selected} />;
        const cls = 'DropdownMenu'
            + (this.state.shown ? ' show' : '')
            + (className ? ` ${className}` : '')
            + (position ? ` ${position}` : '');
        return React.createElement(el, { className: cls }, [entry, menu]);
    }
}

DropdownMenu.propTypes = propTypes;
DropdownMenu.defaultProps = defaultProps;
