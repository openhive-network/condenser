import React, { Component } from 'react';

import PropTypes from 'prop-types';

let RichTextEditor;
if (process.env.BROWSER) {
    // eslint-disable-next-line global-require
    RichTextEditor = require('react-rte').default;
}

class VisualEditor extends Component {
    static propTypes = {
        onChange: PropTypes.func,
    };

    constructor(props) {
        super(props);

        const state = {};

        if (RichTextEditor) {
            if (props.value) {
                state.value = RichTextEditor.createValueFromString(props.value, 'markdown');
            } else {
                state.value = RichTextEditor.createEmptyValue();
            }
        }

        this.state = state;
    }

    onChange = (value) => {
        this.setState({ value });
        if (this.props.onChange) {
            this.props.onChange(value.toString('markdown'));
        }
    };

    render() {
        return (
            <div className="visual-editor">
                {RichTextEditor && <RichTextEditor value={this.state.value} onChange={this.onChange} />}
            </div>
        );
    }
}

export default VisualEditor;
