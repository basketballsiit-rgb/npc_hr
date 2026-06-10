const pool = require('./db');
const bcrypt = require('bcryptjs');

const SPREADSHEET_ID = '1umPxyEeETaaZH35OqRSpJYv215ku1RhI7hZc82_O8sA';

function parseGoogleDate(val) {
  if (!val) return null;
  if (typeof val === 'string' && val.startsWith('Date(')) {
    const parts = val.replace('Date(', '').replace(')', '').split(',');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) + 1; // 0-indexed to 1-indexed
    const day = parseInt(parts[2]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  // Try parsing normally
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

// Function to fetch and parse Google Sheet data using Gviz API
async function fetchSheetData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;
  console.log(`Fetching sheet [${sheetName}] from Google Sheet...`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet ${sheetName}: ${response.statusText}`);
  }
  
  const text = await response.text();
  const jsonStart = text.indexOf('google.visualization.Query.setResponse(');
  if (jsonStart === -1) {
    throw new Error(`Invalid response format for sheet ${sheetName}`);
  }
  
  const jsonStr = text.substring(jsonStart + 'google.visualization.Query.setResponse('.length, text.length - 2);
  const data = JSON.parse(jsonStr);
  
  if (data.status === 'error') {
    throw new Error(`Google Sheets API error: ${JSON.stringify(data.errors)}`);
  }
  
  const cols = data.table.cols.map(c => c.label || '');
  const rows = data.table.rows.map(row => {
    return row.c.map(cell => cell ? (cell.v !== undefined ? cell.v : null) : null);
  });
  
  return { cols, rows };
}

async function runMigration() {
  console.log('=== STARTING DATABASE MIGRATION ===');
  console.log(`Google Sheet ID: ${SPREADSHEET_ID}`);
  
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // 1. Migrate Settings
    try {
      const { rows: settingsRows } = await fetchSheetData('Settings');
      console.log(`Found ${settingsRows.length} settings in sheet.`);
      
      for (const row of settingsRows) {
        const key = row[0];
        const value = row[1] !== null ? String(row[1]) : '';
        if (key) {
          await conn.query(
            'INSERT INTO settings (settingKey, settingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE settingValue = ?',
            [key, value, value]
          );
        }
      }
      console.log('✅ Settings migrated successfully.');
    } catch (err) {
      console.error('⚠️ Could not migrate Settings:', err.message);
      console.log('Skipping Settings migration...');
    }
    
    // 2. Migrate Holidays
    try {
      const { rows: holidayRows } = await fetchSheetData('Holidays');
      console.log(`Found ${holidayRows.length} holidays in sheet.`);
      
      await conn.query('DELETE FROM holidays'); // Clear old
      for (const row of holidayRows) {
        const rawDate = row[0];
        const desc = row[1] !== null ? String(row[1]) : '';
        const parsedDate = parseGoogleDate(rawDate);
        if (parsedDate) {
          await conn.query(
            'INSERT INTO holidays (holidayDate, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = ?',
            [parsedDate, desc, desc]
          );
        }
      }
      console.log('✅ Holidays migrated successfully.');
    } catch (err) {
      console.error('⚠️ Could not migrate Holidays:', err.message);
      console.log('Skipping Holidays migration...');
    }

    // 3. Migrate Users
    let usersMap = new Map(); // to map old userId to new details or verify existence
    try {
      const { rows: userRows } = await fetchSheetData('Users');
      console.log(`Found ${userRows.length} users in sheet.`);
      
      for (const row of userRows) {
        const userId = row[0] ? String(row[0]) : null;
        const fullName = row[1] ? String(row[1]) : '';
        const position = row[2] ? String(row[2]) : '';
        const username = row[3] ? String(row[3]) : '';
        const rawPassword = row[4] ? String(row[4]) : '123456';
        const role = row[5] ? String(row[5]) : 'user';
        const status = row[6] ? String(row[6]) : 'approved';
        const lineUserId = row[7] ? String(row[7]) : null;
        
        if (userId && username) {
          // Check if user already exists in MySQL
          const [exists] = await conn.query('SELECT userId FROM users WHERE username = ?', [username]);
          if (exists.length === 0) {
            // Hash password using bcryptjs
            const hashedPassword = bcrypt.hashSync(rawPassword, 10);
            await conn.query(
              'INSERT INTO users (userId, fullName, position, username, password, role, status, lineUserId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [userId, fullName, position, username, hashedPassword, role, status, lineUserId]
            );
            console.log(`- Created user: ${username} (${fullName})`);
          } else {
            console.log(`- User ${username} already exists, skipping.`);
          }
          usersMap.set(userId, { fullName, position });
        }
      }
      console.log('✅ Users migrated successfully.');
    } catch (err) {
      console.error('❌ Critical error migrating Users:', err.message);
      throw err;
    }

    // 4. Migrate LeaveData
    try {
      const { rows: leaveRows } = await fetchSheetData('LeaveData');
      console.log(`Found ${leaveRows.length} leave requests in sheet.`);
      
      let leaveSuccessCount = 0;
      for (const row of leaveRows) {
        const leaveId = row[0] ? String(row[0]) : null;
        const userId = row[1] ? String(row[1]) : null;
        const fullName = row[2] ? String(row[2]) : '';
        const position = row[3] ? String(row[3]) : '';
        const schoolName = row[4] ? String(row[4]) : '';
        const requestDate = parseGoogleDate(row[5]);
        const leaveType = row[6] ? String(row[6]) : '';
        const reason = row[7] ? String(row[7]) : '';
        const startDate = parseGoogleDate(row[8]);
        const endDate = parseGoogleDate(row[9]);
        const totalDays = row[10] !== null ? parseFloat(row[10]) : 0;
        
        const lastLeaveType = row[11] ? String(row[11]) : null;
        const lastLeaveStartDate = parseGoogleDate(row[12]);
        const lastLeaveEndDate = parseGoogleDate(row[13]);
        const lastLeaveTotalDays = row[14] !== null ? parseFloat(row[14]) : 0;
        
        const contactAddress = row[15] ? String(row[15]) : '';
        const contactPhone = row[16] ? String(row[16]) : '';
        const signatureUrl = row[17] ? String(row[17]) : '';
        const status = row[18] ? String(row[18]) : 'รอการอนุมัติ';
        
        const approverComment = row[19] ? String(row[19]) : null;
        const approverSignatureUrl = row[20] ? String(row[20]) : null;
        const approverName = row[21] ? String(row[21]) : null;
        const approverPosition = row[22] ? String(row[22]) : null;
        const approvalDate = row[23] ? String(row[23]) : null;
        const pdfUrl = row[24] ? String(row[24]) : null;
        const teacherName = row[25] ? String(row[25]) : '';
        const subject = row[26] ? String(row[26]) : '';
        
        if (leaveId && userId) {
          // Check if this leave record already exists in MySQL
          const [exists] = await conn.query('SELECT leaveId FROM leave_data WHERE leaveId = ?', [leaveId]);
          if (exists.length === 0) {
            await conn.query(
              `INSERT INTO leave_data (
                leaveId, userId, fullName, position, schoolName, requestDate, leaveType, reason,
                startDate, endDate, totalDays, lastLeaveType, lastLeaveStartDate, lastLeaveEndDate,
                lastLeaveTotalDays, contactAddress, contactPhone, signatureUrl, status,
                approverComment, approverSignatureUrl, approverName, approverPosition, approvalDate, pdfUrl,
                teacherName, subject
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                leaveId, userId, fullName, position, schoolName, requestDate, leaveType, reason,
                startDate, endDate, totalDays, lastLeaveType, lastLeaveStartDate, lastLeaveEndDate,
                lastLeaveTotalDays, contactAddress, contactPhone, signatureUrl, status,
                approverComment, approverSignatureUrl, approverName, approverPosition, approvalDate, pdfUrl,
                teacherName, subject
              ]
            );
            leaveSuccessCount++;
          }
        }
      }
      console.log(`✅ LeaveData migrated successfully. Imported ${leaveSuccessCount} new records.`);
    } catch (err) {
      console.error('❌ Error migrating LeaveData:', err.message);
      throw err;
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('❌ MIGRATION FAILED:', error.message);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

// Run migration
runMigration();
