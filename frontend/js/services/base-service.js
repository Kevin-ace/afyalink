import { CONFIG } from '../config.js';
import { APIError, NetworkError, ValidationError } from '../error.js';
import { Logger } from './logger.js';

class BaseService {
    constructor() {
        this.API_BASE_URL = CONFIG.API.BASE_URL; 
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            Logger.error(`Error in request to ${endpoint}:`, error);
            throw error;
        }
    }

    async get(endpoint, options = {}) {
        return this.request(endpoint, { method: 'GET', ...options });
    }

    async post(endpoint, data, options = {}) {
        return this.request(endpoint, { 
            method: 'POST',
            body: JSON.stringify(data),
            ...options 
        });
    }

    async put(endpoint, data, options = {}) {
        return this.request(endpoint, { 
            method: 'PUT',
            body: JSON.stringify(data),
            ...options 
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { method: 'DELETE', ...options });
    }
}

export { BaseService };
