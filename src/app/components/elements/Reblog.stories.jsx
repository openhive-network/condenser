import React from 'react';
import { storiesOf } from '@storybook/react';
import rootReducer from 'app/redux/RootReducer';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import Reblog from './Reblog';

const store = createStore(rootReducer);

storiesOf('Elements', module)
    .addDecorator((getStory) => <Provider store={store}>{getStory()}</Provider>)
    .add('Reblog', () => <Reblog permlink="foo/bar" author="maitland" reblog={() => alert('STEEM WAZ HERE')} />);
