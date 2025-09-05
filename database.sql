-- Cashivo Complete Database Schema
-- Execute this script in your Supabase SQL Editor to create all tables and policies

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table (MVP Core + Phase 2 extensions)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category UUID REFERENCES categories(id),
    description TEXT,
    date DATE NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash',
    receipt_url TEXT, -- For MVP receipt uploads
    is_recurring BOOLEAN DEFAULT FALSE, -- Phase 2: recurring transaction tracking
    recurring_parent_id UUID, -- Phase 2: link to recurring_transactions table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budgets table (Phase 2)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category UUID REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_period CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create financial_goals table (Phase 2)
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_amount DECIMAL(10, 2) NOT NULL,
    current_amount DECIMAL(10, 2) DEFAULT 0,
    target_date DATE,
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_target_amount CHECK (target_amount > 0),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high'))
);

-- Create recurring_transactions table (Phase 2)
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category UUID REFERENCES categories(id) ON DELETE CASCADE,
    description TEXT,
    frequency VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    next_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_type CHECK (type IN ('income', 'expense')),
    CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create user_preferences table (Phase 2)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    budget_alerts BOOLEAN DEFAULT TRUE,
    goal_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_url ON transactions(receipt_url);

-- Phase 2 indexes
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_date ON recurring_transactions(next_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE OR REPLACE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_budgets_updated_at 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_financial_goals_updated_at 
    BEFORE UPDATE ON financial_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_recurring_transactions_updated_at 
    BEFORE UPDATE ON recurring_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, type, color) VALUES
    ('Food & Dining', 'expense', '#e76f51'),
    ('Housing', 'expense', '#f4a261'),
    ('Transportation', 'expense', '#e9c46a'),
    ('Entertainment', 'expense', '#2a9d8f'),
    ('Health & Fitness', 'expense', '#264653'),
    ('Shopping', 'expense', '#9c27b0'),
    ('Utilities', 'expense', '#ff9800'),
    ('Education', 'expense', '#2196f3'),
    ('Travel', 'expense', '#795548'),
    ('Other Expenses', 'expense', '#607d8b'),
    ('Salary', 'income', '#4caf50'),
    ('Freelance Income', 'income', '#2a9d8f'),
    ('Investment', 'income', '#9c27b0'),
    ('Business', 'income', '#ff5722'),
    ('Gift', 'income', '#e91e63'),
    ('Other Income', 'income', '#607d8b');

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
DROP POLICY IF EXISTS "All users can view categories" ON categories;
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can manage their own financial goals" ON financial_goals;
DROP POLICY IF EXISTS "Users can manage their own recurring transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;

-- RLS Policies for transactions (MVP Core)
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for categories (read-only for all authenticated users)
CREATE POLICY "All users can view categories" ON categories
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Phase 2 RLS Policies
CREATE POLICY "Users can manage their own budgets" ON budgets
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own financial goals" ON financial_goals
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own recurring transactions" ON recurring_transactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON transactions TO authenticated;
GRANT SELECT ON categories TO authenticated;
GRANT ALL ON budgets TO authenticated;
GRANT ALL ON financial_goals TO authenticated;
GRANT ALL ON recurring_transactions TO authenticated;
GRANT ALL ON user_preferences TO authenticated;

-- Drop existing views if they exist (safe re-run)
DROP VIEW IF EXISTS user_dashboard_summary;
DROP VIEW IF EXISTS user_transactions_with_categories;

-- Create a view for user's dashboard summary (MVP Core)
CREATE VIEW user_dashboard_summary AS
SELECT
    auth.uid() as user_id,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
FROM transactions
WHERE user_id = auth.uid();

-- Create a view for user's transactions with category details (MVP Core)
CREATE VIEW user_transactions_with_categories AS
SELECT
    t.id,
    t.user_id,
    t.type,
    t.amount,
    t.description,
    t.date,
    t.receipt_url,
    t.created_at,
    c.name as category_name,
    c.color as category_color
FROM transactions t
LEFT JOIN categories c ON t.category = c.id
WHERE t.user_id = auth.uid()
ORDER BY t.date DESC, t.created_at DESC;

-- Function to process recurring transactions (Phase 2)
CREATE OR REPLACE FUNCTION process_recurring_transactions()
RETURNS void AS $$
BEGIN
    -- Process daily recurring transactions
    INSERT INTO transactions (user_id, type, amount, category, description, date, is_recurring, recurring_parent_id)
    SELECT 
        rt.user_id,
        rt.type,
        rt.amount,
        rt.category,
        rt.description,
        CURRENT_DATE,
        TRUE,
        rt.id
    FROM recurring_transactions rt
    WHERE rt.is_active = TRUE
      AND rt.frequency = 'daily'
      AND rt.next_date <= CURRENT_DATE
      AND (rt.end_date IS NULL OR rt.end_date >= CURRENT_DATE);
    
    -- Update next date for daily transactions
    UPDATE recurring_transactions
    SET next_date = CURRENT_DATE + INTERVAL '1 day'
    WHERE is_active = TRUE
      AND frequency = 'daily'
      AND next_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Cashivo database schema created successfully! Ready for MVP and Phase 2 features.' AS status;
