import React, { useState } from 'react';
import { DateTime } from 'luxon';
import tt from 'counterpart';

const DateTimePicker = (props) => {
    const { onChange, value } = props;
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const input = e.target.value;
        if (!input) {
            setError('');
            return;
        }

        const countdownDate = DateTime.fromISO(input);
        const delta = countdownDate.diffNow().as('seconds');

        if (delta < 3600) {
            setError(tt('post_advanced_settings_jsx.countdown_date_error'));
        } else if (onChange) {
            setError('');
            onChange(countdownDate);
        }
    };

    // Format current value for datetime-local input (YYYY-MM-DDTHH:mm)
    const inputValue = value ? value.toFormat("yyyy-MM-dd'T'HH:mm") : '';

    return (
        <div>
            <input
                className="datetimepicker_value"
                type="datetime-local"
                name="countdown"
                placeholder={tt('post_advanced_settings_jsx.countdown_placeholder')}
                value={inputValue}
                onChange={handleChange}
            />
            <div className="error">{error}</div>
        </div>
    );
};

export default DateTimePicker;
