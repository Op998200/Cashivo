// Authentication functions for Cashivo using Supabase

import { supabase } from './supabaseClient.js';

// Register a new user
async function registerUser(name, email, password) {
    const { user, error } = await supabase.auth.signUp({
        email: email,
        password: password
    }, {
        data: { full_name: name }
    });

    if (error) {
        throw new Error(error.message);
    }

    return user;
}

// Login user
async function loginUser(email, password) {
    const { user, error } = await supabase.auth.signIn({
        email: email,
        password: password
    });

    if (error) {
        throw new Error(error.message);
    }

    return user;
}

// Logout user
async function logoutUser() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Check if user is authenticated
function isAuthenticated() {
    return supabase.auth.getUser() !== null;
}

// Get current user
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Redirect to dashboard if user is already logged in
function redirectIfAuthenticated() {
    if (isAuthenticated() && (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html'))) {
        window.location.href = 'dashboard.html';
    }
}

// Redirect to login if user is not authenticated
function redirectIfNotAuthenticated() {
    if (!isAuthenticated() && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'login.html';
    }
}

// Initialize authentication checks
document.addEventListener('DOMContentLoaded', function() {
    redirectIfAuthenticated();

    // Handle registration form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Clear previous errors
            document.querySelectorAll('.error').forEach(el => el.textContent = '');

            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validation
            let isValid = true;

            if (!name) {
                document.getElementById('nameError').textContent = 'Name is required';
                isValid = false;
            }

            if (!email) {
                document.getElementById('emailError').textContent = 'Email is required';
                isValid = false;
            } else if (!validateEmail(email)) {
                document.getElementById('emailError').textContent = 'Please enter a valid email';
                isValid = false;
            }

            if (!password) {
                document.getElementById('passwordError').textContent = 'Password is required';
                isValid = false;
            } else if (password.length < 6) {
                document.getElementById('passwordError').textContent = 'Password must be at least 6 characters';
                isValid = false;
            }

            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
                isValid = false;
            }

            if (isValid) {
                try {
                    await registerUser(name, email, password);
                    window.location.href = 'dashboard.html';
                } catch (error) {
                    document.getElementById('emailError').textContent = error.message;
                }
            }
        });
    }

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Clear previous errors
            document.querySelectorAll('.error').forEach(el => el.textContent = '');

            // Get form values
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Validation
            let isValid = true;

            if (!email) {
                document.getElementById('emailError').textContent = 'Email is required';
                isValid = false;
            }

            if (!password) {
                document.getElementById('passwordError').textContent = 'Password is required';
                isValid = false;
            }

            if (isValid) {
                try {
                    await loginUser(email, password);
                    window.location.href = 'dashboard.html';
                } catch (error) {
                    document.getElementById('emailError').textContent = error.message;
                }
            }
        });
    }
});

// Utility function to validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export {
    registerUser,
    loginUser,
    logoutUser,
    isAuthenticated,
    getCurrentUser,
    redirectIfAuthenticated,
    redirectIfNotAuthenticated
};
