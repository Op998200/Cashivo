// MVP Dashboard - Core Functionality Only
import { 
    isAuthenticated, 
    getCurrentUser, 
    logoutUser 
} from './auth.js';

import {
    formatCurrency,
    formatDate,
    getUserTransactions,
    saveTransaction,
    deleteTransaction,
    updateTransaction,
    getCategories,
    calculateTotals
} from './utils.js';

import { uploadTransactionReceipt, validateFile } from './storage.js';

// Global state
let allTransactions = [];
let displayedTransactions = [];
let categories = [];
let currentUser = null;
let transactionsPerPage = 10;
let currentPage = 0;
let expenseChart = null; // Store chart instance
let isEditMode = false; // Track if we're editing a transaction
let editingTransactionId = null; // Store the ID of the transaction being edited

// Initialize MVP dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!await isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = await getCurrentUser();
    
    // Set welcome message
    const welcomeUserElem = document.getElementById('welcomeUser');
    if (welcomeUserElem) {
        welcomeUserElem.textContent = currentUser?.user_metadata?.full_name || 
                                      currentUser?.email || 'User';
    }

    // Add link to profile page in nav bar dynamically if needed
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && !navLinks.querySelector('a[href="profile.html"]')) {
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.textContent = 'Profile';
        profileLink.setAttribute('role', 'menuitem');
        navLinks.appendChild(profileLink);
    }
    
    try {
        // Load core data
        await loadDashboardData();
        await setupEventListeners();
        
        // Initialize simple chart
        await initSimpleChart();
        
        console.log('MVP Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showErrorMessage('Error loading dashboard. Please refresh the page.');
    }
});

// Load all dashboard data
async function loadDashboardData() {
    try {
        // Load transactions and categories
        allTransactions = await getUserTransactions();
        categories = await getCategories();
        
        // Update financial summary
        updateFinancialSummary();
        
        // Update monthly stats
        updateMonthlyStats();
        
        // Load and display transactions
        displayedTransactions = [...allTransactions];
        renderTransactions();
        
        // Populate category dropdown
        populateCategoryDropdown();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        throw error;
    }
}

// Update financial summary cards
function updateFinancialSummary() {
    const totals = {
        income: 0,
        expenses: 0,
        balance: 0
    };
    
    allTransactions.forEach(transaction => {
        if (transaction.type === 'income') {
            totals.income += parseFloat(transaction.amount);
        } else {
            totals.expenses += parseFloat(transaction.amount);
        }
    });
    
    totals.balance = totals.income - totals.expenses;
    
    // Update UI
    document.getElementById('totalIncome').textContent = formatCurrency(totals.income);
    document.getElementById('totalExpenses').textContent = formatCurrency(totals.expenses);
    document.getElementById('balance').textContent = formatCurrency(totals.balance);
    document.getElementById('transactionCount').textContent = allTransactions.length.toString();
    
    // Update balance card color based on positive/negative
    const balanceCard = document.querySelector('.stat-card.balance');
    if (balanceCard) {
        balanceCard.classList.remove('positive', 'negative');
        balanceCard.classList.add(totals.balance >= 0 ? 'positive' : 'negative');
    }
}

// Update monthly statistics
function updateMonthlyStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyTransactions = allTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
    });
    
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    
    monthlyTransactions.forEach(transaction => {
        if (transaction.type === 'income') {
            monthlyIncome += parseFloat(transaction.amount);
        } else {
            monthlyExpenses += parseFloat(transaction.amount);
        }
    });
    
    const monthlyNet = monthlyIncome - monthlyExpenses;
    
    document.getElementById('monthlyIncome').textContent = `+${formatCurrency(monthlyIncome)}`;
    document.getElementById('monthlyExpenses').textContent = `-${formatCurrency(monthlyExpenses)}`;
    document.getElementById('monthlyNet').textContent = `=${formatCurrency(monthlyNet)}`;
    
    // Color code the net amount
    const netElement = document.getElementById('monthlyNet');
    netElement.className = monthlyNet >= 0 ? 'stat-net positive' : 'stat-net negative';
}

// Populate category dropdown
function populateCategoryDropdown() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    // Clear existing options
    categorySelect.innerHTML = '';

    // Initially populate with categories matching the default type selection
    const typeSelect = document.getElementById('type');
    const selectedType = typeSelect ? typeSelect.value : 'expense';

    const filteredCategories = categories.filter(cat => cat.type === selectedType);

    filteredCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

// Render transactions list
function renderTransactions() {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;
    
    // Clear existing content
    transactionsList.innerHTML = '';
    
    if (displayedTransactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <p>No transactions found. Add your first transaction above!</p>
            </div>
        `;
        return;
    }
    
    // Show transactions (paginated)
    const startIdx = 0;
    const endIdx = Math.min((currentPage + 1) * transactionsPerPage, displayedTransactions.length);
    const visibleTransactions = displayedTransactions.slice(startIdx, endIdx);
    
    visibleTransactions.forEach(transaction => {
        const transactionElement = createTransactionElement(transaction);
        transactionsList.appendChild(transactionElement);
    });
    
    // Update load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = endIdx >= displayedTransactions.length ? 'none' : 'block';
    }
}

// Create transaction element
function createTransactionElement(transaction) {
    const div = document.createElement('div');
    div.className = `transaction-item ${transaction.type}`;
    
    const category = categories.find(cat => cat.id === transaction.category);
    const categoryName = category ? category.name : 'Unknown';
    const categoryIcon = getCategoryIcon(categoryName);
    
    div.innerHTML = `
        <div class="transaction-main">
            <div class="transaction-icon">${categoryIcon}</div>
            <div class="transaction-details">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-meta">
                    <span class="transaction-category">${categoryName}</span>
                    <span class="transaction-date">${formatDate(transaction.date)}</span>
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
            </div>
        </div>
        <div class="transaction-actions">
            ${transaction.receipt_url ? `<a href="${transaction.receipt_url}" target="_blank" class="btn-small">📎 Receipt</a>` : ''}
            <button class="btn-small" onclick="handleEditTransaction('${transaction.id}')">✏️ Edit</button>
            <button class="btn-small btn-danger" onclick="handleDeleteTransaction('${transaction.id}')">🗑️ Delete</button>
        </div>
        ${transaction.receipt_url ? `<div class="transaction-receipt">
            <img src="${transaction.receipt_url}" alt="Receipt" class="receipt-thumbnail" onclick="showReceiptModal('${transaction.receipt_url}')">
        </div>` : ''}
    `;
    
    return div;
}

// Get category icon
function getCategoryIcon(categoryName) {
    const icons = {
        'Food & Dining': '🍽️',
        'Housing': '🏠',
        'Transportation': '🚗',
        'Entertainment': '🎬',
        'Health & Fitness': '💪',
        'Shopping': '🛍️',
        'Utilities': '💡',
        'Education': '📚',
        'Travel': '✈️',
        'Salary': '💼',
        'Freelance Income': '💻',
        'Investment': '📈',
        'Business': '🏢',
        'Gift': '🎁',
        'Other': '📋'
    };
    return icons[categoryName] || '📋';
}

// Initialize simple expense chart
async function initSimpleChart() {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (expenseChart) {
        expenseChart.destroy();
    }

    const expenseData = getExpenseDataForChart();

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: expenseData.labels,
            datasets: [{
                data: expenseData.values,
                backgroundColor: expenseData.colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Get expense data for chart
function getExpenseDataForChart() {
    const expensesByCategory = {};
    
    // Initialize categories
    categories.filter(cat => cat.type === 'expense').forEach(category => {
        expensesByCategory[category.name] = {
            amount: 0,
            color: category.color
        };
    });
    
    // Calculate totals
    allTransactions.filter(t => t.type === 'expense').forEach(transaction => {
        const category = categories.find(cat => cat.id === transaction.category);
        if (category) {
            expensesByCategory[category.name].amount += parseFloat(transaction.amount);
        }
    });
    
    // Filter out zero amounts and prepare data
    const filteredData = Object.entries(expensesByCategory)
        .filter(([name, data]) => data.amount > 0)
        .sort((a, b) => b[1].amount - a[1].amount);
    
    return {
        labels: filteredData.map(([name]) => name),
        values: filteredData.map(([name, data]) => data.amount),
        colors: filteredData.map(([name, data]) => data.color)
    };
}

// Setup all event listeners
async function setupEventListeners() {
    // Transaction form submission
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionSubmit);
    }

    // Edit transaction form submission
    const editTransactionForm = document.getElementById('editTransactionForm');
    if (editTransactionForm) {
        editTransactionForm.addEventListener('submit', handleEditTransactionSubmit);
    }

    // Type change updates category options
    const typeSelect = document.getElementById('type');
    if (typeSelect) {
        typeSelect.addEventListener('change', updateCategoryOptions);
    }

    // Edit type change updates category options
    const editTypeSelect = document.getElementById('editType');
    if (editTypeSelect) {
        editTypeSelect.addEventListener('change', updateEditCategoryOptions);
    }

    // Search functionality
    const searchInput = document.getElementById('searchTransactions');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Filter by type
    const filterType = document.getElementById('filterType');
    if (filterType) {
        filterType.addEventListener('change', handleTypeFilter);
    }

    // Load more transactions
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', handleLoadMore);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }

    // Modal event listeners
    const editModal = document.getElementById('editTransactionModal');
    if (editModal) {
        // Close modal on outside click
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                cancelEdit();
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && editModal.style.display === 'block') {
                cancelEdit();
            }
        });
    }
}

// Handle transaction form submission (Add new transaction)
async function handleTransactionSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('type').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;
    const receiptInput = document.getElementById('receiptInput');

    // Basic validation
    if (!amount || amount <= 0) {
        showErrorMessage('Please enter a valid amount');
        return;
    }

    if (!description.trim()) {
        showErrorMessage('Please add a description for this transaction');
        return;
    }

    try {
        const transaction = {
            type,
            amount,
            category,
            description: description.trim(),
            date,
            payment_method: 'manual' // MVP: simple tracking
        };

        // Create new transaction
        const savedTransaction = await saveTransaction(transaction);
        showSuccessMessage('Transaction added successfully!');

        // Handle receipt upload if file selected
        if (receiptInput.files && receiptInput.files.length > 0) {
            const file = receiptInput.files[0];
            try {
                validateFile(file, 'receipt');

                // Get the transaction ID - handle different return formats
                let transactionId;
                if (Array.isArray(savedTransaction) && savedTransaction.length > 0) {
                    transactionId = savedTransaction[0].id;
                } else if (savedTransaction && savedTransaction.id) {
                    transactionId = savedTransaction.id;
                } else {
                    // If we can't get the ID, try to get it from the last transaction
                    const transactions = await getUserTransactions();
                    const latestTransaction = transactions.find(t =>
                        t.description === transaction.description &&
                        t.amount === transaction.amount &&
                        t.date === transaction.date
                    );
                    if (latestTransaction) {
                        transactionId = latestTransaction.id;
                    } else {
                        throw new Error('Could not retrieve transaction ID for receipt upload');
                    }
                }

                await uploadTransactionReceipt(currentUser.id, transactionId, file);
                console.log('Receipt uploaded successfully');
            } catch (uploadError) {
                console.error('Receipt upload failed:', uploadError);
                showErrorMessage('Transaction saved, but receipt upload failed: ' + uploadError.message);
            }
        }

        // Reset form
        document.getElementById('transactionForm').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];

        // Reload data
        await loadDashboardData();

        // Update chart
        await initSimpleChart();

    } catch (error) {
        console.error('Error saving transaction:', error);
        showErrorMessage('Error saving transaction: ' + error.message);
    }
}

// Handle edit transaction form submission
async function handleEditTransactionSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('editType').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const category = document.getElementById('editCategory').value;
    const date = document.getElementById('editDate').value;
    const description = document.getElementById('editDescription').value;

    // Basic validation
    if (!amount || amount <= 0) {
        showErrorMessage('Please enter a valid amount');
        return;
    }

    if (!description.trim()) {
        showErrorMessage('Please add a description for this transaction');
        return;
    }

    try {
        const transaction = {
            type,
            amount,
            category,
            description: description.trim(),
            date,
            payment_method: 'manual' // MVP: simple tracking
        };

        // Update existing transaction
        await updateTransaction(editingTransactionId, transaction);
        showSuccessMessage('Transaction updated successfully!');

        // Hide edit form and show add form
        cancelEdit();

        // Reload data
        await loadDashboardData();

        // Update chart
        await initSimpleChart();

    } catch (error) {
        console.error('Error updating transaction:', error);
        showErrorMessage('Error updating transaction: ' + error.message);
    }
}

// Update category options based on selected type
function updateCategoryOptions() {
    const type = document.getElementById('type').value;
    const categorySelect = document.getElementById('category');

    // Clear and repopulate
    categorySelect.innerHTML = '';

    const filteredCategories = categories.filter(cat => cat.type === type);

    filteredCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

// Update category options for edit form based on selected type
function updateEditCategoryOptions() {
    const type = document.getElementById('editType').value;
    const categorySelect = document.getElementById('editCategory');

    // Clear and repopulate
    categorySelect.innerHTML = '';

    const filteredCategories = categories.filter(cat => cat.type === type);

    filteredCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

// Handle search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (searchTerm === '') {
        displayedTransactions = [...allTransactions];
    } else {
        displayedTransactions = allTransactions.filter(transaction => {
            const description = transaction.description.toLowerCase();
            const category = categories.find(cat => cat.id === transaction.category);
            const categoryName = category ? category.name.toLowerCase() : '';

            return description.includes(searchTerm) || categoryName.includes(searchTerm);
        });
    }

    currentPage = 0;
    renderTransactions();
}

// Handle type filter
function handleTypeFilter(e) {
    const filterType = e.target.value;
    const searchTerm = document.getElementById('searchTransactions').value.toLowerCase().trim();

    let filtered = [...allTransactions];

    // Apply type filter
    if (filterType !== 'all') {
        filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    // Apply search if exists
    if (searchTerm) {
        filtered = filtered.filter(transaction => {
            const description = transaction.description.toLowerCase();
            const category = categories.find(cat => cat.id === transaction.category);
            const categoryName = category ? category.name.toLowerCase() : '';

            return description.includes(searchTerm) || categoryName.includes(searchTerm);
        });
    }

    displayedTransactions = filtered;
    currentPage = 0;
    renderTransactions();
}

// Handle load more transactions
function handleLoadMore() {
    currentPage++;
    renderTransactions();
}

// Delete transaction (global function for onclick)
window.handleDeleteTransaction = async function(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }

    try {
        await deleteTransaction(transactionId);
        await loadDashboardData();
        await initSimpleChart();
        showSuccessMessage('Transaction deleted successfully!');
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showErrorMessage('Error deleting transaction: ' + error.message);
    }
};

// Edit transaction (global function for onclick)
window.handleEditTransaction = async function(transactionId) {
    // Find the transaction to edit
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) {
        showErrorMessage('Transaction not found');
        return;
    }

    // Set edit mode
    isEditMode = true;
    editingTransactionId = transactionId;

    // Populate edit form with transaction data
    document.getElementById('editType').value = transaction.type;
    document.getElementById('editAmount').value = transaction.amount;
    document.getElementById('editCategory').value = transaction.category;
    document.getElementById('editDate').value = transaction.date;
    document.getElementById('editDescription').value = transaction.description;

    // Update category dropdown based on type
    updateEditCategoryOptions();

    // Show modal
    const modal = document.getElementById('editTransactionModal');
    modal.style.display = 'block';

    // Focus on description field
    document.getElementById('editDescription').focus();

    showSuccessMessage('Editing transaction. Make your changes and submit.');
};

// Cancel edit (global function for onclick)
window.cancelEdit = function() {
    // Reset edit mode
    isEditMode = false;
    editingTransactionId = null;

    // Hide modal
    const modal = document.getElementById('editTransactionModal');
    modal.style.display = 'none';

    // Reset edit form
    document.getElementById('editTransactionForm').reset();
};

// Show receipt modal (global function for onclick)
window.showReceiptModal = function(receiptUrl) {
    const modal = document.createElement('div');
    modal.className = 'receipt-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Receipt</h3>
                <button class="close-modal" onclick="this.closest('.receipt-modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <img src="${receiptUrl}" alt="Receipt" class="receipt-full-size">
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

// Utility functions for user feedback
function showSuccessMessage(message) {
    showToast(message, 'success');
}

function showErrorMessage(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
