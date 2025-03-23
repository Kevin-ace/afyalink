// Base Error class for all application errors
export class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', context = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp
        };
    }
}

// API specific errors
export class APIError extends AppError {
    constructor(message, status, data = null, context = {}) {
        super(message, `API_ERROR_${status}`, context);
        this.status = status;
        this.data = data;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            status: this.status,
            data: this.data
        };
    }

    static fromResponse(response, data = {}) {
        return new APIError(
            data.message || response.statusText || 'API request failed',
            response.status,
            data,
            { endpoint: response.url }
        );
    }
}

// Validation errors
export class ValidationError extends AppError {
    constructor(message, context = {}) {
        super(message, 'VALIDATION_ERROR', context);
    }
}

// Network errors
export class NetworkError extends AppError {
    constructor(message, originalError = null, context = {}) {
        super(message, 'NETWORK_ERROR', context);
        this.originalError = originalError;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            originalError: this.originalError
        };
    }
}

// Authentication errors
export class AuthError extends AppError {
    constructor(message, context = {}) {
        super(message, 'AUTH_ERROR', context);
    }

    static invalidCredentials(context = {}) {
        return new AuthError('Invalid credentials', context);
    }

    static sessionExpired(context = {}) {
        return new AuthError('Session expired', context);
    }

    static unauthorized(context = {}) {
        return new AuthError('Unauthorized access', context);
    }
}

// Rate limiting errors
export class RateLimitError extends AppError {
    constructor(message, retryAfter = null, context = {}) {
        super(message, 'RATE_LIMIT', { retryAfter }, context);
        this.retryAfter = retryAfter;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            retryAfter: this.retryAfter
        };
    }
}

// Centralized error logging service
export class ErrorLogger {
    static LEVELS = {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
    };

    static async log(level, message, error = null, context = {}) {
        const logEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: {
                ...context,
                url: window.location.href,
                userAgent: navigator.userAgent
            }
        };

        if (error) {
            logEntry.error = error instanceof AppError ? error.toJSON() : {
                name: error.name,
                message: error.message
            };
        }

        // Log to console
        const consoleMethod = level === this.LEVELS.ERROR ? 'error'
            : level === this.LEVELS.WARN ? 'warn'
            : level === this.LEVELS.INFO ? 'info'
            : 'debug';
        
        console[consoleMethod](
            `[${new Date().toISOString()}] ${message}`,
            error || '',
            Object.keys(context).length ? context : ''
        );
    }

    static error(message, error = null, context = {}) {
        return this.log(this.LEVELS.ERROR, message, error, context);
    }

    static warn(message, error = null, context = {}) {
        return this.log(this.LEVELS.WARN, message, error, context);
    }

    static info(message, context = {}) {
        return this.log(this.LEVELS.INFO, message, null, context);
    }

    static debug(message, context = {}) {
        return this.log(this.LEVELS.DEBUG, message, null, context);
    }
}