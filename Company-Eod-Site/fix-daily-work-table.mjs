import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function fixDailyWorkTable() {
  console.log('\n=== FIXING DAILY_WORK TABLE ===\n');

  try {
    // Add missing columns
    const columnsToAdd = [
      { name: 'how', type: 'TEXT' },
      { name: 'start_date', type: 'DATE' },
      { name: 'completion_date', type: 'DATE' },
      { name: 'completion_pct', type: 'INTEGER DEFAULT 0' },
      { name: 'remarks', type: 'TEXT' },
      { name: 'team_id', type: 'INTEGER REFERENCES teams(id)' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const col of columnsToAdd) {
      try {
        console.log(`Adding column: ${col.name}...`);
        await pool.query(`ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  ${col.name} already exists`);
        } else {
          console.log(`❌ Error adding ${col.name}:`, error.message);
        }
      }
    }

    // Also make user_id nullable (since it should be optional)
    try {
      console.log('\nMaking user_id nullable...');
      await pool.query(`ALTER TABLE daily_work ALTER COLUMN user_id DROP NOT NULL`);
      console.log('✅ user_id is now nullable');
    } catch (error) {
      console.log(`ℹ️  user_id: ${error.message}`);
    }

    // Verify the changes
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'daily_work'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Updated Table Columns:\n');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name} - ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
    });

    console.log('\n✅ DAILY_WORK TABLE FIXED!\n');
    console.log('Now try saving daily work in the employee portal.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixDailyWorkTable();
