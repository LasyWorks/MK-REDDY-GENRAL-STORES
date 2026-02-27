const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const productId = '019c8aa2-1e35-729b-9c60-2bedb5eac1ca';
const lang = 'en';
const limit = 12;

const query = `
  SELECT 
    p.id,
    p.category_id,
    p.brand,
    p.price,
    p.stock_quantity,
    COALESCE(pt_req.name, pt_en.name) as name,
    COUNT(DISTINCT oi2.order_id) as purchase_frequency
  FROM order_items oi1
  INNER JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi2.product_id != $1
  INNER JOIN products p ON oi2.product_id = p.id
  LEFT JOIN product_translations pt_req ON p.id = pt_req.product_id AND pt_req.lang_code = $2
  LEFT JOIN product_translations pt_en ON p.id = pt_en.product_id AND pt_en.lang_code = 'en'
  WHERE oi1.product_id = $1 
    AND p.is_active = true 
    AND p.stock_quantity > 0
  GROUP BY 
    p.id, p.category_id, p.brand, p.price, p.stock_quantity,
    pt_req.name, pt_en.name
  ORDER BY purchase_frequency DESC
  LIMIT $3
`;

pool.query(query, [productId, lang, limit])
  .then(result => {
    console.log('Query result:', JSON.stringify(result.rows, null, 2));
    pool.end();
  })
  .catch(err => {
    console.error('Query error:', err.message);
    console.error(err.stack);
    pool.end();
  });
