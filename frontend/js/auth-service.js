import { CONFIG } from './config.js';
import { APIError } from './error.js';
import { DebugLogger } from './error.js';

export class AuthService {
    static BASE_URL = 'http://localhost:8000/auth';

    static async request(endpoint, method, body = null, requireAuth = false) {
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });

        if (requireAuth) {
            const token = localStorage.getItem('access_token');
            if (token) {
                headers.append('Authorization', `Bearer ${token}`);
            }
        }

        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null,
                mode: 'cors',
                credentials: 'include',
                cache: 'no-cache'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new APIError(
                    errorData.detail || 'Request failed',
                    response.status,
                    errorData
                );
            }

            return await response.json();
        } catch (error) {
            DebugLogger.error('API Request Failed', error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(
                'Network error',
                500,
                { detail: error.message }
            );
        }
    }

    static async login(email, password) {
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const response = await fetch(`${this.BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: formData,
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            this.storeAuthData(data);
            window.location.href = '/dashboard.html'; // Redirect after successful login
            return data;

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async register(userData) {
        try {
            const response = await fetch(`${this.BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(userData),
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }

            const data = await response.json();
            window.location.href = '/login.html'; // Redirect to login after successful registration
            return data;

        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    static async logout() {
        try {
            const response = await fetch(`${this.BASE_URL}/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Logout failed');
            }

            this.clearAuthData();
            window.location.href = '/login.html';

        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    static storeAuthData(data) {
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
    }

    static clearAuthData() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
    }

    static getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    static isAuthenticated() {
        return !!this.getAuthToken();
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