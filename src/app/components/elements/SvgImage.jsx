import React from 'react';
import PropTypes from 'prop-types';

export default class SvgImage extends React.Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        width: PropTypes.string.isRequired,
        height: PropTypes.string.isRequired,
        className: PropTypes.string,
    };

    render() {
        const style = {
            display: 'inline-block',
            width: this.props.width,
            height: this.props.height,
        };
        // eslint-disable-next-line global-require,import/no-dynamic-require
        const image = require(`assets/images/${this.props.name}.svg`);
        const cn = 'SvgImage' + (this.props.className ? ' ' + this.props.className : '');
        return <span className={cn} style={style} dangerouslySetInnerHTML={{ __html: image }} />;
    }
}
