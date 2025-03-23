import { ErrorLogger } from '../error.js';

export class Logger {
    static SUCCESS = 'success';
    static ERROR = ErrorLogger.LEVELS.ERROR;
    static WARNING = ErrorLogger.LEVELS.WARN;
    static INFO = ErrorLogger.LEVELS.INFO;
    static DEBUG = ErrorLogger.LEVELS.DEBUG;

    static log(type, message, data = null) {
        const context = data ? { data } : {};

        switch (type) {
            case this.SUCCESS:
                ErrorLogger.info(message, { success: true, ...context });
                break;
            case this.ERROR:
                ErrorLogger.error(message, data instanceof Error ? data : null, context);
                break;
            case this.WARNING:
                ErrorLogger.warn(message, null, context);
                break;
            case this.INFO:
                ErrorLogger.info(message, context);
                break;
            case this.DEBUG:
                ErrorLogger.debug(message, context);
                break;
            default:
                ErrorLogger.info(message, context);
        }
    }

    static error(message, error = null) {
        this.log(this.ERROR, message, error);
    }

    static warn(message, data = null) {
        this.log(this.WARNING, message, data);
    }

    static info(message, data = null) {
        this.log(this.INFO, message, data);
    }
    static debug(message, data = null) {
        this.log(this.DEBUG, message, data);
    }

    static success(message, data = null) {
        this.log(this.SUCCESS, message, data);
    }
}
