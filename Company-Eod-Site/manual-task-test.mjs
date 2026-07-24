import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function manualTaskTest() {
  console.log('\n=== MANUAL TASK ASSIGNMENT TEST ===\n');

  try {
    // Get Amita's details
    const amitaResult = await pool.query(`
      SELECT id, name, email, team_id, department
      FROM users
      WHERE email = 'amita@arraafiinfotech.com'
    `);

    if (amitaResult.rows.length === 0) {
      console.log('❌ Amita not found');
      return;
    }

    const amita = amitaResult.rows[0];
    console.log('👤 Employee Details:');
    console.log(`   Name: ${amita.name}`);
    console.log(`   Email: ${amita.email}`);
    console.log(`   User ID: ${amita.id}`);
    console.log(`   Team ID: ${amita.team_id}`);
    console.log(`   Department: ${amita.department}`);
    console.log('');

    // Create a task assigned by Manager
    const insertResult = await pool.query(`
      INSERT INTO internal_tasks (
        task_name,
        task_code,
        status,
        priority,
        assigned_by,
        user_id,
        team_id,
        planned_start_date,
        planned_end_date,
        completion_pct
      ) VALUES (
        'Complete Monthly Report - Manager Assigned',
        'RPT001',
        'yts',
        'high',
        'Manager Test Assignment',
        $1,
        $2,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '7 days',
        0
      ) RETURNING *
    `, [amita.id, amita.team_id]);

    console.log('✅ Task Created Successfully!');
    console.log(`   Task ID: ${insertResult.rows[0].id}`);
    console.log(`   Task Name: ${insertResult.rows[0].task_name}`);
    console.log(`   Task Code: ${insertResult.rows[0].task_code}`);
    console.log(`   Status: ${insertResult.rows[0].status}`);
    console.log(`   Priority: ${insertResult.rows[0].priority}`);
    console.log(`   Assigned By: ${insertResult.rows[0].assigned_by}`);
    console.log(`   User ID: ${insertResult.rows[0].user_id}`);
    console.log(`   Team ID: ${insertResult.rows[0].team_id}`);
    console.log('');

    // Verify task can be queried
    const verifyResult = await pool.query(`
      SELECT 
        t.*,
        u.name as user_name,
        team.name as team_name
      FROM internal_tasks t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN teams team ON t.team_id = team.id
      WHERE t.user_id = $1
      ORDER BY t.id DESC
    `, [amita.id]);

    console.log(`✅ Verification: Found ${verifyResult.rows.length} task(s) for ${amita.name}\n`);

    verifyResult.rows.forEach((task, idx) => {
      console.log(`${idx + 1}. ${task.task_name}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Code: ${task.task_code || 'N/A'}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Priority: ${task.priority || 'N/A'}`);
      console.log(`   Assigned By: ${task.assigned_by || 'N/A'}`);
      console.log(`   User: ${task.user_name}`);
      console.log(`   Team: ${task.team_name}`);
      console.log('');
    });

    console.log('📡 API Call that Employee Portal Makes:');
    console.log(`   GET http://localhost:8080/api/tasks?userId=${amita.id}`);
    console.log('');
    console.log('✅ Now login as Amita to see this task!');
    console.log(`   Email: ${amita.email}`);
    console.log('   Password: emp123');
    console.log('   Go to: Tasks page');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

manualTaskTest();
