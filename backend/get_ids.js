const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedOrder() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Srivardhan@04',
    database: process.env.DB_NAME || 'mk_kirana_stores'
  });

  try {
    const [users] = await connection.execute('SELECT id FROM users WHERE user_type != "admin" LIMIT 1');
    const [products] = await connection.execute('SELECT * FROM products LIMIT 1');
    
    if (users.length === 0 || products.length === 0) {
      console.log('No user or product found to create order');
      return;
    }

    const userId = users[0].id;
    const p = products[0];
    const orderNo = 'ORD-TEST-' + Date.now();
    const invNo = 'INV-TEST-' + Date.now();

    // Create order
    const [order] = await connection.execute(
      'INSERT INTO orders (user_id, order_number, status, subtotal, total_gst, total_amount) VALUES (?, ?, "pending", ?, ?, ?)',
      [userId, orderNo, p.price, p.price * 0.18, p.price * 1.18]
    );

    // Create invoice
    const [invoice] = await connection.execute(
      'INSERT INTO invoices (order_id, invoice_number, store_name, store_gst_number, store_address, store_phone, customer_name, customer_phone, customer_address, subtotal, cgst, sgst, total_gst, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [order.insertId, invNo, 'MK Kirana Stores', 'GST12345', 'Main Market', '6305486939', 'Test Customer', '9999999999', 'Gachibowli', p.price, (p.price * 0.18)/2, (p.price * 0.18)/2, p.price * 0.18, p.price * 1.18]
    );

    console.log('Invoice ID Created:', invoice.insertId);
  } finally {
    await connection.end();
  }
}

seedOrder();
