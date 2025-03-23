import { BaseService } from './services/base-service.js';
import { CONFIG } from './config.js';
import { ValidationError } from './error.js';
import { Logger } from './services/logger.js';

export class InsuranceService extends BaseService {
    static async getInsurances(page = 1, limit = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        return this.request(`${CONFIG.API.ENDPOINTS.INSURANCE.LIST}?${params}`);
    }

    static async getInsuranceDetails(insuranceId) {
        if (!insuranceId) {
            throw new ValidationError('Insurance ID is required');
        }

        try {
            return await this.request(CONFIG.API.ENDPOINTS.INSURANCE.DETAILS(insuranceId));
        } catch (error) {
            Logger.error(`Failed to get insurance details for ID: ${insuranceId}`, error);
            throw error;
        }
    }

    static async getInsuranceFacilities(insuranceId, page = 1, limit = 20) {
        if (!insuranceId) {
            throw new ValidationError('Insurance ID is required');
        }

        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });

        try {
            Logger.debug('Fetching insurance facilities', { insuranceId, page, limit });
            return await this.request(`${CONFIG.API.ENDPOINTS.INSURANCE.FACILITIES(insuranceId)}?${params}`);
        } catch (error) {
            Logger.error(`Failed to get facilities for insurance ID: ${insuranceId}`, error);
            throw error;
        }
    }

    static async searchInsurances(query, filters = {}, page = 1, limit = 20) {
        if (!query && Object.keys(filters).length === 0) {
            throw new ValidationError('Search requires either a query or filters');
        }

        const params = new URLSearchParams({
            q: query,
            page: page.toString(),
            limit: limit.toString(),
            ...filters
        });

        Logger.debug('Searching insurances', { query, filters, page, limit });
        return this.request(`${CONFIG.API.ENDPOINTS.INSURANCE.SEARCH}?${params}`);
    }
}