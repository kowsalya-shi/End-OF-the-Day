import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function addTopicColumn() {
  try {
    console.log('Adding topic column to training table...');
    await pool.query('ALTER TABLE training ADD COLUMN IF NOT EXISTS topic TEXT');
    console.log('✅ topic column added');
    
    // Also make user_id nullable
    await pool.query('ALTER TABLE training ALTER COLUMN user_id DROP NOT NULL');
    console.log('✅ user_id is now nullable');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addTopicColumn();
