// Configuration Management with Environment Support
const getEnvVariable = (key, defaultValue) => {
    return window.ENV?.[key] || defaultValue;
};

export const CONFIG = {
    STORAGE: {
        ACCESS_TOKEN: 'access_token',
        TOKEN_TYPE: 'token_type',
        USER_ID: 'user_id',
        USER_CREATED_AT: 'user_created_at',
        USER_IS_ACTIVE: 'user_is_active'
    }
};