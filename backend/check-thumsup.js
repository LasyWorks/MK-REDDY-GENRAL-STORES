const { query } = require('./src/config/database');

(async () => {
  try {
    // Check Thums Up product
    const res = await query(`
      SELECT p.id, pt.name, p.is_active, p.stock_quantity 
      FROM products p
      LEFT JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = 'en'
      WHERE p.id = $1
    `, ['019c8aa3-6aee-7db8-837a-078e8d62b251']);
    
    console.log('Thums Up Product:', JSON.stringify(res[0], null, 2));
    
    // Also test the products API filter
    const allActive = await query(`
      SELECT p.id, pt.name, p.is_active, p.stock_quantity 
      FROM products p
      LEFT JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = 'en'
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    console.log('\nFirst 10 active products:', allActive.map(p => ({ id: p.id, name: p.name })));
    
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
