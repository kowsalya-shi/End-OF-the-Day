import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function checkDailyWorkTable() {
  console.log('\n=== CHECKING DAILY_WORK TABLE ===\n');

  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_work'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ daily_work table does NOT exist!');
      console.log('');
      console.log('Creating daily_work table...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_work (
          id SERIAL PRIMARY KEY,
          action TEXT NOT NULL,
          how TEXT,
          who TEXT,
          date DATE NOT NULL,
          start_date DATE,
          completion_date DATE,
          status TEXT NOT NULL DEFAULT 'yts',
          completion_pct INTEGER DEFAULT 0,
          remarks TEXT,
          user_id INTEGER REFERENCES users(id),
          team_id INTEGER REFERENCES teams(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✅ daily_work table created successfully!');
    } else {
      console.log('✅ daily_work table exists');
    }

    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'daily_work'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Table Columns:\n');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name} - ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
    });

    // Check if there are any records
    const countResult = await pool.query('SELECT COUNT(*) FROM daily_work');
    console.log(`\n📊 Total records: ${countResult.rows[0].count}`);

    console.log('\n=== CHECK COMPLETE ===\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDailyWorkTable();
