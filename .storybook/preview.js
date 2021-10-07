import React from 'react';
import '!style-loader!css-loader!sass-loader!../src/app/assets/stylesheets/app.scss';
const { addDecorator, configure } = require('@storybook/react');
const { setIntlConfig, withIntl } = require('storybook-addon-intl');
const tt = require('counterpart');
const { addLocaleData } = require('react-intl');
const en = require('react-intl/locale-data/en');
const es = require('react-intl/locale-data/es');
const ru = require('react-intl/locale-data/ru');
const fr = require('react-intl/locale-data/fr');
const it = require('react-intl/locale-data/it');
const ko = require('react-intl/locale-data/ko');
const zh = require('react-intl/locale-data/zh');
const pl = require('react-intl/locale-data/pl');
const { addons, mockChannel } = require('@storybook/addons');

addons.setChannel(mockChannel());

addLocaleData([...en, ...es, ...ru, ...fr, ...it, ...ko, ...zh, ...pl]);

tt.registerTranslations('en', require('counterpart/locales/en'));
tt.registerTranslations('en', require('../src/app/locales/en.json'));

tt.registerTranslations('es', require('../src/app/locales/counterpart/es'));
tt.registerTranslations('es', require('../src/app/locales/es.json'));

tt.registerTranslations('ru', require('counterpart/locales/ru'));
tt.registerTranslations('ru', require('../src/app/locales/ru.json'));

tt.registerTranslations('fr', require('../src/app/locales/counterpart/fr'));
tt.registerTranslations('fr', require('../src/app/locales/fr.json'));

tt.registerTranslations('it', require('../src/app/locales/counterpart/it'));
tt.registerTranslations('it', require('../src/app/locales/it.json'));

tt.registerTranslations('ko', require('../src/app/locales/counterpart/ko'));
tt.registerTranslations('ko', require('../src/app/locales/ko.json'));

tt.registerTranslations('zh', require('../src/app/locales/counterpart/zh'));
tt.registerTranslations('zh', require('../src/app/locales/zh.json'));

tt.registerTranslations('pl', require('../src/app/locales/counterpart/pl'));
tt.registerTranslations('pl', require('../src/app/locales/pl.json'));

const getMessages = (locale) => {
    tt.setLocale(locale)
    return tt('g')
}

setIntlConfig({
    locales: ['en', 'es', 'ru', 'fr', 'it', 'ko', 'zh', 'pl'],
    defaultLocale: 'en',
    getMessages
});

const container = {
    display: 'table',
    position: 'absolute',
    height: '100%',
    width: '100%',
};

const middle = {
    display: 'table-cell',
    verticalAlign: 'middle',
};

const center = {
    marginLeft: 'auto',
    marginRight: 'auto',
    //border: 'solid black',
    width: '300px',
};

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

export const decorators = [
    (Story) => (
        <div style={container}>
            <div style={middle}>
                <div style={center}>
                    <Story/>
                </div>
            </div>
        </div>
    ),
    withIntl,
];
