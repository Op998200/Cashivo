// Advanced Analytics JavaScript with Chart.js integration
import { auth, database, utils, checkAuthAndRedirect } from './supabase.js';

class AdvancedAnalyticsManager {
    constructor() {
        this.currentUser = null;
        this.charts = {};
        this.currentPeriod = 1; // months
        this.analytics = {
            transactions: [],
            summary: {},
            categoryBreakdown: {},
            monthlyTrends: {},
            predictions: {},
            insights: []
        };
        this.init();
    }

    async init() {
        const session = await checkAuthAndRedirect();
        if (!session) return;
        
        this.currentUser = session.user;
        await this.loadUserData();
        this.bindEvents();
        await this.loadAnalyticsData();
        this.renderCharts();
        this.generateInsights();
    }

    async loadUserData() {
        const userEmail = document.getElementById('user-email');
        const userInitial = document.getElementById('user-initial');

        if (userEmail) userEmail.textContent = this.currentUser.email;
        if (userInitial) userInitial.textContent = this.currentUser.email.charAt(0).toUpperCase();
    }

    bindEvents() {
        // Time period selector
        const timePeriodSelect = document.getElementById('time-period');
        if (timePeriodSelect) {
            timePeriodSelect.addEventListener('change', async (e) => {
                this.currentPeriod = e.target.value;
                await this.loadAnalyticsData();
                this.updateAllCharts();
                this.generateInsights();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-analytics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                utils.showLoading(refreshBtn);
                await this.loadAnalyticsData();
                this.updateAllCharts();
                this.generateInsights();
                utils.hideLoading(refreshBtn);
                utils.showToast('Analytics updated successfully!', 'success');
            });
        }

        // User menu functionality
        this.setupUserMenu();

        // Mobile navigation
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
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
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const result = await auth.signOut();
                if (result.success) {
                    window.location.href = '/';
                } else {
                    utils.showToast('Error signing out', 'error');
                }
            });
        }
    }

    async loadAnalyticsData() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            
            if (this.currentPeriod === 'all') {
                startDate.setFullYear(2000); // Far back date
            } else {
                const months = parseInt(this.currentPeriod);
                startDate.setMonth(endDate.getMonth() - months);
            }

            // Load comprehensive analytics data
            await Promise.all([
                this.loadFinancialSummary(startDate, endDate),
                this.loadTransactionsData(startDate, endDate),
                this.loadCategoryBreakdown(startDate, endDate),
                this.loadMonthlyTrends(),
                this.loadSpendingPatterns(),
                this.loadAccountBalances()
            ]);

            this.updateQuickStats();
            this.updateCategoryAnalysisTable();

        } catch (error) {
            console.error('Error loading analytics data:', error);
            utils.showToast('Error loading analytics data', 'error');
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    async loadFinancialSummary(startDate, endDate) {
        const result = await database.getFinancialSummary(
            this.currentUser.id,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        if (result.success) {
            this.analytics.summary = result.data;
        }
    }

    async loadTransactionsData(startDate, endDate) {
        const result = await database.getTransactions(this.currentUser.id, {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            limit: 1000
        });

        if (result.success) {
            this.analytics.transactions = result.data;
        }
    }

    async loadCategoryBreakdown(startDate, endDate) {
        const result = await database.getCategoryBreakdown(
            this.currentUser.id,
            null,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        if (result.success) {
            this.analytics.categoryBreakdown = result.data;
        }
    }

    async loadMonthlyTrends() {
        const months = this.currentPeriod === 'all' ? 12 : Math.min(parseInt(this.currentPeriod), 12);
        const result = await database.getMonthlyTrends(this.currentUser.id, months);

        if (result.success) {
            this.analytics.monthlyTrends = result.data;
        }
    }

    async loadSpendingPatterns() {
        // Analyze spending patterns by day of week, time of day, etc.
        const transactions = this.analytics.transactions;
        
        this.analytics.patterns = {
            byDayOfWeek: this.analyzeByDayOfWeek(transactions),
            byTimeOfDay: this.analyzeByTimeOfDay(transactions),
            byMerchant: this.analyzeByMerchant(transactions),
            seasonalTrends: this.analyzeSeasonalTrends(transactions)
        };
    }

    async loadAccountBalances() {
        // This would typically come from a separate accounts table
        // For now, we'll calculate from transactions
        this.analytics.accountBalances = {
            checking: 0,
            savings: 0,
            credit: 0,
            investment: 0
        };
    }

    updateQuickStats() {
        const summary = this.analytics.summary;
        
        // Update period stats
        const periodIncomeEl = document.getElementById('period-income');
        const periodExpensesEl = document.getElementById('period-expenses');
        const periodBalanceEl = document.getElementById('period-balance');
        const periodTransactionsEl = document.getElementById('period-transactions');

        if (periodIncomeEl) {
            periodIncomeEl.textContent = utils.formatCurrency(summary.totalIncome || 0);
        }
        
        if (periodExpensesEl) {
            periodExpensesEl.textContent = utils.formatCurrency(summary.totalExpenses || 0);
        }
        
        if (periodBalanceEl) {
            const balance = (summary.totalIncome || 0) - (summary.totalExpenses || 0);
            periodBalanceEl.textContent = utils.formatCurrency(balance);
            periodBalanceEl.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';
        }
        
        if (periodTransactionsEl) {
            periodTransactionsEl.textContent = summary.transactionCount || 0;
        }

        // Calculate and display trends (placeholder for now)
        this.updateTrendIndicators();
    }

    updateTrendIndicators() {
        // Calculate month-over-month changes
        const trends = this.calculateTrends();
        
        const incomeTrendEl = document.getElementById('income-trend');
        const expenseTrendEl = document.getElementById('expense-trend');
        const balanceTrendEl = document.getElementById('balance-trend');
        const transactionsTrendEl = document.getElementById('transactions-trend');

        if (incomeTrendEl) {
            incomeTrendEl.textContent = this.formatTrend(trends.income);
            incomeTrendEl.className = `stat-change ${trends.income >= 0 ? 'positive' : 'negative'}`;
        }

        if (expenseTrendEl) {
            expenseTrendEl.textContent = this.formatTrend(trends.expense);
            expenseTrendEl.className = `stat-change ${trends.expense <= 0 ? 'positive' : 'negative'}`;
        }

        if (balanceTrendEl) {
            balanceTrendEl.textContent = this.formatTrend(trends.balance);
            balanceTrendEl.className = `stat-change ${trends.balance >= 0 ? 'positive' : 'negative'}`;
        }

        if (transactionsTrendEl) {
            transactionsTrendEl.textContent = this.formatTrend(trends.transactions, false);
            transactionsTrendEl.className = `stat-change neutral`;
        }
    }

    calculateTrends() {
        // This would compare current period to previous period
        // For now, return placeholder values
        return {
            income: Math.random() * 20 - 10,
            expense: Math.random() * 20 - 10,
            balance: Math.random() * 20 - 10,
            transactions: Math.random() * 50 - 25
        };
    }

    formatTrend(value, isPercentage = true) {
        const sign = value >= 0 ? '+' : '';
        const suffix = isPercentage ? '%' : '';
        return `${sign}${value.toFixed(1)}${suffix} from last period`;
    }

    renderCharts() {
        this.renderIncomeExpenseChart();
        this.renderMonthlyTrendChart();
        this.renderCategoryChart();
        this.renderDailyAverageChart();
    }

    renderIncomeExpenseChart() {
        const canvas = document.getElementById('incomeExpenseChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.destroy();
        }

        const summary = this.analytics.summary;
        const data = {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [summary.totalIncome || 0, summary.totalExpenses || 0],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)', // Income - green
                    'rgba(239, 68, 68, 0.8)'   // Expense - red
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        };

        const config = {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#E2E4E9',
                            font: {
                                family: 'Inter'
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(45, 47, 58, 0.9)',
                        titleColor: '#E2E4E9',
                        bodyColor: '#E2E4E9',
                        borderColor: '#4d525a',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${utils.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        };

        this.charts.incomeExpense = new Chart(ctx, config);
    }

    renderMonthlyTrendChart() {
        const canvas = document.getElementById('monthlyTrendChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (this.charts.monthlyTrend) {
            this.charts.monthlyTrend.destroy();
        }

        const trends = this.analytics.monthlyTrends;
        const months = Object.keys(trends).sort();
        
        const incomeData = months.map(month => trends[month]?.income || 0);
        const expenseData = months.map(month => trends[month]?.expenses || 0);
        const labels = months.map(month => {
            const date = new Date(month + '-01');
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });

        const data = {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#E2E4E9',
                            font: {
                                family: 'Inter'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(45, 47, 58, 0.9)',
                        titleColor: '#E2E4E9',
                        bodyColor: '#E2E4E9',
                        borderColor: '#4d525a',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${utils.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(77, 126, 168, 0.1)'
                        },
                        ticks: {
                            color: '#9EA2A8',
                            font: {
                                family: 'Inter'
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(77, 126, 168, 0.1)'
                        },
                        ticks: {
                            color: '#9EA2A8',
                            font: {
                                family: 'Inter'
                            },
                            callback: function(value) {
                                return utils.formatCurrency(value);
                            }
                        }
                    }
                }
            }
        };

        this.charts.monthlyTrend = new Chart(ctx, config);
    }

    renderCategoryChart() {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        const breakdown = this.analytics.categoryBreakdown;
        const categories = Object.keys(breakdown);
        const amounts = categories.map(cat => breakdown[cat].total);
        
        // Generate colors for categories
        const colors = this.generateColors(categories.length);

        const data = {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderWidth: 2
            }]
        };

        const config = {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#E2E4E9',
                            font: {
                                family: 'Inter',
                                size: 11
                            },
                            padding: 10,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(45, 47, 58, 0.9)',
                        titleColor: '#E2E4E9',
                        bodyColor: '#E2E4E9',
                        borderColor: '#4d525a',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${utils.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '50%'
            }
        };

        this.charts.category = new Chart(ctx, config);
    }

    renderDailyAverageChart() {
        const canvas = document.getElementById('dailyAverageChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (this.charts.dailyAverage) {
            this.charts.dailyAverage.destroy();
        }

        const dayData = this.analytics.patterns?.byDayOfWeek || {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const amounts = days.map(day => dayData[day]?.average || 0);

        const data = {
            labels: days,
            datasets: [{
                label: 'Average Spending',
                data: amounts,
                backgroundColor: 'rgba(77, 126, 168, 0.6)',
                borderColor: 'rgba(77, 126, 168, 1)',
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false,
            }]
        };

        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(45, 47, 58, 0.9)',
                        titleColor: '#E2E4E9',
                        bodyColor: '#E2E4E9',
                        borderColor: '#4d525a',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Average: ${utils.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9EA2A8',
                            font: {
                                family: 'Inter'
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(77, 126, 168, 0.1)'
                        },
                        ticks: {
                            color: '#9EA2A8',
                            font: {
                                family: 'Inter'
                            },
                            callback: function(value) {
                                return utils.formatCurrency(value);
                            }
                        }
                    }
                }
            }
        };

        this.charts.dailyAverage = new Chart(ctx, config);
    }

    updateAllCharts() {
        this.renderCharts();
    }

    generateColors(count) {
        const baseColors = [
            '#4D7EA8', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6',
            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
        ];

        const colors = {
            background: [],
            border: []
        };

        for (let i = 0; i < count; i++) {
            const color = baseColors[i % baseColors.length];
            colors.background.push(color + '80'); // Add transparency
            colors.border.push(color);
        }

        return colors;
    }

    analyzeByDayOfWeek(transactions) {
        const dayData = {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        days.forEach(day => {
            dayData[day] = { total: 0, count: 0, average: 0 };
        });

        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const date = new Date(transaction.date);
                const day = days[date.getDay()];
                dayData[day].total += parseFloat(transaction.amount);
                dayData[day].count += 1;
            }
        });

        Object.keys(dayData).forEach(day => {
            if (dayData[day].count > 0) {
                dayData[day].average = dayData[day].total / dayData[day].count;
            }
        });

        return dayData;
    }

    analyzeByTimeOfDay(transactions) {
        const timeData = {
            morning: { total: 0, count: 0 },
            afternoon: { total: 0, count: 0 },
            evening: { total: 0, count: 0 },
            night: { total: 0, count: 0 }
        };

        transactions.forEach(transaction => {
            if (transaction.type === 'expense' && transaction.time) {
                const hour = parseInt(transaction.time.split(':')[0]);
                let period;
                
                if (hour >= 5 && hour < 12) period = 'morning';
                else if (hour >= 12 && hour < 17) period = 'afternoon';
                else if (hour >= 17 && hour < 22) period = 'evening';
                else period = 'night';

                timeData[period].total += parseFloat(transaction.amount);
                timeData[period].count += 1;
            }
        });

        return timeData;
    }

    analyzeByMerchant(transactions) {
        const merchantData = {};

        transactions.forEach(transaction => {
            if (transaction.type === 'expense' && transaction.merchant_name) {
                if (!merchantData[transaction.merchant_name]) {
                    merchantData[transaction.merchant_name] = { total: 0, count: 0 };
                }
                merchantData[transaction.merchant_name].total += parseFloat(transaction.amount);
                merchantData[transaction.merchant_name].count += 1;
            }
        });

        // Sort by total amount
        return Object.entries(merchantData)
            .sort(([,a], [,b]) => b.total - a.total)
            .slice(0, 10) // Top 10 merchants
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
    }

    analyzeSeasonalTrends(transactions) {
        const seasonData = {
            spring: { total: 0, count: 0 },
            summer: { total: 0, count: 0 },
            fall: { total: 0, count: 0 },
            winter: { total: 0, count: 0 }
        };

        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const month = date.getMonth();
            let season;

            if (month >= 2 && month <= 4) season = 'spring';
            else if (month >= 5 && month <= 7) season = 'summer';
            else if (month >= 8 && month <= 10) season = 'fall';
            else season = 'winter';

            seasonData[season].total += parseFloat(transaction.amount);
            seasonData[season].count += 1;
        });

        return seasonData;
    }

    updateCategoryAnalysisTable() {
        const tbody = document.getElementById('category-analysis-tbody');
        const emptyState = document.getElementById('analysis-empty-state');
        
        if (!tbody) return;

        const breakdown = this.analytics.categoryBreakdown;
        const categories = Object.keys(breakdown);

        if (categories.length === 0) {
            tbody.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        tbody.style.display = '';
        if (emptyState) emptyState.style.display = 'none';

        // Calculate total for percentages
        const total = categories.reduce((sum, cat) => sum + breakdown[cat].total, 0);

        tbody.innerHTML = '';

        // Sort categories by total amount
        const sortedCategories = categories
            .map(cat => ({ name: cat, ...breakdown[cat] }))
            .sort((a, b) => b.total - a.total);

        sortedCategories.forEach(category => {
            const percentage = total > 0 ? (category.total / total * 100).toFixed(1) : 0;
            const average = category.count > 0 ? (category.total / category.count).toFixed(2) : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category.name}</td>
                <td>${utils.formatCurrency(category.total)}</td>
                <td>${category.count}</td>
                <td>${utils.formatCurrency(average)}</td>
                <td>${percentage}%</td>
                <td><span class="trend-indicator">📈</span></td>
            `;
            
            tbody.appendChild(row);
        });
    }

    generateInsights() {
        const insights = this.calculateFinancialInsights();
        this.displayInsights(insights);
    }

    calculateFinancialInsights() {
        const insights = [];
        const summary = this.analytics.summary;
        const breakdown = this.analytics.categoryBreakdown;

        // Spending vs Income insight
        if (summary.totalExpenses > summary.totalIncome) {
            insights.push({
                icon: '⚠️',
                title: 'Spending Alert',
                message: `You're spending ${utils.formatCurrency(summary.totalExpenses - summary.totalIncome)} more than you earn this period.`,
                type: 'warning',
                priority: 'high'
            });
        }

        // Top spending category
        const topCategory = Object.keys(breakdown)
            .reduce((top, cat) => breakdown[cat].total > (breakdown[top]?.total || 0) ? cat : top, '');

        if (topCategory && breakdown[topCategory]) {
            const percentage = (breakdown[topCategory].total / summary.totalExpenses * 100).toFixed(1);
            insights.push({
                icon: '📊',
                title: 'Top Spending Category',
                message: `${topCategory} accounts for ${percentage}% of your expenses (${utils.formatCurrency(breakdown[topCategory].total)}).`,
                type: 'info',
                priority: 'medium'
            });
        }

        // Average daily spending
        const daysInPeriod = this.currentPeriod === 'all' ? 365 : (parseInt(this.currentPeriod) * 30);
        const avgDaily = summary.totalExpenses / daysInPeriod;
        insights.push({
            icon: '📅',
            title: 'Daily Average',
            message: `Your average daily spending is ${utils.formatCurrency(avgDaily)}.`,
            type: 'info',
            priority: 'low'
        });

        // Savings rate
        if (summary.totalIncome > 0) {
            const savingsRate = ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome * 100).toFixed(1);
            const icon = savingsRate >= 20 ? '🎯' : savingsRate >= 10 ? '📈' : '📉';
            const type = savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'info' : 'warning';
            
            insights.push({
                icon: icon,
                title: 'Savings Rate',
                message: `You're saving ${savingsRate}% of your income. ${savingsRate >= 20 ? 'Excellent!' : savingsRate >= 10 ? 'Good job!' : 'Consider reducing expenses.'}`,
                type: type,
                priority: 'high'
            });
        }

        return insights.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    displayInsights(insights) {
        const insightsGrid = document.getElementById('insights-grid');
        if (!insightsGrid) return;

        insightsGrid.innerHTML = '';

        if (insights.length === 0) {
            insightsGrid.innerHTML = `
                <div class="insight-item">
                    <div class="insight-icon">💡</div>
                    <div class="insight-content">
                        <h4>No Insights Available</h4>
                        <p>Add more transactions to get personalized financial insights.</p>
                    </div>
                </div>
            `;
            return;
        }

        insights.slice(0, 6).forEach(insight => {
            const insightEl = document.createElement('div');
            insightEl.className = `insight-item ${insight.type}`;
            insightEl.innerHTML = `
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.message}</p>
                </div>
            `;
            insightsGrid.appendChild(insightEl);
        });
    }
}

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsManager = new AdvancedAnalyticsManager();
});

// Add chart styling
const chartStyle = document.createElement('style');
chartStyle.textContent = `
    .chart-container {
        position: relative;
        height: 300px;
    }
    
    .insight-item {
        transition: var(--transition);
        cursor: pointer;
    }
    
    .insight-item:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }
    
    .insight-item.warning {
        border-left: 4px solid var(--warning);
    }
    
    .insight-item.success {
        border-left: 4px solid var(--success);
    }
    
    .insight-item.info {
        border-left: 4px solid var(--info);
    }
    
    .trend-indicator {
        font-size: 1.2rem;
    }
    
    @media (max-width: 768px) {
        .charts-grid {
            grid-template-columns: 1fr;
        }
        
        .chart-container {
            height: 250px;
        }
        
        .insights-grid {
            grid-template-columns: 1fr;
        }
        
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
    
    @media (max-width: 480px) {
        .stats-grid {
            grid-template-columns: 1fr;
        }
        
        .chart-container {
            height: 200px;
        }
    }
`;
document.head.appendChild(chartStyle);
