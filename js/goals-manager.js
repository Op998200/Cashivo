// Financial Goals Management System for Cashivo
import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';
import { formatCurrency } from './utils.js';

class FinancialGoalsManager {
    constructor() {
        this.goals = [];
        this.currentEditingGoal = null;
    }

    async initialize() {
        try {
            await this.loadGoals();
            this.renderGoalsSection();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing goals manager:', error);
        }
    }

    async loadGoals() {
        try {
            const user = await getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('financial_goals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.goals = data || [];
        } catch (error) {
            console.error('Error loading goals:', error);
            throw error;
        }
    }

    renderGoalsSection() {
        const goalsSection = document.querySelector('.goals-list');
        if (!goalsSection) return;

        if (this.goals.length === 0) {
            goalsSection.innerHTML = `
                <div class="empty-state">
                    <p>No financial goals set yet. Create your first goal to start tracking your progress!</p>
                </div>
            `;
            return;
        }

        goalsSection.innerHTML = this.goals.map(goal => this.renderGoalCard(goal)).join('');
        this.attachGoalEventListeners();
    }

    renderGoalCard(goal) {
        const progressPercentage = goal.target_amount > 0 ? 
            Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
        
        const remaining = Math.max(0, goal.target_amount - goal.current_amount);
        const isCompleted = goal.is_completed || goal.current_amount >= goal.target_amount;
        const daysRemaining = goal.target_date ? 
            Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        let statusClass = 'on-track';
        let statusText = 'On Track';
        
        if (isCompleted) {
            statusClass = 'completed';
            statusText = 'Completed';
        } else if (daysRemaining !== null && daysRemaining < 30 && progressPercentage < 80) {
            statusClass = 'behind';
            statusText = 'Behind Schedule';
        } else if (daysRemaining !== null && daysRemaining < 0) {
            statusClass = 'overdue';
            statusText = 'Overdue';
        }

        return `
            <div class="goal-card" data-goal-id="${goal.id}">
                <div class="goal-header">
                    <div class="goal-info">
                        <h4 class="goal-title">${goal.title}</h4>
                        <span class="goal-priority priority-${goal.priority}">${goal.priority}</span>
                        <span class="goal-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="goal-actions">
                        <button class="btn-icon edit-goal" data-goal-id="${goal.id}" title="Edit Goal">✏️</button>
                        <button class="btn-icon delete-goal" data-goal-id="${goal.id}" title="Delete Goal">🗑️</button>
                        ${!isCompleted ? `<button class="btn-icon add-progress" data-goal-id="${goal.id}" title="Add Progress">💰</button>` : ''}
                    </div>
                </div>
                
                <div class="goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${statusClass}" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>${formatCurrency(goal.current_amount)} / ${formatCurrency(goal.target_amount)}</span>
                        <span class="progress-percentage">${progressPercentage.toFixed(1)}%</span>
                    </div>
                </div>
                
                <div class="goal-details">
                    ${goal.category ? `<div class="goal-category">📂 ${goal.category}</div>` : ''}
                    ${goal.target_date ? `
                        <div class="goal-deadline">
                            📅 ${new Date(goal.target_date).toLocaleDateString()}
                            ${daysRemaining !== null ? 
                                `<span class="days-remaining ${daysRemaining < 0 ? 'overdue' : daysRemaining < 30 ? 'urgent' : ''}">(${Math.abs(daysRemaining)} days ${daysRemaining < 0 ? 'overdue' : 'remaining'})</span>` 
                                : ''}
                        </div>
                    ` : ''}
                    <div class="goal-remaining">💵 ${formatCurrency(remaining)} remaining</div>
                </div>
                
                ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
            </div>
        `;
    }

    attachGoalEventListeners() {
        // Edit goal buttons
        document.querySelectorAll('.edit-goal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const goalId = e.target.dataset.goalId;
                const goal = this.goals.find(g => g.id === goalId);
                if (goal) {
                    this.showGoalModal(goal);
                }
            });
        });

        // Delete goal buttons
        document.querySelectorAll('.delete-goal').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const goalId = e.target.dataset.goalId;
                if (confirm('Are you sure you want to delete this goal?')) {
                    try {
                        await this.deleteGoal(goalId);
                        await this.loadGoals();
                        this.renderGoalsSection();
                    } catch (error) {
                        alert('Error deleting goal: ' + error.message);
                    }
                }
            });
        });

        // Add progress buttons
        document.querySelectorAll('.add-progress').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const goalId = e.target.dataset.goalId;
                this.showAddProgressModal(goalId);
            });
        });
    }

    setupEventListeners() {
        // Add new goal button
        const addGoalBtn = document.getElementById('addGoalBtn');
        if (addGoalBtn) {
            addGoalBtn.addEventListener('click', () => {
                this.showGoalModal();
            });
        }

        // Goal form submission
        const goalForm = document.getElementById('goalForm');
        if (goalForm) {
            goalForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleGoalSubmit();
            });
        }

        // Progress form submission
        const progressForm = document.getElementById('progressForm');
        if (progressForm) {
            progressForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleProgressSubmit();
            });
        }

        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAllModals();
            });
        });
    }

    showGoalModal(goal = null) {
        this.currentEditingGoal = goal;
        const modal = this.createGoalModal(goal);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    createGoalModal(goal = null) {
        const isEditing = !!goal;
        const modal = document.createElement('div');
        modal.className = 'modal goal-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEditing ? 'Edit Goal' : 'Create New Goal'}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <form id="goalForm">
                    <input type="hidden" id="goal_id" value="${goal?.id || ''}">
                    
                    <div class="form-group">
                        <label for="goal_title">Goal Title *</label>
                        <input type="text" id="goal_title" value="${goal?.title || ''}" required 
                               placeholder="e.g., Emergency Fund, New Car, Vacation">
                    </div>
                    
                    <div class="form-group">
                        <label for="goal_target_amount">Target Amount ($) *</label>
                        <input type="number" id="goal_target_amount" step="0.01" min="0.01" 
                               value="${goal?.target_amount || ''}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="goal_current_amount">Current Amount ($)</label>
                            <input type="number" id="goal_current_amount" step="0.01" min="0" 
                                   value="${goal?.current_amount || 0}">
                        </div>
                        <div class="form-group">
                            <label for="goal_target_date">Target Date</label>
                            <input type="date" id="goal_target_date" 
                                   value="${goal?.target_date || ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="goal_category">Category</label>
                            <select id="goal_category">
                                <option value="">Select Category</option>
                                <option value="Emergency Fund" ${goal?.category === 'Emergency Fund' ? 'selected' : ''}>Emergency Fund</option>
                                <option value="Travel" ${goal?.category === 'Travel' ? 'selected' : ''}>Travel</option>
                                <option value="Housing" ${goal?.category === 'Housing' ? 'selected' : ''}>Housing</option>
                                <option value="Education" ${goal?.category === 'Education' ? 'selected' : ''}>Education</option>
                                <option value="Retirement" ${goal?.category === 'Retirement' ? 'selected' : ''}>Retirement</option>
                                <option value="Investment" ${goal?.category === 'Investment' ? 'selected' : ''}>Investment</option>
                                <option value="Other" ${goal?.category === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="goal_priority">Priority</label>
                            <select id="goal_priority">
                                <option value="low" ${goal?.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${goal?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${goal?.priority === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="goal_description">Description</label>
                        <textarea id="goal_description" rows="3" 
                                  placeholder="Optional description or notes about this goal">${goal?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            ${isEditing ? 'Update Goal' : 'Create Goal'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Add event listeners
        const form = modal.querySelector('#goalForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleGoalSubmit();
            modal.remove();
        });

        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        return modal;
    }

    showAddProgressModal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        const modal = document.createElement('div');
        modal.className = 'modal progress-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Progress to "${goal.title}"</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="goal-progress-info">
                    <p>Current: ${formatCurrency(goal.current_amount)} / ${formatCurrency(goal.target_amount)}</p>
                    <p>Remaining: ${formatCurrency(goal.target_amount - goal.current_amount)}</p>
                </div>
                <form id="progressForm">
                    <input type="hidden" id="progress_goal_id" value="${goalId}">
                    
                    <div class="form-group">
                        <label for="progress_amount">Amount to Add ($) *</label>
                        <input type="number" id="progress_amount" step="0.01" min="0.01" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="progress_note">Note (Optional)</label>
                        <input type="text" id="progress_note" placeholder="e.g., Monthly savings, Bonus, etc.">
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Progress</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Add event listeners
        const form = modal.querySelector('#progressForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleProgressSubmit();
            modal.remove();
        });

        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
    }

    async handleGoalSubmit() {
        const formData = {
            title: document.getElementById('goal_title').value,
            target_amount: parseFloat(document.getElementById('goal_target_amount').value),
            current_amount: parseFloat(document.getElementById('goal_current_amount').value) || 0,
            target_date: document.getElementById('goal_target_date').value || null,
            category: document.getElementById('goal_category').value || null,
            priority: document.getElementById('goal_priority').value || 'medium',
            description: document.getElementById('goal_description').value || null
        };

        const goalId = document.getElementById('goal_id').value;

        try {
            if (goalId) {
                await this.updateGoal(goalId, formData);
            } else {
                await this.createGoal(formData);
            }

            await this.loadGoals();
            this.renderGoalsSection();
        } catch (error) {
            alert('Error saving goal: ' + error.message);
        }
    }

    async handleProgressSubmit() {
        const goalId = document.getElementById('progress_goal_id').value;
        const amount = parseFloat(document.getElementById('progress_amount').value);
        
        try {
            await this.addProgress(goalId, amount);
            await this.loadGoals();
            this.renderGoalsSection();
        } catch (error) {
            alert('Error adding progress: ' + error.message);
        }
    }

    async createGoal(goalData) {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('financial_goals')
            .insert([{
                user_id: user.id,
                ...goalData
            }]);

        if (error) throw error;
    }

    async updateGoal(goalId, goalData) {
        const { error } = await supabase
            .from('financial_goals')
            .update(goalData)
            .eq('id', goalId);

        if (error) throw error;
    }

    async deleteGoal(goalId) {
        const { error } = await supabase
            .from('financial_goals')
            .delete()
            .eq('id', goalId);

        if (error) throw error;
    }

    async addProgress(goalId, amount) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) throw new Error('Goal not found');

        const newAmount = goal.current_amount + amount;
        const isCompleted = newAmount >= goal.target_amount;

        const { error } = await supabase
            .from('financial_goals')
            .update({
                current_amount: newAmount,
                is_completed: isCompleted
            })
            .eq('id', goalId);

        if (error) throw error;

        // If goal is completed, show celebration message
        if (isCompleted && !goal.is_completed) {
            this.showGoalCompletionNotification(goal.title);
        }
    }

    showGoalCompletionNotification(goalTitle) {
        const notification = document.createElement('div');
        notification.className = 'goal-completion-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h3>🎉 Congratulations!</h3>
                <p>You've achieved your goal: <strong>${goalTitle}</strong></p>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">Awesome!</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.remove();
        });
    }
}

// Export for use in dashboard
export default FinancialGoalsManager;
