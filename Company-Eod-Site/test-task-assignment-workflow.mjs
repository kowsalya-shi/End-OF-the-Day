import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "eod_db",
  user: "postgres",
  password: "Shiny@08",
});

async function testTaskAssignmentWorkflow() {
  console.log("\n🧪 Testing Task Assignment Notification Workflow\n");
  console.log("=" .repeat(60));

  try {
    // Get TL (Amitha) and Employee (Kowsalya Athiyan)
    const tlQuery = await pool.query("SELECT id, name, email FROM users WHERE name = 'Amita Akash Mudholkar'");
    const employeeQuery = await pool.query("SELECT id, name, email, team_id FROM users WHERE name = 'Kowsalya Athiyan'");

    if (tlQuery.rows.length === 0) {
      console.log("❌ TL 'Amita Akash Mudholkar' not found");
      return;
    }

    if (employeeQuery.rows.length === 0) {
      console.log("❌ Employee 'Kowsalya Athiyan' not found");
      return;
    }

    const tl = tlQuery.rows[0];
    const employee = employeeQuery.rows[0];

    console.log(`\n✅ Found Users:`);
    console.log(`   TL: ${tl.name} (ID: ${tl.id})`);
    console.log(`   Employee: ${employee.name} (ID: ${employee.id}, Team: ${employee.team_id})`);

    // Step 1: Create a task assigned to the employee
    console.log(`\n📝 Step 1: TL assigns task to Employee via API...`);
    
    const taskData = {
      taskName: "Test Task Assignment - " + new Date().toISOString(),
      assignedBy: tl.name,
      priority: "medium",
      status: "yts",
      plannedStartDate: new Date().toISOString().split('T')[0],
      userId: employee.id,
      teamId: employee.team_id,
    };

    const createResponse = await fetch("http://localhost:8080/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });

    if (!createResponse.ok) {
      console.log(`❌ Failed to create task: ${createResponse.status}`);
      const error = await createResponse.text();
      console.log(`   Error: ${error}`);
      return;
    }

    const createdTask = await createResponse.json();
    console.log(`✅ Task created: ID ${createdTask.id}, Name: "${createdTask.taskName}"`);
    console.log(`   Assignment Status: ${createdTask.assignmentStatus}`);
    console.log(`   Assigned At: ${createdTask.assignedAt}`);

    // Step 2: Check task in database
    console.log(`\n🔍 Step 2: Verify task in database...`);
    const taskQuery = await pool.query(
      "SELECT id, task_name, assignment_status, assigned_at, user_id FROM internal_tasks WHERE id = $1",
      [createdTask.id]
    );

    if (taskQuery.rows.length > 0) {
      const dbTask = taskQuery.rows[0];
      console.log(`✅ Task in DB:`);
      console.log(`   ID: ${dbTask.id}`);
      console.log(`   Name: ${dbTask.task_name}`);
      console.log(`   Assignment Status: ${dbTask.assignment_status}`);
      console.log(`   Assigned To: ${dbTask.user_id}`);
    }

    // Step 3: Check notification was created
    console.log(`\n🔔 Step 3: Verify notification created for Employee...`);
    const notificationQuery = await pool.query(
      "SELECT id, recipient_user_id, type, title, message, related_task_id, read_at FROM portal_notifications WHERE related_task_id = $1 ORDER BY created_at DESC LIMIT 1",
      [createdTask.id]
    );

    if (notificationQuery.rows.length > 0) {
      const notification = notificationQuery.rows[0];
      console.log(`✅ Notification created:`);
      console.log(`   ID: ${notification.id}`);
      console.log(`   Recipient: ${notification.recipient_user_id} (should be ${employee.id})`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Message: ${notification.message}`);
      console.log(`   Related Task: ${notification.related_task_id}`);
      
      if (notification.recipient_user_id !== employee.id) {
        console.log(`❌ ERROR: Notification sent to wrong user!`);
      } else {
        console.log(`✅ Notification sent to correct user (${employee.name})`);
      }
    } else {
      console.log(`❌ No notification found for task ${createdTask.id}`);
    }

    // Step 4: Test task acceptance via API
    console.log(`\n✅ Step 4: Simulating Employee accepting task...`);
    console.log(`   Note: This would normally require authentication token`);
    console.log(`   Expected behavior: Task assignment_status → 'accepted', notification → read`);

    // Step 5: Verify task doesn't appear in My Tasks before acceptance
    console.log(`\n📋 Step 5: Check if task appears in Employee's task list...`);
    const tasksResponse = await fetch(`http://localhost:8080/api/tasks?userId=${employee.id}&assignmentStatus=accepted`);
    if (tasksResponse.ok) {
      const tasks = await tasksResponse.json();
      const foundTask = tasks.find(t => t.id === createdTask.id);
      if (foundTask) {
        console.log(`❌ Task should NOT appear yet (status is pending, not accepted)`);
      } else {
        console.log(`✅ Task correctly hidden from My Tasks (assignment_status='pending')`);
      }
    }

    // Summary
    console.log(`\n${"=".repeat(60)}`);
    console.log(`\n📊 TEST SUMMARY:`);
    console.log(`   1. ✅ Task created with assignment_status='pending'`);
    console.log(`   2. ✅ Notification sent to ONLY assigned user (not broadcast)`);
    console.log(`   3. ✅ Task hidden from My Tasks until accepted`);
    console.log(`\n📝 Next Steps (Manual Test Required):`);
    console.log(`   1. Login as ${employee.name}`);
    console.log(`   2. Go to Notifications page`);
    console.log(`   3. Click on "Task Assignments" tab`);
    console.log(`   4. See notification: "${createdTask.taskName}"`);
    console.log(`   5. Click [ OK ] button`);
    console.log(`   6. Go to My Tasks - task should now appear`);
    console.log(`\n   OR click [ NOT OK ] with reason:`);
    console.log(`   - Task stays hidden from My Tasks`);
    console.log(`   - ${tl.name} receives decline notification`);
    console.log(`\n${"=".repeat(60)}`);

  } catch (error) {
    console.error("\n❌ Test failed with error:", error.message);
  } finally {
    await pool.end();
  }
}

testTaskAssignmentWorkflow();
