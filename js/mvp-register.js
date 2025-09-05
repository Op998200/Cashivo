// MVP Registration Script
// Handles simple email/password registration with validation

import { supabase } from './supabaseClient.js';

const form = document.getElementById('registerForm');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const registerButton = document.getElementById('registerButton');
const registerLoading = document.getElementById('registerLoading');
const messages = document.getElementById('authMessages');

function showMessage(text, type = 'info') {
  if (!messages) return;
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(() => div.classList.add('show'), 100);
  setTimeout(() => {
    div.classList.remove('show');
    setTimeout(() => div.remove(), 300);
  }, 3500);
}

function setLoading(isLoading) {
  if (!registerButton || !registerLoading) return;
  registerButton.disabled = isLoading;
  registerLoading.style.display = isLoading ? 'inline-block' : 'none';
}

function validateForm() {
  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!fullName) {
    showMessage('Please enter your full name', 'error');
    return false;
  }

  if (!email) {
    showMessage('Please enter your email address', 'error');
    return false;
  }

  if (!email.includes('@') || !email.includes('.')) {
    showMessage('Please enter a valid email address', 'error');
    return false;
  }

  if (!password || password.length < 6) {
    showMessage('Password must be at least 6 characters long', 'error');
    return false;
  }

  if (password !== confirmPassword) {
    showMessage('Passwords do not match', 'error');
    return false;
  }

  return true;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    setLoading(true);

    // Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          display_name: fullName
        }
      }
    });

    if (error) throw error;

    if (data.user && !data.user.email_confirmed_at) {
      showMessage('Please check your email and click the confirmation link to activate your account.', 'success');
    } else {
      showMessage('Account created successfully! Redirecting to dashboard...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard-mvp.html';
      }, 1500);
    }

  } catch (err) {
    console.error('Registration error:', err);
    showMessage(err.message || 'Registration failed. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});

// Real-time password validation
passwordInput?.addEventListener('input', () => {
  const password = passwordInput.value;
  const helpText = document.querySelector('.password-help');
  
  if (password.length > 0 && password.length < 6) {
    helpText.style.color = 'var(--error-color)';
    helpText.textContent = `${password.length}/6 characters minimum`;
  } else if (password.length >= 6) {
    helpText.style.color = 'var(--success-color)';
    helpText.textContent = '✓ Strong password';
  } else {
    helpText.style.color = 'var(--text-muted)';
    helpText.textContent = 'Minimum 6 characters';
  }
});

// Real-time confirm password validation
confirmPasswordInput?.addEventListener('input', () => {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  if (confirmPassword.length > 0) {
    const isMatching = password === confirmPassword;
    confirmPasswordInput.style.borderColor = isMatching ? 'var(--success-color)' : 'var(--error-color)';
  } else {
    confirmPasswordInput.style.borderColor = 'var(--border-color)';
  }
});
