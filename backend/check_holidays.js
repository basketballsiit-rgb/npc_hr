const pool = require('./db');

async function checkHolidays() {
  try {
    const [rows] = await pool.query('SELECT * FROM holidays');
    console.log('Holidays in database:', rows);
  } catch (error) {
    console.error('Error fetching holidays:', error.message);
  } finally {
    process.exit(0);
  }
}

checkHolidays();
