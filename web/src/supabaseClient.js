import { createClient } from '@supabase/supabase-js';

// Public project URL + anon key (safe to embed in client apps; RLS protects data).
const SUPABASE_URL = 'https://aiptokxagqthzhpmtjyk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpcHRva3hhZ3F0aHpocG10anlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDU4MzEsImV4cCI6MjA5MTc4MTgzMX0.J2jqUYc7eLpWYbQUKqPE3mCrW67xhfNLDsYFHwEOBas';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'mf-auth',
  },
});
