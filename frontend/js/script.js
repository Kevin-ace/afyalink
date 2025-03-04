import { AuthService } from './auth-service.js';
import { MapService } from './map-service.js';
import { Utils } from './utils.js';
import { DebugLogger } from './error.js';
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
    DebugLogger.log(`Initialized page: ${pageName}`);
});