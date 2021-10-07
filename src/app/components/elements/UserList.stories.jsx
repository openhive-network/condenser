import React from 'react';
import { storiesOf } from '@storybook/react';
import { number } from '@storybook/addon-knobs';
import { List } from 'immutable';
import rootReducer from 'app/redux/RootReducer';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import UserList from './UserList';

const store = createStore(rootReducer);

const options = {
    range: true,
    min: 0,
    max: 150,
    step: 1,
};

storiesOf('Elements', module)
    .addDecorator((getStory) => <Provider store={store}>{getStory()}</Provider>)
    .add('UserList', () => {
        const mockUsers = List(Array(number('number of users', 10, options)).fill('test'));
        return <UserList users={mockUsers} title="User List" />;
    });
