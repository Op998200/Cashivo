// Supabase client initialization for Cashivo

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://soovxxigvxmtoflszcat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvb3Z4eGlndnhtdG9mbHN6Y2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNjM1OTEsImV4cCI6MjA3MTgzOTU5MX0.xCWx52KP58shiqjVa6T6UnYNNTYOgxdfC8YMgqq4XjI';

export const supabase = createClient(supabaseUrl, supabaseKey);
