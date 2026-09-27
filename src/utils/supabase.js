import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ayapdglkahicqomtyiza.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5YXBkZ2xrYWhpY3FvbXR5aXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NzQ0MjYsImV4cCI6MjEwNDE1MDQyNn0.LjWKCT5uk7YPJ1HOP41b_v86Rr1s3QOtgmFIKvCG__4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});