import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration is missing. Please check your .env file.');
  console.error('Required environment variables: SUPABASE_URL, SUPABASE_KEY');
}

// Create and export the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
