import { BaseService } from './services/base-service.js';
import { CONFIG } from './config.js';
import { ValidationError } from './error.js';
import { Logger } from './services/logger.js';

export class FacilitiesService extends BaseService {
    static async getFacilities(page = 1, limit = 20) {
        try {
            const response = await this.get(`${CONFIG.API.ENDPOINTS.FACILITIES.LIST}`, {
                params: {
                    page: page.toString(),
                    limit: limit.toString()
                }
            });
            return response.data;
        } catch (error) {
            Logger.error('Error fetching facilities:', error);
            throw error;
        }
    }

    static async getNearbyFacilities(latitude, longitude, radius = CONFIG.MAP.SEARCH_RADIUS) {
        this.validateCoordinates(latitude, longitude);
        this.validateRadius(radius);

        try {
            const response = await this.get(`${CONFIG.API.ENDPOINTS.FACILITIES.NEARBY}`, {
                params: {
                    latitude: latitude.toString(),
                    longitude: longitude.toString(),
                    radius: radius.toString(),
                    include_details: 'true',
                    include_insurances: 'true'
                }
            });
            Logger.debug('Fetching nearby facilities', { latitude, longitude, radius });
            return response.data;
        } catch (error) {
            Logger.error('Error fetching nearby facilities:', error);
            throw error;
        }
    }

    static async searchFacilities(query, filters = {}, page = 1, limit = 20) {
        if (!query && Object.keys(filters).length === 0) {
            throw new ValidationError('Search requires either a query or filters');
        }

        try {
            const response = await this.get(`${CONFIG.API.ENDPOINTS.FACILITIES.SEARCH}`, {
                params: {
                    q: query,
                    page: page.toString(),
                    limit: limit.toString(),
                    ...filters
                }
            });
            Logger.debug('Searching facilities', { query, filters, page, limit });
            return response.data;
        } catch (error) {
            Logger.error('Error searching facilities:', error);
            throw error;
        }
    }

    static async getFacilityDetails(facilityId) {
        if (!facilityId) {
            throw new ValidationError('Facility ID is required');
        }

        try {
            const response = await this.get(`${CONFIG.API.ENDPOINTS.FACILITIES.DETAILS(facilityId)}`);
            return response.data;
        } catch (error) {
            Logger.error(`Failed to get facility details for ID: ${facilityId}`, error);
            throw error;
        }
    }

    static async getSpecialties() {
        try {
            const response = await this.get(`${CONFIG.API.ENDPOINTS.FACILITIES.SPECIALTIES}`);
            return response.data;
        } catch (error) {
            Logger.error('Error fetching specialties:', error);
            throw error;
        }
    }

    static validateCoordinates(latitude, longitude) {
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            throw new ValidationError('Latitude and longitude must be numbers');
        }

        if (latitude < -90 || latitude > 90) {
            throw new ValidationError('Latitude must be between -90 and 90 degrees');
        }

        if (longitude < -180 || longitude > 180) {
            throw new ValidationError('Longitude must be between -180 and 180 degrees');
        }
    }

    static validateRadius(radius) {
        if (typeof radius !== 'number' || radius <= 0) {
            throw new ValidationError('Radius must be a positive number');
        }

        if (radius > CONFIG.MAP.MAX_SEARCH_RADIUS) {
            throw new ValidationError(`Radius cannot exceed ${CONFIG.MAP.MAX_SEARCH_RADIUS} meters`);
        }
    }
}