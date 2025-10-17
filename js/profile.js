// Advanced Profile Management JavaScript
import { auth, database, storage, utils, checkAuthAndRedirect, supabase } from './supabase.js';

class AdvancedProfileManager {
    constructor() {
        this.currentUser = null;
        this.userProfile = {};
        this.userSecurity = {};
        this.accountSummary = {};
        this.init();
    }

    async init() {
        const session = await checkAuthAndRedirect();
        if (!session) return;
        
        this.currentUser = session.user;
        await this.loadUserData();
        await this.loadProfileData();
        await this.loadAccountSummary();
        this.bindEvents();
        this.updateUI();
    }

    async loadUserData() {
        const userEmail = document.getElementById('user-email');
        const userInitial = document.getElementById('user-initial');
        const profileEmail = document.getElementById('profile-email');
        const profileInitial = document.getElementById('profile-initial');
        const profileAvatarImg = document.getElementById('profile-avatar-img');
        const currentEmail = document.getElementById('current-email');

        const email = this.currentUser.email;
        let displayName = email.split('@')[0];
        let initial = email.charAt(0).toUpperCase();

        // Try to get username from profile
        try {
            const profileResult = await database.getUserProfile(this.currentUser.id);
            if (profileResult.success && profileResult.data && profileResult.data.length > 0) {
                const profile = profileResult.data[0]; // Get first profile record
                this.userProfile = profile; // Store the loaded profile

                displayName = profile.username || email.split('@')[0];
                initial = displayName.charAt(0).toUpperCase();

                // Handle avatar display
                if (profile.avatar_url) {
                    profileAvatarImg.src = profile.avatar_url;
                    profileAvatarImg.style.display = 'block';
                    profileInitial.style.display = 'none';
                } else {
                    profileAvatarImg.style.display = 'none';
                    profileInitial.style.display = 'block';
                }
            } else {
                // No profile found, use defaults
                displayName = email.split('@')[0];
                initial = displayName.charAt(0).toUpperCase();
                profileAvatarImg.style.display = 'none';
                profileInitial.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading user profile for display:', error);
            // Fallback on error
            displayName = email.split('@')[0];
            initial = displayName.charAt(0).toUpperCase();
            if (profileAvatarImg) profileAvatarImg.style.display = 'none';
            if (profileInitial) profileInitial.style.display = 'block';
        }

        if (userEmail) userEmail.textContent = email;
        if (userInitial) userInitial.textContent = initial;
        if (profileEmail) profileEmail.textContent = displayName; // Show username instead of email
        if (profileInitial) profileInitial.textContent = initial;
        if (currentEmail) currentEmail.textContent = email;
    }

    async loadProfileData() {
        try {
            // Load user profile
            const profileResult = await this.getUserProfile();
            if (profileResult.success && profileResult.data && profileResult.data.length > 0) {
                this.userProfile = profileResult.data[0];
            } else {
                // Create default profile if none exists
                console.log('No existing profile found, creating default profile');
                await this.createDefaultProfile();
            }

            // Load security settings (optional - won't break if table doesn't exist)
            try {
                const securityResult = await this.getUserSecurity();
                if (securityResult.success && securityResult.data && securityResult.data.length > 0) {
                    this.userSecurity = securityResult.data[0];
                } else {
                    // Create basic security record
                    this.userSecurity = {
                        last_password_change: this.currentUser.created_at || new Date().toISOString()
                    };
                }
            } catch (secError) {
                console.log('Security table not available, using defaults');
                this.userSecurity = {
                    last_password_change: this.currentUser.created_at || new Date().toISOString()
                };
            }

            // Update member since date
            const memberDate = document.getElementById('member-date');
            if (memberDate && this.currentUser.created_at) {
                const createdDate = new Date(this.currentUser.created_at);
                memberDate.textContent = createdDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                });
            }

        } catch (error) {
            console.error('Error loading profile data:', error);
            // Don't show error toast for missing tables - just use defaults
            this.userProfile = {
                currency_code: 'USD',
                date_format: 'MM/DD/YYYY',
                email_notifications: true,
                dark_mode: true
            };
            this.userSecurity = {
                last_password_change: this.currentUser.created_at || new Date().toISOString()
            };
        }
    }

    async loadAccountSummary() {
        try {
            // Load comprehensive account summary
            const [summaryResult, transactionsResult, categoriesResult] = await Promise.all([
                database.getFinancialSummary(this.currentUser.id),
                database.getTransactions(this.currentUser.id, { limit: 1 }),
                this.getUniqueCategories()
            ]);

            if (summaryResult.success) {
                this.accountSummary = summaryResult.data;
            }

            // Update profile stats
            this.updateProfileStats(transactionsResult, categoriesResult);

        } catch (error) {
            console.error('Error loading account summary:', error);
        }
    }

    async getUserProfile() {
        // Use the database function from supabase.js
        return await database.getUserProfile(this.currentUser.id);
    }

    async getUserSecurity() {
        try {
            const { data, error } = await supabase
                .from('user_security')
                .select('*')
                .eq('user_id', this.currentUser.id);

            return { success: !error, data, error: error?.message };
        } catch (error) {
            return { success: false, data: [], error: error.message };
        }
    }

    async createDefaultProfile() {
        try {
            // Try with only user_id first (absolute minimum)
            const { data, error } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: this.currentUser.id
                })
                .select();

            if (!error && data && data.length > 0) {
                this.userProfile = data[0];
                console.log('Default profile created successfully');
            } else {
                console.warn('Could not create profile:', error);
                // Use in-memory profile if database insert fails
                this.userProfile = {
                    user_id: this.currentUser.id,
                    username: null,
                    currency_code: 'USD',
                    date_format: 'MM/DD/YYYY',
                    email_notifications: true,
                    dark_mode: true
                };
            }
        } catch (error) {
            console.log('Profile table not available, using in-memory profile');
            // Use in-memory profile if table doesn't exist
            this.userProfile = {
                user_id: this.currentUser.id,
                username: null,
                currency_code: 'USD',
                date_format: 'MM/DD/YYYY',
                email_notifications: true,
                dark_mode: true
            };
        }
    }

    async getUniqueCategories() {
        const result = await database.getTransactions(this.currentUser.id, { limit: 1000 });
        if (result.success) {
            const categories = new Set();
            result.data.forEach(transaction => categories.add(transaction.category));
            return { success: true, count: categories.size };
        }
        return { success: false, count: 0 };
    }

    updateProfileStats(transactionsResult, categoriesResult) {
        const profileTransactions = document.getElementById('profile-transactions');
        const profileCategories = document.getElementById('profile-categories');
        const profileDays = document.getElementById('profile-days');
        const totalTracked = document.getElementById('total-tracked');
        const receiptsStored = document.getElementById('receipts-stored');
        const topCategory = document.getElementById('top-category');
        const topCategoryAmount = document.getElementById('top-category-amount');

        // Transaction count
        if (profileTransactions) {
            profileTransactions.textContent = this.accountSummary.transactionCount || 0;
        }

        // Categories used
        if (profileCategories) {
            profileCategories.textContent = categoriesResult.count || 0;
        }

        // Days active (calculate from first transaction to now)
        if (profileDays) {
            const joinDate = new Date(this.currentUser.created_at);
            const now = new Date();
            const daysActive = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
            profileDays.textContent = daysActive;
        }

        // Total tracked amount
        if (totalTracked) {
            const total = (this.accountSummary.totalIncome || 0) + (this.accountSummary.totalExpenses || 0);
            totalTracked.textContent = utils.formatCurrency(total);
        }

        // Receipts stored (placeholder)
        // if (receiptsStored) {
        //     receiptsStored.textContent = Math.floor(Math.random() * 50); // Placeholder
        // }

        // Top category (would need category breakdown)
        // if (topCategory) {
        //     topCategory.textContent = 'Food & Dining'; // Placeholder
        // }
        // if (topCategoryAmount) {
        //     topCategoryAmount.textContent = utils.formatCurrency(Math.random() * 1000); // Placeholder
        // }
    }

    updateUI() {
        // Update preferences form
        const currencySelect = document.getElementById('currency-select');
        const dateFormatSelect = document.getElementById('date-format-select');
        const notificationsEnabled = document.getElementById('notifications-enabled');
        const darkModeEnabled = document.getElementById('dark-mode-enabled');

        if (currencySelect) {
            currencySelect.value = this.userProfile.currency || 'USD';
        }

        if (dateFormatSelect) {
            dateFormatSelect.value = this.userProfile.date_format || 'MM/DD/YYYY';
        }

        // if (notificationsEnabled) {
        //     notificationsEnabled.checked = this.userProfile.email_notifications !== false;
        // }

        // if (darkModeEnabled) {
        //     darkModeEnabled.checked = this.userProfile.dark_mode !== false;
        // }

        // Update security info
        const passwordLastChanged = document.getElementById('password-last-changed');
        const lastBackup = document.getElementById('last-backup');

        if (passwordLastChanged && this.userSecurity.last_password_change) {
            const changeDate = new Date(this.userSecurity.last_password_change);
            passwordLastChanged.textContent = changeDate.toLocaleDateString();
        }

        if (lastBackup) {
            lastBackup.textContent = 'Never'; // Placeholder
        }
    }

    bindEvents() {
        // Save preferences
        const savePreferencesBtn = document.getElementById('save-preferences-btn');
        if (savePreferencesBtn) {
            savePreferencesBtn.addEventListener('click', () => this.savePreferences());
        }

        // Change password
        const changePasswordBtn = document.getElementById('change-password-btn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => this.showChangePasswordModal());
        }

        // Export data
        const exportDataBtn = document.getElementById('export-data-btn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportUserData());
        }

        // Delete account
        const deleteAccountBtn = document.getElementById('delete-account-btn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.showDeleteAccountModal());
        }

        // Edit username
        const editUsernameBtn = document.getElementById('edit-username-btn');
        if (editUsernameBtn) {
            editUsernameBtn.addEventListener('click', () => this.showEditUsernameModal());
        }

        // Edit avatar
        const editAvatarBtn = document.getElementById('edit-avatar-btn');
        if (editAvatarBtn) {
            editAvatarBtn.addEventListener('click', () => this.showEditAvatarModal());
        }

        // Password modal events
        this.bindPasswordModalEvents();

        // Delete account modal events
        this.bindDeleteAccountModalEvents();

        // Edit username modal events
        this.bindEditUsernameModalEvents();

        // Edit avatar modal events
        this.bindEditAvatarModalEvents();

        // User menu
        this.setupUserMenu();

        // Logout
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // Password toggle functionality
        this.setupPasswordToggles();

        // Mobile navigation
        this.setupMobileNavigation();
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
                
                if (passwordInput && eyeIcon && eyeOffIcon) {
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        eyeIcon.style.display = 'none';
                        eyeOffIcon.style.display = 'block';
                    } else {
                        passwordInput.type = 'password';
                        eyeIcon.style.display = 'block';
                        eyeOffIcon.style.display = 'none';
                    }
                }
            });
        });
    }

    setupMobileNavigation() {
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
        }
    }

    bindPasswordModalEvents() {
        const passwordModal = document.getElementById('password-modal');
        const closePasswordModal = document.getElementById('close-password-modal');
        const cancelPasswordChange = document.getElementById('cancel-password-change');
        const changePasswordForm = document.getElementById('change-password-form');

        if (closePasswordModal) {
            closePasswordModal.addEventListener('click', () => this.hidePasswordModal());
        }

        if (cancelPasswordChange) {
            cancelPasswordChange.addEventListener('click', () => this.hidePasswordModal());
        }

        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }

        // Close modal when clicking outside
        if (passwordModal) {
            passwordModal.addEventListener('click', (e) => {
                if (e.target === passwordModal) {
                    this.hidePasswordModal();
                }
            });
        }
    }

    bindDeleteAccountModalEvents() {
        const deleteAccountModal = document.getElementById('delete-account-modal');
        const closeDeleteAccountModal = document.getElementById('close-delete-account-modal');
        const cancelAccountDeletion = document.getElementById('cancel-account-deletion');
        const confirmAccountDeletion = document.getElementById('confirm-account-deletion');
        const deleteConfirmation = document.getElementById('delete-confirmation');

        if (closeDeleteAccountModal) {
            closeDeleteAccountModal.addEventListener('click', () => this.hideDeleteAccountModal());
        }

        if (cancelAccountDeletion) {
            cancelAccountDeletion.addEventListener('click', () => this.hideDeleteAccountModal());
        }

        if (confirmAccountDeletion) {
            confirmAccountDeletion.addEventListener('click', () => this.handleAccountDeletion());
        }

        if (deleteConfirmation) {
            deleteConfirmation.addEventListener('input', (e) => {
                const confirmBtn = document.getElementById('confirm-account-deletion');
                if (confirmBtn) {
                    confirmBtn.disabled = e.target.value !== 'DELETE';
                }
            });
        }

        // Close modal when clicking outside
        if (deleteAccountModal) {
            deleteAccountModal.addEventListener('click', (e) => {
                if (e.target === deleteAccountModal) {
                    this.hideDeleteAccountModal();
                }
            });
        }
    }

    setupUserMenu() {
        const userMenuButton = document.getElementById('user-menu-button');
        const userDropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');

        if (userMenuButton && userDropdown) {
            userMenuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = userDropdown.style.display === 'block';
                userDropdown.style.display = isVisible ? 'none' : 'block';
            });

            document.addEventListener('click', () => {
                userDropdown.style.display = 'none';
            });

            userDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    async savePreferences() {
        const saveBtn = document.getElementById('save-preferences-btn');
        utils.showLoading(saveBtn);

        try {
            const updateData = {
                currency: document.getElementById('currency-select')?.value,
                date_format: document.getElementById('date-format-select')?.value,
                // email_notifications: document.getElementById('notifications-enabled')?.checked,
                // dark_mode: document.getElementById('dark-mode-enabled')?.checked
            };

            const { error } = await supabase
                .from('user_profiles')
                .update(formData)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            // Update local profile data
            Object.assign(this.userProfile, updateData);
            
            utils.showToast('Preferences saved successfully!', 'success');

        } catch (error) {
            console.error('Error saving preferences:', error);
            utils.showToast('Failed to save preferences', 'error');
        } finally {
            utils.hideLoading(saveBtn);
        }
    }

    showChangePasswordModal() {
        const modal = document.getElementById('password-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Clear form
            const form = document.getElementById('change-password-form');
            if (form) form.reset();
        }
    }

    hidePasswordModal() {
        const modal = document.getElementById('password-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async handlePasswordChange(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmNewPassword = formData.get('confirmNewPassword');
        const submitButton = event.target.querySelector('button[type="submit"]');

        // Validate passwords
        if (newPassword.length < 6) {
            utils.showToast('New password must be at least 6 characters', 'error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            utils.showToast('New passwords do not match', 'error');
            return;
        }

        utils.showLoading(submitButton);

        try {
            // Note: In a real implementation, you'd want to verify the current password first
            const result = await auth.changePassword(newPassword);

            if (result.success) {
                utils.showToast('Password changed successfully!', 'success');
                this.hidePasswordModal();
                
                // Update security record
                await supabase
                    .from('user_security')
                    .update({ last_password_change: new Date().toISOString() })
                    .eq('user_id', this.currentUser.id);

                // Reload security data
                await this.loadProfileData();
                this.updateUI();
            } else {
                utils.showToast(result.error, 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            utils.showToast('Failed to change password', 'error');
        } finally {
            utils.hideLoading(submitButton);
        }
    }

    async exportUserData() {
        const exportBtn = document.getElementById('export-data-btn');
        utils.showLoading(exportBtn);

        try {
            // Get all user data
            const [transactionsResult, profileResult] = await Promise.all([
                database.getTransactions(this.currentUser.id, { limit: 10000 }),
                this.getUserProfile()
            ]);

            const exportData = {
                profile: this.userProfile,
                summary: this.accountSummary,
                transactions: transactionsResult.success ? transactionsResult.data : [],
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            // Create and download JSON file
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `cashivo-export-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            
            utils.showToast('Data exported successfully!', 'success');

            // Log export event
            await this.logDataExport();

        } catch (error) {
            console.error('Error exporting data:', error);
            utils.showToast('Failed to export data', 'error');
        } finally {
            utils.hideLoading(exportBtn);
        }
    }

    async logDataExport() {
        try {
            await supabase
                .from('data_exports')
                .insert({
                    user_id: this.currentUser.id,
                    export_type: 'all_data',
                    format: 'json',
                    status: 'completed'
                });
        } catch (error) {
            console.error('Error logging export:', error);
        }
    }

    showDeleteAccountModal() {
        const modal = document.getElementById('delete-account-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Clear form
            const confirmationInput = document.getElementById('delete-confirmation');
            if (confirmationInput) {
                confirmationInput.value = '';
            }
            const confirmBtn = document.getElementById('confirm-account-deletion');
            if (confirmBtn) {
                confirmBtn.disabled = true;
            }
        }
    }

    hideDeleteAccountModal() {
        const modal = document.getElementById('delete-account-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async handleAccountDeletion() {
        const confirmBtn = document.getElementById('confirm-account-deletion');
        const confirmation = document.getElementById('delete-confirmation')?.value;

        if (confirmation !== 'DELETE') {
            utils.showToast('Please type DELETE to confirm', 'error');
            return;
        }

        utils.showLoading(confirmBtn);

        try {
            // In a real implementation, this would trigger a server-side account deletion process
            // For now, we'll just sign out and show a message
            utils.showToast('Account deletion requested. You will be contacted within 24 hours.', 'info');
            
            // Sign out the user
            await auth.signOut();
            window.location.href = '/';

        } catch (error) {
            console.error('Error requesting account deletion:', error);
            utils.showToast('Failed to process deletion request', 'error');
        } finally {
            utils.hideLoading(confirmBtn);
        }
    }

    async handleLogout() {
        try {
            const result = await auth.signOut();
            if (result.success) {
                window.location.href = '/';
            } else {
                utils.showToast('Error signing out', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            utils.showToast('Error signing out', 'error');
        }
    }

    showEditUsernameModal() {
        const modal = document.getElementById('edit-username-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Pre-fill current username
            const usernameInput = document.getElementById('edit-username');
            if (usernameInput) {
                usernameInput.value = this.userProfile.username || '';
            }
        }
    }

    hideEditUsernameModal() {
        const modal = document.getElementById('edit-username-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    bindEditUsernameModalEvents() {
        const editUsernameModal = document.getElementById('edit-username-modal');
        const closeEditUsernameModal = document.getElementById('close-edit-username-modal');
        const cancelEditUsername = document.getElementById('cancel-edit-username');
        const editUsernameForm = document.getElementById('edit-username-form');

        if (closeEditUsernameModal) {
            closeEditUsernameModal.addEventListener('click', () => this.hideEditUsernameModal());
        }

        if (cancelEditUsername) {
            cancelEditUsername.addEventListener('click', () => this.hideEditUsernameModal());
        }

        if (editUsernameForm) {
            editUsernameForm.addEventListener('submit', (e) => this.handleUsernameUpdate(e));
        }

        // Close modal when clicking outside
        if (editUsernameModal) {
            editUsernameModal.addEventListener('click', (e) => {
                if (e.target === editUsernameModal) {
                    this.hideEditUsernameModal();
                }
            });
        }
    }

    async handleUsernameUpdate(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const newUsername = formData.get('username').trim();
        const submitButton = event.target.querySelector('button[type="submit"]');

        // Validate username
        if (!newUsername) {
            utils.showToast('Username cannot be empty', 'error');
            return;
        }

        if (newUsername.length < 3 || newUsername.length > 30) {
            utils.showToast('Username must be 3-30 characters', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            utils.showToast('Username can only contain letters, numbers, and underscores', 'error');
            return;
        }

        utils.showLoading(submitButton);

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ username: newUsername })
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            // Update local profile data
            this.userProfile.username = newUsername;

            // Update UI
            const profileEmail = document.getElementById('profile-email');
            if (profileEmail) {
                profileEmail.textContent = newUsername;
            }

            const profileInitial = document.getElementById('profile-initial');
            if (profileInitial) {
                profileInitial.textContent = newUsername.charAt(0).toUpperCase();
            }

            utils.showToast('Username updated successfully!', 'success');
            this.hideEditUsernameModal();

        } catch (error) {
            console.error('Error updating username:', error);
            utils.showToast('Failed to update username', 'error');
        } finally {
            utils.hideLoading(submitButton);
        }
    }

    showEditAvatarModal() {
        const modal = document.getElementById('edit-avatar-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadCurrentAvatar();
        }
    }

    hideEditAvatarModal() {
        const modal = document.getElementById('edit-avatar-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    bindEditAvatarModalEvents() {
        const editAvatarModal = document.getElementById('edit-avatar-modal');
        const closeEditAvatarModal = document.getElementById('close-edit-avatar-modal');
        const cancelEditAvatar = document.getElementById('cancel-edit-avatar');
        const saveAvatarBtn = document.getElementById('save-avatar-btn');
        const chooseAvatarBtn = document.getElementById('choose-avatar-btn');
        const removeAvatarBtn = document.getElementById('remove-avatar-btn');
        const avatarFileInput = document.getElementById('avatar-file-input');

        if (closeEditAvatarModal) {
            closeEditAvatarModal.addEventListener('click', () => this.hideEditAvatarModal());
        }

        if (cancelEditAvatar) {
            cancelEditAvatar.addEventListener('click', () => this.hideEditAvatarModal());
        }

        if (saveAvatarBtn) {
            saveAvatarBtn.addEventListener('click', () => this.handleAvatarUpdate());
        }

        if (chooseAvatarBtn) {
            chooseAvatarBtn.addEventListener('click', () => {
                if (avatarFileInput) avatarFileInput.click();
            });
        }

        if (removeAvatarBtn) {
            removeAvatarBtn.addEventListener('click', () => this.removeAvatar());
        }

        if (avatarFileInput) {
            avatarFileInput.addEventListener('change', (e) => this.handleAvatarFileSelect(e));
        }

        // Close modal when clicking outside
        if (editAvatarModal) {
            editAvatarModal.addEventListener('click', (e) => {
                if (e.target === editAvatarModal) {
                    this.hideEditAvatarModal();
                }
            });
        }
    }

    loadCurrentAvatar() {
        const currentAvatarPreview = document.getElementById('current-avatar-preview');
        const currentAvatarInitial = document.getElementById('current-avatar-initial');
        const removeAvatarBtn = document.getElementById('remove-avatar-btn');
        const displayName = this.userProfile.username || this.currentUser.email.split('@')[0];

        if (this.userProfile.avatar_url) {
            currentAvatarPreview.src = this.userProfile.avatar_url;
            currentAvatarPreview.style.display = 'block';
            currentAvatarInitial.style.display = 'none';
        } else {
            currentAvatarPreview.style.display = 'none';
            currentAvatarInitial.textContent = displayName.charAt(0).toUpperCase();
            currentAvatarInitial.style.display = 'none';
        }

        if (removeAvatarBtn) {
            removeAvatarBtn.style.display = this.userProfile.avatar_url ? 'inline-flex' : 'none';
        }
    }

    handleAvatarFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            utils.showToast('Please select an image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            utils.showToast('Image size must be less than 5MB', 'error');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const newAvatarPreview = document.getElementById('new-avatar-preview');
            const avatarPreviewSection = document.querySelector('.avatar-preview-section');
            const saveAvatarBtn = document.getElementById('save-avatar-btn');

            if (newAvatarPreview) {
                newAvatarPreview.src = e.target.result;
            }
            if (avatarPreviewSection) {
                avatarPreviewSection.style.display = 'block';
            }
            if (saveAvatarBtn) {
                saveAvatarBtn.disabled = false;
            }
        };
        reader.readAsDataURL(file);

        this.selectedAvatarFile = file;
    }

    async handleAvatarUpdate() {
        if (!this.selectedAvatarFile) {
            utils.showToast('Please select an image first', 'error');
            return;
        }

        const saveAvatarBtn = document.getElementById('save-avatar-btn');
        utils.showLoading(saveAvatarBtn);

        try {
            // Upload to Supabase Storage
            const fileExt = this.selectedAvatarFile.name.split('.').pop();
            const fileName = `${this.currentUser.id}/avatar-${Date.now()}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('receipts') // Using 'receipts' bucket as per README
                .upload(fileName, this.selectedAvatarFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;
            
            // Get public URL
            const { data: { publicUrl } } = await supabase.storage
                .from('receipts')
                .getPublicUrl(fileName);

            // Update profile
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ avatar_url: publicUrl })
                .eq('user_id', this.currentUser.id);

            if (updateError) throw updateError;

            // Update local profile data
            this.userProfile.avatar_url = publicUrl;

            // Update UI
            const profileAvatarImg = document.getElementById('profile-avatar-img');
            if (profileAvatarImg) {
                profileAvatarImg.src = publicUrl;
                profileAvatarImg.style.borderRadius = '50%';
                profileAvatarImg.style.width = '80px';
                profileAvatarImg.style.height = '80px';
                profileAvatarImg.style.objectFit = 'cover';
                profileAvatarImg.style.display = 'block';
            }
            const profileInitial = document.getElementById('profile-initial');
            if (profileInitial) profileInitial.style.display = 'none';

            utils.showToast('Avatar updated successfully!', 'success');
            this.hideEditAvatarModal();
        } catch (error) {
            console.error('Error updating avatar:', error);
            utils.showToast('Failed to update avatar', 'error');
        } finally {
            utils.hideLoading(saveAvatarBtn);
        }
    }

    async removeAvatar() {
        const removeAvatarBtn = document.getElementById('remove-avatar-btn');
        utils.showLoading(removeAvatarBtn);

        try {
            // Remove from storage if URL exists
            if (this.userProfile.avatar_url) {
                const url = new URL(this.userProfile.avatar_url);
                const pathParts = url.pathname.split('/storage/v1/object/public/receipts/');
                if (pathParts.length > 1) {
                    const filePath = pathParts[1];
                    await supabase.storage
                        .from('receipts')
                        .remove([filePath]);
                }
            }

            // Update profile (storage error is not critical)
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ avatar_url: null })
                .eq('user_id', this.currentUser.id);

            if (updateError) throw updateError;

            // Update local profile data
            this.userProfile.avatar_url = null;

            // Update UI
            const profileAvatarImg = document.getElementById('profile-avatar-img');
            const profileInitial = document.getElementById('profile-initial');

            if (profileAvatarImg) {
                profileAvatarImg.src = '';
                profileAvatarImg.style.display = 'none';
            }
            if (profileInitial) {
                profileInitial.textContent = (this.userProfile.username || this.currentUser.email.split('@')[0]).charAt(0).toUpperCase();
                profileInitial.style.display = 'flex';
            }
            
            this.loadCurrentAvatar(); // Refresh modal view

            utils.showToast('Avatar removed successfully!', 'success');
            this.hideEditAvatarModal();

        } catch (error) {
            console.error('Error removing avatar:', error);
            utils.showToast('Failed to remove avatar', 'error');
        } finally {
            utils.hideLoading(removeAvatarBtn);
        }
    }

    // Feature placeholders for future implementation
    async setup2FA() {
        utils.showToast('Two-factor authentication coming soon!', 'info');
    }

    async backupData() {
        utils.showToast('Automatic backup coming soon!', 'info');
    }
}

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new AdvancedProfileManager();
});

// Add profile-specific styling
const profileStyle = document.createElement('style');
profileStyle.textContent = `
    .profile-avatar {
        position: relative;
    }
    .edit-avatar-btn {
        position: absolute;
        bottom: 0;
        right: 0;
        background-color: var(--bg-card);
        border: 2px solid var(--border-primary);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--transition);
        color: var(--text-primary);
    }
    .profile-avatar {
        transition: var(--transition);
    }
    
    .profile-avatar:hover {
        transform: scale(1.05);
    }
    
    .setting-item:hover {
        background-color: var(--bg-hover);
    }
    
    .summary-item:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }
    
    .warning-box {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
    }
    
    .preferences-form .form-group {
        transition: var(--transition);
    }
    
    .preferences-form .form-group:hover {
        background-color: var(--bg-hover);
        padding: var(--space-md);
        border-radius: var(--radius-md);
        margin: var(--space-sm);
    }
    
    .logout-card {
        transition: var(--transition);
    }
    
    .logout-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
    }
    
    @media (max-width: 768px) {
        .profile-header {
            flex-direction: column;
            text-align: center;
            gap: var(--space-lg);
        }
        
        .profile-stats {
            justify-content: center;
            flex-wrap: wrap;
            gap: var(--space-md);
        }
        
        .profile-grid {
            grid-template-columns: 1fr;
        }
        
        .summary-stats {
            grid-template-columns: 1fr;
        }
    }
`;
document.head.appendChild(profileStyle);
