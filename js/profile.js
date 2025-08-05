// Profile page functionality for Cashivo

import { supabase } from './supabaseClient.js';
import { getCurrentUser, logoutUser } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Display user profile info
    document.getElementById('profileName').textContent = user.user_metadata?.full_name || '';
    document.getElementById('profileEmail').textContent = user.email;

    // Handle logout button
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
    });

    // Handle change password form submission
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous errors
            document.querySelectorAll('.error').forEach(el => el.textContent = '');

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            let isValid = true;

            if (!currentPassword) {
                document.getElementById('currentPasswordError').textContent = 'Current password is required';
                isValid = false;
            }

            if (!newPassword) {
                document.getElementById('newPasswordError').textContent = 'New password is required';
                isValid = false;
            } else if (newPassword.length < 6) {
                document.getElementById('newPasswordError').textContent = 'Password must be at least 6 characters';
                isValid = false;
            }

            if (newPassword !== confirmNewPassword) {
                document.getElementById('confirmNewPasswordError').textContent = 'Passwords do not match';
                isValid = false;
            }

            if (!isValid) return;

            try {
                // Supabase does not support password change via client SDK directly
                // Usually, password reset email is sent
                // Here, we simulate by sending password reset email
                const { error } = await supabase.auth.api.resetPasswordForEmail(user.email);
                if (error) throw error;
                alert('Password reset email sent. Please check your inbox.');
                changePasswordForm.reset();
            } catch (error) {
                alert('Error changing password: ' + error.message);
            }
        });
    }

    // Handle account deletion
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                return;
            }

            try {
                // Delete user data from transactions and categories tables
                await supabase.from('transactions').delete().eq('user_id', user.id);
                // Note: categories are shared, so not deleted

                // Delete user from auth
                const { error } = await supabase.auth.api.deleteUser(user.id);
                if (error) throw error;

                alert('Account deleted successfully.');
                window.location.href = 'index.html';
            } catch (error) {
                alert('Error deleting account: ' + error.message);
            }
        });
    }
});
