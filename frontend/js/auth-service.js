import { CONFIG } from './config.js';
import { APIError } from './error.js';
import { DebugLogger } from './error.js';
import { Logger } from './services/logger.js';

export class AuthService {
    static BASE_URL = 'http://localhost:8000/auth';

    static async request(endpoint, method, body = null, requireAuth = false) {
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });

        if (requireAuth) {
            const token = this.getAuthToken();
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
            Logger.error('API Request Failed', error);
            throw error;
        }
    }

    static async login(email, password) {
        try {
            Logger.log(Logger.INFO, 'Attempting login', { email });
            
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
            
            Logger.log(Logger.SUCCESS, 'Login successful', { userId: data.user.id });
            window.location.href = 'http://localhost:63342/afyalink/frontend/templates/dashboard.html';
            return data;

        } catch (error) {
            Logger.log(Logger.ERROR, 'Login failed', error);
            throw error;
        }
    }

    static async register(userData) {
        try {
            Logger.log(Logger.INFO, 'Attempting registration', { email: userData.email });

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
            Logger.log(Logger.SUCCESS, 'Registration successful', { email: userData.email });
            window.location.href = 'http://localhost:63342/afyalink/frontend/templates/login.html';
            return data;

        } catch (error) {
            Logger.log(Logger.ERROR, 'Registration failed', error);
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
        Logger.log(Logger.INFO, 'Auth data stored in localStorage');
    }

    static clearAuthData() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        Logger.log(Logger.INFO, 'Auth data cleared from localStorage');
    }

    static getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    static isAuthenticated() {
        return !!this.getAuthToken();
    }

    static async getUserProfile() {
        try {
            Logger.log(Logger.INFO, 'Fetching user profile');
            
            const response = await fetch(`${this.BASE_URL}/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch profile');
            }

            const userData = await response.json();
            Logger.log(Logger.SUCCESS, 'Profile fetched successfully');
            return userData;

        } catch (error) {
            Logger.log(Logger.ERROR, 'Error fetching profile', error);
            throw error;
        }
    }

    static async updateProfile(data) {
        try {
            Logger.log(Logger.INFO, 'Updating user profile', data);
            
            const response = await fetch(`${this.BASE_URL}/profile/update`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update profile');
            }

            const updatedData = await response.json();
            Logger.log(Logger.SUCCESS, 'Profile updated successfully');
            return updatedData;

        } catch (error) {
            Logger.log(Logger.ERROR, 'Error updating profile', error);
            throw error;
        }
    }

    static async updateAvatar(formData) {
        try {
            Logger.log(Logger.INFO, 'Uploading new avatar');
            
            const response = await fetch(`${this.BASE_URL}/profile/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                    // Note: Don't set Content-Type header when sending FormData
                },
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to upload avatar');
            }

            const data = await response.json();
            Logger.log(Logger.SUCCESS, 'Avatar updated successfully');
            return data;

        } catch (error) {
            Logger.log(Logger.ERROR, 'Error uploading avatar', error);
            throw error;
        }
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