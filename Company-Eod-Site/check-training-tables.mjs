import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function checkTrainingTables() {
  console.log('\n=== CHECKING TRAINING TABLES ===\n');

  try {
    // Check which training tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%training%'
    `);

    console.log('📋 Training-related tables:\n');
    tables.rows.forEach(t => {
      console.log(`   - ${t.table_name}`);
    });

    // Check if training_records exists
    const trainingRecordsExists = tables.rows.some(t => t.table_name === 'training_records');
    
    if (!trainingRecordsExists) {
      console.log('\n❌ training_records table does NOT exist!');
      console.log('✅ Creating training_records table...\n');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS training_records (
          id SERIAL PRIMARY KEY,
          topic TEXT NOT NULL,
          category TEXT,
          trainer TEXT,
          start_date DATE,
          end_date DATE,
          status TEXT NOT NULL DEFAULT 'yts',
          progress_pct INTEGER DEFAULT 0,
          remarks TEXT,
          user_id INTEGER REFERENCES users(id),
          team_id INTEGER REFERENCES teams(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✅ training_records table created!\n');
    } else {
      console.log('\n✅ training_records table exists\n');
      
      // Show its structure
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'training_records'
        ORDER BY ordinal_position;
      `);

      console.log('📋 training_records columns:\n');
      columns.rows.forEach(col => {
        console.log(`   ${col.column_name} - ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
      });
    }

    console.log('\n=== CHECK COMPLETE ===\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTrainingTables();
