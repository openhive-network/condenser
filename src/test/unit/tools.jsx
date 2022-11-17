import React from 'react';
import { render } from '@testing-library/react';
import {createStore} from "redux";
import { Provider } from 'react-redux';

import rootReducer from 'app/redux/RootReducer';
import Translator from 'app/Translator';

export * from '@testing-library/react';

const loadAllProviders = ({ children }) => {
    const store = createStore(rootReducer);

    return (
        <Provider store={store}>
            <Translator>
                {children}
            </Translator>
        </Provider>
    );
};

const customRender = (ui, options) => {
    return render(ui, { wrapper: loadAllProviders, ...options });
};

export { customRender as render };

export default {
    render: customRender,
};
