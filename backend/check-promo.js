const { query } = require('./src/config/database');
const { Promotion } = require('./src/models');
(async () => {
  try {
    const promoProds = await query(`
      SELECT pp.promotion_id, pp.product_id, pt.name 
      FROM promotion_products pp 
      LEFT JOIN product_translations pt ON pp.product_id = pt.product_id AND pt.lang_code = 'en'
      ORDER BY pp.created_at
    `);
    console.log('Promotion Products:', JSON.stringify(promoProds, null, 2));
    const map = await Promotion.getActiveProductMap();
    console.log('\nActive Product Map - Total:', Object.keys(map).length);
    Object.entries(map).forEach(([pid, info]) => {
      console.log(`  ${pid}: ${info.title} - ${info.discount_type} ${info.discount_value}`);
    });
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();