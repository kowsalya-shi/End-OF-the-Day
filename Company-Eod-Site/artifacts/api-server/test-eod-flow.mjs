import pg from "pg";
import dotenv from "dotenv";
const { Pool } = pg;

dotenv.config();

console.log('\n🧪 Testing EOD Notification Flow\n');
console.log('=' .repeat(60));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testEODFlow() {
  try {
    const targetDate = '2026-09-07';
    
    console.log(`\n📅 Checking missing EODs for: ${targetDate}\n`);

    // Get all users
    const allUsersResult = await pool.query('SELECT id, name, email, role, team_id FROM users ORDER BY role, name');
    const allUsers = allUsersResult.rows;

    console.log(`📊 Total users in system: ${allUsers.length}\n`);

    // Get users who submitted EOD
    const submittedResult = await pool.query(
      'SELECT user_id FROM eod_submissions WHERE date = $1',
      [targetDate]
    );
    const submittedIds = new Set(submittedResult.rows.map(r => r.user_id));

    console.log(`✅ Users who submitted EOD: ${submittedIds.size}`);
    console.log(`❌ Users who DID NOT submit EOD: ${allUsers.length - submittedIds.size}\n`);

    // Group users without EOD by role
    const usersWithoutEOD = allUsers.filter(u => !submittedIds.has(u.id));
    
    const byRole = {
      employee: [],
      tl: [],
      it_manager: [],
      manager: [],
      ceo: []
    };

    usersWithoutEOD.forEach(user => {
      if (byRole[user.role]) {
        byRole[user.role].push(user);
      }
    });

    console.log('📋 Missing EOD by Role:\n');
    console.log(`   👥 Employees: ${byRole.employee.length}`);
    console.log(`   👔 Team Leads: ${byRole.tl.length}`);
    console.log(`   💻 IT Manager: ${byRole.it_manager.length}`);
    console.log(`   📊 Manager: ${byRole.manager.length}`);
    console.log(`   👑 CEO: ${byRole.ceo.length}\n`);

    // Show who would receive emails
    console.log('📧 Email Notification Recipients:\n');

    for (const employee of byRole.employee.slice(0, 3)) { // Show first 3
      // Get team info
      const teamResult = await pool.query(
        'SELECT t.name, t.tl_id, u.name as tl_name FROM teams t LEFT JOIN users u ON t.tl_id = u.id WHERE t.id = $1',
        [employee.team_id]
      );
      const team = teamResult.rows[0];

      console.log(`   Employee: ${employee.name}`);
      if (team) {
        console.log(`      Team: ${team.name}`);
        console.log(`      📧 Email to:`);
        console.log(`         ├─ ${team.tl_name || 'No TL'} (Team Lead)`);
        console.log(`         ├─ Waseem (IT Manager)`);
        console.log(`         ├─ Asim (Manager)`);
        console.log(`         └─ Thaseena (CEO)`);
      }
      console.log();
    }

    if (byRole.tl.length > 0) {
      const tl = byRole.tl[0]; // Show first TL
      console.log(`   Team Lead: ${tl.name}`);
      console.log(`      📧 Email to:`);
      console.log(`         ├─ Waseem (IT Manager)`);
      console.log(`         ├─ Asim (Manager)`);
      console.log(`         └─ Thaseena (CEO)`);
      console.log();
    }

    if (byRole.it_manager.length > 0) {
      console.log(`   IT Manager: ${byRole.it_manager[0].name}`);
      console.log(`      📧 Email to:`);
      console.log(`         ├─ Asim (Manager)`);
      console.log(`         └─ Thaseena (CEO)`);
      console.log();
    }

    if (byRole.manager.length > 0) {
      console.log(`   Manager: ${byRole.manager[0].name}`);
      console.log(`      📧 Email to:`);
      console.log(`         └─ Thaseena (CEO)`);
      console.log();
    }

    if (byRole.ceo.length > 0) {
      console.log(`   CEO: ${byRole.ceo[0].name}`);
      console.log(`      📧 No higher-level escalation`);
      console.log();
    }

    // Check 3-day escalation eligibility
    console.log('⚠️  3-Day Escalation Check:\n');
    
    for (const employee of byRole.employee.slice(0, 2)) {
      const dates = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(targetDate);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }

      const submissionsResult = await pool.query(
        'SELECT date FROM eod_submissions WHERE user_id = $1 AND date = ANY($2::date[])',
        [employee.id, dates]
      );

      const submittedDates = new Set(submissionsResult.rows.map(r => r.date));
      const missedDates = dates.filter(d => !submittedDates.has(d));
      const missedCount = missedDates.length;

      console.log(`   Employee: ${employee.name}`);
      console.log(`      Missed EODs in last 30 days: ${missedCount}`);
      
      if (missedCount >= 3) {
        console.log(`      ⚠️  ESCALATION TRIGGERED!`);
        console.log(`      Recent missed dates: ${missedDates.slice(0, 5).join(', ')}`);
      } else {
        console.log(`      ✅ No escalation (need 3+ missed days)`);
      }
      console.log();
    }

    console.log('=' .repeat(60));
    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testEODFlow();
