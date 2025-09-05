// MVP Login Script
// Handles simple email/password login and password reset link

import { supabase } from './supabaseClient.js';

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const loginLoading = document.getElementById('loginLoading');
const messages = document.getElementById('authMessages');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

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
  if (!loginButton || !loginLoading) return;
  loginButton.disabled = isLoading;
  loginLoading.style.display = isLoading ? 'inline-block' : 'none';
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage('Please enter your email and password', 'error');
    return;
  }

  try {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    showMessage('Login successful! Redirecting...', 'success');
    // Redirect to MVP dashboard
    setTimeout(() => {
      window.location.href = 'dashboard-mvp.html';
    }, 800);
  } catch (err) {
    showMessage(err.message || 'Login failed. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});

forgotPasswordLink?.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email) {
    showMessage('Enter your email above, then click Forgot Password again.', 'info');
    return;
  }
  try {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });
    if (error) throw error;
    showMessage('Password reset link sent. Check your email.', 'success');
  } catch (err) {
    showMessage(err.message || 'Could not send reset email.', 'error');
  } finally {
    setLoading(false);
  }
});

