import { CONFIG } from './config.js';
import { APIError } from './error.js';
import { DebugLogger } from './error.js';

export class AuthService {
    static async request(endpoint, method, body = null, requireAuth = false) {
        const headers = {
            'Content-Type': 'application/json',
            ...(requireAuth ? this.getAuthHeader() : {})
        };

        DebugLogger.log('info', `Sending request to ${endpoint} with body:`, body);

        try {
            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            DebugLogger.log('info', `Received response from ${endpoint}:`, response);

            if (!response.ok) {
                const errorData = await response.json();
                DebugLogger.error('API Request Failed', errorData);
                throw new APIError(
                    errorData.detail || 'Request failed', 
                    response.status, 
                    errorData
                );
            }

            return await response.json();
        } catch (error) {
            DebugLogger.error('API Request Failed', error);
            return {
                success: false,
                message: error.message || 'An unexpected error occurred'
            };
        }
    }

    static getAuthHeader() {
        const token = localStorage.getItem(CONFIG.STORAGE.ACCESS_TOKEN);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    static async login(email, password) {
        try {
            const data = await this.request('/auth/login', 'POST', { email, password });
            if (data.access_token) {
                this.storeAuthData(data);
                console.log('Login successful', data);
                window.location.href = '/dashboard.html'; // Redirect to dashboard after login
            }
            return data;
        } catch (error) {
            console.error('Login failed:', error.message || JSON.stringify(error));
            throw error;
        }
    }

    static storeAuthData(data) {
        localStorage.setItem(CONFIG.STORAGE.ACCESS_TOKEN, data.access_token);
        localStorage.setItem(CONFIG.STORAGE.TOKEN_TYPE, data.token_type);
        localStorage.setItem(CONFIG.STORAGE.USER_ID, data.user.id);
        localStorage.setItem(CONFIG.STORAGE.USER_CREATED_AT, data.user.created_at);
        localStorage.setItem(CONFIG.STORAGE.USER_IS_ACTIVE, data.user.is_active);
    }

    static async register(userData) {
        return this.request('/auth/register', 'POST', userData);
    }

    static async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await this.request(
                '/auth/refresh', 
                'POST', 
                { refresh_token: refreshToken }
            );

            if (!response.success) {
                throw new Error(response.message);
            }

            this.storeAuthData(response.data);
            return response.data.access_token;
        } catch (error) {
            DebugLogger.error('Token Refresh Failed', error);
            this.logout();
            return {
                success: false,
                message: error.message || 'Token refresh failed'
            };
        }
    }

    static logout() {
        // Clear all authentication-related local storage
        Object.values(CONFIG.STORAGE).forEach(key => 
            localStorage.removeItem(key)
        );
        window.location.href = '/login.html';
    }

    static isAuthenticated() {
        return !!localStorage.getItem(CONFIG.STORAGE.ACCESS_TOKEN);
    }
}

// The following function can be used to trigger login using the AuthService
async function loginUser(email, password) {
    try {
        const userData = await AuthService.login(email, password);
        // Handle further actions after successful login, such as redirection or UI updates
        console.log('User logged in:', userData);
    } catch (error) {
        console.error('Error during login:', error);
    }
}

