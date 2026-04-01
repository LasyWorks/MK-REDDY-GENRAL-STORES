require('dotenv').config({ path: __dirname + '/../.env' });

const emailService = require('../src/services/emailService');

(async () => {
  try {
    const to = process.argv[2] || 'aanubothu@gmail.com';
    const result = await emailService.sendDesignPreviewPack(to);
    console.log('Preview send result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Failed to send preview emails:', err.message);
    process.exit(1);
  }
})();
