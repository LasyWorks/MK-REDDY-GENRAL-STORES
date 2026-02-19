const db = require('./src/config/database');

async function checkDatabase() {
  try {
    const [tables] = await db.pool.execute('SHOW TABLES');
    
    console.log('\n--- Database Tables ---');
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [[{ count }]] = await db.pool.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`${tableName.padEnd(20)}: ${count} records`);
    }
    console.log('------------------------\n');
    process.exit(0);
  } catch (err) {
    console.error('Error checking database:', err.message);
    process.exit(1);
  }
}

checkDatabase();
