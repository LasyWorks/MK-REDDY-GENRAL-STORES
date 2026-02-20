/**
 * Database Test Runner
 * Executes comprehensive database tests and generates report
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'mk_kirana_stores',
  multipleStatements: true
};

async function runDatabaseTests() {
  let connection;
  const results = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    expectedFails: 0,
    testResults: []
  };

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     MK KIRRANA STORES - DATABASE TEST SUITE                 ║');
    console.log('║     Senior QA Engineer Report                               ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Connect to database
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database: mk_kirana_stores\n');

    // Read SQL test file
    const sqlFile = await fs.readFile(
      path.join(__dirname, 'database-tests.sql'),
      'utf-8'
    );

    // Split into individual queries
    const queries = sqlFile
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log('🧪 Executing test suite...\n');
    console.log('═'.repeat(70) + '\n');

    for (const query of queries) {
      if (query.includes('SELECT') && !query.startsWith('USE')) {
        try {
          const [rows] = await connection.execute(query);
          
          if (rows && rows.length > 0) {
            // Check if this is a test result
            const firstRow = rows[0];
            
            if (firstRow.test_name) {
              console.log(`📋 ${firstRow.test_name}`);
              results.totalTests++;
            }

            // Display results
            rows.forEach(row => {
              if (row.result) {
                const resultSymbol = 
                  row.result === 'PASS' ? '✅ PASS' :
                  row.result === 'FAIL' ? '❌ FAIL' :
                  row.result === 'EXPECTED_FAIL' ? '⚠️  EXPECTED FAIL' :
                  row.result === 'CHECK' ? '🔍 CHECK' :
                  '📊 ' + row.result;

                console.log(`   ${resultSymbol}`);

                if (row.result === 'PASS') results.passed++;
                else if (row.result === 'FAIL') results.failed++;
                else if (row.result === 'EXPECTED_FAIL') results.expectedFails++;

                // Store detailed result
                results.testResults.push({
                  testName: row.test_name || 'Unknown',
                  result: row.result,
                  data: row
                });
              } else {
                // Display data without result classification
                Object.entries(row).forEach(([key, value]) => {
                  if (key !== 'test_name') {
                    console.log(`   ${key}: ${value}`);
                  }
                });
              }
            });
            console.log('');
          }
        } catch (error) {
          console.error(`❌ Error executing query: ${error.message}\n`);
          results.failed++;
        }
      }
    }

    // Generate summary
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 TEST EXECUTION SUMMARY\n');
    console.log('═'.repeat(70));
    console.log(`Total Tests Executed:   ${results.totalTests}`);
    console.log(`✅ Passed:              ${results.passed}`);
    console.log(`❌ Failed:              ${results.failed}`);
    console.log(`⚠️  Expected Fails:     ${results.expectedFails}`);
    console.log(`Success Rate:           ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);
    console.log('═'.repeat(70) + '\n');

    // Classification
    console.log('🎯 PRODUCTION READINESS ASSESSMENT\n');
    
    if (results.failed === 0) {
      console.log('✅ STATUS: PRODUCTION READY');
      console.log('   All critical tests passed. System is safe for deployment.');
    } else if (results.failed <= 2) {
      console.log('⚠️  STATUS: MINOR ISSUES DETECTED');
      console.log('   Non-blocking issues found. Review recommended before deployment.');
    } else {
      console.log('❌ STATUS: CRITICAL ISSUES FOUND');
      console.log('   Blocking issues detected. Resolution required before deployment.');
    }

    console.log('\n' + '═'.repeat(70) + '\n');

    // Save results to JSON
    const reportPath = path.join(__dirname, 'test-results.json');
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Detailed report saved: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed\n');
    }
  }
}

// Run tests
runDatabaseTests();
