// Configuration Management with Environment Support
const getEnvVariable = (key, defaultValue) => {
    return window.ENV?.[key] || defaultValue;
};

export const CONFIG = {
    API: {
        BASE_URL: getEnvVariable('API_BASE_URL', 'http://localhost:8000'),
        ENDPOINTS: {
            AUTH: '/auth',
            SERVICES: '/services',
            INSURANCE: '/insurance',
            RECOMMENDATIONS: '/recommendations',
            FACILITIES: '/facilities'
        }
    },
    STORAGE: {
        ACCESS_TOKEN: 'access_token',
        TOKEN_TYPE: 'token_type',
        USER_ID: 'userId',
        USER_CREATED_AT: 'userCreatedAt',
        USER_IS_ACTIVE: 'userIsActive'
    },
    VALIDATION: {
        PASSWORD: {
            MIN_LENGTH: 8,
            REQUIRE_UPPERCASE: true,
            REQUIRE_LOWERCASE: true,
            REQUIRE_NUMBER: true,
            REQUIRE_SPECIAL_CHAR: true
        }
    },
    // Add runtime configuration validation
    validate() {
        const errors = [];
        
        if (!this.API.BASE_URL) {
            errors.push('API Base URL is not configured');
        }
        
        if (errors.length > 0) {
            console.error('Configuration Errors:', errors);
            throw new Error('Invalid Configuration');
        }
    }
};

// Validate configuration on import
CONFIG.validate();