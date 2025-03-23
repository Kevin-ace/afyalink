import { CONFIG } from './config.js';
import { APIError } from './error.js';
import { Logger } from './services/logger.js';

export class AuthService {
    static async request(endpoint, method, body = null, requireAuth = false) {
        const headers = new Headers({
            'Accept': 'application/json'
        });

        if (requireAuth) {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('Authentication token not found');
            }
            headers.append('Authorization', `Bearer ${token}`);
        }

        // For login endpoint, use URL-encoded form data
        if (endpoint === CONFIG.API.ENDPOINTS.AUTH.LOGIN) {
            headers.set('Content-Type', 'application/x-www-form-urlencoded');
        } else {
            headers.set('Content-Type', 'application/json');
        }

        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
                method,
                headers,
                body: body,
                mode: 'cors',
                credentials: 'include',
                cache: 'no-cache'
            });

            const data = await response.json();

            if (!response.ok) {
                // FastAPI returns error details in the response body
                const errorData = data.detail || data.error || data;
                throw new APIError(
                    errorData.message || errorData.detail || `Request failed with status ${response.status}`,
                    response.status,
                    errorData
                );
            }

            return data;
        } catch (error) {
            Logger.error('API Request Failed', error);
            throw error;
        }
    }

    static async register(userData) {
        try {
            Logger.log(Logger.INFO, 'Attempting registration', { email: userData.email });

            // Format the data according to FastAPI's UserRegistration model
            const registrationData = {
                username: userData.username,
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                id_number: userData.id_number,
                emergency_contact: userData.emergency_contact,
                insurance_details: userData.insurance_details,
                sha_details: userData.sha_details,
                password: userData.password
            };

            const response = await this.request(
                CONFIG.API.ENDPOINTS.AUTH.REGISTER,
                'POST',
                registrationData
            );

            // Ensure we have a user object in the response
            if (!response.id) {
                throw new Error('Invalid response format from server');
            }

            // Create a user object that matches our expected format
            const user = {
                id: response.id,
                username: response.username,
                email: response.email,
                first_name: response.first_name,
                last_name: response.last_name,
                id_number: response.id_number,
                emergency_contact: response.emergency_contact,
                insurance_details: response.insurance_details,
                sha_details: response.sha_details,
                is_active: response.is_active,
                created_at: response.created_at
            };

            // Store auth data
            this.storeAuthData({
                access_token: response.access_token,
                token_type: response.token_type,
                user: user
            });

            Logger.log(Logger.SUCCESS, 'Registration successful', { userId: response.id });
            return response;

        } catch (error) {
            // Handle FastAPI error response
            if (error instanceof APIError) {
                if (error.status === 409) {
                    const field = error.data?.field || 'unknown';
                    throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} is already in use`);
                }
                if (error.status === 422) {
                    const errors = error.data?.detail || [];
                    if (Array.isArray(errors)) {
                        const firstError = errors[0];
                        if (firstError?.loc?.length > 0) {
                            const field = firstError.loc[0];
                            throw new Error(`Invalid ${field}: ${firstError.msg}`);
                        }
                    }
                    throw new Error('Invalid request format. Please check your input.');
                }
            }
            Logger.log(Logger.ERROR, 'Registration failed', error);
            throw error;
        }
    }

    static async login(email, password) {
        try {
            Logger.log(Logger.INFO, 'Attempting login');

            // Format the data according to OAuth2PasswordRequestForm
            const loginData = new URLSearchParams({
                username: email,
                password: password,
                grant_type: 'password'
            }).toString();

            const response = await this.request(
                CONFIG.API.ENDPOINTS.AUTH.LOGIN,
                'POST',
                loginData,
                false
            );

            // Ensure we have a user object in the response
            if (!response.user) {
                throw new Error('Invalid response format from server');
            }

            // Store auth data
            this.storeAuthData(response);

            Logger.log(Logger.SUCCESS, 'Login successful', { userId: response.user.id });
            return response;

        } catch (error) {
            // Handle FastAPI error response
            if (error instanceof APIError) {
                if (error.status === 401) {
                    throw new Error('Invalid credentials. Please check your email and password.');
                }
                if (error.status === 422) {
                    const errors = error.data?.detail || [];
                    if (Array.isArray(errors)) {
                        const firstError = errors[0];
                        if (firstError?.loc?.length > 0) {
                            const field = firstError.loc[0];
                            throw new Error(`Invalid ${field}: ${firstError.msg}`);
                        }
                    }
                    throw new Error('Invalid request format. Please try again.');
                }
            }
            Logger.log(Logger.ERROR, 'Login failed', error);
            throw error;
        }
    }

    static async logout() {
        try {
            const response = await this.request(
                CONFIG.API.ENDPOINTS.AUTH.LOGOUT,
                'POST'
            );

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
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('expires_at', data.expires_at);
    }

    static clearAuthData() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('expires_at');
    }

    static getAuthToken() {
        return localStorage.getItem('token');
    }

    static isAuthenticated() {
        const token = localStorage.getItem('token');
        const expiresAt = localStorage.getItem('expires_at');
        return !!token && (!expiresAt || Date.now() < parseInt(expiresAt));
    }

    static getUser() {
        return JSON.parse(localStorage.getItem('user'));
    }

    static async getUserProfile() {
        try {
            Logger.log(Logger.INFO, 'Fetching user profile');
            
            const response = await this.request(
                CONFIG.API.ENDPOINTS.AUTH.PROFILE,
                'GET',
                null,
                true
            );

            const userData = await response;
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
            
            const response = await this.request(
                CONFIG.API.ENDPOINTS.AUTH.PROFILE_UPDATE,
                'PUT',
                data,
                true
            );

            const updatedData = await response;
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
            
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH.AVATAR}`, {
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

export default AuthService;