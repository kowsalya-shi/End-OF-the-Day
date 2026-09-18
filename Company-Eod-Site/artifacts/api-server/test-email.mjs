import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

console.log('\n🧪 Email System Test\n');
console.log('=' .repeat(60));

// Check environment variables
console.log('\n📋 Configuration Check:');
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || '❌ NOT SET'}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '❌ NOT SET'}`);
console.log(`   SMTP_USER: ${process.env.SMTP_USER || '❌ NOT SET'}`);
console.log(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   SMTP_SSL: ${process.env.SMTP_SSL || '❌ NOT SET'}`);

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
  console.log('\n❌ Missing required SMTP settings in .env file!');
  process.exit(1);
}

// Get recipient list
const emails = [
  process.env.IT_MANAGER_EMAIL,
  process.env.CEO_EMAIL,
  process.env.MANAGER_EMAIL,
  ...(process.env.TL_EMAILS || "").split(",").map(e => e.trim()),
  process.env.TEST_EMAIL
].filter(e => e);

console.log('\n📬 Recipients:');
emails.forEach(email => console.log(`   ✉️  ${email}`));

// Create transporter
console.log('\n🔌 Creating SMTP connection...');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SSL === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  debug: true, // Enable debug
  logger: true // Enable logging
});

// Test connection
console.log('\n🔍 Testing SMTP connection...');
try {
  await transporter.verify();
  console.log('✅ SMTP connection successful!\n');
} catch (error) {
  console.error('❌ SMTP connection failed!');
  console.error('   Error:', error.message);
  console.log('\n💡 Possible issues:');
  console.log('   1. Wrong SMTP password');
  console.log('   2. Server mail.arraafiinfotech.com not accessible');
  console.log('   3. Port 465 blocked by firewall');
  console.log('   4. SSL certificate issues');
  process.exit(1);
}

// Send test email
console.log('📤 Sending test email...\n');
try {
  const info = await transporter.sendMail({
    from: `"Arraafi Task Management Portal TEST" <${process.env.SMTP_USER}>`,
    to: emails.join(", "),
    subject: `[TEST] Email System Working - ${new Date().toLocaleString()}`,
    text: `This is a test email from Arraafi Task Management Portal.

If you are receiving this, the email notification system is working correctly!

Test Date: ${new Date().toLocaleString()}
SMTP Server: ${process.env.SMTP_HOST}
From: ${process.env.SMTP_USER}

Regards,
Arraafi Task Management Portal`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">✅ Email System Test</h2>
        <p>This is a <strong>TEST EMAIL</strong> from the Arraafi Task Management Portal.</p>
        <p>If you are receiving this, the email notification system is working correctly!</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Test Details:</strong></p>
          <ul style="margin: 10px 0;">
            <li>Date: ${new Date().toLocaleString()}</li>
            <li>SMTP Server: ${process.env.SMTP_HOST}</li>
            <li>From: ${process.env.SMTP_USER}</li>
          </ul>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Regards,<br/>
          <strong>Arraafi Task Management Portal</strong>
        </p>
      </div>
    `,
  });

  console.log('✅ Email sent successfully!\n');
  console.log('   Message ID:', info.messageId);
  console.log('   Accepted:', info.accepted?.join(', ') || 'N/A');
  if (info.rejected?.length > 0) {
    console.log('   ⚠️  Rejected:', info.rejected.join(', '));
  }

  console.log('\n📬 CHECK YOUR INBOXES!');
  console.log('   All recipients should receive the test email.');
  console.log('   Subject: [TEST] Email System Working');
  
} catch (error) {
  console.error('\n❌ Failed to send email!');
  console.error('   Error:', error.message);
  if (error.code) console.error('   Code:', error.code);
  if (error.response) console.error('   Response:', error.response);
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
