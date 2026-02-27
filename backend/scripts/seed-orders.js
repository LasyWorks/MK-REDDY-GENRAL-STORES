/**
 * Seed script to generate sample order data for testing
 * This creates 25-30 orders across non-admin users to populate
 * the "People Also Bought" recommendation algorithm
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Common product combinations that people buy together
const commonCombinations = [
  // Breakfast combo
  ['bread', 'butter', 'milk', 'eggs'],
  // Tea time
  ['tea', 'sugar', 'biscuit', 'milk'],
  // Cooking essentials
  ['rice', 'dal', 'oil', 'salt', 'turmeric'],
  // Snack time
  ['chips', 'cold drink', 'chocolate', 'namkeen'],
  // Cleaning
  ['soap', 'detergent', 'shampoo', 'toothpaste'],
  // Vegetables
  ['tomato', 'onion', 'potato', 'green chilli'],
  // Dal & Rice combo
  ['rice', 'toor dal', 'moong dal', 'masoor dal'],
  // Spices
  ['turmeric', 'chilli powder', 'coriander powder', 'garam masala'],
  // Personal care
  ['soap', 'shampoo', 'toothpaste', 'toothbrush'],
  // Beverages
  ['tea', 'coffee', 'sugar', 'milk'],
];

async function getActiveProducts() {
  const result = await pool.query(`
    SELECT 
      p.id, 
      COALESCE(pt.name, 'Product') as name,
      p.price, 
      p.gst_percentage, 
      p.unit_type, 
      p.category_id 
    FROM products p
    LEFT JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = 'en'
    WHERE p.is_active = true AND p.stock_quantity > 0
    ORDER BY RANDOM()
    LIMIT 100
  `);
  return result.rows;
}

async function getNonAdminUsers() {
  const result = await pool.query(`
    SELECT u.id, u.phone 
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE r.name != 'admin' AND u.is_active = true
    LIMIT 15
  `);
  
  if (result.rows.length === 0) {
    console.log('⚠️  No non-admin users found. Creating sample users...');
    
    // First, get the customer role ID
    const roleResult = await pool.query(`
      SELECT id FROM roles WHERE name = 'customer' LIMIT 1
    `);
    
    if (roleResult.rows.length === 0) {
      console.log('❌ No customer role found. Please ensure roles are set up.');
      return [];
    }
    
    const customerRoleId = roleResult.rows[0].id;
    
    // Create some sample users
    const phones = ['9876543210', '9876543211', '9876543212', '9876543213', '9876543214'];
    const createdUsers = [];
    
    for (const phone of phones) {
      try {
        const insertResult = await pool.query(`
          INSERT INTO users (phone, role_id, name, user_type, is_active)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (phone) DO NOTHING
          RETURNING id, phone
        `, [phone, customerRoleId, 'Sample Customer', 'retail']);
        
        if (insertResult.rows.length > 0) {
          createdUsers.push(insertResult.rows[0]);
        }
      } catch (err) {
        console.log(`Skipping user ${phone}: ${err.message}`);
      }
    }
    
    return createdUsers;
  }
  
  return result.rows;
}

function selectRandomProducts(products, count) {
  const shuffled = [...products].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function findProductsByKeywords(products, keywords) {
  return keywords
    .map(keyword => {
      return products.find(p => 
        p.name.toLowerCase().includes(keyword.toLowerCase())
      );
    })
    .filter(Boolean);
}

async function createOrder(userId, products) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generate unique order number
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    // Calculate order totals
    let subtotal = 0;
    let gstAmount = 0;
    
    const orderItems = products.map(p => {
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const unitPrice = parseFloat(p.price);
      const gstPercentage = parseFloat(p.gst_percentage || 18);
      const itemSubtotal = unitPrice * quantity;
      const itemGst = (itemSubtotal * gstPercentage) / 100;
      const itemTotal = itemSubtotal + itemGst;
      
      subtotal += itemSubtotal;
      gstAmount += itemGst;
      
      return {
        product_id: p.id,
        product_name: p.name,
        quantity,
        unit_price: unitPrice,
        gst_percentage: gstPercentage,
        gst_amount: itemGst.toFixed(2),
        subtotal: itemSubtotal.toFixed(2),
        total: itemTotal.toFixed(2),
        unit_type: p.unit_type || 'piece',
      };
    });
    
    const total = subtotal + gstAmount;
    
    // Create order with correct schema
    const orderResult = await client.query(`
      INSERT INTO orders (
        user_id, order_number, status,
        subtotal, total_gst, total_amount,
        confirmed_at, picked_up_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, [
      userId,
      orderNumber,
      'picked_up', // Mark as picked up so it counts in recommendations
      subtotal.toFixed(2),
      gstAmount.toFixed(2),
      total.toFixed(2)
    ]);
    
    const orderId = orderResult.rows[0].id;
    
    // Create order items
    for (const item of orderItems) {
      await client.query(`
        INSERT INTO order_items (
          order_id, product_id, product_name_en, quantity, unit_type,
          unit_price, gst_percentage, gst_amount, subtotal, total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        orderId,
        item.product_id,
        item.product_name,
        item.quantity,
        item.unit_type,
        item.unit_price,
        item.gst_percentage,
        item.gst_amount,
        item.subtotal,
        item.total
      ]);
    }
    
    await client.query('COMMIT');
    return orderId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🌱 Starting order seed process...\n');
    
    // Get data
    console.log('📦 Fetching products...');
    const products = await getActiveProducts();
    console.log(`✅ Found ${products.length} active products\n`);
    
    console.log('👥 Fetching users...');
    const users = await getNonAdminUsers();
    console.log(`✅ Found ${users.length} non-admin users\n`);
    
    if (products.length < 10) {
      console.log('❌ Not enough products. Please add more products first.');
      process.exit(1);
    }
    
    if (users.length === 0) {
      console.log('❌ No users available. Please create some users first.');
      process.exit(1);
    }
    
    const targetOrders = 25;
    console.log(`🎯 Creating ${targetOrders} sample orders...\n`);
    
    let ordersCreated = 0;
    
    for (let i = 0; i < targetOrders; i++) {
      // Pick a random user
      const user = users[Math.floor(Math.random() * users.length)];
      
      let orderProducts;
      
      // 60% of the time, use common combinations
      if (Math.random() < 0.6 && i < commonCombinations.length * 2) {
        const combo = commonCombinations[i % commonCombinations.length];
        orderProducts = findProductsByKeywords(products, combo);
        
        // If we don't find enough matching products, add random ones
        if (orderProducts.length < 2) {
          orderProducts = selectRandomProducts(products, Math.floor(Math.random() * 3) + 3);
        }
      } else {
        // 40% random selection (2-6 products per order)
        const itemCount = Math.floor(Math.random() * 5) + 2;
        orderProducts = selectRandomProducts(products, itemCount);
      }
      
      try {
        const orderId = await createOrder(user.id, orderProducts);
        ordersCreated++;
        console.log(`✅ Order ${ordersCreated}/${targetOrders} created (ID: ${orderId}) - ${orderProducts.length} items for user ${user.phone}`);
      } catch (err) {
        console.log(`❌ Failed to create order ${i + 1}: ${err.message}`);
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✨ Successfully created ${ordersCreated} orders!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Orders created: ${ordersCreated}`);
    console.log(`   - Users involved: ${users.length}`);
    console.log(`   - Products available: ${products.length}`);
    console.log(`\n🎉 "People Also Bought" feature should now have data to work with!`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
