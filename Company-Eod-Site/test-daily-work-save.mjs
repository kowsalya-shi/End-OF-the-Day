import fetch from 'node-fetch';

async function testDailyWorkSave() {
  console.log('\n=== TESTING DAILY WORK SAVE ===\n');

  try {
    // Test creating a daily work entry
    const testData = {
      action: 'Test Work Entry - Backend Test',
      how: 'Using test script',
      who: 'Test User',
      date: '2026-07-09',
      startDate: '2026-07-09',
      completionDate: null,
      status: 'wip',
      completionPct: 50,
      remarks: 'This is a test entry',
      userId: 7, // Mohammed Ibrahim
      teamId: 1  // FICO team
    };

    console.log('1️⃣  Creating daily work entry...');
    console.log('   Payload:', JSON.stringify(testData, null, 2));
    console.log('');

    const createResponse = await fetch('http://localhost:8080/api/daily-work', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!createResponse.ok) {
      console.log('❌ Save failed:', createResponse.status);
      const errorText = await createResponse.text();
      console.log('   Error:', errorText);
      return;
    }

    const createdWork = await createResponse.json();
    console.log('✅ Daily work saved successfully!');
    console.log(`   ID: ${createdWork.id}`);
    console.log(`   Action: ${createdWork.action}`);
    console.log(`   Status: ${createdWork.status}`);
    console.log(`   Progress: ${createdWork.completionPct}%`);
    console.log('');

    // Verify it can be retrieved
    console.log('2️⃣  Verifying saved entry...');
    const getResponse = await fetch(`http://localhost:8080/api/daily-work?userId=7&date=2026-07-09`);
    
    if (!getResponse.ok) {
      console.log('❌ Failed to retrieve entry');
      return;
    }

    const workList = await getResponse.json();
    console.log(`✅ Found ${workList.length} entries for this user/date\n`);

    workList.forEach((work, idx) => {
      console.log(`${idx + 1}. ${work.action}`);
      console.log(`   ID: ${work.id}`);
      console.log(`   Status: ${work.status}`);
      console.log(`   Progress: ${work.completionPct}%`);
      console.log('');
    });

    console.log('🎉 SUCCESS! Daily Work save functionality is working!\n');
    console.log('📝 If the employee portal is not saving:');
    console.log('   1. Check browser console (F12) for errors');
    console.log('   2. Check that userId and teamId are being sent');
    console.log('   3. Verify the form is calling the mutation correctly');
    console.log('   4. Check network tab to see the actual request');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDailyWorkSave();
