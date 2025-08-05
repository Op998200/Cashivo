// Supabase client initialization for Cashivo

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://bgdtmceusndgtscnqxwk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZHRtY2V1c25kZ3RzY25xeHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNDcxODksImV4cCI6MjA2OTYyMzE4OX0.x3YPMWP5aH7J52ylUD9N5cLH9dpd2ieVugtWUqsOEV4';

export const supabase = createClient(supabaseUrl, supabaseKey);
