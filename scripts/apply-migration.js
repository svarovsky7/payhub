/**
 * Apply a migration file to Supabase
 * Usage: node scripts/apply-migration.js <migration-file-path>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js <migration-file-path>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const migrationPath = resolve(__dirname, '..', migrationFile);
    console.log(`Reading migration file: ${migrationPath}`);

    const sql = readFileSync(migrationPath, 'utf8');
    console.log('Applying migration...');

    // Note: This requires service_role key, not anon key
    // You may need to use the Supabase SQL Editor instead
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Migration applied successfully!');
    console.log('Result:', data);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applyMigration();
