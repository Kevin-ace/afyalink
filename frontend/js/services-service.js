export class MedicalService {
    static BASE_URL = 'http://localhost:8000/services';

    static async getServices() {
        try {
            const response = await fetch(`${this.BASE_URL}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch services');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching services:', error);
            throw error;
        }
    }
} 