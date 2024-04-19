import React from "react";

import DateTimePicker from "../elements/DateTimePicker";

const CountdownSelector = (props) => {
    const { value, onChange } = props;

    return (
        <>
            <div className="row">
                <div className="column">
                    <h4>Countdown Timer</h4>
                    <p>Display a count down timer inside your post</p>
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
