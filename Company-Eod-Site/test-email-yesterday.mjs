#!/usr/bin/env node

/**
 * Test Script: Send Missing EOD Emails for Yesterday
 * This will trigger email notifications for all employees who didn't submit EOD yesterday
 */

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const targetDate = yesterday.toISOString().split('T')[0];

console.log(`\n🧪 Testing Email System for: ${targetDate}\n`);

const testEndpoint = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/notifications/send-escalation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date: targetDate })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', response.status, errorText);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Missing EOD Check Result:');
    console.log('  📊 Pending (employees without EOD):', result.pending);
    console.log('  🔔 Notifications created:', result.created);
    console.log('  📧 Emails sent:', result.sent || result.emailsSent);
    console.log('  📝 Message:', result.message);
    
    const emailCount = result.sent || result.emailsSent || 0;
    if (emailCount > 0) {
      console.log('\n✅ SUCCESS! Emails have been sent to leadership.');
      console.log('   Check the following inboxes:');
      console.log('   - TLs (Rajshekar, Javed, Soubhagya, Amita)');
      console.log('   - IT Manager (Waseem)');
      console.log('   - Manager (Asim)');
      console.log('   - CEO (Thaseena)');
    } else if (result.pending === 0) {
      console.log('\n✅ All employees submitted EOD for yesterday!');
    } else {
      console.log('\n⚠️  Portal notifications created, but no emails sent.');
      console.log('   Check server logs for details.');
    }

  } catch (error) {
    console.error('❌ Failed to call API:', error.message);
    console.log('\nℹ️  Make sure the backend server is running on port 8080');
  }
};

// Also check ageing tasks
const testAgeingTasks = async () => {
  try {
    console.log('\n\n🧪 Checking Ageing Tasks (5+ days)...\n');
    
    const response = await fetch('http://localhost:8080/api/notifications/check-ageing-tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date: targetDate })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', response.status, errorText);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Ageing Task Check Result:');
    console.log('  🔔 Notifications created:', result.created);
    console.log('  📧 Emails sent:', result.emailsSent);
    console.log('  📝 Message:', result.message);
    
    if (result.emailsSent > 0) {
      console.log('\n✅ SUCCESS! Ageing task emails have been sent to leadership.');
    } else if (result.created === 0) {
      console.log('\n✅ No tasks stuck for 5+ days.');
    }

  } catch (error) {
    console.error('❌ Failed to call API:', error.message);
  }
};

// Run tests
(async () => {
  console.log('═══════════════════════════════════════════');
  console.log('  EMAIL SYSTEM TEST');
  console.log('═══════════════════════════════════════════');
  
  await testEndpoint();
  await testAgeingTasks();
  
  console.log('\n═══════════════════════════════════════════');
  console.log('  TEST COMPLETE');
  console.log('═══════════════════════════════════════════\n');
})();
