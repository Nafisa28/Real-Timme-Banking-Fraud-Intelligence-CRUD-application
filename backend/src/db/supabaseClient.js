const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
  console.log('[Supabase] Client initialized successfully');
} else {
  console.warn('[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — Supabase sync disabled');
}

module.exports = { supabase };
