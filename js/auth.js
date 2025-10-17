// Authentication page JavaScript
import { auth, utils, checkAuthAndRedirect } from './supabase.js';

class AuthManager {
    constructor() {
        this.isLoginMode = true;
        this.init();
    }

    async init() {
        // Check if user is already authenticated and redirect
        await checkAuthAndRedirect();
        
        // Check URL parameters to determine mode
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('signup') === 'true') {
            this.switchToSignup();
        }
        
        this.bindEvents();
    }

    bindEvents() {
        // Form submissions
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const authToggle = document.getElementById('auth-toggle');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        if (authToggle) {
            authToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode();
            });
        }

        // Password toggle functionality
        this.setupPasswordToggles();

        // Password confirmation validation
        const confirmPassword = document.getElementById('confirm-password');
        const newPassword = document.getElementById('signup-password');
        
        if (confirmPassword && newPassword) {
            confirmPassword.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
            
            newPassword.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }


    }

    setupPasswordToggles() {
        const passwordToggles = document.querySelectorAll('.password-toggle');
        
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = toggle.dataset.target;
                const passwordInput = document.getElementById(targetId);
                const eyeIcon = toggle.querySelector('.eye-icon');
                const eyeOffIcon = toggle.querySelector('.eye-off-icon');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    eyeIcon.style.display = 'none';
                    eyeOffIcon.style.display = 'block';
                } else {
                    passwordInput.type = 'password';
                    eyeIcon.style.display = 'block';
                    eyeOffIcon.style.display = 'none';
                }
            });
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const submitButton = event.target.querySelector('button[type="submit"]');

        // Validate inputs
        if (!email || !password) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        if (!utils.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        // Show loading state
        utils.showLoading(submitButton);
        this.hideMessage();

        try {
            const result = await auth.signIn(email, password);
            
            if (result.success) {
                this.showMessage('Successfully signed in!', 'success');
                
                // Redirect to dashboard after a brief delay
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage('An unexpected error occurred. Please try again.', 'error');
            console.error('Login error:', error);
        } finally {
            utils.hideLoading(submitButton);
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const termsAccepted = formData.get('terms');
        const submitButton = event.target.querySelector('button[type="submit"]');

        // Validate inputs
        if (!username || !email || !password || !confirmPassword) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        if (username.length < 3 || username.length > 20) {
            this.showMessage('Username must be between 3 and 20 characters', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showMessage('Username can only contain letters, numbers, and underscores', 'error');
            return;
        }

        if (!utils.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (!termsAccepted) {
            this.showMessage('Please accept the Terms of Service', 'error');
            return;
        }

        // Show loading state
        utils.showLoading(submitButton);
        this.hideMessage();

        try {
            const result = await auth.signUp(email, password, username);
            
            if (result.success) {
                this.showMessage('Account created successfully! Please check your email to verify your account.', 'success');
                
                // Switch to login mode after successful signup
                setTimeout(() => {
                    this.switchToLogin();
                    this.showMessage('You can now sign in with your credentials', 'info');
                }, 3000);
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage('An unexpected error occurred. Please try again.', 'error');
            console.error('Signup error:', error);
        } finally {
            utils.hideLoading(submitButton);
        }
    }

    toggleAuthMode() {
        if (this.isLoginMode) {
            this.switchToSignup();
        } else {
            this.switchToLogin();
        }
    }

    switchToLogin() {
        this.isLoginMode = true;
        
        // Update UI elements
        document.getElementById('auth-title').textContent = 'Welcome Back';
        document.getElementById('auth-subtitle').textContent = 'Sign in to your account to continue';
        
        // Show/hide forms
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
        
        // Update toggle text
        document.getElementById('auth-switch-text').innerHTML = `
            Don't have an account? 
            <a href="#" id="auth-toggle" class="auth-link">Sign up</a>
        `;
        
        // Rebind the toggle event
        document.getElementById('auth-toggle').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode();
        });
        
        this.hideMessage();
        this.updateURL('login');
    }

    switchToSignup() {
        this.isLoginMode = false;
        
        // Update UI elements
        document.getElementById('auth-title').textContent = 'Create Account';
        document.getElementById('auth-subtitle').textContent = 'Sign up for a new account to get started';
        
        // Show/hide forms
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
        
        // Update toggle text
        document.getElementById('auth-switch-text').innerHTML = `
            Already have an account? 
            <a href="#" id="auth-toggle" class="auth-link">Sign in</a>
        `;
        
        // Rebind the toggle event
        document.getElementById('auth-toggle').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode();
        });
        
        this.hideMessage();
        this.updateURL('signup');
    }

    validatePasswordMatch() {
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const confirmInput = document.getElementById('confirm-password');

        if (confirmPassword && password !== confirmPassword) {
            confirmInput.setCustomValidity('Passwords do not match');
        } else {
            confirmInput.setCustomValidity('');
        }
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('auth-message');
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
    }

    hideMessage() {
        const messageEl = document.getElementById('auth-message');
        messageEl.style.display = 'none';
    }

    updateURL(mode) {
        const url = new URL(window.location);
        if (mode === 'signup') {
            url.searchParams.set('signup', 'true');
        } else {
            url.searchParams.delete('signup');
        }
        window.history.replaceState({}, '', url);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Add some additional validation styling
const validationStyle = document.createElement('style');
validationStyle.textContent = `
    .form-group input:invalid {
        border-color: var(--error);
    }
    
    .form-group input:valid {
        border-color: var(--success);
    }
    
    .form-group input:focus:invalid {
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
    
    .form-group input:focus:valid {
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }
    
    @media (max-width: 768px) {
        .auth-container {
            grid-template-columns: 1fr;
            padding: var(--space-md);
        }
        
        .auth-benefits {
            order: -1;
            margin-bottom: var(--space-lg);
        }
        
        .benefits-list li {
            flex-direction: column;
            text-align: center;
        }
        
        .benefit-icon {
            font-size: 2rem;
            margin-bottom: var(--space-sm);
        }
    }
`;
document.head.appendChild(validationStyle);
