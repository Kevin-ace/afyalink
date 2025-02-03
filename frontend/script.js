// Authentication Service
const AUTH_API_BASE_URL = 'http://localhost:8000/auth';

class AuthService {
    static async login(email, password) {
        try {
            const response = await fetch(`${AUTH_API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: email,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('tokenType', data.token_type);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async register(
        username, 
        email, 
        firstName, 
        lastName, 
        idNumber, 
        emergencyContact, 
        password, 
        insuranceDetails = null, 
        shaDetails = null
    ) {
        try {
            // Detailed logging of registration attempt
            DebugLogger.log('Starting registration process', { 
                username, 
                email, 
                firstName, 
                lastName 
            });

            // Validate inputs before sending
            const passwordValidation = this.validatePassword(password);
            if (!passwordValidation.isValid) {
                throw new Error('Password validation failed: ' + passwordValidation.errors.join(', '));
            }

            // Prepare registration payload with optional fields
            const registrationPayload = {
                username,
                email,
                first_name: firstName,
                last_name: lastName,
                id_number: idNumber,
                emergency_contact: emergencyContact,
                password,
                // Only include optional fields if they have a value
                ...(insuranceDetails && { insurance_details: insuranceDetails }),
                ...(shaDetails && { sha_details: shaDetails })
            };

            const response = await fetch(`${AUTH_API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': this.generateRequestId()
                },
                body: JSON.stringify(registrationPayload)
            });

            // Log detailed response information
            DebugLogger.log('Registration Response', {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            });

            // Handle non-successful responses
            if (!response.ok) {
                const errorData = await response.json();
                DebugLogger.error('Registration failed', errorData);
                
                // Extract specific error details
                const errorMessage = 
                    errorData.detail?.message || 
                    errorData.detail || 
                    'Registration failed due to an unknown error';
                
                throw new Error(errorMessage);
            }

            // Process successful registration
            const data = await response.json();
            
            DebugLogger.log('Registration successful', { 
                userId: data.id, 
                createdAt: data.created_at 
            });

            // Store relevant user information
            localStorage.setItem('userId', data.id);
            localStorage.setItem('userCreatedAt', data.created_at);
            localStorage.setItem('userIsActive', data.is_active);

            return data;
        } catch (error) {
            DebugLogger.error('Complete registration error', error);
            
            // User-friendly error handling
            const userFriendlyMessage = this.mapErrorToUserMessage(error);
            
            // Optional: Display error to user
            this.displayRegistrationError(userFriendlyMessage);
            
            throw error;
        }
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('tokenType');
        window.location.href = 'login.html';
    }

    static isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    static getAuthHeader() {
        const token = localStorage.getItem('token');
        const tokenType = localStorage.getItem('tokenType') || 'Bearer';
        return token ? { 'Authorization': `${tokenType} ${token}` } : {};
    }

    static validatePassword(password) {
        const errors = [];

        // Minimum length
        if (password.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }

        // Uppercase letter
        if (!/[A-Z]/.test(password)) {
            errors.push("Password must contain at least one uppercase letter");
        }

        // Lowercase letter
        if (!/[a-z]/.test(password)) {
            errors.push("Password must contain at least one lowercase letter");
        }

        // Number
        if (!/\d/.test(password)) {
            errors.push("Password must contain at least one number");
        }

        // Special character
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push("Password must contain at least one special character");
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static generateRequestId() {
        return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    static mapErrorToUserMessage(error) {
        const errorMap = {
            'Username already exists': 'This username is already taken. Please choose another.',
            'Invalid email format': 'The email address you entered is not valid.',
            'Password too weak': 'Your password does not meet security requirements.',
            'Network Error': 'Unable to connect to the server. Please check your internet connection.'
        };

        for (const [key, message] of Object.entries(errorMap)) {
            if (error.message.includes(key)) {
                return message;
            }
        }

        return 'An unexpected error occurred during registration. Please try again.';
    }

    static displayRegistrationError(message) {
        const errorContainer = document.getElementById('registerError');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            errorContainer.style.color = 'red';
        }
    }
}

// Enhanced Debugging and Error Logging Service
class DebugLogger {
    static DEBUG_MODE = true;  // Toggle for debug mode

    static log(message, data = null, level = 'INFO') {
        if (!this.DEBUG_MODE) return;

        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        console.log(logMessage);
        
        if (data) {
            console.log('Additional Data:', JSON.stringify(data, null, 2));
        }
    }

    static error(message, error = null) {
        const timestamp = new Date().toISOString();
        const errorMessage = `[${timestamp}] [ERROR] ${message}`;
        
        console.error(errorMessage);
        
        if (error) {
            console.error('Error Details:', error);
            this.sendErrorToServer(message, error);
        }
    }

    static sendErrorToServer(message, error) {
        // Optional: Send error to a logging service or backend
        try {
            fetch(`${AUTH_API_BASE_URL}/log-error`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    error: error.toString(),
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            }).catch(console.error);
        } catch (logError) {
            console.error('Failed to log error to server', logError);
        }
    }
}

// Password Strength Validation
class PasswordValidator {
    static validatePassword(password) {
        const errors = [];

        // Minimum length
        if (password.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }

        // Uppercase letter
        if (!/[A-Z]/.test(password)) {
            errors.push("Password must contain at least one uppercase letter");
        }

        // Lowercase letter
        if (!/[a-z]/.test(password)) {
            errors.push("Password must contain at least one lowercase letter");
        }

        // Number
        if (!/\d/.test(password)) {
            errors.push("Password must contain at least one number");
        }

        // Special character
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push("Password must contain at least one special character");
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static displayPasswordErrors(errors, errorContainer) {
        if (errors.length > 0) {
            errorContainer.innerHTML = errors.map(error => `<p>${error}</p>`).join('');
            errorContainer.style.display = 'block';
            return false;
        }
        errorContainer.style.display = 'none';
        return true;
    }
}

// Enhanced Registration Form Validation and State Management
class RegistrationManager {
    constructor() {
        this.debounceTimers = {};
        this.initializeFormElements();
        this.setupProgressiveValidation();
    }

    initializeFormElements() {
        this.form = document.getElementById('registrationForm');
        this.submitButton = document.getElementById('registerSubmit');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.errorContainer = document.getElementById('registerError');

        // Input fields
        this.fields = {
            username: document.getElementById('registerUsername'),
            email: document.getElementById('registerEmail'),
            firstName: document.getElementById('firstName'),
            lastName: document.getElementById('lastName'),
            idNumber: document.getElementById('idNumber'),
            emergencyContact: document.getElementById('emergencyContact'),
            password: document.getElementById('registerPassword')
        };
    }

    setupProgressiveValidation() {
        Object.entries(this.fields).forEach(([key, element]) => {
            element.addEventListener('input', () => this.validateField(key));
            
            // Add debounce for username and email checks
            if (['username', 'email'].includes(key)) {
                element.addEventListener('input', () => this.debouncedUniqueCheck(key));
            }
        });
    }

    debouncedUniqueCheck(field) {
        clearTimeout(this.debounceTimers[field]);
        
        this.debounceTimers[field] = setTimeout(async () => {
            const value = this.fields[field].value.trim();
            
            if (!value) return;

            try {
                const response = await fetch(`${AUTH_API_BASE_URL}/check-${field}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ [field]: value })
                });

                const result = await response.json();
                
                if (!response.ok) {
                    this.showFieldError(field, result.detail.message);
                } else {
                    this.clearFieldError(field);
                }
            } catch (error) {
                console.error(`Error checking ${field}:`, error);
            }
        }, 500);  // 500ms debounce
    }

    validateField(field) {
        const value = this.fields[field].value.trim();
        let isValid = true;
        let errorMessage = '';

        switch(field) {
            case 'username':
                isValid = value.length >= 3 && value.length <= 50;
                errorMessage = 'Username must be 3-50 characters long';
                break;
            case 'email':
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                errorMessage = 'Invalid email format';
                break;
            case 'firstName':
            case 'lastName':
                isValid = value.length >= 2 && value.length <= 50;
                errorMessage = `${field === 'firstName' ? 'First' : 'Last'} name must be 2-50 characters`;
                break;
            case 'idNumber':
                isValid = value.length >= 5 && value.length <= 20;
                errorMessage = 'ID Number must be 5-20 characters';
                break;
            case 'emergencyContact':
                isValid = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(value);
                errorMessage = 'Invalid phone number';
                break;
            case 'password':
                const passwordValidation = PasswordValidator.validatePassword(value);
                isValid = passwordValidation.isValid;
                errorMessage = passwordValidation.errors.join(', ');
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.clearFieldError(field);
        }

        return isValid;
    }

    showFieldError(field, message) {
        const errorElement = document.getElementById(`${field}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            this.fields[field].classList.add('is-invalid');
        }
    }

    clearFieldError(field) {
        const errorElement = document.getElementById(`${field}Error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            this.fields[field].classList.remove('is-invalid');
        }
    }

    async handleRegistration(event) {
        event.preventDefault();
        
        // Reset previous errors
        this.errorContainer.textContent = '';
        this.errorContainer.style.display = 'none';

        // Validate all fields
        const isFormValid = Object.keys(this.fields).every(field => this.validateField(field));

        if (!isFormValid) {
            return;
        }

        // Start loading state
        this.startLoading();

        try {
            const registrationData = {
                username: this.fields.username.value.trim(),
                email: this.fields.email.value.trim(),
                first_name: this.fields.firstName.value.trim(),
                last_name: this.fields.lastName.value.trim(),
                id_number: this.fields.idNumber.value.trim(),
                emergency_contact: this.fields.emergencyContact.value.trim(),
                password: this.fields.password.value
            };

            const response = await AuthService.register(registrationData);
            
            // Handle successful registration
            this.handleSuccessfulRegistration(response);
        } catch (error) {
            this.handleRegistrationError(error);
        } finally {
            this.stopLoading();
        }
    }

    startLoading() {
        this.submitButton.disabled = true;
        this.loadingIndicator.style.display = 'block';
        Object.values(this.fields).forEach(field => field.disabled = true);
    }

    stopLoading() {
        this.submitButton.disabled = false;
        this.loadingIndicator.style.display = 'none';
        Object.values(this.fields).forEach(field => field.disabled = false);
    }

    handleSuccessfulRegistration(response) {
        // Redirect or show success message
        window.location.href = '/dashboard';
    }

    handleRegistrationError(error) {
        if (error.response && error.response.detail) {
            const { error: errorCode, message, field } = error.response.detail;
            
            // Show specific field error or general error
            if (field && this.fields[field]) {
                this.showFieldError(field, message);
            } else {
                this.errorContainer.textContent = message;
                this.errorContainer.style.display = 'block';
            }
        } else {
            this.errorContainer.textContent = 'An unexpected error occurred. Please try again.';
            this.errorContainer.style.display = 'block';
        }
    }
}

// Initialize registration manager
const registrationManager = new RegistrationManager();

// Attach event listener to registration form
const registrationForm = document.getElementById('registrationForm');
if (registrationForm) {
    registrationForm.addEventListener('submit', (event) => 
        registrationManager.handleRegistration(event)
    );
}

// Existing DOM Elements and Event Listeners
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const toggleLoginPassword = document.getElementById('toggleLoginPassword');
const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');

// Form Toggle
loginBtn.addEventListener('click', () => {
    loginBtn.classList.add('active');
    registerBtn.classList.remove('active');
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    // Add slide animation
    loginForm.style.animation = 'slideUp 0.5s ease-out';
});

registerBtn.addEventListener('click', () => {
    registerBtn.classList.add('active');
    loginBtn.classList.remove('active');
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    // Add slide animation
    registerForm.style.animation = 'slideUp 0.5s ease-out';
});

// Password Toggle
function togglePasswordVisibility(inputId, toggleBtn) {
    const input = document.getElementById(inputId);
    const icon = toggleBtn.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

toggleLoginPassword.addEventListener('click', () => 
    togglePasswordVisibility('loginPassword', toggleLoginPassword));
toggleRegisterPassword.addEventListener('click', () => 
    togglePasswordVisibility('registerPassword', toggleRegisterPassword));

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorContainer = document.getElementById('loginError');

    try {
        await AuthService.login(email, password);
        // Use relative path
        window.location.href = 'dashboard.html';
    } catch (error) {
        errorContainer.textContent = error.message;
        errorContainer.style.display = 'block';
    }
});

// Logout Functionality
function handleLogout() {
    AuthService.logout();
}

// Export for potential use in other scripts
window.AuthService = AuthService;

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('token');
    if (authToken && window.location.pathname.includes('./login.html')) {
        window.location.href = './dashboard.html';
    }
});

// Global variables for map and facilities
let map;
let healthFacilities = [];
let markers = [];

// Initialize the map
function initMap() {
  // Default to Nairobi coordinates
  const defaultLocation = { lat: -1.2921, lng: 36.8219 };
  
  map = new google.maps.Map(document.getElementById('map'), {
    center: defaultLocation,
    zoom: 10,
    mapTypeId: 'roadmap'
  });

  // Load health facilities
  loadHealthFacilities();

  // Setup location search
  const locationSearch = document.getElementById('location-search');
  const searchButton = document.getElementById('search-location');
  
  searchButton.addEventListener('click', () => {
    const address = locationSearch.value;
    geocodeAddress(address);
  });

  // Try to get user's current location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        map.setCenter(userLocation);
        
        // Add a marker for user's location
        new google.maps.Marker({
          position: userLocation,
          map: map,
          title: 'Your Location',
          icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        });
      },
      () => {
        console.log('Error: The Geolocation service failed.');
      }
    );
  }
}

// Geocode an address and center the map
function geocodeAddress(address) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: address }, (results, status) => {
    if (status === 'OK') {
      map.setCenter(results[0].geometry.location);
      map.setZoom(12);
      
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      markers = [];

      // Render facilities near the searched location
      renderNearbyFacilities(
        results[0].geometry.location.lat(), 
        results[0].geometry.location.lng()
      );
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}

// Load health facilities from CSV
async function loadHealthFacilities() {
  try {
    const response = await fetch('http://localhost:8000/health-facilities-csv');
    const csvText = await response.text();
    
    // Parse CSV (simple implementation)
    const rows = csvText.split('\n').slice(1); // Skip header
    healthFacilities = rows
      .map(row => {
        const columns = row.split(',');
        return {
          name: columns[2],
          latitude: parseFloat(columns[12]),
          longitude: parseFloat(columns[13])
        };
      })
      .filter(facility => 
        !isNaN(facility.latitude) && 
        !isNaN(facility.longitude)
      );

    // Render initial facilities
    renderNearbyFacilities(-1.2921, 36.8219);
  } catch (error) {
    console.error('Error loading health facilities:', error);
  }
}

// Render facilities near a given location
function renderNearbyFacilities(lat, lng, radius = 50) {
  // Clear existing markers
  markers.forEach(marker => marker.setMap(null));
  markers = [];

  // Filter facilities within radius (approximately)
  const nearbyFacilities = healthFacilities.filter(facility => {
    const distance = calculateDistance(lat, lng, facility.latitude, facility.longitude);
    return distance <= radius; // km
  });

  // Create markers for nearby facilities
  nearbyFacilities.forEach(facility => {
    const marker = new google.maps.Marker({
      position: { lat: facility.latitude, lng: facility.longitude },
      map: map,
      title: facility.name,
      icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<h6>${facility.name}</h6>`
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    markers.push(marker);
  });

  console.log(`Found ${nearbyFacilities.length} facilities near the location`);
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

// Initialize map when the page loads
window.onload = initMap;

document.addEventListener('DOMContentLoaded', () => {
    // Daily Health Tips
    const healthTips = [
        "Drink at least 8 glasses of water daily to stay hydrated.",
        "Get 7-9 hours of sleep each night for optimal health.",
        "Incorporate 30 minutes of physical activity into your daily routine.",
        "Eat a balanced diet rich in fruits, vegetables, and whole grains.",
        "Practice stress management techniques like meditation or deep breathing.",
        "Maintain good hand hygiene to prevent the spread of infections.",
        "Regular health check-ups can help detect potential issues early.",
        "Limit processed foods and focus on whole, nutritious meals.",
        "Stay socially connected - good relationships support mental health.",
        "Take breaks and stretch if you have a sedentary job.",
        "Protect your skin from sun damage by using sunscreen daily.",
        "Practice good posture to prevent back and neck strain.",
        "Include protein in every meal to support muscle health.",
        "Reduce sugar and salt intake for better overall health.",
        "Stay mentally active by learning new skills or solving puzzles."
    ];

    // Update Daily Health Tip
    const healthTipElement = document.getElementById('daily-health-tip');
    if (healthTipElement) {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        healthTipElement.textContent = healthTips[dayOfYear % healthTips.length];
    }

    // Active Page and Dropdown Handling
    const navHandlers = {
        activePageHighlight: () => {
            const currentPath = location.pathname;
            document.querySelectorAll('.navbar .nav-link').forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === currentPath);
            });
        },
        dropdownFunctionality: () => {
            const actionMap = {
                'Find Hospitals': () => alert('Hospital Finder Coming Soon!'),
                'Book Appointment': () => alert('Appointment Booking Coming Soon!'),
                'BMI Calculator': () => alert('BMI Calculator Coming Soon!'),
                'Emergency Services': () => alert('Emergency Services Coming Soon!'),
                'Medication Tracker': () => alert('Medication Tracker Coming Soon!'),
                'Health Diary': () => alert('Health Diary Coming Soon!')
            };

            document.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    const action = actionMap[item.textContent];
                    action && action();
                });
            });
        }
    };

    // Initialize Navigation Handlers
    Object.values(navHandlers).forEach(handler => handler());

    // New Form Submission Handlers
    const bookingForm = document.querySelector('.booking-form');
    
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const formData = new FormData(bookingForm);
            const bookingData = {
                serviceType: formData.get('service-type'),
                preferredDate: formData.get('preferred-date'),
                preferredTime: formData.get('preferred-time'),
                patientName: formData.get('patient-name'),
                patientEmail: formData.get('patient-email'),
                patientPhone: formData.get('patient-phone')
            };

            try {
                const response = await fetch('/api/book-appointment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bookingData)
                });

                if (response.ok) {
                    alert('Appointment booked successfully!');
                    bookingForm.reset();
                } else {
                    const errorData = await response.json();
                    alert(`Booking failed: ${errorData.message}`);
                }
            } catch (error) {
                console.error('Booking error:', error);
                alert('An error occurred while booking your appointment.');
            }
        });
    }

    // Add active page highlighting
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});