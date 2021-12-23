import React from 'react';
import { storiesOf } from '@storybook/react';
import Reputation from './Reputation';

storiesOf('Elements', module)
    .add('Reputation', () => <Reputation value={1200} />);
