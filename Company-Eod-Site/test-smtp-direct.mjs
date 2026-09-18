#!/usr/bin/env node

/**
 * Direct SMTP Test - Test the exact credentials
 */

import nodemailer from 'nodemailer';

console.log('\n🧪 Testing SMTP Connection...\n');

const config = {
  host: 'mail.arraafiinfotech.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: 'eod_reports@arraafiinfotech.com',
    pass: 'EODweb@123#'
  },
  debug: true, // Enable debug output
  logger: true
};

console.log('Configuration:', {
  host: config.host,
  port: config.port,
  secure: config.secure,
  user: config.auth.user,
  pass: '***' // Don't show password
});

const transporter = nodemailer.createTransport(config);

// Test the connection
transporter.verify(function(error, success) {
  if (error) {
    console.log('\n❌ SMTP Connection Failed:');
    console.log('Error:', error.message);
    console.log('\nDetails:', error);
  } else {
    console.log('\n✅ SMTP Server is ready to take our messages!');
    
    // Try sending a test email
    console.log('\n📧 Attempting to send test email...\n');
    
    transporter.sendMail({
      from: 'eod_reports@arraafiinfotech.com',
      to: 'kowsalya@arraafiinfotech.com',
      subject: 'Test Email from EOD System',
      text: 'This is a test email to verify SMTP configuration.',
      html: '<p>This is a test email to verify SMTP configuration.</p><p><strong>System Status:</strong> ✅ Working</p>'
    }, (error, info) => {
      if (error) {
        console.log('❌ Failed to send email:', error.message);
      } else {
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
      }
      process.exit(error ? 1 : 0);
    });
  }
});
