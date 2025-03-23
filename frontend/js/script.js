import { AuthService } from './auth-service.js';
import { Utils } from './utils.js';
import { Logger } from './error.js';
import './leaflet-map.js'; 

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.querySelector('.close');
const loginForm = document.getElementById('loginForm');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const serviceFilter = document.getElementById('serviceFilter');
const insuranceFilter = document.getElementById('insuranceFilter');
const facilitiesList = document.getElementById('facilitiesList');

// Navigation and Page-Specific Initialization
const NavHandlers = {
    login() {
        const loginForm = document.getElementById('login-form');
        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await AuthService.login(email, password);
                if (response.success) {
                    AuthService.storeAuthData(response.data);
                    window.location.href = 'dashboard.html';
                } else {
                    Utils.displayError(`Login failed: ${response.message}`);
                }
            } catch (error) {
                Utils.displayError('Login failed');
            }
        });

        // Password visibility toggle
        const toggleLoginPassword = document.getElementById('toggle-login-password');
        const loginPasswordInput = document.getElementById('password');
        
        toggleLoginPassword?.addEventListener('click', () => {
            Utils.togglePasswordVisibility('password', toggleLoginPassword);
        });
    },

    register() {
        const registerForm = document.getElementById('register-form');
        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const userData = Object.fromEntries(formData.entries());
            
            try {
                const response = await AuthService.register(userData);
                if (response.success) {
                    window.location.href = 'login.html';
                } else {
                    Utils.displayError(`Registration failed: ${response.message}`);
                }
            } catch (error) {
                Utils.displayError('Registration failed');
            }
        });

        // Password visibility toggle
        const toggleRegisterPassword = document.getElementById('toggle-register-password');
        const registerPasswordInput = document.getElementById('register-password');
        
        toggleRegisterPassword?.addEventListener('click', () => {
            Utils.togglePasswordVisibility('register-password', toggleRegisterPassword);
        });
    },

    dashboard() {
        // Dashboard-specific initialization
        const logoutButton = document.getElementById('logout-button');
        logoutButton?.addEventListener('click', () => {
            AuthService.logout();
        });
    },

    map() {
        MapService.initMap();

        const addressSearchForm = document.getElementById('address-search-form');
        addressSearchForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const addressInput = document.getElementById('address-input');
            await MapService.geocodeAddress(addressInput.value);
        });
    }
};

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Determine current page and run corresponding handler
    const pageName = document.body.getAttribute('data-page');
    
    if (NavHandlers[pageName]) {
        NavHandlers[pageName]();
    }

    // Global event listeners or initializations can go here
    Logger.log(Logger.INFO, `Initialized page: ${pageName}`);
});

document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessages = document.getElementById('errorMessages');

    try {
        const response = await AuthService.login(email, password);
        if (response.access_token) {
            alert('Login successful!');
            AuthService.storeAuthData(response);
            window.location.href = 'dashboard.html';
        } else {
            errorMessages.classList.remove('d-none');
            errorMessages.innerHTML = response.message || 'Login failed';
        }
    } catch (error) {
        if (error.status === 422) {
            errorMessages.classList.remove('d-none');
            errorMessages.innerHTML = error.data.detail || 'Validation error';
        } else {
            alert(`Login failed: ${error.message || JSON.stringify(error.response.data)}`);
        }
    }
});

// Facility search handling
const handleFacilitySearch = async (searchTerm, filters = {}) => {
    try {
        // Construct query parameters
        const params = new URLSearchParams({
            name: searchTerm || '',
            limit: 50
        });

        if (filters.insurance) {
            params.append('insurance', filters.insurance);
        }

        if (filters.latitude && filters.longitude) {
            params.append('min_latitude', filters.latitude - 0.5); // Roughly 50km range
            params.append('max_latitude', filters.latitude + 0.5);
            params.append('min_longitude', filters.longitude - 0.5);
            params.append('max_longitude', filters.longitude + 0.5);
        }

        const response = await fetch(`http://localhost:8000/facilities/?${params}`);
        if (!response.ok) {
            throw new Error('Failed to fetch facilities');
        }

        const facilities = await response.json();
        return facilities;

    } catch (error) {
        console.error('Error searching facilities:', error);
        return [];
    }
};

// Add event listeners if elements exist
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('searchBtn');
    const specialtyFilter = document.getElementById('specialty-filter');
    const locationFilter = document.getElementById('location-filter');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const searchTerm = searchInput.value;
            const filters = {
                specialty: specialtyFilter?.value,
                location: locationFilter?.value
            };

            // Get user's location for geographic filtering
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        filters.latitude = position.coords.latitude;
                        filters.longitude = position.coords.longitude;
                        const facilities = await handleFacilitySearch(searchTerm, filters);
                        // Update UI with facilities (implement this based on your needs)
                        updateFacilitiesUI(facilities);
                    },
                    (error) => {
                        console.warn('Geolocation error:', error);
                        handleFacilitySearch(searchTerm, filters);
                    }
                );
            } else {
                const facilities = await handleFacilitySearch(searchTerm, filters);
                updateFacilitiesUI(facilities);
            }
        });
    }
});

function updateFacilitiesUI(facilities) {
    const facilitiesList = document.querySelector('.facility-grid');
    if (!facilitiesList) return;

    facilitiesList.innerHTML = facilities.map(facility => `
        <div class="facility-card" data-specialty="${facility.facility_type || ''}" data-location="${facility.location || ''}">
            <h2>${facility.facility_name}</h2>
            <p><i class="fas fa-map-marker-alt"></i> ${facility.location || 'Location N/A'}</p>
            <p><i class="fas fa-stethoscope"></i> Type: ${facility.facility_type || 'N/A'}</p>
            <p><i class="fas fa-hospital"></i> Agency: ${facility.agency || 'N/A'}</p>
            <div class="facility-details">
                <span class="badge">${facility.district || ''}</span>
                <span class="badge">${facility.province || ''}</span>
            </div>
            <a href="booking.html?facility=${facility.id}" class="btn">Book Consultation</a>
        </div>
    `).join('');
}

// DOM Elements and Event Handlers for Authentication
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = document.body.dataset.page;

    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMessages = document.getElementById('error-messages');
            
            try {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                const response = await AuthService.login(email, password);
                
                // Redirect to dashboard on successful login
                window.location.href = '/dashboard.html';
                
            } catch (error) {
                errorMessages.textContent = error.message;
                errorMessages.classList.remove('d-none');
            }
        });
    }

    // Registration Form Handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMessages = document.getElementById('error-messages');
            
            try {
                const formData = new FormData(registerForm);
                const userData = {
                    email: formData.get('email'),
                    password: formData.get('password'),
                    full_name: formData.get('full_name'),
                    phone_number: formData.get('phone_number')
                };

                await AuthService.register(userData);
                
                // Show success message and redirect to login
                alert('Registration successful! Please login.');
                window.location.href = '/login.html';
                
            } catch (error) {
                errorMessages.textContent = error.message;
                errorMessages.classList.remove('d-none');
            }
        });
    }

    // Logout Handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await AuthService.logout();
            } catch (error) {
                console.error('Logout failed:', error);
                // Force logout even if the request fails
                AuthService.clearAuthData();
                window.location.href = '/login.html';
            }
        });
    }

    // Protected Route Check
    const protectedPages = ['dashboard', 'facilities', 'booking'];
    if (protectedPages.includes(currentPage) && !AuthService.isAuthenticated()) {
        window.location.href = '/login.html';
    }
});

// Utils class for common functionality
class Utils {
    static displayError(message) {
        const errorMessages = document.getElementById('error-messages');
        if (errorMessages) {
            errorMessages.textContent = message;
            errorMessages.classList.remove('d-none');
        } else {
            console.error(message);
        }
    }

    static togglePasswordVisibility(inputId, toggleButton) {
        const input = document.getElementById(inputId);
        if (input.type === 'password') {
            input.type = 'text';
            toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
}

// Ensure this file is set up as a module
// Example content:
export function exampleFunction() {
    console.log('This is an example function.');
}

export { Utils };