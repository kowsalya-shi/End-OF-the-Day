import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "eod_db",
  user: "postgres",
  password: "Shiny@08",
});

async function checkUsers() {
  try {
    const tlResult = await pool.query("SELECT id, name, role, team_id FROM users WHERE role IN ('tl', 'manager') ORDER BY role, name");
    const empResult = await pool.query("SELECT id, name, role, team_id FROM users WHERE role = 'employee' ORDER BY name LIMIT 20");
    
    console.log("\n📋 Users in Database:\n");
    console.log("TLs/Managers:");
    tlResult.rows.forEach(r => {
      console.log(`  ${r.id}: ${r.name} (${r.role}, Team: ${r.team_id})`);
    });
    
    console.log("\nEmployees:");
    empResult.rows.forEach(r => {
      console.log(`  ${r.id}: ${r.name} (Team: ${r.team_id})`);
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
