// Enhanced Error Handling
export class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
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

    static log(level, ...args) {
        console[level](...args);
    }

    static error(...args) {
        this.log('error', ...args);
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

    static handleValidationError(error) {
        if (error.status === 422) {
            console.warn('Validation Error:', error.data);
            return error.data;
        }
        throw error;
    }
}