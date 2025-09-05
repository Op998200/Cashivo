// Comprehensive Notifications and Alerts System for Cashivo
import { checkBudgetAlerts } from './budget-utils.js';
import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.alertContainer = null;
        this.settings = {
            budgetAlerts: true,
            goalAlerts: true,
            emailNotifications: false,
            pushNotifications: true,
            soundEnabled: true
        };
    }

    async initialize() {
        try {
            await this.loadUserSettings();
            this.createAlertContainer();
            this.setupPeriodicChecks();
            await this.checkAllAlerts();
        } catch (error) {
            console.error('Error initializing notifications:', error);
        }
    }

    async loadUserSettings() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                this.settings = {
                    budgetAlerts: data.budget_alerts ?? true,
                    goalAlerts: data.goal_alerts ?? true,
                    emailNotifications: data.notifications_enabled ?? false,
                    pushNotifications: true,
                    soundEnabled: true
                };
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }

    async saveUserSettings() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    budget_alerts: this.settings.budgetAlerts,
                    goal_alerts: this.settings.goalAlerts,
                    notifications_enabled: this.settings.emailNotifications
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error saving notification settings:', error);
        }
    }

    createAlertContainer() {
        if (this.alertContainer) return;

        this.alertContainer = document.createElement('div');
        this.alertContainer.id = 'notification-container';
        this.alertContainer.className = 'notification-container';
        document.body.appendChild(this.alertContainer);
    }

    setupPeriodicChecks() {
        // Check for alerts every 5 minutes
        setInterval(async () => {
            await this.checkAllAlerts();
        }, 5 * 60 * 1000);

        // Check for daily/weekly alerts
        this.schedulePeriodicAlerts();
    }

    async checkAllAlerts() {
        const alerts = [];

        // Check budget alerts
        if (this.settings.budgetAlerts) {
            try {
                const budgetAlerts = await checkBudgetAlerts();
                alerts.push(...budgetAlerts.map(alert => ({
                    ...alert,
                    type: 'budget',
                    priority: alert.type === 'over_budget' ? 'high' : 'medium',
                    timestamp: new Date()
                })));
            } catch (error) {
                console.error('Error checking budget alerts:', error);
            }
        }

        // Check goal alerts
        if (this.settings.goalAlerts) {
            try {
                const goalAlerts = await this.checkGoalAlerts();
                alerts.push(...goalAlerts.map(alert => ({
                    ...alert,
                    type: 'goal',
                    priority: alert.urgency === 'high' ? 'high' : 'medium',
                    timestamp: new Date()
                })));
            } catch (error) {
                console.error('Error checking goal alerts:', error);
            }
        }

        // Check transaction alerts
        try {
            const transactionAlerts = await this.checkTransactionAlerts();
            alerts.push(...transactionAlerts);
        } catch (error) {
            console.error('Error checking transaction alerts:', error);
        }

        // Show new alerts
        const newAlerts = alerts.filter(alert => 
            !this.notifications.some(existing => 
                existing.type === alert.type && 
                existing.category === alert.category &&
                Math.abs(existing.timestamp - alert.timestamp) < 60000 // Within 1 minute
            )
        );

        newAlerts.forEach(alert => {
            this.showAlert(alert);
            this.notifications.push(alert);
        });

        // Clean old notifications (older than 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        this.notifications = this.notifications.filter(n => n.timestamp > oneHourAgo);
    }

    async checkGoalAlerts() {
        try {
            const user = await getCurrentUser();
            if (!user) return [];

            const { data: goals, error } = await supabase
                .from('financial_goals')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_completed', false);

            if (error) throw error;

            const alerts = [];
            const now = new Date();

            goals.forEach(goal => {
                const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
                
                // Check if goal deadline is approaching
                if (goal.target_date) {
                    const daysRemaining = Math.ceil((new Date(goal.target_date) - now) / (1000 * 60 * 60 * 24));
                    
                    if (daysRemaining < 0) {
                        alerts.push({
                            category: goal.title,
                            message: `Goal "${goal.title}" is overdue!`,
                            urgency: 'high'
                        });
                    } else if (daysRemaining <= 7 && progressPercentage < 90) {
                        alerts.push({
                            category: goal.title,
                            message: `Only ${daysRemaining} days left to reach "${goal.title}" (${progressPercentage.toFixed(1)}% complete)`,
                            urgency: 'high'
                        });
                    } else if (daysRemaining <= 30 && progressPercentage < 75) {
                        alerts.push({
                            category: goal.title,
                            message: `30 days remaining for "${goal.title}". Consider increasing your savings rate.`,
                            urgency: 'medium'
                        });
                    }
                }

                // Check for stalled progress
                if (goal.updated_at) {
                    const daysSinceUpdate = Math.ceil((now - new Date(goal.updated_at)) / (1000 * 60 * 60 * 24));
                    if (daysSinceUpdate > 30 && progressPercentage < 100) {
                        alerts.push({
                            category: goal.title,
                            message: `No progress on "${goal.title}" for 30 days. Time to add some savings!`,
                            urgency: 'medium'
                        });
                    }
                }
            });

            return alerts;
        } catch (error) {
            console.error('Error checking goal alerts:', error);
            return [];
        }
    }

    async checkTransactionAlerts() {
        try {
            const user = await getCurrentUser();
            if (!user) return [];

            const alerts = [];
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Check for unusual spending patterns
            const { data: recentTransactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

            if (error) throw error;

            // Group by category and check for spikes
            const categorySpending = {};
            recentTransactions.forEach(transaction => {
                if (!categorySpending[transaction.category]) {
                    categorySpending[transaction.category] = [];
                }
                categorySpending[transaction.category].push(transaction.amount);
            });

            // Check for categories with unusually high spending
            for (const [category, amounts] of Object.entries(categorySpending)) {
                if (amounts.length > 5) { // Only check categories with enough data
                    const total = amounts.reduce((sum, amount) => sum + amount, 0);
                    const average = total / amounts.length;
                    const maxAmount = Math.max(...amounts);

                    if (maxAmount > average * 3) { // Transaction is 3x the average
                        alerts.push({
                            type: 'transaction',
                            category: 'Unusual Spending',
                            message: `Unusual spending detected in ${category}: $${maxAmount.toFixed(2)} (3x your average)`,
                            priority: 'medium',
                            timestamp: new Date()
                        });
                    }
                }
            }

            return alerts;
        } catch (error) {
            console.error('Error checking transaction alerts:', error);
            return [];
        }
    }

    showAlert(alert) {
        const alertElement = document.createElement('div');
        alertElement.className = `notification-alert ${alert.type} priority-${alert.priority}`;
        
        const icon = this.getAlertIcon(alert.type, alert.priority);
        
        alertElement.innerHTML = `
            <div class="alert-content">
                <div class="alert-icon">${icon}</div>
                <div class="alert-text">
                    <div class="alert-title">${this.getAlertTitle(alert)}</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
                <div class="alert-actions">
                    <button class="alert-dismiss" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
            </div>
        `;

        // Add to container
        this.alertContainer.appendChild(alertElement);

        // Play sound if enabled
        if (this.settings.soundEnabled) {
            this.playNotificationSound(alert.priority);
        }

        // Auto-dismiss after delay based on priority
        const dismissDelay = alert.priority === 'high' ? 15000 : 8000;
        setTimeout(() => {
            if (alertElement.parentElement) {
                alertElement.classList.add('fade-out');
                setTimeout(() => alertElement.remove(), 300);
            }
        }, dismissDelay);
    }

    getAlertIcon(type, priority) {
        const icons = {
            budget: {
                high: '🚨',
                medium: '⚠️',
                low: '💰'
            },
            goal: {
                high: '🎯',
                medium: '📊',
                low: '💡'
            },
            transaction: {
                high: '💳',
                medium: '📈',
                low: 'ℹ️'
            }
        };

        return icons[type]?.[priority] || 'ℹ️';
    }

    getAlertTitle(alert) {
        const titles = {
            budget: 'Budget Alert',
            goal: 'Goal Update',
            transaction: 'Transaction Alert'
        };

        return titles[alert.type] || 'Notification';
    }

    playNotificationSound(priority) {
        try {
            // Create audio context for notification sounds
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequencies for different priorities
            const frequencies = {
                high: [800, 600, 800],
                medium: [400, 500],
                low: [300]
            };

            const freqs = frequencies[priority] || frequencies.low;
            
            freqs.forEach((freq, index) => {
                setTimeout(() => {
                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    oscillator.start();
                    setTimeout(() => oscillator.stop(), 150);
                }, index * 200);
            });
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    schedulePeriodicAlerts() {
        // Daily summary at 9 AM
        this.scheduleDailyAlert();
        
        // Weekly summary on Sundays at 6 PM
        this.scheduleWeeklyAlert();
    }

    scheduleDailyAlert() {
        const now = new Date();
        const tomorrow9AM = new Date(now);
        tomorrow9AM.setDate(now.getDate() + 1);
        tomorrow9AM.setHours(9, 0, 0, 0);

        const timeUntilAlert = tomorrow9AM.getTime() - now.getTime();

        setTimeout(async () => {
            await this.showDailySummary();
            // Schedule next day
            setInterval(() => this.showDailySummary(), 24 * 60 * 60 * 1000);
        }, timeUntilAlert);
    }

    scheduleWeeklyAlert() {
        const now = new Date();
        const nextSunday6PM = new Date(now);
        nextSunday6PM.setDate(now.getDate() + (7 - now.getDay()));
        nextSunday6PM.setHours(18, 0, 0, 0);

        const timeUntilAlert = nextSunday6PM.getTime() - now.getTime();

        setTimeout(async () => {
            await this.showWeeklySummary();
            // Schedule next week
            setInterval(() => this.showWeeklySummary(), 7 * 24 * 60 * 60 * 1000);
        }, timeUntilAlert);
    }

    async showDailySummary() {
        if (!this.settings.budgetAlerts) return;

        try {
            // Get yesterday's transactions
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const user = await getCurrentUser();
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', yesterdayStr);

            if (error) throw error;

            const totalIncome = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const totalExpenses = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            if (transactions.length > 0) {
                this.showAlert({
                    type: 'transaction',
                    priority: 'low',
                    message: `Yesterday's summary: ${transactions.length} transactions, $${totalExpenses.toFixed(2)} spent, $${totalIncome.toFixed(2)} earned`,
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error('Error showing daily summary:', error);
        }
    }

    async showWeeklySummary() {
        if (!this.settings.budgetAlerts) return;

        try {
            const budgetAlerts = await checkBudgetAlerts();
            const goalAlerts = await this.checkGoalAlerts();
            
            const summary = [];
            if (budgetAlerts.length > 0) {
                summary.push(`${budgetAlerts.length} budget alerts`);
            }
            if (goalAlerts.length > 0) {
                summary.push(`${goalAlerts.length} goal updates`);
            }

            if (summary.length > 0) {
                this.showAlert({
                    type: 'budget',
                    priority: 'low',
                    message: `Weekly summary: ${summary.join(', ')}. Check your dashboard for details.`,
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error('Error showing weekly summary:', error);
        }
    }

    // Public methods for managing notifications
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveUserSettings();
    }

    dismissAll() {
        if (this.alertContainer) {
            this.alertContainer.innerHTML = '';
        }
        this.notifications = [];
    }

    getNotificationCount() {
        return this.notifications.filter(n => 
            n.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
        ).length;
    }
}

// Export for use in dashboard
export default NotificationManager;
