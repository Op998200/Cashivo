// Budget Management Utility Functions for Cashivo
import { supabase } from './supabaseClient.js';

// Get all budgets for the current user
export async function getUserBudgets() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('budgets')
            .select(`
                *,
                categories (*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching budgets:', error);
        throw error;
    }
}

// Create a new budget
export async function createBudget(budgetData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('budgets')
            .insert([
                {
                    user_id: user.id,
                    category: budgetData.category,
                    amount: budgetData.amount,
                    period: budgetData.period || 'monthly',
                    start_date: budgetData.start_date,
                    end_date: budgetData.end_date,
                    is_active: budgetData.is_active !== false
                }
            ])
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating budget:', error);
        throw error;
    }
}

// Update an existing budget
export async function updateBudget(budgetId, budgetData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('budgets')
            .update({
                category: budgetData.category,
                amount: budgetData.amount,
                period: budgetData.period,
                start_date: budgetData.start_date,
                end_date: budgetData.end_date,
                is_active: budgetData.is_active
            })
            .eq('id', budgetId)
            .eq('user_id', user.id)
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating budget:', error);
        throw error;
    }
}

// Delete a budget
export async function deleteBudget(budgetId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', budgetId)
            .eq('user_id', user.id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting budget:', error);
        throw error;
    }
}

// Get budget progress for a specific category
export async function getBudgetProgress(categoryId, period = 'monthly') {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Get current month's start and end dates
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Get budget for this category
        const { data: budgetData, error: budgetError } = await supabase
            .from('budgets')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category', categoryId)
            .eq('period', period)
            .gte('start_date', monthStart.toISOString().split('T')[0])
            .lte('end_date', monthEnd.toISOString().split('T')[0])
            .single();
        
        if (budgetError || !budgetData) {
            return { spent: 0, budget: 0, percentage: 0 };
        }
        
        // Get total spent in this category for the current month
        const { data: spentData, error: spentError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category', categoryId)
            .eq('type', 'expense')
            .gte('date', monthStart.toISOString().split('T')[0])
            .lte('date', monthEnd.toISOString().split('T')[0]);
        
        if (spentError) throw spentError;
        
        const totalSpent = spentData.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
        const percentage = (totalSpent / budgetData.amount) * 100;
        
        return {
            spent: totalSpent,
            budget: budgetData.amount,
            percentage: Math.min(percentage, 100) // Cap at 100%
        };
    } catch (error) {
        console.error('Error calculating budget progress:', error);
        throw error;
    }
}

// Get all budget progress for current month
export async function getAllBudgetProgress() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Get current month's budgets
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const { data: budgets, error: budgetsError } = await supabase
            .from('budgets')
            .select(`
                *,
                categories (*)
            `)
            .eq('user_id', user.id)
            .eq('period', 'monthly')
            .gte('start_date', monthStart.toISOString().split('T')[0])
            .lte('end_date', monthEnd.toISOString().split('T')[0])
            .eq('is_active', true);
        
        if (budgetsError) throw budgetsError;
        
        const progressData = [];
        
        for (const budget of budgets) {
            const { data: spentData, error: spentError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('category', budget.category)
                .eq('type', 'expense')
                .gte('date', monthStart.toISOString().split('T')[0])
                .lte('date', monthEnd.toISOString().split('T')[0]);
            
            if (spentError) throw spentError;
            
            const totalSpent = spentData.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
            const percentage = (totalSpent / budget.amount) * 100;
            
            progressData.push({
                budget_id: budget.id,
                category: budget.categories.name,
                category_id: budget.category,
                spent: totalSpent,
                budget: budget.amount,
                percentage: Math.min(percentage, 100),
                color: budget.categories.color
            });
        }
        
        return progressData;
    } catch (error) {
        console.error('Error calculating all budget progress:', error);
        throw error;
    }
}

// Check if user is over budget in any category
export async function checkBudgetAlerts() {
    try {
        const progressData = await getAllBudgetProgress();
        const alerts = progressData.filter(item => item.percentage >= 90);
        
        return alerts.map(alert => ({
            category: alert.category,
            spent: alert.spent,
            budget: alert.budget,
            percentage: alert.percentage,
            message: `You've spent ${alert.percentage.toFixed(0)}% of your ${alert.category} budget`
        }));
    } catch (error) {
        console.error('Error checking budget alerts:', error);
        throw error;
    }
}
