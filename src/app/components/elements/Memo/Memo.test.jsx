import React from 'react';
import { render } from '@testing-library/react';

import { Memo } from './index';

describe('Memo', () => {
    it('should return an empty span if no text is provided', () => {
        const { container } = render(<Memo fromNegativeRepUser={false} />);
        expect(container.firstChild).toBeEmptyDOMElement();
    });

    it('should render a plain ol memo', () => {
        const { container, getByText } = render(<Memo fromNegativeRepUser={false} text="hi dude" />);
        expect(container.firstChild).toHaveClass('Memo');
        expect(getByText('hi dude')).toBeInTheDocument();
    });
});
