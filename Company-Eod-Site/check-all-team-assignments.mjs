import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function checkAllTeamAssignments() {
  try {
    await client.connect();
    
    // Get all teams with their team leaders
    const teams = await client.query(`
      SELECT t.id, t.name, t.tl_id, u.name as tl_name
      FROM teams t
      LEFT JOIN users u ON t.tl_id = u.id
      ORDER BY t.id
    `);

    console.log('ALL TEAMS:');
    console.log('==========');
    
    for (const team of teams.rows) {
      console.log(`\n${team.name} (ID: ${team.id}) - TL: ${team.tl_name || 'None'}`);
      
      // Get members of this team
      const members = await client.query(`
        SELECT id, name, email, role, department
        FROM users
        WHERE team_id = $1
        ORDER BY role DESC, name
      `, [team.id]);
      
      if (members.rows.length > 0) {
        members.rows.forEach(m => {
          console.log(`  - ${m.name} (${m.role}) - Dept: ${m.department || 'N/A'}`);
        });
      } else {
        console.log('  (No members)');
      }
    }

    // Check users without team assignment
    console.log('\n\nUSERS WITHOUT TEAM:');
    console.log('===================');
    const noTeam = await client.query(`
      SELECT id, name, email, role, department, team_id
      FROM users
      WHERE team_id IS NULL AND role = 'employee'
      ORDER BY name
    `);
    
    if (noTeam.rows.length > 0) {
      noTeam.rows.forEach(u => {
        console.log(`  - ${u.name} (${u.role}) - Dept: ${u.department || 'N/A'}`);
      });
    } else {
      console.log('  (All employees assigned to teams)');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAllTeamAssignments();
