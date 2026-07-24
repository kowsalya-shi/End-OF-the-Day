import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Shiny@08@localhost:5432/eod_db'
});

async function checkTeams() {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.department,
        u.team_id,
        t.name as team_name, 
        tl.name as team_leader
      FROM users u 
      LEFT JOIN teams t ON u.team_id = t.id 
      LEFT JOIN users tl ON t.tl_id = tl.id 
      WHERE u.role IN ('employee', 'tl') 
      ORDER BY t.name, u.role DESC, u.name
    `);

    console.log('\n========== CURRENT TEAM STRUCTURE ==========\n');
    
    let currentTeam = null;
    result.rows.forEach(row => {
      if (row.team_name !== currentTeam) {
        currentTeam = row.team_name;
        console.log(`\n📁 TEAM: ${row.team_name || 'NO TEAM'}`);
        if (row.team_leader) {
          console.log(`   👤 Team Leader: ${row.team_leader}`);
        }
        console.log('   Members:');
      }
      
      const roleIcon = row.role === 'tl' ? '👨‍💼' : '👤';
      console.log(`      ${roleIcon} ${row.name} (${row.email}) - ${row.department || 'No Dept'}`);
    });

    console.log('\n============================================\n');

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkTeams();
