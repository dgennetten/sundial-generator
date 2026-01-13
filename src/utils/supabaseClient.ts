import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vuisznmoippkwkcxquzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXN6bm1vaXBwa3drY3hxdXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjM2MDUsImV4cCI6MjA4MzczOTYwNX0.vNKa1TCgAh2Kop5xOSYAropkYTP4XUNanpn7Xykk5NQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
