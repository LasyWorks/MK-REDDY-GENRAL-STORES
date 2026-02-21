const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'mk_kirana_stores';

const seedData = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: DB_NAME,
  });

  try {
    await client.connect();
    console.log('Connected to', DB_NAME);

    // Admin user (upsert)
    const adminHash = await bcrypt.hash('admin123', 12);
    await client.query(`
      INSERT INTO users (role_id, name, phone, user_type, password_hash)
      VALUES (1, 'Admin', '9000000000', 'admin', $1)
      ON CONFLICT (phone) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [adminHash]);
    console.log('Admin user seeded (phone: 9000000000, password: admin123)');

    // Categories
    const cats = [
      ['Cooking Oils',    'వంట నూనెలు',          'All types of cooking oils',  1],
      ['Rice & Grains',   'బియ్యం & ధాన్యాలు',   'Rice, wheat, and other grains', 2],
      ['Pulses & Lentils','పప్పులు',              'Dal, beans, and lentils',    3],
      ['Spices & Masalas','మసాలాలు',              'Indian spices and masalas',  4],
      ['Flour & Atta',    'పిండి',                'Wheat flour and more',       5],
      ['Sugar & Salt',    'చక్కెర & ఉప్పు',      'Sugar, salt, and sweeteners',6],
      ['Dry Fruits',      'డ్రై ఫ్రూట్స్',        'Nuts and dry fruits',         7],
      ['Beverages',       'పానీయాలు',             'Tea, coffee, and drinks',    8],
      ['Dairy Products',  'పాల ఉత్పత్తులు',       'Milk, butter, ghee',         9],
      ['Snacks',          'స్నాక్స్',              'Chips, namkeen, and snacks', 10],
    ];
    const catIds = [];
    for (const [nameEn, nameTe, descEn, ord] of cats) {
      const r = await client.query(
        'INSERT INTO categories (display_order) VALUES ($1) RETURNING id',
        [ord]
      );
      const catId = r.rows[0].id;
      catIds.push(catId);
      await client.query(
        'INSERT INTO category_translations (category_id, lang_code, name, description) VALUES ($1, $2, $3, $4)',
        [catId, 'en', nameEn, descEn]
      );
      await client.query(
        'INSERT INTO category_translations (category_id, lang_code, name, description) VALUES ($1, $2, $3, $4)',
        [catId, 'te', nameTe, descEn]
      );
    }
    console.log(cats.length, 'categories seeded');

    // Products [catIdx, sku, nameEn, nameTe, unit, price, gst, stock]
    const prods = [
      [0,'OIL001','Sunflower Oil',       'సన్ ఫ్లవర్ ఆయిల్',       'litre', 150.00, 5.00, 100],
      [0,'OIL002','Groundnut Oil',       'వేరుశనగ నూనె',            'litre', 180.00, 5.00,  80],
      [0,'OIL003','Coconut Oil',         'కొబ్బరి నూనె',            'litre', 200.00, 5.00,  60],
      [1,'RIC001','Basmati Rice',        'బాస్మతి బియ్యం',          'kg',    120.00, 5.00, 200],
      [1,'RIC002','Sona Masoori Rice',   'సోనా మసూరి',              'kg',     60.00, 5.00, 300],
      [2,'PUL001','Toor Dal',            'కంది పప్పు',              'kg',    130.00, 5.00, 150],
      [2,'PUL002','Moong Dal',           'పెసర పప్పు',              'kg',    120.00, 5.00, 120],
      [3,'SPI001','Turmeric Powder',     'పసుపు',                   'gram',   25.00, 5.00, 500],
      [3,'SPI002','Red Chilli Powder',   'కారం పొడి',               'gram',   35.00, 5.00, 400],
      [4,'FLR001','Wheat Atta',          'గోధుమ పిండి',             'kg',     45.00, 5.00, 250],
      [5,'SUG001','Sugar',               'చక్కెర',                  'kg',     45.00, 5.00, 300],
      [5,'SAL001','Table Salt',          'ఉప్పు',                   'kg',     20.00, 5.00, 400],
      [6,'DRY001','Almonds',             'బాదం',                    'gram',  150.00, 5.00, 100],
      [6,'DRY002','Cashews',             'జీడిపప్పు',               'gram',  120.00, 5.00, 100],
      [7,'BEV001','Tea Powder',          'టీ పొడి',                 'gram',   40.00,18.00, 200],
      [7,'BEV002','Coffee Powder',       'కాఫీ పొడి',               'gram',   50.00,18.00, 150],
      [8,'DAI001','Pure Ghee',           'నెయ్యి',                  'gram',   60.00,12.00, 100],
      [9,'SNK001','Potato Chips',        'బంగాళదుంప చిప్స్',        'pack',   20.00,12.00, 200],
    ];
    for (const [ci, sku, nameEn, nameTe, unit, price, gst, stock] of prods) {
      const r = await client.query(
        'INSERT INTO products (category_id, sku, unit_type, price, gst_percentage, stock_quantity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [catIds[ci], sku, unit, price, gst, stock]
      );
      const pid = r.rows[0].id;
      await client.query(
        'INSERT INTO product_translations (product_id, lang_code, name) VALUES ($1, $2, $3)',
        [pid, 'en', nameEn]
      );
      await client.query(
        'INSERT INTO product_translations (product_id, lang_code, name) VALUES ($1, $2, $3)',
        [pid, 'te', nameTe]
      );
    }
    console.log(prods.length, 'products seeded');

    // Sample customers
    const custs = [
      ['Rahul Kumar',    '9876543210', 'retail',    2],
      ['Priya Sharma',   '9876543211', 'retail',    2],
      ['Wholesale Mart', '9876543212', 'wholesale', 3],
    ];
    for (const [n, ph, ut, rid] of custs) {
      await client.query(
        'INSERT INTO users (role_id, name, phone, user_type) VALUES ($1, $2, $3, $4) ON CONFLICT (phone) DO NOTHING',
        [rid, n, ph, ut]
      );
    }
    console.log(custs.length, 'sample customers seeded');
    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

if (require.main === module) seedData();
module.exports = seedData;