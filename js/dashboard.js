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
    getCategories, 
    calculateTotals, 
    getRecentTransactions 
} from './utils.js';

import { updateCharts } from './charts.js';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Set welcome message
    const currentUser = getCurrentUser();
    document.getElementById('welcomeUser').textContent = `Welcome, ${currentUser?.user_metadata?.full_name || currentUser?.email || 'User'}`;
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Load dashboard data
    await loadDashboardData();
    
    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logoutUser();
    });
    
    // Handle transaction form submission
    document.getElementById('transactionForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const type = document.getElementById('type').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const description = document.getElementById('description').value;
        
        // Create transaction object
        const transaction = {
            type: type,
            amount: amount,
            category: category,
            description: description,
            date: date
        };
        
        // Save transaction
        try {
            await saveTransaction(transaction);
            // Reset form
            document.getElementById('transactionForm').reset();
            document.getElementById('date').value = today;
            // Reload dashboard data
            await loadDashboardData();
        } catch (error) {
            alert('Error saving transaction: ' + error.message);
        }
    });
    
    // Populate categories
    await populateCategories();

    // Setup real-time subscription for transactions
    setupRealtimeSubscription();
});

// Load dashboard data
async function loadDashboardData() {
    // Calculate and display totals
    const totals = await calculateTotals();
    document.getElementById('totalIncome').textContent = formatCurrency(totals.income);
    document.getElementById('totalExpenses').textContent = formatCurrency(totals.expenses);
    document.getElementById('balance').textContent = formatCurrency(totals.balance);
    
    // Load recent transactions
    await loadRecentTransactions();
    
    // Update charts
    updateCharts();
}

// Load recent transactions
async function loadRecentTransactions() {
    const transactions = await getRecentTransactions(10);
    const transactionsList = document.getElementById('transactionsList');
    
    // Clear existing transactions
    transactionsList.innerHTML = '';
    
    // Add transactions to table
    if (transactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="text-align: center;">No transactions found</td>';
        transactionsList.appendChild(row);
        return;
    }
    
    const categories = await getCategories();
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.className = transaction.type === 'income' ? 'income-row' : 'expense-row';
        
        // Find category name
        const category = categories.find(cat => cat.id === transaction.category);
        const categoryName = category ? category.name : transaction.category;
        
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.description}</td>
            <td>${categoryName}</td>
            <td>${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</td>
            <td>${formatCurrency(transaction.amount)}</td>
            <td>
                <button class="delete-btn" data-id="${transaction.id}">Delete</button>
            </td>
        `;
        
        transactionsList.appendChild(row);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            try {
                await deleteTransaction(id);
                await loadDashboardData();
            } catch (error) {
                alert('Error deleting transaction: ' + error.message);
            }
        });
    });
}

// Populate categories dropdown
async function populateCategories() {
    const categories = await getCategories();
    const categorySelect = document.getElementById('category');
    
    // Clear existing options
    categorySelect.innerHTML = '';
    
    // Add categories to dropdown
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

// Setup real-time subscription for transactions
function setupRealtimeSubscription() {
    const user = getCurrentUser();
    if (!user) return;

    supabase
        .from(`transactions:user_id=eq.${user.id}`)
        .on('*', payload => {
            loadDashboardData();
        })
        .subscribe();
}

export {
    loadDashboardData,
    loadRecentTransactions,
    populateCategories,
    setupRealtimeSubscription
};
