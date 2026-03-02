/**
 * Database Performance Optimization Script
 * Adds indexes to frequently queried columns for faster lookups
 * 
 * Run: node src/database/optimize-indexes.js
 */

const { pool } = require('../config/database');
const logger = require('../utils/logger');

const optimizations = [
  {
    name: 'idx_products_category_active',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_active 
          ON products(category_id, is_active) 
          WHERE is_active = true`,
    description: 'Optimize product listing by category for active products'
  },
  {
    name: 'idx_products_featured_active',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_featured_active 
          ON products(is_featured, is_active) 
          WHERE is_featured = true AND is_active = true`,
    description: 'Optimize featured products query'
  },
  {
    name: 'idx_products_brand',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand 
          ON products(brand) 
          WHERE brand IS NOT NULL`,
    description: 'Optimize brand filtering and variant grouping'
  },
  {
    name: 'idx_products_price',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price 
          ON products(price)`,
    description: 'Optimize price range filtering'
  },
  {
    name: 'idx_products_stock',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_stock 
          ON products(stock_quantity) 
          WHERE stock_quantity > 0`,
    description: 'Optimize in-stock filtering'
  },
  {
    name: 'idx_products_sku',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku 
          ON products(sku)`,
    description: 'Optimize SKU lookups'
  },
  {
    name: 'idx_products_created_at',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at 
          ON products(created_at DESC)`,
    description: 'Optimize sorting by newest products'
  },
  {
    name: 'idx_orders_user_status',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status 
          ON orders(user_id, status, created_at DESC)`,
    description: 'Optimize user order history queries'
  },
  {
    name: 'idx_orders_status_created',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created 
          ON orders(status, created_at DESC)`,
    description: 'Optimize admin order management queries'
  },
  {
    name: 'idx_categories_parent_active',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_active 
          ON categories(parent_id, is_active) 
          WHERE is_active = true`,
    description: 'Optimize subcategory lookups'
  },
  {
    name: 'idx_promotions_active_dates',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotions_active_dates 
          ON promotions(is_active, starts_at, ends_at) 
          WHERE is_active = true`,
    description: 'Optimize active promotions queries'
  },
  {
    name: 'idx_promotion_products_promotion',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotion_products_promotion 
          ON promotion_products(promotion_id)`,
    description: 'Optimize promotion-product lookups'
  },
  {
    name: 'idx_promotion_products_product',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotion_products_product 
          ON promotion_products(product_id)`,
    description: 'Optimize product-promotion lookups'
  },
  {
    name: 'idx_product_translations_product_lang',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_translations_product_lang 
          ON product_translations(product_id, lang_code)`,
    description: 'Optimize translated product queries'
  },
  {
    name: 'idx_category_translations_category_lang',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_category_translations_category_lang 
          ON category_translations(category_id, lang_code)`,
    description: 'Optimize translated category queries'
  },
  {
    name: 'idx_users_email',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
          ON users(email)`,
    description: 'Optimize user email lookups'
  },
  {
    name: 'idx_users_phone',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone 
          ON users(phone)`,
    description: 'Optimize user phone lookups'
  },
  {
    name: 'idx_refresh_tokens_user_valid',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user_valid 
          ON refresh_tokens(user_id, expires_at) 
          WHERE revoked = false`,
    description: 'Optimize token validation queries'
  },
  {
    name: 'idx_admin_logs_entity',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_logs_entity 
          ON admin_logs(entity_type, entity_id, created_at DESC)`,
    description: 'Optimize admin audit log queries'
  },
  {
    name: 'idx_admin_logs_admin',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_logs_admin_id 
          ON admin_logs(admin_id, created_at DESC)`,
    description: 'Optimize admin activity tracking'
  }
];

async function checkIndexExists(indexName) {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = $1
    ) as exists`,
    [indexName]
  );
  return result.rows[0].exists;
}

async function createIndex(optimization) {
  const { name, sql, description } = optimization;
  
  try {
    const exists = await checkIndexExists(name);
    
    if (exists) {
      logger.info(`✓ Index already exists: ${name}`);
      return { name, status: 'exists', description };
    }
    
    logger.info(`Creating index: ${name}...`);
    const startTime = Date.now();
    
    await pool.query(sql);
    
    const duration = Date.now() - startTime;
    logger.info(`✓ Created index: ${name} (${duration}ms)`);
    
    return { name, status: 'created', duration, description };
  } catch (error) {
    logger.error(`✗ Failed to create index ${name}:`, error.message);
    return { name, status: 'failed', error: error.message, description };
  }
}

async function analyzeTable(tableName) {
  try {
    await pool.query(`ANALYZE ${tableName}`);
    logger.info(`✓ Analyzed table: ${tableName}`);
  } catch (error) {
    logger.error(`✗ Failed to analyze table ${tableName}:`, error.message);
  }
}

async function optimizeDatabase() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Database Performance Optimization Script            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  logger.info('Starting database optimization...');
  
  const results = {
    created: [],
    exists: [],
    failed: []
  };
  
  // Create indexes
  for (const optimization of optimizations) {
    const result = await createIndex(optimization);
    results[result.status].push(result);
  }
  
  // Analyze tables to update statistics
  logger.info('\nUpdating table statistics...');
  const tables = [
    'products', 'categories', 'orders', 'users', 
    'promotions', 'promotion_products', 'product_translations', 
    'category_translations', 'refresh_tokens', 'admin_logs'
  ];
  
  for (const table of tables) {
    await analyzeTable(table);
  }
  
  // Display summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   Optimization Summary                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`✓ Indexes created:        ${results.created.length}`);
  console.log(`✓ Indexes already exist:  ${results.exists.length}`);
  console.log(`✗ Failed:                 ${results.failed.length}\n`);
  
  if (results.created.length > 0) {
    console.log('Newly created indexes:');
    results.created.forEach(r => {
      console.log(`  • ${r.name} (${r.duration}ms)`);
      console.log(`    ${r.description}`);
    });
    console.log('');
  }
  
  if (results.failed.length > 0) {
    console.log('Failed indexes:');
    results.failed.forEach(r => {
      console.log(`  • ${r.name}: ${r.error}`);
    });
    console.log('');
  }
  
  logger.info('Database optimization complete!');
  
  return results;
}

// Run if executed directly
if (require.main === module) {
  optimizeDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      logger.error('Optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { optimizeDatabase };
