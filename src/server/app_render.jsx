/*global $STM_Config*/
import React from 'react';
import config from 'config';
import { renderToString } from 'react-dom/server';
import secureRandom from 'secure-random';
import ErrorPage from 'server/server-error';
import ServerHTML from './server-html';
import { serverRender } from '../shared/UniversalRender';
import { determineViewMode } from '../app/utils/Links';
import { getSupportedLocales } from './utils/misc';

const path = require('path');

const ROOT = path.join(__dirname, '../..');

async function appRender(ctx, locales = false, resolvedAssets = false) {
    ctx.state.requestTimer.startTimer('appRender_ms');
    // This is the part of SSR where we make session-specific changes:
    try {

        // When user is logged in and listed in
        // `$STM_Config.logger_admins`, allow him to see all Logger
        // messages.
        if (ctx.session.a && $STM_Config.logger_admins) {
            const loggerAdmins = ($STM_Config.logger_admins)
                    .replace(/^[\s,;]+|[\s,;]+$/gm, '')
                    .split(/[\s,;]+/) || [];
            if (loggerAdmins.includes(ctx.session.a)) {
                $STM_Config.logger_output = 'console';
                $STM_Config.logger_log_level = 'all';
            }
        }

        let userPreferences = {};
        if (ctx.session.user_prefs) {
            try {
                userPreferences = JSON.parse(ctx.session.user_prefs);
            } catch (err) {
                console.error('cannot parse user preferences:', ctx.session.uid, err);
            }
        }
        if (!userPreferences.locale) {
            let locale = ctx.getLocaleFromHeader();
            if (locale) locale = locale.substring(0, 2);
            const supportedLocales = locales ? locales : getSupportedLocales();
            const localeIsSupported = supportedLocales.find((l) => l === locale);
            if (!localeIsSupported) locale = 'en';
            userPreferences.locale = locale;
        }
        let login_challenge = ctx.session.login_challenge;
        if (!login_challenge) {
            login_challenge = secureRandom.randomBuffer(16).toString('hex');
            ctx.session.login_challenge = login_challenge;
        }
        const offchain = {
            csrf: ctx.csrf,
            new_visit: ctx.session.new_visit,
            config: $STM_Config,
            special_posts: await ctx.app.specialPostsPromise,
            login_challenge,
        };

        const cookieConsent = {
            enabled: !!config.cookie_consent_enabled,
            api_key: config.cookie_consent_api_key,
        };
        // ... and that's the end of user-session-related SSR
        const initial_state = {
            app: {
                viewMode: determineViewMode(ctx.request.search),
                env: process.env.NODE_ENV,
                walletUrl: config.wallet_url,
            },
        };

        const {
            body, title, statusCode, meta, redirectUrl,
        } = await serverRender(
            ctx.request.url,
            initial_state,
            ErrorPage,
            userPreferences,
            offchain,
            ctx.state.requestTimer
        );

        if (redirectUrl) {
            console.log('Redirecting to', redirectUrl);
            ctx.status = 302;
            ctx.redirect(redirectUrl);
            return;
        }

        let assets;
        // If resolvedAssets argument parameter is falsey we infer that we are in
        // development mode and therefore resolve the assets on each render.
        if (!resolvedAssets) {
            // Assets name are found in `webpack-stats` file
            const assets_filename = ROOT + '/tmp/webpack-stats-dev.json';
            // eslint-disable-next-line global-require,import/no-dynamic-require
            assets = require(assets_filename);
            delete require.cache[require.resolve(assets_filename)];
        } else {
            assets = resolvedAssets;
        }
        const props = {
            body,
            assets,
            title,
            meta,
            shouldSeeCookieConsent: cookieConsent.enabled,
            cookieConsentApiKey: cookieConsent.api_key,
        };
        ctx.status = statusCode;
        ctx.body = '<!DOCTYPE html>' + renderToString(<ServerHTML {...props} />);
    } catch (err) {
        // Render 500 error page from server
        console.error('AppRender error', err, redirect);
        const { error, redirect } = err;
        if (error) throw error;

        // Handle component `onEnter` transition
        if (redirect) {
            const { pathname, search } = redirect;
            ctx.redirect(pathname + search);
        }

        throw err;
    }

    ctx.state.requestTimer.stopTimer('appRender_ms');
}

appRender.dbStatus = { ok: true };
module.exports = appRender;
