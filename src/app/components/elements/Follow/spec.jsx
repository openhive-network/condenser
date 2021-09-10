import React from 'react';
import { configure, shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import rootReducer from 'app/redux/RootReducer';
import Adapter from 'enzyme-adapter-react-16';
import Follow from './index';

const store = createStore(rootReducer);

configure({ adapter: new Adapter() });

describe('<Follow />', () => {
    const wrapper = shallow(
        <Provider store={store}>
            <Follow />
        </Provider>
    );
    const container = wrapper.instance();

    it('renders without crashing', () => {
        expect(wrapper).toBeTruthy();
        expect(container).toBeTruthy();
        expect(wrapper).toMatchSnapshot();
    });
});
