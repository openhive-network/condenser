import React from 'react';
import { findParent } from 'app/utils/DomUtils';
import PropTypes from 'prop-types';

export default class Dropdown extends React.Component {
    static propTypes = {
        children: PropTypes.object,
        className: PropTypes.string,
        title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
        href: PropTypes.string,
        onHide: PropTypes.func,
        onShow: PropTypes.func,
        show: PropTypes.bool,
    };

    static defaultProps = {
        onHide: () => null,
        onShow: () => null,
        show: false,
        className: 'dropdown-comp',
        href: null,
    };

    componentWillUnmount() {
        document.removeEventListener('click', this.hide);
    }

    toggle = (e) => {
        const { show } = this.props;
        if (show) {
            this.hide(e);
        } else {
            this.show(e);
        }
    };

    show = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.props.onShow();
        document.addEventListener('click', this.hide);
    };

    hide = (e) => {
        // Do not hide the dropdown if there was a click within it.
        const inside_dropdown = !!findParent(e.target, 'dropdown__content');
        if (inside_dropdown) return;

        e.preventDefault();
        e.stopPropagation();
        this.props.onHide();
        document.removeEventListener('click', this.hide);
    };

    render() {
        const {
            children, className, title, href, position, show,
        } = this.props;

        const entry = (
            <a key="entry" href={href || '#'} onClick={this.toggle}>
                {title}
            </a>
        );

        const content = (
            <div key="dropdown-content" className="dropdown__content">
                {children}
            </div>
        );

        const cls = 'dropdown'
            + (show ? ' show' : '')
            + (className ? ` ${className}` : '')
            + (position ? ` ${position}` : '');

        return React.createElement('div', { className: cls, key: 'dropdown' }, [entry, content]);
    }
}
