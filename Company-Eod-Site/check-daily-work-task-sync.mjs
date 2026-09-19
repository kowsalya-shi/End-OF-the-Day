#!/usr/bin/env node

/**
 * Diagnostic Script: Check Daily Work to Task Synchronization
 * 
 * This script checks if all daily work entries have corresponding tasks
 * and identifies any sync issues for specific employees.
 */

import pg from 'pg';

const client = new pg.Client({
  connectionString: 'postgresql://postgres:Shiny@08@localhost:5432/eod_db'
});

await client.connect();

// Helper function to execute queries
async function sql(strings, ...values) {
  const query = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] !== undefined ? `$${i + 1}` : '');
  }, '');
  const result = await client.query(query, values.filter(v => v !== undefined));
  return result.rows;
}

console.log('\n🔍 Checking Daily Work to Task Synchronization...\n');
console.log('═'.repeat(80));

async function checkSync() {
  try {
    // Get all daily work entries
    const dailyWork = await sql`
      SELECT 
        dw.id,
        dw.action,
        dw.date,
        dw.status,
        dw.user_id,
        dw.team_id,
        dw.source_task_id,
        u.name as user_name,
        u.role as user_role,
        t.name as team_name
      FROM daily_work dw
      LEFT JOIN users u ON dw.user_id = u.id
      LEFT JOIN teams t ON dw.team_id = t.id
      ORDER BY dw.date DESC, u.name
    `;

    console.log(`\n📊 Total Daily Work Entries: ${dailyWork.length}\n`);

    // Check each daily work for corresponding task
    let synced = 0;
    let notSynced = 0;
    const issues = [];

    for (const work of dailyWork) {
      const expectedTaskCode = `TASK-${work.id}`;
      
      // Check if task exists
      const [task] = await sql`
        SELECT id, task_code, task_name, status, user_id
        FROM internal_tasks
        WHERE task_code = ${expectedTaskCode}
      `;

      if (task) {
        synced++;
        
        // Verify task data matches daily work
        if (task.task_name !== work.action || task.status !== work.status) {
          issues.push({
            dailyWorkId: work.id,
            userName: work.user_name,
            issue: 'Data Mismatch',
            dailyWork: { action: work.action, status: work.status },
            task: { taskName: task.task_name, status: task.status }
          });
        }
      } else {
        notSynced++;
        issues.push({
          dailyWorkId: work.id,
          userName: work.user_name,
          userRole: work.user_role,
          teamName: work.team_name,
          issue: 'Missing Task',
          action: work.action,
          date: work.date,
          status: work.status,
          expectedTaskCode
        });
      }
    }

    console.log('✅ Synced (Daily Work → Task):', synced);
    console.log('❌ Not Synced (Missing Task):', notSynced);
    console.log('⚠️  Data Mismatches:', issues.filter(i => i.issue === 'Data Mismatch').length);

    // Show issues by employee
    if (issues.length > 0) {
      console.log('\n' + '═'.repeat(80));
      console.log('📋 ISSUES FOUND:\n');

      // Group by employee
      const byEmployee = {};
      for (const issue of issues) {
        const name = issue.userName || 'Unknown';
        if (!byEmployee[name]) byEmployee[name] = [];
        byEmployee[name].push(issue);
      }

      for (const [name, userIssues] of Object.entries(byEmployee)) {
        console.log(`\n👤 ${name} (${userIssues[0].userRole || 'N/A'}) - ${userIssues[0].teamName || 'No Team'}`);
        console.log('─'.repeat(80));
        
        for (const issue of userIssues) {
          console.log(`\n  Daily Work ID: ${issue.dailyWorkId}`);
          console.log(`  Issue: ${issue.issue}`);
          
          if (issue.issue === 'Missing Task') {
            console.log(`  Action: "${issue.action}"`);
            console.log(`  Date: ${issue.date}`);
            console.log(`  Status: ${issue.status}`);
            console.log(`  Expected Task Code: ${issue.expectedTaskCode}`);
            console.log(`  ❌ Task NOT created in internal_tasks table`);
          } else if (issue.issue === 'Data Mismatch') {
            console.log(`  Daily Work: action="${issue.dailyWork.action}", status="${issue.dailyWork.status}"`);
            console.log(`  Task: taskName="${issue.task.taskName}", status="${issue.task.status}"`);
            console.log(`  ⚠️  Data out of sync`);
          }
        }
      }
    } else {
      console.log('\n✅ All Daily Work entries have corresponding tasks!');
    }

    // Check for orphaned tasks (tasks without daily work)
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 Checking for Orphaned Tasks (Tasks without Daily Work)...\n');

    const orphanedTasks = await sql`
      SELECT 
        t.id,
        t.task_code,
        t.task_name,
        t.status,
        t.user_id,
        u.name as user_name
      FROM internal_tasks t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.task_code LIKE 'TASK-%'
        AND t.task_code ~ '^TASK-[0-9]+$'
        AND NOT EXISTS (
          SELECT 1 FROM daily_work dw
          WHERE 'TASK-' || dw.id = t.task_code
        )
      ORDER BY t.task_code
    `;

    if (orphanedTasks.length > 0) {
      console.log(`⚠️  Found ${orphanedTasks.length} orphaned tasks:\n`);
      for (const task of orphanedTasks) {
        console.log(`  Task Code: ${task.task_code} | User: ${task.user_name || 'Unassigned'} | Name: "${task.task_name}"`);
      }
    } else {
      console.log('✅ No orphaned tasks found!');
    }

    // Summary by status
    console.log('\n' + '═'.repeat(80));
    console.log('📊 Daily Work Status Summary:\n');

    const statusCounts = {};
    for (const work of dailyWork) {
      statusCounts[work.status] = (statusCounts[work.status] || 0) + 1;
    }

    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  ${status.toUpperCase().padEnd(15)}: ${count}`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 RECOMMENDATIONS:\n');

    if (notSynced > 0) {
      console.log(`  ⚠️  ${notSynced} daily work entries are missing their tasks`);
      console.log('  ✓ Run: POST /api/daily-work/sync-tasks to fix this');
      console.log('  ✓ Or manually call syncTaskFromDailyWork() for each entry');
    }

    if (issues.filter(i => i.issue === 'Data Mismatch').length > 0) {
      console.log(`  ⚠️  Some tasks are out of sync with daily work`);
      console.log('  ✓ Update daily work will automatically resync the task');
    }

    if (notSynced === 0 && issues.length === 0) {
      console.log('  ✅ System is working perfectly!');
      console.log('  ✅ All daily work entries have matching tasks');
      console.log('  ✅ No data inconsistencies found');
    }

    console.log('\n' + '═'.repeat(80) + '\n');

    await client.end();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

checkSync();
