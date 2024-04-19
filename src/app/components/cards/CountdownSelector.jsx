import React from "react";
import tt from 'counterpart';

import DateTimePicker from "../elements/DateTimePicker";

const CountdownSelector = (props) => {
    const { value, onChange } = props;

    return (
        <>
            <div className="row">
                <div className="column">
                    <h4>{tt('post_advanced_settings_jsx.countdown')}</h4>
                    <p>{tt('post_advanced_settings_jsx.countdown_description')}</p>
                </div>
            </div>
            <div className="row">
                <div className="small-12 medium-6 large-12 columns">
                    <DateTimePicker
                        onChange={onChange}
                        value={value}
                    />
                </div>
            </div>
        </>
    );
};

export default CountdownSelector;
