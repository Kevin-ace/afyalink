export class FacilitiesService {
    static BASE_URL = 'http://localhost:8000/facilities';

    static async getFacilities() {
        try {
            const response = await fetch(`${this.BASE_URL}/facilities`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch facilities');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching facilities:', error);
            throw error;
        }
    }
} 