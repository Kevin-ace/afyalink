// Enhanced Error Handling
export class APIError extends Error {
    constructor(message, status, details = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
}

export class ValidationError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

// Debug and Error Logging Service
export class DebugLogger {
    static levels = {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
    };

    static log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        switch(level) {
            case this.levels.ERROR:
                console.error(logMessage, ...args);
                break;
            case this.levels.WARN:
                console.warn(logMessage, ...args);
                break;
            case this.levels.INFO:
                console.info(logMessage, ...args);
                break;
            case this.levels.DEBUG:
                console.debug(logMessage, ...args);
                break;
        }
    }

    static error(message, error) {
        this.log(this.levels.ERROR, message, error);
        // Optional: Send error to backend logging service
        this.reportErrorToService(message, error);
    }

    static reportErrorToService(message, error) {
        // Implement error reporting to backend
        // This could be an API call to log errors centrally
        console.log('Error reported:', { message, error });
    }
}