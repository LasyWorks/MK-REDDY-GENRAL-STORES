const EmailService = require('./src/services/emailService');
const config = require('./src/config');

async function testAdminEmail() {
  console.log('Testing admin email notification...');
  console.log('Admin Email:', config.email.adminEmail);
  console.log('Store Email:', config.store.email);
  console.log('');

  if (!config.email.adminEmail) {
    console.log('✗ ADMIN_EMAIL is not configured in .env file!');
    console.log('Please add: ADMIN_EMAIL=your-admin@email.com');
    return;
  }

  // Create a mock order for testing
  const mockOrder = {
    id: 1,
    order_number: 'TEST-' + Date.now(),
    total_amount: 450.00,
    discount_amount: 50.00,
    created_at: new Date(),
    notes: 'Test order for admin notification'
  };

  const mockUser = {
    name: 'Test Customer',
    email: 'test@customer.com',
    phone: '+91-9999999999',
    user_type: 'customer',
    address: 'Test Address, City - 123456'
  };

  try {
    console.log('Sending test admin order notification...');
    const result = await EmailService.sendAdminOrderNotification(mockOrder, mockUser);
    
    if (result && result.success) {
      console.log('✓ Admin order notification sent successfully!');
      console.log('Message ID:', result.messageId);
      console.log('Check admin inbox:', config.email.adminEmail);
    } else {
      console.log('✗ Failed to send admin notification');
      console.log('Reason:', result?.reason || 'Unknown error');
    }
  } catch (error) {
    console.error('✗ Test failed:');
    console.error('Error:', error.message);
  }
}

testAdminEmail();
