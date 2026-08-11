import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mmdvlnxbofjrhtnenanc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZHZsbnhib2Zqcmh0bmVuYW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MzYzNzgsImV4cCI6MjEwMjAxMjM3OH0.BNpGz4T2WYNUhV4kRlAjYI_TSw4caLppUQ60z2jd4KE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
