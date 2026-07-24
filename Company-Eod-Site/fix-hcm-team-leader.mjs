import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function fixHCMTeamLeader() {
  try {
    await client.connect();
    
    // Get Soubhagya's ID
    const soubhagya = await client.query(`
      SELECT id FROM users WHERE name = 'Soubhagya M Bhat' AND role = 'tl'
    `);
    
    if (soubhagya.rows.length === 0) {
      console.log('Soubhagya not found!');
      return;
    }
    
    const soubhagyaId = soubhagya.rows[0].id;
    console.log(`Soubhagya ID: ${soubhagyaId}`);

    // Update HCM team to have Soubhagya as TL
    await client.query(`
      UPDATE teams
      SET tl_id = $1
      WHERE name = 'HCM'
    `, [soubhagyaId]);
    
    console.log('✅ Updated HCM team leader to Soubhagya');

    // Verify
    const hcmTeam = await client.query(`
      SELECT t.id, t.name, t.tl_id, u.name as tl_name
      FROM teams t
      LEFT JOIN users u ON t.tl_id = u.id
      WHERE t.name = 'HCM'
    `);
    
    console.log('\nHCM Team Info:', hcmTeam.rows[0]);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

fixHCMTeamLeader();
