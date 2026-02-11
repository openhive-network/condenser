import React, { useCallback, useState } from 'react';
import { DateTime } from 'luxon';
import tt from 'counterpart';

const DateTimePicker = (props) => {
    const { onChange, value } = props;
    const [error, setError] = useState('');

    const handleChange = useCallback((event) => {
        const coundDownDate = DateTime.fromISO(event);
        const delta = coundDownDate.diffNow().as('seconds');

        if (delta < 3600) {
            setError(tt('post_advanced_settings_jsx.countdown_date_error'));
        } else if (onChange) {
            setError('');
            onChange(coundDownDate);
        }
    }, []);

    const now = DateTime.now().toFormat("yyyy-MM-dd'T'HH:mm");
    const inputValue = value ? value.toFormat("yyyy-MM-dd'T'HH:mm") : '';

    return (
        <div>
            <input
                className="datetimepicker_value"
                type="datetime-local"
                name="countdown"
                min={now}
                value={inputValue}
                onChange={(e) => handleChange(e.target.value)}
            />
            <div className="error">{error}</div>
        </div>
    );
};

export default DateTimePicker;
