import React from 'react';
import { storiesOf } from '@storybook/react';
import NativeSelect from './index';

const opts = (topic) => [
    {
        value: 'trending',
        label: 'TRENDY',
        link: `/trending/${topic}`,
    },
    {
        value: 'created',
        label: 'FRESH',
        link: `/created/${topic}`,
    },
    {
        value: 'hot',
        label: 'HOTTT!!!',
        link: `/hot/${topic}`,
    },
    {
        value: 'promoted',
        label: '$$$ SOLD OUT $$$',
        link: `/promoted/${topic}`,
    },
];

storiesOf('Elements', module)
    .add('NativeSelect', () => (
        <NativeSelect
            className="Rat"
            onChange={(e) => {
                console.log('arg:', e.value);
            }}
            options={opts('cool')}
        />
    ));
