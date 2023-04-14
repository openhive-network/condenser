/**
 * @typedef LoggerLogLevels
 * @type {object}
 * @property {number} off
 * @property {number} fatal
 * @property {number} error
 * @property {number} warn
 * @property {number} info
 * @property {number} debug
 * @property {number} trace
 * @property {number} all
 */

// For fancy log messages.
const commonStyle = [
    'padding: 1px; padding-right: 4px; font-family: "Helvetica";',
    'border-left: 3px solid #0a2722;',
];
export const loggerStyles = {
    slimConstructor: [
            'color: white;',
            'background-color: #276156;',
            ...commonStyle,
        ].join(' '),
    slimDestructor: [
            'color: black;',
            'background-color: rgb(255, 180, 0);',
            ...commonStyle,
        ].join(' '),
    slimFatal: [
            'color: white;',
            'background-color: rgb(0, 0, 0);',
            ...commonStyle,
        ].join(' '),
    slimError: [
            'color: white;',
            'background-color: rgb(255, 80, 80);',
            ...commonStyle,
        ].join(' '),
    slimWarn: [
            'color: black;',
            'background-color: rgb(255, 255, 153);',
            ...commonStyle,
        ].join(' '),
    slimInfo: [
            'color: white;',
            'background-color: rgb(55,105,150);',
            ...commonStyle,
        ].join(' '),
    slimDebug: [
            'color: black;',
            'background-color: rgb(153, 255, 204);',
            ...commonStyle,
        ].join(' '),
};


/**
 * Service for logging to console or nowhere, used as a replacement for
 * standard console messaging. Use it this way:
 * ```
 * import { logger } from './Logger';
 * logger.info('my info');
 * logger.error('my error');
 * ```
 * Then you should see message in console in development environment,
 * but not in production environment. This behavior depends on
 * environment variables or other logic impemented in other places,
 * mostly in `App.jsx`.
 *
 * @export
 * @class Logger
 */
export class Logger {

    /**
     * Information where to output log messages. Can be only `console`
     * at this moment.
     *
     * @type {string}
     * @memberof Logger
     */
    _output;

    get output() {
        return this._output;
    }

    set output(value) {
        this._output = value;
    }

    /**
     * Level of logs. Explained in levels.
     * @type {number}
     * @memberof Logger
     */
    _level;

    get level() {
        return this._level;
    }

    set level(logLevel) {
        this._level = this.levels[logLevel];
    }

    /**
     * Values of possible log levels.
     * @type {LoggerLogLevels}
     * @memberof Logger
     */
    levels;

    constructor(config = {}) {
        const defaultProps = {
            levels: {
                off: 0,
                fatal: 100,
                error: 200,
                warn: 300,
                info: 400,
                debug: 500,
                trace: 600,
                all: 100000000,
            },
            logLevel: 'all',
            output: 'noop',
        };
        const myProps = {...{}, ...defaultProps, ...config};
        this.setupProps(myProps);
    }

    setupProps(props) {
        for (const key of Object.keys(props)) {
            if (key !== 'logLevel') {
                this[key] = props[key];
            }
        }
        if (props.logLevel) {
            this.level = props.logLevel;
        }
    }

    noop = () => { };

    get style() {
        return loggerStyles;
    }

    get time() {
        if (this.output === 'console') {
            if (this.level > 0 && this.level >= this.levels.debug) {
                return console.time.bind(console);
            }
        }
        return this.noop;
    }

    get timeEnd() {
        if (this.output === 'console') {
            if (this.level > 0 && this.level >= this.levels.debug) {
                return console.timeEnd.bind(console);
            }
        }
        return this.noop;
    }

    get trace() {
        if (this.output === 'console') {
            if (this.level > 0 && this.level >= this.levels.trace) {
                return console.trace.bind(console);
            }
        }
        return this.noop;
    }

    get debug() {
        if (this.output === 'console') {
            if (this.level > 0 && this.level >= this.levels.debug) {
                // return console.debug.bind(console, '%c DEBUG', this.style.slimDebug);
                return console.debug.bind(console);
            }
        }
        return this.noop;
    }

    get info() {
        if (this.output === 'console') {
            if (this.level > 0 && this.level >= this.levels.info) {
                // return console.info.bind(console, '%c INFO', this.style.slimInfo);
                return console.info.bind(console);
            }
        }
        return this.noop;
    }

    get log() {
        if (this.output === 'console') {
            if (this.level > 0 && this.level >= this.levels.debug) {
                // return console.log.bind(console, '%c INFO', this.style.slimInfo);
                return console.log.bind(console);
            }
        }
        return this.noop;
    }

    get warn() {
        if (this.output === 'console') {
            if (this.level > 0 && this.level >= this.levels.warn) {
                // return console.warn.bind(console, '%c WARN', this.style.slimWarn);
                return console.warn.bind(console);
            }
        }
        return this.noop;
    }

    get error() {
        if (this.output === 'console') {
            if (this.level > 0 && this.level >= this.levels.error) {
                // return console.error.bind(console, '%c ERROR', this.style.slimError);
                return console.error.bind(console);
            }
        }
        return this.noop;
    }

    get fatal() {
        if (this.output === 'console') {
            if (this.level > 0 && this.level >= this.levels.fatal) {
                // return console.error.bind(console, '%c FATAL', this.style.slimFatal);
                return console.error.bind(console);
            }
        }
        return this.noop;
    }

}

export const logger = new Logger();
