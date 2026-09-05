import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ayapdglkahicqomtyiza.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FhsUo5aWwjr4FuxTa4QMYg_e6fy-z2_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);