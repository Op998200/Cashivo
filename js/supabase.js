// Supabase client and database utilities
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Initialize Supabase client
const supabaseUrl = window.location.hostname === 'localhost' 
    ? 'https://soovxxigvxmtoflszcat.supabase.co'
    : 'https://soovxxigvxmtoflszcat.supabase.co';

const supabaseKey = window.location.hostname === 'localhost'
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvb3Z4eGlndnhtdG9mbHN6Y2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNjM1OTEsImV4cCI6MjA3MTgzOTU5MX0.xCWx52KP58shiqjVa6T6UnYNNTYOgxdfC8YMgqq4XjI'
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvb3Z4eGlndnhtdG9mbHN6Y2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNjM1OTEsImV4cCI6MjA3MTgzOTU5MX0.xCWx52KP58shiqjVa6T6UnYNNTYOgxdfC8YMgqq4XjI';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Authentication utilities
export const auth = {
    // Sign up new user with username
    async signUp(email, password, username = null) {
        try {
            const signUpData = {
                email,
                password,
            };

            // Include username in user metadata if provided
            if (username) {
                signUpData.options = {
                    data: {
                        username: username,
                        display_name: username
                    }
                };
            }

            const { data, error } = await supabase.auth.signUp(signUpData);

            if (error) throw error;

            // If signup is successful and username is provided, create user profile
            if (data.user && username) {
                try {
                    const { error: profileError } = await supabase
                        .from('user_profiles')
                        .insert({
                            user_id: data.user.id,
                            username: username,
                            display_name: username,
                            email: email,
                            currency_code: 'USD',
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        });

                    if (profileError) {
                        console.warn('Failed to create user profile - this is OK if tables are not set up yet:', profileError.message);
                        // Don't fail signup if profile creation fails
                    } else {
                        console.log('User profile created successfully for username:', username);
                    }
                } catch (profileError) {
                    console.warn('Profile table not available - this is OK, profile will be created on first login:', profileError.message);
                    // Don't fail signup if profile table doesn't exist
                }
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Sign in existing user
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Sign out user
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    // Get current session
    async getSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    },

    // Change password
    async changePassword(newPassword) {
        try {
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Listen to auth changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
};

// Database utilities for transactions
export const database = {
    // Get all transactions for current user
    async getTransactions(userId, options = {}) {
        try {
            let query = supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            // Apply filters
            if (options.type) {
                query = query.eq('type', options.type);
            }
            
            if (options.category) {
                query = query.eq('category', options.category);
            }
            
            if (options.startDate) {
                query = query.gte('date', options.startDate);
            }
            
            if (options.endDate) {
                query = query.lte('date', options.endDate);
            }
            
            if (options.search) {
                query = query.or(`notes.ilike.%${options.search}%,category.ilike.%${options.search}%,description.ilike.%${options.search}%`);
            }
            
            // Apply pagination
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Add new transaction
    async addTransaction(userId, transactionData) {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert([{
                    user_id: userId,
                    description: transactionData.note || 'Transaction',
                    type: transactionData.type,
                    category: transactionData.category,
                    amount: parseFloat(transactionData.amount),
                    notes: transactionData.note || null,
                    date: transactionData.date,
                    receipt_url: transactionData.receipt_url || null
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Update transaction
    async updateTransaction(transactionId, updates) {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', transactionId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Delete transaction
    async deleteTransaction(transactionId) {
        try {
            // First, get the transaction to check if it has an image
            const { data: transaction, error: fetchError } = await supabase
                .from('transactions')
                .select('receipt_url')
                .eq('id', transactionId)
                .single();

            if (fetchError) throw fetchError;

            // Delete the transaction from database
            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transactionId);

            if (deleteError) throw deleteError;

            // If transaction had an image, delete it from storage
            if (transaction?.receipt_url) {
                try {
                    // Extract the file path from the URL
                    const url = new URL(transaction.receipt_url);
                    const pathParts = url.pathname.split('/storage/v1/object/public/receipts/');
                    if (pathParts.length > 1) {
                        const filePath = pathParts[1];
                        console.log('Deleting receipt image:', filePath);
                        
                        await supabase.storage
                            .from('receipts')
                            .remove([filePath]);
                        
                        console.log('Receipt image deleted successfully');
                    }
                } catch (storageError) {
                    console.error('Failed to delete receipt image:', storageError);
                    // Don't fail the transaction delete if image delete fails
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get financial summary
    async getFinancialSummary(userId, startDate = null, endDate = null) {
        try {
            let query = supabase
                .from('transactions')
                .select('type, amount')
                .eq('user_id', userId);

            if (startDate) {
                query = query.gte('date', startDate);
            }
            
            if (endDate) {
                query = query.lte('date', endDate);
            }

            const { data, error } = await query;
            
            if (error) throw error;

            const summary = {
                totalIncome: 0,
                totalExpenses: 0,
                balance: 0,
                transactionCount: data.length
            };

            data.forEach(transaction => {
                const amount = Math.abs(parseFloat(transaction.amount));
                if (transaction.type === 'income') {
                    summary.totalIncome += amount;
                } else {
                    summary.totalExpenses += amount;
                }
            });

            summary.balance = summary.totalIncome - summary.totalExpenses;

            return { success: true, data: summary };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get category breakdown
    async getCategoryBreakdown(userId, type = null, startDate = null, endDate = null) {
        try {
            let query = supabase
                .from('transactions')
                .select('category, amount')
                .eq('user_id', userId);

            if (type) {
                query = query.eq('type', type);
            }
            
            if (startDate) {
                query = query.gte('date', startDate);
            }
            
            if (endDate) {
                query = query.lte('date', endDate);
            }

            const { data, error } = await query;
            
            if (error) throw error;

            const breakdown = {};
            data.forEach(transaction => {
                if (!breakdown[transaction.category]) {
                    breakdown[transaction.category] = {
                        total: 0,
                        count: 0
                    };
                }
                breakdown[transaction.category].total += parseFloat(transaction.amount);
                breakdown[transaction.category].count += 1;
            });

            return { success: true, data: breakdown };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get monthly trends
    async getMonthlyTrends(userId, months = 6) {
        try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            startDate.setDate(1);

            const { data, error } = await supabase
                .from('transactions')
                .select('date, type, amount')
                .eq('user_id', userId)
                .gte('date', startDate.toISOString().split('T')[0])
                .order('date');

            if (error) throw error;

            const trends = {};
            data.forEach(transaction => {
                const monthYear = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM
                
                if (!trends[monthYear]) {
                    trends[monthYear] = {
                        income: 0,
                        expenses: 0,
                        balance: 0
                    };
                }
                
                if (transaction.type === 'income') {
                    trends[monthYear].income += parseFloat(transaction.amount);
                } else {
                    trends[monthYear].expenses += parseFloat(transaction.amount);
                }
                
                trends[monthYear].balance = trends[monthYear].income - trends[monthYear].expenses;
            });

            return { success: true, data: trends };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get user profile with username
    async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId);
                
            if (error) {
                throw error;
            }
            
            return { success: true, data: data || [] };
        } catch (error) {
            return { success: false, data: [], error: error.message };
        }
    }
};

// Storage utilities for file uploads
export const storage = {
    // Upload receipt image
    async uploadReceiptImage(file, userId) {
        try {
            console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
            
            // Validate file
            if (!file || file.size === 0) {
                throw new Error('Invalid file selected');
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                throw new Error('File size must be less than 5MB');
            }
            
            if (!file.type.startsWith('image/')) {
                throw new Error('Only image files are allowed');
            }
            
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
            
            console.log('Uploading to path:', fileName);

            const { data, error } = await supabase.storage
                .from('receipts')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Storage upload error:', error);
                throw new Error(`Upload failed: ${error.message}`);
            }

            console.log('Upload successful:', data);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(fileName);

            console.log('Public URL:', publicUrl);

            return { success: true, data: { path: data.path, url: publicUrl } };
        } catch (error) {
            console.error('File upload error:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete receipt image
    async deleteReceiptImage(path) {
        try {
            const { error } = await supabase.storage
                .from('receipts')
                .remove([path]);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Upload avatar image
    async uploadAvatarImage(file, userId) {
        try {
            console.log('Uploading avatar:', file.name, 'Size:', file.size, 'Type:', file.type);
            
            // Validate file
            if (!file || file.size === 0) {
                throw new Error('Invalid file selected');
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                throw new Error('File size must be less than 5MB');
            }
            
            if (!file.type.startsWith('image/')) {
                throw new Error('Only image files are allowed');
            }
            
            // Get current user profile to check for existing avatar
            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', userId)
                .single();
            
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
            
            console.log('Uploading avatar to path:', fileName);

            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Avatar upload error:', error);
                throw new Error(`Upload failed: ${error.message}`);
            }

            console.log('Avatar upload successful:', data);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            console.log('Avatar public URL:', publicUrl);

            // Delete old avatar if exists
            if (currentProfile?.avatar_url) {
                try {
                    const url = new URL(currentProfile.avatar_url);
                    const pathParts = url.pathname.split('/storage/v1/object/public/avatars/');
                    if (pathParts.length > 1) {
                        const oldFilePath = pathParts[1];
                        console.log('Deleting old avatar:', oldFilePath);
                        
                        await supabase.storage
                            .from('avatars')
                            .remove([oldFilePath]);
                        
                        console.log('Old avatar deleted successfully');
                    }
                } catch (deleteError) {
                    console.error('Failed to delete old avatar:', deleteError);
                    // Don't fail the upload if old avatar delete fails
                }
            }

            return { success: true, data: { path: data.path, url: publicUrl } };
        } catch (error) {
            console.error('Avatar upload error:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete avatar image
    async deleteAvatarImage(path) {
        try {
            const { error } = await supabase.storage
                .from('avatars')
                .remove([path]);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Utility functions
export const utils = {
    // Format currency
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // Format date
    formatDate(date, format = 'short') {
        return new Intl.DateTimeFormat('en-US', {
            dateStyle: format
        }).format(new Date(date));
    },

    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Show toast notification
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: auto;">×</button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    },

    // Create toast container if it doesn't exist
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },

    // Show loading state
    showLoading(button) {
        if (button) {
            const btnText = button.querySelector('.btn-text');
            const btnLoader = button.querySelector('.btn-loader');
            
            if (btnText) btnText.style.opacity = '0';
            if (btnLoader) btnLoader.style.display = 'block';
            button.disabled = true;
        }
    },

    // Hide loading state
    hideLoading(button) {
        if (button) {
            const btnText = button.querySelector('.btn-text');
            const btnLoader = button.querySelector('.btn-loader');
            
            if (btnText) btnText.style.opacity = '1';
            if (btnLoader) btnLoader.style.display = 'none';
            button.disabled = false;
        }
    },

    // Export data as CSV
    exportToCSV(data, filename = 'export.csv') {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(field => 
                JSON.stringify(row[field] || '')
            ).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
};

// Initialize Supabase connection and auth listener
export function initializeApp() {
    // Listen for auth state changes
    auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            console.log('User signed in:', session.user.email);
        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            // Redirect to home page
            if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                window.location.href = '/';
            }
        }
    });
}

// Check if user is authenticated and redirect accordingly
export async function checkAuthAndRedirect() {
    const session = await auth.getSession();
    const currentPath = window.location.pathname;
    
    // Pages that require authentication
    const protectedPages = ['dashboard.html', 'budgets.html', 'recurring.html', 'analytics.html', 'profile.html'];
    // Pages that redirect if already authenticated
    const authPages = ['auth.html'];
    
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    if (session && session.user) {
        // User is authenticated
        if (authPages.includes(currentPage)) {
            window.location.href = 'dashboard.html';
        }
    } else {
        // User is not authenticated
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'auth.html';
        }
    }
    
    return session;
}

// Validate authentication for protected pages
export async function validateAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
            window.location.href = 'auth.html';
            return null;
        }
        
        return session.user;
    } catch (error) {
        console.error('Auth validation error:', error);
        window.location.href = 'auth.html';
        return null;
    }
}

// Export commonly used functions for easy import
// (supabase is already exported at line 13)

// Format currency function (standalone)
export function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Show toast function (standalone)
export function showToast(message, type = 'info', duration = 5000) {
    return utils.showToast(message, type, duration);
}

// Show/hide loader functions (standalone)
export function showLoader(button) {
    return utils.showLoading(button);
}

export function hideLoader(button) {
    return utils.hideLoading(button);
}
