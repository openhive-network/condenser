import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import links from 'app/utils/Links';
import { browserHistory } from 'react-router';
// import shouldComponentUpdate  from 'app/utils/shouldComponentUpdate';

export default class Link extends PureComponent {
    static propTypes = {
        // HTML properties
        href: PropTypes.string,
    };

    constructor(props) {
        super();
        const { href } = props;
        // this.shouldComponentUpdate = shouldComponentUpdate(this, 'Link');
        this.localLink = href && links.local.test(href);
        this.onLocalClick = (e) => {
            e.preventDefault();
            browserHistory.push(href);
        };
    }

    render() {
        const {
            props: { href, children },
            onLocalClick,
        } = this;
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        if (this.localLink) return <a onClick={onLocalClick} role="link" tabIndex={0}>{children}</a>;
        return (
            <a target="_blank" rel="noopener noreferrer" href={href}>
                {children}
            </a>
        );
    }
}

Link.propTypes = {
    // HTML properties
    href: PropTypes.string,
};

Link.defaultProps = {
    href: '',
};
