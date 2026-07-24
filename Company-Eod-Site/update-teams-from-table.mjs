import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

// Team structure from the provided table
const teamStructure = {
  'SOUBHGYA': [
    { name: 'Mohammed Ibrahim', domain: 'FICO' },
    { name: 'Ashitosh Avinash Jinde', domain: 'PP' },
    { name: 'DISHA NAVNATH SONAWANE', domain: 'FICO' },
    { name: 'Manjunath K', domain: 'FICO' },
    { name: 'Vishal Koni', domain: 'FICO' },
    { name: 'Altaf Hussain', domain: 'FICO' },
    { name: 'Roopa', domain: 'FICO' }
  ],
  'Waseem': [
    { name: 'SHARATH L', domain: 'MM' },
    { name: 'SHABEER M', domain: 'MM' },
    { name: 'Amita Akash Mudholkar', domain: 'EWM' },
    { name: 'SHUBHAM SADANAND NIMBAL', domain: 'MM' },
    { name: 'Yogesh Dadge', domain: 'EWM' }
  ],
  'Javeed': [
    { name: 'VICKRAM C', domain: 'SD' },
    { name: 'Anuja Ashok Taradale', domain: 'SD' },
    { name: 'PRADEEP GORTAKAR', domain: 'SD' },
    { name: 'AYESHA BANU', domain: 'Sales' }
  ],
  'Rajshekar': [
    { name: 'Kowsalya Athiyan', domain: 'Developer' },
    { name: 'Gali Giridhareswar', domain: 'Developer' },
    { name: 'Ankita Karkale', domain: 'Data Analysis' },
    { name: 'SANJAY BAIRAVAN R', domain: 'ABAP' },
    { name: 'Priya V', domain: 'ABAP' }
  ]
};

async function updateTeamsFromTable() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get all team leaders
    const soubhagya = await client.query(`SELECT id FROM users WHERE name = 'Soubhagya M Bhat' AND role = 'tl'`);
    const waseem = await client.query(`SELECT id FROM users WHERE name = 'Waseem Ahmed Jamadar' AND role = 'tl'`);
    const javeed = await client.query(`SELECT id FROM users WHERE name = 'Mohammad Javed Akhter' AND role = 'tl'`);
    const rajshekar = await client.query(`SELECT id FROM users WHERE name = 'Rajshekar Swamy' AND role = 'tl'`);

    const tlMap = {
      'SOUBHGYA': soubhagya.rows[0]?.id,
      'Waseem': waseem.rows[0]?.id,
      'Javeed': javeed.rows[0]?.id,
      'Rajshekar': rajshekar.rows[0]?.id
    };

    console.log('Team Leaders:');
    Object.entries(tlMap).forEach(([name, id]) => console.log(`  ${name}: ${id}`));

    // Get all teams
    const teams = await client.query(`SELECT id, name, tl_id FROM teams`);
    const teamMap = {};
    teams.rows.forEach(t => teamMap[t.name.toUpperCase()] = t.id);

    console.log('\n=== UPDATING TEAM ASSIGNMENTS ===\n');

    // Update each team member
    for (const [tlName, members] of Object.entries(teamStructure)) {
      const tlId = tlMap[tlName];
      console.log(`\n${tlName}'s Team:`);
      
      for (const member of members) {
        // Find team ID by domain name
        let teamId = teamMap[member.domain.toUpperCase()];
        
        // Handle special case for "developer/sales" - use the first one
        if (member.domain.includes('/')) {
          const firstDomain = member.domain.split('/')[0];
          teamId = teamMap[firstDomain.toUpperCase()];
        }

        if (!teamId) {
          console.log(`  ⚠ Warning: No team found for domain "${member.domain}"`);
          continue;
        }

        // Find user by name (case-insensitive)
        const userResult = await client.query(`
          SELECT id, name, team_id, department
          FROM users
          WHERE UPPER(name) LIKE UPPER($1)
          AND role = 'employee'
        `, [`%${member.name}%`]);

        if (userResult.rows.length === 0) {
          console.log(`  ❌ User not found: ${member.name}`);
          continue;
        }

        const user = userResult.rows[0];
        
        // Update user's team assignment
        await client.query(`
          UPDATE users
          SET team_id = $1, department = $2
          WHERE id = $3
        `, [teamId, member.domain.toUpperCase().split('/')[0], user.id]);

        console.log(`  ✅ ${user.name} → ${member.domain} (Team ID: ${teamId})`);
      }
    }

    // Verify final state
    console.log('\n\n=== VERIFICATION ===\n');
    
    for (const [tlName, members] of Object.entries(teamStructure)) {
      const tlId = tlMap[tlName];
      
      const teamMembers = await client.query(`
        SELECT u.id, u.name, u.department, t.name as team_name
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        WHERE t.tl_id = $1 AND u.role = 'employee'
        ORDER BY u.name
      `, [tlId]);

      console.log(`${tlName}: ${teamMembers.rows.length} members`);
      teamMembers.rows.forEach(m => {
        console.log(`  - ${m.name} (${m.team_name})`);
      });
      console.log('');
    }

    console.log('✅ All team assignments updated successfully!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

updateTeamsFromTable();
