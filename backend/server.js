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

// --- API ROUTES ---

// 1. Authentication Routes

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { fullName, position, username, password, lineUserId } = req.body;
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
      'INSERT INTO users (userId, fullName, position, username, password, role, status, lineUserId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, fullName, position, username, hashedPassword, role, status, lineUserId || null]
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

    res.json({
      success: true,
      user: {
        userId: user.userId,
        fullName: user.fullName,
        position: user.position,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ: ' + error.message });
  }
});

// 2. User Management (Admin Only)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT userId, fullName, position, username, role, status, lineUserId, createdAt FROM users ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const { fullName, position, password, role } = req.body;
  try {
    if (password && password.trim() !== '') {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.query(
        'UPDATE users SET fullName = ?, position = ?, password = ?, role = ? WHERE userId = ?',
        [fullName, position, hashedPassword, role, userId]
      );
    } else {
      await db.query(
        'UPDATE users SET fullName = ?, position = ?, role = ? WHERE userId = ?',
        [fullName, position, role, userId]
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
          'INSERT INTO users (userId, fullName, position, username, password, role, status, lineUserId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, u.fullName || '', u.position || '', u.username, hashedPassword, 'user', 'approved', '']
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
    
    const requestDate = leaveData.requestDate || new Date().toISOString().split('T')[0];
    
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
        leaveData.startDate,
        leaveData.endDate,
        leaveData.totalDays,
        leaveData.lastLeaveType || '',
        leaveData.lastLeaveStartDate || null,
        leaveData.lastLeaveEndDate || null,
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
            { "type": "button", "style": "primary", "color": "#2E3A59", "action": { "type": "uri", "label": "ตรวจสอบ / อนุมัติ", "uri": `${leaveData.frontendUrl || 'https://nipon.github.io/npc_eleve/'}` } }
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
  const { role, userId, filterUserId, filterStartDate, filterEndDate } = req.body;
  try {
    let query = 'SELECT * FROM leave_data WHERE 1=1';
    const params = [];

    if (role !== 'admin') {
      query += ' AND userId = ?';
      params.push(userId);
    } else if (filterUserId && filterUserId !== 'all') {
      query += ' AND userId = ?';
      params.push(filterUserId);
    }

    if (filterStartDate) {
      query += ' AND startDate >= ?';
      params.push(filterStartDate);
    }
    if (filterEndDate) {
      query += ' AND startDate <= ?';
      params.push(filterEndDate);
    }

    query += ' ORDER BY createdAt DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Last Approved Leave for a User
app.get('/api/leaves/last-approved/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT leaveType, startDate, endDate, totalDays FROM leave_data WHERE userId = ? AND status = 'อนุมัติ' ORDER BY startDate DESC LIMIT 1",
      [userId]
    );
    if (rows.length > 0) {
      res.json(rows[0]);
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
  const beforeDate = req.query.beforeDate || new Date().toISOString().split('T')[0];
  
  try {
    const d = new Date(beforeDate);
    if (isNaN(d.getTime())) {
      return res.status(400).json({ error: 'Invalid beforeDate parameter' });
    }
    
    const year = d.getFullYear();
    const month = d.getMonth();
    let startYear;
    if (month >= 9) { // Oct - Dec (months 10, 11, 12: 0-indexed 9, 10, 11)
      startYear = year;
    } else { // Jan - Sep (months 1-9: 0-indexed 0 to 8)
      startYear = year - 1;
    }
    const fiscalStart = `${startYear}-10-01`;
    
    // Fetch all approved leaves for the user in the current fiscal year before this date
    const [rows] = await db.query(
      `SELECT leaveType, totalDays 
       FROM leave_data 
       WHERE userId = ? 
         AND status = 'อนุมัติ' 
         AND startDate >= ? 
         AND startDate < ?`,
      [userId, fiscalStart, beforeDate]
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
      res.json(rows[0]);
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
    // e.g. https://nipon.github.io/npc_eleve/print_template.html?leaveId=xxxx
    const finalFrontendUrl = frontendUrl || 'https://nipon.github.io/npc_eleve/';
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
  try {
    const [[{ totalStaff }]] = await db.query('SELECT COUNT(*) as totalStaff FROM users WHERE role = "user" AND status = "approved"');
    
    const [statusCounts] = await db.query(
      `SELECT 
        SUM(CASE WHEN status = 'อนุมัติ' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'รอการอนุมัติ' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'ไม่อนุมัติ' THEN 1 ELSE 0 END) as rejected
       FROM leave_data`
    );

    const [leaveTypes] = await db.query(
      'SELECT leaveType, COUNT(*) as count FROM leave_data GROUP BY leaveType'
    );

    // Monthly stats for current year
    const [monthlyStats] = await db.query(
      `SELECT MONTH(startDate) as month, COUNT(*) as count 
       FROM leave_data 
       WHERE YEAR(startDate) = YEAR(CURDATE())
       GROUP BY MONTH(startDate)`
    );

    const monthlyCounts = Array(12).fill(0);
    monthlyStats.forEach(item => {
      if (item.month >= 1 && item.month <= 12) {
        monthlyCounts[item.month - 1] = item.count;
      }
    });

    const [recentLeaves] = await db.query(
      'SELECT fullName, leaveType, startDate, endDate, totalDays, status, pdfUrl FROM leave_data ORDER BY createdAt DESC LIMIT 10'
    );

    res.json({
      stats: {
        totalStaff: totalStaff || 0,
        approved: statusCounts[0].approved || 0,
        pending: statusCounts[0].pending || 0,
        rejected: statusCounts[0].rejected || 0
      },
      charts: {
        leaveTypeData: {
          labels: leaveTypes.map(lt => lt.leaveType),
          data: leaveTypes.map(lt => lt.count)
        },
        monthlyLeaveData: {
          labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
          data: monthlyCounts
        }
      },
      recentLeaves
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
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND startDate <= ?';
      params.push(endDate);
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
      'SELECT fullName, position, requestDate, leaveType, startDate, endDate, totalDays, status, pdfUrl FROM leave_data ORDER BY createdAt DESC'
    );
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

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);

  if (end < start) return res.json({ days: 0 });

  const workDayTypes = ['ลาป่วย', 'ลากิจส่วนตัว', 'ลาพักผ่อน', 'ลาไปช่วยเหลือภริยาที่คลอดบุตร'];
  let count = 0;

  if (workDayTypes.includes(leaveType)) {
    try {
      const [holidaysRows] = await db.query('SELECT holidayDate FROM holidays');
      const holidaysList = holidaysRows.map(row => {
        const d = new Date(row.holidayDate);
        return d.toISOString().split('T')[0];
      });

      let loopDate = new Date(start);
      while (loopDate <= end) {
        const dayOfWeek = loopDate.getDay();
        const dateString = loopDate.toISOString().split('T')[0];
        
        // Exclude Sunday (0), Saturday (6) and holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysList.includes(dateString)) {
          count++;
        }
        loopDate.setDate(loopDate.getDate() + 1);
      }
    } catch (e) {
      console.error('Holiday calculation error:', e);
      // Fallback: exclude weekends only
      let loopDate = new Date(start);
      while (loopDate <= end) {
        const dayOfWeek = loopDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        loopDate.setDate(loopDate.getDate() + 1);
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
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch (e) {
    return dateStr;
  }
}

// Get Attendance list for a specific date
app.get('/api/attendance', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'กรุณาระบุวันที่' });
  }

  try {
    // 1. Fetch all active approved users
    const [users] = await db.query(
      "SELECT userId, fullName, position, role FROM users WHERE status = 'approved' ORDER BY fullName ASC"
    );

    // 2. Fetch saved attendance records for this date
    const [attendanceRecords] = await db.query(
      "SELECT userId, status FROM attendance WHERE attendanceDate = ?", 
      [date]
    );
    const attendanceMap = new Map(attendanceRecords.map(r => [r.userId, r.status]));

    // 3. Fetch overlapping leaves (approved or pending) for this date
    const [leaves] = await db.query(
      `SELECT leaveId, userId, leaveType, status 
       FROM leave_data 
       WHERE ? BETWEEN startDate AND endDate 
         AND status IN ('อนุมัติ', 'รอการอนุมัติ')`,
      [date]
    );
    const leavesMap = new Map(leaves.map(l => [l.userId, l]));

    // 4. Combine data
    const result = users.map(user => {
      const savedStatus = attendanceMap.get(user.userId);
      const activeLeave = leavesMap.get(user.userId);
      
      let defaultStatus = 'มาปฏิบัติงาน';
      if (savedStatus) {
        defaultStatus = savedStatus;
      } else if (activeLeave) {
        // Auto map leave type to status
        const lt = activeLeave.leaveType;
        if (lt === 'ลาป่วย') defaultStatus = 'ลาป่วย';
        else if (lt === 'ลากิจส่วนตัว') defaultStatus = 'ลากิจ';
        else if (lt === 'ลาคลอดบุตร') defaultStatus = 'ลาคลอด';
        else if (lt === 'ลาพักผ่อน') defaultStatus = 'ลาพักผ่อน';
        else defaultStatus = lt; // Fallback to raw leave type
      }

      return {
        userId: user.userId,
        fullName: user.fullName,
        position: user.position,
        role: user.role,
        status: defaultStatus,
        hasSavedRecord: !!savedStatus,
        activeLeave: activeLeave ? {
          leaveId: activeLeave.leaveId,
          leaveType: activeLeave.leaveType,
          status: activeLeave.status
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

  const updater = adminUserId || 'admin';

  try {
    // 1. Fetch current status map for this date
    const [existing] = await db.query(
      "SELECT userId, status FROM attendance WHERE attendanceDate = ?", 
      [date]
    );
    const existingMap = new Map(existing.map(r => [r.userId, r.status]));

    // 2. Loop to save and collect notification list
    const notifications = [];

    for (const record of records) {
      const { userId, status } = record;
      if (!userId || !status) continue;

      const prevStatus = existingMap.get(userId);

      // Insert or update
      await db.query(
        `INSERT INTO attendance (userId, attendanceDate, status, updatedBy) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
           status = VALUES(status), 
           updatedBy = VALUES(updatedBy)`,
        [userId, date, status, updater]
      );

      // Check for notifications on change/new status
      if (status !== prevStatus) {
        // Special condition: "ขาด", "มาสาย", "ไม่ทราบสาเหตุ" (notify immediately)
        if (['ขาด', 'มาสาย', 'ไม่ทราบสาเหตุ'].includes(status)) {
          notifications.push({
            userId,
            type: 'warning',
            message: `📢 แจ้งเตือนการปฏิบัติงาน\nตรวจพบสถานะ "${status}" ของคุณในวันที่ ${formatDateThai(date)}\n\nกรุณาทำบันทึกข้อความเพื่อขอเซ็นชื่อปฏิบัติหน้าที่ย้อนหลังเท่านั้นครับ`
          });
        } 
        // Special condition: "มาปฏิบัติงาน" (notify if returning from sick leave)
        else if (status === 'มาปฏิบัติงาน') {
          // Find the user's most recent attendance status before this date
          const [lastRecord] = await db.query(
            `SELECT status 
             FROM attendance 
             WHERE userId = ? AND attendanceDate < ? 
             ORDER BY attendanceDate DESC LIMIT 1`,
            [userId, date]
          );
          if (lastRecord.length > 0 && lastRecord[0].status === 'ลาป่วย') {
            notifications.push({
              userId,
              type: 'sick_return',
              message: `📢 แจ้งเตือนการยื่นใบลาป่วย\nเนื่องจากคุณกลับมาปฏิบัติหน้าที่แล้วหลังจากลาป่วยในวันที่ผ่านมา\n\nขอความกรุณายื่นใบลาเข้าระบบภายใน 1 วันหลังจากกลับมาปฏิบัติหน้าที่แล้วครับ`
            });
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
  const { userId, fullName, subject, destination, startDate, endDate, totalDays, budget, vehicleType } = req.body;
  if (!userId || !fullName || !subject || !destination || !startDate || !endDate || !totalDays || !vehicleType) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const travelId = require('crypto').randomUUID();
  try {
    await db.query(
      `INSERT INTO travel_data (travelId, userId, fullName, subject, destination, startDate, endDate, totalDays, budget, vehicleType, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'รอการอนุมัติ')`,
      [travelId, userId, fullName, subject, destination, startDate, endDate, totalDays, budget || 0, vehicleType]
    );
    res.json({ success: true, message: 'ยื่นคำขอไปราชการสำเร็จ' });
  } catch (err) {
    console.error('Error submitting travel:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.get('/api/travel', async (req, res) => {
  const { userId } = req.query;
  try {
    let rows;
    if (userId) {
      [rows] = await db.query('SELECT * FROM travel_data WHERE userId = ? ORDER BY createdAt DESC', [userId]);
    } else {
      [rows] = await db.query('SELECT * FROM travel_data ORDER BY createdAt DESC');
    }
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
    res.json({ success: true, message: `ดำเนินการ '${status}' เรียบร้อย` });
  } catch (err) {
    console.error('Error approving travel:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// --- 2. Travel Report APIs ---
app.post('/api/travel-report', async (req, res) => {
  const { travelId, userId, fullName, reportDetail, benefits } = req.body;
  if (!travelId || !userId || !fullName || !reportDetail || !benefits) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const reportId = require('crypto').randomUUID();
  try {
    await db.query(
      `INSERT INTO travel_reports (reportId, travelId, userId, fullName, reportDetail, benefits)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [reportId, travelId, userId, fullName, reportDetail, benefits]
    );
    res.json({ success: true, message: 'ส่งรายงานสรุปผลไปราชการสำเร็จ' });
  } catch (err) {
    console.error('Error submitting travel report:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

app.get('/api/travel-report', async (req, res) => {
  const { userId } = req.query;
  try {
    let rows;
    if (userId) {
      [rows] = await db.query(
        `SELECT r.*, t.subject, t.destination, t.startDate, t.endDate 
         FROM travel_reports r 
         JOIN travel_data t ON r.travelId = t.travelId 
         WHERE r.userId = ? ORDER BY r.createdAt DESC`,
        [userId]
      );
    } else {
      [rows] = await db.query(
        `SELECT r.*, t.subject, t.destination, t.startDate, t.endDate 
         FROM travel_reports r 
         JOIN travel_data t ON r.travelId = t.travelId 
         ORDER BY r.createdAt DESC`
      );
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching travel reports:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- 3. Training Record APIs ---
app.post('/api/training', async (req, res) => {
  const { userId, fullName, courseName, organizer, startDate, endDate, hours, location } = req.body;
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

    res.json(result);
  } catch (err) {
    console.error('Error fetching activities:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities', async (req, res) => {
  const { activityName, activityDate, location } = req.body;
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
        UNIQUE KEY unique_user_date (userId, attendanceDate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

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
