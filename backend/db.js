const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Setup MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : '',
  database: process.env.DB_NAME || 'eleve_db',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: 'utf8mb4',
  dateStrings: true
});

// Prevent unhandled pool/connection errors from crashing the Node.js process
if (pool.pool && typeof pool.pool.on === 'function') {
  pool.pool.on('error', (err) => {
    console.error('[MySQL Pool Error]', err && (err.code || err.message) ? (err.code || err.message) : err);
  });
}

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('Database connected successfully to ' + (process.env.DB_NAME || 'eleve_db'));
    conn.release();
  })
  .catch(err => {
    console.error('Error connecting to database:', err.message);
  });

module.exports = pool;
