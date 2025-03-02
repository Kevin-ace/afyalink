// Configuration Management with Environment Support
const getEnvVariable = (key, defaultValue) => {
    return window.ENV?.[key] || defaultValue;
};

export const CONFIG = {
    API: {
        BASE_URL: 'http://localhost:8000' // Replace with your backend URL
    },
    STORAGE: {
        ACCESS_TOKEN: 'access_token'
    }
};