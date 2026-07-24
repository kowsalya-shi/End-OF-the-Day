import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Shiny@08@localhost:5432/eod_db'
});

async function verifyTLAccess() {
  try {
    console.log('\n========== TEAM LEADER ACCESS VERIFICATION ==========\n');

    const tlQuery = await pool.query(`
      SELECT id, name FROM users WHERE role = 'tl' ORDER BY name
    `);

    for (const tl of tlQuery.rows) {
      console.log(`\n👨‍💼 ${tl.name.toUpperCase()}`);
      console.log('   Should see EODs from:\n');

      // Get all teams managed by this TL
      const teamsQuery = await pool.query(`
        SELECT id, name FROM teams WHERE tl_id = $1 ORDER BY name
      `, [tl.id]);

      const teamIds = teamsQuery.rows.map(t => t.id);
      
      // Get all employees under these teams
      const membersQuery = await pool.query(`
        SELECT u.name, u.email, u.department, t.name as team_name
        FROM users u
        JOIN teams t ON u.team_id = t.id
        WHERE u.team_id = ANY($1) AND u.role = 'employee'
        ORDER BY t.name, u.name
      `, [teamIds]);

      let currentTeam = null;
      membersQuery.rows.forEach(member => {
        if (member.team_name !== currentTeam) {
          currentTeam = member.team_name;
          console.log(`   📁 ${member.team_name}:`);
        }
        console.log(`      • ${member.name} (${member.department})`);
      });

      console.log(`\n   📊 Total: ${membersQuery.rows.length} team members`);
      console.log('   ' + '─'.repeat(50));
    }

    console.log('\n=====================================================\n');
    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

verifyTLAccess();
