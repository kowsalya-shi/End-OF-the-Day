import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log('\n🧪 Creating Ageing Task Test Data\n');
console.log('=' .repeat(60));

async function createAgeingTestData() {
  try {
    const targetDate = '2026-09-08';
    const ageingThreshold = 5; // days
    
    // Calculate the date 6 days ago (to create an ageing task)
    const sixDaysAgo = new Date(targetDate);
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const startDate = sixDaysAgo.toISOString().split('T')[0];
    
    console.log(`\n📅 Target Date: ${targetDate}`);
    console.log(`⏰ Creating tasks with start date: ${startDate} (6 days ago)`);
    console.log(`   This makes them ${6} days old, exceeding the ${ageingThreshold}-day threshold\n`);
    
    // Get a test employee (Kowsalya)
    const employeeResult = await pool.query(`
      SELECT id, name, team_id FROM users WHERE email = 'kowsalya@arraafiinfotech.com'
    `);
    
    if (employeeResult.rows.length === 0) {
      console.log('❌ Test employee not found');
      return;
    }
    
    const employee = employeeResult.rows[0];
    console.log(`✅ Found test employee: ${employee.name} (ID: ${employee.id})`);
    
    // Create 3 test tasks in different statuses
    const testTasks = [
      { name: 'Inventory Update - YTS Test', status: 'yts' },
      { name: 'Client Report - WIP Test', status: 'wip' },
      { name: 'System Review - Holding Test', status: 'holding' }
    ];
    
    console.log(`\n📝 Creating ${testTasks.length} test tasks:\n`);
    
    const createdTaskIds = [];
    
    for (const task of testTasks) {
      const result = await pool.query(`
        INSERT INTO internal_tasks (
          task_name, 
          user_id, 
          team_id, 
          status, 
          priority, 
          completion_pct, 
          planned_start_date, 
          planned_end_date, 
          actual_start_date,
          assigned_by,
          created_at
        ) VALUES ($1, $2, $3, $4, 'medium', 0, $5, $6, $5, 'Manager', NOW())
        RETURNING id, task_name, status
      `, [
        task.name,
        employee.id,
        employee.team_id,
        task.status,
        startDate,
        targetDate
      ]);
      
      createdTaskIds.push(result.rows[0].id);
      
      console.log(`   ✅ Created: ${result.rows[0].task_name}`);
      console.log(`      Status: ${result.rows[0].status.toUpperCase()}`);
      console.log(`      Task ID: ${result.rows[0].id}`);
      console.log(`      Start Date: ${startDate} (6 days old)\n`);
    }
    
    console.log('=' .repeat(60));
    console.log('\n✅ Test data created successfully!\n');
    
    console.log('🔧 Now run the ageing task check:\n');
    console.log('   node test-ageing-tasks.mjs');
    console.log('\n   OR trigger via API:');
    console.log('   POST http://localhost:8080/api/notifications/check-ageing-tasks');
    console.log('   Body: { "date": "2026-09-08" }\n');
    
    console.log('📋 Created Task IDs:', createdTaskIds.join(', '));
    console.log('\n💡 These tasks should now generate ageing notifications!\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

createAgeingTestData();
