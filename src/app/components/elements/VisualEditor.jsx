import React, { Component } from 'react';
import RichTextEditor from 'react-rte';
import PropTypes from 'prop-types';

class VisualEditor extends Component {
    static propTypes = {
        onChange: PropTypes.func,
    };

    constructor(props) {
        super(props);

        const state = {};

        if (props.value) {
            state.value = RichTextEditor.createValueFromString(
                props.value,
                'markdown'
            );
        } else {
            state.value = RichTextEditor.createEmptyValue();
        }

        this.state = state;
    }

    onChange = value => {
        this.setState({ value });
        if (this.props.onChange) {
            this.props.onChange(value.toString('markdown'));
        }
    };

    render() {
        return (
            <div className="visual-editor">
                <RichTextEditor
                    value={this.state.value}
                    onChange={this.onChange}
                />
            </div>
        );
    }
}

export default VisualEditor;
