import pg from "pg";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
const { Pool } = pg;

// Load .env file
dotenv.config({ path: './artifacts/api-server/.env' });

console.log('\n🧪 Email System Debug Test\n');
console.log('=' .repeat(60));

// Check environment variables
console.log('\n📋 SMTP Configuration:');
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET'}`);
console.log(`   SMTP_USER: ${process.env.SMTP_USER || 'NOT SET'}`);
console.log(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET'}`);
console.log(`   SMTP_SSL: ${process.env.SMTP_SSL || 'NOT SET'}`);

console.log('\n📧 Email Recipients:');
console.log(`   IT_MANAGER_EMAIL: ${process.env.IT_MANAGER_EMAIL || 'NOT SET'}`);
console.log(`   CEO_EMAIL: ${process.env.CEO_EMAIL || 'NOT SET'}`);
console.log(`   MANAGER_EMAIL: ${process.env.MANAGER_EMAIL || 'NOT SET'}`);
console.log(`   TL_EMAILS: ${process.env.TL_EMAILS || 'NOT SET'}`);

// Check if all required settings are present
const missingSettings = [];
if (!process.env.SMTP_HOST) missingSettings.push('SMTP_HOST');
if (!process.env.SMTP_PORT) missingSettings.push('SMTP_PORT');
if (!process.env.SMTP_USER) missingSettings.push('SMTP_USER');
if (!process.env.SMTP_PASSWORD) missingSettings.push('SMTP_PASSWORD');

if (missingSettings.length > 0) {
  console.log('\n❌ Missing configuration:');
  missingSettings.forEach(setting => console.log(`   - ${setting}`));
  process.exit(1);
}

// Try to create transporter
console.log('\n🔌 Testing SMTP Connection...');
try {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SSL === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Verify connection
  await transporter.verify();
  console.log('✅ SMTP connection successful!');

  // Get recipient list
  const configuredEmails = [
    process.env.IT_MANAGER_EMAIL,
    process.env.CEO_EMAIL,
    process.env.MANAGER_EMAIL,
    ...(process.env.TL_EMAILS || "").split(",").map((email) => email.trim()),
  ].filter((email) => !!email);

  console.log('\n📬 Will send test email to:');
  configuredEmails.forEach(email => console.log(`   - ${email}`));

  // Send test email
  console.log('\n📤 Sending test email...');
  const info = await transporter.sendMail({
    from: `"Arraafi Task Management Portal" <${process.env.SMTP_USER}>`,
    to: configuredEmails.join(", "),
    subject: "[TEST] Email System Working - " + new Date().toISOString(),
    html: `
      <p>Dear Team,</p>
      <p>This is a <strong>TEST EMAIL</strong> from the Arraafi Task Management Portal.</p>
      <p>If you are receiving this, the email system is configured correctly!</p>
      <p><strong>Test Details:</strong></p>
      <ul>
        <li>Date: ${new Date().toLocaleString()}</li>
        <li>SMTP Server: ${process.env.SMTP_HOST}</li>
        <li>From: ${process.env.SMTP_USER}</li>
      </ul>
      <br/>
      <p>Regards,<br/>Arraafi Task Management Portal</p>
    `,
  });

  console.log('✅ Test email sent successfully!');
  console.log(`   Message ID: ${info.messageId}`);
  console.log(`   Accepted: ${info.accepted?.join(', ')}`);
  if (info.rejected?.length > 0) {
    console.log(`   Rejected: ${info.rejected.join(', ')}`);
  }

  console.log('\n✅ EMAIL SYSTEM IS WORKING!');
  console.log('   Check the inboxes of all recipients.');

} catch (error) {
  console.error('\n❌ SMTP Error:', error.message);
  if (error.code) console.error(`   Error Code: ${error.code}`);
  if (error.response) console.error(`   Response: ${error.response}`);
  
  console.log('\n🔍 Troubleshooting:');
  console.log('   1. Check SMTP_PASSWORD is correct');
  console.log('   2. Verify mail.arraafiinfotech.com is accessible');
  console.log('   3. Check port 465 is not blocked by firewall');
  console.log('   4. Verify SMTP account has sending permissions');
  
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
