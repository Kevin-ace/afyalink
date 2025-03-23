export const CONFIG = {
    API: {
        BASE_URL: 'http://localhost:8000',
        ENDPOINTS: {
            // Auth endpoints
            AUTH: {
                LOGIN: '/auth/login',
                REGISTER: '/auth/register',
                REFRESH: '/auth/refresh',
                LOGOUT: '/auth/logout',
                PROFILE: '/auth/profile'
            },
            // Facility endpoints
            FACILITIES: {
                LIST: '/facilities',
                NEARBY: '/facilities/nearby',
                SEARCH: '/facilities/search',
                DETAILS: (id) => `/facilities/${id}`,
                SPECIALTIES: '/facilities/specialties'
            },
            // Insurance endpoints
            INSURANCE: {
                LIST: '/insurances',
                DETAILS: (id) => `/insurances/${id}`,
                FACILITIES: (id) => `/insurances/${id}/facilities`
            }
        }
    },
    STORAGE: {
        ACCESS_TOKEN: 'access_token',
        TOKEN_TYPE: 'token_type',
        USER_ID: 'user_id',
        USER_CREATED_AT: 'user_created_at',
        USER_IS_ACTIVE: 'user_is_active',
        LANGUAGE: 'preferred_language'
    },
    MAP: {
        DEFAULT_CENTER: [-1.286389, 36.817223], // Nairobi
        DEFAULT_ZOOM: 12,
        SEARCH_RADIUS: 10 // 10km as per requirements
    }
};