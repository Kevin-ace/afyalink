export class InsuranceService {
    static BASE_URL = 'http://localhost:8000/insurances';

    static async getInsurances() {
        try {
            const response = await fetch(`${this.BASE_URL}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch insurances');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching insurances:', error);
            throw error;
        }
    }
} 