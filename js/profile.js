// Enhanced Profile page functionality for Cashivo

import { supabase } from './supabaseClient.js';
import { getCurrentUser, logoutUser } from './auth.js';
import { uploadUserAvatar, getUserAvatarUrl, deleteUserAvatar, validateFile } from './storage.js';
import { getUserTransactions, calculateTotals, getCategories, saveTransaction, formatCurrency, formatDate } from './utils.js';
import { getUserBudgets } from './budget-utils.js';

// Profile data
let currentUser = null;
let userPreferences = null;
let profileCompletion = 0;

// Initialize profile page
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Load all profile data
        await loadProfileData();
        await loadUserPreferences();
        await loadAccountStatistics();
        await loadRecentActivity();
        await loadFinancialInsights();
        setupEventListeners();
        updateProfileCompletion();

        console.log('Enhanced profile page loaded successfully');
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Error loading profile data', 'error');
    }
});

// Load and display profile data
async function loadProfileData() {
    // Display basic user info
    document.getElementById('profileDisplayName').textContent =
        currentUser.user_metadata?.full_name || 'User';
    document.getElementById('profileEmailDisplay').textContent = currentUser.email;
    document.getElementById('email').value = currentUser.email;
    document.getElementById('fullName').value =
        currentUser.user_metadata?.full_name || '';

    // Load and display avatar (only header avatar now)
    const avatarUrl = currentUser.user_metadata?.avatar_url || getUserAvatarUrl(currentUser.id);
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) {
        headerAvatar.src = avatarUrl || '/assets/default-avatar.png';
        headerAvatar.onerror = () => {
            headerAvatar.src = '/assets/default-avatar.png';
        };
    }

    // Display member since date
    const memberSince = new Date(currentUser.created_at).toLocaleDateString();
    document.getElementById('memberSinceDate').textContent = memberSince;

    // Populate timezone options
    populateTimezoneOptions();
}

// Load user preferences
async function loadUserPreferences() {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        userPreferences = data || {
            currency: 'INR',
            date_format: 'DD/MM/YYYY',
            theme: 'light',
            language: 'en',
            budget_alerts: true,
            goal_alerts: true,
            notifications_enabled: false,
            sound_enabled: true,
            push_notifications: false
        };

        // Populate form with current preferences
        document.getElementById('currency').value = userPreferences.currency || 'INR';
        document.getElementById('dateFormat').value = userPreferences.date_format || 'DD/MM/YYYY';
        document.getElementById('theme').value = userPreferences.theme || 'light';
        document.getElementById('language').value = userPreferences.language || 'en';
        document.getElementById('budgetAlerts').checked = userPreferences.budget_alerts !== false;
        document.getElementById('goalAlerts').checked = userPreferences.goal_alerts !== false;
        document.getElementById('emailNotifications').checked = userPreferences.notifications_enabled === true;
        document.getElementById('soundEnabled').checked = userPreferences.sound_enabled !== false;
        document.getElementById('pushNotifications').checked = userPreferences.push_notifications === true;

        // Apply theme
        applyTheme(userPreferences.theme || 'light');
    } catch (error) {
        console.error('Error loading preferences:', error);
        showToast('Error loading preferences', 'error');
    }
}

// Load account statistics
async function loadAccountStatistics() {
    try {
        // Get transaction statistics
        const transactions = await getUserTransactions();
        const totals = await calculateTotals();

        document.getElementById('totalTransactionCount').textContent = transactions.length;
        document.getElementById('totalIncomeAmount').textContent = formatCurrency(totals.income);
        document.getElementById('totalExpensesAmount').textContent = formatCurrency(totals.expenses);

        // Calculate monthly balance
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const monthlyIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const monthlyExpenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const monthlyBalance = monthlyIncome - monthlyExpenses;
        document.getElementById('monthlyBalance').textContent = formatCurrency(monthlyBalance);

        // Calculate average monthly spending
        const userMonths = Math.max(1, Math.ceil((new Date() - new Date(currentUser.created_at)) / (1000 * 60 * 60 * 24 * 30)));
        const avgMonthlySpending = totals.expenses / userMonths;
        document.getElementById('avgMonthlySpending').textContent = formatCurrency(avgMonthlySpending);

        // Calculate savings rate
        const totalIncome = totals.income;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totals.expenses) / totalIncome * 100) : 0;
        document.getElementById('savingsRate').textContent = `${savingsRate.toFixed(1)}%`;

        // Get budget count
        try {
            const budgets = await getUserBudgets();
            const activeBudgets = budgets.filter(b => b.is_active);
            document.getElementById('activeBudgetsCount').textContent = activeBudgets.length;
        } catch (error) {
            document.getElementById('activeBudgetsCount').textContent = '0';
        }

        // Get goals count
        try {
            const { data: goals, error } = await supabase
                .from('financial_goals')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('is_completed', false);

            if (!error) {
                document.getElementById('activeGoalsCount').textContent = goals.length;
            }
        } catch (error) {
            document.getElementById('activeGoalsCount').textContent = '0';
        }
    } catch (error) {
        console.error('Error loading account statistics:', error);
        showToast('Error loading statistics', 'error');
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const activityFeed = document.getElementById('activityFeed');
        if (!activityFeed) return;

        // Get recent transactions
        const transactions = await getUserTransactions();
        const recentTransactions = transactions.slice(0, 5);

        if (recentTransactions.length === 0) {
            activityFeed.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-content">
                        <p>No recent activity</p>
                        <small>Add your first transaction to get started</small>
                    </div>
                </div>
            `;
            return;
        }

        const activityHTML = recentTransactions.map(transaction => {
            const category = categories.find(c => c.id === transaction.category);
            const icon = getActivityIcon(transaction.type);
            const timeAgo = getTimeAgo(new Date(transaction.date));

            return `
                <div class="activity-item">
                    <div class="activity-icon ${transaction.type}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)} - ${transaction.description}</p>
                        <small>${category?.name || 'Unknown'} • ${timeAgo}</small>
                    </div>
                </div>
            `;
        }).join('');

        activityFeed.innerHTML = activityHTML;
    } catch (error) {
        console.error('Error loading recent activity:', error);
        showToast('Error loading activity feed', 'error');
    }
}

// Load financial insights
async function loadFinancialInsights() {
    try {
        const insightsContainer = document.getElementById('financialInsights');
        if (!insightsContainer) return;

        const transactions = await getUserTransactions();
        const insights = generateFinancialInsights(transactions);

        const insightsHTML = insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <i class="fas ${insight.icon}"></i>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
            </div>
        `).join('');

        insightsContainer.innerHTML = insightsHTML;
    } catch (error) {
        console.error('Error loading financial insights:', error);
        showToast('Error loading insights', 'error');
    }
}

// Generate financial insights
function generateFinancialInsights(transactions) {
    const insights = [];

    if (transactions.length === 0) {
        return [{
            type: 'info',
            icon: 'fa-info-circle',
            title: 'Getting Started',
            description: 'Add your first transaction to see personalized financial insights.'
        }];
    }

    // Calculate spending patterns
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');

    if (expenses.length > 0) {
        const avgExpense = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0) / expenses.length;
        const highestExpense = Math.max(...expenses.map(t => parseFloat(t.amount)));

        insights.push({
            type: 'warning',
            icon: 'fa-chart-line',
            title: 'Spending Pattern',
            description: `Your average expense is ${formatCurrency(avgExpense)}. Consider tracking categories for better budgeting.`
        });
    }

    // Savings insight
    const totalIncome = income.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const savings = totalIncome - totalExpenses;

    if (savings > 0) {
        const savingsRate = (savings / totalIncome * 100);
        insights.push({
            type: 'success',
            icon: 'fa-piggy-bank',
            title: 'Great Savings!',
            description: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep up the good work!`
        });
    } else {
        insights.push({
            type: 'danger',
            icon: 'fa-exclamation-triangle',
            title: 'Overspending Alert',
            description: 'Your expenses exceed your income. Consider reviewing your budget.'
        });
    }

    // Transaction frequency
    const daysSinceJoin = Math.ceil((new Date() - new Date(currentUser.created_at)) / (1000 * 60 * 60 * 24));
    const transactionsPerDay = transactions.length / daysSinceJoin;

    if (transactionsPerDay < 0.5) {
        insights.push({
            type: 'info',
            icon: 'fa-calendar-alt',
            title: 'Transaction Frequency',
            description: 'Consider tracking more transactions for better financial insights.'
        });
    }

    return insights.slice(0, 3); // Limit to 3 insights
}

// Update profile completion percentage
function updateProfileCompletion() {
    let completed = 0;
    const total = 4;

    // Check profile info completion
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    if (fullName && phone) {
        completed++;
        document.getElementById('profileComplete').classList.add('completed');
    }

    // Check avatar completion
    const avatarSrc = document.getElementById('headerAvatar').src;
    if (avatarSrc && !avatarSrc.includes('default-avatar')) {
        completed++;
        document.getElementById('avatarComplete').classList.add('completed');
    }

    // Check preferences completion
    if (userPreferences && Object.keys(userPreferences).length > 2) {
        completed++;
        document.getElementById('preferencesComplete').classList.add('completed');
    }

    // Check security completion (password changed recently)
    const lastPasswordChange = currentUser.user_metadata?.last_password_change;
    if (lastPasswordChange) {
        const daysSinceChange = Math.ceil((new Date() - new Date(lastPasswordChange)) / (1000 * 60 * 60 * 24));
        if (daysSinceChange < 90) {
            completed++;
            document.getElementById('securityComplete').classList.add('completed');
        }
    }

    profileCompletion = (completed / total) * 100;
    document.getElementById('completionPercentage').textContent = `${Math.round(profileCompletion)}%`;
    document.getElementById('completionProgress').style.width = `${profileCompletion}%`;
}

// Setup all event listeners
function setupEventListeners() {
    // Profile form submission
    const profileForm = document.getElementById('profileInfoForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Preferences form submission
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handlePreferencesUpdate);
    }

    // Avatar management
    setupAvatarHandlers();

    // Password change
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlePasswordChange);
        // Add password strength checking
        document.getElementById('newPassword').addEventListener('input', checkPasswordStrength);
    }

    // Theme change
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.addEventListener('change', handleThemeChange);
    }

    // Data management
    setupDataManagementHandlers();

    // Account deletion
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleAccountDeletion);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }

    // Two-factor authentication
    const setup2FABtn = document.getElementById('setup2FABtn');
    if (setup2FABtn) {
        setup2FABtn.addEventListener('click', handle2FASetup);
    }
}

// Setup avatar upload handlers
function setupAvatarHandlers() {
    const selectBtn = document.getElementById('selectAvatarBtn');
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const deleteBtn = document.getElementById('deleteAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const uploadArea = document.getElementById('avatarUploadArea');
    const quickAvatarBtn = document.getElementById('quickAvatarBtn');

    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            avatarInput.click();
        });
    }

    if (quickAvatarBtn) {
        quickAvatarBtn.addEventListener('click', () => {
            avatarInput.click();
        });
    }

    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    validateFile(file, 'avatar');
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Avatar';
                } catch (error) {
                    showToast(error.message, 'error');
                    avatarInput.value = '';
                }
            }
        });
    }

    // Drag and drop functionality
    if (uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });

        uploadArea.addEventListener('drop', handleDrop, false);
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', handleAvatarUpload);
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleAvatarDelete);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        uploadArea.classList.add('drag-over');
    }

    function unhighlight() {
        uploadArea.classList.remove('drag-over');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const file = files[0];
            try {
                validateFile(file, 'avatar');
                avatarInput.files = files;
                uploadBtn.disabled = false;
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    }
}

// Handle profile info update
async function handleProfileUpdate(e) {
    e.preventDefault();

    // Clear previous errors
    document.querySelectorAll('.error').forEach(el => el.textContent = '');

    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const timezone = document.getElementById('timezone').value;

    // Validation
    let isValid = true;
    if (!fullName) {
        document.getElementById('fullNameError').textContent = 'Full name is required';
        isValid = false;
    }
    if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
        document.getElementById('phoneError').textContent = 'Please enter a valid phone number';
        isValid = false;
    }

    if (!isValid) return;

    try {
        // Update auth user metadata
        const { error: authError } = await supabase.auth.updateUser({
            data: {
                full_name: fullName,
                phone: phone,
                timezone: timezone
            }
        });

        if (authError) throw authError;

        // Update preferences table
        const { error: prefError } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: currentUser.id,
                timezone: timezone
            });

        if (prefError) throw prefError;

        showToast('Profile updated successfully!', 'success');
        await loadProfileData();
        updateProfileCompletion();
    } catch (error) {
        showToast('Error updating profile: ' + error.message, 'error');
    }
}

// Handle preferences update
async function handlePreferencesUpdate(e) {
    e.preventDefault();

    const preferences = {
        currency: document.getElementById('currency').value,
        date_format: document.getElementById('dateFormat').value,
        theme: document.getElementById('theme').value,
        language: document.getElementById('language').value,
        budget_alerts: document.getElementById('budgetAlerts').checked,
        goal_alerts: document.getElementById('goalAlerts').checked,
        notifications_enabled: document.getElementById('emailNotifications').checked,
        sound_enabled: document.getElementById('soundEnabled').checked,
        push_notifications: document.getElementById('pushNotifications').checked
    };

    try {
        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: currentUser.id,
                ...preferences
            });

        if (error) throw error;

        userPreferences = { ...userPreferences, ...preferences };
        applyTheme(preferences.theme);
        showToast('Preferences saved successfully!', 'success');
        updateProfileCompletion();
    } catch (error) {
        showToast('Error saving preferences: ' + error.message, 'error');
    }
}

// Handle theme change
function handleThemeChange(e) {
    const theme = e.target.value;
    applyTheme(theme);
}

// Apply theme to the page
function applyTheme(theme) {
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark');

    if (theme === 'dark') {
        body.classList.add('theme-dark');
    } else if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            body.classList.add('theme-dark');
        }
    } else {
        body.classList.add('theme-light');
    }
}

// Handle avatar upload
async function handleAvatarUpload() {
    const fileInput = document.getElementById('avatarInput');
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Please select an image file first', 'error');
        return;
    }

    const file = fileInput.files[0];
    const uploadBtn = document.getElementById('uploadAvatarBtn');

    try {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        const result = await uploadUserAvatar(currentUser.id, file);

        showToast('Avatar uploaded successfully!', 'success');

        // Update only the header avatar
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar) {
            headerAvatar.src = result.publicUrl + '?t=' + Date.now();
        }

        fileInput.value = '';
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Avatar';
        updateProfileCompletion();
    } catch (error) {
        showToast('Error uploading avatar: ' + error.message, 'error');
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Avatar';
    }
}

// Handle avatar deletion
async function handleAvatarDelete() {
    if (!confirm('Are you sure you want to delete your profile picture?')) {
        return;
    }

    try {
        await deleteUserAvatar(currentUser.id);

        // Reset only the header avatar
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar) {
            headerAvatar.src = '/assets/default-avatar.png';
        }

        showToast('Profile picture deleted successfully!', 'success');
        updateProfileCompletion();
    } catch (error) {
        showToast('Error deleting avatar: ' + error.message, 'error');
    }
}

// Check password strength
function checkPasswordStrength(e) {
    const password = e.target.value;
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    // Update requirement indicators
    Object.keys(requirements).forEach(req => {
        const element = document.getElementById(`req-${req}`);
        if (element) {
            element.classList.toggle('met', requirements[req]);
        }
    });

    // Calculate strength
    const metRequirements = Object.values(requirements).filter(Boolean).length;
    const strengthBar = document.getElementById('passwordStrengthFill');
    const strengthText = document.getElementById('passwordStrengthText');

    if (strengthBar && strengthText) {
        let strength = 'Weak';
        let percentage = 20;

        if (metRequirements >= 4) {
            strength = 'Strong';
            percentage = 100;
        } else if (metRequirements >= 3) {
            strength = 'Medium';
            percentage = 60;
        }

        strengthBar.style.width = `${percentage}%`;
        strengthText.textContent = strength;
        strengthText.className = `strength-text ${strength.toLowerCase()}`;
    }
}

// Handle password change
async function handlePasswordChange(e) {
    e.preventDefault();

    // Clear previous errors
    document.querySelectorAll('.error').forEach(el => el.textContent = '');

    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    let isValid = true;

    if (!newPassword) {
        document.getElementById('newPasswordError').textContent = 'New password is required';
        isValid = false;
    } else if (newPassword.length < 8) {
        document.getElementById('newPasswordError').textContent = 'Password must be at least 8 characters';
        isValid = false;
    }

    if (newPassword !== confirmNewPassword) {
        document.getElementById('confirmNewPasswordError').textContent = 'Passwords do not match';
        isValid = false;
    }

    if (!isValid) return;

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showToast('Password updated successfully!', 'success');
        document.getElementById('changePasswordForm').reset();
        updateProfileCompletion();
    } catch (error) {
        showToast('Error updating password: ' + error.message, 'error');
    }
}

// Handle 2FA setup
async function handle2FASetup() {
    // This would typically integrate with a 2FA service
    showToast('2FA setup feature coming soon!', 'info');
}

// Setup data management handlers
function setupDataManagementHandlers() {
    // Export all data
    const exportAllBtn = document.getElementById('exportAllBtn');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllData);
    }

    // Export transactions only
    const exportTransactionsBtn = document.getElementById('exportTransactionsBtn');
    if (exportTransactionsBtn) {
        exportTransactionsBtn.addEventListener('click', exportTransactionsOnly);
    }

    // Export PDF report
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', exportPDFReport);
    }

    // Import data
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.csv';
            fileInput.addEventListener('change', handleDataImport);
            fileInput.click();
        });
    }

    // Clear all data
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');
    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', handleClearAllData);
    }
}

// Export all user data
async function exportAllData() {
    try {
        const [transactions, budgets, goals] = await Promise.all([
            getUserTransactions(),
            getUserBudgets(),
            supabase.from('financial_goals').select('*').eq('user_id', currentUser.id)
        ]);

        const exportData = {
            user: {
                name: currentUser.user_metadata?.full_name,
                email: currentUser.email,
                created_at: currentUser.created_at
            },
            transactions: transactions,
            budgets: budgets,
            goals: goals.data || [],
            preferences: userPreferences,
            exported_at: new Date().toISOString()
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cashivo_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        window.URL.revokeObjectURL(url);

        showToast('Data exported successfully!', 'success');
    } catch (error) {
        showToast('Error exporting data: ' + error.message, 'error');
    }
}

// Export transactions only as CSV
async function exportTransactionsOnly() {
    try {
        const transactions = await getUserTransactions();
        const categories = await getCategories();

        const csvHeaders = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Payment Method'];
        const csvRows = [csvHeaders.join(',')];

        transactions.forEach(transaction => {
            const category = categories.find(c => c.id === transaction.category);
            const row = [
                transaction.date,
                `"${transaction.description || ''}"`,
                `"${category?.name || 'Unknown'}"`,
                transaction.type,
                transaction.amount,
                transaction.payment_method || ''
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cashivo_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        showToast('Transactions exported successfully!', 'success');
    } catch (error) {
        showToast('Error exporting transactions: ' + error.message, 'error');
    }
}

// Export PDF report
async function exportPDFReport() {
    showToast('PDF export feature coming soon!', 'info');
}

// Handle data import
async function handleDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const rows = text.split('\n').filter(row => row.trim());
        const headers = rows[0].split(',');

        if (headers.length < 5) {
            throw new Error('Invalid CSV format. Expected columns: Date, Description, Category, Type, Amount');
        }

        const transactions = [];
        for (let i = 1; i < rows.length; i++) {
            const columns = parseCSVRow(rows[i]);
            if (columns.length >= 5) {
                transactions.push({
                    date: columns[0],
                    description: columns[1],
                    category: columns[2],
                    type: columns[3],
                    amount: parseFloat(columns[4]),
                    payment_method: columns[5] || 'imported'
                });
            }
        }

        if (confirm(`Import ${transactions.length} transactions? This will add them to your existing data.`)) {
            let successCount = 0;
            for (const transaction of transactions) {
                try {
                    await saveTransaction(transaction);
                    successCount++;
                } catch (error) {
                    console.error('Error importing transaction:', error);
                }
            }
            showToast(`Successfully imported ${successCount} out of ${transactions.length} transactions.`, 'success');
            await loadAccountStatistics();
            await loadRecentActivity();
        }
    } catch (error) {
        showToast('Error importing file: ' + error.message, 'error');
    }
}

// Parse CSV row handling quoted fields
function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Handle clearing all data
async function handleClearAllData() {
    const confirmation = prompt('Type "DELETE ALL DATA" to confirm clearing all your financial data:');
    if (confirmation !== 'DELETE ALL DATA') {
        return;
    }

    try {
        // Delete all user data
        await Promise.all([
            supabase.from('transactions').delete().eq('user_id', currentUser.id),
            supabase.from('budgets').delete().eq('user_id', currentUser.id),
            supabase.from('financial_goals').delete().eq('user_id', currentUser.id),
            supabase.from('recurring_transactions').delete().eq('user_id', currentUser.id)
        ]);

        showToast('All data cleared successfully.', 'success');
        await loadAccountStatistics();
        await loadRecentActivity();
    } catch (error) {
        showToast('Error clearing data: ' + error.message, 'error');
    }
}

// Handle account deletion
async function handleAccountDeletion() {
    const confirmation = prompt('Type "DELETE ACCOUNT" to confirm permanent account deletion:');
    if (confirmation !== 'DELETE ACCOUNT') {
        return;
    }

    try {
        // Delete all user data first
        await Promise.all([
            supabase.from('transactions').delete().eq('user_id', currentUser.id),
            supabase.from('budgets').delete().eq('user_id', currentUser.id),
            supabase.from('financial_goals').delete().eq('user_id', currentUser.id),
            supabase.from('recurring_transactions').delete().eq('user_id', currentUser.id),
            supabase.from('user_preferences').delete().eq('user_id', currentUser.id)
        ]);

        // Delete user files
        try {
            await deleteUserAvatar(currentUser.id);
        } catch (error) {
            console.error('Error deleting user files:', error);
        }

        // Sign out user
        await supabase.auth.signOut();

        showToast('Account deleted successfully.', 'success');
        window.location.href = 'index.html';
    } catch (error) {
        showToast('Error deleting account: ' + error.message, 'error');
    }
}

// Utility functions
function getActivityIcon(type) {
    return type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down';
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return formatDate(date);
}

// Toast notification system
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = getToastIcon(type);
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Populate timezone options
function populateTimezoneOptions() {
    const timezoneSelect = document.getElementById('timezone');
    if (!timezoneSelect) return;

    // Clear existing options
    timezoneSelect.innerHTML = '';

    // Common timezones
    const timezones = [
        { value: 'UTC', label: 'UTC' },
        { value: 'America/New_York', label: 'Eastern Time (ET)' },
        { value: 'America/Chicago', label: 'Central Time (CT)' },
        { value: 'America/Denver', label: 'Mountain Time (MT)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
        { value: 'Europe/London', label: 'London (GMT/BST)' },
        { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
        { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
        { value: 'Asia/Kolkata', label: 'India (IST)' },
        { value: 'Asia/Dubai', label: 'Dubai (GST)' },
        { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
        { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' }
    ];

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select your timezone';
    timezoneSelect.appendChild(defaultOption);

    // Add timezone options
    timezones.forEach(timezone => {
        const option = document.createElement('option');
        option.value = timezone.value;
        option.textContent = timezone.label;
        timezoneSelect.appendChild(option);
    });

    // Set current timezone if available
    const currentTimezone = userPreferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (currentTimezone) {
        timezoneSelect.value = currentTimezone;
    }
}

// Global functions for HTML onclick handlers
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};
