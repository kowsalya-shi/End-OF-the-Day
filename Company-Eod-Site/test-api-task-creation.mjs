import fetch from 'node-fetch';

async function testAPITaskCreation() {
  console.log('\n=== TESTING API TASK CREATION ===\n');

  try {
    // Create a task directly (no auth needed for testing)
    console.log('1️⃣  Creating task via API...');
    const taskData = {
      taskName: 'API Test Task - Complete Project Documentation',
      taskCode: 'DOC001',
      status: 'yts',
      priority: 'high',
      assignedBy: 'Manager (API Test)',
      userId: 15, // Amita's user ID
      teamId: 4,  // Amita's team ID (EWM)
      plannedStartDate: '2026-07-09',
      plannedEndDate: '2026-07-16',
      completionPct: 0,
      remarks: 'Please complete the project documentation by next week'
    };

    console.log('   Payload:', JSON.stringify(taskData, null, 2));
    console.log('');

    const createResponse = await fetch('http://localhost:8080/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    if (!createResponse.ok) {
      console.log('❌ Task creation failed:', createResponse.status);
      const errorText = await createResponse.text();
      console.log('   Error:', errorText);
      return;
    }

    const createdTask = await createResponse.json();
    console.log('✅ Task created successfully!');
    console.log(`   Task ID: ${createdTask.id}`);
    console.log(`   Task Name: ${createdTask.taskName}`);
    console.log(`   Assigned To: ${createdTask.userName}`);
    console.log(`   Team: ${createdTask.teamName}`);
    console.log('');

    // Verify task appears for employee
    console.log('2️⃣  Verifying task appears for employee...');
    const employeeTasksResponse = await fetch('http://localhost:8080/api/tasks?userId=15');
    
    if (!employeeTasksResponse.ok) {
      console.log('❌ Failed to fetch employee tasks');
      return;
    }

    const employeeTasks = await employeeTasksResponse.json();
    console.log(`✅ Employee has ${employeeTasks.length} task(s)\n`);

    employeeTasks.forEach((task, idx) => {
      console.log(`${idx + 1}. ${task.taskName}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Priority: ${task.priority || 'N/A'}`);
      console.log(`   Assigned By: ${task.assignedBy || 'N/A'}`);
      console.log('');
    });

    console.log('🎉 SUCCESS! Task assignment via API is working!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Open browser: http://localhost:23881');
    console.log('   2. Login as Manager (manager@arraafi.com / manager123)');
    console.log('   3. Go to Tasks page');
    console.log('   4. Click "Assign Task" button');
    console.log('   5. Fill the form and click "Assign Task"');
    console.log('   6. Check browser console (F12) for any errors');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPITaskCreation();
