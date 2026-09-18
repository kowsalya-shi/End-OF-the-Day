import pg from "pg";
import dotenv from "dotenv";
const { Pool } = pg;

dotenv.config();

console.log('\n📬 Complete Notification System Test\n');
console.log('=' .repeat(70));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testAllNotifications() {
  try {
    console.log('\n🔍 Checking ALL notification types in the system...\n');

    // Get all notifications grouped by type
    const notificationsResult = await pool.query(`
      SELECT 
        type,
        COUNT(*) as count,
        MAX(created_at) as latest_created
      FROM portal_notifications
      GROUP BY type
      ORDER BY count DESC
    `);

    console.log('📊 Current Notifications in Database:\n');
    
    if (notificationsResult.rows.length === 0) {
      console.log('   ℹ️  No notifications found in database.\n');
    } else {
      console.log('   Type                              Count    Latest Created');
      console.log('   ' + '-'.repeat(66));
      
      notificationsResult.rows.forEach(row => {
        const typeDisplay = row.type.padEnd(35);
        const countDisplay = String(row.count).padStart(5);
        const dateDisplay = row.latest_created ? 
          new Date(row.latest_created).toISOString().split('T')[0] : 'N/A';
        console.log(`   ${typeDisplay} ${countDisplay}    ${dateDisplay}`);
      });
      console.log();
    }

    // Get detailed breakdown of recent notifications
    console.log('\n📋 Recent Notifications (Last 20):\n');
    
    const recentResult = await pool.query(`
      SELECT 
        n.id,
        n.type,
        n.title,
        LEFT(n.message, 50) as message_preview,
        u.name as recipient_name,
        u.role as recipient_role,
        n.created_at
      FROM portal_notifications n
      LEFT JOIN users u ON n.recipient_user_id = u.id
      ORDER BY n.created_at DESC
      LIMIT 20
    `);

    if (recentResult.rows.length === 0) {
      console.log('   ℹ️  No recent notifications.\n');
    } else {
      recentResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.title}`);
        console.log(`      Type: ${row.type}`);
        console.log(`      Recipient: ${row.recipient_name} (${row.recipient_role})`);
        console.log(`      Message: ${row.message_preview}...`);
        console.log(`      Created: ${new Date(row.created_at).toLocaleString()}`);
        console.log();
      });
    }

    // Check for ageing task notifications specifically
    console.log('\n🔴 Ageing Task Notifications:\n');
    
    const ageingResult = await pool.query(`
      SELECT 
        n.*,
        u.name as recipient_name,
        t.task_name,
        t.status,
        t.planned_start_date,
        t.created_at as task_created
      FROM portal_notifications n
      LEFT JOIN users u ON n.recipient_user_id = u.id
      LEFT JOIN internal_tasks t ON n.related_task_id = t.id
      WHERE n.type LIKE 'ageing_task_%'
      ORDER BY n.created_at DESC
    `);

    if (ageingResult.rows.length === 0) {
      console.log('   ℹ️  No ageing task notifications found.');
      console.log('   📌 This means no tasks have been in YTS/WIP/Holding for 5+ days yet.\n');
    } else {
      ageingResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. Task: ${row.task_name}`);
        console.log(`      Recipient: ${row.recipient_name}`);
        console.log(`      Status: ${row.status}`);
        console.log(`      Message: ${row.message}`);
        console.log(`      Created: ${new Date(row.created_at).toLocaleString()}`);
        console.log();
      });
    }

    // Check what tasks COULD become ageing
    console.log('\n⏰ Tasks Close to Ageing (2-4 days old):\n');
    
    const targetDate = '2026-09-08';
    const tasksResult = await pool.query(`
      SELECT 
        t.id,
        t.task_name,
        t.status,
        t.planned_start_date,
        t.actual_start_date,
        t.created_at,
        u.name as employee_name,
        tm.name as team_name
      FROM internal_tasks t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      WHERE t.status IN ('yts', 'wip', 'holding')
      ORDER BY t.created_at
    `);

    if (tasksResult.rows.length === 0) {
      console.log('   ℹ️  No tasks in YTS/WIP/Holding status.\n');
    } else {
      const closeToAgeing = [];
      
      for (const task of tasksResult.rows) {
        let startDate = null;
        
        if (task.status === 'wip' && task.actual_start_date) {
          startDate = task.actual_start_date;
        } else if (task.status === 'yts' && task.planned_start_date) {
          startDate = task.planned_start_date;
        } else if (task.created_at) {
          startDate = task.created_at.toISOString().split('T')[0];
        }

        if (startDate) {
          const ageMs = Date.parse(`${targetDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
          const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
          
          if (ageDays >= 2 && ageDays < 5) {
            closeToAgeing.push({ ...task, ageDays, startDate });
          }
        }
      }

      if (closeToAgeing.length === 0) {
        console.log('   ℹ️  No tasks are 2-4 days old.\n');
      } else {
        closeToAgeing.forEach((task, idx) => {
          console.log(`   ${idx + 1}. ${task.task_name}`);
          console.log(`      Employee: ${task.employee_name}`);
          console.log(`      Team: ${task.team_name}`);
          console.log(`      Status: ${task.status.toUpperCase()}`);
          console.log(`      Age: ${task.ageDays} days (needs ${5 - task.ageDays} more days to be ageing)`);
          console.log();
        });
      }
    }

    // Summary of notification types that SHOULD exist
    console.log('\n📌 Expected Notification Types:\n');
    console.log('   1. missing_eod          - When someone doesn\'t submit EOD');
    console.log('   2. missing_eod_escalation - When 3+ EODs missed in 30 days');
    console.log('   3. overdue_task_*       - When task past deadline for 7+ days');
    console.log('   4. overdue_daily_work_* - When daily work past deadline for 7+ days');
    console.log('   5. overdue_training_*   - When training past deadline for 7+ days');
    console.log('   6. task_assigned_*      - When task assigned to user');
    console.log('   7. task_accepted_*      - When user accepts task');
    console.log('   8. task_declined_*      - When user declines task');
    console.log('   9. ageing_task_*        - When task in YTS/WIP/Holding for 5+ days');
    console.log('   10. deleted_*           - When records are deleted');
    console.log();

    console.log('=' .repeat(70));
    console.log('\n✅ Test completed!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testAllNotifications();
