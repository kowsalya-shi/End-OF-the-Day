import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function cleanupTestTasks() {
  console.log('\n=== CLEANING UP TEST TASKS ===\n');

  try {
    // Show current tasks
    const beforeResult = await pool.query(`
      SELECT id, task_name, assigned_by
      FROM internal_tasks
      ORDER BY id DESC
    `);

    console.log(`📋 Current tasks in database: ${beforeResult.rows.length}\n`);
    
    if (beforeResult.rows.length === 0) {
      console.log('✅ No tasks to clean up\n');
      return;
    }

    beforeResult.rows.forEach((task, idx) => {
      console.log(`${idx + 1}. ${task.task_name}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Assigned By: ${task.assigned_by || 'N/A'}`);
      console.log('');
    });

    // Delete test tasks (tasks with "test" in name or assigned_by)
    const deleteResult = await pool.query(`
      DELETE FROM internal_tasks
      WHERE 
        LOWER(task_name) LIKE '%test%' 
        OR LOWER(assigned_by) LIKE '%test%'
        OR LOWER(task_name) LIKE '%api%'
      RETURNING id, task_name
    `);

    if (deleteResult.rows.length > 0) {
      console.log(`🗑️  Deleted ${deleteResult.rows.length} test task(s):\n`);
      deleteResult.rows.forEach((task, idx) => {
        console.log(`${idx + 1}. ${task.task_name} (ID: ${task.id})`);
      });
      console.log('');
    } else {
      console.log('ℹ️  No test tasks found to delete\n');
    }

    // Show remaining tasks
    const afterResult = await pool.query(`
      SELECT 
        t.id,
        t.task_name,
        t.assigned_by,
        u.name as assigned_to_name
      FROM internal_tasks t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.id DESC
    `);

    console.log(`✅ Remaining tasks: ${afterResult.rows.length}\n`);
    
    if (afterResult.rows.length > 0) {
      afterResult.rows.forEach((task, idx) => {
        console.log(`${idx + 1}. ${task.task_name}`);
        console.log(`   Assigned To: ${task.assigned_to_name || 'Unassigned'}`);
        console.log(`   Assigned By: ${task.assigned_by || 'N/A'}`);
        console.log('');
      });
    }

    console.log('=== CLEANUP COMPLETE ===\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupTestTasks();
