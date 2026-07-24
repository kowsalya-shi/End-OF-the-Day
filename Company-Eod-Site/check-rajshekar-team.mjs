import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function checkRajshekarTeam() {
  try {
    await client.connect();
    
    // Find Rajshekar
    const rajshekar = await client.query(`
      SELECT id, name, email, role, team_id
      FROM users
      WHERE name = 'Rajshekar Swamy'
    `);
    
    console.log('Rajshekar Info:', rajshekar.rows[0]);
    
    if (rajshekar.rows.length === 0) {
      console.log('Rajshekar not found!');
      return;
    }

    const rajId = rajshekar.rows[0].id;

    // Find teams managed by Rajshekar
    const teams = await client.query(`
      SELECT id, name, tl_id
      FROM teams
      WHERE tl_id = $1
    `, [rajId]);

    console.log('\nTeams managed by Rajshekar:');
    teams.rows.forEach(t => console.log(`  - ${t.name} (ID: ${t.id})`));

    // Find all employees in those teams
    if (teams.rows.length > 0) {
      const teamIds = teams.rows.map(t => t.id);
      
      const members = await client.query(`
        SELECT id, name, email, role, team_id, department
        FROM users
        WHERE team_id = ANY($1::int[])
        ORDER BY team_id, name
      `, [teamIds]);

      console.log('\nTeam Members:');
      members.rows.forEach(m => {
        const teamName = teams.rows.find(t => t.id === m.team_id)?.name || 'Unknown';
        console.log(`  - ${m.name} (${m.role}) - Team: ${teamName} - Dept: ${m.department || 'N/A'}`);
      });
      
      console.log(`\nTotal members: ${members.rows.length}`);
    } else {
      console.log('\nNo teams found for Rajshekar!');
    }

    // Check all employees with Developer, Data Analysis, or ABAP departments
    const potentialMembers = await client.query(`
      SELECT id, name, email, role, team_id, department
      FROM users
      WHERE (department IN ('Developer', 'Data Analysis', 'ABAP') OR department IS NULL)
        AND role = 'employee'
      ORDER BY name
    `);

    console.log('\n\nPotential members for Rajshekar teams (Developer/Data Analysis/ABAP):');
    potentialMembers.rows.forEach(m => {
      console.log(`  - ${m.name} - Dept: ${m.department || 'N/A'} - Current Team ID: ${m.team_id || 'None'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkRajshekarTeam();
