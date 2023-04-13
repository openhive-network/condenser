import { LoggerTools } from './LoggerTools';

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

const environment = {
    debug: true,
    env: process.env.NODE_ENV,
};

export const loggerStyles = {
    slimConstructor: 'padding: 1px; padding-right: 4px; font-family: "Helvetica";'
        + 'color: white;'
        + 'background-color: #276156;'
        + 'border-left: 3px solid #0a2722;',
    slimDestructor: 'padding: 1px; padding-right: 4px; font-family: Helvetica;'
        + 'color: black;'
        + 'background-color: rgb(255, 180, 0);'
        + 'border-left: 3px solid rgb(255, 130, 0)',
    slimFatal: 'padding: 1px; padding-right: 4px; font-family: Helvetica;'
        + 'color: white;'
        + 'background-color: rgb(0, 0, 0);'
        + 'border-left: 3px solid rgb(35,60,80)',
    slimError: 'padding: 1px; padding-right: 4px; font-family: Helvetica;'
        + 'color: white;'
        + 'background-color: rgb(255, 80, 80);'
        + 'border-left: 3px solid rgb(35,60,80)',
    slimWarn: 'padding: 1px; padding-right: 4px; font-family: Helvetica;'
        + 'color: black;'
        + 'background-color: rgb(255, 255, 153);'
        + 'border-left: 3px solid rgb(35,60,80)',
    slimInfo: 'padding: 1px; padding-right: 4px; font-family: Helvetica;'
        + 'color: white;'
        + 'background-color: rgb(55,105,150);'
        + 'border-left: 3px solid rgb(35,60,80)',
    slimDebug: 'padding: 1px; padding-right: 4px; font-family: Helvetica;'
        + 'color: black;'
        + 'background-color: rgb(153, 255, 204);'
        + 'border-left: 3px solid rgb(35,60,80)',
};


/**
 * Service responsible for logging. Logs are directed to console.
 *
 * @export
 * @class Logger
 */
export class Logger {
    /**
     * Name of this class.
     *
     * @type {string}
     * @memberof Logger
     */
    instanceName;

    /**
     * Information where to output log messages. Can be one of
     * ['console'] at this moment.
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

    /**
     * At start of constructor we check debug and set proper level of
     * logging.
     */
    constructor(config = {}) {
        const defaultProps = {
            instanceName: 'Logger',
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
        this.init();
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

    init() {

        // // Direct logging to console on devel and test machines.
        // const check = this.isTest && (
        //     false
        //     || this.isLocalDomain
        //     || this.isTestDomain
        // );

        // if (check) {
        //     this.level = this.levels.all;
        //     this.output = 'console';
        // } else {
        //     // Direct to nowhere (suppress any logging to console).
        //     this.level = this.levels.info;
        //     this.output = 'nowhere';
        // }

        this.debug('%c Constructor',
            this.style.slimConstructor, this.instanceName);

    }

    get style() {
        return loggerStyles;
    }

    /**
     * Check for localhost by hostname
     * @return {boolean}
     */
    get isLocalDomain() {
        return LoggerTools.isLocalDomain();
    }

    get isTest() {
        return environment.env !== 'test';
    }

    /**
     * Checks if app works on testing domain.
     * @return {boolean}
     */
    get isTestDomain() {
        return LoggerTools.isTestDomain();
    }

    /**
     * Wrapper for (this.environment.env === 'development')
     * @returns {boolean}
     */
    get isDevEnv() {
        if (environment && environment.env) {
            return environment.env === 'development';
        }
        return false;
    }

    /**
     * Empty function to help binding.
     */
    noop = () => { };

    get time() {
        if (this.level > 0 && this.level >= this.levels.debug) {
            if (this.output === 'console') {
                return console.time.bind(console);
            }
        }
        return this.noop;
    }

    get timeEnd() {
        if (this.level > 0 && this.level >= this.levels.debug) {
            if (this.output === 'console') {
                return console.timeEnd.bind(console);
            }
        }
        return this.noop;
    }

    get trace() {
        if (this.level > 0 && this.level >= this.levels.trace) {
            if (this.output === 'console') {
                return console.trace.bind(console);
            }
        }
        return this.noop;
    }

    get debug() {
        if (this.level > 0 && this.level >= this.levels.debug) {
            if (this.output === 'console') {
                // return console.debug.bind(console, '%c DEBUG', this.style.slimDebug);
                return console.debug.bind(console);
            }
        }
        return this.noop;
    }

    get info() {
        if (this.level > 0 && this.level >= this.levels.info) {
            if (this.output === 'console') {
                // return console.info.bind(console, '%c INFO', this.style.slimInfo);
                return console.info.bind(console);
            }
        }
        return this.noop;
    }

    get log() {
        if (this.level > 0 && this.level >= this.levels.debug) {
            if (this.output === 'console') {
                // return console.log.bind(console, '%c INFO', this.style.slimInfo);
                return console.log.bind(console);
            }
        }
        return this.noop;
    }

    get warn() {
        if (this.level > 0 && this.level >= this.levels.warn) {
            if (this.output === 'console') {
                // return console.warn.bind(console, '%c WARN', this.style.slimWarn);
                return console.warn.bind(console);
            }
        }
        return this.noop;
    }

    get error() {
        if (this.level > 0 && this.level >= this.levels.error) {
            if (this.output === 'console') {
                // return console.error.bind(console, '%c ERROR', this.style.slimError);
                return console.error.bind(console);
            }
        }
        return this.noop;
    }

    get fatal() {
        if (this.level > 0 && this.level >= this.levels.fatal) {
            if (this.output === 'console') {
                // return console.error.bind(console, '%c FATAL', this.style.slimFatal);
                return console.error.bind(console);
            }
        }
        return this.noop;
    }

}

export const logger = new Logger();
