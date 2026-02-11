/**
 * Shared HTTP client with keep-alive agents.
 *
 * Without explicit agent configuration, Node.js creates a new TCP connection
 * for each HTTP request. This causes massive TIME_WAIT buildup on API servers.
 *
 * This module configures:
 * 1. Axios defaults to use keep-alive agents
 * 2. Global fetch (used by cross-fetch/hive-js) to use keep-alive agents
 *
 * @see https://nodejs.org/api/http.html#class-httpagent
 */

import https from 'https';
import http from 'http';
import axios from 'axios';

export const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
});

export const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
});

// Set as defaults for all axios requests made via require('axios')
axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;

// Patch global fetch to use keep-alive agents (for cross-fetch/hive-js)
// cross-fetch uses node-fetch in Node.js, which respects the agent option
const originalFetch = global.fetch;
if (typeof originalFetch === 'function') {
    global.fetch = function fetchWithAgent(url, options = {}) {
        const urlStr = url.toString();
        if (!options.agent) {
            options.agent = urlStr.startsWith('https') ? httpsAgent : httpAgent;
        }
        return originalFetch(url, options);
    };
}

// Also handle case where fetch isn't set yet (cross-fetch sets it lazily)
// We'll wrap it when it gets accessed
if (!originalFetch) {
    let _fetch = null;
    Object.defineProperty(global, 'fetch', {
        get() {
            return _fetch ? function fetchWithAgent(url, options = {}) {
                const urlStr = url.toString();
                if (!options.agent) {
                    options.agent = urlStr.startsWith('https') ? httpsAgent : httpAgent;
                }
                return _fetch(url, options);
            } : undefined;
        },
        set(newFetch) {
            _fetch = newFetch;
        },
        configurable: true,
    });
}

export { axios };
