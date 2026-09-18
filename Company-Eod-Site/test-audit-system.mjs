import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'eod_db',
  user: 'postgres',
  password: 'Shiny@08'
});

async function testAuditSystem() {
  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // 1. Check if audit_log table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audit_log'
      );
    `);
    console.log('1. Audit table exists:', tableCheck.rows[0].exists ? '✓ YES' : '✗ NO');

    if (!tableCheck.rows[0].exists) {
      console.log('   ✗ Audit table not found! Please run create-audit-table.mjs first.');
      return;
    }

    // 2. Check audit_log table structure
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_log'
      ORDER BY ordinal_position
    `);
    console.log('\n2. Audit table structure:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // 3. Check existing audit records
    const auditCount = await client.query('SELECT COUNT(*) FROM audit_log');
    console.log(`\n3. Current audit records: ${auditCount.rows[0].count}`);

    if (parseInt(auditCount.rows[0].count) > 0) {
      const recentLogs = await client.query(`
        SELECT 
          user_name,
          action,
          module,
          record_title,
          deleted_at
        FROM audit_log
        ORDER BY deleted_at DESC
        LIMIT 5
      `);
      
      console.log('\n   Recent audit records:');
      recentLogs.rows.forEach((log, idx) => {
        console.log(`   ${idx + 1}. ${log.action} ${log.module} by ${log.user_name}`);
        console.log(`      Title: ${log.record_title}`);
        console.log(`      Time: ${log.deleted_at}`);
      });
    } else {
      console.log('   No audit records yet. Try deleting a task, EOD, or daily work entry.');
    }

    // 4. Check sample tasks to test with
    const tasks = await client.query(`
      SELECT id, task_name, user_id 
      FROM internal_tasks 
      LIMIT 3
    `);
    console.log(`\n4. Sample tasks available for testing: ${tasks.rows.length}`);
    if (tasks.rows.length > 0) {
      tasks.rows.forEach((task, idx) => {
        console.log(`   ${idx + 1}. Task #${task.id}: "${task.task_name}" (user_id: ${task.user_id})`);
      });
    }

    // 5. Check sample EODs
    const eods = await client.query(`
      SELECT id, user_id, date 
      FROM eod_submissions 
      LIMIT 3
    `);
    console.log(`\n5. Sample EOD entries available for testing: ${eods.rows.length}`);
    if (eods.rows.length > 0) {
      eods.rows.forEach((eod, idx) => {
        console.log(`   ${idx + 1}. EOD #${eod.id}: Date ${eod.date} (user_id: ${eod.user_id})`);
      });
    }

    // 6. Check sample daily work
    const dailyWork = await client.query(`
      SELECT id, action, user_id 
      FROM daily_work 
      LIMIT 3
    `);
    console.log(`\n6. Sample daily work entries available for testing: ${dailyWork.rows.length}`);
    if (dailyWork.rows.length > 0) {
      dailyWork.rows.forEach((work, idx) => {
        console.log(`   ${idx + 1}. Work #${work.id}: "${work.action}" (user_id: ${work.user_id})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Audit system database setup is complete!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Make sure backend server is restarted to load new audit code');
    console.log('2. Login to the portal (employee, TL, or manager)');
    console.log('3. Try deleting a task, EOD, or daily work entry');
    console.log('4. Login as Manager/IT Manager/CEO and check the Audit Log page');
    console.log('5. Verify the deletion is recorded with correct details');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testAuditSystem();
