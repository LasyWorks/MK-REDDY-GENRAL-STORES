const config = require('./src/config');

console.log('=== Email Configuration Check ===\n');

console.log('✓ SMTP Configuration:');
console.log('  Host:', config.email.host);
console.log('  Port:', config.email.port);
console.log('  User:', config.email.user);
console.log('  From:', config.email.from);
console.log('');

console.log('✓ Email Recipients:');
console.log('  Admin Email:', config.email.adminEmail || '✗ NOT CONFIGURED');
console.log('  Store Email:', config.store.email);
console.log('');

if (!config.email.adminEmail) {
  console.log('⚠️  WARNING: ADMIN_EMAIL is not configured!');
  console.log('   Admin will NOT receive order notifications.');
  console.log('   Please add ADMIN_EMAIL to your .env file.');
} else {
  console.log('✓ Admin email is properly configured!');
  console.log('');
  console.log('When customers place orders, the admin will receive notifications at:');
  console.log('  → ' + config.email.adminEmail);
  console.log('');
  console.log('Customer order confirmations will be sent to their registered email.');
}
