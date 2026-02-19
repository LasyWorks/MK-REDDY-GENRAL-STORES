const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'mk_kirana_stores',
};

const seedData = async () => {
  let connection;

  try {
    console.log('🔄 Starting database seeding...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Update admin user with password
    console.log('\n🔐 Setting up admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE role_id = 1',
      [adminPassword]
    );
    console.log('   ✅ Admin password set (password: admin123)');

    // Seed Categories
    console.log('\n📦 Seeding categories...');
    const categories = [
      { name_en: 'Cooking Oils', name_te: 'వంట నూనెలు', description_en: 'All types of cooking oils', display_order: 1 },
      { name_en: 'Rice & Grains', name_te: 'బియ్యం & ధాన్యాలు', description_en: 'Rice, wheat, and other grains', display_order: 2 },
      { name_en: 'Pulses & Lentils', name_te: 'పప్పులు', description_en: 'Dal, beans, and lentils', display_order: 3 },
      { name_en: 'Spices & Masalas', name_te: 'మసాలాలు', description_en: 'Indian spices and masalas', display_order: 4 },
      { name_en: 'Flour & Atta', name_te: 'పిండి', description_en: 'Wheat flour, besan, and more', display_order: 5 },
      { name_en: 'Sugar & Salt', name_te: 'చక్కెర & ఉప్పు', description_en: 'Sugar, salt, and sweeteners', display_order: 6 },
      { name_en: 'Dry Fruits', name_te: 'డ్రై ఫ్రూట్స్', description_en: 'Nuts and dry fruits', display_order: 7 },
      { name_en: 'Beverages', name_te: 'పానీయాలు', description_en: 'Tea, coffee, and drinks', display_order: 8 },
      { name_en: 'Dairy Products', name_te: 'పాల ఉత్పత్తులు', description_en: 'Milk, butter, ghee', display_order: 9 },
      { name_en: 'Snacks', name_te: 'స్నాక్స్', description_en: 'Chips, namkeen, and snacks', display_order: 10 },
    ];

    for (const cat of categories) {
      await connection.execute(
        'INSERT INTO categories (name_en, name_te, description_en, display_order) VALUES (?, ?, ?, ?)',
        [cat.name_en, cat.name_te, cat.description_en, cat.display_order]
      );
    }
    console.log(`   ✅ ${categories.length} categories added`);

    // Seed Products
    console.log('\n📦 Seeding products...');
    const products = [
      // Cooking Oils (GST 5%)
      { category_id: 1, sku: 'OIL001', name_en: 'Sunflower Oil', name_te: 'సన్‌ఫ్లవర్ ఆయిల్', unit_type: 'litre', price: 150.00, gst_percentage: 5.00, stock_quantity: 100 },
      { category_id: 1, sku: 'OIL002', name_en: 'Groundnut Oil', name_te: 'వేరుశనగ నూనె', unit_type: 'litre', price: 180.00, gst_percentage: 5.00, stock_quantity: 80 },
      { category_id: 1, sku: 'OIL003', name_en: 'Coconut Oil', name_te: 'కొబ్బరి నూనె', unit_type: 'litre', price: 200.00, gst_percentage: 5.00, stock_quantity: 60 },
      { category_id: 1, sku: 'OIL004', name_en: 'Mustard Oil', name_te: 'ఆవాల నూనె', unit_type: 'litre', price: 170.00, gst_percentage: 5.00, stock_quantity: 50 },
      
      // Rice & Grains
      { category_id: 2, sku: 'RIC001', name_en: 'Basmati Rice', name_te: 'బాస్మతి బియ్యం', unit_type: 'kg', price: 120.00, gst_percentage: 5.00, stock_quantity: 200 },
      { category_id: 2, sku: 'RIC002', name_en: 'Sona Masoori Rice', name_te: 'సోనా మసూరి బియ్యం', unit_type: 'kg', price: 60.00, gst_percentage: 5.00, stock_quantity: 300 },
      { category_id: 2, sku: 'RIC003', name_en: 'Brown Rice', name_te: 'బ్రౌన్ రైస్', unit_type: 'kg', price: 90.00, gst_percentage: 5.00, stock_quantity: 100 },
      
      // Pulses & Lentils
      { category_id: 3, sku: 'PUL001', name_en: 'Toor Dal', name_te: 'కంది పప్పు', unit_type: 'kg', price: 130.00, gst_percentage: 5.00, stock_quantity: 150 },
      { category_id: 3, sku: 'PUL002', name_en: 'Moong Dal', name_te: 'పెసర పప్పు', unit_type: 'kg', price: 120.00, gst_percentage: 5.00, stock_quantity: 120 },
      { category_id: 3, sku: 'PUL003', name_en: 'Chana Dal', name_te: 'శనగ పప్పు', unit_type: 'kg', price: 100.00, gst_percentage: 5.00, stock_quantity: 100 },
      { category_id: 3, sku: 'PUL004', name_en: 'Urad Dal', name_te: 'మినప పప్పు', unit_type: 'kg', price: 140.00, gst_percentage: 5.00, stock_quantity: 80 },
      
      // Spices & Masalas
      { category_id: 4, sku: 'SPI001', name_en: 'Turmeric Powder', name_te: 'పసుపు', unit_type: 'gram', price: 25.00, gst_percentage: 5.00, stock_quantity: 500 },
      { category_id: 4, sku: 'SPI002', name_en: 'Red Chilli Powder', name_te: 'కారం పొడి', unit_type: 'gram', price: 35.00, gst_percentage: 5.00, stock_quantity: 400 },
      { category_id: 4, sku: 'SPI003', name_en: 'Coriander Powder', name_te: 'ధనియాల పొడి', unit_type: 'gram', price: 30.00, gst_percentage: 5.00, stock_quantity: 350 },
      { category_id: 4, sku: 'SPI004', name_en: 'Cumin Seeds', name_te: 'జీలకర్ర', unit_type: 'gram', price: 40.00, gst_percentage: 5.00, stock_quantity: 300 },
      { category_id: 4, sku: 'SPI005', name_en: 'Garam Masala', name_te: 'గరం మసాలా', unit_type: 'gram', price: 50.00, gst_percentage: 5.00, stock_quantity: 200 },
      
      // Flour & Atta
      { category_id: 5, sku: 'FLR001', name_en: 'Wheat Atta', name_te: 'గోధుమ పిండి', unit_type: 'kg', price: 45.00, gst_percentage: 5.00, stock_quantity: 250 },
      { category_id: 5, sku: 'FLR002', name_en: 'Besan', name_te: 'శనగ పిండి', unit_type: 'kg', price: 80.00, gst_percentage: 5.00, stock_quantity: 150 },
      { category_id: 5, sku: 'FLR003', name_en: 'Rice Flour', name_te: 'బియ్యపు పిండి', unit_type: 'kg', price: 50.00, gst_percentage: 5.00, stock_quantity: 200 },
      
      // Sugar & Salt
      { category_id: 6, sku: 'SUG001', name_en: 'Sugar', name_te: 'చక్కెర', unit_type: 'kg', price: 45.00, gst_percentage: 5.00, stock_quantity: 300 },
      { category_id: 6, sku: 'SUG002', name_en: 'Jaggery', name_te: 'బెల్లం', unit_type: 'kg', price: 60.00, gst_percentage: 5.00, stock_quantity: 150 },
      { category_id: 6, sku: 'SAL001', name_en: 'Table Salt', name_te: 'ఉప్పు', unit_type: 'kg', price: 20.00, gst_percentage: 5.00, stock_quantity: 400 },
      
      // Dry Fruits
      { category_id: 7, sku: 'DRY001', name_en: 'Almonds', name_te: 'బాదం', unit_type: 'gram', price: 150.00, gst_percentage: 5.00, stock_quantity: 100 },
      { category_id: 7, sku: 'DRY002', name_en: 'Cashews', name_te: 'జీడిపప్పు', unit_type: 'gram', price: 120.00, gst_percentage: 5.00, stock_quantity: 100 },
      { category_id: 7, sku: 'DRY003', name_en: 'Raisins', name_te: 'ఎండు ద్రాక్ష', unit_type: 'gram', price: 80.00, gst_percentage: 5.00, stock_quantity: 150 },
      
      // Beverages
      { category_id: 8, sku: 'BEV001', name_en: 'Tea Powder', name_te: 'టీ పొడి', unit_type: 'gram', price: 40.00, gst_percentage: 18.00, stock_quantity: 200 },
      { category_id: 8, sku: 'BEV002', name_en: 'Coffee Powder', name_te: 'కాఫీ పొడి', unit_type: 'gram', price: 50.00, gst_percentage: 18.00, stock_quantity: 150 },
      
      // Dairy Products
      { category_id: 9, sku: 'DAI001', name_en: 'Pure Ghee', name_te: 'నెయ్యి', unit_type: 'gram', price: 60.00, gst_percentage: 12.00, stock_quantity: 100 },
      { category_id: 9, sku: 'DAI002', name_en: 'Butter', name_te: 'వెన్న', unit_type: 'gram', price: 55.00, gst_percentage: 12.00, stock_quantity: 80 },
      
      // Snacks
      { category_id: 10, sku: 'SNK001', name_en: 'Potato Chips', name_te: 'బంగాళదుంప చిప్స్', unit_type: 'pack', price: 20.00, gst_percentage: 12.00, stock_quantity: 200 },
      { category_id: 10, sku: 'SNK002', name_en: 'Mixture', name_te: 'మిక్సర్', unit_type: 'gram', price: 30.00, gst_percentage: 12.00, stock_quantity: 150 },
    ];

    for (const prod of products) {
      await connection.execute(
        `INSERT INTO products (category_id, sku, name_en, name_te, unit_type, price, gst_percentage, stock_quantity) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [prod.category_id, prod.sku, prod.name_en, prod.name_te, prod.unit_type, prod.price, prod.gst_percentage, prod.stock_quantity]
      );
    }
    console.log(`   ✅ ${products.length} products added`);

    // Create sample customers
    console.log('\n👥 Seeding sample customers...');
    const customers = [
      { name: 'Rahul Kumar', phone: '9876543210', user_type: 'retail', role_id: 2 },
      { name: 'Priya Sharma', phone: '9876543211', user_type: 'retail', role_id: 2 },
      { name: 'Wholesale Mart', phone: '9876543212', user_type: 'wholesale', role_id: 3 },
    ];

    for (const cust of customers) {
      await connection.execute(
        'INSERT INTO users (name, phone, user_type, role_id) VALUES (?, ?, ?, ?)',
        [cust.name, cust.phone, cust.user_type, cust.role_id]
      );
    }
    console.log(`   ✅ ${customers.length} sample customers added`);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Sample Customers: ${customers.length}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('ℹ️  Some data may already exist. Skipping duplicates.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Database connection closed');
    }
  }
};

// Run seeding if executed directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
