import { supabase } from './supabase.js';
import { showToast, formatCurrency, showLoader, hideLoader, validateAuth } from './supabase.js';

// Budget management class
class BudgetManager {
    constructor() {
        this.currentPeriod = 'current';
        this.budgets = [];
        this.filteredBudgets = [];
        this.currentUser = null;
        this.charts = {};

        this.init();
    }

    async init() {
        try {
            // Check authentication
            this.currentUser = await validateAuth();
            if (!this.currentUser) return;

            // Initialize UI components
            this.initializeEventListeners();
            this.initializeUserInterface();

            this.setupMobileNavigation();

            // Load initial data
            await this.loadBudgets();
            await this.updateBudgetOverview();
            this.initializeCharts();

        } catch (error) {
            console.error('Failed to initialize budget manager:', error);
            showToast('Failed to initialize budget management', 'error');
        }
    }

    initializeEventListeners() {
        // Period selector
        const periodSelect = document.getElementById('budget-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.loadBudgets();
                this.updateBudgetOverview();
            });
        }

        // Create budget button and modal
        const createBudgetBtn = document.getElementById('create-budget-btn');
        const createBudgetModal = document.getElementById('create-budget-modal');
        const closeCreateModal = document.getElementById('close-create-budget-modal');
        const cancelCreateBtn = document.getElementById('cancel-create-budget');
        const createBudgetForm = document.getElementById('create-budget-form');

        if (createBudgetBtn) {
            createBudgetBtn.addEventListener('click', () => {
                this.openCreateBudgetModal();
            });
        }

        if (closeCreateModal) {
            closeCreateModal.addEventListener('click', () => {
                this.closeCreateBudgetModal();
            });
        }

        if (cancelCreateBtn) {
            cancelCreateBtn.addEventListener('click', () => {
                this.closeCreateBudgetModal();
            });
        }

        if (createBudgetForm) {
            createBudgetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createBudget();
            });
        }

        // Edit budget modal
        const editBudgetModal = document.getElementById('edit-budget-modal');
        const closeEditModal = document.getElementById('close-edit-budget-modal');
        const cancelEditBtn = document.getElementById('cancel-edit-budget');
        const editBudgetForm = document.getElementById('edit-budget-form');

        if (closeEditModal) {
            closeEditModal.addEventListener('click', () => {
                this.closeEditBudgetModal();
            });
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.closeEditBudgetModal();
            });
        }

        if (editBudgetForm) {
            editBudgetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateBudget();
            });
        }

        // Delete budget modal
        const deleteBudgetModal = document.getElementById('delete-budget-modal');
        const closeDeleteModal = document.getElementById('close-delete-budget-modal');
        const cancelDeleteBtn = document.getElementById('cancel-delete-budget');
        const confirmDeleteBtn = document.getElementById('confirm-delete-budget');

        if (closeDeleteModal) {
            closeDeleteModal.addEventListener('click', () => {
                this.closeDeleteBudgetModal();
            });
        }

        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                this.closeDeleteBudgetModal();
            });
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.deleteBudget();
            });
        }

        // Search and filter
        const searchInput = document.getElementById('budget-search');
        const filterSelect = document.getElementById('budget-filter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterBudgets(e.target.value, filterSelect?.value || 'all');
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterBudgets(searchInput?.value || '', e.target.value);
            });
        }

        // User menu functionality
        const userMenuButton = document.getElementById('user-menu-button');
        const userDropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');

        if (userMenuButton && userDropdown) {
            userMenuButton.addEventListener('click', () => {
                const isVisible = userDropdown.style.display === 'block';
                userDropdown.style.display = isVisible ? 'none' : 'block';
            });

            document.addEventListener('click', (e) => {
                if (!userMenuButton.contains(e.target)) {
                    userDropdown.style.display = 'none';
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await supabase.auth.signOut();
                    window.location.href = 'auth.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    showToast('Failed to logout', 'error');
                }
            });
        }

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            const modals = [createBudgetModal, editBudgetModal, deleteBudgetModal];
            modals.forEach(modal => {
                if (modal && e.target === modal) {
                    modal.style.display = 'none';
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

    initializeUserInterface() {
        // Set user information
        if (this.currentUser) {
            const userEmail = document.getElementById('user-email');
            const userInitial = document.getElementById('user-initial');

            if (userEmail) {
                userEmail.textContent = this.currentUser.email;
            }

            if (userInitial) {
                userInitial.textContent = this.currentUser.email.charAt(0).toUpperCase();
            }
        }

        // Set default start date to beginning of current month
        const startDateInput = document.getElementById('budget-start-date');
        if (startDateInput) {
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
        }
    }

    async loadBudgets() {
        try {
            showLoader();

            // Get period dates
            const { startDate, endDate } = this.getPeriodDates(this.currentPeriod);

            // Fetch budgets from database
            const { data: budgets, error: budgetError } = await supabase
                .from('budgets')
                .select('id, user_id, name, category, limit_amount, period_type, start_date, end_date, warning_threshold, alerts, rollover, status, created_at, updated_at')
                .eq('user_id', this.currentUser.id)
                .gte('start_date', startDate.toISOString())
                .lte('start_date', endDate.toISOString())
                .order('created_at', { ascending: false });

            if (budgetError) throw budgetError;

            // Get spending data for each budget
            this.budgets = await Promise.all(budgets.map(async (budget) => {
                const spent = await this.getBudgetSpent(budget.id, budget.category);
                const progress = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
                const remaining = Math.max(0, budget.limit_amount - spent);

                let status = 'on-track';
                if (progress >= 100) {
                    status = 'over-budget';
                } else if (progress >= (budget.warning_threshold * 100)) {
                    status = 'warning';
                }

                return {
                    ...budget,
                    spent,
                    progress,
                    remaining,
                    status
                };
            }));

            this.filteredBudgets = [...this.budgets];
            this.renderBudgets();
            this.updateBudgetOverview();
            this.updateBudgetInsights();

        } catch (error) {
            console.error('Failed to load budgets:', error);
            showToast('Failed to load budgets', 'error');
        } finally {
            hideLoader();
        }
    }

    async getBudgetSpent(budgetId, category) {
        try {
            const { startDate, endDate } = this.getPeriodDates(this.currentPeriod);

            let query = supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', this.currentUser.id)
                .eq('type', 'expense')
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString());

            // If category is "All", don't filter by category to get total spending
            if (category !== 'All') {
                query = query.eq('category', category);
            }

            const { data: transactions, error } = await query;

            if (error) throw error;

            return transactions.reduce((total, transaction) => {
                return total + Math.abs(transaction.amount);
            }, 0);

        } catch (error) {
            console.error('Failed to get budget spent amount:', error);
            return 0;
        }
    }

    getPeriodDates(period) {
        const now = new Date();
        let startDate, endDate;

        switch (period) {
            case 'current':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'next':
                startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                break;
            case 'quarter':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
                endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        return { startDate, endDate };
    }

    renderBudgets() {
        const budgetGrid = document.getElementById('budget-grid');
        const emptyState = document.getElementById('budgets-empty-state');
        const budgetCount = document.getElementById('budget-categories-count');

        if (!budgetGrid) return;

        if (this.filteredBudgets.length === 0) {
            budgetGrid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
        } else {
            budgetGrid.style.display = 'grid';
            if (emptyState) emptyState.style.display = 'none';

            budgetGrid.innerHTML = this.filteredBudgets.map(budget => {
                const progressColor = this.getProgressColor(budget.status);

                return `
                    <div class="budget-card ${budget.status}" data-budget-id="${budget.id}">
                        <div class="budget-card-header">
                            <div class="budget-info">
                                <h3 class="budget-name">${budget.name}</h3>
                                <p class="budget-category">${budget.category}</p>
                            </div>
                            <div class="budget-actions">
                                <button class="btn-icon" onclick="budgetManager.editBudgetModal('${budget.id}')" title="Edit Budget">
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                    </svg>
                                </button>
                                <button class="btn-icon btn-danger" onclick="budgetManager.deleteBudgetModal('${budget.id}')" title="Delete Budget">
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="budget-amounts">
                            <div class="amount-row">
                                <span>Spent:</span>
                                <span class="amount spent">${formatCurrency(budget.spent)}</span>
                            </div>
                            <div class="amount-row">
                                <span>Budget:</span>
                                <span class="amount budget">${formatCurrency(budget.limit_amount)}</span>
                            </div>
                            <div class="amount-row">
                                <span>Remaining:</span>
                                <span class="amount remaining ${budget.remaining < 0 ? 'negative' : ''}">${formatCurrency(budget.remaining)}</span>
                            </div>
                        </div>

                        <div class="budget-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(budget.progress, 100)}%; background-color: ${progressColor};"></div>
                            </div>
                            <div class="progress-info">
                                <span class="progress-percentage">${budget.progress.toFixed(1)}%</span>
                                <span class="progress-status ${budget.status}">${this.getStatusText(budget.status)}</span>
                            </div>
                        </div>

                        <div class="budget-period-info">
                            <div class="period-text">
                                <svg width="14" height="14" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z"/>
                                </svg>
                                ${this.formatBudgetPeriod(budget)}
                            </div>
                            ${budget.alerts ? `
                                <div class="alert-indicator" title="Alerts enabled">
                                    <svg width="14" height="14" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21"/>
                                    </svg>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (budgetCount) {
            budgetCount.textContent = `${this.filteredBudgets.length} active budget${this.filteredBudgets.length !== 1 ? 's' : ''}`;
        }
    }

    getProgressColor(status) {
        switch (status) {
            case 'on-track': return '#10B981';
            case 'warning': return '#F59E0B';
            case 'over-budget': return '#EF4444';
            default: return '#6B7280';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'on-track': return 'On Track';
            case 'warning': return 'Warning';
            case 'over-budget': return 'Over Budget';
            default: return 'Unknown';
        }
    }

    formatBudgetPeriod(budget) {
        const startDate = new Date(budget.start_date);
        const periodType = budget.period_type || 'monthly';

        switch (periodType) {
            case 'weekly':
                return `Week of ${startDate.toLocaleDateString()}`;
            case 'monthly':
                return `${startDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}`;
            case 'quarterly':
                const quarter = Math.floor(startDate.getMonth() / 3) + 1;
                return `Q${quarter} ${startDate.getFullYear()}`;
            case 'yearly':
                return `${startDate.getFullYear()}`;
            default:
                return startDate.toLocaleDateString();
        }
    }

    async updateBudgetOverview() {
        const totalBudgetEl = document.getElementById('total-budget-amount');
        const totalSpentEl = document.getElementById('total-spent-amount');
        const remainingBudgetEl = document.getElementById('remaining-budget-amount');
        const budgetUsageEl = document.getElementById('budget-usage-percent');
        const budgetHealthEl = document.getElementById('budget-health-status');
        const budgetHealthDescEl = document.getElementById('budget-health-description');
        const daysLeftEl = document.getElementById('days-left-text');
        const periodTextEl = document.getElementById('budget-period-text');

        if (!this.budgets.length) {
            if (totalBudgetEl) totalBudgetEl.textContent = formatCurrency(0);
            if (totalSpentEl) totalSpentEl.textContent = formatCurrency(0);
            if (remainingBudgetEl) remainingBudgetEl.textContent = formatCurrency(0);
            if (budgetUsageEl) budgetUsageEl.textContent = '0% of budget used';
            if (budgetHealthEl) budgetHealthEl.textContent = 'No Data';
            if (budgetHealthDescEl) budgetHealthDescEl.textContent = 'No budgets created';
            return;
        }

        // Handle "All" category budgets separately to avoid double counting
        const allCategoryBudgets = this.budgets.filter(b => b.category === 'All');
        const specificCategoryBudgets = this.budgets.filter(b => b.category !== 'All');

        let totalBudget, totalSpent;

        if (allCategoryBudgets.length > 0) {
            // If there's an "All" category budget, use it for totals
            totalBudget = allCategoryBudgets.reduce((sum, budget) => sum + budget.limit_amount, 0);
            totalSpent = allCategoryBudgets.reduce((sum, budget) => sum + budget.spent, 0);
        } else {
            // Otherwise, sum up all specific category budgets
            totalBudget = specificCategoryBudgets.reduce((sum, budget) => sum + budget.limit_amount, 0);
            totalSpent = specificCategoryBudgets.reduce((sum, budget) => sum + budget.spent, 0);
        }
        const totalRemaining = totalBudget - totalSpent;
        const usagePercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        // Update overview cards
        if (totalBudgetEl) totalBudgetEl.textContent = formatCurrency(totalBudget);
        if (totalSpentEl) totalSpentEl.textContent = formatCurrency(totalSpent);
        if (remainingBudgetEl) remainingBudgetEl.textContent = formatCurrency(totalRemaining);
        if (budgetUsageEl) budgetUsageEl.textContent = `${usagePercent.toFixed(1)}% of budget used`;

        // Calculate budget health
        let healthStatus = 'Good';
        let healthDescription = 'On track';

        // Calculate budget health based on relevant budgets
        const relevantBudgets = allCategoryBudgets.length > 0 ? allCategoryBudgets : specificCategoryBudgets;
        const overBudgetCount = relevantBudgets.filter(b => b.status === 'over-budget').length;
        const warningCount = relevantBudgets.filter(b => b.status === 'warning').length;

        if (overBudgetCount > 0) {
            healthStatus = 'Poor';
            healthDescription = `${overBudgetCount} budget${overBudgetCount > 1 ? 's' : ''} over limit`;
        } else if (warningCount > 0) {
            healthStatus = 'Warning';
            healthDescription = `${warningCount} budget${warningCount > 1 ? 's' : ''} need attention`;
        }

        if (budgetHealthEl) budgetHealthEl.textContent = healthStatus;
        if (budgetHealthDescEl) budgetHealthDescEl.textContent = healthDescription;

        // Calculate days left in period
        const { endDate } = this.getPeriodDates(this.currentPeriod);
        const now = new Date();
        const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

        if (daysLeftEl) {
            daysLeftEl.textContent = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
        }

        // Update period text
        if (periodTextEl) {
            const periodNames = {
                current: 'This Month',
                next: 'Next Month',
                quarter: 'This Quarter',
                year: 'This Year'
            };
            periodTextEl.textContent = periodNames[this.currentPeriod] || 'This Month';
        }

        // Update charts
        this.updateBudgetProgressChart();
    }

    filterBudgets(searchTerm, filterStatus) {
        this.filteredBudgets = this.budgets.filter(budget => {
            const matchesSearch = !searchTerm ||
                budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                budget.category.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFilter = filterStatus === 'all' || budget.status === filterStatus;

            return matchesSearch && matchesFilter;
        });

        this.renderBudgets();
    }

    openCreateBudgetModal() {
        const modal = document.getElementById('create-budget-modal');
        if (modal) {
            modal.style.display = 'flex';

            // Set default start date
            const startDateInput = document.getElementById('budget-start-date');
            if (startDateInput && !startDateInput.value) {
                const now = new Date();
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                startDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
            }
        }
    }

    closeCreateBudgetModal() {
        const modal = document.getElementById('create-budget-modal');
        const form = document.getElementById('create-budget-form');

        if (modal) modal.style.display = 'none';
        if (form) form.reset();

        // Reset default start date
        const startDateInput = document.getElementById('budget-start-date');
        if (startDateInput) {
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
        }
    }

    async createBudget() {
        try {
            const form = document.getElementById('create-budget-form');
            const formData = new FormData(form);
            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');

            // Show loading state
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            submitBtn.disabled = true;

            const budgetData = {
                user_id: this.currentUser.id,
                name: formData.get('name'),
                category: formData.get('category'),
                limit_amount: parseFloat(formData.get('limit')),
                period_type: formData.get('periodType'),
                start_date: formData.get('startDate'),
                warning_threshold: parseFloat(formData.get('warningThreshold')),
                alerts: formData.has('alerts'),
                rollover: formData.has('rollover'),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('budgets')
                .insert([budgetData])
                .select()
                .single();

            if (error) throw error;

            showToast('Budget created successfully!', 'success');
            this.closeCreateBudgetModal();
            await this.loadBudgets();

        } catch (error) {
            console.error('Failed to create budget:', error);
            showToast(error.message || 'Failed to create budget', 'error');
        } finally {
            // Reset button state
            const form = document.getElementById('create-budget-form');
            const submitBtn = form?.querySelector('button[type="submit"]');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');

            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    editBudgetModal(budgetId) {
        const budget = this.budgets.find(b => b.id === budgetId);
        if (!budget) return;

        const modal = document.getElementById('edit-budget-modal');
        if (!modal) return;

        // Populate form fields
        document.getElementById('edit-budget-id').value = budget.id;
        document.getElementById('edit-budget-name').value = budget.name;
        document.getElementById('edit-budget-category').value = budget.category;
        document.getElementById('edit-budget-limit').value = budget.limit_amount;
        document.getElementById('edit-budget-warning-threshold').value = budget.warning_threshold;
        document.getElementById('edit-budget-alerts').checked = budget.alerts;
        document.getElementById('edit-budget-rollover').checked = budget.rollover;

        modal.style.display = 'flex';
    }

    closeEditBudgetModal() {
        const modal = document.getElementById('edit-budget-modal');
        const form = document.getElementById('edit-budget-form');

        if (modal) modal.style.display = 'none';
        if (form) form.reset();
    }

    async updateBudget() {
        try {
            const form = document.getElementById('edit-budget-form');
            const formData = new FormData(form);
            const budgetId = document.getElementById('edit-budget-id').value;
            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');

            // Show loading state
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            submitBtn.disabled = true;

            const budgetData = {
                name: formData.get('name'),
                category: formData.get('category'),
                limit_amount: parseFloat(formData.get('limit')),
                warning_threshold: parseFloat(formData.get('warningThreshold')),
                alerts: formData.has('alerts'),
                rollover: formData.has('rollover'),
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('budgets')
                .update(budgetData)
                .eq('id', budgetId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            showToast('Budget updated successfully!', 'success');
            this.closeEditBudgetModal();
            await this.loadBudgets();

        } catch (error) {
            console.error('Failed to update budget:', error);
            showToast(error.message || 'Failed to update budget', 'error');
        } finally {
            // Reset button state
            const form = document.getElementById('edit-budget-form');
            const submitBtn = form?.querySelector('button[type="submit"]');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');

            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    deleteBudgetModal(budgetId) {
        const budget = this.budgets.find(b => b.id === budgetId);
        if (!budget) return;

        const modal = document.getElementById('delete-budget-modal');
        const budgetInfo = document.getElementById('budget-delete-info');

        if (!modal) return;

        // Set the budget ID for deletion
        modal.setAttribute('data-budget-id', budgetId);

        // Show budget information
        if (budgetInfo) {
            budgetInfo.innerHTML = `
                <div class="budget-delete-summary">
                    <h4>${budget.name}</h4>
                    <p><strong>Category:</strong> ${budget.category}</p>
                    <p><strong>Budget:</strong> ${formatCurrency(budget.limit_amount)}</p>
                    <p><strong>Spent:</strong> ${formatCurrency(budget.spent)}</p>
                </div>
            `;
        }

        modal.style.display = 'flex';
    }

    closeDeleteBudgetModal() {
        const modal = document.getElementById('delete-budget-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.removeAttribute('data-budget-id');
        }
    }

    async deleteBudget() {
        try {
            const modal = document.getElementById('delete-budget-modal');
            const budgetId = modal.getAttribute('data-budget-id');

            if (!budgetId) return;

            const confirmBtn = document.getElementById('confirm-delete-budget');
            const btnText = confirmBtn.querySelector('.btn-text');
            const btnLoader = confirmBtn.querySelector('.btn-loader');

            // Show loading state
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            confirmBtn.disabled = true;

            const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('id', budgetId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            showToast('Budget deleted successfully!', 'success');
            this.closeDeleteBudgetModal();
            await this.loadBudgets();

        } catch (error) {
            console.error('Failed to delete budget:', error);
            showToast(error.message || 'Failed to delete budget', 'error');
        } finally {
            // Reset button state
            const confirmBtn = document.getElementById('confirm-delete-budget');
            const btnText = confirmBtn?.querySelector('.btn-text');
            const btnLoader = confirmBtn?.querySelector('.btn-loader');

            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }

    initializeCharts() {
        this.initializeBudgetProgressChart();
    }

    initializeBudgetProgressChart() {
        const canvas = document.getElementById('budgetProgressChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        this.charts.budgetProgress = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 2,
                    borderColor: '#1F2937'
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
                            usePointStyle: true,
                            color: '#374151'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = formatCurrency(context.parsed);
                                const percentage = ((context.parsed / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });

        this.updateBudgetProgressChart();
    }

    updateBudgetProgressChart() {
        if (!this.charts.budgetProgress || !this.budgets.length) return;

        const chartData = this.budgets
            .filter(budget => budget.spent > 0)
            .map(budget => ({
                name: budget.name,
                spent: budget.spent,
                color: this.getProgressColor(budget.status)
            }))
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 8); // Show top 8 budgets

        this.charts.budgetProgress.data.labels = chartData.map(item => item.name);
        this.charts.budgetProgress.data.datasets[0].data = chartData.map(item => item.spent);
        this.charts.budgetProgress.data.datasets[0].backgroundColor = chartData.map(item => item.color);
        this.charts.budgetProgress.update();
    }

    updateBudgetInsights() {
        const insightsGrid = document.getElementById('budget-insights-grid');
        if (!insightsGrid || !this.budgets.length) {
            if (insightsGrid) insightsGrid.innerHTML = '<p class="no-insights">No insights available yet. Create budgets to see smart recommendations.</p>';
            return;
        }

        const insights = this.generateBudgetInsights();

        insightsGrid.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-icon">
                    ${insight.icon}
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                    ${insight.action ? `<button class="btn btn-sm btn-outline" onclick="${insight.action}">${insight.actionText}</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    generateBudgetInsights() {
        const insights = [];

        // Handle "All" category budgets separately for insights
        const allCategoryBudgets = this.budgets.filter(b => b.category === 'All');
        const specificCategoryBudgets = this.budgets.filter(b => b.category !== 'All');
        const relevantBudgets = allCategoryBudgets.length > 0 ? allCategoryBudgets : specificCategoryBudgets;

        // Over budget warnings
        const overBudgets = relevantBudgets.filter(b => b.status === 'over-budget');
        if (overBudgets.length > 0) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Over Budget Alert',
                description: `You have ${overBudgets.length} budget${overBudgets.length > 1 ? 's' : ''} that have exceeded their limits. Consider reviewing your spending in these categories.`,
                action: null,
                actionText: 'Review Budgets'
            });
        }

        // Best performing budget
        const onTrackBudgets = relevantBudgets.filter(b => b.status === 'on-track');
        if (onTrackBudgets.length > 0) {
            const bestBudget = onTrackBudgets.sort((a, b) => a.progress - b.progress)[0];
            insights.push({
                type: 'success',
                icon: '🎯',
                title: 'Great Progress',
                description: `Your "${bestBudget.name}" budget is performing well at ${bestBudget.progress.toFixed(1)}% usage. Keep up the good work!`,
                action: null,
                actionText: null
            });
        }

        // Spending trend insight
        const totalSpent = relevantBudgets.reduce((sum, b) => sum + b.spent, 0);
        const totalBudget = relevantBudgets.reduce((sum, b) => sum + b.limit_amount, 0);
        const overallUsage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        if (overallUsage < 50) {
            insights.push({
                type: 'info',
                icon: '💡',
                title: 'Conservative Spending',
                description: `You're using ${overallUsage.toFixed(1)}% of your total budget. Consider if your budgets are too conservative or if you have opportunity to invest savings.`,
                action: null,
                actionText: null
            });
        }

        // Category with highest spending (only show for specific categories, not "All")
        if (specificCategoryBudgets.length > 1) {
            const highestSpentBudget = specificCategoryBudgets.sort((a, b) => b.spent - a.spent)[0];
            if (highestSpentBudget.spent > 0) {
                insights.push({
                    type: 'info',
                    icon: '📊',
                    title: 'Top Spending Category',
                    description: `"${highestSpentBudget.category}" is your highest spending category at ${formatCurrency(highestSpentBudget.spent)} this period.`,
                    action: null,
                    actionText: null
                });
            }
        }

        // Budget without spending
        const unusedBudgets = relevantBudgets.filter(b => b.spent === 0);
        if (unusedBudgets.length > 0) {
            insights.push({
                type: 'neutral',
                icon: '📝',
                title: 'Unused Budgets',
                description: `You have ${unusedBudgets.length} budget${unusedBudgets.length > 1 ? 's' : ''} with no spending yet. Consider if these budgets are still relevant.`,
                action: null,
                actionText: null
            });
        }

        return insights.slice(0, 4); // Limit to 4 insights
    }
}

// Initialize budget manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.budgetManager = new BudgetManager();
});

// Export for use in HTML onclick handlers
window.budgetManager = null;
