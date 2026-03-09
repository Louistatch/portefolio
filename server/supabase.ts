import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gcfcdkzmfybiigbnlwvb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZmNka3ptZnliaWlnYm5sd3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTU3OTQsImV4cCI6MjA4ODYzMTc5NH0.61Xs-82V1fW6ZoDq-Te44f31BDivuXvRQkO9SS-MpTc';

export const supabase = createClient(supabaseUrl, supabaseKey);
