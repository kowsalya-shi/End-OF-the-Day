import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Shiny@08@localhost:5432/eod_db'
});

async function changeHRtoCEO() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('\n========== CHANGING HR TO CEO ==========\n');

    // 1. Update user role from 'hr' to 'ceo' in users table
    const updateRole = await client.query(`
      UPDATE users 
      SET role = 'ceo', 
          department = 'Executive',
          employee_id = 'CEO001'
      WHERE role = 'hr'
      RETURNING id, name, email, role, department
    `);

    console.log('✅ Updated user roles:');
    updateRole.rows.forEach(user => {
      console.log(`   ${user.name} (${user.email}) -> Role: ${user.role}, Department: ${user.department}`);
    });
    console.log('');

    await client.query('COMMIT');
    console.log('✅ Database updated successfully!\n');
    console.log('==========================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

changeHRtoCEO().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
