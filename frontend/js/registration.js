import { AuthService } from './auth-service.js';
import { Logger } from './services/logger.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const submitButton = form.querySelector('button[type="submit"]');
    let originalButtonText = submitButton.innerHTML;

    // Add password strength indicator
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const strength = checkPasswordStrength(password);
        passwordStrength.textContent = getStrengthMessage(strength);
        passwordStrength.className = `password-strength ${getStrengthClass(strength)}`;
    });

    // Add password confirmation validation
    confirmPasswordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        if (password !== confirmPassword) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form data
        const userData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            email: document.getElementById('email').value,
            first_name: document.getElementById('firstName').value,
            last_name: document.getElementById('lastName').value,
            id_number: document.getElementById('idNumber').value,
            emergency_contact: document.getElementById('emergencyContact').value,
            insurance_details: document.getElementById('insuranceDetails').value || null,
            sha_details: document.getElementById('shaDetails').value || null
        };

        try {
            Logger.log(Logger.INFO, 'Form submission started');
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';

            // Call AuthService to register
            const response = await AuthService.register(userData);

            // Store auth data and redirect
            AuthService.storeAuthData(response);
            window.location.href = 'dashboard.html';

        } catch (error) {
            Logger.log(Logger.ERROR, 'Registration failed', error);
            
            // Show error message
            const errorMessages = document.getElementById('error-messages');
            errorMessages.classList.remove('d-none');
            errorMessages.textContent = error.message || 'Registration failed. Please try again.';

            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});

// Password strength checking functions
function checkPasswordStrength(password) {
    if (password.length < 8) return 0;
    let strength = 1;
    
    // Check for various password characteristics
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;

    return Math.min(strength, 4);
}

function getStrengthMessage(strength) {
    const messages = [
        'Very Weak: Must be at least 8 characters',
        'Weak: Add numbers or special characters',
        'Medium: Add uppercase letters',
        'Strong: Good password!'
    ];
    return messages[strength];
}

function getStrengthClass(strength) {
    const classes = ['text-danger', 'text-warning', 'text-info', 'text-success'];
    return classes[strength];
}
