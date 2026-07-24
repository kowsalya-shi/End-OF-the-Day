/**
 * Run EOD Approval Migration
 * 
 * This script adds approval fields to the eod_submissions table
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'eod_db',
  password: 'Shiny@08',
  port: 5432,
});

async function runMigration() {
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    console.log('📄 Reading migration file...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add-eod-approval-fields.sql'),
      'utf8'
    );

    console.log('🚀 Running migration...\n');
    const result = await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\nChanges made:');
    console.log('  - Added approval_status column');
    console.log('  - Added approved_by column');
    console.log('  - Added approved_at column');
    console.log('  - Added rejection_reason column');
    console.log('  - Added tl_comments column');
    console.log('  - Created eod_approval_history table');
    console.log('  - Created indexes for better performance');
    console.log('\n✨ Database is ready for EOD approval workflow!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
