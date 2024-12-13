document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector(".menu-toggle");
    const menu = document.querySelector(".menu");
  
    menuToggle.addEventListener("click", () => {
      menu.classList.toggle("show");
    });
  });
  
  // DOM Elements
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

// Form Validation
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && 
           hasNumbers && hasSpecialChar;
}

// Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
        // Here you would typically make an API call to your backend
        // For now, we'll simulate a successful login
        console.log('Logging in...', { email, rememberMe });
        
        // Store auth token (in real app, this would come from your backend)
        if (rememberMe) {
            localStorage.setItem('authToken', 'dummy-token');
        } else {
            sessionStorage.setItem('authToken', 'dummy-token');
        }
        
        // Redirect to dashboard
        window.location.href = './dashboard.html';
    } catch (error) {
        console.error('Login failed:', error);
        // Show error message to user
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('registerEmail').value,
        idNumber: document.getElementById('idNumber').value,
        emergencyContact: document.getElementById('emergencyContact').value,
        insurance: document.getElementById('insurance').value,
        sha: document.getElementById('sha').value,
        password: document.getElementById('registerPassword').value
    };

    if (!validatePassword(formData.password)) {
        alert('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters');
        return;
    }

    try {
        // Here you would typically make an API call to your backend
        console.log('Registering user...', formData);
        
        // Redirect to dashboard after successful registration
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Registration failed:', error);
        // Show error message to user
    }
});

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (authToken && window.location.pathname.includes('./login.html')) {
        window.location.href = './dashboard.html';
    }
});

// Logout functionality
function handleLogout() {
    // Clear authentication tokens
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    
    // Redirect to login page
    window.location.href = './login.html';
}