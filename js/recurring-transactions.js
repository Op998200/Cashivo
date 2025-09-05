// Recurring Transactions System for Cashivo
import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { saveTransaction, getCategories } from './utils.js';

class RecurringTransactionManager {
    constructor() {
        this.recurringTransactions = [];
        this.processInterval = null;
    }

    async initialize() {
        try {
            await this.loadRecurringTransactions();
            this.startAutoProcessing();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing recurring transactions:', error);
        }
    }

    async loadRecurringTransactions() {
        try {
            const user = await getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('recurring_transactions')
                .select(`
                    *,
                    categories (
                        id,
                        name,
                        color
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.recurringTransactions = data || [];
        } catch (error) {
            console.error('Error loading recurring transactions:', error);
            throw error;
        }
    }

    startAutoProcessing() {
        // Check for due recurring transactions every hour
        this.processInterval = setInterval(async () => {
            await this.processDueTransactions();
        }, 60 * 60 * 1000); // 1 hour

        // Also check immediately
        this.processDueTransactions();
    }

    async processDueTransactions() {
        try {
            const today = new Date();
            const dueTransactions = this.recurringTransactions.filter(rt => 
                rt.is_active && 
                new Date(rt.next_date) <= today &&
                (!rt.end_date || new Date(rt.end_date) >= today)
            );

            for (const recurring of dueTransactions) {
                await this.processRecurringTransaction(recurring);
            }
        } catch (error) {
            console.error('Error processing due transactions:', error);
        }
    }

    async processRecurringTransaction(recurring) {
        try {
            // Create the actual transaction
            const transaction = {
                type: recurring.type,
                amount: recurring.amount,
                category: recurring.category,
                description: `${recurring.description} (Recurring)`,
                date: new Date().toISOString().split('T')[0],
                payment_method: 'auto',
                is_recurring: true,
                recurring_parent_id: recurring.id
            };

            await saveTransaction(transaction);

            // Calculate next date based on frequency
            const nextDate = this.calculateNextDate(new Date(recurring.next_date), recurring.frequency);

            // Update the recurring transaction
            await this.updateRecurringTransaction(recurring.id, {
                next_date: nextDate.toISOString().split('T')[0]
            });

            console.log(`Processed recurring transaction: ${recurring.description}`);
        } catch (error) {
            console.error(`Error processing recurring transaction ${recurring.id}:`, error);
        }
    }

    calculateNextDate(currentDate, frequency) {
        const nextDate = new Date(currentDate);
        
        switch (frequency) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'bi-weekly':
                nextDate.setDate(nextDate.getDate() + 14);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            default:
                nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
        }
        
        return nextDate;
    }

    async createRecurringTransaction(data) {
        try {
            const user = await getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('recurring_transactions')
                .insert([{
                    user_id: user.id,
                    type: data.type,
                    amount: data.amount,
                    category: data.category,
                    description: data.description,
                    frequency: data.frequency,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    next_date: data.start_date,
                    is_active: data.is_active !== false
                }]);

            if (error) throw error;
            await this.loadRecurringTransactions();
        } catch (error) {
            console.error('Error creating recurring transaction:', error);
            throw error;
        }
    }

    async updateRecurringTransaction(id, data) {
        try {
            const { error } = await supabase
                .from('recurring_transactions')
                .update(data)
                .eq('id', id);

            if (error) throw error;
            await this.loadRecurringTransactions();
        } catch (error) {
            console.error('Error updating recurring transaction:', error);
            throw error;
        }
    }

    async deleteRecurringTransaction(id) {
        try {
            const { error } = await supabase
                .from('recurring_transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await this.loadRecurringTransactions();
        } catch (error) {
            console.error('Error deleting recurring transaction:', error);
            throw error;
        }
    }

    async toggleRecurringTransaction(id, isActive) {
        try {
            await this.updateRecurringTransaction(id, { is_active: isActive });
        } catch (error) {
            console.error('Error toggling recurring transaction:', error);
            throw error;
        }
    }

    renderRecurringTransactionsList() {
        const container = document.getElementById('recurringTransactionsList');
        if (!container) return;

        if (this.recurringTransactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No recurring transactions set up yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recurringTransactions.map(rt => this.renderRecurringTransactionCard(rt)).join('');
        this.attachRecurringEventListeners();
    }

    renderRecurringTransactionCard(recurring) {
        const category = recurring.categories;
        const nextDate = new Date(recurring.next_date);
        const isOverdue = nextDate < new Date() && recurring.is_active;
        const daysUntilNext = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));

        return `
            <div class="recurring-card ${recurring.is_active ? 'active' : 'inactive'}" data-id="${recurring.id}">
                <div class="recurring-header">
                    <div class="recurring-info">
                        <h4>${recurring.description}</h4>
                        <div class="recurring-details">
                            <span class="amount ${recurring.type}">${recurring.type === 'income' ? '+' : '-'}$${recurring.amount.toFixed(2)}</span>
                            <span class="frequency">${this.formatFrequency(recurring.frequency)}</span>
                            <span class="category" style="color: ${category?.color}">${category?.name || 'Unknown'}</span>
                        </div>
                    </div>
                    <div class="recurring-actions">
                        <button class="btn-icon edit-recurring" data-id="${recurring.id}" title="Edit">✏️</button>
                        <button class="btn-icon toggle-recurring" data-id="${recurring.id}" data-active="${recurring.is_active}" title="${recurring.is_active ? 'Pause' : 'Resume'}">
                            ${recurring.is_active ? '⏸️' : '▶️'}
                        </button>
                        <button class="btn-icon delete-recurring" data-id="${recurring.id}" title="Delete">🗑️</button>
                    </div>
                </div>
                
                <div class="recurring-schedule">
                    <div class="schedule-info">
                        <div class="next-date ${isOverdue ? 'overdue' : ''}">
                            Next: ${nextDate.toLocaleDateString()}
                            ${isOverdue ? '(Overdue)' : daysUntilNext === 0 ? '(Today)' : `(${Math.abs(daysUntilNext)} days)`}
                        </div>
                        <div class="date-range">
                            ${recurring.start_date} ${recurring.end_date ? `to ${recurring.end_date}` : '(No end date)'}
                        </div>
                    </div>
                    <div class="status-badge ${recurring.is_active ? 'active' : 'paused'}">
                        ${recurring.is_active ? 'Active' : 'Paused'}
                    </div>
                </div>
            </div>
        `;
    }

    formatFrequency(frequency) {
        const frequencies = {
            'daily': 'Daily',
            'weekly': 'Weekly',
            'bi-weekly': 'Bi-weekly',
            'monthly': 'Monthly',
            'quarterly': 'Quarterly',
            'yearly': 'Yearly'
        };
        return frequencies[frequency] || frequency;
    }

    attachRecurringEventListeners() {
        // Edit buttons
        document.querySelectorAll('.edit-recurring').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const recurring = this.recurringTransactions.find(rt => rt.id === id);
                if (recurring) {
                    this.showRecurringModal(recurring);
                }
            });
        });

        // Toggle buttons
        document.querySelectorAll('.toggle-recurring').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const isActive = e.target.dataset.active === 'true';
                try {
                    await this.toggleRecurringTransaction(id, !isActive);
                    this.renderRecurringTransactionsList();
                } catch (error) {
                    alert('Error toggling recurring transaction: ' + error.message);
                }
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-recurring').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this recurring transaction?')) {
                    try {
                        await this.deleteRecurringTransaction(id);
                        this.renderRecurringTransactionsList();
                    } catch (error) {
                        alert('Error deleting recurring transaction: ' + error.message);
                    }
                }
            });
        });
    }

    setupEventListeners() {
        // Add recurring transaction button
        const addRecurringBtn = document.getElementById('addRecurringBtn');
        if (addRecurringBtn) {
            addRecurringBtn.addEventListener('click', () => {
                this.showRecurringModal();
            });
        }

        // Recurring transactions button in quick actions
        const recurringBtn = document.getElementById('recurringBtn');
        if (recurringBtn) {
            recurringBtn.addEventListener('click', () => {
                this.showRecurringTransactionsModal();
            });
        }
    }

    showRecurringModal(recurring = null) {
        const modal = this.createRecurringModal(recurring);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    async createRecurringModal(recurring = null) {
        const isEditing = !!recurring;
        const categories = await getCategories();
        
        const modal = document.createElement('div');
        modal.className = 'modal recurring-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEditing ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <form id="recurringForm">
                    <input type="hidden" id="recurring_id" value="${recurring?.id || ''}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recurring_type">Type *</label>
                            <select id="recurring_type" required>
                                <option value="income" ${recurring?.type === 'income' ? 'selected' : ''}>Income</option>
                                <option value="expense" ${recurring?.type === 'expense' ? 'selected' : ''}>Expense</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="recurring_amount">Amount ($) *</label>
                            <input type="number" id="recurring_amount" step="0.01" min="0.01" 
                                   value="${recurring?.amount || ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recurring_category">Category *</label>
                            <select id="recurring_category" required>
                                <option value="">Select Category</option>
                                ${categories.map(cat => 
                                    `<option value="${cat.id}" ${recurring?.category === cat.id ? 'selected' : ''}>${cat.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="recurring_frequency">Frequency *</label>
                            <select id="recurring_frequency" required>
                                <option value="weekly" ${recurring?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="bi-weekly" ${recurring?.frequency === 'bi-weekly' ? 'selected' : ''}>Bi-weekly</option>
                                <option value="monthly" ${recurring?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                                <option value="quarterly" ${recurring?.frequency === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                                <option value="yearly" ${recurring?.frequency === 'yearly' ? 'selected' : ''}>Yearly</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="recurring_description">Description *</label>
                        <input type="text" id="recurring_description" value="${recurring?.description || ''}" required 
                               placeholder="e.g., Salary, Rent, Netflix subscription">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recurring_start_date">Start Date *</label>
                            <input type="date" id="recurring_start_date" 
                                   value="${recurring?.start_date || new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label for="recurring_end_date">End Date (Optional)</label>
                            <input type="date" id="recurring_end_date" value="${recurring?.end_date || ''}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="recurring_active" ${recurring?.is_active !== false ? 'checked' : ''}>
                            Active (will process automatically)
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            ${isEditing ? 'Update' : 'Create'} Recurring Transaction
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Add event listeners
        const form = modal.querySelector('#recurringForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRecurringSubmit();
            modal.remove();
        });

        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        return modal;
    }

    showRecurringTransactionsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal recurring-list-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>Recurring Transactions</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="recurring-actions">
                        <button class="btn btn-primary" id="addRecurringBtn">Add New Recurring Transaction</button>
                        <button class="btn btn-secondary" id="processNowBtn">Process Due Now</button>
                    </div>
                    <div id="recurringTransactionsList"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Render the list
        this.renderRecurringTransactionsList();

        // Event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        
        modal.querySelector('#addRecurringBtn').addEventListener('click', () => {
            this.showRecurringModal();
        });

        modal.querySelector('#processNowBtn').addEventListener('click', async () => {
            try {
                await this.processDueTransactions();
                alert('Processed due recurring transactions');
                this.renderRecurringTransactionsList();
            } catch (error) {
                alert('Error processing transactions: ' + error.message);
            }
        });
    }

    async handleRecurringSubmit() {
        const formData = {
            type: document.getElementById('recurring_type').value,
            amount: parseFloat(document.getElementById('recurring_amount').value),
            category: document.getElementById('recurring_category').value,
            description: document.getElementById('recurring_description').value,
            frequency: document.getElementById('recurring_frequency').value,
            start_date: document.getElementById('recurring_start_date').value,
            end_date: document.getElementById('recurring_end_date').value || null,
            is_active: document.getElementById('recurring_active').checked
        };

        const recurringId = document.getElementById('recurring_id').value;

        try {
            if (recurringId) {
                await this.updateRecurringTransaction(recurringId, formData);
            } else {
                await this.createRecurringTransaction(formData);
            }
            this.renderRecurringTransactionsList();
        } catch (error) {
            alert('Error saving recurring transaction: ' + error.message);
        }
    }

    destroy() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
        }
    }
}

export default RecurringTransactionManager;
