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
        const onClick = () => {
            const spoilerMd = '>! [Click to reveal] Your spoiler content';
            const newValue = RichTextEditor.createValueFromString(this.props.value + spoilerMd, 'markdown');
            this.setState({ value: newValue } );

            if (this.props.onChange) {
                this.props.onChange(newValue.toString('markdown'));
            }
        };
        const customControls = [
            () => { return (
                <button
                    title="Add spoiler block"
                    type="button"
                    key="spoiler"
                    className="IconButton__root___3tqZW Button__root___1gz0c"
                    onClick={onClick}
                >
                    Spoiler
                </button>
            ); },
        ];

        return (
            <div className="visual-editor">
                {RichTextEditor && (
                    <RichTextEditor
                        value={this.state.value}
                        onChange={this.onChange}
                        customControls={customControls}
                    />
                )}
            </div>
        );
    }
}

export default VisualEditor;
