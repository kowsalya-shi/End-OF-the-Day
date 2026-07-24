import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function testManagerAssignment() {
  console.log('\n=== TESTING MANAGER TASK ASSIGNMENT ===\n');

  try {
    // Get a sample employee
    const employeeResult = await pool.query(`
      SELECT id, name, email, team_id
      FROM users
      WHERE role = 'employee'
      LIMIT 1
    `);

    if (employeeResult.rows.length === 0) {
      console.log('❌ No employees found');
      return;
    }

    const employee = employeeResult.rows[0];
    console.log('📝 Test Employee:');
    console.log(`   Name: ${employee.name}`);
    console.log(`   ID: ${employee.id}`);
    console.log(`   Team ID: ${employee.team_id}`);
    console.log('');

    // Create a test task assigned by Manager
    const taskResult = await pool.query(`
      INSERT INTO internal_tasks (
        task_name,
        status,
        priority,
        assigned_by,
        user_id,
        team_id,
        planned_start_date,
        planned_end_date
      ) VALUES (
        'TEST TASK FROM MANAGER',
        'yts',
        'high',
        'Manager Test',
        $1,
        $2,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '7 days'
      ) RETURNING *
    `, [employee.id, employee.team_id]);

    console.log('✅ Test task created:');
    console.log(`   Task ID: ${taskResult.rows[0].id}`);
    console.log(`   Task Name: ${taskResult.rows[0].task_name}`);
    console.log(`   Assigned To User ID: ${taskResult.rows[0].user_id}`);
    console.log(`   Team ID: ${taskResult.rows[0].team_id}`);
    console.log('');

    // Now check if employee can see it
    const employeeTasksResult = await pool.query(`
      SELECT 
        t.id,
        t.task_name,
        t.status,
        t.priority,
        t.assigned_by,
        t.user_id,
        t.team_id,
        u.name as user_name
      FROM internal_tasks t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.user_id = $1
      ORDER BY t.id DESC
    `, [employee.id]);

    console.log(`📊 Tasks visible to ${employee.name} (user_id=${employee.id}):`);
    console.log(`   Total tasks: ${employeeTasksResult.rows.length}\n`);

    if (employeeTasksResult.rows.length === 0) {
      console.log('❌ PROBLEM: Employee has no tasks visible!');
    } else {
      employeeTasksResult.rows.forEach((task, idx) => {
        console.log(`${idx + 1}. ${task.task_name}`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Assigned By: ${task.assigned_by || 'N/A'}`);
        console.log(`   User ID: ${task.user_id}`);
        console.log('');
      });
      console.log('✅ SUCCESS: Employee can see the tasks!');
    }

    // Clean up test task
    await pool.query(`DELETE FROM internal_tasks WHERE id = $1`, [taskResult.rows[0].id]);
    console.log('\n🧹 Test task cleaned up\n');

    // Show the API query that employee portal uses
    console.log('📡 Employee Portal API Call:');
    console.log(`   GET /tasks?userId=${employee.id}`);
    console.log('');
    console.log('💡 This should return all tasks where user_id = ' + employee.id);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testManagerAssignment();
