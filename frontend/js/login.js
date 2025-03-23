import { AuthService } from './auth-service.js';
import { Logger } from './services/logger.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const errorMessages = document.getElementById('error-messages');
    const submitButton = form.querySelector('button[type="submit"]');
    let originalButtonText = submitButton.innerHTML;

    // Add password visibility toggle
    document.getElementById('toggle-password')?.addEventListener('click', (e) => {
        const passwordInput = document.getElementById('password');
        const icon = e.currentTarget.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            // Get form data
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            Logger.log(Logger.INFO, 'Form submission started');
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in...';

            // Call AuthService to login
            const response = await AuthService.login(email, password);

            // Redirect to dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            Logger.log(Logger.ERROR, 'Login failed', error);
            
            // Show error message
            errorMessages.classList.remove('d-none');
            errorMessages.textContent = error.message || 'Login failed. Please try again.';

            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});
