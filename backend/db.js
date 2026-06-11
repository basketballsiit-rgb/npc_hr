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
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true
});

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
