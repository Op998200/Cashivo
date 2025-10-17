import { supabase } from './supabase.js';
import { showToast, formatCurrency, showLoader, hideLoader, validateAuth } from './supabase.js';

// Recurring transactions management class
class RecurringManager {
    constructor() {
        this.recurringTransactions = [];
        this.filteredRecurring = [];
        this.dueTransactions = [];
        this.currentUser = null;
        this.charts = {};
        this.searchTimeout = null;

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

            // Show skeleton loading states
            this.showSkeletonLoading();

            // Load initial data
            await this.loadRecurringTransactions();
            await this.loadDueTransactions();
            this.initializeCharts();
            this.generateUpcomingSchedule();

            // Hide skeleton loading states
            this.hideSkeletonLoading();

        } catch (error) {
            console.error('Failed to initialize recurring manager:', error);
            showToast('Failed to initialize recurring transactions', 'error');
            this.hideSkeletonLoading();
        }
    }

    initializeEventListeners() {
        // Create recurring button and modal
        const createRecurringBtn = document.getElementById('create-recurring-btn');
        const createRecurringModal = document.getElementById('create-recurring-modal');
        const closeCreateModal = document.getElementById('close-create-recurring-modal');
        const cancelCreateBtn = document.getElementById('cancel-create-recurring');
        const createRecurringForm = document.getElementById('create-recurring-form');

        if (createRecurringBtn) {
            createRecurringBtn.addEventListener('click', () => {
                this.openCreateRecurringModal();
            });
        }

        if (closeCreateModal) {
            closeCreateModal.addEventListener('click', () => {
                this.closeCreateRecurringModal();
            });
        }

        if (cancelCreateBtn) {
            cancelCreateBtn.addEventListener('click', () => {
                this.closeCreateRecurringModal();
            });
        }

        if (createRecurringForm) {
            createRecurringForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createRecurring();
            });
        }

        // Edit recurring modal
        const editRecurringModal = document.getElementById('edit-recurring-modal');
        const closeEditModal = document.getElementById('close-edit-recurring-modal');
        const cancelEditBtn = document.getElementById('cancel-edit-recurring');
        const editRecurringForm = document.getElementById('edit-recurring-form');

        if (closeEditModal) {
            closeEditModal.addEventListener('click', () => {
                this.closeEditRecurringModal();
            });
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.closeEditRecurringModal();
            });
        }

        if (editRecurringForm) {
            editRecurringForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateRecurring();
            });
        }

        // Delete recurring modal
        const deleteRecurringModal = document.getElementById('delete-recurring-modal');
        const closeDeleteModal = document.getElementById('close-delete-recurring-modal');
        const cancelDeleteBtn = document.getElementById('cancel-delete-recurring');
        const confirmDeleteBtn = document.getElementById('confirm-delete-recurring');

        if (closeDeleteModal) {
            closeDeleteModal.addEventListener('click', () => {
                this.closeDeleteRecurringModal();
            });
        }

        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                this.closeDeleteRecurringModal();
            });
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.deleteRecurring();
            });
        }

        // Process due transactions
        const processDueBtn = document.getElementById('process-recurring-btn');
        const processAllDueBtn = document.getElementById('process-all-due-btn');
        const processDueModal = document.getElementById('process-due-modal');
        const closeProcessDueModal = document.getElementById('close-process-due-modal');
        const cancelProcessDueBtn = document.getElementById('cancel-process-due');
        const confirmProcessDueBtn = document.getElementById('confirm-process-due');

        if (processDueBtn) {
            processDueBtn.addEventListener('click', () => {
                this.openProcessDueModal();
            });
        }

        if (processAllDueBtn) {
            processAllDueBtn.addEventListener('click', () => {
                this.openProcessDueModal();
            });
        }

        if (closeProcessDueModal) {
            closeProcessDueModal.addEventListener('click', () => {
                this.closeProcessDueModal();
            });
        }

        if (cancelProcessDueBtn) {
            cancelProcessDueBtn.addEventListener('click', () => {
                this.closeProcessDueModal();
            });
        }

        if (confirmProcessDueBtn) {
            confirmProcessDueBtn.addEventListener('click', () => {
                this.processAllDue();
            });
        }

        // Search and filter
        const searchInput = document.getElementById('recurring-search');
        const recurringFilter = document.getElementById('recurring-filter');
        const frequencyFilter = document.getElementById('frequency-filter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                // Clear existing timeout
                if (this.searchTimeout) {
                    clearTimeout(this.searchTimeout);
                }

                // Set new timeout for debounced search
                this.searchTimeout = setTimeout(() => {
                    this.filterRecurring(e.target.value, recurringFilter?.value || 'all', frequencyFilter?.value || 'all');
                }, 300);
            });
        }

        if (recurringFilter) {
            recurringFilter.addEventListener('change', (e) => {
                this.filterRecurring(searchInput?.value || '', e.target.value, frequencyFilter?.value || 'all');
            });
        }

        if (frequencyFilter) {
            frequencyFilter.addEventListener('change', (e) => {
                this.filterRecurring(searchInput?.value || '', recurringFilter?.value || 'all', e.target.value);
            });
        }

        // Frequency change handler for create form
        const frequencySelect = document.getElementById('recurring-frequency');
        if (frequencySelect) {
            frequencySelect.addEventListener('change', (e) => {
                this.updateFrequencyOptions(e.target.value);
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
            const modals = [createRecurringModal, editRecurringModal, deleteRecurringModal, processDueModal];
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

        // Set default start date to today
        const startDateInput = document.getElementById('recurring-start-date');
        if (startDateInput) {
            const today = new Date();
            startDateInput.value = today.toISOString().split('T')[0];
        }
    }

    async loadRecurringTransactions() {
        try {
            showLoader();

            // Fetch recurring transactions from database
            const { data: recurringData, error } = await supabase
                .from('recurring_transactions')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.recurringTransactions = recurringData || [];
            this.filteredRecurring = [...this.recurringTransactions];

            this.renderRecurringTransactions();
            this.updateOverview();

        } catch (error) {
            console.error('Failed to load recurring transactions:', error);
            showToast('Failed to load recurring transactions', 'error');
        } finally {
            hideLoader();
        }
    }

    async loadDueTransactions() {
        try {
            const today = new Date();
            const activeRecurring = this.recurringTransactions.filter(r => r.status === 'active');

            this.dueTransactions = [];

            for (const recurring of activeRecurring) {
                const nextDueDate = this.calculateNextDueDate(recurring);
                if (nextDueDate && nextDueDate <= today) {
                    this.dueTransactions.push({
                        ...recurring,
                        nextDueDate
                    });
                }
            }

            this.renderDueTransactions();
            this.updateDueSoonCount();

        } catch (error) {
            console.error('Failed to load due transactions:', error);
        }
    }

    calculateNextDueDate(recurring) {
        try {
            const startDate = new Date(recurring.start_date);
            const today = new Date();
            const frequency = recurring.frequency;
            const interval = recurring.interval || 1;

            // Get the last processed date or start date
            const lastProcessed = recurring.last_processed ? new Date(recurring.last_processed) : new Date(startDate.getTime() - 24 * 60 * 60 * 1000);

            let nextDate = new Date(lastProcessed);

            // Calculate next occurrence based on frequency
            switch (frequency) {
                case 'daily':
                    nextDate.setDate(nextDate.getDate() + interval);
                    break;
                case 'weekly':
                    nextDate.setDate(nextDate.getDate() + (7 * interval));
                    break;
                case 'monthly':
                    nextDate.setMonth(nextDate.getMonth() + interval);
                    // Handle day of month preference
                    if (recurring.day_of_month && recurring.day_of_month !== -1) {
                        nextDate.setDate(Math.min(recurring.day_of_month, this.getDaysInMonth(nextDate)));
                    } else if (recurring.day_of_month === -1) {
                        // Last day of month
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        nextDate.setDate(0);
                    }
                    break;
                case 'quarterly':
                    nextDate.setMonth(nextDate.getMonth() + (3 * interval));
                    break;
                case 'yearly':
                    nextDate.setFullYear(nextDate.getFullYear() + interval);
                    break;
                default:
                    return null;
            }

            // Check if end date has passed
            if (recurring.end_date) {
                const endDate = new Date(recurring.end_date);
                if (nextDate > endDate) {
                    return null; // Recurring has ended
                }
            }

            return nextDate;

        } catch (error) {
            console.error('Error calculating next due date:', error);
            return null;
        }
    }

    getDaysInMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    renderRecurringTransactions() {
        const recurringList = document.getElementById('recurring-list');
        const emptyState = document.getElementById('recurring-empty-state');
        const scheduleCount = document.getElementById('recurring-schedule-count');

        if (!recurringList) return;

        if (this.filteredRecurring.length === 0) {
            recurringList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
        } else {
            recurringList.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';

            recurringList.innerHTML = this.filteredRecurring.map(recurring => {
                const nextDue = this.calculateNextDueDate(recurring);
                const statusColor = this.getStatusColor(recurring.status);
                const typeIcon = this.getTypeIcon(recurring.type);

                return `
                    <div class="recurring-item ${recurring.status}" data-recurring-id="${recurring.id}">
                        <div class="recurring-header">
                            <div class="recurring-icon ${recurring.type}">
                                ${typeIcon}
                            </div>
                            <div class="recurring-info">
                                <h3 class="recurring-description">${recurring.description}</h3>
                                <div class="recurring-meta">
                                    <span class="recurring-category">${recurring.category}</span>
                                    <span class="recurring-frequency">${this.formatFrequency(recurring)}</span>
                                </div>
                            </div>
                            <div class="recurring-amount ${recurring.type}">
                                ${recurring.type === 'income' ? '+' : '-'}${formatCurrency(recurring.amount)}
                            </div>
                        </div>

                        <div class="recurring-details">
                            <div class="detail-item">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value status ${recurring.status}" style="color: ${statusColor};">
                                    ${recurring.status.charAt(0).toUpperCase() + recurring.status.slice(1)}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Next Due:</span>
                                <span class="detail-value ${nextDue && nextDue <= new Date() ? 'overdue' : ''}">
                                    ${nextDue ? nextDue.toLocaleDateString() : 'Ended'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Auto Process:</span>
                                <span class="detail-value">
                                    ${recurring.auto_process ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Created:</span>
                                <span class="detail-value">
                                    ${new Date(recurring.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        ${recurring.notes ? `
                            <div class="recurring-notes">
                                <p>${recurring.notes}</p>
                            </div>
                        ` : ''}

                        <div class="recurring-actions">
                            <button class="btn btn-sm btn-outline" onclick="recurringManager.editRecurringModal('${recurring.id}')" title="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                </svg>
                                Edit
                            </button>
                            ${recurring.status === 'active' ? `
                                <button class="btn btn-sm btn-secondary" onclick="recurringManager.pauseRecurring('${recurring.id}')" title="Pause">
                                    <svg width="14" height="14" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z"/>
                                    </svg>
                                    Pause
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-success" onclick="recurringManager.resumeRecurring('${recurring.id}')" title="Resume">
                                    <svg width="14" height="14" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                                    </svg>
                                    Resume
                                </button>
                            `}
                            ${nextDue && nextDue <= new Date() ? `
                                <button class="btn btn-sm btn-primary" onclick="recurringManager.processIndividual('${recurring.id}')" title="Process Now">
                                    <svg width="14" height="14" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z"/>
                                    </svg>
                                    Process
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-danger" onclick="recurringManager.deleteRecurringModal('${recurring.id}')" title="Delete">
                                <svg width="14" height="14" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (scheduleCount) {
            scheduleCount.textContent = `${this.filteredRecurring.length} active recurring transaction${this.filteredRecurring.length !== 1 ? 's' : ''}`;
        }
    }

    renderDueTransactions() {
        const dueSection = document.getElementById('due-transactions-section');
        const dueList = document.getElementById('due-transactions-list');
        const dueSubtitle = document.getElementById('due-transactions-subtitle');

        if (!dueList || !dueSection) return;

        if (this.dueTransactions.length === 0) {
            dueSection.style.display = 'none';
        } else {
            dueSection.style.display = 'block';

            if (dueSubtitle) {
                dueSubtitle.textContent = `${this.dueTransactions.length} transaction${this.dueTransactions.length !== 1 ? 's' : ''} ready to be processed`;
            }

            dueList.innerHTML = this.dueTransactions.map(transaction => {
                const typeIcon = this.getTypeIcon(transaction.type);
                const daysOverdue = Math.floor((new Date() - transaction.nextDueDate) / (1000 * 60 * 60 * 24));

                return `
                    <div class="due-transaction-item">
                        <div class="due-transaction-icon ${transaction.type}">
                            ${typeIcon}
                        </div>
                        <div class="due-transaction-info">
                            <h4>${transaction.description}</h4>
                            <p class="due-meta">
                                <span>${transaction.category}</span>
                                <span class="due-date ${daysOverdue > 0 ? 'overdue' : ''}">
                                    ${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'Due today'}
                                </span>
                            </p>
                        </div>
                        <div class="due-transaction-amount ${transaction.type}">
                            ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                        </div>
                        <div class="due-transaction-actions">
                            <button class="btn btn-sm btn-primary" onclick="recurringManager.processIndividual('${transaction.id}')">
                                Process
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="recurringManager.skipOccurrence('${transaction.id}')">
                                Skip
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    updateOverview() {
        const activeCount = document.getElementById('active-recurring-count');
        const monthlyIncome = document.getElementById('monthly-recurring-income');
        const monthlyExpenses = document.getElementById('monthly-recurring-expenses');

        // Count active recurring transactions
        const activeRecurring = this.recurringTransactions.filter(r => r.status === 'active');

        if (activeCount) {
            activeCount.textContent = activeRecurring.length.toString();
        }

        // Calculate monthly equivalents
        let totalMonthlyIncome = 0;
        let totalMonthlyExpenses = 0;

        activeRecurring.forEach(recurring => {
            const monthlyAmount = this.convertToMonthlyAmount(recurring);

            if (recurring.type === 'income') {
                totalMonthlyIncome += monthlyAmount;
            } else {
                totalMonthlyExpenses += monthlyAmount;
            }
        });

        if (monthlyIncome) {
            monthlyIncome.textContent = formatCurrency(totalMonthlyIncome);
        }

        if (monthlyExpenses) {
            monthlyExpenses.textContent = formatCurrency(totalMonthlyExpenses);
        }

        // Update charts
        this.updateCharts();
    }

    updateDueSoonCount() {
        const dueSoonCount = document.getElementById('due-soon-count');
        const dueSoonText = document.getElementById('due-soon-text');

        // Count transactions due in next 7 days
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        let dueSoonTotal = 0;
        const activeRecurring = this.recurringTransactions.filter(r => r.status === 'active');

        activeRecurring.forEach(recurring => {
            const nextDue = this.calculateNextDueDate(recurring);
            if (nextDue && nextDue <= sevenDaysFromNow) {
                dueSoonTotal++;
            }
        });

        if (dueSoonCount) {
            dueSoonCount.textContent = dueSoonTotal.toString();
        }

        if (dueSoonText) {
            dueSoonText.textContent = dueSoonTotal === 1 ? 'Next 7 days' : 'Next 7 days';
        }
    }

    convertToMonthlyAmount(recurring) {
        const amount = recurring.amount;
        const frequency = recurring.frequency;
        const interval = recurring.interval || 1;

        switch (frequency) {
            case 'daily':
                return (amount * 30.44) / interval; // Average days per month
            case 'weekly':
                return (amount * 4.33) / interval; // Average weeks per month
            case 'monthly':
                return amount / interval;
            case 'quarterly':
                return (amount / 3) / interval;
            case 'yearly':
                return (amount / 12) / interval;
            default:
                return 0;
        }
    }

    getStatusColor(status) {
        switch (status) {
            case 'active': return '#10B981';
            case 'paused': return '#F59E0B';
            default: return '#6B7280';
        }
    }

    getTypeIcon(type) {
        switch (type) {
            case 'income':
                return `<svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,7L17,12H14V16H10V12H7L12,7Z"/>
                </svg>`;
            case 'expense':
                return `<svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17L7,12H10V8H14V12H17L12,17Z"/>
                </svg>`;
            default:
                return `<svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>`;
        }
    }

    formatFrequency(recurring) {
        const frequency = recurring.frequency;
        const interval = recurring.interval || 1;

        const frequencyNames = {
            daily: 'day',
            weekly: 'week',
            monthly: 'month',
            quarterly: 'quarter',
            yearly: 'year'
        };

        const unit = frequencyNames[frequency] || frequency;
        const pluralUnit = interval === 1 ? unit : unit + 's';

        return interval === 1 ? `Every ${unit}` : `Every ${interval} ${pluralUnit}`;
    }

    filterRecurring(searchTerm, statusFilter, frequencyFilter) {
        this.filteredRecurring = this.recurringTransactions.filter(recurring => {
            const matchesSearch = !searchTerm ||
                recurring.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                recurring.category.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'income' && recurring.type === 'income') ||
                (statusFilter === 'expense' && recurring.type === 'expense') ||
                (statusFilter === 'active' && recurring.status === 'active') ||
                (statusFilter === 'paused' && recurring.status === 'paused');

            const matchesFrequency = frequencyFilter === 'all' || recurring.frequency === frequencyFilter;

            return matchesSearch && matchesStatus && matchesFrequency;
        });

        this.renderRecurringTransactions();
    }

    updateFrequencyOptions(frequency) {
        const intervalText = document.getElementById('interval-text');
        const daySelectionRow = document.getElementById('day-selection-row');

        if (!intervalText) return;

        // Update interval text
        const intervalTexts = {
            daily: 'day(s)',
            weekly: 'week(s)',
            monthly: 'month(s)',
            quarterly: 'quarter(s)',
            yearly: 'year(s)'
        };

        intervalText.textContent = intervalTexts[frequency] || 'period(s)';

        // Show/hide day selection for monthly recurring
        if (daySelectionRow) {
            daySelectionRow.style.display = frequency === 'monthly' ? 'flex' : 'none';
        }
    }

    openCreateRecurringModal() {
        const modal = document.getElementById('create-recurring-modal');
        if (modal) {
            modal.style.display = 'flex';

            // Set default start date
            const startDateInput = document.getElementById('recurring-start-date');
            if (startDateInput && !startDateInput.value) {
                const today = new Date();
                startDateInput.value = today.toISOString().split('T')[0];
            }
        }
    }

    closeCreateRecurringModal() {
        const modal = document.getElementById('create-recurring-modal');
        const form = document.getElementById('create-recurring-form');

        if (modal) modal.style.display = 'none';
        if (form) form.reset();

        // Reset default start date
        const startDateInput = document.getElementById('recurring-start-date');
        if (startDateInput) {
            const today = new Date();
            startDateInput.value = today.toISOString().split('T')[0];
        }

        // Reset frequency options
        this.updateFrequencyOptions('monthly');
    }

    async createRecurring() {
        try {
            const form = document.getElementById('create-recurring-form');
            const formData = new FormData(form);
            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');

            // Show loading state
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            submitBtn.disabled = true;

            const recurringData = {
                user_id: this.currentUser.id,
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                type: formData.get('type'),
                category: formData.get('category'),
                frequency: formData.get('frequency'),
                interval: parseInt(formData.get('interval')) || 1,
                day_of_month: formData.get('dayOfMonth') ? parseInt(formData.get('dayOfMonth')) : null,
                start_date: formData.get('startDate'),
                end_date: formData.get('endDate') || null,
                auto_process: formData.has('autoProcess'),
                notifications: formData.has('notifications'),
                notes: formData.get('notes') || null,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('recurring_transactions')
                .insert([recurringData])
                .select()
                .single();

            if (error) throw error;

            showToast('Recurring transaction created successfully!', 'success');
            this.closeCreateRecurringModal();
            await this.loadRecurringTransactions();
            await this.loadDueTransactions();

        } catch (error) {
            console.error('Failed to create recurring transaction:', error);
            showToast(error.message || 'Failed to create recurring transaction', 'error');
        } finally {
            // Reset button state
            const form = document.getElementById('create-recurring-form');
            const submitBtn = form?.querySelector('button[type="submit"]');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');

            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    editRecurringModal(recurringId) {
        const recurring = this.recurringTransactions.find(r => r.id === recurringId);
        if (!recurring) return;

        const modal = document.getElementById('edit-recurring-modal');
        if (!modal) return;

        // Populate form fields
        document.getElementById('edit-recurring-id').value = recurring.id;
        document.getElementById('edit-recurring-description').value = recurring.description;
        document.getElementById('edit-recurring-amount').value = recurring.amount;
        document.getElementById('edit-recurring-type').value = recurring.type;
        document.getElementById('edit-recurring-category').value = recurring.category;
        document.getElementById('edit-recurring-status').value = recurring.status;
        document.getElementById('edit-recurring-end-date').value = recurring.end_date || '';
        document.getElementById('edit-recurring-auto-process').checked = recurring.auto_process;
        document.getElementById('edit-recurring-notifications').checked = recurring.notifications;
        document.getElementById('edit-recurring-notes').value = recurring.notes || '';

        modal.style.display = 'flex';
    }

    closeEditRecurringModal() {
        const modal = document.getElementById('edit-recurring-modal');
        const form = document.getElementById('edit-recurring-form');

        if (modal) modal.style.display = 'none';
        if (form) form.reset();
    }

    async updateRecurring() {
        try {
            const form = document.getElementById('edit-recurring-form');
            const formData = new FormData(form);
            const recurringId = document.getElementById('edit-recurring-id').value;
            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');

            // Show loading state
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            submitBtn.disabled = true;

            const updateData = {
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                type: formData.get('type'),
                category: formData.get('category'),
                status: formData.get('status'),
                end_date: formData.get('endDate') || null,
                auto_process: formData.has('autoProcess'),
                notifications: formData.has('notifications'),
                notes: formData.get('notes') || null,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('recurring_transactions')
                .update(updateData)
                .eq('id', recurringId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            showToast('Recurring transaction updated successfully!', 'success');
            this.closeEditRecurringModal();
            await this.loadRecurringTransactions();
            await this.loadDueTransactions();

        } catch (error) {
            console.error('Failed to update recurring transaction:', error);
            showToast(error.message || 'Failed to update recurring transaction', 'error');
        } finally {
            // Reset button state
            const form = document.getElementById('edit-recurring-form');
            const submitBtn = form?.querySelector('button[type="submit"]');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');

            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    deleteRecurringModal(recurringId) {
        const recurring = this.recurringTransactions.find(r => r.id === recurringId);
        if (!recurring) return;

        const modal = document.getElementById('delete-recurring-modal');
        const recurringInfo = document.getElementById('recurring-delete-info');

        if (!modal) return;

        // Set the recurring ID for deletion
        modal.setAttribute('data-recurring-id', recurringId);

        // Show recurring information
        if (recurringInfo) {
            recurringInfo.innerHTML = `
                <div class="recurring-delete-summary">
                    <h4>${recurring.description}</h4>
                    <p><strong>Type:</strong> ${recurring.type.charAt(0).toUpperCase() + recurring.type.slice(1)}</p>
                    <p><strong>Amount:</strong> ${formatCurrency(recurring.amount)}</p>
                    <p><strong>Frequency:</strong> ${this.formatFrequency(recurring)}</p>
                </div>
            `;
        }

        modal.style.display = 'flex';
    }

    closeDeleteRecurringModal() {
        const modal = document.getElementById('delete-recurring-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.removeAttribute('data-recurring-id');
        }
    }

    async deleteRecurring() {
        try {
            const modal = document.getElementById('delete-recurring-modal');
            const recurringId = modal.getAttribute('data-recurring-id');

            if (!recurringId) return;

            const confirmBtn = document.getElementById('confirm-delete-recurring');
            const btnText = confirmBtn.querySelector('.btn-text');
            const btnLoader = confirmBtn.querySelector('.btn-loader');

            // Show loading state
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            confirmBtn.disabled = true;

            const { error } = await supabase
                .from('recurring_transactions')
                .delete()
                .eq('id', recurringId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            showToast('Recurring transaction deleted successfully!', 'success');
            this.closeDeleteRecurringModal();
            await this.loadRecurringTransactions();
            await this.loadDueTransactions();

        } catch (error) {
            console.error('Failed to delete recurring transaction:', error);
            showToast(error.message || 'Failed to delete recurring transaction', 'error');
        } finally {
            // Reset button state
            const confirmBtn = document.getElementById('confirm-delete-recurring');
            const btnText = confirmBtn?.querySelector('.btn-text');
            const btnLoader = confirmBtn?.querySelector('.btn-loader');

            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }

    async pauseRecurring(recurringId) {
        await this.updateRecurringStatus(recurringId, 'paused');
    }

    async resumeRecurring(recurringId) {
        await this.updateRecurringStatus(recurringId, 'active');
    }

    async updateRecurringStatus(recurringId, status) {
        try {
            const { error } = await supabase
                .from('recurring_transactions')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', recurringId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            const actionText = status === 'active' ? 'resumed' : 'paused';
            showToast(`Recurring transaction ${actionText} successfully!`, 'success');

            await this.loadRecurringTransactions();
            await this.loadDueTransactions();

        } catch (error) {
            console.error(`Failed to ${status} recurring transaction:`, error);
            showToast(`Failed to ${status} recurring transaction`, 'error');
        }
    }

    openProcessDueModal() {
        if (this.dueTransactions.length === 0) {
            showToast('No due transactions to process', 'info');
            return;
        }

        const modal = document.getElementById('process-due-modal');
        const dueList = document.getElementById('due-process-list');

        if (!modal || !dueList) return;

        // Populate due transactions list
        dueList.innerHTML = this.dueTransactions.map(transaction => {
            const typeIcon = this.getTypeIcon(transaction.type);

            return `
                <div class="due-process-item">
                    <div class="due-process-icon ${transaction.type}">
                        ${typeIcon}
                    </div>
                    <div class="due-process-info">
                        <h4>${transaction.description}</h4>
                        <p>${transaction.category} • Due: ${transaction.nextDueDate.toLocaleDateString()}</p>
                    </div>
                    <div class="due-process-amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                    </div>
                </div>
            `;
        }).join('');

        modal.style.display = 'flex';
    }

    closeProcessDueModal() {
        const modal = document.getElementById('process-due-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async processAllDue() {
        try {
            const confirmBtn = document.getElementById('confirm-process-due');
            const btnText = confirmBtn.querySelector('.btn-text');
            const btnLoader = confirmBtn.querySelector('.btn-loader');

            // Show loading state
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            confirmBtn.disabled = true;

            let processedCount = 0;

            for (const dueTransaction of this.dueTransactions) {
                await this.processTransaction(dueTransaction);
                processedCount++;
            }

            showToast(`Successfully processed ${processedCount} transaction${processedCount !== 1 ? 's' : ''}!`, 'success');
            this.closeProcessDueModal();
            await this.loadRecurringTransactions();
            await this.loadDueTransactions();

        } catch (error) {
            console.error('Failed to process due transactions:', error);
            showToast('Failed to process some transactions', 'error');
        } finally {
            // Reset button state
            const confirmBtn = document.getElementById('confirm-process-due');
            const btnText = confirmBtn?.querySelector('.btn-text');
            const btnLoader = confirmBtn?.querySelector('.btn-loader');

            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }

    async processIndividual(recurringId) {
        try {
            const recurring = this.recurringTransactions.find(r => r.id === recurringId);
            if (!recurring) return;

            await this.processTransaction(recurring);
            showToast('Transaction processed successfully!', 'success');

            await this.loadRecurringTransactions();
            await this.loadDueTransactions();

        } catch (error) {
            console.error('Failed to process transaction:', error);
            showToast('Failed to process transaction', 'error');
        }
    }

    async processTransaction(recurring) {
        try {
            // Create the actual transaction
            const transactionData = {
                user_id: this.currentUser.id,
                description: recurring.description,
                amount: recurring.type === 'expense' ? -Math.abs(recurring.amount) : Math.abs(recurring.amount),
                type: recurring.type,
                category: recurring.category,
                date: new Date().toISOString(),
                notes: `Auto-generated from recurring: ${recurring.description}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error: transactionError } = await supabase
                .from('transactions')
                .insert([transactionData]);

            if (transactionError) throw transactionError;

            // Update last processed date
            const { error: updateError } = await supabase
                .from('recurring_transactions')
                .update({
                    last_processed: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', recurring.id)
                .eq('user_id', this.currentUser.id);

            if (updateError) throw updateError;

        } catch (error) {
            console.error('Error processing transaction:', error);
            throw error;
        }
    }

    async skipOccurrence(recurringId) {
        try {
            const recurring = this.recurringTransactions.find(r => r.id === recurringId);
            if (!recurring) return;

            // Update last processed date without creating transaction
            const { error } = await supabase
                .from('recurring_transactions')
                .update({
                    last_processed: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', recurringId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            showToast('Occurrence skipped successfully!', 'success');
            await this.loadRecurringTransactions();
            await this.loadDueTransactions();

        } catch (error) {
            console.error('Failed to skip occurrence:', error);
            showToast('Failed to skip occurrence', 'error');
        }
    }

    initializeCharts() {
        this.initializeRecurringBreakdownChart();
        this.initializeFrequencyAnalysisChart();
    }

    initializeRecurringBreakdownChart() {
        const canvas = document.getElementById('recurringBreakdownChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        this.charts.recurringBreakdown = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10B981', '#EF4444'],
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
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });

        this.updateCharts();
    }

    initializeFrequencyAnalysisChart() {
        const canvas = document.getElementById('frequencyAnalysisChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        this.charts.frequencyAnalysis = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
                datasets: [{
                    label: 'Count',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: '#3B82F6',
                    borderColor: '#1E40AF',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#6B7280'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#6B7280'
                        }
                    }
                }
            }
        });

        this.updateCharts();
    }

    updateCharts() {
        // Update recurring breakdown chart
        if (this.charts.recurringBreakdown) {
            const activeRecurring = this.recurringTransactions.filter(r => r.status === 'active');

            let totalIncome = 0;
            let totalExpenses = 0;

            activeRecurring.forEach(recurring => {
                const monthlyAmount = this.convertToMonthlyAmount(recurring);
                if (recurring.type === 'income') {
                    totalIncome += monthlyAmount;
                } else {
                    totalExpenses += monthlyAmount;
                }
            });

            this.charts.recurringBreakdown.data.datasets[0].data = [totalIncome, totalExpenses];
            this.charts.recurringBreakdown.update();
        }

        // Update frequency analysis chart
        if (this.charts.frequencyAnalysis) {
            const frequencyCounts = {
                daily: 0,
                weekly: 0,
                monthly: 0,
                quarterly: 0,
                yearly: 0
            };

            this.recurringTransactions.forEach(recurring => {
                if (frequencyCounts.hasOwnProperty(recurring.frequency)) {
                    frequencyCounts[recurring.frequency]++;
                }
            });

            this.charts.frequencyAnalysis.data.datasets[0].data = [
                frequencyCounts.daily,
                frequencyCounts.weekly,
                frequencyCounts.monthly,
                frequencyCounts.quarterly,
                frequencyCounts.yearly
            ];
            this.charts.frequencyAnalysis.update();
        }
    }

    generateUpcomingSchedule() {
        const scheduleCalendar = document.getElementById('schedule-calendar');
        if (!scheduleCalendar) return;

        // Generate next 30 days of upcoming transactions
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const upcomingEvents = [];
        const activeRecurring = this.recurringTransactions.filter(r => r.status === 'active');

        activeRecurring.forEach(recurring => {
            let currentDate = new Date(recurring.start_date);

            // Generate occurrences for the next 30 days
            while (currentDate <= thirtyDaysFromNow) {
                const nextDue = this.calculateNextDueDate({
                    ...recurring,
                    last_processed: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toISOString()
                });

                if (nextDue && nextDue >= today && nextDue <= thirtyDaysFromNow) {
                    upcomingEvents.push({
                        date: nextDue,
                        transaction: recurring
                    });
                }

                // Move to next occurrence
                switch (recurring.frequency) {
                    case 'daily':
                        currentDate.setDate(currentDate.getDate() + (recurring.interval || 1));
                        break;
                    case 'weekly':
                        currentDate.setDate(currentDate.getDate() + (7 * (recurring.interval || 1)));
                        break;
                    case 'monthly':
                        currentDate.setMonth(currentDate.getMonth() + (recurring.interval || 1));
                        break;
                    case 'quarterly':
                        currentDate.setMonth(currentDate.getMonth() + (3 * (recurring.interval || 1)));
                        break;
                    case 'yearly':
                        currentDate.setFullYear(currentDate.getFullYear() + (recurring.interval || 1));
                        break;
                    default:
                        currentDate = new Date(thirtyDaysFromNow.getTime() + 1);
                }
            }
        });

        // Sort events by date
        upcomingEvents.sort((a, b) => a.date - b.date);

        // Group events by date
        const groupedEvents = {};
        upcomingEvents.forEach(event => {
            const dateKey = event.date.toDateString();
            if (!groupedEvents[dateKey]) {
                groupedEvents[dateKey] = [];
            }
            groupedEvents[dateKey].push(event);
        });

        // Render calendar
        scheduleCalendar.innerHTML = Object.keys(groupedEvents).length === 0
            ? '<p class="no-upcoming">No upcoming transactions in the next 30 days.</p>'
            : Object.keys(groupedEvents).map(dateKey => {
                const events = groupedEvents[dateKey];
                const date = new Date(dateKey);
                const isToday = date.toDateString() === today.toDateString();
                const isPast = date < today;

                return `
                    <div class="schedule-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
                        <div class="schedule-date">
                            <span class="day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            <span class="day-number">${date.getDate()}</span>
                            <span class="day-month">${date.toLocaleDateString('en-US', { month: 'short' })}</span>
                        </div>
                        <div class="schedule-events">
                            ${events.map(event => `
                                <div class="schedule-event ${event.transaction.type}">
                                    <div class="event-info">
                                        <span class="event-description">${event.transaction.description}</span>
                                        <span class="event-category">${event.transaction.category}</span>
                                    </div>
                                    <div class="event-amount ${event.transaction.type}">
                                        ${event.transaction.type === 'income' ? '+' : '-'}${formatCurrency(event.transaction.amount)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');
    }

    showSkeletonLoading() {
        const skeletonCards = document.getElementById('overview-cards');
        const realCards = document.getElementById('overview-cards-real');

        if (skeletonCards) {
            skeletonCards.style.display = 'grid';
        }
        if (realCards) {
            realCards.style.display = 'none';
        }
    }

    hideSkeletonLoading() {
        const skeletonCards = document.getElementById('overview-cards');
        const realCards = document.getElementById('overview-cards-real');

        if (skeletonCards) {
            skeletonCards.style.display = 'none';
        }
        if (realCards) {
            realCards.style.display = 'grid';
        }
    }
}

// Initialize recurring manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.recurringManager = new RecurringManager();
});

// Export for use in HTML onclick handlers
window.recurringManager = null;
