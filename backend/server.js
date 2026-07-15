const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all requests (crucial for GitHub Pages frontend)
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 image data upload

// Ensure uploads directories exist
const uploadDir = path.join(__dirname, 'public', 'uploads', 'signatures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// --- Helper Functions ---

// Save Base64 signature image as file
function saveSignature(base64Data, filename) {
  if (!base64Data) return null;
  
  // Format: data:image/png;base64,iVBORw0KGgoAAAANSU...
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string format');
  }
  
  const buffer = Buffer.from(matches[2], 'base64');
  const filePath = path.join(uploadDir, `${filename}.png`);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/signatures/${filename}.png`;
}

// Delete locally stored file
function deleteFile(fileUrl) {
  if (!fileUrl) return;
  // Convert /uploads/signatures/sig.png to local path
  const relativePath = fileUrl.replace('/uploads', 'public/uploads');
  const filePath = path.join(__dirname, relativePath);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    } catch (e) {
      console.error(`Failed to delete file: ${filePath}`, e.message);
    }
  }
}

// Fetch general setting value
async function getSettingValue(key) {
  try {
    const [rows] = await db.query('SELECT settingValue FROM settings WHERE settingKey = ?', [key]);
    return rows.length > 0 ? rows[0].settingValue : null;
  } catch (err) {
    console.error(`Error fetching setting ${key}:`, err.message);
    return null;
  }
}

// LINE Messaging API: Push Text Message
async function sendLinePushMessage(to, messageText) {
  if (!to || to.trim() === '') return;
  const token = process.env.LINE_ACCESS_TOKEN;
  if (!token || token.includes('YOUR_LINE_CHANNEL_ACCESS_TOKEN')) {
    console.log('LINE Push skipped: Access token not configured.');
    return;
  }

  const url = "https://api.line.me/v2/bot/message/push";
  const payload = { "to": to, "messages": [{ "type": "text", "text": messageText }] };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log(`LINE Push Message sent to ${to}. Result:`, result);
  } catch (e) {
    console.error("LINE Push Error: " + e.toString());
  }
}

// LINE Messaging API: Push Flex Message
async function sendLineFlexMessage(to, flexContent, altText) {
  if (!to || to.trim() === '') return;
  const token = process.env.LINE_ACCESS_TOKEN;
  if (!token || token.includes('YOUR_LINE_CHANNEL_ACCESS_TOKEN')) {
    console.log('LINE Flex skipped: Access token not configured.');
    return;
  }

  const url = "https://api.line.me/v2/bot/message/push";
  const payload = {
    "to": to,
    "messages": [{ "type": "flex", "altText": altText, "contents": flexContent }]
  };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log(`LINE Flex Message sent to ${to}. Result:`, result);
  } catch (e) {
    console.error("LINE Flex Error: " + e.toString());
  }
}

// Helper to convert date strings with Buddhist Era (B.E.) years to Christian Era (A.D.)
function normalizeDateToAD(dateStr) {
  if (!dateStr) return dateStr;
  const str = String(dateStr).trim();
  
  // Format: YYYY-MM-DD or YYYY/MM/DD
  let match = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) {
    const year = parseInt(match[1]);
    if (year > 2400) {
      return `${year - 543}-${match[2]}-${match[3]}`;
    }
    return `${year}-${match[2]}-${match[3]}`;
  }
  
  // Format: DD/MM/YYYY or DD-MM-YYYY
  match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = parseInt(match[3]);
    if (year > 2400) {
      year -= 543;
    }
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

// Helper to get all userIds for a person, matching by normalized name
async function getUserIdsForUser(userId) {
  try {
    const [userRows] = await db.query('SELECT fullName FROM users WHERE userId = ?', [userId]);
    if (userRows.length === 0) {
      return [userId];
    }
    const targetFullName = userRows[0].fullName;
    
    const normalize = (name) => {
      if (!name) return '';
      return name
        .replace(/\s+/g, '')
        .replace(/^(นาย|นางสาว|นาง|น\.ส\.|ดร\.|อาจารย์)/, '');
    };
    
    const targetNormalized = normalize(targetFullName);
    
    const [allUsers] = await db.query('SELECT userId, fullName FROM users');
    const matchingIds = [];
    allUsers.forEach(u => {
      if (normalize(u.fullName) === targetNormalized) {
        matchingIds.push(u.userId);
      }
    });
    
    if (matchingIds.length === 0) {
      return [userId];
    }
    return matchingIds;
  } catch (err) {
    console.error('Error in getUserIdsForUser:', err);
    return [userId];
  }
}

// --- API ROUTES ---

// 1. Authentication Routes

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { fullName, position, username, password, lineUserId, staffType } = req.body;
  if (!fullName || !position || !username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    const [exists] = await db.query('SELECT userId FROM users WHERE username = ?', [username]);
    if (exists.length > 0) {
      return res.json({ success: false, message: 'ชื่อผู้ใช้งานนี้มีอยู่แล้วในระบบ' });
    }

    const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM users');
    const isFirstUser = totalUsers[0].count === 0;

    const userId = crypto.randomUUID();
    const role = isFirstUser ? 'admin' : 'user';
    const status = isFirstUser ? 'approved' : 'pending';

    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.query(
      'INSERT INTO users (userId, fullName, position, username, password, role, status, lineUserId, staffType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, fullName, position, username, hashedPassword, role, status, lineUserId || null, staffType || null]
    );

    const message = isFirstUser
      ? 'ลงทะเบียนบัญชีแอดมินแรกสำเร็จ! สามารถเข้าใช้งานได้ทันที'
      : 'ลงทะเบียนสำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติการใช้งาน';

    res.json({ success: true, message });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ: ' + error.message });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = rows[0];
    const passwordMatch = bcrypt.compareSync(password, user.password);
    
    if (!passwordMatch) {
      return res.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    if (user.status !== 'approved') {
      return res.json({ success: false, message: 'บัญชีของคุณยังไม่ได้รับการอนุมัติการใช้งาน' });
    }

    // --- Look up APR staff ID from APR database or srs_db database ---
    let aprStaffId = null;
    try {
      const [staffRows] = await db.query('SELECT id FROM APR.staffs WHERE staff_code = ? AND is_active = 1', [username]);
      if (staffRows.length > 0) {
        aprStaffId = staffRows[0].id;
      }
    } catch (err) {
      try {
        const [staffRows] = await db.query('SELECT id FROM srs_db.staffs WHERE staff_code = ? AND is_active = 1', [username]);
        if (staffRows.length > 0) {
          aprStaffId = staffRows[0].id;
        }
      } catch (err2) {
        console.error('Failed to look up staff ID in APR or srs_db:', err2.message);
      }
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        fullName: user.fullName,
        position: user.position,
        username: user.username,
        role: user.role,
        lineUserId: user.lineUserId,
        staffType: user.staffType,
        aprStaffId: aprStaffId
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ: ' + error.message });
  }
});

// Reset Password via Username & LINE User ID verification
app.post('/api/auth/reset-password', async (req, res) => {
  const { username, lineUserId, newPassword } = req.body;
  if (!username || !lineUserId || !newPassword) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.json({ success: false, message: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' });
    }

    const user = rows[0];
    
    if (!user.lineUserId || user.lineUserId.trim() === '') {
      return res.json({ 
        success: false, 
        message: 'บัญชีของคุณไม่มีข้อมูล LINE User ID ในระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน' 
      });
    }

    if (user.lineUserId.trim() !== lineUserId.trim()) {
      return res.json({ success: false, message: 'ข้อมูล LINE User ID ไม่ถูกต้อง' });
    }

    // Hash the new password and update
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE userId = ?', [hashedPassword, user.userId]);

    res.json({ success: true, message: 'รีเซ็ตรหัสผ่านใหม่สำเร็จแล้ว สามารถเข้าสู่ระบบได้ทันที' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ: ' + error.message });
  }
});


// Endpoint to fetch APR staff ID dynamically (fallback for users logged in prior to updates)
app.get('/api/auth/get-apr-id', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ username' });
  }

  let aprStaffId = null;
  try {
    const [staffRows] = await db.query('SELECT id FROM APR.staffs WHERE staff_code = ? AND is_active = 1', [username]);
    if (staffRows.length > 0) {
      aprStaffId = staffRows[0].id;
    }
  } catch (err) {
    try {
      const [staffRows] = await db.query('SELECT id FROM srs_db.staffs WHERE staff_code = ? AND is_active = 1', [username]);
      if (staffRows.length > 0) {
        aprStaffId = staffRows[0].id;
      }
    } catch (err2) {
      console.error('Failed to look up staff ID in APR or srs_db:', err2.message);
    }
  }

  res.json({ success: true, aprStaffId });
});

// 2. User Management (Admin Only)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT userId, fullName, position, username, role, status, lineUserId, staffType, createdAt FROM users ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const { fullName, position, password, role, staffType, lineUserId } = req.body;
  try {
    if (password && password.trim() !== '') {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.query(
        'UPDATE users SET fullName = ?, position = ?, password = ?, role = ?, staffType = ?, lineUserId = ? WHERE userId = ?',
        [fullName, position, hashedPassword, role, staffType, lineUserId, userId]
      );
    } else {
      await db.query(
        'UPDATE users SET fullName = ?, position = ?, role = ?, staffType = ?, lineUserId = ? WHERE userId = ?',
        [fullName, position, role, staffType, lineUserId, userId]
      );
    }
    res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query('DELETE FROM users WHERE userId = ?', [userId]);
    res.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/users/approve/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query("UPDATE users SET status = 'approved' WHERE userId = ?", [userId]);
    res.json({ success: true, message: 'อนุมัติผู้ใช้สำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add new user manually by admin
app.post('/api/users', async (req, res) => {
  const { fullName, position, username, password, role, status, staffType, lineUserId } = req.body;
  if (!fullName || !position || !username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
  }

  try {
    const [exists] = await db.query('SELECT userId FROM users WHERE username = ?', [username]);
    if (exists.length > 0) {
      return res.json({ success: false, message: 'ชื่อผู้ใช้งานนี้มีอยู่แล้วในระบบ' });
    }

    const userId = crypto.randomUUID();
    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.query(
      'INSERT INTO users (userId, fullName, position, username, password, role, status, lineUserId, staffType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, fullName, position, username, hashedPassword, role || 'user', status || 'approved', lineUserId || null, staffType || null]
    );

    res.json({ success: true, message: 'เพิ่มผู้ใช้งานใหม่สำเร็จ' });
  } catch (error) {
    console.error('Create user error:', error.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ: ' + error.message });
  }
});


// Import users from Excel
app.post('/api/users/import', async (req, res) => {
  const usersArray = req.body;
  if (!Array.isArray(usersArray)) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
  }

  try {
    const [existingRows] = await db.query('SELECT username FROM users');
    const existingUsers = existingRows.map(r => r.username);
    
    let addedCount = 0;
    let skippedCount = 0;

    for (const u of usersArray) {
      if (u.username && !existingUsers.includes(u.username)) {
        const userId = crypto.randomUUID();
        const hashedPassword = bcrypt.hashSync(String(u.password || '123456'), 10);
        await db.query(
          'INSERT INTO users (userId, fullName, position, username, password, role, status, lineUserId, staffType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, u.fullName || '', u.position || '', u.username, hashedPassword, 'user', 'approved', '', u.staffType || u.ประเภท || u.type || null]
        );
        addedCount++;
      } else {
        skippedCount++;
      }
    }
    res.json({ success: true, message: `นำเข้าสำเร็จ! เพิ่ม ${addedCount}, ข้าม ${skippedCount}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Leave Requests Routes

// Submit Leave Request
app.post('/api/leaves', async (req, res) => {
  const leaveData = req.body;
  try {
    const leaveId = crypto.randomUUID();
    const signatureUrl = saveSignature(leaveData.signatureDataUrl, `sig_${leaveId}`);
    
    const requestDate = normalizeDateToAD(leaveData.requestDate || new Date().toISOString().split('T')[0]);
    const startDate = normalizeDateToAD(leaveData.startDate);
    const endDate = normalizeDateToAD(leaveData.endDate);
    const lastLeaveStartDate = normalizeDateToAD(leaveData.lastLeaveStartDate) || null;
    const lastLeaveEndDate = normalizeDateToAD(leaveData.lastLeaveEndDate) || null;
    
    await db.query(
      `INSERT INTO leave_data (
        leaveId, userId, fullName, position, schoolName, requestDate, leaveType, reason,
        startDate, endDate, totalDays, lastLeaveType, lastLeaveStartDate, lastLeaveEndDate,
        lastLeaveTotalDays, contactAddress, contactPhone, signatureUrl, status,
        teacherName, subject
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leaveId,
        leaveData.currentUser.userId,
        leaveData.currentUser.fullName,
        leaveData.currentUser.position,
        leaveData.schoolName,
        requestDate,
        leaveData.leaveType,
        leaveData.reason,
        startDate,
        endDate,
        leaveData.totalDays,
        leaveData.lastLeaveType || '',
        lastLeaveStartDate,
        lastLeaveEndDate,
        leaveData.lastLeaveTotalDays || 0,
        leaveData.contactAddress,
        leaveData.contactPhone,
        signatureUrl,
        'รอการอนุมัติ',
        leaveData.teacherName,
        leaveData.subject
      ]
    );

    // Notify LINE Admin Group if configured
    const adminGroupId = await getSettingValue('adminGroupId');
    if (adminGroupId) {
      let finalFrontendUrl = leaveData.frontendUrl || 'https://service.npc.ac.th/npc_hr/';
      if (!finalFrontendUrl.endsWith('/')) {
        finalFrontendUrl += '/';
      }
      const flexMessage = {
        "type": "bubble",
        "header": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "🔔 มีคำขอลาใหม่", "weight": "bold", "size": "lg", "color": "#1DB446" }] },
        "body": {
          "type": "box", "layout": "vertical", "contents": [
            { "type": "box", "layout": "baseline", "margin": "md", "contents": [{ "type": "text", "text": "ผู้ขอ:", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": leaveData.currentUser.fullName, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] },
            { "type": "box", "layout": "baseline", "margin": "md", "contents": [{ "type": "text", "text": "ประเภท:", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": leaveData.leaveType, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] },
            { "type": "box", "layout": "baseline", "margin": "md", "contents": [{ "type": "text", "text": "วันที่:", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": `${leaveData.startDate} ถึง ${leaveData.endDate}`, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] },
            { "type": "box", "layout": "baseline", "margin": "md", "contents": [{ "type": "text", "text": "รวม:", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": `${leaveData.totalDays} วัน`, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] }
          ]
        },
        "footer": {
          "type": "box", "layout": "vertical", "contents": [
            { "type": "button", "style": "primary", "color": "#2E3A59", "action": { "type": "uri", "label": "ตรวจสอบ / อนุมัติ", "uri": `${finalFrontendUrl}index.html` } }
          ]
        }
      };
      await sendLineFlexMessage(adminGroupId, flexMessage, "มีคำขอลาใหม่รออนุมัติ");
    }

    res.json({ success: true, message: 'ยื่นใบลาสำเร็จ' });
  } catch (error) {
    console.error('Submit leave error:', error.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// Get Leave History
app.post('/api/leaves/history', async (req, res) => {
  const { role, userId, filterUserId, filterStartDate, filterEndDate, fiscalYear } = req.body;
  try {
    let query = 'SELECT * FROM leave_data WHERE 1=1';
    const params = [];

    if (role !== 'admin') {
      const userIds = await getUserIdsForUser(userId);
      query += ` AND userId IN (${userIds.map(() => '?').join(', ')})`;
      params.push(...userIds);
    } else if (filterUserId && filterUserId !== 'all') {
      const userIds = await getUserIdsForUser(filterUserId);
      query += ` AND userId IN (${userIds.map(() => '?').join(', ')})`;
      params.push(...userIds);
    }

    let startLimit = filterStartDate;
    let endLimit = filterEndDate;

    if (!startLimit && !endLimit && fiscalYear && !isNaN(parseInt(fiscalYear))) {
      const targetFY_BE = parseInt(fiscalYear);
      const targetFY_AD = targetFY_BE - 543;
      startLimit = `${targetFY_AD - 1}-10-01`;
      endLimit = `${targetFY_AD}-09-30`;
    }

    if (startLimit) {
      query += ' AND startDate >= ?';
      params.push(normalizeDateToAD(startLimit));
    }
    if (endLimit) {
      query += ' AND startDate <= ?';
      params.push(normalizeDateToAD(endLimit));
    }

    query += ' ORDER BY requestDate DESC, createdAt DESC, startDate DESC';
    const [rows] = await db.query(query, params);
    
    // Normalize date outputs
    rows.forEach(r => {
      if (r.requestDate) r.requestDate = normalizeDateToAD(r.requestDate);
      if (r.startDate) r.startDate = normalizeDateToAD(r.startDate);
      if (r.endDate) r.endDate = normalizeDateToAD(r.endDate);
      if (r.lastLeaveStartDate) r.lastLeaveStartDate = normalizeDateToAD(r.lastLeaveStartDate);
      if (r.lastLeaveEndDate) r.lastLeaveEndDate = normalizeDateToAD(r.lastLeaveEndDate);
    });
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Last Approved Leave for a User
app.get('/api/leaves/last-approved/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const userIds = await getUserIdsForUser(userId);
    const [rows] = await db.query(
      `SELECT leaveType, startDate, endDate, totalDays 
       FROM leave_data 
       WHERE userId IN (${userIds.map(() => '?').join(', ')}) 
         AND status = 'อนุมัติ' 
       ORDER BY startDate DESC 
       LIMIT 1`,
      userIds
    );
    if (rows.length > 0) {
      const leave = rows[0];
      if (leave.startDate) leave.startDate = normalizeDateToAD(leave.startDate);
      if (leave.endDate) leave.endDate = normalizeDateToAD(leave.endDate);
      res.json(leave);
    } else {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Leave Statistics for a User in the Fiscal Year
app.get('/api/leaves/stats/:userId', async (req, res) => {
  const { userId } = req.params;
  const rawBeforeDate = req.query.beforeDate || new Date().toISOString().split('T')[0];
  
  try {
    const adBeforeDate = normalizeDateToAD(rawBeforeDate);
    const d = new Date(adBeforeDate);
    if (isNaN(d.getTime())) {
      return res.status(400).json({ error: 'Invalid beforeDate parameter' });
    }
    
    // Format beforeDate to local YYYY-MM-DD in Asia/Bangkok time zone to prevent timezone shifts
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const cleanBeforeDateAD = formatter.format(d);
    
    // Parse year/month from local date string to correctly determine fiscal year start
    const [localYearStr, localMonthStr, localDayStr] = cleanBeforeDateAD.split('-');
    const yearAD = parseInt(localYearStr);
    const month = parseInt(localMonthStr) - 1; // 0-indexed month
    
    let startYearAD;
    if (month >= 9) { // Oct - Dec
      startYearAD = yearAD;
    } else { // Jan - Sep
      startYearAD = yearAD - 1;
    }
    const fiscalStartAD = `${startYearAD}-10-01`;
    
    // Compute B.E. equivalents for compatibility with B.E. records in DB
    const fiscalStartBE = `${startYearAD + 543}-10-01`;
    const cleanBeforeDateBE = `${yearAD + 543}-${localMonthStr}-${localDayStr}`;
    
    // Fetch all approved leaves for the user in the current fiscal year before this date
    const userIds = await getUserIdsForUser(userId);
    const [rows] = await db.query(
      `SELECT leaveType, totalDays 
       FROM leave_data 
       WHERE userId IN (${userIds.map(() => '?').join(', ')}) 
         AND status = 'อนุมัติ' 
         AND (
           (startDate >= ? AND startDate <= ?) OR
           (startDate >= ? AND startDate <= ?)
         )`,
      [...userIds, fiscalStartAD, cleanBeforeDateAD, fiscalStartBE, cleanBeforeDateBE]
    );

    const stats = {
      "ป่วย": { count: 0, days: 0 },
      "กิจ": { count: 0, days: 0 },
      "คลอด": { count: 0, days: 0 }
    };

    rows.forEach(row => {
      const type = row.leaveType;
      const days = parseFloat(row.totalDays) || 0;
      if (type === 'ลาป่วย') {
        stats["ป่วย"].count += 1;
        stats["ป่วย"].days += days;
      } else if (type === 'ลากิจส่วนตัว') {
        stats["กิจ"].count += 1;
        stats["กิจ"].days += days;
      } else if (type === 'ลาคลอดบุตร') {
        stats["คลอด"].count += 1;
        stats["คลอด"].days += days;
      }
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Pending Leaves (Admin)
app.get('/api/leaves/pending', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM leave_data WHERE status = 'รอการอนุมัติ' ORDER BY createdAt ASC");
    rows.forEach(r => {
      if (r.requestDate) r.requestDate = normalizeDateToAD(r.requestDate);
      if (r.startDate) r.startDate = normalizeDateToAD(r.startDate);
      if (r.endDate) r.endDate = normalizeDateToAD(r.endDate);
      if (r.lastLeaveStartDate) r.lastLeaveStartDate = normalizeDateToAD(r.lastLeaveStartDate);
      if (r.lastLeaveEndDate) r.lastLeaveEndDate = normalizeDateToAD(r.lastLeaveEndDate);
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Specific Leave Request
app.get('/api/leaves/:leaveId', async (req, res) => {
  const { leaveId } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM leave_data WHERE leaveId = ?", [leaveId]);
    if (rows.length > 0) {
      const leave = rows[0];
      if (leave.requestDate) leave.requestDate = normalizeDateToAD(leave.requestDate);
      if (leave.startDate) leave.startDate = normalizeDateToAD(leave.startDate);
      if (leave.endDate) leave.endDate = normalizeDateToAD(leave.endDate);
      if (leave.lastLeaveStartDate) leave.lastLeaveStartDate = normalizeDateToAD(leave.lastLeaveStartDate);
      if (leave.lastLeaveEndDate) leave.lastLeaveEndDate = normalizeDateToAD(leave.lastLeaveEndDate);
      res.json(leave);
    } else {
      res.status(404).json({ message: 'ไม่พบใบลา' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process/Approve Leave Request
app.post('/api/leaves/approve', async (req, res) => {
  const { leaveId, status, comment, adminSignature, adminUser, frontendUrl } = req.body;
  try {
    const [leaveRows] = await db.query('SELECT * FROM leave_data WHERE leaveId = ?', [leaveId]);
    if (leaveRows.length === 0) {
      return res.json({ success: false, message: 'ไม่พบข้อมูลใบลา' });
    }

    const leave = leaveRows[0];
    const adminSignatureUrl = saveSignature(adminSignature, `adminsig_${leaveId}`);
    const approvalDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // In our system, the pdfUrl is a printable template served by the frontend.
    // e.g. https://service.npc.ac.th/npc_hr/print_template.html?leaveId=xxxx
    const finalFrontendUrl = frontendUrl || 'https://service.npc.ac.th/npc_hr/';
    const pdfPrintUrl = `${finalFrontendUrl}print_template.html?leaveId=${leaveId}`;

    await db.query(
      `UPDATE leave_data SET 
        status = ?, 
        approverComment = ?, 
        approverSignatureUrl = ?, 
        approverName = ?, 
        approverPosition = ?, 
        approvalDate = ?,
        pdfUrl = ?
      WHERE leaveId = ?`,
      [status, comment || '', adminSignatureUrl, adminUser.fullName, adminUser.position, approvalDate, pdfPrintUrl, leaveId]
    );

    // Notify user via LINE bot
    const [userRows] = await db.query('SELECT lineUserId FROM users WHERE userId = ?', [leave.userId]);
    if (userRows.length > 0 && userRows[0].lineUserId) {
      const lineUserId = userRows[0].lineUserId;
      const emoji = status === 'อนุมัติ' ? '✅' : '❌';
      let msg = `${emoji} ผลการพิจารณาใบลา\nประเภท: ${leave.leaveType}\nผลลัพธ์: ${status}\nโดย: ${adminUser.fullName}`;
      if (status === 'อนุมัติ') {
        msg += `\n\n📄 พิมพ์เอกสารใบลาได้ที่นี่: ${pdfPrintUrl}`;
      } else if (comment) {
        msg += `\nเหตุผล: ${comment}`;
      }
      await sendLinePushMessage(lineUserId, msg);
    }

    res.json({ success: true, message: `ดำเนินการ '${status}' เรียบร้อย`, pdfUrl: pdfPrintUrl });
  } catch (error) {
    console.error('Approve error:', error.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// Cancel Leave Request (by User)
app.post('/api/leaves/cancel', async (req, res) => {
  const { leaveId, userId } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM leave_data WHERE leaveId = ?', [leaveId]);
    if (rows.length === 0) {
      return res.json({ success: false, message: 'ไม่พบข้อมูลใบลา' });
    }

    const leave = rows[0];
    if (String(leave.userId) !== String(userId)) {
      return res.json({ success: false, message: 'คุณไม่มีสิทธิ์ยกเลิกใบลาของคนอื่น' });
    }

    if (leave.status !== 'รอการอนุมัติ') {
      return res.json({ success: false, message: 'ไม่สามารถยกเลิกได้ เนื่องจากสถานะถูกเปลี่ยนไปแล้ว' });
    }

    await db.query("UPDATE leave_data SET status = 'ยกเลิกโดยผู้ใช้' WHERE leaveId = ?", [leaveId]);

    // Notify LINE Admin
    const adminGroupId = await getSettingValue('adminGroupId');
    if (adminGroupId) {
      await sendLinePushMessage(adminGroupId, `⚠️ มีการยกเลิกใบลา\n👤 ${leave.fullName}\n❌ ยกเลิกการลา: ${leave.leaveType}`);
    }

    res.json({ success: true, message: 'ยกเลิกรายการสำเร็จ' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Delete Leave History (Admin)
app.delete('/api/leaves/:leaveId', async (req, res) => {
  const { leaveId } = req.params;
  try {
    const [rows] = await db.query('SELECT signatureUrl, approverSignatureUrl FROM leave_data WHERE leaveId = ?', [leaveId]);
    if (rows.length === 0) {
      return res.json({ success: false, message: 'ไม่พบรายการที่ต้องการลบ' });
    }

    const leave = rows[0];
    // Delete files locally
    deleteFile(leave.signatureUrl);
    deleteFile(leave.approverSignatureUrl);

    // Delete row
    await db.query('DELETE FROM leave_data WHERE leaveId = ?', [leaveId]);
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4. Dashboard Stats Route
app.get('/api/dashboard', async (req, res) => {
  const { userId, role } = req.query;
  const isAdmin = role === 'admin';

  try {
    let fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE;

    const reqFiscalYear = req.query.fiscalYear;
    if (reqFiscalYear && !isNaN(parseInt(reqFiscalYear))) {
      const targetFY_BE = parseInt(reqFiscalYear);
      const targetFY_AD = targetFY_BE - 543;
      fiscalStartAD = `${targetFY_AD - 1}-10-01`;
      fiscalEndAD = `${targetFY_AD}-09-30`;
      fiscalStartBE = `${targetFY_BE - 1}-10-01`;
      fiscalEndBE = `${targetFY_BE}-09-30`;
    } else {
      const [defaultSetting] = await db.query('SELECT settingValue FROM settings WHERE settingKey = "default_fiscal_year"');
      if (defaultSetting && defaultSetting.length > 0 && defaultSetting[0].settingValue) {
        const targetFY_BE = parseInt(defaultSetting[0].settingValue);
        const targetFY_AD = targetFY_BE - 543;
        fiscalStartAD = `${targetFY_AD - 1}-10-01`;
        fiscalEndAD = `${targetFY_AD}-09-30`;
        fiscalStartBE = `${targetFY_BE - 1}-10-01`;
        fiscalEndBE = `${targetFY_BE}-09-30`;
      } else {
        const today = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const cleanTodayStr = formatter.format(today);
        const [tYearStr, tMonthStr] = cleanTodayStr.split('-');
        const tYear = parseInt(tYearStr);
        const tMonth = parseInt(tMonthStr);

        let fiscalStartYear;
        if (tMonth >= 10) {
          fiscalStartYear = tYear;
        } else {
          fiscalStartYear = tYear - 1;
        }

        fiscalStartAD = `${fiscalStartYear}-10-01`;
        fiscalEndAD = `${fiscalStartYear + 1}-09-30`;
        fiscalStartBE = `${fiscalStartYear + 543}-10-01`;
        fiscalEndBE = `${fiscalStartYear + 544}-09-30`;
      }
    }

    let totalStaffVal = 0;
    let totalTravelsVal = 0;
    let totalLoanBudgetVal = 0;
    let clearedLoanBudgetVal = 0;
    let pendingLoanBudgetVal = 0;
    let statusCountsVal = { approved: 0, pending: 0, rejected: 0 };
    let leaveTypesVal = [];
    let monthlyCountsVal = Array(12).fill(0);
    let recentLeavesVal = [];

    const dateFilterSql = `((startDate >= ? AND startDate <= ?) OR (startDate >= ? AND startDate <= ?))`;
    const dateFilterSqlTd = `((td.startDate >= ? AND td.startDate <= ?) OR (td.startDate >= ? AND td.startDate <= ?))`;

    if (isAdmin || !userId) {
      // Admin: Aggregate stats for all staff in the current fiscal year
      const [[{ totalStaff }]] = await db.query('SELECT COUNT(*) as totalStaff FROM users WHERE role = "user" AND status = "approved"');
      totalStaffVal = totalStaff || 0;

      const [[{ totalTravels }]] = await db.query(
        `SELECT COUNT(*) as totalTravels FROM travel_data WHERE status IN ('อนุมัติ', 'รับทราบ') AND ${dateFilterSql}`,
        [fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      totalTravelsVal = totalTravels || 0;

      const [statusCounts] = await db.query(
        `SELECT 
          SUM(CASE WHEN status = 'อนุมัติ' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'รอการอนุมัติ' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'ไม่อนุมัติ' THEN 1 ELSE 0 END) as rejected
         FROM leave_data
         WHERE ${dateFilterSql}`,
        [fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      if (statusCounts && statusCounts[0]) {
        statusCountsVal = {
          approved: statusCounts[0].approved || 0,
          pending: statusCounts[0].pending || 0,
          rejected: statusCounts[0].rejected || 0
        };
      }

      // Doughnut Chart: sum of approved leave days per type in the current fiscal year
      const [leaveTypes] = await db.query(
        `SELECT leaveType, COALESCE(SUM(totalDays), 0) as count 
         FROM leave_data 
         WHERE status = 'อนุมัติ' AND ${dateFilterSql}
         GROUP BY leaveType`,
        [fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      leaveTypesVal = leaveTypes;

      // Monthly Chart: sum of approved leave days per month in the current fiscal year
      const [monthlyStats] = await db.query(
        `SELECT MONTH(startDate) as month, COALESCE(SUM(totalDays), 0) as count 
         FROM leave_data 
         WHERE status = 'อนุมัติ' AND ${dateFilterSql}
         GROUP BY MONTH(startDate)`,
        [fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      
      const fiscalMonths = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      monthlyStats.forEach(item => {
        const idx = fiscalMonths.indexOf(item.month);
        if (idx !== -1) {
          monthlyCountsVal[idx] = parseFloat(item.count) || 0;
        }
      });

      const [recentLeaves] = await db.query(
        `SELECT fullName, leaveType, startDate, endDate, totalDays, status, pdfUrl 
         FROM leave_data 
         WHERE ${dateFilterSql}
         ORDER BY requestDate DESC, createdAt DESC, startDate DESC LIMIT 10`,
        [fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      recentLeavesVal = recentLeaves;

      // Loan budget stats: total approved loans vs cleared loans in fiscal year
      const [[adminLoanRow]] = await db.query(
        `SELECT 
          COALESCE(SUM(budget), 0) as totalBudget
         FROM travel_data 
         WHERE budget > 0 AND status IN ('อนุมัติ', 'รับทราบ') AND ${dateFilterSql}`,
        [fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      totalLoanBudgetVal = parseFloat(adminLoanRow.totalBudget) || 0;

      const [[adminClearedRow]] = await db.query(
        `SELECT COALESCE(SUM(tc.totalSpent), 0) as clearedTotal
         FROM travel_clearances tc
         JOIN travel_data td ON tc.travelId = td.travelId
         WHERE tc.status = 'อนุมัติแล้ว' AND ${dateFilterSqlTd}`,
        [fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      clearedLoanBudgetVal = parseFloat(adminClearedRow.clearedTotal) || 0;
      pendingLoanBudgetVal = Math.max(0, totalLoanBudgetVal - clearedLoanBudgetVal);
    } else {
      // Teacher: Stats for this specific user (including duplicates) in the current fiscal year
      const userIds = await getUserIdsForUser(userId);

      const [[{ totalTravels }]] = await db.query(
        `SELECT COALESCE(SUM(totalDays), 0) as totalTravels 
         FROM travel_data 
         WHERE userId IN (${userIds.map(() => '?').join(', ')}) 
           AND status IN ('อนุมัติ', 'รับทราบ') 
           AND ${dateFilterSql}`,
        [...userIds, fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      totalTravelsVal = parseFloat(totalTravels) || 0;
      
      // Card 1: Total accumulated approved leave days in the current fiscal year
      const [[{ totalStaff }]] = await db.query(
        `SELECT COALESCE(SUM(totalDays), 0) as totalStaff 
         FROM leave_data 
         WHERE userId IN (${userIds.map(() => '?').join(', ')}) 
           AND status = 'อนุมัติ' 
           AND ${dateFilterSql}`,
        [...userIds, fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      totalStaffVal = parseFloat(totalStaff) || 0;

      // Cards 2, 3, 4: Sum of days for approved, pending, and rejected leaves in the current fiscal year
      const [statusCounts] = await db.query(
        `SELECT 
          SUM(CASE WHEN status = 'อนุมัติ' THEN totalDays ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'รอการอนุมัติ' THEN totalDays ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'ไม่อนุมัติ' THEN totalDays ELSE 0 END) as rejected
         FROM leave_data
         WHERE userId IN (${userIds.map(() => '?').join(', ')})
           AND ${dateFilterSql}`,
        [...userIds, fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      if (statusCounts && statusCounts[0]) {
        statusCountsVal = {
          approved: parseFloat(statusCounts[0].approved) || 0,
          pending: parseFloat(statusCounts[0].pending) || 0,
          rejected: parseFloat(statusCounts[0].rejected) || 0
        };
      }

      // Doughnut Chart: sum of approved leave days per type for the teacher in the current fiscal year
      const [leaveTypes] = await db.query(
        `SELECT leaveType, COALESCE(SUM(totalDays), 0) as count 
         FROM leave_data 
         WHERE userId IN (${userIds.map(() => '?').join(', ')}) 
           AND status = 'อนุมัติ' 
           AND ${dateFilterSql}
         GROUP BY leaveType`,
        [...userIds, fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      leaveTypesVal = leaveTypes;

      // Monthly Chart: sum of approved leave days per month for the teacher in the current fiscal year
      const [monthlyStats] = await db.query(
        `SELECT MONTH(startDate) as month, COALESCE(SUM(totalDays), 0) as count 
         FROM leave_data 
         WHERE userId IN (${userIds.map(() => '?').join(', ')})
           AND status = 'อนุมัติ' 
           AND ${dateFilterSql}
         GROUP BY MONTH(startDate)`,
        [...userIds, fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      
      const fiscalMonths = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      monthlyStats.forEach(item => {
        const idx = fiscalMonths.indexOf(item.month);
        if (idx !== -1) {
          monthlyCountsVal[idx] = parseFloat(item.count) || 0;
        }
      });

      const [recentLeaves] = await db.query(
        `SELECT fullName, leaveType, startDate, endDate, totalDays, status, pdfUrl 
         FROM leave_data 
         WHERE userId IN (${userIds.map(() => '?').join(', ')})
           AND ${dateFilterSql}
         ORDER BY requestDate DESC, createdAt DESC, startDate DESC LIMIT 10`,
        [...userIds, fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      recentLeavesVal = recentLeaves;

      // Loan budget stats for the user
      const userIds2 = userIds;
      const [[userLoanRow]] = await db.query(
        `SELECT COALESCE(SUM(budget), 0) as totalBudget
         FROM travel_data 
         WHERE userId IN (${userIds2.map(() => '?').join(', ')}) 
           AND budget > 0 AND status IN ('อนุมัติ', 'รับทราบ') AND ${dateFilterSql}`,
        [...userIds2, fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      totalLoanBudgetVal = parseFloat(userLoanRow.totalBudget) || 0;

      const [[userClearedRow]] = await db.query(
        `SELECT COALESCE(SUM(tc.totalSpent), 0) as clearedTotal
         FROM travel_clearances tc
         JOIN travel_data td ON tc.travelId = td.travelId
         WHERE tc.userId IN (${userIds2.map(() => '?').join(', ')}) AND tc.status = 'อนุมัติแล้ว'
           AND ${dateFilterSqlTd}`,
        [...userIds2, fiscalStartAD, fiscalEndAD, fiscalStartBE, fiscalEndBE]
      );
      clearedLoanBudgetVal = parseFloat(userClearedRow.clearedTotal) || 0;
      pendingLoanBudgetVal = Math.max(0, totalLoanBudgetVal - clearedLoanBudgetVal);
    }

    res.json({
      stats: {
        totalStaff: totalStaffVal,
        approved: statusCountsVal.approved,
        pending: statusCountsVal.pending,
        rejected: statusCountsVal.rejected,
        totalTravels: totalTravelsVal,
        totalLoanBudget: totalLoanBudgetVal,
        clearedLoanBudget: clearedLoanBudgetVal,
        pendingLoanBudget: pendingLoanBudgetVal
      },
      charts: {
        leaveTypeData: {
          labels: leaveTypesVal.map(lt => lt.leaveType),
          data: leaveTypesVal.map(lt => lt.count)
        },
        monthlyLeaveData: {
          labels: ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'],
          data: monthlyCountsVal
        }
      },
      recentLeaves: recentLeavesVal
    });
  } catch (error) {
    console.error('Dashboard query error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 5. Settings Routes
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings');
    const settingsObj = {};
    rows.forEach(r => settingsObj[r.settingKey] = r.settingValue);
    res.json(settingsObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  const settingsData = req.body; // Key-Value pair object
  try {
    for (const [key, val] of Object.entries(settingsData)) {
      await db.query(
        'INSERT INTO settings (settingKey, settingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE settingValue = ?',
        [key, String(val), String(val)]
      );
    }
    res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Holidays Routes
app.get('/api/holidays', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT holidayDate, description FROM holidays ORDER BY holidayDate ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/holidays', async (req, res) => {
  const { holidayDate, description } = req.body;
  try {
    await db.query(
      'INSERT INTO holidays (holidayDate, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = ?',
      [holidayDate, description, description]
    );
    res.json({ success: true, message: 'บันทึกวันหยุดสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/holidays/:holidayDate', async (req, res) => {
  const { holidayDate } = req.params;
  try {
    await db.query('DELETE FROM holidays WHERE holidayDate = ?', [holidayDate]);
    res.json({ success: true, message: 'ลบวันหยุดสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Leave Summary Report
app.post('/api/reports/summary', async (req, res) => {
  const { startDate, endDate } = req.body;
  try {
    let query = `
      SELECT 
        userId, fullName, position,
        COUNT(CASE WHEN status = 'อนุมัติ' THEN 1 END) as totalLeaves,
        SUM(CASE WHEN status = 'อนุมัติ' THEN totalDays ELSE 0 END) as totalDays
      FROM leave_data
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND startDate >= ?';
      params.push(normalizeDateToAD(startDate));
    }
    if (endDate) {
      query += ' AND startDate <= ?';
      params.push(normalizeDateToAD(endDate));
    }

    query += ' GROUP BY userId, fullName, position';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Leave Report Data for Excel export
app.get('/api/reports/all', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT fullName, position, requestDate, leaveType, startDate, endDate, totalDays, status, pdfUrl FROM leave_data ORDER BY requestDate DESC, createdAt DESC, startDate DESC'
    );
    rows.forEach(r => {
      if (r.requestDate) r.requestDate = normalizeDateToAD(r.requestDate);
      if (r.startDate) r.startDate = normalizeDateToAD(r.startDate);
      if (r.endDate) r.endDate = normalizeDateToAD(r.endDate);
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate official leave days (excluding weekends & holidays)
app.post('/api/leaves/calculate-days', async (req, res) => {
  const { startDate, endDate, leaveType, isHalfDay } = req.body;
  
  if (isHalfDay) return res.json({ days: 0.5 });
  if (!startDate || !endDate) return res.json({ days: 0 });

  const adStartDate = normalizeDateToAD(startDate);
  const adEndDate = normalizeDateToAD(endDate);

  const start = new Date(adStartDate + 'T00:00:00Z');
  const end = new Date(adEndDate + 'T00:00:00Z');

  if (end < start) return res.json({ days: 0 });

  const workDayTypes = ['ลาป่วย', 'ลากิจส่วนตัว', 'ลาพักผ่อน', 'ลาไปช่วยเหลือภริยาที่คลอดบุตร'];
  let count = 0;

  if (workDayTypes.includes(leaveType)) {
    try {
      const [holidaysRows] = await db.query('SELECT holidayDate FROM holidays');
      const holidaysList = holidaysRows.map(row => {
        return normalizeDateToAD(row.holidayDate);
      });

      let loopDate = new Date(start);
      while (loopDate <= end) {
        const dayOfWeek = loopDate.getUTCDay();
        const dateString = loopDate.toISOString().split('T')[0];
        
        // Exclude Sunday (0), Saturday (6) and holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysList.includes(dateString)) {
          count++;
        }
        loopDate.setUTCDate(loopDate.getUTCDate() + 1);
      }
    } catch (e) {
      console.error('Holiday calculation error:', e);
      // Fallback: exclude weekends only
      let loopDate = new Date(start);
      while (loopDate <= end) {
        const dayOfWeek = loopDate.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        loopDate.setUTCDate(loopDate.getUTCDate() + 1);
      }
    }
  } else {
    // Other leaves calculate all calendar days
    const diffTime = Math.abs(end - start);
    count = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  res.json({ days: count });
});

// Thai Date Formatting Helper
function formatDateThai(dateStr) {
  if (!dateStr) return '......';
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  try {
    const adDateStr = normalizeDateToAD(dateStr);
    const d = new Date(adDateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
  } catch (e) {
    return dateStr;
  }
}

// Get Attendance list for a specific date
app.get('/api/attendance', async (req, res) => {
  const rawDate = req.query.date;
  if (!rawDate) {
    return res.status(400).json({ error: 'กรุณาระบุวันที่' });
  }
  const date = normalizeDateToAD(rawDate);

  try {
    // 1. Fetch all active approved users
    const [users] = await db.query(
      "SELECT userId, fullName, position, role, staffType FROM users WHERE status = 'approved' ORDER BY fullName ASC"
    );

    // 2. Fetch saved attendance records for this date
    const [attendanceRecords] = await db.query(
      "SELECT userId, status, memoNo FROM attendance WHERE attendanceDate = ?", 
      [date]
    );
    const attendanceMap = new Map(attendanceRecords.map(r => [r.userId, { status: r.status, memoNo: r.memoNo }]));

    // 3. Fetch overlapping leaves (approved only) for this date
    const [leaves] = await db.query(
      `SELECT leaveId, userId, leaveType, status 
       FROM leave_data 
       WHERE ? BETWEEN startDate AND endDate 
         AND status = 'อนุมัติ'`,
      [date]
    );
    const leavesMap = new Map(leaves.map(l => [l.userId, l]));

    // 3b. Fetch overlapping travel requests (approved only) for this date
    const [travels] = await db.query(
      `SELECT travelId, userId, subject, status 
       FROM travel_data 
       WHERE ? BETWEEN startDate AND endDate 
         AND status IN ('อนุมัติ', 'รับทราบ')`,
      [date]
    );
    const travelsMap = new Map(travels.map(t => [t.userId, t]));

    // 4. Combine data
    const result = users.map(user => {
      const savedRecord = attendanceMap.get(user.userId);
      const savedStatus = savedRecord ? savedRecord.status : null;
      const savedMemoNo = savedRecord ? savedRecord.memoNo : null;
      const activeLeave = leavesMap.get(user.userId);
      const activeTravel = travelsMap.get(user.userId);
      
      let defaultStatus = 'มาปฏิบัติงาน';
      if (savedStatus) {
        defaultStatus = savedStatus;
      } else if (activeLeave) {
        // Auto map leave type to status
        const lt = activeLeave.leaveType;
        if (lt === 'ลาป่วย') defaultStatus = 'ลาป่วย';
        else if (lt === 'ลากิจส่วนตัว') defaultStatus = 'ลากิจ';
        else if (lt === 'ลาคลอดบุตร' || lt === 'ลาคลอด') defaultStatus = 'ลาคลอด';
        else if (lt === 'ลาพักผ่อน') defaultStatus = 'ลาพักผ่อน';
        else defaultStatus = lt; // Fallback to raw leave type
      } else if (activeTravel) {
        defaultStatus = 'เดินทางไปราชการ';
      }

      return {
        userId: user.userId,
        fullName: user.fullName,
        position: user.position,
        role: user.role,
        staffType: user.staffType,
        status: defaultStatus,
        hasSavedRecord: !!savedStatus,
        savedStatus: savedStatus,
        memoNo: savedMemoNo,
        activeLeave: activeLeave ? {
          leaveId: activeLeave.leaveId,
          leaveType: activeLeave.leaveType,
          status: activeLeave.status
        } : null,
        activeTravel: activeTravel ? {
          travelId: activeTravel.travelId,
          subject: activeTravel.subject,
          status: activeTravel.status
        } : null
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching attendance:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Save/Update Attendance records
app.post('/api/attendance', async (req, res) => {
  const { date, records, adminUserId } = req.body;

  if (!date || !records || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
  }

  const adDate = normalizeDateToAD(date);
  const updater = adminUserId || 'admin';

  try {
    // Check if the updater is an admin
    const [adminUser] = await db.query("SELECT role FROM users WHERE userId = ?", [updater]);
    const updaterRole = adminUser.length > 0 ? adminUser[0].role : 'user';

    // 1. Fetch current status map for this date
    const [existing] = await db.query(
      "SELECT userId, status, memoNo FROM attendance WHERE attendanceDate = ?", 
      [adDate]
    );
    const existingMap = new Map(existing.map(r => [r.userId, { status: r.status, memoNo: r.memoNo }]));

    // 2. Loop to save and collect notification list
    const notifications = [];

    for (const record of records) {
      const { userId, status, memoNo } = record;
      if (!userId || !status) continue;

      const prev = existingMap.get(userId);
      const prevStatus = prev ? prev.status : null;

      // VALIDATION: If previous status was "ขาด" or "ไม่ทราบสาเหตุ" and status changes, require admin role & memoNo
      if (prevStatus === 'ขาด' || prevStatus === 'ไม่ทราบสาเหตุ') {
        if (status !== prevStatus) {
          if (updaterRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ในการแก้ไขสถานะ ขาด/ไม่ทราบสาเหตุ' });
          }
          if (!memoNo || !memoNo.trim()) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกเลขที่บันทึกข้อความชี้แจงเพื่อเปลี่ยนสถานะ' });
          }
        }
      }

      // Insert or update including memoNo
      await db.query(
        `INSERT INTO attendance (userId, attendanceDate, status, updatedBy, memoNo) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
           status = VALUES(status), 
           updatedBy = VALUES(updatedBy),
           memoNo = VALUES(memoNo)`,
        [userId, adDate, status, updater, memoNo ? memoNo.trim() : (prev ? prev.memoNo : null)]
      );

      // Automatically change previous "ไม่ทราบสาเหตุ" to "ขาด" when user returns to work ("มาปฏิบัติงาน")
      if (status === 'มาปฏิบัติงาน') {
        try {
          const [updateResult] = await db.query(
            `UPDATE attendance 
             SET status = 'ขาด', updatedBy = ? 
             WHERE userId = ? 
               AND attendanceDate < ? 
               AND status = 'ไม่ทราบสาเหตุ' 
               AND (memoNo IS NULL OR memoNo = '')`,
            [updater, userId, adDate]
          );
          if (updateResult.affectedRows > 0) {
            console.log(`✅ Automatically changed ${updateResult.affectedRows} 'ไม่ทราบสาเหตุ' records to 'ขาด' for user ${userId} (returned to work)`);
          }
        } catch (dbErr) {
          console.error(`Error auto-updating 'ไม่ทราบสาเหตุ' to 'ขาด' for user ${userId}:`, dbErr.message);
        }
      }
      
      // Check for notifications on change/new status
      if (status !== prevStatus) {
        // Special condition: "ขาด", "มาสาย", "ไม่ทราบสาเหตุ" (notify immediately)
        if (['ขาด', 'มาสาย', 'ไม่ทราบสาเหตุ'].includes(status)) {
          notifications.push({
            userId,
            type: 'warning',
            message: `📢 แจ้งเตือนการปฏิบัติงาน\nตรวจพบสถานะ "${status}" ของคุณในวันที่ ${formatDateThai(adDate)}\n\nกรุณาทำบันทึกข้อความเพื่อขอเซ็นชื่อปฏิบัติหน้าที่ย้อนหลังเท่านั้นครับ`
          });
        } 
        // Special condition: "มาปฏิบัติงาน" (notify if returning from sick leave)
        else if (status === 'มาปฏิบัติงาน') {
          // Find the user's most recent attendance status before this date
          const [lastRecord] = await db.query(
            `SELECT status, attendanceDate 
             FROM attendance 
             WHERE userId = ? AND attendanceDate < ? 
             ORDER BY attendanceDate DESC LIMIT 1`,
            [userId, adDate]
          );
          if (lastRecord.length > 0 && lastRecord[0].status === 'ลาป่วย') {
            const lastSickDate = lastRecord[0].attendanceDate;

            // Check if there is already an approved/pending sick leave request covering this lastSickDate
            const [leaves] = await db.query(
              `SELECT leaveId 
               FROM leave_data 
               WHERE userId = ? AND leaveType = 'ลาป่วย' 
                 AND ? BETWEEN startDate AND endDate 
                 AND status IN ('อนุมัติ', 'รอการอนุมัติ')`,
              [userId, lastSickDate]
            );

            if (leaves.length === 0) {
              const todayDateObj = new Date(adDate);
              const tomorrowObj = new Date(todayDateObj.getTime() + 24 * 60 * 60 * 1000);
              const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

              notifications.push({
                userId,
                type: 'sick_return',
                message: `📢 แจ้งเตือนการยื่นใบลาย้อนหลัง\nเนื่องจากคุณได้กลับมาปฏิบัติหน้าที่ในวันที่ ${formatDateThai(adDate)} หลังจากลาป่วย\n\nกรุณาดำเนินการยื่นใบลาย้อนหลังในระบบให้เรียบร้อยภายใน 1 วัน (กำหนดส่งภายในวันที่ ${formatDateThai(tomorrowStr)})`
              });
            }
          }
        }
      }
    }

    // 3. Send notifications asynchronously
    if (notifications.length > 0) {
      const userIds = notifications.map(n => n.userId);
      const [users] = await db.query(
        "SELECT userId, lineUserId FROM users WHERE userId IN (?)", 
        [userIds]
      );
      const lineUserMap = new Map(users.map(u => [u.userId, u.lineUserId]));

      for (const n of notifications) {
        const lineUserId = lineUserMap.get(n.userId);
        if (lineUserId) {
          try {
            await sendLinePushMessage(lineUserId, n.message);
            console.log(`LINE Notification sent to user ${n.userId} for ${n.type}`);
          } catch (err) {
            console.error(`Error sending LINE notification to user ${n.userId}:`, err.message);
          }
        }
      }
    }

    res.json({ success: true, message: 'บันทึกข้อมูลการเข้าปฏิบัติงานเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error saving attendance:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message });
  }
});

// --- 1. Travel Permission APIs ---
app.post('/api/travel', async (req, res) => {
  const { userId, fullName, subject, destination, totalDays, budget, vehicleType, details, frontendUrl } = req.body;
  const startDate = normalizeDateToAD(req.body.startDate);
  const endDate = normalizeDateToAD(req.body.endDate);
  
  if (!userId || !fullName || !subject || !destination || !startDate || !endDate || !totalDays || !vehicleType) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const travelId = require('crypto').randomUUID();
  try {
    await db.query(
      `INSERT INTO travel_data (travelId, userId, fullName, subject, destination, startDate, endDate, totalDays, budget, vehicleType, details, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'รับทราบ')`,
      [travelId, userId, fullName, subject, destination, startDate, endDate, totalDays, budget || 0, vehicleType, details || null]
    );

    // Notify LINE Admin Group if configured
    const adminGroupId = await getSettingValue('adminGroupId');
    if (adminGroupId) {
      let finalFrontendUrl = frontendUrl || 'https://service.npc.ac.th/npc_hr/';
      if (!finalFrontendUrl.endsWith('/')) {
        finalFrontendUrl += '/';
      }
      const flexMessage = {
        "type": "bubble",
        "header": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "✈️ มีคำขอไปราชการใหม่", "weight": "bold", "size": "lg", "color": "#7c3aed" }] },
        "body": {
          "type": "box", "layout": "vertical", "contents": [
            { "type": "box", "layout": "baseline", "margin": "md", "contents": [{ "type": "text", "text": "ผู้ขอ:", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": fullName, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] },
            { "type": "box", "layout": "baseline", "margin": "md", "contents": [{ "type": "text", "text": "เรื่อง:", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": subject, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] },
            { "type": "box", "layout": "baseline", "margin": "md", "contents": [{ "type": "text", "text": "สถานที่:", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": destination, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] },
            { "type": "box", "layout": "baseline", "margin": "md", "contents": [{ "type": "text", "text": "วันที่:", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": `${formatDateThai(startDate)} ถึง ${formatDateThai(endDate)}`, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] },
            { "type": "box", "layout": "baseline", "margin": "md", "contents": [{ "type": "text", "text": "งบยืม:", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": `${parseFloat(budget || 0).toLocaleString()} บาท`, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] }
          ]
        },
        "footer": {
          "type": "box", "layout": "vertical", "contents": [
            { "type": "button", "style": "primary", "color": "#7c3aed", "action": { "type": "uri", "label": "กดเพื่อรับทราบ", "uri": `${finalFrontendUrl}index.html` } }
          ]
        }
      };
      await sendLineFlexMessage(adminGroupId, flexMessage, "มีคำขอไปราชการใหม่");
    }

    res.json({ success: true, message: 'ยื่นคำขอไปราชการสำเร็จ' });
  } catch (err) {
    console.error('Error submitting travel:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.get('/api/travel', async (req, res) => {
  const { userId, travelId } = req.query;
  try {
    let rows;
    const selectSql = `
      SELECT td.*, u.position as requesterPosition, u.staffType as requesterStaffType
      FROM travel_data td
      LEFT JOIN users u ON td.userId = u.userId
    `;
    if (travelId) {
      [rows] = await db.query(`${selectSql} WHERE td.travelId = ?`, [travelId]);
    } else if (userId) {
      [rows] = await db.query(`${selectSql} WHERE td.userId = ? ORDER BY td.createdAt DESC`, [userId]);
    } else {
      [rows] = await db.query(`${selectSql} ORDER BY td.createdAt DESC`);
    }
    rows.forEach(r => {
      if (r.startDate) r.startDate = normalizeDateToAD(r.startDate);
      if (r.endDate) r.endDate = normalizeDateToAD(r.endDate);
    });
    res.json(rows);
  } catch (err) {
    console.error('Error fetching travel data:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/travel/approve', async (req, res) => {
  const { travelId, status } = req.body; // status: 'อนุมัติ' or 'ไม่อนุมัติ'
  if (!travelId || !status) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }
  try {
    await db.query('UPDATE travel_data SET status = ? WHERE travelId = ?', [status, travelId]);

    // Notify user via LINE bot
    const [travelRows] = await db.query('SELECT userId, subject, destination FROM travel_data WHERE travelId = ?', [travelId]);
    if (travelRows.length > 0) {
      const travel = travelRows[0];
      const [userRows] = await db.query('SELECT lineUserId FROM users WHERE userId = ?', [travel.userId]);
      if (userRows.length > 0 && userRows[0].lineUserId) {
        const lineUserId = userRows[0].lineUserId;
        const emoji = status === 'อนุมัติ' ? '✅' : '❌';
        const msg = `${emoji} แจ้งเตือนการขออนุมัติเดินทางไปราชการ\n\nคำขอของคุณได้รับการพิจารณาเรียบร้อยแล้ว\n\nเรื่อง: ${travel.subject}\nปลายทาง: ${travel.destination}\nผลการพิจารณา: ${status}`;
        await sendLinePushMessage(lineUserId, msg);
      }
    }

    res.json({ success: true, message: `ดำเนินการ '${status}' เรียบร้อย` });
  } catch (err) {
    console.error('Error approving travel:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// --- 2. Travel Report APIs ---
app.post('/api/travel-report', async (req, res) => {
  const { travelId, userId, fullName, reportDetail, benefits, organizer, budget, details } = req.body;
  if (!travelId || !userId || !fullName || !reportDetail || !benefits) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const reportId = require('crypto').randomUUID();
  try {
    await db.query(
      `INSERT INTO travel_reports (reportId, travelId, userId, fullName, reportDetail, benefits, organizer, budget, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportId, travelId, userId, fullName, reportDetail, benefits, organizer || null, budget || 0.00, details || null]
    );
    res.json({ success: true, message: 'ส่งรายงานสรุปผลไปราชการสำเร็จ' });
  } catch (err) {
    console.error('Error submitting travel report:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.get('/api/travel-report', async (req, res) => {
  const { userId, reportId } = req.query;
  try {
    let rows;
    if (reportId) {
      [rows] = await db.query(
        `SELECT r.*, t.subject, t.destination, t.startDate, t.endDate, t.details AS travelRequestDetails 
         FROM travel_reports r 
         JOIN travel_data t ON r.travelId = t.travelId 
         WHERE r.reportId = ?`,
        [reportId]
      );
    } else if (userId) {
      [rows] = await db.query(
        `SELECT r.*, t.subject, t.destination, t.startDate, t.endDate, t.details AS travelRequestDetails 
         FROM travel_reports r 
         JOIN travel_data t ON r.travelId = t.travelId 
         WHERE r.userId = ? ORDER BY r.createdAt DESC`,
        [userId]
      );
    } else {
      [rows] = await db.query(
        `SELECT r.*, t.subject, t.destination, t.startDate, t.endDate, t.details AS travelRequestDetails 
         FROM travel_reports r 
         JOIN travel_data t ON r.travelId = t.travelId 
         ORDER BY r.createdAt DESC`
      );
    }
    rows.forEach(r => {
      if (r.startDate) r.startDate = normalizeDateToAD(r.startDate);
      if (r.endDate) r.endDate = normalizeDateToAD(r.endDate);
    });
    res.json(rows);
  } catch (err) {
    console.error('Error fetching travel reports:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- 2.5 Travel Clearance APIs ---
app.post('/api/travel-clearance', async (req, res) => {
  const { reportId, travelId, userId, fullName, totalSpent, totalBorrowed, details } = req.body;
  if (!reportId || !travelId || !userId || !fullName || details === undefined) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const clearanceId = require('crypto').randomUUID();
  try {
    // Delete any existing clearance for this report to overwrite/update
    await db.query('DELETE FROM travel_clearances WHERE reportId = ?', [reportId]);

    await db.query(
      `INSERT INTO travel_clearances (clearanceId, reportId, travelId, userId, fullName, totalSpent, totalBorrowed, details, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'อนุมัติแล้ว')`,
      [clearanceId, reportId, travelId, userId, fullName, totalSpent || 0.00, totalBorrowed || 0.00, details]
    );

    res.json({ success: true, message: 'ส่งเอกสารเคลียร์เงินยืมและอนุมัติเรียบร้อย' });
  } catch (err) {
    console.error('Error submitting travel clearance:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.get('/api/travel-clearance', async (req, res) => {
  const { userId, reportId, clearanceId } = req.query;
  try {
    let rows;
    if (clearanceId) {
      [rows] = await db.query('SELECT * FROM travel_clearances WHERE clearanceId = ?', [clearanceId]);
    } else if (reportId) {
      [rows] = await db.query('SELECT * FROM travel_clearances WHERE reportId = ?', [reportId]);
    } else if (userId) {
      [rows] = await db.query('SELECT * FROM travel_clearances WHERE userId = ? ORDER BY createdAt DESC', [userId]);
    } else {
      [rows] = await db.query('SELECT * FROM travel_clearances ORDER BY createdAt DESC');
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching travel clearances:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/travel-clearance/approve', async (req, res) => {
  const { clearanceId, status } = req.body; // status: 'อนุมัติแล้ว', 'ปฏิเสธ'
  if (!clearanceId || !status) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }
  try {
    await db.query('UPDATE travel_clearances SET status = ? WHERE clearanceId = ?', [status, clearanceId]);

    res.json({ success: true, message: `ดำเนินการ '${status}' เรียบร้อย` });
  } catch (err) {
    console.error('Error approving travel clearance:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.post('/api/training', async (req, res) => {
  const { userId, fullName, courseName, organizer, hours, location } = req.body;
  const startDate = normalizeDateToAD(req.body.startDate);
  const endDate = normalizeDateToAD(req.body.endDate);
  
  if (!userId || !fullName || !courseName || !organizer || !startDate || !endDate || !hours || !location) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const trainingId = require('crypto').randomUUID();
  try {
    await db.query(
      `INSERT INTO training_data (trainingId, userId, fullName, courseName, organizer, startDate, endDate, hours, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [trainingId, userId, fullName, courseName, organizer, startDate, endDate, hours, location]
    );
    res.json({ success: true, message: 'บันทึกประวัติการอบรมสำเร็จ' });
  } catch (err) {
    console.error('Error submitting training record:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.get('/api/training', async (req, res) => {
  const { userId } = req.query;
  try {
    let rows;
    if (userId) {
      [rows] = await db.query('SELECT * FROM training_data WHERE userId = ? ORDER BY createdAt DESC', [userId]);
    } else {
      [rows] = await db.query('SELECT * FROM training_data ORDER BY createdAt DESC');
    }
    rows.forEach(r => {
      if (r.startDate) r.startDate = normalizeDateToAD(r.startDate);
      if (r.endDate) r.endDate = normalizeDateToAD(r.endDate);
    });
    res.json(rows);
  } catch (err) {
    console.error('Error fetching training records:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- 4. College Activities APIs ---
app.get('/api/activities', async (req, res) => {
  const { userId } = req.query;
  try {
    const [acts] = await db.query('SELECT * FROM activities ORDER BY activityDate DESC');
    
    // If userId provided, check which activities they have registered for
    let registrations = [];
    if (userId) {
      const [regs] = await db.query('SELECT activityId FROM activity_participants WHERE userId = ?', [userId]);
      registrations = regs.map(r => r.activityId);
    }

    const result = acts.map(act => ({
      ...act,
      isRegistered: registrations.includes(act.activityId)
    }));

    result.forEach(act => {
      if (act.activityDate) act.activityDate = normalizeDateToAD(act.activityDate);
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching activities:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities', async (req, res) => {
  const { activityName, location } = req.body;
  const activityDate = normalizeDateToAD(req.body.activityDate);
  
  if (!activityName || !activityDate || !location) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  const activityId = require('crypto').randomUUID();
  try {
    await db.query(
      'INSERT INTO activities (activityId, activityName, activityDate, location) VALUES (?, ?, ?, ?)',
      [activityId, activityName, activityDate, location]
    );
    res.json({ success: true, message: 'สร้างกิจกรรมใหม่สำเร็จ' });
  } catch (err) {
    console.error('Error creating activity:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.post('/api/activities/register', async (req, res) => {
  const { activityId, userId, fullName, position } = req.body;
  if (!activityId || !userId || !fullName || !position) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }
  try {
    await db.query(
      'INSERT INTO activity_participants (activityId, userId, fullName, position) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE registeredAt = CURRENT_TIMESTAMP',
      [activityId, userId, fullName, position]
    );
    res.json({ success: true, message: 'ยืนยันการเข้าร่วมกิจกรรมสำเร็จ' });
  } catch (err) {
    console.error('Error registering for activity:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.get('/api/activities/participants/:activityId', async (req, res) => {
  const { activityId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT fullName, position, registeredAt FROM activity_participants WHERE activityId = ? ORDER BY registeredAt ASC',
      [activityId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching activity participants:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Initialize database tables
(async () => {
  try {
    // 1. attendance
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        attendanceId INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(50) NOT NULL,
        attendanceDate DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        updatedBy VARCHAR(50) NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        memoNo VARCHAR(100) DEFAULT NULL,
        UNIQUE KEY unique_user_date (userId, attendanceDate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Alter table to add memoNo if it exists but is missing the column
    try {
      const [cols] = await db.query("SHOW COLUMNS FROM attendance LIKE 'memoNo'");
      if (cols.length === 0) {
        await db.query("ALTER TABLE attendance ADD COLUMN memoNo VARCHAR(100) DEFAULT NULL");
        console.log("✅ Added column 'memoNo' to 'attendance' table successfully.");
      }
    } catch (colErr) {
      console.error("⚠️ Error checking/adding column 'memoNo':", colErr.message);
    }

    // 2. travel_data
    await db.query(`
      CREATE TABLE IF NOT EXISTS travel_data (
        travelId VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50) NOT NULL,
        fullName VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        totalDays DECIMAL(5, 2) NOT NULL,
        budget DECIMAL(10, 2) DEFAULT 0.00,
        vehicleType VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'รอการอนุมัติ',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. travel_reports
    await db.query(`
      CREATE TABLE IF NOT EXISTS travel_reports (
        reportId VARCHAR(50) PRIMARY KEY,
        travelId VARCHAR(50) NOT NULL,
        userId VARCHAR(50) NOT NULL,
        fullName VARCHAR(100) NOT NULL,
        reportDetail TEXT NOT NULL,
        benefits TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. training_data
    await db.query(`
      CREATE TABLE IF NOT EXISTS training_data (
        trainingId VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50) NOT NULL,
        fullName VARCHAR(100) NOT NULL,
        courseName VARCHAR(255) NOT NULL,
        organizer VARCHAR(255) NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        hours DECIMAL(5, 2) NOT NULL,
        location VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. activities
    await db.query(`
      CREATE TABLE IF NOT EXISTS activities (
        activityId VARCHAR(50) PRIMARY KEY,
        activityName VARCHAR(255) NOT NULL,
        activityDate DATE NOT NULL,
        location VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. activity_participants
    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        activityId VARCHAR(50) NOT NULL,
        userId VARCHAR(50) NOT NULL,
        fullName VARCHAR(100) NOT NULL,
        position VARCHAR(100) NOT NULL,
        registeredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_activity (activityId, userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ All portal database tables verified/created successfully.');
  } catch (err) {
    console.error('Error creating portal tables:', err.message);
  }
})();

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
