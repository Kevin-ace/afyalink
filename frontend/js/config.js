// Environment-specific configuration
const DEV_CONFIG = {
    API: {
        BASE_URL: 'http://localhost:8000',
        ENDPOINTS: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            REFRESH: '/auth/refresh'
        }
    },
    STORAGE: {
        ACCESS_TOKEN: 'access_token',
        TOKEN_TYPE: 'token_type',
        USER_ID: 'user_id',
        USER_CREATED_AT: 'user_created_at',
        USER_IS_ACTIVE: 'user_is_active'
    }
};

// You can add other environment configs here (PROD_CONFIG, etc.)

// Export the appropriate config based on the current URL
export const CONFIG = {
    API: {
        BASE_URL: 'http://localhost:8000',  // Make sure this matches your backend
    }
};