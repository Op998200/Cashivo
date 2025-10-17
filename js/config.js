// Supabase configuration
const SUPABASE_URL = 'https://soovxxigvxmtoflszcat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvb3Z4eGlndnhtdG9mbHN6Y2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNjM1OTEsImV4cCI6MjA3MTgzOTU5MX0.xCWx52KP58shiqjVa6T6UnYNNTYOgxdfC8YMgqq4XjI';

// Categories for transactions
const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Groceries',
  'Other'
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Gift',
  'Bonus',
  'Other'
];

// App configuration
const APP_CONFIG = {
  name: 'Cashivo',
  tagline: 'Track Smarter. Spend Better.',
  version: '1.0.0',
  currency: '$'
};

export { SUPABASE_URL, SUPABASE_ANON_KEY, EXPENSE_CATEGORIES, INCOME_CATEGORIES, APP_CONFIG };
