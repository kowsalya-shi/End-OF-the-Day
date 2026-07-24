import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function addHCMTeam() {
  try {
    await client.connect();
    console.log('Connected to database');

    // First, get SOUBHGYA's id (Team Leader)
    const tlResult = await client.query(
      "SELECT id FROM users WHERE name = 'Soubhagya M Bhat' AND role = 'tl'"
    );
    
    if (tlResult.rows.length === 0) {
      console.error('Team Leader SOUBHGYA not found!');
      return;
    }
    
    const tlId = tlResult.rows[0].id;
    console.log(`Found Team Leader SOUBHGYA with id: ${tlId}`);

    // Check if HCM team already exists
    const existingTeam = await client.query(
      "SELECT id FROM teams WHERE name = 'HCM'"
    );

    let hcmTeamId;
    
    if (existingTeam.rows.length > 0) {
      hcmTeamId = existingTeam.rows[0].id;
      console.log(`HCM team already exists with id: ${hcmTeamId}`);
    } else {
      // Create HCM team
      const teamResult = await client.query(
        "INSERT INTO teams (name, tl_id, created_at) VALUES ($1, $2, NOW()) RETURNING id",
        ['HCM', tlId]
      );
      hcmTeamId = teamResult.rows[0].id;
      console.log(`✅ Created HCM team with id: ${hcmTeamId}`);
    }

    // Add Vishal Koni
    const vishalExists = await client.query(
      "SELECT id FROM users WHERE name = 'Vishal Koni'"
    );

    if (vishalExists.rows.length === 0) {
      await client.query(
        "INSERT INTO users (email, password_hash, name, role, team_id, department, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
        ['vishal.koni@arraafi.com', '$2b$10$8ZqC5H5vT8Wz6yF5rE9hKOXJ7mF5qK8vR9xP3jN2sL6tM4wU7yH8e', 'Vishal Koni', 'employee', hcmTeamId, 'HCM']
      );
      console.log('✅ Added employee: Vishal Koni (HCM)');
    } else {
      // Update team_id and department if exists
      await client.query(
        "UPDATE users SET team_id = $1, department = $2 WHERE name = 'Vishal Koni'",
        [hcmTeamId, 'HCM']
      );
      console.log('✅ Updated Vishal Koni team to HCM');
    }

    // Add Altaf Hussain
    const altafExists = await client.query(
      "SELECT id FROM users WHERE name = 'Altaf Hussain'"
    );

    if (altafExists.rows.length === 0) {
      await client.query(
        "INSERT INTO users (email, password_hash, name, role, team_id, department, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
        ['altaf.hussain@arraafi.com', '$2b$10$8ZqC5H5vT8Wz6yF5rE9hKOXJ7mF5qK8vR9xP3jN2sL6tM4wU7yH8e', 'Altaf Hussain', 'employee', hcmTeamId, 'HCM']
      );
      console.log('✅ Added employee: Altaf Hussain (HCM)');
    } else {
      // Update team_id and department if exists
      await client.query(
        "UPDATE users SET team_id = $1, department = $2 WHERE name = 'Altaf Hussain'",
        [hcmTeamId, 'HCM']
      );
      console.log('✅ Updated Altaf Hussain team to HCM');
    }

    // Verify the setup
    console.log('\n📊 Verification:');
    const hcmTeamInfo = await client.query(`
      SELECT t.id, t.name as team_name, tl.name as team_leader,
             (SELECT COUNT(*) FROM users WHERE team_id = t.id AND role = 'employee') as member_count
      FROM teams t
      LEFT JOIN users tl ON t.tl_id = tl.id
      WHERE t.name = 'HCM'
    `);
    
    console.log('HCM Team Info:', hcmTeamInfo.rows[0]);

    const hcmMembers = await client.query(`
      SELECT id, name, email, role, department
      FROM users
      WHERE team_id = $1
      ORDER BY role, name
    `, [hcmTeamId]);

    console.log('\n👥 HCM Team Members:');
    hcmMembers.rows.forEach(member => {
      console.log(`  - ${member.name} (${member.role}) - ${member.email} - ${member.department}`);
    });

    console.log('\n✅ HCM team setup complete!');
    console.log('Note: Both employees passwords are: emp123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

addHCMTeam();
