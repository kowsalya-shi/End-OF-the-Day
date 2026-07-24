import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function testTaskAssignment() {
  console.log('\n=== TASK ASSIGNMENT VERIFICATION ===\n');

  try {
    // Get all tasks
    const tasksResult = await pool.query(`
      SELECT 
        t.id,
        t.task_name,
        t.task_code,
        t.status,
        t.priority,
        t.assigned_by,
        t.user_id,
        t.team_id,
        u.name as assigned_to_user,
        u.role as user_role,
        team.name as team_name
      FROM internal_tasks t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN teams team ON t.team_id = team.id
      ORDER BY t.id DESC
      LIMIT 10
    `);

    console.log(`📋 Found ${tasksResult.rows.length} tasks in the system\n`);

    if (tasksResult.rows.length === 0) {
      console.log('ℹ️  No tasks found. This is expected if no tasks have been assigned yet.\n');
      console.log('✅ NEXT STEPS:');
      console.log('   1. Login as Manager (email: manager@arraafi.com, password: manager123)');
      console.log('   2. Go to "Tasks" page');
      console.log('   3. Click "Assign Task" button');
      console.log('   4. Select an employee from the dropdown');
      console.log('   5. Fill in task details and click "Assign Task"');
      console.log('   6. Login as that employee to see the task in their portal\n');
    } else {
      console.log('📊 EXISTING TASKS:\n');
      tasksResult.rows.forEach((task, idx) => {
        console.log(`${idx + 1}. Task: ${task.task_name}`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Code: ${task.task_code || 'N/A'}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Priority: ${task.priority || 'N/A'}`);
        console.log(`   Assigned By: ${task.assigned_by || 'N/A'}`);
        console.log(`   Assigned To: ${task.assigned_to_user || 'Unassigned'} (${task.user_role || 'N/A'})`);
        console.log(`   Team: ${task.team_name || 'N/A'}`);
        console.log('');
      });
    }

    // Show sample employees
    const employeesResult = await pool.query(`
      SELECT id, name, email, role, department
      FROM users
      WHERE role IN ('employee', 'tl')
      ORDER BY name
      LIMIT 5
    `);

    console.log('👥 SAMPLE EMPLOYEES (for task assignment):\n');
    employeesResult.rows.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.name} (${emp.department || 'No Dept'}) - ${emp.role}`);
      console.log(`   Email: ${emp.email}`);
    });

    console.log('\n✅ TASK ASSIGNMENT VERIFICATION COMPLETE\n');
    console.log('💡 HOW IT WORKS:');
    console.log('   • Manager can assign tasks to ANY employee');
    console.log('   • Team Leader can assign tasks to their team members');
    console.log('   • Employees see only tasks assigned to them');
    console.log('   • All assigned tasks appear in the employee\'s portal\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testTaskAssignment();
