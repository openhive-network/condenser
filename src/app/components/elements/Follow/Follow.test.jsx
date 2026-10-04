import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import rootReducer from 'app/redux/RootReducer';
import { render } from '@testing-library/react';

import Follow from './index';

const store = createStore(rootReducer);

describe('<Follow />', () => {
    it('renders without crashing', () => {
        const { container } = render(
            <Provider store={store}>
                <Follow />
            </Provider>
        );
        expect(container.firstChild).toBeTruthy();
        expect(container).toMatchSnapshot();
    });
});
