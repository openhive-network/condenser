import React from 'react';
import { storiesOf } from '@storybook/react';
import { boolean } from '@storybook/addon-knobs';
import rootReducer from 'app/redux/RootReducer';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import Follow from './index';

const store = createStore(rootReducer);

storiesOf('Elements', module)
    .addDecorator((getStory) => <Provider store={store}>{getStory()}</Provider>)
    .add('Follow', () => (
        <Follow
            className="float-right"
            follower="maitland"
            following="Carol"
            what="blog"
            showFollow={boolean('Show Follow?', true)}
            showMute={boolean('Show Mute?', true)}
        />
    ));
