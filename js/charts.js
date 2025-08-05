// Charts functionality for Cashivo
import { getUserTransactions, getCategories } from './utils.js';

let expenseChart;

// Initialize charts
document.addEventListener('DOMContentLoaded', async function() {
    if (document.getElementById('expenseChart')) {
        await initCharts();
    }
});

// Initialize charts
async function initCharts() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    // Get user transactions
    const transactions = await getUserTransactions();
    
    // Process data for chart
    const categories = await getCategories();
    const expenseData = {};
    const incomeData = {};
    
    // Initialize data objects
    categories.forEach(category => {
        if (category.type === 'expense') {
            expenseData[category.name] = 0;
        } else {
            incomeData[category.name] = 0;
        }
    });
    
    // Calculate totals by category
    transactions.forEach(transaction => {
        const category = categories.find(cat => cat.id === transaction.category);
        if (category) {
            if (transaction.type === 'expense') {
                expenseData[category.name] = (expenseData[category.name] || 0) + transaction.amount;
            } else {
                incomeData[category.name] = (incomeData[category.name] || 0) + transaction.amount;
            }
        }
    });
    
    // Create chart
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(expenseData).filter(key => expenseData[key] > 0),
            datasets: [{
                data: Object.values(expenseData).filter(value => value > 0),
                backgroundColor: Object.values(categories.filter(cat => cat.type === 'expense')).map(cat => cat.color)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Expenses by Category',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Update charts with new data
async function updateCharts() {
    if (!expenseChart) return;
    
    // Get user transactions
    const transactions = await getUserTransactions();
    
    // Process data for chart
    const categories = await getCategories();
    const expenseData = {};
    
    // Initialize data objects
    categories.forEach(category => {
        if (category.type === 'expense') {
            expenseData[category.name] = 0;
        }
    });
    
    // Calculate totals by category
    transactions.forEach(transaction => {
        const category = categories.find(cat => cat.id === transaction.category);
        if (category && transaction.type === 'expense') {
            expenseData[category.name] = (expenseData[category.name] || 0) + transaction.amount;
        }
    });
    
    // Update chart data
    expenseChart.data.labels = Object.keys(expenseData).filter(key => expenseData[key] > 0);
    expenseChart.data.datasets[0].data = Object.values(expenseData).filter(value => value > 0);
    
    // Update chart
    expenseChart.update();
}

export {
    initCharts,
    updateCharts
};
