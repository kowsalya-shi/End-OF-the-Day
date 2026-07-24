import fetch from 'node-fetch';

async function testTrainingSave() {
  console.log('\n=== TESTING TRAINING SAVE ===\n');

  try {
    const testData = {
      topic: 'SAP FICO Training',
      category: 'Technical',
      trainer: 'John Doe',
      startDate: '2026-07-09',
      endDate: '2026-07-16',
      status: 'wip',
      progressPct: 30,
      remarks: 'Learning FICO module basics',
      userId: 7, // Mohammed Ibrahim
      teamId: 1  // FICO team
    };

    console.log('1️⃣  Creating training record...');
    console.log('   Payload:', JSON.stringify(testData, null, 2));
    console.log('');

    const createResponse = await fetch('http://localhost:8080/api/training', {
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

    const createdTraining = await createResponse.json();
    console.log('✅ Training record saved successfully!');
    console.log(`   ID: ${createdTraining.id}`);
    console.log(`   Topic: ${createdTraining.topic}`);
    console.log(`   Status: ${createdTraining.status}`);
    console.log(`   Progress: ${createdTraining.progressPct}%`);
    console.log('');

    // Verify it can be retrieved
    console.log('2️⃣  Verifying saved record...');
    const getResponse = await fetch('http://localhost:8080/api/training?userId=7');
    
    if (!getResponse.ok) {
      console.log('❌ Failed to retrieve record');
      return;
    }

    const trainingList = await getResponse.json();
    console.log(`✅ Found ${trainingList.length} training record(s) for this user\n`);

    trainingList.forEach((training, idx) => {
      console.log(`${idx + 1}. ${training.topic}`);
      console.log(`   ID: ${training.id}`);
      console.log(`   Category: ${training.category || 'N/A'}`);
      console.log(`   Trainer: ${training.trainer || 'N/A'}`);
      console.log(`   Status: ${training.status}`);
      console.log(`   Progress: ${training.progressPct}%`);
      console.log('');
    });

    console.log('🎉 SUCCESS! Training save functionality is working!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTrainingSave();
