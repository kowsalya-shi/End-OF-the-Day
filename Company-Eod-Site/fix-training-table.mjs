import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function fixTrainingTable() {
  console.log('\n=== FIXING TRAINING TABLE ===\n');

  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'training'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ training table does NOT exist!');
      console.log('');
      console.log('Creating training table...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS training (
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

      console.log('✅ training table created successfully!');
    } else {
      console.log('✅ training table exists');
      
      // Add missing columns if table exists
      const columnsToAdd = [
        { name: 'category', type: 'TEXT' },
        { name: 'trainer', type: 'TEXT' },
        { name: 'start_date', type: 'DATE' },
        { name: 'end_date', type: 'DATE' },
        { name: 'progress_pct', type: 'INTEGER DEFAULT 0' },
        { name: 'remarks', type: 'TEXT' },
        { name: 'team_id', type: 'INTEGER REFERENCES teams(id)' },
        { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
      ];

      for (const col of columnsToAdd) {
        try {
          console.log(`Adding column: ${col.name}...`);
          await pool.query(`ALTER TABLE training ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
          console.log(`✅ Added ${col.name}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`ℹ️  ${col.name} already exists`);
          } else {
            console.log(`❌ Error adding ${col.name}:`, error.message);
          }
        }
      }
    }

    // Verify the structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'training'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Training Table Columns:\n');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name} - ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
    });

    // Check record count
    const countResult = await pool.query('SELECT COUNT(*) FROM training');
    console.log(`\n📊 Total training records: ${countResult.rows[0].count}`);

    console.log('\n✅ TRAINING TABLE FIXED!\n');
    console.log('Now try saving training records in the employee portal.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixTrainingTable();
