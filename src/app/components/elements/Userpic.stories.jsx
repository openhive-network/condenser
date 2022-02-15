import React from 'react';
import { storiesOf } from '@storybook/react';
import rootReducer from 'app/redux/RootReducer';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import Userpic from './Userpic';

const store = createStore(rootReducer);
global.$STM_Config = { img_proxy_prefix: 'https://images.hive.blog/' };

storiesOf('Elements', module)
    .addDecorator((getStory) => <Provider store={store}>{getStory()}</Provider>)
    .add('Userpic', () => <Userpic account="maitland" />);
