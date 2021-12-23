import React from 'react';
import { storiesOf } from '@storybook/react';
import IconButton from './index';

storiesOf('Elements', module)
    .add('IconButton', () => (
        <span>
            <IconButton icon="pencil" />
            <IconButton icon="magnifyingGlass" />
            <IconButton icon="questionMark" />
        </span>
    ));
