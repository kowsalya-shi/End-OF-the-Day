import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'eod-salt-2024').digest('hex');
}

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: ''
});

async function setup() {
  try {
    console.log('🔧 Creating database tables...\n');

    // Create teams table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        tl_id INTEGER,
        manager_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        team_id INTEGER,
        employee_id TEXT,
        department TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // Create eod table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eod (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        task_completed TEXT,
        task_pending TEXT,
        challenges TEXT,
        attendance_status TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // Create tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        task_code TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT,
        due_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create daily_work table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_work (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        action TEXT NOT NULL,
        who TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // Create training table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS training (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        training_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'not-started',
        start_date DATE,
        end_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    console.log('✅ Tables created successfully!\n');

    console.log('👥 Adding teams and users...\n');

    // Insert teams
    const teams = [
      { name: 'FICO' },
      { name: 'PP' },
      { name: 'MM' },
      { name: 'EWM' },
      { name: 'SD' },
      { name: 'Developer' },
      { name: 'Sales' },
      { name: 'Data Analysis' },
      { name: 'ABAP' }
    ];

    const teamMap = {};
    for (const team of teams) {
      const result = await pool.query(
        'INSERT INTO teams (name) VALUES ($1) RETURNING id, name',
        [team.name]
      );
      teamMap[team.name.toLowerCase()] = result.rows[0].id;
      console.log(`  ✓ Team: ${result.rows[0].name}`);
    }

    // Insert Manager
    const managerResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, employee_id, department) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['Asim Alam', 'shinydora753152@gmail.com', hashPassword('manager123'), 'manager', 'MGR001', 'Management']
    );
    const managerId = managerResult.rows[0].id;
    console.log('  ✓ Manager: Asim Alam');

    // Insert HR
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role, employee_id, department) VALUES ($1, $2, $3, $4, $5, $6)',
      ['Thaseena Khanum', 'athishiny0@gmail.com', hashPassword('hr123'), 'hr', 'HR001', 'Human Resources']
    );
    console.log('  ✓ HR: Thaseena Khanum');

    // Team Leaders
    const tls = [
      { name: 'SOUBHGYA', email: 'soubhgya@arraafiinfotech.com', team: 'fico' },
      { name: 'Waseem', email: 'waseem@arraafiinfotech.com', team: 'mm' },
      { name: 'Javeed', email: 'javeed@arraafiinfotech.com', team: 'sd' },
      { name: 'Rajshekar', email: 'rajshekar@arraafiinfotech.com', team: 'developer' }
    ];

    const tlMap = {};
    for (const tl of tls) {
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, team_id, employee_id, department) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [tl.name, tl.email, hashPassword('tl123'), 'tl', teamMap[tl.team], `TL${tlMap.length + 1}`, tl.team.toUpperCase()]
      );
      tlMap[tl.team] = result.rows[0].id;
      console.log(`  ✓ TL: ${tl.name} (${tl.team.toUpperCase()})`);
    }

    // Update teams with TL and Manager IDs
    for (const [team, tlId] of Object.entries(tlMap)) {
      await pool.query(
        'UPDATE teams SET tl_id = $1, manager_id = $2 WHERE id = $3',
        [tlId, managerId, teamMap[team]]
      );
    }

    // Employees
    const employees = [
      { name: 'Mohd Ibrahim', email: 'mohd.ibrahim@arraafiinfotech.com', team: 'fico' },
      { name: 'Disha', email: 'disha@arraafiinfotech.com', team: 'fico' },
      { name: 'Manjunath', email: 'manjunath@arraafiinfotech.com', team: 'fico' },
      { name: 'Roop', email: 'roop@arraafiinfotech.com', team: 'fico' },
      { name: 'Ashitosh', email: 'ashitosh@arraafiinfotech.com', team: 'pp' },
      { name: 'Sharath', email: 'sharath@arraafiinfotech.com', team: 'mm' },
      { name: 'Shabbir', email: 'shabbir@arraafiinfotech.com', team: 'mm' },
      { name: 'Shubham', email: 'shubham@arraafiinfotech.com', team: 'mm' },
      { name: 'Amita', email: 'amita@arraafiinfotech.com', team: 'ewm' },
      { name: 'Yogesh', email: 'yogesh@arraafiinfotech.com', team: 'ewm' },
      { name: 'Vickram', email: 'vickram@arraafiinfotech.com', team: 'sd' },
      { name: 'Anuja', email: 'anuja@arraafiinfotech.com', team: 'sd' },
      { name: 'Pradeep', email: 'pradeep@arraafiinfotech.com', team: 'sd' },
      { name: 'Ayesha', email: 'ayesha@arraafiinfotech.com', team: 'sales' },
      { name: 'Aaron', email: 'aaron@arraafiinfotech.com', team: 'sales' },
      { name: 'Kowsalya', email: 'kowsalya@arraafiinfotech.com', team: 'developer' },
      { name: 'Giri', email: 'giri@arraafiinfotech.com', team: 'developer' },
      { name: 'Ankita', email: 'ankita@arraafiinfotech.com', team: 'data analysis' },
      { name: 'Akanksha', email: 'akanksha@arraafiinfotech.com', team: 'abap' },
      { name: 'Sanjay', email: 'sanjay@arraafiinfotech.com', team: 'abap' },
      { name: 'Priya', email: 'priya@arraafiinfotech.com', team: 'abap' }
    ];

    for (const emp of employees) {
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role, team_id, employee_id, department) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [emp.name, emp.email, hashPassword('emp123'), 'employee', teamMap[emp.team], `EMP${Math.random().toString().slice(2, 6)}`, emp.team.toUpperCase()]
      );
      console.log(`  ✓ Employee: ${emp.name} (${emp.team.toUpperCase()})`);
    }

    console.log('\n✅ Database setup complete!\n');
    console.log('🔐 Login Credentials:');
    console.log('  Manager:  shinydora753152@gmail.com / manager123');
    console.log('  HR:       athishiny0@gmail.com / hr123');
    console.log('  TL:       waseem@arraafiinfotech.com / tl123');
    console.log('  Employee: kowsalya@arraafiinfotech.com / emp123');
    console.log('\n🌐 Open: http://localhost:23881\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();
