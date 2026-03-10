import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkfxjmnwhiexvbkwidyi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZnhqbW53aGlleHZia3dpZHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDg4MDMsImV4cCI6MjA4ODU4NDgwM30.r9ytxtJROXutb_3b2zvmzPBYA5mdpbmdOIZ4rdTYVBk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
