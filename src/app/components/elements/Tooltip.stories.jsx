import React from 'react';
import { storiesOf } from '@storybook/react';
import { text } from '@storybook/addon-knobs';
import Tooltip from './Tooltip';

storiesOf('Elements', module)
    .add('Tooltip', () => (
        <Tooltip t={text('tooltip text', 'a helpful lil tip')}>
            <span>Hover Over Me To See The Tooltip.</span>
        </Tooltip>
    ));
