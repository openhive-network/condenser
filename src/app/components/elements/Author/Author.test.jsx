import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import rootReducer from 'app/redux/RootReducer';
import { render } from '@testing-library/react';
import { fromJS } from 'immutable';

import Author from './index';
import post from '../../../../../api_mockdata/get_content';

const store = createStore(rootReducer);

describe('<Author />', () => {
    it('renders without crashing', () => {
        const { container, getByText } = render(
            <Provider store={store}>
                <Author
                    post={fromJS(post)}
                />
            </Provider>
        );
        expect(getByText('joeparys')).toBeInTheDocument();
        expect(container).toMatchSnapshot();
    });
});
