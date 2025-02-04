import { CONFIG } from './config.js';
import { ValidationError } from './error.js';

export const Utils = {
    validatePassword(password) {
        const errors = [];
        const { VALIDATION } = CONFIG;

        if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
            errors.push(`Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters long`);
        }

        if (VALIDATION.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            errors.push("Password must contain at least one uppercase letter");
        }

        if (VALIDATION.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
            errors.push("Password must contain at least one lowercase letter");
        }

        if (VALIDATION.PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) {
            errors.push("Password must contain at least one number");
        }

        return { 
            isValid: errors.length === 0, 
            errors 
        };
    },

    displayError(message, container = null) {
        const errorContainer = container || document.getElementById('error-container');
        
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorContainer.textContent = '';
                errorContainer.style.display = 'none';
            }, 5000);
        } else {
            console.error(message);
        }
    },

    togglePasswordVisibility(inputId, toggleBtn) {
        const passwordInput = document.getElementById(inputId);
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Toggle icon or text
        toggleBtn.textContent = type === 'password' ? 'Show' : 'Hide';
    },

    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    geocodeAddress(address) {
        // Placeholder for geocoding functionality
        // In a real-world scenario, this would use a geocoding service
        return new Promise((resolve, reject) => {
            // Simulated geocoding
            if (!address) {
                reject(new Error('Invalid address'));
                return;
            }

            // Mock coordinates (replace with actual geocoding logic)
            resolve({
                lat: Math.random() * 90,
                lng: Math.random() * 180
            });
        });
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c;
    },

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }
};