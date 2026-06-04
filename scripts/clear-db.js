const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

// Load environment variables from .env.local
let dbUrl = process.env.DATABASE_URL;

try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
      if (match) {
        dbUrl = match[1].trim();
        break;
      }
    }
  }
} catch (err) {
  console.warn('Could not read .env.local file. Falling back to process.env.', err);
}

if (!dbUrl) {
  console.error('ERROR: DATABASE_URL is not set!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function clearDb() {
  console.log('Clearing database tables starting fresh...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // We cascade truncate to empty all tables in order of dependency
    console.log('Truncating tables...');
    await client.query('TRUNCATE TABLE coin_blocks, transactions, money_requests, overdraft_requests, audit_logs, session, account, verification, "user" CASCADE');
    
    await client.query('COMMIT');
    console.log('Database successfully cleared! Start fresh.');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing database:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

clearDb();
