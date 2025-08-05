import { supabase } from './supabaseClient.js';

// Utility functions for Cashivo

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Get transactions for current user
async function getUserTransactions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
    
    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    
    return data;
}

// Save transaction
async function saveTransaction(transaction) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
        .from('transactions')
        .insert([{ 
            user_id: user.id,
            type: transaction.type,
            amount: transaction.amount,
            category: transaction.category,
            description: transaction.description,
            date: transaction.date
        }]);
    
    if (error) {
        console.error('Error saving transaction:', error);
        throw error;
    }
    
    return data;
}

// Delete transaction
async function deleteTransaction(id) {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
}

// Get categories
async function getCategories() {
    const { data, error } = await supabase
        .from('categories')
        .select('*');
    
    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
    
    return data;
}

// Save category
async function saveCategory(category) {
    const { data, error } = await supabase
        .from('categories')
        .insert([category]);
    
    if (error) {
        console.error('Error saving category:', error);
        throw error;
    }
    
    return data;
}

// Calculate totals
async function calculateTotals() {
    const transactions = await getUserTransactions();
    
    const totals = {
        income: 0,
        expenses: 0,
        balance: 0
    };
    
    transactions.forEach(transaction => {
        if (transaction.type === 'income') {
            totals.income += transaction.amount;
        } else {
            totals.expenses += transaction.amount;
        }
    });
    
    totals.balance = totals.income - totals.expenses;
    
    return totals;
}

// Get recent transactions
async function getRecentTransactions(limit = 5) {
    const transactions = await getUserTransactions();
    return transactions.slice(0, limit);
}

// Initialize default categories if none exist
async function initializeCategories() {
    const categories = await getCategories();
    if (!categories || categories.length === 0) {
        const defaultCategories = [
            { id: 'food', name: 'Food & Dining', type: 'expense', color: '#e76f51' },
            { id: 'housing', name: 'Housing', type: 'expense', color: '#f4a261' },
            { id: 'transport', name: 'Transportation', type: 'expense', color: '#e9c46a' },
            { id: 'entertainment', name: 'Entertainment', type: 'expense', color: '#2a9d8f' },
            { id: 'health', name: 'Health & Fitness', type: 'expense', color: '#264653' },
            { id: 'salary', name: 'Salary', type: 'income', color: '#2a9d8f' },
            { id: 'freelance', name: 'Freelance Income', type: 'income', color: '#4caf50' },
            { id: 'investment', name: 'Investment', type: 'income', color: '#9c27b0' }
        ];
        await supabase.from('categories').insert(defaultCategories);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', async function() {
    await initializeCategories();
    
    // Check authentication for dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
        }
    }
});

export {
    formatCurrency,
    formatDate,
    getUserTransactions,
    saveTransaction,
    deleteTransaction,
    getCategories,
    saveCategory,
    calculateTotals,
    getRecentTransactions,
    initializeCategories
};
