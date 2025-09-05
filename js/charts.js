// Advanced Charts functionality for Cashivo
import { getUserTransactions, getCategories } from './utils.js';
import { getAllBudgetProgress } from './budget-utils.js';

// Chart instances
let expenseChart;
let incomeExpenseChart;
let trendChart;
let budgetChart;

// Chart colors
const chartColors = {
    primary: '#2563eb',
    secondary: '#7c3aed',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0891b2',
    light: '#f3f4f6',
    dark: '#1f2937'
};

// Initialize charts
document.addEventListener('DOMContentLoaded', async function() {
    if (document.getElementById('expenseChart')) {
        await initAllCharts();
    }
});

// Initialize all charts
async function initAllCharts() {
    try {
        const transactions = await getUserTransactions();
        const categories = await getCategories();
        
        // Initialize all chart types
        await initExpenseChart(transactions, categories);
        await initIncomeExpenseChart(transactions);
        await initTrendChart(transactions);
        await initBudgetChart();
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

// Initialize expense pie chart
async function initExpenseChart(transactions, categories) {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;
    
    const expenseData = processExpensesByCategory(transactions, categories);
    
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
                title: {
                    display: true,
                    text: 'Expenses by Category',
                    font: { size: 16 }
                },
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize income vs expense comparison chart
async function initIncomeExpenseChart(transactions) {
    const ctx = document.getElementById('incomeExpenseChart')?.getContext('2d');
    if (!ctx) return;
    
    const comparisonData = processIncomeExpenseComparison(transactions);
    
    incomeExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: comparisonData.labels,
            datasets: [
                {
                    label: 'Income',
                    data: comparisonData.income,
                    backgroundColor: chartColors.success,
                    borderColor: chartColors.success,
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: comparisonData.expenses,
                    backgroundColor: chartColors.danger,
                    borderColor: chartColors.danger,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Income vs Expenses (Last 6 Months)',
                    font: { size: 16 }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// Initialize monthly trend chart
async function initTrendChart(transactions) {
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;
    
    const trendData = processTrendData(transactions);
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.labels,
            datasets: [
                {
                    label: 'Net Balance',
                    data: trendData.balance,
                    borderColor: chartColors.primary,
                    backgroundColor: chartColors.primary + '20',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Balance Trend (Last 12 Months)',
                    font: { size: 16 }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            }
        }
    });
}

// Initialize budget vs actual chart
async function initBudgetChart() {
    const ctx = document.getElementById('budgetChart')?.getContext('2d');
    if (!ctx) return;
    
    try {
        const budgetData = await processBudgetData();
        
        budgetChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: budgetData.labels,
                datasets: [
                    {
                        label: 'Budgeted',
                        data: budgetData.budgeted,
                        backgroundColor: chartColors.info,
                        borderColor: chartColors.info,
                        borderWidth: 1
                    },
                    {
                        label: 'Actual',
                        data: budgetData.actual,
                        backgroundColor: budgetData.colors,
                        borderColor: budgetData.colors,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Budget vs Actual Spending',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error initializing budget chart:', error);
    }
}

// Data processing functions
function processExpensesByCategory(transactions, categories) {
    const expenseData = {};
    const expenseCategories = categories.filter(cat => cat.type === 'expense');
    
    // Initialize expense data
    expenseCategories.forEach(category => {
        expenseData[category.name] = { amount: 0, color: category.color };
    });
    
    // Calculate totals by category
    transactions.forEach(transaction => {
        if (transaction.type === 'expense') {
            const category = categories.find(cat => cat.id === transaction.category);
            if (category) {
                expenseData[category.name].amount += parseFloat(transaction.amount);
            }
        }
    });
    
    // Filter out categories with no expenses
    const filteredData = Object.entries(expenseData)
        .filter(([name, data]) => data.amount > 0)
        .sort((a, b) => b[1].amount - a[1].amount);
    
    return {
        labels: filteredData.map(([name]) => name),
        values: filteredData.map(([name, data]) => data.amount),
        colors: filteredData.map(([name, data]) => data.color)
    };
}

function processIncomeExpenseComparison(transactions) {
    const monthlyData = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        monthlyData[monthKey] = {
            label: monthLabel,
            income: 0,
            expenses: 0
        };
    }
    
    // Process transactions
    transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const monthKey = transactionDate.toISOString().slice(0, 7);
        
        if (monthlyData[monthKey]) {
            if (transaction.type === 'income') {
                monthlyData[monthKey].income += parseFloat(transaction.amount);
            } else {
                monthlyData[monthKey].expenses += parseFloat(transaction.amount);
            }
        }
    });
    
    const sortedData = Object.values(monthlyData);
    
    return {
        labels: sortedData.map(data => data.label),
        income: sortedData.map(data => data.income),
        expenses: sortedData.map(data => data.expenses)
    };
}

function processTrendData(transactions) {
    const monthlyData = {};
    const now = new Date();
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        monthlyData[monthKey] = {
            label: monthLabel,
            income: 0,
            expenses: 0,
            balance: 0
        };
    }
    
    // Process transactions
    transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const monthKey = transactionDate.toISOString().slice(0, 7);
        
        if (monthlyData[monthKey]) {
            if (transaction.type === 'income') {
                monthlyData[monthKey].income += parseFloat(transaction.amount);
            } else {
                monthlyData[monthKey].expenses += parseFloat(transaction.amount);
            }
        }
    });
    
    // Calculate cumulative balance
    let cumulativeBalance = 0;
    const sortedData = Object.values(monthlyData);
    
    sortedData.forEach(data => {
        const monthlyNet = data.income - data.expenses;
        cumulativeBalance += monthlyNet;
        data.balance = cumulativeBalance;
    });
    
    return {
        labels: sortedData.map(data => data.label),
        balance: sortedData.map(data => data.balance)
    };
}

async function processBudgetData() {
    try {
        const budgetProgress = await getAllBudgetProgress();
        
        if (!budgetProgress || budgetProgress.length === 0) {
            return {
                labels: ['No budgets set'],
                budgeted: [0],
                actual: [0],
                colors: [chartColors.light]
            };
        }
        
        const colors = budgetProgress.map(budget => {
            if (budget.percentage >= 100) return chartColors.danger;
            if (budget.percentage >= 90) return chartColors.warning;
            if (budget.percentage >= 75) return chartColors.info;
            return chartColors.success;
        });
        
        return {
            labels: budgetProgress.map(budget => budget.category),
            budgeted: budgetProgress.map(budget => budget.budget),
            actual: budgetProgress.map(budget => budget.spent),
            colors: colors
        };
    } catch (error) {
        console.error('Error processing budget data:', error);
        return {
            labels: ['Error loading budgets'],
            budgeted: [0],
            actual: [0],
            colors: [chartColors.danger]
        };
    }
}

// Update all charts with new data
async function updateCharts() {
    try {
        const transactions = await getUserTransactions();
        const categories = await getCategories();
        
        // Update expense chart
        if (expenseChart) {
            const expenseData = processExpensesByCategory(transactions, categories);
            expenseChart.data.labels = expenseData.labels;
            expenseChart.data.datasets[0].data = expenseData.values;
            expenseChart.data.datasets[0].backgroundColor = expenseData.colors;
            expenseChart.update();
        }
        
        // Update income vs expense chart
        if (incomeExpenseChart) {
            const comparisonData = processIncomeExpenseComparison(transactions);
            incomeExpenseChart.data.labels = comparisonData.labels;
            incomeExpenseChart.data.datasets[0].data = comparisonData.income;
            incomeExpenseChart.data.datasets[1].data = comparisonData.expenses;
            incomeExpenseChart.update();
        }
        
        // Update trend chart
        if (trendChart) {
            const trendData = processTrendData(transactions);
            trendChart.data.labels = trendData.labels;
            trendChart.data.datasets[0].data = trendData.balance;
            trendChart.update();
        }
        
        // Update budget chart
        if (budgetChart) {
            const budgetData = await processBudgetData();
            budgetChart.data.labels = budgetData.labels;
            budgetChart.data.datasets[0].data = budgetData.budgeted;
            budgetChart.data.datasets[1].data = budgetData.actual;
            budgetChart.data.datasets[1].backgroundColor = budgetData.colors;
            budgetChart.update();
        }
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Utility functions for chart interactions
function exportChartAsImage(chartInstance, filename = 'chart') {
    const canvas = chartInstance.canvas;
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function resizeCharts() {
    const charts = [expenseChart, incomeExpenseChart, trendChart, budgetChart];
    charts.forEach(chart => {
        if (chart) {
            chart.resize();
        }
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    setTimeout(resizeCharts, 100);
});

export {
    initAllCharts,
    updateCharts,
    exportChartAsImage,
    resizeCharts
};
