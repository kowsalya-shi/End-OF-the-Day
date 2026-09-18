import pg from "pg";
import dotenv from "dotenv";
const { Pool } = pg;

dotenv.config();

console.log('\n🧪 Testing Ageing Task Notification System\n');
console.log('=' .repeat(60));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testAgeingTasks() {
  try {
    const targetDate = '2026-09-08';
    const ageingThreshold = 5; // days

    console.log(`\n📅 Checking for ageing tasks as of: ${targetDate}\n`);
    console.log(`⏰ Ageing threshold: ${ageingThreshold} days\n`);

    // Get tasks in YTS, WIP, or Holding status
    const tasksResult = await pool.query(`
      SELECT 
        t.id,
        t.task_name,
        t.status,
        t.planned_start_date,
        t.actual_start_date,
        t.created_at,
        t.user_id,
        t.team_id,
        u.name as employee_name,
        tm.name as team_name
      FROM internal_tasks t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      WHERE t.status IN ('yts', 'wip', 'holding')
      ORDER BY t.status, t.created_at
    `);

    const tasks = tasksResult.rows;

    console.log(`📊 Total tasks in YTS/WIP/Holding: ${tasks.length}\n`);

    if (tasks.length === 0) {
      console.log('ℹ️  No tasks found in YTS, WIP, or Holding status.');
      console.log('   Create some test tasks to see ageing notifications!\n');
      return;
    }

    const ageingTasks = [];

    for (const task of tasks) {
      let startDate = null;

      if (task.status === 'wip' && task.actual_start_date) {
        startDate = task.actual_start_date;
      } else if (task.status === 'yts' && task.planned_start_date) {
        startDate = task.planned_start_date;
      } else if (task.created_at) {
        startDate = task.created_at.toISOString().split('T')[0];
      }

      if (!startDate) continue;

      const ageMs = Date.parse(`${targetDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

      const taskInfo = {
        ...task,
        startDate,
        ageDays,
        isAgeing: ageDays >= ageingThreshold
      };

      if (taskInfo.isAgeing) {
        ageingTasks.push(taskInfo);
      }
    }

    console.log(`🔴 Ageing tasks found: ${ageingTasks.length}\n`);

    if (ageingTasks.length === 0) {
      console.log('✅ No ageing tasks! All tasks are within the 5-day threshold.\n');
    } else {
      console.log('📋 Ageing Task Details:\n');
      
      for (const task of ageingTasks.slice(0, 10)) {
        console.log(`   Task: ${task.task_name}`);
        console.log(`   Status: ${task.status.toUpperCase()}`);
        console.log(`   Employee: ${task.employee_name}`);
        console.log(`   Team: ${task.team_name}`);
        console.log(`   Started: ${task.startDate}`);
        console.log(`   Age: ${task.ageDays} days ⚠️`);
        
        // Get TL info
        const teamResult = await pool.query(`
          SELECT u.name as tl_name
          FROM teams t
          LEFT JOIN users u ON t.tl_id = u.id
          WHERE t.id = $1
        `, [task.team_id]);

        if (teamResult.rows[0]?.tl_name) {
          console.log(`   TL: ${teamResult.rows[0].tl_name}`);
        }
        
        console.log('\n   📬 Notifications will be sent to:');
        console.log(`      ├─ ${task.employee_name} (Task owner)`);
        if (teamResult.rows[0]?.tl_name) {
          console.log(`      ├─ ${teamResult.rows[0].tl_name} (Team Lead)`);
        }
        console.log(`      ├─ Waseem (IT Manager)`);
        console.log(`      ├─ Asim (Manager)`);
        console.log(`      └─ Thaseena (CEO)`);
        console.log();
      }

      if (ageingTasks.length > 10) {
        console.log(`   ... and ${ageingTasks.length - 10} more ageing tasks\n`);
      }
    }

    // Check existing notifications
    const notificationsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM portal_notifications
      WHERE type LIKE 'ageing_task_%'
    `);

    console.log(`📊 Existing ageing notifications in database: ${notificationsResult.rows[0].count}\n`);

    console.log('=' .repeat(60));
    console.log('\n✅ Test completed successfully!\n');

    console.log('🔧 To manually trigger ageing task check:\n');
    console.log('   POST http://localhost:8080/api/notifications/check-ageing-tasks');
    console.log('   Body: { "date": "2026-09-08" }\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testAgeingTasks();
