import React, { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import tt from "counterpart";
import HumanizeDuration from "humanize-duration";
import classnames from 'classnames';
import {Map} from "immutable";

const PostCountDown = (props) => {
    const { post } = props;

    let jsonMetadata;
    let countDownEndDate;

    if (post) {
        jsonMetadata = post.get('json_metadata');
    }

    if (jsonMetadata instanceof Map) {
        countDownEndDate = jsonMetadata.get('countdown');
    }

    const [remainingTime, setRemainingTime] = useState();
    const [intervalHandler, setIntervalHandler] = useState();

    useEffect(() => {
        if (countDownEndDate) {
            const endDate = DateTime.fromISO(countDownEndDate);
            let interval = 1000;

            if (endDate.diff(DateTime.now()).as('days') >= 1) {
                interval = 24 * 3600;
            }

            const updateRemainingTime = () => {
                const remainingSeconds = Math.round(endDate.diff(DateTime.now()).as('seconds'));
                setRemainingTime(remainingSeconds);
            };

            updateRemainingTime();
            setIntervalHandler(setInterval(updateRemainingTime, interval));
        }

        return () => {
            clearInterval(intervalHandler);
        };
    }, [countDownEndDate]);

    useEffect(() => {
        if (remainingTime && remainingTime <= 0) {
            clearInterval(intervalHandler);
        }
    }, [remainingTime]);

    if (!countDownEndDate) {
        return null;
    }

    return (
        <div className={classnames('PostFull__countdown', { terminated: remainingTime <= 0 })}>
            {remainingTime > 0
                ? tt('postfull_jsx.post_countdown', { remainingTime: HumanizeDuration(remainingTime * 1000, { largest: 2 })})
                : tt('postfull_jsx.post_countdown_terminated', { date: DateTime.fromISO(countDownEndDate).toLocaleString(DateTime.DATETIME_MED) })}
        </div>
    );
};

export default PostCountDown;
