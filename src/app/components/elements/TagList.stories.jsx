import React from 'react';
import { fromJS } from 'immutable';
import { storiesOf } from '@storybook/react';
import rootReducer from 'app/redux/RootReducer';
import {Provider} from "react-redux";
import {createStore} from "redux";
import TagList from './TagList';

const store = createStore(rootReducer);

const mockPost = {
    json_metadata: {
        tags: ['water', 'snow', 'ice', 'steam'],
    },
};

storiesOf('Elements', module)
    .addDecorator((getStory) => <Provider store={store}>{getStory()}</Provider>)
    .add('TagList', () => <TagList post={fromJS(mockPost)} />);
