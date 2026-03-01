const EmailService = require('./src/services/emailService');
const config = require('./src/config');

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('SMTP Host:', config.email.host);
  console.log('SMTP Port:', config.email.port);
  console.log('SMTP User:', config.email.user);
  console.log('Email From:', config.email.from);
  console.log('');

  try {
    // Test connection first
    console.log('Testing SMTP connection...');
    const connectionTest = await EmailService.testConnection();
    
    if (connectionTest) {
      console.log('✓ SMTP connection successful!');
      console.log('');

      // Test sending OTP email
      console.log('Testing OTP email...');
      const testOTP = '123456';
      const testEmail = config.email.user; // Send to yourself as test
      
      const result = await EmailService.sendOTP(testEmail, testOTP, 'Test User');
      
      if (result.success) {
        console.log('✓ Test OTP email sent successfully!');
        console.log('Message ID:', result.messageId);
        console.log('Check your inbox:', testEmail);
      } else {
        console.log('✗ Failed to send test email');
      }
    } else {
      console.log('✗ SMTP connection failed');
      console.log('Please check your SMTP settings in .env file');
    }
  } catch (error) {
    console.error('✗ Email test failed:');
    console.error('Error:', error.message);
    console.error('');
    console.error('Common issues:');
    console.error('1. Gmail App Password not configured correctly');
    console.error('2. SMTP_USER or SMTP_PASSWORD incorrect');
    console.error('3. Less secure app access needs to be enabled (if not using app password)');
    console.error('4. Network/firewall blocking SMTP port 587');
  }
}

testEmail();
