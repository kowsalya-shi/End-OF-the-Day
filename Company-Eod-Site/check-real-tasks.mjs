import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function checkRealTasks() {
  console.log('\n=== CHECKING REAL TASK ASSIGNMENTS ===\n');

  try {
    // Show all tasks
    const allTasksResult = await pool.query(`
      SELECT 
        t.id,
        t.task_name,
        t.status,
        t.assigned_by,
        t.user_id,
        t.team_id,
        u.name as assigned_to_name,
        u.email as assigned_to_email,
        team.name as team_name
      FROM internal_tasks t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN teams team ON t.team_id = team.id
      ORDER BY t.id DESC
    `);

    console.log(`📋 ALL TASKS IN DATABASE: ${allTasksResult.rows.length}\n`);

    if (allTasksResult.rows.length === 0) {
      console.log('ℹ️  No tasks found. Please assign a task from Manager portal first.\n');
    } else {
      allTasksResult.rows.forEach((task, idx) => {
        console.log(`${idx + 1}. ${task.task_name}`);
        console.log(`   Task ID: ${task.id}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Assigned By: ${task.assigned_by || 'N/A'}`);
        console.log(`   Assigned To: ${task.assigned_to_name || 'Unassigned'} (user_id: ${task.user_id || 'null'})`);
        console.log(`   Email: ${task.assigned_to_email || 'N/A'}`);
        console.log(`   Team: ${task.team_name || 'N/A'} (team_id: ${task.team_id || 'null'})`);
        console.log('');
      });
    }

    // Check specific employee
    console.log('---\n');
    console.log('🔍 CHECKING SPECIFIC EMPLOYEE:\n');
    
    const employeeResult = await pool.query(`
      SELECT id, name, email, role, team_id
      FROM users
      WHERE email = 'amita@arraafiinfotech.com'
    `);

    if (employeeResult.rows.length > 0) {
      const emp = employeeResult.rows[0];
      console.log(`Employee: ${emp.name}`);
      console.log(`Email: ${emp.email}`);
      console.log(`User ID: ${emp.id}`);
      console.log(`Team ID: ${emp.team_id}`);
      console.log('');

      const tasksResult = await pool.query(`
        SELECT 
          t.id,
          t.task_name,
          t.status,
          t.assigned_by,
          t.user_id
        FROM internal_tasks t
        WHERE t.user_id = $1
        ORDER BY t.id DESC
      `, [emp.id]);

      console.log(`Tasks assigned to ${emp.name}: ${tasksResult.rows.length}\n`);
      
      if (tasksResult.rows.length === 0) {
        console.log('❌ No tasks found for this employee');
        console.log('');
        console.log('💡 TO TEST:');
        console.log('   1. Login as Manager (manager@arraafi.com / manager123)');
        console.log('   2. Go to Tasks page');
        console.log('   3. Click "Assign Task"');
        console.log(`   4. Select "${emp.name} (${emp.department || 'EWM'})"`);
        console.log('   5. Fill in task details and click "Assign Task"');
        console.log('   6. Run this script again to verify');
      } else {
        tasksResult.rows.forEach((task, idx) => {
          console.log(`${idx + 1}. ${task.task_name}`);
          console.log(`   Status: ${task.status}`);
          console.log(`   Assigned By: ${task.assigned_by || 'N/A'}`);
          console.log('');
        });
        console.log('✅ Employee can see these tasks!');
      }
    }

    console.log('\n=== CHECK COMPLETE ===\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRealTasks();
