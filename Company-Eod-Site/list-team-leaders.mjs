import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function listTeamLeaders() {
  try {
    await client.connect();
    
    const tls = await client.query(`
      SELECT id, name, email, role
      FROM users
      WHERE role = 'tl'
      ORDER BY name
    `);
    
    console.log('Team Leaders in database:');
    tls.rows.forEach(tl => {
      console.log(`  ID: ${tl.id}, Name: "${tl.name}", Email: ${tl.email}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

listTeamLeaders();
