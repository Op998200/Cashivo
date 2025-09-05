// Advanced Search and Filter functionality for Cashivo
import { getUserTransactions, getCategories } from './utils.js';

class TransactionSearchFilter {
    constructor() {
        this.transactions = [];
        this.categories = [];
        this.filteredTransactions = [];
        this.currentFilters = {
            search: '',
            type: 'all',
            category: 'all',
            dateFrom: null,
            dateTo: null,
            amountMin: null,
            amountMax: null,
            paymentMethod: 'all',
            sortBy: 'date',
            sortOrder: 'desc'
        };
        this.currentPage = 1;
        this.itemsPerPage = 10;
    }

    async initialize() {
        try {
            this.transactions = await getUserTransactions();
            this.categories = await getCategories();
            this.filteredTransactions = [...this.transactions];
            this.setupEventListeners();
            this.populateFilterDropdowns();
            this.renderTransactions();
        } catch (error) {
            console.error('Error initializing search filter:', error);
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchTransactions');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            });
        }

        // Filter dropdowns
        const filterType = document.getElementById('filterType');
        if (filterType) {
            filterType.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.applyFilters();
            });
        }

        const filterCategory = document.getElementById('filterCategory');
        if (filterCategory) {
            filterCategory.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.applyFilters();
            });
        }

        // Date filters
        const dateFromInput = document.getElementById('dateFrom');
        if (dateFromInput) {
            dateFromInput.addEventListener('change', (e) => {
                this.currentFilters.dateFrom = e.target.value;
                this.applyFilters();
            });
        }

        const dateToInput = document.getElementById('dateTo');
        if (dateToInput) {
            dateToInput.addEventListener('change', (e) => {
                this.currentFilters.dateTo = e.target.value;
                this.applyFilters();
            });
        }

        // Amount filters
        const amountMinInput = document.getElementById('amountMin');
        if (amountMinInput) {
            amountMinInput.addEventListener('input', (e) => {
                this.currentFilters.amountMin = e.target.value ? parseFloat(e.target.value) : null;
                this.applyFilters();
            });
        }

        const amountMaxInput = document.getElementById('amountMax');
        if (amountMaxInput) {
            amountMaxInput.addEventListener('input', (e) => {
                this.currentFilters.amountMax = e.target.value ? parseFloat(e.target.value) : null;
                this.applyFilters();
            });
        }

        // Sort controls
        const sortBySelect = document.getElementById('sortBy');
        if (sortBySelect) {
            sortBySelect.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                this.applyFilters();
            });
        }

        const sortOrderSelect = document.getElementById('sortOrder');
        if (sortOrderSelect) {
            sortOrderSelect.addEventListener('change', (e) => {
                this.currentFilters.sortOrder = e.target.value;
                this.applyFilters();
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Pagination
        const prevPageBtn = document.getElementById('prevPage');
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderTransactions();
                }
            });
        }

        const nextPageBtn = document.getElementById('nextPage');
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderTransactions();
                }
            });
        }
    }

    populateFilterDropdowns() {
        // Populate category filter
        const filterCategory = document.getElementById('filterCategory');
        if (filterCategory && this.categories.length > 0) {
            // Keep the "All Categories" option and add categories
            const existingOptions = filterCategory.querySelectorAll('option[value="all"]');
            
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.name} (${category.type})`;
                filterCategory.appendChild(option);
            });
        }
    }

    applyFilters() {
        let filtered = [...this.transactions];

        // Text search filter
        if (this.currentFilters.search.trim()) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(transaction => 
                transaction.description?.toLowerCase().includes(searchTerm) ||
                this.getCategoryName(transaction.category)?.toLowerCase().includes(searchTerm)
            );
        }

        // Type filter
        if (this.currentFilters.type !== 'all') {
            filtered = filtered.filter(transaction => 
                transaction.type === this.currentFilters.type
            );
        }

        // Category filter
        if (this.currentFilters.category !== 'all') {
            filtered = filtered.filter(transaction => 
                transaction.category === this.currentFilters.category
            );
        }

        // Date range filter
        if (this.currentFilters.dateFrom) {
            filtered = filtered.filter(transaction => 
                new Date(transaction.date) >= new Date(this.currentFilters.dateFrom)
            );
        }

        if (this.currentFilters.dateTo) {
            filtered = filtered.filter(transaction => 
                new Date(transaction.date) <= new Date(this.currentFilters.dateTo)
            );
        }

        // Amount range filter
        if (this.currentFilters.amountMin !== null) {
            filtered = filtered.filter(transaction => 
                parseFloat(transaction.amount) >= this.currentFilters.amountMin
            );
        }

        if (this.currentFilters.amountMax !== null) {
            filtered = filtered.filter(transaction => 
                parseFloat(transaction.amount) <= this.currentFilters.amountMax
            );
        }

        // Payment method filter
        if (this.currentFilters.paymentMethod !== 'all') {
            filtered = filtered.filter(transaction => 
                transaction.payment_method === this.currentFilters.paymentMethod
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let valueA, valueB;
            
            switch (this.currentFilters.sortBy) {
                case 'amount':
                    valueA = parseFloat(a.amount);
                    valueB = parseFloat(b.amount);
                    break;
                case 'category':
                    valueA = this.getCategoryName(a.category);
                    valueB = this.getCategoryName(b.category);
                    break;
                case 'type':
                    valueA = a.type;
                    valueB = b.type;
                    break;
                case 'description':
                    valueA = a.description;
                    valueB = b.description;
                    break;
                default: // date
                    valueA = new Date(a.date);
                    valueB = new Date(b.date);
            }

            let comparison = 0;
            if (valueA > valueB) comparison = 1;
            if (valueA < valueB) comparison = -1;

            return this.currentFilters.sortOrder === 'desc' ? comparison * -1 : comparison;
        });

        this.filteredTransactions = filtered;
        this.currentPage = 1; // Reset to first page
        this.renderTransactions();
        this.updateFilterSummary();
    }

    getCategoryName(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? category.name : 'Unknown';
    }

    clearAllFilters() {
        this.currentFilters = {
            search: '',
            type: 'all',
            category: 'all',
            dateFrom: null,
            dateTo: null,
            amountMin: null,
            amountMax: null,
            paymentMethod: 'all',
            sortBy: 'date',
            sortOrder: 'desc'
        };

        // Reset form inputs
        const inputs = [
            'searchTransactions', 'filterType', 'filterCategory', 
            'dateFrom', 'dateTo', 'amountMin', 'amountMax', 
            'sortBy', 'sortOrder'
        ];

        inputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                if (element.type === 'text' || element.type === 'number' || element.type === 'date') {
                    element.value = '';
                } else if (element.tagName === 'SELECT') {
                    element.selectedIndex = 0;
                }
            }
        });

        this.applyFilters();
    }

    renderTransactions() {
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedTransactions = this.filteredTransactions.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);

        // Clear existing content
        transactionsList.innerHTML = '';

        // Render transactions
        if (paginatedTransactions.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">No transactions found matching your criteria</td>';
            transactionsList.appendChild(row);
        } else {
            paginatedTransactions.forEach(transaction => {
                const row = this.createTransactionRow(transaction);
                transactionsList.appendChild(row);
            });
        }

        // Update pagination info
        this.updatePaginationInfo(totalPages);
    }

    createTransactionRow(transaction) {
        const row = document.createElement('tr');
        row.className = transaction.type === 'income' ? 'income-row' : 'expense-row';
        
        const categoryName = this.getCategoryName(transaction.category);
        const formattedDate = new Date(transaction.date).toLocaleDateString();
        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(transaction.amount);

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${transaction.description || 'No description'}</td>
            <td><span class="category-badge">${categoryName}</span></td>
            <td><span class="type-badge ${transaction.type}">${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</span></td>
            <td class="${transaction.type}">${formattedAmount}</td>
            <td>${transaction.payment_method || 'N/A'}</td>
            <td>
                <button class="btn-small btn-danger delete-transaction" data-id="${transaction.id}">Delete</button>
                ${transaction.receipt_url ? `<a href="${transaction.receipt_url}" target="_blank" class="btn-small btn-info">Receipt</a>` : ''}
            </td>
        `;

        // Add delete functionality
        const deleteBtn = row.querySelector('.delete-transaction');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this transaction?')) {
                    try {
                        await this.deleteTransaction(transaction.id);
                        await this.refresh();
                    } catch (error) {
                        alert('Error deleting transaction: ' + error.message);
                    }
                }
            });
        }

        return row;
    }

    updatePaginationInfo(totalPages) {
        const pageInfo = document.getElementById('pageInfo');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');

        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${totalPages} (${this.filteredTransactions.length} transactions)`;
        }

        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
        }

        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= totalPages;
        }
    }

    updateFilterSummary() {
        const filterSummary = document.getElementById('filterSummary');
        if (!filterSummary) return;

        const activeFilters = [];
        
        if (this.currentFilters.search) {
            activeFilters.push(`Search: "${this.currentFilters.search}"`);
        }
        if (this.currentFilters.type !== 'all') {
            activeFilters.push(`Type: ${this.currentFilters.type}`);
        }
        if (this.currentFilters.category !== 'all') {
            const categoryName = this.getCategoryName(this.currentFilters.category);
            activeFilters.push(`Category: ${categoryName}`);
        }
        if (this.currentFilters.dateFrom || this.currentFilters.dateTo) {
            let dateRange = 'Date: ';
            if (this.currentFilters.dateFrom && this.currentFilters.dateTo) {
                dateRange += `${this.currentFilters.dateFrom} to ${this.currentFilters.dateTo}`;
            } else if (this.currentFilters.dateFrom) {
                dateRange += `from ${this.currentFilters.dateFrom}`;
            } else {
                dateRange += `until ${this.currentFilters.dateTo}`;
            }
            activeFilters.push(dateRange);
        }
        if (this.currentFilters.amountMin !== null || this.currentFilters.amountMax !== null) {
            let amountRange = 'Amount: ';
            if (this.currentFilters.amountMin !== null && this.currentFilters.amountMax !== null) {
                amountRange += `$${this.currentFilters.amountMin} - $${this.currentFilters.amountMax}`;
            } else if (this.currentFilters.amountMin !== null) {
                amountRange += `≥ $${this.currentFilters.amountMin}`;
            } else {
                amountRange += `≤ $${this.currentFilters.amountMax}`;
            }
            activeFilters.push(amountRange);
        }

        if (activeFilters.length > 0) {
            filterSummary.innerHTML = `<strong>Active Filters:</strong> ${activeFilters.join(', ')}`;
            filterSummary.style.display = 'block';
        } else {
            filterSummary.style.display = 'none';
        }
    }

    async deleteTransaction(transactionId) {
        // This should use the deleteTransaction function from utils.js
        const { deleteTransaction } = await import('./utils.js');
        await deleteTransaction(transactionId);
    }

    async refresh() {
        this.transactions = await getUserTransactions();
        this.applyFilters();
    }

    // Export filtered results as CSV
    exportFilteredResults() {
        if (this.filteredTransactions.length === 0) {
            alert('No transactions to export');
            return;
        }

        const csvContent = this.generateCSV(this.filteredTransactions);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `filtered_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    generateCSV(transactions) {
        const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Payment Method'];
        const csvRows = [headers.join(',')];

        transactions.forEach(transaction => {
            const row = [
                transaction.date,
                `"${transaction.description || ''}"`,
                `"${this.getCategoryName(transaction.category)}"`,
                transaction.type,
                transaction.amount,
                transaction.payment_method || ''
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }
}

// Export for use in dashboard
export default TransactionSearchFilter;
