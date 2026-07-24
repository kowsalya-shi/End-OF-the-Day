import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

// Simple password hashing (in production, use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/eod_db'
});

async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Create teams
    console.log('Creating teams...');
    const teams = [
      { name: 'Development Team', tlId: null, managerId: null },
      { name: 'Design Team', tlId: null, managerId: null },
      { name: 'Marketing Team', tlId: null, managerId: null }
    ];

    const insertedTeams = [];
    for (const team of teams) {
      const result = await pool.query(
        'INSERT INTO teams (name, tl_id, manager_id) VALUES ($1, $2, $3) RETURNING id, name',
        [team.name, team.tlId, team.managerId]
      );
      insertedTeams.push(result.rows[0]);
      console.log(`  ✓ Created team: ${result.rows[0].name}`);
    }

    // Create users
    console.log('\nCreating users...');
    const users = [
      {
        name: 'Shiny Manager',
        email: 'shinydora753152@gmail.com',
        password: 'manager123',
        role: 'manager',
        teamId: insertedTeams[0].id,
        employeeId: 'EMP001',
        department: 'Management'
      },
      {
        name: 'Athi HR',
        email: 'athishiny0@gmail.com',
        password: 'hr123',
        role: 'hr',
        teamId: null,
        employeeId: 'EMP002',
        department: 'Human Resources'
      },
      {
        name: 'Rahul Singh',
        email: 'rahul.singh@arraafiinfotech.com',
        password: 'tl123',
        role: 'tl',
        teamId: insertedTeams[0].id,
        employeeId: 'EMP003',
        department: 'Development'
      },
      {
        name: 'Priya Sharma',
        email: 'priya.sharma@arraafiinfotech.com',
        password: 'emp123',
        role: 'employee',
        teamId: insertedTeams[0].id,
        employeeId: 'EMP004',
        department: 'Development'
      },
      {
        name: 'Amit Kumar',
        email: 'amit.kumar@arraafiinfotech.com',
        password: 'emp123',
        role: 'employee',
        teamId: insertedTeams[0].id,
        employeeId: 'EMP005',
        department: 'Development'
      },
      {
        name: 'Sneha Patel',
        email: 'sneha.patel@arraafiinfotech.com',
        password: 'emp123',
        role: 'employee',
        teamId: insertedTeams[1].id,
        employeeId: 'EMP006',
        department: 'Design'
      }
    ];

    const insertedUsers = [];
    for (const user of users) {
      const passwordHash = hashPassword(user.password);
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, team_id, employee_id, department) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role',
        [user.name, user.email, passwordHash, user.role, user.teamId, user.employeeId, user.department]
      );
      insertedUsers.push(result.rows[0]);
      console.log(`  ✓ Created user: ${result.rows[0].name} (${result.rows[0].role})`);
    }

    // Update teams with TL and Manager IDs
    console.log('\nUpdating team assignments...');
    const managerUser = insertedUsers.find(u => u.role === 'manager');
    const tlUser = insertedUsers.find(u => u.role === 'tl');

    await pool.query(
      'UPDATE teams SET tl_id = $1, manager_id = $2 WHERE id = $3',
      [tlUser.id, managerUser.id, insertedTeams[0].id]
    );
    console.log('  ✓ Assigned manager and TL to Development Team');

    console.log('\n✅ Seed completed successfully!\n');
    console.log('Demo credentials:');
    console.log('  Manager:    shinydora753152@gmail.com / manager123');
    console.log('  HR:         athishiny0@gmail.com / hr123');
    console.log('  Team Lead:  rahul.singh@arraafiinfotech.com / tl123');
    console.log('  Employee:   priya.sharma@arraafiinfotech.com / emp123\n');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
