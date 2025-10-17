// Dashboard JavaScript - Transaction management and financial overview
import { auth, database, storage, utils, checkAuthAndRedirect } from './supabase.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './config.js';

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.transactions = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filters = {
            search: '',
            type: 'all'
        };
        this.init();
    }

    async init() {
        try {
            // Check authentication
            const session = await checkAuthAndRedirect();
            if (!session) return;
            
            this.currentUser = session.user;
            await this.loadUserData();
            this.bindEvents();
            await this.loadTransactions();
            await this.updateFinancialSummary();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            utils.showToast('Failed to initialize dashboard. Please refresh the page.', 'error');
        }
    }

    async loadUserData() {
        // Update user display
        const userEmail = document.getElementById('user-email');
        const userInitial = document.getElementById('user-initial');
        const userName = document.getElementById('user-name');

        // Try to get user profile to show username instead of email
        try {
            let profileResult = await database.getUserProfile(this.currentUser.id);

            // If no profile exists, try to create one from user metadata
            if (!profileResult.success || !profileResult.data || profileResult.data.length === 0) {
                console.log('No profile found, attempting to create from metadata'); // Debug log
                await this.createProfileFromMetadata();
                // Try loading again
                profileResult = await database.getUserProfile(this.currentUser.id);
            }

            if (profileResult.success && profileResult.data && profileResult.data.length > 0) {
                const profile = profileResult.data[0]; // Get first profile record
                console.log('Profile loaded:', profile); // Debug log

                // Prioritize username, then display_name, then email prefix
                let displayName = profile.username;
                if (!displayName || displayName.trim() === '') {
                    displayName = profile.display_name;
                }
                if (!displayName || displayName.trim() === '') {
                    displayName = this.currentUser.email.split('@')[0];
                }

                const initial = displayName.charAt(0).toUpperCase();

                if (userEmail) userEmail.textContent = this.currentUser.email;
                if (userInitial) userInitial.textContent = initial;
                if (userName) userName.textContent = displayName;

                console.log('Display name set to:', displayName); // Debug log
            } else {
                console.log('No profile found after creation attempt, using email fallback'); // Debug log
                // Fallback to email-based display if no profile found
                if (userEmail) userEmail.textContent = this.currentUser.email;
                if (userInitial) userInitial.textContent = this.currentUser.email.charAt(0).toUpperCase();
                if (userName) userName.textContent = this.currentUser.email.split('@')[0];
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Fallback to email-based display
            if (userEmail) userEmail.textContent = this.currentUser.email;
            if (userInitial) userInitial.textContent = this.currentUser.email.charAt(0).toUpperCase();
            if (userName) userName.textContent = this.currentUser.email.split('@')[0];
        }
    }

    async createProfileFromMetadata() {
        try {
            // Get username from user metadata
            const username = this.currentUser.user_metadata?.username;
            const displayName = this.currentUser.user_metadata?.display_name || username;

            if (!username) {
                console.log('No username in metadata, skipping profile creation');
                return;
            }

            // Try to create profile
            const { data, error } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: this.currentUser.id,
                    username: username,
                    display_name: displayName,
                    email: this.currentUser.email,
                    currency_code: 'USD',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                })
                .select();

            if (!error && data && data.length > 0) {
                console.log('Profile created successfully from metadata:', username);
            } else {
                console.warn('Failed to create profile from metadata:', error);
            }
        } catch (error) {
            console.warn('Error creating profile from metadata:', error);
        }
    }

    bindEvents() {
        // Transaction form
        const transactionForm = document.getElementById('transaction-form');
        if (transactionForm) {
            transactionForm.addEventListener('submit', (e) => this.handleAddTransaction(e));
        }

        // Transaction type change
        const typeSelect = document.getElementById('transaction-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => this.updateCategories());
            this.updateCategories(); // Initial load
        }

        // Set today's date as default
        const dateInput = document.getElementById('transaction-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // File upload handling
        this.setupFileUpload();

        // Search and filters
        const searchInput = document.getElementById('transaction-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.searchTransactions();
            });
        }

        const typeFilter = document.getElementById('filter-type');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.filters.type = e.target.value;
                this.filterTransactions();
            });
        }

        // Export functionality
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTransactions());
        }

        // User menu
        this.setupUserMenu();

        // Setup edit modal
        this.setupEditModal();

        // Pagination
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());

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

    updateCategories() {
        const typeSelect = document.getElementById('transaction-type');
        const categorySelect = document.getElementById('transaction-category');
        
        if (!typeSelect || !categorySelect) return;

        const selectedType = typeSelect.value;
        const categories = selectedType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

        // Clear current options except the first one
        categorySelect.innerHTML = '<option value="">Select category</option>';

        // Add categories based on type
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    setupFileUpload() {
        const fileInput = document.getElementById('transaction-receipt');
        const filePreview = document.getElementById('file-preview');
        const previewImage = document.getElementById('preview-image');
        const removeButton = document.getElementById('remove-file');

        if (!fileInput || !filePreview) return;

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    utils.showToast('File size must be less than 5MB', 'error');
                    fileInput.value = '';
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    utils.showToast('Please select an image file', 'error');
                    fileInput.value = '';
                    return;
                }

                // Show preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImage.src = e.target.result;
                    filePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        if (removeButton) {
            removeButton.addEventListener('click', () => {
                fileInput.value = '';
                filePreview.style.display = 'none';
                previewImage.src = '';
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

            // Close dropdown when clicking outside
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

    async handleAddTransaction(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        // Get form data
        const transactionData = {
            type: formData.get('type'),
            amount: formData.get('amount'),
            category: formData.get('category'),
            date: formData.get('date'),
            note: formData.get('note') || null
        };

        // Validate
        if (!transactionData.type || !transactionData.amount || !transactionData.category || !transactionData.date) {
            utils.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (parseFloat(transactionData.amount) <= 0) {
            utils.showToast('Amount must be greater than 0', 'error');
            return;
        }

        utils.showLoading(submitButton);

        try {
            // Upload receipt image if provided
            const receiptFile = formData.get('receipt');
            if (receiptFile && receiptFile.size > 0) {
                const uploadResult = await storage.uploadReceiptImage(receiptFile, this.currentUser.id);
                if (uploadResult.success) {
                    transactionData.receipt_url = uploadResult.data.url;
                } else {
                    utils.showToast('Failed to upload receipt image', 'warning');
                }
            }

            // Add transaction
            const result = await database.addTransaction(this.currentUser.id, transactionData);
            
            if (result.success) {
                utils.showToast('Transaction added successfully!', 'success');
                event.target.reset();
                
                // Reset file preview
                const filePreview = document.getElementById('file-preview');
                if (filePreview) filePreview.style.display = 'none';
                
                // Reset date to today
                const dateInput = document.getElementById('transaction-date');
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
                
                // Reload data
                await this.loadTransactions();
                await this.updateFinancialSummary();
            } else {
                utils.showToast(result.error, 'error');
            }
        } catch (error) {
            utils.showToast('An unexpected error occurred', 'error');
            console.error('Add transaction error:', error);
        } finally {
            utils.hideLoading(submitButton);
        }
    }

    async loadTransactions() {
        const loadingState = document.getElementById('loading-state');
        const emptyState = document.getElementById('empty-state');
        const tableContainer = document.querySelector('.transactions-table-container');

        if (loadingState) loadingState.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'none';

        try {
            const options = {
                limit: this.itemsPerPage,
                offset: (this.currentPage - 1) * this.itemsPerPage
            };

            // Apply filters
            if (this.filters.type !== 'all') {
                options.type = this.filters.type;
            }

            if (this.filters.search) {
                options.search = this.filters.search;
            }

            const result = await database.getTransactions(this.currentUser.id, options);
            
            if (result.success) {
                this.transactions = result.data;
                this.renderTransactions();
                this.updateTransactionsCount();
                this.updatePagination();
            } else {
                utils.showToast('Failed to load transactions', 'error');
            }
        } catch (error) {
            utils.showToast('Error loading transactions', 'error');
            console.error('Load transactions error:', error);
        } finally {
            if (loadingState) loadingState.style.display = 'none';
        }
    }

    renderTransactions() {
        const tbody = document.getElementById('transactions-tbody');
        const emptyState = document.getElementById('empty-state');
        const tableContainer = document.querySelector('.transactions-table-container');

        if (!tbody) return;

        if (this.transactions.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (tableContainer) tableContainer.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';

        tbody.innerHTML = '';

        this.transactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${utils.formatDate(transaction.date)}</td>
                <td>
                    <span class="transaction-type ${transaction.type}">${transaction.type}</span>
                </td>
                <td>${transaction.category}</td>
                <td>${transaction.description || transaction.notes || '-'}</td>
                <td>
                    <span class="transaction-amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}${utils.formatCurrency(Math.abs(transaction.amount))}
                    </span>
                </td>
                <td>
                    ${transaction.receipt_url 
                        ? `<a href="${transaction.receipt_url}" target="_blank" class="receipt-link">📄 View</a>` 
                        : '-'
                    }
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="dashboardManager.editTransaction('${transaction.id}')">Edit</button>
                        <button class="action-btn delete" onclick="dashboardManager.deleteTransaction('${transaction.id}')">Delete</button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateTransactionsCount() {
        const countElement = document.getElementById('transactions-count');
        if (countElement) {
            countElement.textContent = `${this.transactions.length} transactions`;
        }
    }

    updatePagination() {
        const paginationInfo = document.getElementById('pagination-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pagination = document.getElementById('pagination');

        if (!pagination) return;

        const totalPages = Math.ceil(this.transactions.length / this.itemsPerPage) || 1;
        
        if (paginationInfo) {
            paginationInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }

        pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }

    async updateFinancialSummary() {
        try {
            const result = await database.getFinancialSummary(this.currentUser.id);
            
            if (result.success) {
                const summary = result.data;
                
                // Update overview cards
                const totalIncomeEl = document.getElementById('total-income');
                const totalExpensesEl = document.getElementById('total-expenses');
                const currentBalanceEl = document.getElementById('current-balance');

                if (totalIncomeEl) {
                    totalIncomeEl.textContent = utils.formatCurrency(summary.totalIncome);
                }
                
                if (totalExpensesEl) {
                    totalExpensesEl.textContent = utils.formatCurrency(summary.totalExpenses);
                }
                
                if (currentBalanceEl) {
                    currentBalanceEl.textContent = utils.formatCurrency(summary.balance);
                    // Update color based on positive/negative balance
                    currentBalanceEl.style.color = summary.balance >= 0 ? 'var(--income)' : 'var(--expense)';
                }
            }
        } catch (error) {
            console.error('Error updating financial summary:', error);
        }
    }

    async searchTransactions() {
        this.currentPage = 1;
        await this.loadTransactions();
    }

    async filterTransactions() {
        this.currentPage = 1;
        await this.loadTransactions();
    }

    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadTransactions();
        }
    }

    async nextPage() {
        this.currentPage++;
        await this.loadTransactions();
    }

    async exportTransactions() {
        try {
            const result = await database.getTransactions(this.currentUser.id);
            
            if (result.success && result.data.length > 0) {
                const exportData = result.data.map(transaction => ({
                    Date: transaction.date,
                    Type: transaction.type,
                    Category: transaction.category,
                    Amount: transaction.amount,
                    Note: transaction.note || '',
                    'Created At': new Date(transaction.created_at).toLocaleDateString()
                }));

                const filename = `cashivo-transactions-${new Date().toISOString().split('T')[0]}.csv`;
                utils.exportToCSV(exportData, filename);
                utils.showToast('Transactions exported successfully!', 'success');
            } else {
                utils.showToast('No transactions to export', 'warning');
            }
        } catch (error) {
            utils.showToast('Error exporting transactions', 'error');
            console.error('Export error:', error);
        }
    }

    async editTransaction(id) {
        try {
            // Get the transaction data
            const transaction = this.transactions.find(t => t.id === id);
            if (!transaction) {
                utils.showToast('Transaction not found', 'error');
                return;
            }

            // Populate the edit form
            const modal = document.getElementById('edit-modal');
            const form = document.getElementById('edit-transaction-form');
            
            if (!modal || !form) {
                utils.showToast('Edit form not available', 'error');
                return;
            }

            // Set form values
            document.getElementById('edit-transaction-id').value = transaction.id;
            document.getElementById('edit-transaction-type').value = transaction.type;
            document.getElementById('edit-transaction-amount').value = Math.abs(transaction.amount);
            document.getElementById('edit-transaction-date').value = transaction.date;
            document.getElementById('edit-transaction-note').value = transaction.note || '';
            
            // Update category options based on type
            await this.updateEditCategories(transaction.type);
            document.getElementById('edit-transaction-category').value = transaction.category;
            
            // Handle current receipt display
            this.setupEditReceiptHandling(transaction);
            
            // Show the modal
            modal.style.display = 'flex';
            
        } catch (error) {
            utils.showToast('Error opening edit form', 'error');
            console.error('Edit transaction error:', error);
        }
    }

    async deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                const result = await database.deleteTransaction(id);
                
                if (result.success) {
                    utils.showToast('Transaction deleted successfully!', 'success');
                    await this.loadTransactions();
                    await this.updateFinancialSummary();
                } else {
                    utils.showToast('Failed to delete transaction', 'error');
                }
            } catch (error) {
                utils.showToast('Error deleting transaction', 'error');
                console.error('Delete error:', error);
            }
        }
    }

    async updateEditCategories(type) {
        const editCategorySelect = document.getElementById('edit-transaction-category');
        if (!editCategorySelect) return;

        // Clear existing options
        editCategorySelect.innerHTML = '<option value="">Select category</option>';
        
        const categories = type === 'expense' 
            ? ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Education', 'Travel', 'Other']
            : ['Salary', 'Freelance', 'Business', 'Investments', 'Gifts', 'Other'];

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            editCategorySelect.appendChild(option);
        });
    }

    async handleEditTransaction(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submitButton = event.target.querySelector('button[type="submit"]');
        const transactionId = formData.get('edit-transaction-id') || document.getElementById('edit-transaction-id').value;
        
        if (!transactionId) {
            utils.showToast('Transaction ID not found', 'error');
            return;
        }
        
        // Get form data
        const updateData = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            category: formData.get('category'),
            date: formData.get('date'),
            note: formData.get('note') || null
        };

        // Validate
        if (!updateData.type || !updateData.amount || !updateData.category || !updateData.date) {
            utils.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (updateData.amount <= 0) {
            utils.showToast('Amount must be greater than 0', 'error');
            return;
        }

        utils.showLoading(submitButton);

        try {
            let newImageUrl = null;
            let oldImageUrl = this.editReceiptState?.currentImageUrl;
            
            // Handle image changes
            if (this.editReceiptState?.newFile) {
                // Upload new image
                const uploadResult = await storage.uploadReceiptImage(this.editReceiptState.newFile, this.currentUser.id);
                if (uploadResult.success) {
                    newImageUrl = uploadResult.data.url;
                } else {
                    utils.showToast('Failed to upload receipt image', 'warning');
                }
            } else if (this.editReceiptState?.removeCurrentImage) {
                // Remove current image (set to null)
                newImageUrl = null;
            } else {
                // Keep current image
                newImageUrl = this.editReceiptState?.currentImageUrl || null;
                oldImageUrl = null; // Don't delete if keeping current
            }

            // Update the database fields to match schema
            const dbUpdateData = {
                type: updateData.type,
                amount: updateData.amount,
                category: updateData.category,
                date: updateData.date,
                notes: updateData.note,
                description: updateData.note || 'Transaction',
                receipt_url: newImageUrl
            };

            const result = await database.updateTransaction(transactionId, dbUpdateData);
            
            // If update was successful and we have an old image to delete
            if (result.success && oldImageUrl && (this.editReceiptState?.newFile || this.editReceiptState?.removeCurrentImage)) {
                try {
                    const url = new URL(oldImageUrl);
                    const pathParts = url.pathname.split('/storage/v1/object/public/receipts/');
                    if (pathParts.length > 1) {
                        const filePath = pathParts[1];
                        await storage.deleteReceiptImage(filePath);
                        console.log('Old receipt image deleted successfully');
                    }
                } catch (deleteError) {
                    console.error('Failed to delete old receipt image:', deleteError);
                    // Don't fail the transaction update if image delete fails
                }
            }
            
            if (result.success) {
                utils.showToast('Transaction updated successfully!', 'success');
                
                // Close modal
                document.getElementById('edit-modal').style.display = 'none';
                
                // Reload data
                await this.loadTransactions();
                await this.updateFinancialSummary();
            } else {
                utils.showToast(result.error, 'error');
            }
        } catch (error) {
            utils.showToast('An unexpected error occurred', 'error');
            console.error('Update transaction error:', error);
        } finally {
            utils.hideLoading(submitButton);
        }
    }

    setupEditModal() {
        const modal = document.getElementById('edit-modal');
        const form = document.getElementById('edit-transaction-form');
        const closeBtn = document.getElementById('close-edit-modal');
        const cancelBtn = document.getElementById('cancel-edit');
        const typeSelect = document.getElementById('edit-transaction-type');

        if (form) {
            form.addEventListener('submit', (e) => this.handleEditTransaction(e));
        }

        // Close modal handlers
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
        });

        // Close on outside click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Update categories when type changes
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.updateEditCategories(e.target.value);
            });
        }
    }

    setupEditReceiptHandling(transaction) {
        const currentReceiptDiv = document.getElementById('edit-current-receipt');
        const currentReceiptLink = document.getElementById('edit-current-receipt-link');
        const removeCurrentBtn = document.getElementById('edit-remove-current-receipt');
        const fileInput = document.getElementById('edit-transaction-receipt');
        const filePreview = document.getElementById('edit-file-preview');
        const previewImage = document.getElementById('edit-preview-image');
        const removeNewFileBtn = document.getElementById('edit-remove-file');
        
        // Reset state
        this.editReceiptState = {
            currentImageUrl: transaction.receipt_url || null,
            removeCurrentImage: false,
            newFile: null
        };
        
        // Show current receipt if exists
        if (transaction.receipt_url) {
            currentReceiptDiv.style.display = 'block';
            currentReceiptLink.href = transaction.receipt_url;
        } else {
            currentReceiptDiv.style.display = 'none';
        }
        
        // Hide new file preview initially
        filePreview.style.display = 'none';
        fileInput.value = '';
        
        // Remove current receipt handler
        if (removeCurrentBtn) {
            removeCurrentBtn.onclick = () => {
                this.editReceiptState.removeCurrentImage = true;
                currentReceiptDiv.style.display = 'none';
            };
        }
        
        // New file selection handler
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                        utils.showToast('File size must be less than 5MB', 'error');
                        fileInput.value = '';
                        return;
                    }
                    
                    if (!file.type.startsWith('image/')) {
                        utils.showToast('Please select an image file', 'error');
                        fileInput.value = '';
                        return;
                    }
                    
                    this.editReceiptState.newFile = file;
                    
                    // Show preview
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImage.src = e.target.result;
                        filePreview.style.display = 'block';
                        // Hide current receipt when new file is selected
                        currentReceiptDiv.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            };
        }
        
        // Remove new file handler
        if (removeNewFileBtn) {
            removeNewFileBtn.onclick = () => {
                fileInput.value = '';
                filePreview.style.display = 'none';
                this.editReceiptState.newFile = null;
                // Show current receipt again if exists and not marked for removal
                if (this.editReceiptState.currentImageUrl && !this.editReceiptState.removeCurrentImage) {
                    currentReceiptDiv.style.display = 'block';
                }
            };
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Add responsive table styling
const responsiveStyle = document.createElement('style');
responsiveStyle.textContent = `
    @media (max-width: 768px) {
        .transactions-table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        .transactions-table {
            min-width: 700px;
        }
        
        .transactions-table th,
        .transactions-table td {
            white-space: nowrap;
            padding: 8px 4px;
            font-size: 0.8rem;
        }
        
        .action-buttons {
            flex-direction: column;
            gap: 4px;
        }
        
        .action-btn {
            font-size: 0.7rem;
            padding: 4px 8px;
        }
    }
    
    .receipt-link {
        color: var(--primary-blue);
        text-decoration: none;
        font-size: 0.8rem;
    }
    
    .receipt-link:hover {
        text-decoration: underline;
    }
`;
document.head.appendChild(responsiveStyle);
