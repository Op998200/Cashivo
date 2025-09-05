// Budget Manager Component for Cashivo Dashboard
import { 
    getUserBudgets, 
    createBudget, 
    updateBudget, 
    deleteBudget, 
    getAllBudgetProgress,
    checkBudgetAlerts 
} from './budget-utils.js';
import { getCategories } from './utils.js';

class BudgetManager {
    constructor() {
        this.budgets = [];
        this.categories = [];
        this.currentEditingBudget = null;
    }

    async init() {
        try {
            await this.loadData();
            this.renderBudgetSection();
            this.setupEventListeners();
            await this.checkAndShowAlerts();
        } catch (error) {
            console.error('Error initializing budget manager:', error);
        }
    }

    async loadData() {
        try {
            this.budgets = await getUserBudgets();
            this.categories = await getCategories();
        } catch (error) {
            console.error('Error loading budget data:', error);
            throw error;
        }
    }

    renderBudgetSection() {
        const budgetSection = document.getElementById('budgetManagement');
        if (!budgetSection) return;

        budgetSection.innerHTML = `
            <div class="section-header">
                <h3>Budget Management</h3>
                <button class="btn btn-primary" id="addBudgetBtn">Add Budget</button>
            </div>
            <div class="budget-grid" id="budgetGrid">
                ${this.renderBudgetCards()}
            </div>
            ${this.renderBudgetForm()}
        `;
    }

    renderBudgetCards() {
        if (this.budgets.length === 0) {
            return `
                <div class="empty-state">
                    <p>No budgets set up yet. Create your first budget to start tracking!</p>
                </div>
            `;
        }

        return this.budgets.map(budget => {
            const category = this.categories.find(c => c.id === budget.category);
            const categoryName = category ? category.name : 'Unknown Category';
            
            return `
                <div class="budget-card" data-budget-id="${budget.id}">
                    <div class="budget-header">
                        <h4>${categoryName}</h4>
                        <div class="budget-actions">
                            <button class="btn-icon edit-budget" data-budget-id="${budget.id}">✏️</button>
                            <button class="btn-icon delete-budget" data-budget-id="${budget.id}">🗑️</button>
                        </div>
                    </div>
                    <div class="budget-details">
                        <div class="budget-amount">$${parseFloat(budget.amount).toFixed(2)}/${budget.period}</div>
                        <div class="budget-period">${budget.period} budget</div>
                    </div>
                    <div class="budget-dates">
                        <small>From: ${new Date(budget.start_date).toLocaleDateString()}</small>
                        ${budget.end_date ? `<small>To: ${new Date(budget.end_date).toLocaleDateString()}</small>` : ''}
                    </div>
                    <div class="budget-status">
                        <span class="status-badge ${budget.is_active ? 'active' : 'inactive'}">
                            ${budget.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderBudgetForm(budget = null) {
        const isEditing = !!budget;
        
        return `
            <div class="modal" id="budgetModal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${isEditing ? 'Edit Budget' : 'Add New Budget'}</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <form id="budgetForm">
                        <input type="hidden" id="budget_id" value="${budget?.id || ''}">
                        
                        <div class="form-group">
                            <label for="budget_category">Category</label>
                            <select id="budget_category" required>
                                <option value="">Select a category</option>
                                ${this.categories
                                    .filter(cat => cat.type === 'expense')
                                    .map(cat => `
                                        <option value="${cat.id}" ${budget?.category === cat.id ? 'selected' : ''}>
                                            ${cat.name}
                                        </option>
                                    `).join('')}
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="budget_amount">Amount ($)</label>
                            <input type="number" id="budget_amount" step="0.01" min="0.01" 
                                   value="${budget?.amount || ''}" required>
                        </div>

                        <div class="form-group">
                            <label for="budget_period">Period</label>
                            <select id="budget_period" required>
                                <option value="monthly" ${budget?.period === 'monthly' ? 'selected' : ''}>Monthly</option>
                                <option value="weekly" ${budget?.period === 'weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="yearly" ${budget?.period === 'yearly' ? 'selected' : ''}>Yearly</option>
                            </select>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="budget_start_date">Start Date</label>
                                <input type="date" id="budget_start_date" 
                                       value="${budget?.start_date || new Date().toISOString().split('T')[0]}" required>
                            </div>
                            <div class="form-group">
                                <label for="budget_end_date">End Date (Optional)</label>
                                <input type="date" id="budget_end_date" value="${budget?.end_date || ''}">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="budget_active" ${budget?.is_active !== false ? 'checked' : ''}>
                                Active Budget
                            </label>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelBudget">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                ${isEditing ? 'Update Budget' : 'Create Budget'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Add budget button
        document.getElementById('addBudgetBtn')?.addEventListener('click', () => {
            this.showBudgetForm();
        });

        // Edit budget buttons
        document.querySelectorAll('.edit-budget').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const budgetId = e.target.dataset.budgetId;
                const budget = this.budgets.find(b => b.id === budgetId);
                if (budget) {
                    this.showBudgetForm(budget);
                }
            });
        });

        // Delete budget buttons
        document.querySelectorAll('.delete-budget').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const budgetId = e.target.dataset.budgetId;
                if (confirm('Are you sure you want to delete this budget?')) {
                    try {
                        await deleteBudget(budgetId);
                        await this.loadData();
                        this.renderBudgetSection();
                        this.setupEventListeners();
                    } catch (error) {
                        alert('Error deleting budget: ' + error.message);
                    }
                }
            });
        });

        // Budget form submission
        document.getElementById('budgetForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleBudgetSubmit();
        });

        // Modal close buttons
        document.querySelectorAll('.close-modal, #cancelBudget').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideBudgetForm();
            });
        });
    }

    showBudgetForm(budget = null) {
        this.currentEditingBudget = budget;
        const modal = document.getElementById('budgetModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideBudgetForm() {
        const modal = document.getElementById('budgetModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentEditingBudget = null;
    }

    async handleBudgetSubmit() {
        const formData = {
            category: document.getElementById('budget_category').value,
            amount: parseFloat(document.getElementById('budget_amount').value),
            period: document.getElementById('budget_period').value,
            start_date: document.getElementById('budget_start_date').value,
            end_date: document.getElementById('budget_end_date').value || null,
            is_active: document.getElementById('budget_active').checked
        };

        const budgetId = document.getElementById('budget_id').value;

        try {
            if (budgetId) {
                await updateBudget(budgetId, formData);
            } else {
                await createBudget(formData);
            }

            await this.loadData();
            this.renderBudgetSection();
            this.setupEventListeners();
            this.hideBudgetForm();
        } catch (error) {
            alert('Error saving budget: ' + error.message);
        }
    }

    async checkAndShowAlerts() {
        try {
            const alerts = await checkBudgetAlerts();
            if (alerts.length > 0) {
                this.showBudgetAlerts(alerts);
            }
        } catch (error) {
            console.error('Error checking budget alerts:', error);
        }
    }

    showBudgetAlerts(alerts) {
        const alertContainer = document.createElement('div');
        alertContainer.className = 'budget-alerts';
        
        alerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = 'budget-alert';
            alertElement.innerHTML = `
                <div class="alert-icon">⚠️</div>
                <div class="alert-content">
                    <strong>Budget Alert: ${alert.category}</strong>
                    <p>${alert.message}</p>
                    <small>Spent: $${alert.spent.toFixed(2)} / Budget: $${alert.budget.toFixed(2)}</small>
                </div>
                <button class="close-alert">&times;</button>
            `;
            alertContainer.appendChild(alertElement);
        });

        // Add to dashboard
        const dashboard = document.querySelector('main');
        if (dashboard) {
            dashboard.insertBefore(alertContainer, dashboard.firstChild);
        }

        // Close alert handlers
        alertContainer.querySelectorAll('.close-alert').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.budget-alert').remove();
            });
        });
    }
}

// Initialize budget manager when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const budgetManager = new BudgetManager();
    await budgetManager.init();
});

export default BudgetManager;
