import React from 'react';

import { render } from '../../../../test/unit/tools';
import { _Header_ } from './index';

beforeEach(() => {
    global.$STM_Config = {};
});

describe('Header', () => {
    it('contains class .header', () => {
        global.$STM_Config = { read_only_mode: false };
        // eslint-disable-next-line react/jsx-pascal-case
        const { container } = render(<_Header_ pathname="whatever" />);
        expect(container.querySelectorAll('header.Header')).toHaveLength(1);
    });
});
