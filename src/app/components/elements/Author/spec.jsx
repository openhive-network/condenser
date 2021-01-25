import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import rootReducer from 'app/redux/RootReducer';
import { configure, shallow } from 'enzyme';

import Adapter from 'enzyme-adapter-react-15';
import Author from './index';

configure({ adapter: new Adapter() });

const store = createStore(rootReducer);

describe('<Author />', () => {
    const wrapper = shallow(
        <Provider store={store}>
            <Author />
        </Provider>
    );
    const container = wrapper.instance();

    it('renders without crashing', () => {
        expect(wrapper).toBeTruthy();
        expect(container).toBeTruthy();
        expect(wrapper).toMatchSnapshot();
    });
});
