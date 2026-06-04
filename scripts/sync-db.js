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
  console.error('ERROR: DATABASE_URL is not set in environment or .env.local!');
  process.exit(1);
}

console.log('Connecting to Neon database at:', dbUrl.split('@')[1] || dbUrl);

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

const queries = [
  // 1. User table
  `CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL,
    image TEXT,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    role TEXT DEFAULT 'user',
    username TEXT UNIQUE,
    balance DECIMAL(12,2) DEFAULT 0.00,
    "overdraftLimit" DECIMAL(12,2) DEFAULT 0.00,
    "savingsBalance" DECIMAL(12,2) DEFAULT 0.00
  )`,

  // 2. Session table
  `CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMP NOT NULL,
    token TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
  )`,

  // 3. Account table
  `CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP,
    "refreshTokenExpiresAt" TIMESTAMP,
    scope TEXT,
    password TEXT,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL
  )`,

  // 4. Verification table
  `CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP
  )`,

  // 5. Transactions table
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    "senderId" TEXT REFERENCES "user"(id),
    "receiverId" TEXT REFERENCES "user"(id),
    amount DECIMAL(12,2) NOT NULL,
    fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // 6. Coin blocks table
  `CREATE TABLE IF NOT EXISTS coin_blocks (
    id TEXT PRIMARY KEY,
    "serialNumber" TEXT UNIQUE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    "ownerId" TEXT REFERENCES "user"(id),
    "mintedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "parentBlockId" TEXT REFERENCES coin_blocks(id),
    "createdByTransactionId" TEXT REFERENCES transactions(id),
    status TEXT NOT NULL DEFAULT 'active',
    "spentAt" TIMESTAMP,
    "spentByTransactionId" TEXT REFERENCES transactions(id)
  )`,

  // 7. Money requests table
  `CREATE TABLE IF NOT EXISTS money_requests (
    id TEXT PRIMARY KEY,
    "requesterId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "payerId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // 8. Overdraft requests table
  `CREATE TABLE IF NOT EXISTS overdraft_requests (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reason TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // 9. Audit logs table
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    "userId" TEXT REFERENCES "user"(id),
    action TEXT NOT NULL,
    details TEXT,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )`
];

async function sync() {
  console.log('Verifying and syncing database tables...');
  try {
    for (let i = 0; i < queries.length; i++) {
      console.log(`Executing table creation query ${i + 1}/${queries.length}...`);
      await pool.query(queries[i]);
    }
    console.log('Database tables successfully synchronized!');
    process.exit(0);
  } catch (error) {
    console.error('Error synchronizing database:', error);
    process.exit(1);
  }
}

sync();
