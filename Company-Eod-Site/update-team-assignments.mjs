import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Shiny@08@localhost:5432/eod_db'
});

async function updateTeamAssignments() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('\n========== UPDATING TEAM ASSIGNMENTS ==========\n');

    // First, let's get all Team Leader IDs
    const tlQuery = await client.query(`
      SELECT id, name, LOWER(name) as lower_name 
      FROM users 
      WHERE role = 'tl'
    `);

    const teamLeaders = {
      soubhagya: tlQuery.rows.find(tl => tl.lower_name.includes('soubhagya') || tl.lower_name.includes('soubhgya')),
      waseem: tlQuery.rows.find(tl => tl.lower_name.includes('waseem')),
      javeed: tlQuery.rows.find(tl => tl.lower_name.includes('javed') || tl.lower_name.includes('javeed')),
      rajshekar: tlQuery.rows.find(tl => tl.lower_name.includes('rajshekar'))
    };

    console.log('Team Leaders Found:');
    console.log('  SOUBHAGYA:', teamLeaders.soubhagya?.name);
    console.log('  Waseem:', teamLeaders.waseem?.name);
    console.log('  Javeed:', teamLeaders.javeed?.name);
    console.log('  Rajshekar:', teamLeaders.rajshekar?.name);
    console.log('');

    // Get all teams and map them to team leaders
    const teamsQuery = await client.query('SELECT id, name, tl_id FROM teams ORDER BY name');
    console.log('Teams in database:');
    teamsQuery.rows.forEach(team => {
      const tl = tlQuery.rows.find(t => t.id === team.tl_id);
      console.log(`  ${team.name} (ID: ${team.id}) -> TL: ${tl?.name || 'None'}`);
    });
    console.log('');

    // Team assignments based on your Excel data
    const assignments = [
      // SOUBHAGYA's Team (FICO/PP)
      { name: 'ibrahim', team_leader: 'soubhagya', department: 'FICO', teams: ['FICO'] },
      { name: 'ashitosh', team_leader: 'soubhagya', department: 'PP', teams: ['PP'] },
      { name: 'disha', team_leader: 'soubhagya', department: 'FICO', teams: ['FICO'] },
      { name: 'manjunath', team_leader: 'soubhagya', department: 'FICO', teams: ['FICO'] },
      { name: 'roopa', team_leader: 'soubhagya', department: 'FICO', teams: ['FICO'] },

      // Waseem's Team (MM/EWM)
      { name: 'sharath', team_leader: 'waseem', department: 'MM', teams: ['MM'] },
      { name: 'shabeer', team_leader: 'waseem', department: 'MM', teams: ['MM'] },
      { name: 'amita', team_leader: 'waseem', department: 'EWM', teams: ['EWM'] },
      { name: 'shubham', team_leader: 'waseem', department: 'MM', teams: ['MM'] },
      { name: 'yogesh', team_leader: 'waseem', department: 'EWM', teams: ['EWM'] },

      // Javeed's Team (SD/Developer/Sales)
      { name: 'vickram', team_leader: 'javeed', department: 'SD', teams: ['SD'] },
      { name: 'anuja', team_leader: 'javeed', department: 'SD', teams: ['SD'] },
      { name: 'pradeep', team_leader: 'javeed', department: 'SD', teams: ['SD'] },
      { name: 'ayesha', team_leader: 'javeed', department: 'Sales', teams: ['Sales'] },
      // Note: Aaron is not in the database yet

      // Rajshekar's Team (Developer/Data Analysis/ABAP)
      { name: 'kowsalya', team_leader: 'rajshekar', department: 'Developer', teams: ['Developer'] },
      { name: 'giri', team_leader: 'rajshekar', department: 'Developer', teams: ['Developer'] },
      { name: 'ankita', team_leader: 'rajshekar', department: 'Data Analysis', teams: ['Data Analysis'] },
      // Note: Akanksha is not in the database
      { name: 'sanjay', team_leader: 'rajshekar', department: 'ABAP', teams: ['ABAP'] },
      { name: 'priya', team_leader: 'rajshekar', department: 'ABAP', teams: ['ABAP'] },
    ];

    console.log('Processing assignments...\n');

    for (const assignment of assignments) {
      // Find the employee by partial name match
      const empQuery = await client.query(`
        SELECT id, name, email, team_id
        FROM users 
        WHERE LOWER(name) LIKE $1 AND role = 'employee'
        LIMIT 1
      `, [`%${assignment.name}%`]);

      if (empQuery.rows.length === 0) {
        console.log(`❌ Employee not found: ${assignment.name}`);
        continue;
      }

      const employee = empQuery.rows[0];
      const tlData = teamLeaders[assignment.team_leader];

      if (!tlData) {
        console.log(`❌ Team Leader not found: ${assignment.team_leader}`);
        continue;
      }

      // Find the appropriate team for this employee
      let targetTeamId = null;
      for (const teamName of assignment.teams) {
        const team = teamsQuery.rows.find(t => t.name === teamName && t.tl_id === tlData.id);
        if (team) {
          targetTeamId = team.id;
          break;
        }
      }

      if (!targetTeamId) {
        console.log(`❌ No team found for ${employee.name} under ${tlData.name}`);
        continue;
      }

      // Update employee's team and department
      await client.query(`
        UPDATE users 
        SET team_id = $1, department = $2
        WHERE id = $3
      `, [targetTeamId, assignment.department, employee.id]);

      console.log(`✅ ${employee.name} -> Team: ${assignment.teams[0]} (TL: ${tlData.name})`);
    }

    // Also update Team Leaders themselves to be in their own teams
    console.log('\nUpdating Team Leaders to their primary teams...\n');
    
    // SOUBHAGYA -> FICO team
    const ficoTeam = teamsQuery.rows.find(t => t.name === 'FICO' && t.tl_id === teamLeaders.soubhagya?.id);
    if (ficoTeam && teamLeaders.soubhagya) {
      await client.query('UPDATE users SET team_id = $1, department = $2 WHERE id = $3', 
        [ficoTeam.id, 'FICO', teamLeaders.soubhagya.id]);
      console.log(`✅ ${teamLeaders.soubhagya.name} -> Team: FICO`);
    }

    // Waseem -> MM team
    const mmTeam = teamsQuery.rows.find(t => t.name === 'MM' && t.tl_id === teamLeaders.waseem?.id);
    if (mmTeam && teamLeaders.waseem) {
      await client.query('UPDATE users SET team_id = $1, department = $2 WHERE id = $3', 
        [mmTeam.id, 'MM', teamLeaders.waseem.id]);
      console.log(`✅ ${teamLeaders.waseem.name} -> Team: MM`);
    }

    // Javeed -> SD team
    const sdTeam = teamsQuery.rows.find(t => t.name === 'SD' && t.tl_id === teamLeaders.javeed?.id);
    if (sdTeam && teamLeaders.javeed) {
      await client.query('UPDATE users SET team_id = $1, department = $2 WHERE id = $3', 
        [sdTeam.id, 'SD', teamLeaders.javeed.id]);
      console.log(`✅ ${teamLeaders.javeed.name} -> Team: SD`);
    }

    // Rajshekar -> Developer team
    const devTeam = teamsQuery.rows.find(t => t.name === 'Developer' && t.tl_id === teamLeaders.rajshekar?.id);
    if (devTeam && teamLeaders.rajshekar) {
      await client.query('UPDATE users SET team_id = $1, department = $2 WHERE id = $3', 
        [devTeam.id, 'Developer', teamLeaders.rajshekar.id]);
      console.log(`✅ ${teamLeaders.rajshekar.name} -> Team: Developer`);
    }

    await client.query('COMMIT');
    console.log('\n✅ All team assignments updated successfully!\n');

    // Display final team structure
    console.log('========== FINAL TEAM STRUCTURE ==========\n');
    const finalQuery = await client.query(`
      SELECT 
        t.name as team_name,
        tl.name as team_leader,
        u.name as member_name,
        u.department,
        u.role
      FROM teams t
      JOIN users tl ON t.tl_id = tl.id
      LEFT JOIN users u ON u.team_id = t.id AND u.role = 'employee'
      ORDER BY t.name, u.name
    `);

    let currentTeam = null;
    finalQuery.rows.forEach(row => {
      if (row.team_name !== currentTeam) {
        currentTeam = row.team_name;
        console.log(`\n📁 ${row.team_name} (TL: ${row.team_leader})`);
      }
      if (row.member_name) {
        console.log(`   👤 ${row.member_name} - ${row.department}`);
      }
    });

    console.log('\n==========================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

updateTeamAssignments().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
