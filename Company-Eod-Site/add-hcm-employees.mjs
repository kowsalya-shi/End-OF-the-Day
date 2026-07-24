import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function addHCMEmployees() {
  console.log('\n=== ADDING HCM EMPLOYEES ===\n');

  try {
    const hashedPassword = await bcrypt.hash('emp123', 10);

    // Check if HCM team exists, if not create it
    const teamCheck = await pool.query(`SELECT id FROM teams WHERE name = 'HCM'`);
    let hcmTeamId;

    if (teamCheck.rows.length === 0) {
      console.log('Creating HCM team...');
      const teamResult = await pool.query(`
        INSERT INTO teams (name, description, created_at)
        VALUES ('HCM', 'Human Capital Management', CURRENT_TIMESTAMP)
        RETURNING id
      `);
      hcmTeamId = teamResult.rows[0].id;
      console.log(`✅ HCM team created with ID: ${hcmTeamId}\n`);
    } else {
      hcmTeamId = teamCheck.rows[0].id;
      console.log(`✅ HCM team already exists with ID: ${hcmTeamId}\n`);
    }

    // Add Vishal Koni
    const vishalCheck = await pool.query(`SELECT id FROM users WHERE email = 'vishal.koni@arraafiinfotech.com'`);
    
    if (vishalCheck.rows.length === 0) {
      const vishalResult = await pool.query(`
        INSERT INTO users (
          name, email, password, role, department, employee_id, team_id, created_at
        ) VALUES (
          'Vishal Koni',
          'vishal.koni@arraafiinfotech.com',
          $1,
          'employee',
          'HCM',
          'EMP026',
          $2,
          CURRENT_TIMESTAMP
        ) RETURNING id, name, email
      `, [hashedPassword, hcmTeamId]);

      console.log('✅ Added employee:');
      console.log(`   ID: ${vishalResult.rows[0].id}`);
      console.log(`   Name: ${vishalResult.rows[0].name}`);
      console.log(`   Email: ${vishalResult.rows[0].email}`);
      console.log(`   Department: HCM`);
      console.log(`   Password: emp123`);
      console.log('');
    } else {
      console.log('ℹ️  Vishal Koni already exists\n');
    }

    // Add Altaf Hussain
    const altafCheck = await pool.query(`SELECT id FROM users WHERE email = 'altaf.hussain@arraafiinfotech.com'`);
    
    if (altafCheck.rows.length === 0) {
      const altafResult = await pool.query(`
        INSERT INTO users (
          name, email, password, role, department, employee_id, team_id, created_at
        ) VALUES (
          'Altaf Hussain',
          'altaf.hussain@arraafiinfotech.com',
          $1,
          'employee',
          'HCM',
          'EMP027',
          $2,
          CURRENT_TIMESTAMP
        ) RETURNING id, name, email
      `, [hashedPassword, hcmTeamId]);

      console.log('✅ Added employee:');
      console.log(`   ID: ${altafResult.rows[0].id}`);
      console.log(`   Name: ${altafResult.rows[0].name}`);
      console.log(`   Email: ${altafResult.rows[0].email}`);
      console.log(`   Department: HCM`);
      console.log(`   Password: emp123`);
      console.log('');
    } else {
      console.log('ℹ️  Altaf Hussain already exists\n');
    }

    // Show all HCM employees
    const hcmEmployees = await pool.query(`
      SELECT id, name, email, department, employee_id
      FROM users
      WHERE department = 'HCM'
      ORDER BY name
    `);

    console.log('📋 All HCM Employees:\n');
    hcmEmployees.rows.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.name}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Employee ID: ${emp.employee_id}`);
      console.log('');
    });

    console.log('✅ HCM EMPLOYEES ADDED SUCCESSFULLY!\n');
    console.log('📝 Login Credentials:');
    console.log('   Email: vishal.koni@arraafiinfotech.com');
    console.log('   Email: altaf.hussain@arraafiinfotech.com');
    console.log('   Password: emp123 (for both)');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addHCMEmployees();
