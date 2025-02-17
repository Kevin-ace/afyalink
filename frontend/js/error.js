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
        const isDevMode = false; // This can be set from an environment variable

        if (isDevMode) {
            console.error('Error reported:', { message, error });
        }
        
        // Send error to backend error tracking service
        this.sendErrorToBackend(message, error);
    }

    static sendErrorToBackend(message, error) {
        fetch('/api/log-error', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                error: error ? error.toString() : null,
                timestamp: new Date().toISOString()
            })
        }).catch(transportError => {
            // Fallback error logging if backend logging fails
            console.error('Failed to send error to backend:', transportError);
        });
    }
}