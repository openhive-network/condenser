import React from 'react';
import { storiesOf } from '@storybook/react';
import { date } from '@storybook/addon-knobs';

import { IntlProvider } from 'react-intl';

import ContentEditedWrapper from ".";

storiesOf('Elements', module)
    .add('ContentEditedWrapper', () => (
        <IntlProvider locale="en">
            <ContentEditedWrapper date={date('date', new Date('1 Jul 2016'))} />
        </IntlProvider>
    ));
