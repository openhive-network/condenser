import React from 'react';
import { storiesOf } from '@storybook/react';
import { boolean } from '@storybook/addon-knobs';
import SortOrder from './index';

storiesOf('Elements', module)
    .add('SortOrder', () => (
        <SortOrder sortOrder="promoted" topic="life" horizontal={boolean('dropdown mode?', false)} />
    ));
