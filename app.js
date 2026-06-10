// ================================================================= */
//                     FRONTEND CONTROLLER (Vanilla JS)              */
//                     ระบบบริหารจัดการการลา วิทยาลัยสารพัดช่างน่าน             */
// ================================================================= */

// Automatically detect backend API domain
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://service.npc.ac.th/npc_eleve_backend'; // Replace with your production Node.js API domain

let currentUser = null;
let settings = {};
let holidaysList = [];
let leaveTypeChartInstance = null;
let monthlyLeaveChartInstance = null;
let signaturePad = null;
let adminSignaturePad = null;

// Page Routing
const pages = document.querySelectorAll('.page');
function showPage(pageId) {
  pages.forEach(p => {
    if (p.id === pageId) {
      p.classList.remove('hidden');
    } else {
      p.classList.add('hidden');
    }
  });
  
  // Update nav active link state
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-page') === pageId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  window.scrollTo(0, 0);
  
  // Close mobile menu if open
  document.getElementById('mobile-menu').classList.add('hidden');
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
  // Mobile menu button
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  // Home logo link
  document.getElementById('home-link').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('dashboard-page');
    if (currentUser) loadDashboardData();
  });

  // Authentication buttons
  document.getElementById('login-btn').addEventListener('click', showLoginModal);
  document.getElementById('register-btn').addEventListener('click', showRegisterModal);

  // Forms submit & events
  document.getElementById('leave-request-form').addEventListener('submit', handleLeaveSubmit);
  document.getElementById('export-excel-btn').addEventListener('click', handleExportExcel);
  document.getElementById('import-excel-input').addEventListener('change', handleImportExcel);
  document.getElementById('print-report-btn').addEventListener('click', handlePrintReport);
  
  // Automatic date calculations
  const sd = document.getElementById('form-start-date');
  const ed = document.getElementById('form-end-date');
  const lt = document.getElementById('form-leave-type');
  const handleDateOrTypeChange = async () => {
    await calculateLeaveDays();
    await updateLeaveStatsTable();
  };
  [sd, ed, lt].forEach(el => el.addEventListener('change', handleDateOrTypeChange));
  document.querySelectorAll('input[name="dayType"]').forEach(el => {
    el.addEventListener('change', handleDateOrTypeChange);
  });
  
  document.getElementById('form-last-start-date').addEventListener('change', calculateLastLeaveDays);
  document.getElementById('form-last-end-date').addEventListener('change', calculateLastLeaveDays);

  // Setup signature pad
  const canvas = document.getElementById('signature-pad');
  signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });
  document.getElementById('clear-signature').addEventListener('click', () => signaturePad.clear());
  document.getElementById('upload-signature').addEventListener('change', e => processSignatureFile(e.target.files[0]));
  
  // Signature Drag & Drop zones
  const uploadZone = document.getElementById('upload-zone');
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => { 
    e.preventDefault(); 
    uploadZone.classList.remove('drag-over'); 
    if (e.dataTransfer.files.length) processSignatureFile(e.dataTransfer.files[0]); 
  });
  
  window.addEventListener('resize', resizeCanvas);

  // Load Initial Settings & Session
  showLoading('กำลังดาวน์โหลดข้อมูลเริ่มต้น...');
  try {
    // Fetch Settings
    const setRes = await fetch(`${API_BASE_URL}/api/settings`);
    settings = await setRes.json();
    
    // Check local session
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      updateUIAfterLogin();
    } else {
      updateUIAfterLogout();
    }
    
    loadDashboardData();
    Swal.close();
  } catch (err) {
    showError("เกิดข้อผิดพลาดในการเชื่อมต่อหลังบ้าน: " + err.message);
    updateUIAfterLogout();
    loadDashboardData();
  }
});

// Resizing Canvas for Signature Pad
function resizeCanvas() {
  const canvas = document.getElementById('signature-pad');
  if (canvas && canvas.offsetParent) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 160;
    signaturePad.clear(); // clears the canvas on resize
  }
}

// Process manual signature upload
function processSignatureFile(file) {
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      signaturePad.fromDataURL(e.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    showError('กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น');
  }
}

// --- Auth Functions ---

function showLoginModal() {
  Swal.fire({
    title: 'เข้าสู่ระบบ',
    html: `
      <div style="text-align: left;">
        <label class="form-label">ชื่อผู้ใช้ (Username)</label>
        <input id="login-u" class="form-input mb-4" style="margin-bottom:15px;" placeholder="Username">
        <label class="form-label">รหัสผ่าน (Password)</label>
        <input id="login-p" type="password" class="form-input" placeholder="Password">
      </div>
    `,
    confirmButtonText: 'เข้าสู่ระบบ',
    showCancelButton: true,
    cancelButtonText: 'ยกเลิก',
    preConfirm: () => {
      const u = document.getElementById('login-u').value;
      const p = document.getElementById('login-p').value;
      if (!u || !p) {
        Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
      }
      return { username: u, password: p };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('กำลังเข้าสู่ระบบ...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const data = await res.json();
        
        if (data.success) {
          currentUser = data.user;
          sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
          updateUIAfterLogin();
          
          Swal.fire({
            icon: 'success',
            title: 'เข้าสู่ระบบสำเร็จ',
            showConfirmButton: false,
            timer: 1500
          });
          
          showPage('dashboard-page');
          loadDashboardData();
        } else {
          showError(data.message);
        }
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message);
      }
    }
  });
}

function showRegisterModal() {
  Swal.fire({
    title: 'ลงทะเบียนเข้าใช้งาน',
    html: `
      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">ชื่อ-นามสกุล</label>
          <input id="reg-fn" class="form-input" placeholder="เช่น นายสมชาย ใจดี">
        </div>
        <div>
          <label class="form-label">ตำแหน่ง</label>
          <input id="reg-pos" class="form-input" placeholder="เช่น ครูวิทยฐานะชำนาญการพิเศษ">
        </div>
        <div>
          <label class="form-label">ชื่อผู้ใช้ (ภาษาอังกฤษ)</label>
          <input id="reg-ru" class="form-input" placeholder="Username สำหรับเข้าสู่ระบบ">
        </div>
        <div>
          <label class="form-label">รหัสผ่าน</label>
          <input id="reg-rp" type="password" class="form-input" placeholder="Password">
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>การเชื่อมต่อ LINE User ID (สำคัญมากเพื่อรับแจ้งเตือน)</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold;">💬 ขอรับรหัส LINE ID</a>
          </label>
          <input id="reg-lid" class="form-input" placeholder="กรอกรหัสผู้ใช้ไลน์ของคุณ (เริ่มต้นด้วย U...)">
          <p style="font-size:10px; color:var(--secondary); margin-top:4px;">*กดปุ่มเขียวแอดบอทไลน์ -> พิมพ์คำว่า "ขอ ID" ในช่องแชท -> นำรหัสที่ได้มาวางช่องนี้</p>
        </div>
      </div>
    `,
    confirmButtonText: 'ลงทะเบียน',
    showCancelButton: true,
    cancelButtonText: 'ยกเลิก',
    preConfirm: () => {
      const fn = document.getElementById('reg-fn').value;
      const pos = document.getElementById('reg-pos').value;
      const ru = document.getElementById('reg-ru').value;
      const rp = document.getElementById('reg-rp').value;
      const lid = document.getElementById('reg-lid').value.trim();

      if (!fn || !pos || !ru || !rp) {
        Swal.showValidationMessage('กรุณากรอกข้อมูลหลักให้ครบถ้วน');
      }
      return { fullName: fn, position: pos, username: ru, password: rp, lineUserId: lid };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('กำลังลงทะเบียน...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const data = await res.json();
        
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'ลงทะเบียนสำเร็จ',
            text: data.message,
            confirmButtonText: 'ตกลง'
          });
        } else {
          showError(data.message);
        }
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
      }
    }
  });
}

function handleLogout() {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  updateUIAfterLogout();
  Swal.fire({
    icon: 'info',
    title: 'ออกจากระบบเรียบร้อย',
    showConfirmButton: false,
    timer: 1500
  });
  showPage('dashboard-page');
  loadDashboardData();
}

function updateUIAfterLogin() {
  document.getElementById('auth-buttons').classList.add('hidden');
  const userMenu = document.getElementById('user-menu');
  userMenu.classList.remove('hidden');
  
  // Render user profile dropdown
  userMenu.innerHTML = `
    <div class="user-menu-relative">
      <button class="user-menu-btn" id="user-menu-trigger">
        <div class="user-avatar">${currentUser.fullName.charAt(0)}</div>
      </button>
      <div id="user-dropdown" class="user-dropdown hidden">
        <div class="user-dropdown-header">
          <p class="user-dropdown-name">${currentUser.fullName}</p>
          <span class="user-dropdown-role">${currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'บุคลากร'}</span>
        </div>
        <div id="user-dropdown-items"></div>
        <button id="logout-btn" class="user-dropdown-item logout">ออกจากระบบ</button>
      </div>
    </div>
  `;

  // Menu clicks
  document.getElementById('user-menu-trigger').onclick = (e) => {
    e.stopPropagation();
    document.getElementById('user-dropdown').classList.toggle('hidden');
  };
  
  document.addEventListener('click', () => {
    const drop = document.getElementById('user-dropdown');
    if (drop) drop.classList.add('hidden');
  });

  document.getElementById('logout-btn').onclick = handleLogout;
  
  buildNavigation();
}

function updateUIAfterLogout() {
  document.getElementById('auth-buttons').classList.remove('hidden');
  document.getElementById('user-menu').classList.add('hidden');
  buildNavigation();
}

function buildNavigation() {
  const navMenu = document.getElementById('nav-menu');
  const mobileNav = document.getElementById('mobile-nav-links');
  navMenu.innerHTML = '';
  mobileNav.innerHTML = '';

  let menuItems = [
    { text: 'แดชบอร์ด', page: 'dashboard-page', action: loadDashboardData }
  ];

  if (currentUser) {
    menuItems.push({ text: 'บันทึกการลา', page: 'leave-form-page', action: prepareLeaveForm });
    menuItems.push({ text: 'ประวัติการลา', page: 'history-page', action: loadHistory });
    
    if (currentUser.role === 'admin') {
      menuItems.push(
        { text: 'พิจารณาอนุมัติ', page: 'approval-page', action: loadApprovalPage },
        { text: 'รายงานสรุป', page: 'report-page', action: loadReportPage },
        { text: 'จัดการผู้ใช้งาน', page: 'user-management-page', action: loadUserManagementPage }
      );
    }
  }

  menuItems.forEach(item => {
    // Desktop Nav
    const dLink = document.createElement('a');
    dLink.textContent = item.text;
    dLink.className = 'nav-link';
    dLink.setAttribute('data-page', item.page);
    dLink.onclick = (e) => {
      e.preventDefault();
      showPage(item.page);
      if (item.action) item.action();
    };
    navMenu.appendChild(dLink);

    // Mobile Nav
    const mLink = document.createElement('a');
    mLink.textContent = item.text;
    mLink.className = 'nav-link';
    mLink.style.display = 'block';
    mLink.style.padding = '12px 16px';
    mLink.onclick = (e) => {
      e.preventDefault();
      showPage(item.page);
      if (item.action) item.action();
    };
    mobileNav.appendChild(mLink);
  });

  // Populate Dropdown items if user logged in
  if (currentUser) {
    const dropdownItems = document.getElementById('user-dropdown-items');
    dropdownItems.innerHTML = '';
    
    // Add same navigation items into user dropdown for convenience
    menuItems.slice(1).forEach(item => {
      const dropLink = document.createElement('button');
      dropLink.className = 'user-dropdown-item';
      dropLink.textContent = item.text;
      dropLink.onclick = () => {
        showPage(item.page);
        if (item.action) item.action();
      };
      dropdownItems.appendChild(dropLink);
    });
  }
}

// --- Dashboard Loading ---

async function loadDashboardData() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard`);
    const d = await res.json();
    
    if (d && d.stats) {
      document.getElementById('stat-total-staff').textContent = d.stats.totalStaff;
      document.getElementById('stat-approved').textContent = d.stats.approved;
      document.getElementById('stat-pending').textContent = d.stats.pending;
      document.getElementById('stat-rejected').textContent = d.stats.rejected;
      
      // Render Charts
      renderCharts(d.charts);
      
      // Render Recent Leaves Table
      const tb = document.getElementById('recent-leaves-table');
      tb.innerHTML = '';
      if (!d.recentLeaves.length) {
        tb.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--neutral-400); padding:24px;">ไม่มีข้อมูลคำขอลาล่าสุด</td></tr>`;
      } else {
        d.recentLeaves.forEach(l => {
          tb.innerHTML += `
            <tr>
              <td style="font-weight: 500;">${l.fullName}</td>
              <td>${l.leaveType}</td>
              <td>${formatDate(l.startDate)} - ${formatDate(l.endDate)}</td>
              <td style="text-align: center; font-weight: bold;">${l.totalDays}</td>
              <td>${renderBadge(l.status)}</td>
              <td>
                ${l.pdfUrl ? `<a href="${l.pdfUrl}" target="_blank" style="color:var(--primary); font-weight:600;">พิมพ์ใบลา</a>` : '-'}
              </td>
            </tr>
          `;
        });
      }
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

// --- Leave Request Form ---

async function prepareLeaveForm() {
  if (!currentUser) return showLoginModal();
  
  // Reset Form
  document.getElementById('leave-request-form').reset();
  signaturePad.clear();
  
  // Prefill School Name and Details
  document.getElementById('form-school-name').value = settings.schoolName || 'วิทยาลัยสารพัดช่างน่าน';
  document.getElementById('form-request-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('form-user-name').value = currentUser.fullName;
  document.getElementById('form-user-position').value = currentUser.position;

  // Retrieve last approved leave to auto fill history table
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaves/last-approved/${currentUser.userId}`);
    const l = await res.json();
    
    const sel = document.getElementById('form-last-leave-type');
    if (l) {
      // Find and select matching leave type
      let found = false;
      const targetText = "ได้ " + l.leaveType;
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].text === targetText) {
          sel.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        sel.value = l.leaveType;
      }
      
      document.getElementById('form-last-start-date').value = l.startDate ? l.startDate.split('T')[0] : '';
      document.getElementById('form-last-end-date').value = l.endDate ? l.endDate.split('T')[0] : '';
      document.getElementById('form-last-total-days').value = l.totalDays;
    } else {
      sel.value = "ไม่ได้ลาในรอบครึ่งปีก่อน";
      document.getElementById('form-last-start-date').value = '';
      document.getElementById('form-last-end-date').value = '';
      document.getElementById('form-last-total-days').value = '0';
    }
  } catch (err) {
    console.error('Error loading last leave data:', err);
  }

  // Update leave stats table
  await updateLeaveStatsTable();
  
  // Handle canvas scaling
  setTimeout(resizeCanvas, 300);
}

// Calculate Official Leave Days via Node.js API
async function calculateLeaveDays() {
  const s = document.getElementById('form-start-date').value;
  const e = document.getElementById('form-end-date').value;
  const t = document.getElementById('form-leave-type').value;
  
  let isHalfDay = false;
  document.querySelectorAll('input[name="dayType"]').forEach(el => {
    if (el.checked && el.value !== 'full') isHalfDay = true;
  });

  if (isHalfDay) {
    document.getElementById('form-total-days').value = 0.5;
    return;
  }

  if (!s || !e) return;
  
  if (!t) {
    // Normal calendar days calculation as fallback if type not selected
    const diffTime = Math.abs(new Date(e) - new Date(s));
    document.getElementById('form-total-days').value = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return;
  }

  document.getElementById('form-total-days').value = 'คำนวณ...';
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaves/calculate-days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: s, endDate: e, leaveType: t, isHalfDay })
    });
    const result = await res.json();
    document.getElementById('form-total-days').value = result.days;
  } catch (err) {
    console.error(err);
    document.getElementById('form-total-days').value = 'Error';
  }
}

// Calculate Last Leave Days on date changes
function calculateLastLeaveDays() {
  const s = document.getElementById('form-last-start-date').value;
  const e = document.getElementById('form-last-end-date').value;
  if (s && e) {
    const diffTime = Math.abs(new Date(e) - new Date(s));
    document.getElementById('form-last-total-days').value = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}

// Update Leave Statistics Table in the Form
async function updateLeaveStatsTable() {
  if (!currentUser) return;
  
  const s = document.getElementById('form-start-date').value || new Date().toISOString().split('T')[0];
  const t = document.getElementById('form-leave-type').value;
  const currDays = parseFloat(document.getElementById('form-total-days').value) || 0;
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaves/stats/${currentUser.userId}?beforeDate=${s}`);
    const stats = await res.json();
    
    // 1. Sick Leave (ลาป่วย)
    const prevSickCount = stats["ป่วย"].count;
    const prevSickDays = stats["ป่วย"].days;
    const currSickCount = t === 'ลาป่วย' && currDays > 0 ? 1 : 0;
    const currSickDays = t === 'ลาป่วย' ? currDays : 0;
    
    document.getElementById('stats-sick-prev').textContent = `${prevSickCount} ครั้ง / ${prevSickDays.toFixed(1).replace('.0', '')} วัน`;
    document.getElementById('stats-sick-curr').textContent = `${currSickCount} ครั้ง / ${currSickDays.toFixed(1).replace('.0', '')} วัน`;
    document.getElementById('stats-sick-total').textContent = `${prevSickCount + currSickCount} ครั้ง / ${(prevSickDays + currSickDays).toFixed(1).replace('.0', '')} วัน`;
    
    // 2. Personal Leave (ลากิจส่วนตัว)
    const prevPersCount = stats["กิจ"].count;
    const prevPersDays = stats["กิจ"].days;
    const currPersCount = t === 'ลากิจส่วนตัว' && currDays > 0 ? 1 : 0;
    const currPersDays = t === 'ลากิจส่วนตัว' ? currDays : 0;
    
    document.getElementById('stats-personal-prev').textContent = `${prevPersCount} ครั้ง / ${prevPersDays.toFixed(1).replace('.0', '')} วัน`;
    document.getElementById('stats-personal-curr').textContent = `${currPersCount} ครั้ง / ${currPersDays.toFixed(1).replace('.0', '')} วัน`;
    document.getElementById('stats-personal-total').textContent = `${prevPersCount + currPersCount} ครั้ง / ${(prevPersDays + currPersDays).toFixed(1).replace('.0', '')} วัน`;
    
    // 3. Maternity Leave (ลาคลอดบุตร)
    const prevMatCount = stats["คลอด"].count;
    const prevMatDays = stats["คลอด"].days;
    const currMatCount = t === 'ลาคลอดบุตร' && currDays > 0 ? 1 : 0;
    const currMatDays = t === 'ลาคลอดบุตร' ? currDays : 0;
    
    document.getElementById('stats-maternity-prev').textContent = `${prevMatCount} ครั้ง / ${prevMatDays.toFixed(1).replace('.0', '')} วัน`;
    document.getElementById('stats-maternity-curr').textContent = `${currMatCount} ครั้ง / ${currMatDays.toFixed(1).replace('.0', '')} วัน`;
    document.getElementById('stats-maternity-total').textContent = `${prevMatCount + currMatCount} ครั้ง / ${(prevMatDays + currMatDays).toFixed(1).replace('.0', '')} วัน`;
    
  } catch (err) {
    console.error('Error updating leave stats table:', err);
  }
}

// Submit Leave Request
async function handleLeaveSubmit(e) {
  e.preventDefault();
  
  if (signaturePad.isEmpty()) {
    return showError('กรุณาลงลายมือชื่อก่อนกดยืนยันการลา');
  }

  const frontendUrl = window.location.href.split('?')[0].split('#')[0];

  const leavePayload = {
    currentUser,
    schoolName: document.getElementById('form-school-name').value,
    requestDate: document.getElementById('form-request-date').value,
    leaveType: document.getElementById('form-leave-type').value,
    reason: document.getElementById('form-reason').value,
    startDate: document.getElementById('form-start-date').value,
    endDate: document.getElementById('form-end-date').value,
    totalDays: parseFloat(document.getElementById('form-total-days').value) || 0,
    teacherName: document.getElementById('form-teacher-name').value,
    subject: document.getElementById('form-subject').value,
    
    lastLeaveType: document.getElementById('form-last-leave-type').value,
    lastLeaveStartDate: document.getElementById('form-last-start-date').value || null,
    lastLeaveEndDate: document.getElementById('form-last-end-date').value || null,
    lastLeaveTotalDays: parseFloat(document.getElementById('form-last-total-days').value) || 0,
    
    contactAddress: document.getElementById('form-contact-address').value,
    contactPhone: document.getElementById('form-contact-phone').value,
    signatureDataUrl: signaturePad.toDataURL(),
    frontendUrl: frontendUrl // Links back to GitHub Pages
  };

  showLoading('กำลังบันทึกคำขอลาและส่งแจ้งเตือน LINE...');
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leavePayload)
    });
    const result = await res.json();
    
    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'ยื่นใบลาสำเร็จ',
        text: 'ระบบได้ส่งเรื่องให้หัวหน้างาน/ผู้อนุมัติ เรียบร้อยแล้ว',
        confirmButtonText: 'ตกลง'
      });
      showPage('history-page');
      loadHistory();
    } else {
      showError(result.message);
    }
  } catch (err) {
    showError('เกิดข้อผิดพลาดในการยื่นใบลา: ' + err.message);
  }
}

// --- History Page Loading ---

function loadHistory() {
  if (!currentUser) return;
  const filterSec = document.getElementById('history-filters');
  const userColHeader = document.getElementById('history-table-user-header');
  
  if (currentUser.role === 'admin') {
    document.getElementById('history-title').textContent = 'ประวัติการลาของบุคลากรทั้งหมด';
    userColHeader.classList.remove('hidden');
    filterSec.classList.remove('hidden');
    
    // Load users dropdown for filter
    const selectUser = document.getElementById('filter-user');
    if (selectUser.options.length <= 1) {
      fetch(`${API_BASE_URL}/api/users`)
        .then(res => res.json())
        .then(users => {
          users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.userId;
            opt.textContent = u.fullName;
            selectUser.appendChild(opt);
          });
        });
    }
    
    document.getElementById('filter-btn').onclick = loadHistoryData;
  } else {
    document.getElementById('history-title').textContent = 'ประวัติการลาของข้าพเจ้า';
    userColHeader.classList.add('hidden');
    filterSec.classList.add('hidden');
  }
  
  loadHistoryData();
}

async function loadHistoryData() {
  showLoading('กำลังโหลดข้อมูลประวัติ...');
  
  const filterPayload = {
    role: currentUser.role,
    userId: currentUser.userId,
    filterUserId: document.getElementById('filter-user')?.value || 'all',
    filterStartDate: document.getElementById('filter-start-date')?.value || '',
    filterEndDate: document.getElementById('filter-end-date')?.value || ''
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/leaves/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filterPayload)
    });
    const d = await res.json();
    
    Swal.close();
    
    const tb = document.getElementById('history-table-body');
    tb.innerHTML = '';
    
    if (!d || !d.length) {
      tb.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--neutral-400); padding:24px;">ไม่พบข้อมูลประวัติการลา</td></tr>`;
    } else {
      d.forEach(i => {
        tb.innerHTML += `
          <tr>
            <td>${formatDate(i.requestDate, true)}</td>
            ${currentUser.role === 'admin' ? `<td style="font-weight: 500;">${i.fullName}</td>` : ''}
            <td style="color:var(--primary); font-weight:600;">${i.leaveType}</td>
            <td>${formatDate(i.startDate)} - ${formatDate(i.endDate)}</td>
            <td>${renderBadge(i.status)}</td>
            <td>
              <div style="display:flex; gap:8px;">
                ${i.pdfUrl ? `<a href="${i.pdfUrl}" target="_blank" class="btn btn-outline btn-sm">🖨️ พิมพ์ใบลา</a>` : ''}
                ${i.status === 'รอการอนุมัติ' ? `<button onclick="cancelLeave('${i.leaveId}')" class="btn btn-secondary btn-sm" style="padding: 4px 10px;">ยกเลิก</button>` : ''}
                ${currentUser.role === 'admin' ? `<button onclick="deleteLeaveRecord('${i.leaveId}')" class="btn btn-secondary btn-sm" style="padding: 4px 10px; background:#f43f5e;">ลบ</button>` : ''}
              </div>
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    showError('ไม่สามารถดึงข้อมูลประวัติการลาได้: ' + err.message);
  }
}

// Cancel Leave Request (by User)
window.cancelLeave = (leaveId) => {
  Swal.fire({
    title: 'ต้องการยกเลิกใบลา?',
    text: "คำขอลาจะถูกยกเลิกการทำงาน",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: 'var(--secondary)',
    confirmButtonText: 'ยืนยันยกเลิก',
    cancelButtonText: 'ปิด'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('กำลังดำเนินการยกเลิก...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/leaves/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leaveId, userId: currentUser.userId })
        });
        const r = await res.json();
        
        if (r.success) {
          Swal.fire('สำเร็จ', 'ยกเลิกใบลาเรียบร้อยแล้ว', 'success');
          loadHistory();
        } else {
          showError(r.message);
        }
      } catch (err) {
        showError(err.message);
      }
    }
  });
};

// Delete Leave Request (by Admin)
window.deleteLeaveRecord = (leaveId) => {
  Swal.fire({
    title: 'ต้องการลบประวัติต้นฉบับ?',
    text: "ประวัติการลานี้รวมถึงไฟล์แนบต่างๆ บนเซิร์ฟเวอร์จะถูกลบถาวร",
    icon: 'error',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'ยืนยันลบข้อมูล',
    cancelButtonText: 'ปิด'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('กำลังลบข้อมูล...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/leaves/${leaveId}`, {
          method: 'DELETE'
        });
        const r = await res.json();
        if (r.success) {
          Swal.fire('สำเร็จ', 'ลบประวัติคำขอเรียบร้อยแล้ว', 'success');
          loadHistory();
        } else {
          showError(r.message);
        }
      } catch (err) {
        showError(err.message);
      }
    }
  });
};

// --- Admin Approval Page ---

async function loadApprovalPage() {
  if (!currentUser || currentUser.role !== 'admin') return;
  showLoading('กำลังโหลดรายการรออนุมัติ...');
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaves/pending`);
    const d = await res.json();
    
    Swal.close();
    const tb = document.getElementById('approval-table-body');
    tb.innerHTML = '';
    
    if (!d || !d.length) {
      tb.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--neutral-400); padding:24px;">ไม่มีรายการใบลาที่รอการอนุมัติในขณะนี้</td></tr>`;
    } else {
      d.forEach(l => {
        tb.innerHTML += `
          <tr>
            <td style="font-weight: 500;">${l.fullName}</td>
            <td>${l.position}</td>
            <td style="color:var(--primary); font-weight:600;">${l.leaveType}</td>
            <td>${formatDate(l.startDate)} - ${formatDate(l.endDate)} (รวม ${l.totalDays} วัน)</td>
            <td>
              <button onclick='openApprovalModal(${JSON.stringify(l)})' class="btn btn-primary btn-sm">📄 ตรวจสอบและอนุมัติ</button>
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    showError('ไม่สามารถโหลดข้อมูลคำขออนุมัติได้: ' + err.message);
  }
}

window.openApprovalModal = (l) => {
  const frontendUrl = window.location.href.split('?')[0].split('#')[0];

  Swal.fire({
    title: 'พิจารณาคำขอลา',
    html: `
      <div style="text-align: left; background:var(--neutral-50); padding:16px; border-radius:12px; margin-bottom:16px; font-size:14px; border:1px solid var(--neutral-200);">
        <p style="margin-bottom:6px;"><strong>ผู้ขอลา:</strong> ${l.fullName}</p>
        <p style="margin-bottom:6px;"><strong>ประเภทการลา:</strong> ${l.leaveType}</p>
        <p style="margin-bottom:6px;"><strong>เหตุผลการลา:</strong> ${l.reason}</p>
        <p style="margin-bottom:6px;"><strong>ผู้สอนแทน:</strong> ${l.teacherName} (วิชา: ${l.subject})</p>
        <p><strong>ที่อยู่ติดต่อ:</strong> ${l.contactAddress} (โทร: ${l.contactPhone})</p>
      </div>
      
      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">คำสั่ง / ความเห็น</label>
          <select id="swal-status" class="form-input">
            <option value="อนุมัติ">✅ อนุมัติการลา</option>
            <option value="ไม่อนุมัติ">❌ ไม่อนุมัติการลา</option>
          </select>
        </div>
        
        <div id="swal-comment-div" style="display:none;">
          <label class="form-label">หมายเหตุ (กรณีไม่อนุมัติ)</label>
          <textarea id="swal-comment" class="form-input" placeholder="ระบุสาเหตุ..."></textarea>
        </div>
        
        <div>
          <label class="form-label">ลงนามลายมือชื่อผู้อนุมัติ</label>
          <div style="background:white; border:2px dashed var(--neutral-400); border-radius:12px; padding:10px; width:100%;">
            <canvas id="swal-admin-sig" class="signature-canvas" style="width:100%; height:120px;"></canvas>
            <div style="text-align:right; margin-top:8px;">
              <button type="button" id="swal-clear-sig" style="font-size:12px; color:var(--secondary); font-weight:bold; border:none; background:none; cursor:pointer;">ล้างลายเซ็น</button>
            </div>
          </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'บันทึกคำสั่ง',
    cancelButtonText: 'ปิดหน้าต่าง',
    didOpen: () => {
      const c = document.getElementById('swal-admin-sig');
      c.width = c.parentElement.offsetWidth - 20;
      c.height = 120;
      adminSignaturePad = new SignaturePad(c, { backgroundColor: 'rgb(255, 255, 255)' });
      
      document.getElementById('swal-clear-sig').onclick = () => adminSignaturePad.clear();
      
      document.getElementById('swal-status').onchange = (e) => {
        const commentDiv = document.getElementById('swal-comment-div');
        if (e.target.value === 'ไม่อนุมัติ') {
          commentDiv.style.display = 'block';
        } else {
          commentDiv.style.display = 'none';
        }
      };
    },
    preConfirm: () => {
      const status = document.getElementById('swal-status').value;
      const comment = document.getElementById('swal-comment').value;
      
      if (status === 'ไม่อนุมัติ' && !comment.trim()) {
        Swal.showValidationMessage('กรุณาระบุหมายเหตุการไม่อนุมัติ');
      }
      
      if (adminSignaturePad.isEmpty()) {
        Swal.showValidationMessage('กรุณาเซ็นชื่อรับรอง');
      }
      
      return {
        leaveId: l.leaveId,
        status,
        comment,
        adminSignature: adminSignaturePad.toDataURL(),
        adminUser: currentUser,
        frontendUrl: frontendUrl
      };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('กำลังบันทึกคำสั่งอนุมัติและแจ้งเตือนผู้ลา...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/leaves/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const r = await res.json();
        
        if (r.success) {
          Swal.fire({
            icon: 'success',
            title: 'ดำเนินการอนุมัติสำเร็จ',
            text: `ส่งผลพิจารณาทาง LINE ไปยังผู้ลาเรียบร้อยแล้ว`,
            confirmButtonText: 'ตกลง'
          });
          loadApprovalPage();
        } else {
          showError(r.message);
        }
      } catch (err) {
        showError(err.message);
      }
    }
  });
};

// --- Report Page ---

async function loadReportPage() {
  if (!currentUser) return;
  showLoading('กำลังโหลดรายงาน...');
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports/all`);
    const data = await res.json();
    
    Swal.close();
    
    const tb = document.getElementById('report-table-body');
    tb.innerHTML = '';
    
    if (!data || !data.length) {
      tb.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--neutral-400); padding:24px;">ไม่มีข้อมูลประวัติคำขอทั้งหมดในระบบ</td></tr>`;
    } else {
      data.forEach(l => {
        tb.innerHTML += `
          <tr>
            <td style="font-weight: 500;">${l.fullName}</td>
            <td>${l.leaveType}</td>
            <td>${formatDate(l.startDate)} - ${formatDate(l.endDate)}</td>
            <td style="text-align: center; font-weight: bold;">${l.totalDays}</td>
            <td>${renderBadge(l.status)}</td>
            <td>
              ${l.pdfUrl ? `<a href="${l.pdfUrl}" target="_blank" style="color:var(--primary); font-weight:600;">พิมพ์ใบลา</a>` : '-'}
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    showError('ไม่สามารถโหลดข้อมูลรายงานได้: ' + err.message);
  }
}

// Export excel report
async function handleExportExcel() {
  showLoading('กำลังดึงข้อมูลเพื่อส่งออกไฟล์ Excel...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports/all`);
    const data = await res.json();
    
    Swal.close();
    
    if (data && data.length) {
      // Map to Thai excel column headers
      const formatted = data.map((item, index) => ({
        "ลำดับ": index + 1,
        "ชื่อ-นามสกุล": item.fullName,
        "ตำแหน่ง": item.position,
        "วันที่ยื่นใบลา": formatDate(item.requestDate),
        "ประเภทการลา": item.leaveType,
        "วันเริ่มลา": formatDate(item.startDate),
        "วันสิ้นสุดลา": formatDate(item.endDate),
        "รวมจำนวน (วัน)": item.totalDays,
        "สถานะ": item.status,
        "ลิงก์เอกสารพิมพ์": item.pdfUrl || ''
      }));
      
      const ws = XLSX.utils.json_to_sheet(formatted);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ประวัติการลา");
      
      // Auto fit column width
      const max_len = formatted.reduce((acc, row) => {
        Object.keys(row).forEach((k, i) => {
          const w = String(row[k]).length;
          acc[i] = Math.max(acc[i] || 0, w);
        });
        return acc;
      }, []);
      ws['!cols'] = max_len.map(w => ({ w: Math.min(w + 3, 30) }));

      XLSX.writeFile(wb, `รายงานสรุปการลา_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      showError('ไม่พบข้อมูลสำหรับจัดทำรายงาน Excel');
    }
  } catch (err) {
    showError(err.message);
  }
}

// Print Summary Report Modal
async function handlePrintReport() {
  const s = document.getElementById('print-start-date').value;
  const e = document.getElementById('print-end-date').value;
  
  showLoading('กำลังคำนวณสรุป...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: s, endDate: e })
    });
    const data = await res.json();
    
    Swal.close();
    
    if (!data || !data.length) {
      return showError('ไม่พบข้อมูลการลาในช่วงวันที่เลือก');
    }
    
    // Prepare HTML content for printing
    let html = `
      <html>
      <head>
        <title>รายงานสรุปสถิติการลาบุคคล</title>
        <style>
          body { font-family: 'Sarabun', sans-serif; padding: 20px; }
          h2 { text-align: center; margin-bottom: 5px; }
          .sub { text-align: center; margin-bottom: 25px; font-size: 14px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #000; padding: 8px 12px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <h2>รายงานสรุปสถิติการอนุมัติการลา (รายบุคคล)</h2>
        <div class="sub">
          วิทยาลัยสารพัดช่างน่าน <br>
          ${s ? `ตั้งแต่วันที่ ${formatDateThai(s)}` : ''} ${e ? `ถึงวันที่ ${formatDateThai(e)}` : ''} 
          (เฉพาะรายการที่ได้รับการอนุมัติ)
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 50px;">ที่</th>
              <th>ชื่อ-นามสกุล</th>
              <th>ตำแหน่ง</th>
              <th class="text-center" style="width: 100px;">จำนวนครั้งลา</th>
              <th class="text-center" style="width: 100px;">รวมจำนวน (วัน)</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    data.forEach((item, index) => {
      html += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td style="font-weight: 600;">${item.fullName}</td>
          <td>${item.position}</td>
          <td class="text-center">${item.totalLeaves}</td>
          <td class="text-center" style="font-weight: bold;">${item.totalDays}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
        <div style="margin-top:40px; text-align:right; font-size:12px; color:#666;">
          พิมพ์รายงานเมื่อวันที่: ${new Date().toLocaleString('th-TH')}
        </div>
      </body>
      </html>
    `;
    
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    
    // Print window
    setTimeout(() => {
      win.print();
    }, 500);
    
  } catch (err) {
    showError(err.message);
  }
}

// --- User Management ---

async function loadUserManagementPage() {
  if (!currentUser || currentUser.role !== 'admin') return;
  showLoading('กำลังโหลดรายชื่อผู้ใช้งาน...');
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/users`);
    const users = await res.json();
    
    Swal.close();
    const tb = document.getElementById('users-table-body');
    tb.innerHTML = '';
    
    users.forEach(x => {
      tb.innerHTML += `
        <tr>
          <td style="font-weight: 600;">${x.fullName}</td>
          <td>${x.position}</td>
          <td>${x.username}</td>
          <td>
            <span class="badge ${x.role === 'admin' ? 'badge-pending' : 'badge-cancelled'}" style="${x.role === 'admin' ? 'background: #f3e8ff; color: #7e22ce; border-color: #e9d5ff;' : ''}">
              ${x.role === 'admin' ? 'แอดมิน' : 'บุคลากร'}
            </span>
          </td>
          <td>${renderBadge(x.status, true)}</td>
          <td>
            <div style="display:flex; gap:8px;">
              ${x.status === 'pending' ? `<button onclick="approveUser('${x.userId}')" class="btn btn-primary btn-sm" style="padding:4px 10px; background:#10b981; box-shadow:none;">อนุมัติ</button>` : ''}
              <button onclick='editUser(${JSON.stringify(x)})' class="btn btn-outline btn-sm" style="padding:4px 10px;">แก้ไข</button>
              <button onclick="deleteUser('${x.userId}')" class="btn btn-secondary btn-sm" style="padding:4px 10px; background:#f43f5e; box-shadow:none;">ลบ</button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    showError('ไม่สามารถโหลดรายชื่อบุคลากรได้: ' + err.message);
  }
}

// Approve User Registration
window.approveUser = async (userId) => {
  showLoading('กำลังบันทึกอนุมัติบัญชี...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/approve/${userId}`, { method: 'POST' });
    const r = await res.json();
    if (r.success) {
      Swal.fire('สำเร็จ', 'อนุมัติการใช้งานบัญชีเรียบร้อย', 'success');
      loadUserManagementPage();
    } else {
      showError(r.message);
    }
  } catch (err) {
    showError(err.message);
  }
};

// Delete User Account
window.deleteUser = (userId) => {
  Swal.fire({
    title: 'ต้องการลบบัญชีบุคลากร?',
    text: "บัญชีและประวัติการลากรอกข้อมูลทั้งหมดของบัญชีนี้จะถูกลบถาวร",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'ยืนยันลบ',
    cancelButtonText: 'ปิด'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('กำลังลบบัญชี...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, { method: 'DELETE' });
        const r = await res.json();
        if (r.success) {
          Swal.fire('สำเร็จ', 'ลบบัญชีผู้ใช้เรียบร้อยแล้ว', 'success');
          loadUserManagementPage();
        } else {
          showError(r.message);
        }
      } catch (err) {
        showError(err.message);
      }
    }
  });
};

// Edit User Account Details
window.editUser = (u) => {
  Swal.fire({
    title: 'แก้ไขข้อมูลผู้ใช้',
    html: `
      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">ชื่อ-นามสกุล</label>
          <input id="edit-fn" class="form-input" value="${u.fullName}">
        </div>
        <div>
          <label class="form-label">ตำแหน่ง</label>
          <input id="edit-pos" class="form-input" value="${u.position}">
        </div>
        <div>
          <label class="form-label">สิทธิ์การเข้าถึง</label>
          <select id="edit-er" class="form-input">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>บุคลากร (User)</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ (Admin)</option>
          </select>
        </div>
        <div>
          <label class="form-label">รหัสผ่านใหม่ (ปล่อยว่างหากไม่ต้องการเปลี่ยน)</label>
          <input id="edit-eps" type="password" class="form-input" placeholder="กรอกรหัสผ่านใหม่">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    preConfirm: () => {
      return {
        fullName: document.getElementById('edit-fn').value,
        position: document.getElementById('edit-pos').value,
        role: document.getElementById('edit-er').value,
        password: document.getElementById('edit-eps').value
      };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('กำลังบันทึกข้อมูล...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${u.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const r = await res.json();
        
        if (r.success) {
          Swal.fire('สำเร็จ', 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว', 'success');
          loadUserManagementPage();
        } else {
          showError(r.message);
        }
      } catch (err) {
        showError(err.message);
      }
    }
  });
};

// Import Users from Excel
function handleImportExcel(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  showLoading('กำลังอ่านไฟล์ Excel...');
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      
      showLoading('กำลังนำเข้าข้อมูลสมาชิก...');
      const res = await fetch(`${API_BASE_URL}/api/users/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json)
      });
      const result = await res.json();
      
      if (result.success) {
        Swal.fire('นำเข้าสำเร็จ', result.message, 'success');
        loadUserManagementPage();
      } else {
        showError(result.message);
      }
    } catch (err) {
      showError('ไม่สามารถอ่านไฟล์ได้: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// --- Utils ---

function showLoading(msg) {
  Swal.fire({
    title: msg,
    didOpen: () => {
      Swal.showLoading();
    },
    allowOutsideClick: false,
    showConfirmButton: false,
    customClass: {
      popup: 'rounded-2xl'
    }
  });
}

function showError(msg) {
  Swal.fire({
    title: 'เกิดข้อผิดพลาด',
    text: typeof msg === 'object' ? JSON.stringify(msg) : msg,
    icon: 'error',
    confirmButtonText: 'ตกลง',
    confirmButtonColor: 'var(--primary)'
  });
}

function formatDate(dateValue, longFormat = false) {
  if (!dateValue) return '-';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return dateValue;
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: longFormat ? 'long' : 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateValue;
  }
}

function formatDateThai(dateValue) {
  return formatDate(dateValue, true);
}

function renderBadge(status, isUserStatus = false) {
  let className = 'badge-pending';
  let label = status || '-';

  if (isUserStatus) {
    if (status === 'approved') {
      className = 'badge-approved';
      label = 'อนุมัติแล้ว';
    } else if (status === 'pending') {
      className = 'badge-pending';
      label = 'รออนุมัติ';
    }
  } else {
    if (status === 'อนุมัติ') {
      className = 'badge-approved';
    } else if (status === 'รอการอนุมัติ') {
      className = 'badge-pending';
    } else if (status === 'ไม่อนุมัติ') {
      className = 'badge-rejected';
    } else if (status === 'ยกเลิกโดยผู้ใช้') {
      className = 'badge-cancelled';
    }
  }

  return `<span class="badge ${className}">${label}</span>`;
}

// Render Doughnut & Bar Charts
function renderCharts(d) {
  const typeCanvas = document.getElementById('leaveTypeChart');
  if (typeCanvas) {
    const ctx1 = typeCanvas.getContext('2d');
    if (leaveTypeChartInstance) leaveTypeChartInstance.destroy();
    
    leaveTypeChartInstance = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: d.leaveTypeData.labels,
        datasets: [{
          data: d.leaveTypeData.data,
          backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f43f5e'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '72%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: { family: 'Kanit' }
            }
          }
        }
      }
    });
  }

  const monthlyCanvas = document.getElementById('monthlyLeaveChart');
  if (monthlyCanvas) {
    const ctx2 = monthlyCanvas.getContext('2d');
    if (monthlyLeaveChartInstance) monthlyLeaveChartInstance.destroy();
    
    monthlyLeaveChartInstance = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: d.monthlyLeaveData.labels,
        datasets: [{
          label: 'จำนวนการลา (ครั้ง)',
          data: d.monthlyLeaveData.data,
          backgroundColor: '#6366f1',
          borderRadius: 8,
          maxBarThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { borderDash: [4, 4] },
            ticks: { font: { family: 'Kanit' } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Kanit' } }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}
