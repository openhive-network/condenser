import React, { useEffect, useCallback, useState } from 'react';
import SimplePicker from 'simplepicker';
import { DateTime } from 'luxon';

import 'simplepicker/dist/simplepicker.css';

const DateTimePicker = (props) => {
    const { onChange, value } = props;
    const [picker, setPicker] = useState(undefined);
    const [error, setError] = useState('');

    const handleChange = useCallback((event) => {
        const coundDownDate = DateTime.fromISO(event);
        const delta = coundDownDate.diffNow().as('seconds');

        if (delta < 3600) {
            setError('Countdown target date should be at least one hour from now');
        } else if (onChange) {
            setError('');
            onChange(coundDownDate);
        }
    }, []);

    const openPicker = useCallback(() => {
        if (value) {
            picker.reset(value.toJSDate());
        }
        picker.open();
    }, [picker, value]);

    useEffect(() => {
        const _picker = new SimplePicker('.datetimepicker');
        _picker.on('submit', (date) => {
            handleChange(date.toISOString());
        });
        setPicker(_picker);
    }, [onChange]);

    return (
        <div>
            {picker && (
                <input
                    className="datetimepicker_value"
                    type="text"
                    name="countdown"
                    placeholder="Click to choose a date and time"
                    value={value ? value.toLocaleString(DateTime.DATETIME_SHORT) : ''}
                    onClick={openPicker}
                    readOnly
                />
            )}
            <div className="datetimepicker" />
            <div className="error">{error}</div>
        </div>
    );
};

export default DateTimePicker;
