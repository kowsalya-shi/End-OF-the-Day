import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function fixHCMAndDuplicates() {
  try {
    await client.connect();
    
    // 1. Get Soubhagya's ID
    const soubhagya = await client.query(`
      SELECT id FROM users WHERE name = 'Soubhagya M Bhat' AND role = 'tl'
    `);
    
    if (soubhagya.rows.length === 0) {
      console.log('Soubhagya not found!');
      return;
    }
    
    const soubhagyaId = soubhagya.rows[0].id;
    console.log(`Soubhagya ID: ${soubhagyaId}`);

    // 2. Get HCM team ID
    const hcmTeam = await client.query(`
      SELECT id FROM teams WHERE name = 'HCM'
    `);
    
    if (hcmTeam.rows.length === 0) {
      console.log('HCM team not found!');
      return;
    }
    
    const hcmTeamId = hcmTeam.rows[0].id;
    console.log(`HCM Team ID: ${hcmTeamId}`);

    // 3. Update HCM team to have Soubhagya as TL
    await client.query(`
      UPDATE teams
      SET tl_id = $1
      WHERE id = $2
    `, [soubhagyaId, hcmTeamId]);
    
    console.log('✅ Updated HCM team leader to Soubhagya');

    // 4. Find duplicate Vishal Koni entries
    const vishalDuplicates = await client.query(`
      SELECT id, name, email, team_id
      FROM users
      WHERE UPPER(name) LIKE '%VISHAL%KONI%'
      ORDER BY id
    `);

    console.log('\nVishal Koni entries found:', vishalDuplicates.rows.length);
    vishalDuplicates.rows.forEach(v => {
      console.log(`  ID: ${v.id}, Name: "${v.name}", Email: ${v.email}, Team: ${v.team_id}`);
    });

    // 5. Keep the one with lowercase name and proper email, delete the duplicate uppercase one
    if (vishalDuplicates.rows.length > 1) {
      // Find the correct one (with proper email)
      const correctVishal = vishalDuplicates.rows.find(v => v.email === 'vishal.koni@arraafi.com');
      const duplicateVishal = vishalDuplicates.rows.find(v => v.email !== 'vishal.koni@arraafi.com');
      
      if (duplicateVishal) {
        await client.query(`DELETE FROM users WHERE id = $1`, [duplicateVishal.id]);
        console.log(`✅ Deleted duplicate Vishal Koni (ID: ${duplicateVishal.id})`);
      }

      // Update the correct Vishal Koni to be in FICO team (team 1) under Soubhagya
      if (correctVishal) {
        await client.query(`
          UPDATE users
          SET team_id = 1, department = 'FICO'
          WHERE id = $1
        `, [correctVishal.id]);
        console.log(`✅ Updated Vishal Koni to FICO team`);
      }
    }

    // 6. Update Altaf Hussain to be in FICO team
    await client.query(`
      UPDATE users
      SET team_id = 1, department = 'FICO'
      WHERE name = 'Altaf Hussain'
    `);
    console.log('✅ Updated Altaf Hussain to FICO team');

    // 7. Verify final state
    console.log('\n\n=== FINAL STATE ===');
    
    const ficoTeam = await client.query(`
      SELECT u.id, u.name, u.email, u.role, u.department
      FROM users u
      WHERE u.team_id = 1
      ORDER BY u.role DESC, u.name
    `);
    
    console.log('\nFICO Team (Soubhagya):');
    ficoTeam.rows.forEach(m => {
      console.log(`  - ${m.name} (${m.role})`);
    });

    const rajTeams = await client.query(`
      SELECT t.id, t.name,
             (SELECT COUNT(*) FROM users WHERE team_id = t.id AND role = 'employee') as member_count
      FROM teams t
      WHERE t.tl_id = (SELECT id FROM users WHERE name = 'Rajshekar Swamy')
      ORDER BY t.name
    `);
    
    console.log('\nRajshekar Teams:');
    for (const team of rajTeams.rows) {
      console.log(`  - ${team.name}: ${team.member_count} members`);
      
      const members = await client.query(`
        SELECT name, role
        FROM users
        WHERE team_id = $1 AND role = 'employee'
        ORDER BY name
      `, [team.id]);
      
      members.rows.forEach(m => console.log(`    • ${m.name}`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixHCMAndDuplicates();
