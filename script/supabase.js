// script/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://fjwodxbrnsutnvsooduh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqd29keGJybnN1dG52c29vZHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MTk4MjAsImV4cCI6MjA2OTE5NTgyMH0.GePnmFWipZxwU6UVkXSnPWRV3EX-BJePB5IdCtElOQg';

export const supabase = createClient(supabaseUrl, supabaseKey);
