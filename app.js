// ================================================================= */
//                     FRONTEND CONTROLLER (Vanilla JS)              */
//                     ระบบบริหารงานบุคลากร วิทยาลัยสารพัดช่างน่าน             */
// ================================================================= */


// Automatically detect backend API domain
const API_BASE_URL = window.location.hostname !== 'service.npc.ac.th'
  ? `http://${window.location.hostname || 'localhost'}:5000`
  : 'https://service.npc.ac.th/npc_eleve_backend'; // Replace with your production Node.js API domain

let currentUser = null;
let settings = {};
let holidaysList = [];
let leaveTypeChartInstance = null;
let monthlyLeaveChartInstance = null;
let signaturePad = null;
let adminSignaturePad = null;
let currentAttendanceData = [];

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

  // Update sub-nav active state
  document.querySelectorAll('.btn-sub-nav').forEach(btn => {
    if (btn.getAttribute('data-sub-page') === pageId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  window.scrollTo(0, 0);
  
  // Close mobile menu if open
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) mobileMenu.classList.add('hidden');
}

let redirectAfterLogin = null;
async function enterModule(pageId, adminOnly) {
  if (pageId === 'activity-page') {
    if (currentUser) {
      // Check if we already have aprStaffId in the session
      if (!currentUser.aprStaffId) {
        showLoading('กำลังเข้าสู่ระบบกิจกรรม...');
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/get-apr-id?username=${currentUser.username}`);
          const data = await res.json();
          if (data.success && data.aprStaffId) {
            currentUser.aprStaffId = data.aprStaffId;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
          }
        } catch (e) {
          console.error('Failed to fetch APR staff ID dynamically:', e);
        }
        Swal.close();
      }

      const srsUser = {
        id: currentUser.aprStaffId || currentUser.userId,
        staff_code: currentUser.username,
        full_name: currentUser.fullName,
        role: currentUser.role
      };
      localStorage.setItem('srs_user', JSON.stringify(srsUser));
    } else {
      localStorage.removeItem('srs_user');
    }

    // Environment-aware redirection URL
    const targetUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost/APR' 
      : 'https://service.npc.ac.th/APR';
    
    window.location.href = targetUrl;
    return;
  }

  if (!currentUser) {
    redirectAfterLogin = { pageId, adminOnly };
    showLoginModal();
    return;
  }
  
  if (adminOnly && currentUser.role !== 'admin') {
    Swal.fire('ปฏิเสธการเข้าถึง', 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าใช้งานหน้านี้ได้', 'warning');
    return;
  }
  
  showPage(pageId);
  
  // Call the appropriate page initializer function
  if (pageId === 'dashboard-page') {
    loadDashboardData();
  } else if (pageId === 'attendance-page') {
    initAttendancePage();
  } else if (pageId === 'travel-page') {
    initTravelPage();
  } else if (pageId === 'travel-report-page') {
    initTravelReportPage();
  } else if (pageId === 'training-page') {
    initTrainingPage();
  } else if (pageId === 'approval-page') {
    loadApprovalPage();
  } else if (pageId === 'report-page') {
    loadReportPage();
  } else if (pageId === 'user-management-page') {
    loadUserManagementPage();
  } else if (pageId === 'admin-settings-page') {
    loadAdminSettingsPage();
  }
}

window.showPage = showPage;
window.enterModule = enterModule;

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
  // Sidebar toggle button
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const appContainer = document.querySelector('.app-container');
  if (sidebarToggleBtn && appContainer) {
    sidebarToggleBtn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        // Mobile: toggle active drawer state only
        appContainer.classList.toggle('sidebar-active');
        appContainer.classList.remove('sidebar-collapsed'); // avoid desktop conflicts
      } else {
        // Desktop: toggle collapsed state only
        appContainer.classList.toggle('sidebar-collapsed');
        appContainer.classList.remove('sidebar-active');
      }
    });
  }

  // Close sidebar on mobile when clicking overlay
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  if (sidebarOverlay && appContainer) {
    sidebarOverlay.addEventListener('click', () => {
      appContainer.classList.remove('sidebar-active');
    });
  }

  // Close sidebar on mobile when clicking on main content
  const mainContent = document.querySelector('.main-content');
  if (mainContent && appContainer) {
    mainContent.addEventListener('click', () => {
      if (appContainer.classList.contains('sidebar-active')) {
        appContainer.classList.remove('sidebar-active');
      }
    });
  }

  // Home logo link
  document.getElementById('home-link').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('portal-page');
  });

  // Authentication buttons
  document.getElementById('login-btn').addEventListener('click', showLoginModal);
  document.getElementById('register-btn').addEventListener('click', showRegisterModal);

  // Close login modal when clicking outside
  const loginModalEl = document.getElementById('login-modal');
  if (loginModalEl) {
    loginModalEl.addEventListener('click', (e) => {
      if (e.target === loginModalEl) {
        hideLoginModal();
      }
    });
  }

  // Forms submit & events
  document.getElementById('leave-request-form').addEventListener('submit', handleLeaveSubmit);
  document.getElementById('export-excel-btn').addEventListener('click', handleExportExcel);
  document.getElementById('import-excel-input').addEventListener('change', handleImportExcel);
  document.getElementById('print-report-btn').addEventListener('click', handlePrintReport);
  
  // New Forms submit & events
  const travelForm = document.getElementById('travel-request-form');
  if (travelForm) travelForm.addEventListener('submit', handleTravelSubmit);
  
  const travelReportForm = document.getElementById('travel-report-form');
  if (travelReportForm) travelReportForm.addEventListener('submit', handleTravelReportSubmit);
  
  const trainingForm = document.getElementById('training-form');
  if (trainingForm) trainingForm.addEventListener('submit', handleTrainingSubmit);
  
  const activityForm = document.getElementById('activity-create-form');
  if (activityForm) activityForm.addEventListener('submit', handleActivityCreate);
  
  // Date calculation events for travel
  const tSd = document.getElementById('travel-start-date');
  const tEd = document.getElementById('travel-end-date');
  if (tSd) tSd.addEventListener('change', calculateTravelDays);
  if (tEd) tEd.addEventListener('change', calculateTravelDays);
  
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

  // Attendance page actions
  document.getElementById('btn-load-attendance').addEventListener('click', loadAttendanceData);
  document.getElementById('btn-save-attendance').addEventListener('click', saveAttendanceData);
  const filterSelect = document.getElementById('attendance-filter-type');
  if (filterSelect) {
    filterSelect.addEventListener('change', filterAndRenderAttendance);
  }

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
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('login-u').value = '';
    document.getElementById('login-p').value = '';
    document.getElementById('login-u').focus();
  }
}

window.hideLoginModal = () => {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

window.toggleLoginPassword = () => {
  const passField = document.getElementById('login-p');
  const eyeIcon = document.getElementById('eye-icon');
  if (!passField || !eyeIcon) return;
  
  if (passField.type === 'password') {
    passField.type = 'text';
    eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
  } else {
    passField.type = 'password';
    eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  }
};

window.handleForgotPassword = (e) => {
  e.preventDefault();
  hideLoginModal();

  Swal.fire({
    title: 'รีเซ็ตรหัสผ่านด้วย LINE ID',
    html: `
      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">ชื่อผู้ใช้ (Username)</label>
          <input id="reset-username" class="form-input" placeholder="กรอก Username ของท่าน" autocomplete="off">
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>LINE User ID (ที่ผูกไว้กับระบบ)</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">💬 แชทบอตขอ ID</a>
          </label>
          <input id="reset-lineid" class="form-input" placeholder="กรอกรหัสผู้ใช้ไลน์ (ขึ้นต้นด้วย U...)" autocomplete="off">
          <p style="font-size:11px; color:var(--secondary); margin-top:4px;">*กดปุ่มสีเขียวเพื่อเปิดแชทกับบอต -> พิมพ์ "ขอ ID" ส่งไปในแชทเพื่อขอรหัส</p>
        </div>
        <div>
          <label class="form-label">รหัสผ่านใหม่ที่ต้องการตั้ง</label>
          <input id="reset-newpassword" type="password" class="form-input" placeholder="ระบุรหัสผ่านใหม่" autocomplete="new-password">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'ยืนยันการเปลี่ยนรหัสผ่าน',
    cancelButtonText: 'ยกเลิก',
    preConfirm: () => {
      const u = document.getElementById('reset-username').value.trim();
      const lid = document.getElementById('reset-lineid').value.trim();
      const np = document.getElementById('reset-newpassword').value;

      if (!u || !lid || !np) {
        Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง');
        return false;
      }
      return { username: u, lineUserId: lid, newPassword: np };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('กำลังดำเนินการตรวจสอบข้อมูล...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('สำเร็จ', data.message, 'success').then(() => {
            showLoginModal();
          });
        } else {
          showError(data.message).then(() => {
            showLoginModal();
          });
        }
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message).then(() => {
          showLoginModal();
        });
      }
    } else {
      showLoginModal();
    }
  });
};

window.showSelfEditModal = () => {
  if (!currentUser) return;
  Swal.fire({
    title: 'แก้ไขข้อมูลส่วนตัว',
    html: `
      <!-- Dummy fields to prevent browser autofill -->
      <input type="text" style="display:none;" name="dummy-username" autocomplete="username">
      <input type="password" style="display:none;" name="dummy-password" autocomplete="new-password">

      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">ชื่อ-นามสกุล</label>
          <input id="self-fn" class="form-input" value="${currentUser.fullName || ''}" autocomplete="off">
        </div>
        <div>
          <label class="form-label">ตำแหน่ง</label>
          <input id="self-pos" class="form-input" value="${currentUser.position || ''}" autocomplete="off">
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>LINE User ID</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">💬 แชทบอตขอ ID</a>
          </label>
          <input id="self-lid" class="form-input" value="${currentUser.lineUserId || ''}" placeholder="ระบุ LINE User ID (เริ่มต้นด้วย U...)" autocomplete="off">
          <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">*พิมพ์ "ขอ ID" ในห้องแชทเพื่อขอรหัสจากบอต</p>
        </div>
        <div>
          <label class="form-label">รหัสผ่านใหม่ (ปล่อยว่างหากไม่ต้องการเปลี่ยน)</label>
          <input id="self-eps" type="password" class="form-input" placeholder="กรอกรหัสผ่านใหม่" autocomplete="new-password">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    preConfirm: () => {
      const fn = document.getElementById('self-fn').value.trim();
      const pos = document.getElementById('self-pos').value.trim();
      const lid = document.getElementById('self-lid').value.trim();
      const ps = document.getElementById('self-eps').value;
      if (!fn || !pos) {
        Swal.showValidationMessage('กรุณากรอกชื่อและตำแหน่งงาน');
        return false;
      }
      return { fullName: fn, position: pos, lineUserId: lid, password: ps };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      const payload = {
        ...result.value,
        role: currentUser.role,
        staffType: currentUser.staffType
      };

      showLoading('กำลังบันทึกข้อมูล...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          // Update local session storage details
          currentUser.fullName = payload.fullName;
          currentUser.position = payload.position;
          currentUser.lineUserId = payload.lineUserId;
          sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
          
          // Refresh UI
          updateUIAfterLogin();

          Swal.fire('สำเร็จ', 'อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว', 'success');
        } else {
          showError(data.message);
        }
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
      }
    }
  });
};

window.handleCustomLogin = async (e) => {
  e.preventDefault();
  const u = document.getElementById('login-u').value;
  const p = document.getElementById('login-p').value;
  
  showLoading('กำลังเข้าสู่ระบบ...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const data = await res.json();
    
    if (data.success) {
      currentUser = data.user;
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateUIAfterLogin();
      hideLoginModal();
      
      Swal.fire({
        icon: 'success',
        title: 'เข้าสู่ระบบสำเร็จ',
        showConfirmButton: false,
        timer: 1500
      });
      
      if (typeof redirectAfterLogin === 'object' && redirectAfterLogin !== null) {
        const { pageId, adminOnly } = redirectAfterLogin;
        redirectAfterLogin = null;
        enterModule(pageId, adminOnly);
      } else {
        showPage('portal-page');
      }
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message);
  }
};

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
          <label class="form-label">ประเภทบุคลากร</label>
          <select id="reg-type" class="form-input">
            <option value="ผู้บริหาร">ผู้บริหาร</option>
            <option value="ข้าราชการ">ข้าราชการ</option>
            <option value="พนักงานราชการ">พนักงานราชการ</option>
            <option value="ครูพิเศษสอน" selected>ครูพิเศษสอน</option>
            <option value="เจ้าหน้าที่">เจ้าหน้าที่</option>
          </select>
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
      const type = document.getElementById('reg-type').value;
      const ru = document.getElementById('reg-ru').value;
      const rp = document.getElementById('reg-rp').value;
      const lid = document.getElementById('reg-lid').value.trim();

      if (!fn || !pos || !ru || !rp) {
        Swal.showValidationMessage('กรุณากรอกข้อมูลหลักให้ครบถ้วน');
      }
      return { fullName: fn, position: pos, staffType: type, username: ru, password: rp, lineUserId: lid };
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
  showPage('portal-page');
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

  // Populate Header Shortcuts
  const headerShortcuts = document.getElementById('header-shortcuts');
  if (headerShortcuts) {
    headerShortcuts.innerHTML = '';
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-shortcut';
    btn.style.cssText = 'padding: 6px 12px; font-size: 0.9rem; font-weight: bold; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px;';
    
    if (currentUser.role === 'admin') {
      btn.innerHTML = `<span>⚖️</span> <span class="shortcut-text">อนุมัติการลา</span>`;
      btn.onclick = () => {
        enterModule('approval-page', true);
      };
    } else {
      btn.innerHTML = `<span>📅</span> <span class="shortcut-text">ระบบการยื่นลา</span>`;
      btn.onclick = () => {
        enterModule('dashboard-page', false);
      };
    }
    headerShortcuts.appendChild(btn);
    headerShortcuts.classList.remove('hidden');
  }

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
  
  // Update welcome message
  const welcomeEl = document.getElementById('portal-user-welcome');
  if (welcomeEl) {
    welcomeEl.innerHTML = `👤 สวัสดีคุณ <strong>${currentUser.fullName}</strong> (${currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'บุคลากร'}) | ยินดีต้อนรับเข้าสู่ระบบ`;
  }
  
  buildNavigation();
}

function updateUIAfterLogout() {
  document.getElementById('auth-buttons').classList.remove('hidden');
  document.getElementById('user-menu').classList.add('hidden');
  
  const headerShortcuts = document.getElementById('header-shortcuts');
  if (headerShortcuts) {
    headerShortcuts.innerHTML = '';
    headerShortcuts.classList.add('hidden');
  }
  
  // Update welcome message
  const welcomeEl = document.getElementById('portal-user-welcome');
  if (welcomeEl) {
    welcomeEl.innerHTML = `👤 ยินดีต้อนรับผู้เยี่ยมชม | กรุณาเข้าสู่ระบบเพื่อใช้งานระบบบริหารงานบุคคล`;
  }

  buildNavigation();
}

function buildNavigation() {
  const navMenu = document.getElementById('nav-menu');
  const mobileNav = document.getElementById('mobile-nav-links');
  if (navMenu) navMenu.innerHTML = '';
  if (mobileNav) mobileNav.innerHTML = '';

  let menuItems = [
    { text: 'หน้าหลักพอร์ทัล', icon: '🏠', page: 'portal-page', action: () => showPage('portal-page') }
  ];

  if (currentUser) {
    // Add Portal Links
    menuItems.push({ text: 'ระบบการยื่นลา', icon: '📅', page: 'dashboard-page', action: loadDashboardData });
    menuItems.push({ text: 'ระบบขอไปราชการ', icon: '✈️', page: 'travel-page', action: initTravelPage });
    menuItems.push({ text: 'ระบบรายงานราชการ', icon: '📝', page: 'travel-report-page', action: initTravelReportPage });
    menuItems.push({ text: 'ระบบบันทึกอบรม', icon: '🎓', page: 'training-page', action: initTrainingPage });

    if (currentUser.role === 'admin') {
      menuItems.push(
        { text: 'เช็คชื่อปฏิบัติงาน', icon: '⏱️', page: 'attendance-page', action: initAttendancePage },
        { text: 'พิจารณาอนุมัติการลา', icon: '⚖️', page: 'approval-page', action: loadApprovalPage },
        { text: 'รายงานสรุปการลา', icon: '📊', page: 'report-page', action: loadReportPage },
        { text: 'จัดการผู้ใช้งาน', icon: '⚙️', page: 'user-management-page', action: loadUserManagementPage },
        { text: 'ตั้งค่าปีงบประมาณ', icon: '🔧', page: 'admin-settings-page', action: loadAdminSettingsPage }
      );
    }
  }

  // Populate Sidebar (Desktop/Mobile conditional)
  let sidebarItems = [...menuItems];
  if (window.innerWidth <= 768) {
    // Mobile sidebar should be simplified (only show Portal Home and Leave System)
    sidebarItems = menuItems.filter(item => ['portal-page', 'dashboard-page'].includes(item.page));
  }

  sidebarItems.forEach(item => {
    const isAdminOnly = ['attendance-page', 'approval-page', 'report-page', 'user-management-page', 'admin-settings-page'].includes(item.page);
    const dLink = document.createElement('a');
    dLink.innerHTML = `<span style="font-size: 1.15rem; width: 24px; text-align: center;">${item.icon}</span> <span>${item.text}</span>`;
    dLink.className = 'nav-link';
    dLink.setAttribute('data-page', item.page);
    dLink.onclick = (e) => {
      e.preventDefault();
      enterModule(item.page, isAdminOnly);
      
      // Auto close sidebar on mobile screen size after click
      const appContainer = document.querySelector('.app-container');
      if (appContainer) appContainer.classList.remove('sidebar-active');
    };
    if (navMenu) navMenu.appendChild(dLink);
  });

  // Mobile Nav fallback if present
  if (mobileNav) {
    menuItems.forEach(item => {
      const isAdminOnly = ['attendance-page', 'approval-page', 'report-page', 'user-management-page', 'admin-settings-page'].includes(item.page);
      const mLink = document.createElement('a');
      mLink.innerHTML = `<span style="font-size: 1.15rem; width: 24px; text-align: center;">${item.icon}</span> <span>${item.text}</span>`;
      mLink.className = 'nav-link';
      mLink.style.display = 'flex';
      mLink.style.alignItems = 'center';
      mLink.style.gap = '12px';
      mLink.style.padding = '12px 16px';
      mLink.onclick = (e) => {
        e.preventDefault();
        enterModule(item.page, isAdminOnly);
      };
      mobileNav.appendChild(mLink);
    });
  }

  // Populate Dropdown items if user logged in
  if (currentUser) {
    const dropdownItems = document.getElementById('user-dropdown-items');
    if (dropdownItems) {
      dropdownItems.innerHTML = '';
      
      // Add edit profile button for the current user
      const editProfileBtn = document.createElement('button');
      editProfileBtn.className = 'user-dropdown-item';
      editProfileBtn.style.fontWeight = '600';
      editProfileBtn.style.borderBottom = '1px solid var(--neutral-200)';
      editProfileBtn.style.paddingBottom = '10px';
      editProfileBtn.style.marginBottom = '6px';
      editProfileBtn.innerHTML = `<span style="margin-right: 8px;">👤</span> แก้ไขข้อมูลส่วนตัว / รหัสผ่าน`;
      editProfileBtn.onclick = () => {
        showSelfEditModal();
      };
      dropdownItems.appendChild(editProfileBtn);
      
      // Add same navigation items into user dropdown for convenience
      menuItems.slice(1).forEach(item => {
        const isAdminOnly = ['attendance-page', 'approval-page', 'report-page', 'user-management-page', 'admin-settings-page'].includes(item.page);
        const dropLink = document.createElement('button');
        dropLink.className = 'user-dropdown-item';
        dropLink.innerHTML = `<span style="margin-right: 8px;">${item.icon}</span> ${item.text}`;
        dropLink.onclick = () => {
          enterModule(item.page, isAdminOnly);
        };
        dropdownItems.appendChild(dropLink);
      });
    }
  }
}

// --- Dashboard Loading ---

// Helper to format days count nicely (e.g. 2.5 วัน, 1 วัน, 0 วัน)
function formatDays(val) {
  const num = parseFloat(val) || 0;
  return num.toFixed(1).replace('.0', '') + ' วัน';
}

async function loadDashboardData() {
  try {
    const select = document.getElementById('dashboard-fiscal-year-select');
    if (select && select.options.length === 0) {
      populateDashboardFiscalYearDropdown();
    }
    const fiscalYear = select ? select.value : '';

    let url = `${API_BASE_URL}/api/dashboard`;
    let queryParams = [];
    if (currentUser) {
      queryParams.push(`userId=${currentUser.userId}`);
      queryParams.push(`role=${currentUser.role}`);
    }
    if (fiscalYear) {
      queryParams.push(`fiscalYear=${fiscalYear}`);
    }
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
    const res = await fetch(url);
    const d = await res.json();
    
    if (d && d.stats) {
      // Dynamic Labels based on Role
      const totalLabel = document.getElementById('stat-total-label');
      const dashboardTitle = document.getElementById('dashboard-main-title');
      const chartTypeLabel = document.getElementById('chart-type-label');
      const chartMonthlyLabel = document.getElementById('chart-monthly-label');

      const yrDisplay = fiscalYear ? `ปีงบประมาณ ${fiscalYear}` : 'ปีงบประมาณปัจจุบัน';

      const totalStaffEl = document.getElementById('stat-total-staff');
      const approvedEl = document.getElementById('stat-approved');
      const pendingEl = document.getElementById('stat-pending');
      const rejectedEl = document.getElementById('stat-rejected');
      const travelsEl = document.getElementById('stat-travels');

      if (currentUser && currentUser.role === 'admin') {
        if (totalLabel) totalLabel.textContent = 'บุคลากรทั้งหมด';
        if (dashboardTitle) dashboardTitle.textContent = `แดชบอร์ดข้อมูลภาพรวม${yrDisplay}`;
        if (chartTypeLabel) chartTypeLabel.textContent = `สัดส่วนประเภทการลาของบุคลากร (${yrDisplay})`;
        if (chartMonthlyLabel) chartMonthlyLabel.textContent = `สถิติจำนวนการลาสะสมรายเดือน (${yrDisplay})`;
        
        if (totalStaffEl) totalStaffEl.textContent = d.stats.totalStaff;
        if (approvedEl) approvedEl.textContent = d.stats.approved;
        if (pendingEl) pendingEl.textContent = d.stats.pending;
        if (rejectedEl) rejectedEl.textContent = d.stats.rejected;
        
        const travelLabel = document.getElementById('stat-travel-label');
        if (travelLabel) travelLabel.textContent = 'ไปราชการทั้งหมด (ครั้ง)';
        if (travelsEl) travelsEl.textContent = d.stats.totalTravels;

        const loanEl = document.getElementById('stat-loan-total');
        if (loanEl) {
          const total = parseFloat(d.stats.totalLoanBudget) || 0;
          const cleared = parseFloat(d.stats.clearedLoanBudget) || 0;
          const pending = parseFloat(d.stats.pendingLoanBudget) || 0;
          loanEl.innerHTML = `<span style="font-size:0.95rem;">${total.toLocaleString('th-TH')} บาท</span><br><small style="font-size:0.7rem;color:#0d9488;font-weight:500;">เคลียร์แล้ว ${cleared.toLocaleString('th-TH')} บาท</small><br><small style="font-size:0.7rem;color:#f59e0b;font-weight:500;">ค้างเคลียร์ ${pending.toLocaleString('th-TH')} บาท</small>`;
        }
      } else {
        if (totalLabel) totalLabel.textContent = `วันลาสะสม${yrDisplay}`;
        if (dashboardTitle) dashboardTitle.textContent = `แดชบอร์ดการลาของฉัน (${yrDisplay})`;
        if (chartTypeLabel) chartTypeLabel.textContent = `สัดส่วนประเภทการลาของฉัน (${yrDisplay})`;
        if (chartMonthlyLabel) chartMonthlyLabel.textContent = `สถิติจำนวนการลาสะสมรายเดือนของฉัน (${yrDisplay})`;
        
        if (totalStaffEl) totalStaffEl.textContent = formatDays(d.stats.totalStaff);
        if (approvedEl) approvedEl.textContent = formatDays(d.stats.approved);
        if (pendingEl) pendingEl.textContent = formatDays(d.stats.pending);
        if (rejectedEl) rejectedEl.textContent = formatDays(d.stats.rejected);
        
        const travelLabel = document.getElementById('stat-travel-label');
        if (travelLabel) travelLabel.textContent = 'เดินทางไปราชการ (วัน)';
        if (travelsEl) travelsEl.textContent = formatDays(d.stats.totalTravels);

        const loanEl = document.getElementById('stat-loan-total');
        if (loanEl) {
          const total = parseFloat(d.stats.totalLoanBudget) || 0;
          const cleared = parseFloat(d.stats.clearedLoanBudget) || 0;
          const pending = parseFloat(d.stats.pendingLoanBudget) || 0;
          loanEl.innerHTML = `<span style="font-size:0.95rem;">${total.toLocaleString('th-TH')} บาท</span><br><small style="font-size:0.7rem;color:#0d9488;font-weight:500;">เคลียร์แล้ว ${cleared.toLocaleString('th-TH')} บาท</small><br><small style="font-size:0.7rem;color:#f59e0b;font-weight:500;">ค้างเคลียร์ ${pending.toLocaleString('th-TH')} บาท</small>`;
        }
      }
      
      // Render Charts
      renderCharts(d.charts);
      
      // Render Recent Leaves Table
      const tb = document.getElementById('recent-leaves-table');
      if (tb) {
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
  
  const t = document.getElementById('form-leave-type').value;
  const currDays = parseFloat(document.getElementById('form-total-days').value) || 0;

  // Use end of current fiscal year (Sep 30) as beforeDate
  // so "ลามาแล้ว" always shows the full fiscal year count
  const today = new Date();
  const todayMonth = today.getMonth(); // 0-indexed; 9 = October
  // Fiscal year ends Sep 30. If current month is Oct-Dec, fiscal year ends this year's Sep 30 (next year).
  // If Jan-Sep, fiscal year ends this year's Sep 30.
  const fiscalEndYear = todayMonth >= 9 ? today.getFullYear() + 1 : today.getFullYear();
  const beforeDate = `${fiscalEndYear}-09-30`;
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaves/stats/${currentUser.userId}?beforeDate=${beforeDate}`);
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
  
  // Populate fiscal year dropdown for history page
  populateHistoryFiscalYearDropdown();
  
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
  
  const fySelect = document.getElementById('history-fiscal-year-select');
  const filterPayload = {
    role: currentUser.role,
    userId: currentUser.userId,
    filterUserId: document.getElementById('filter-user')?.value || 'all',
    filterStartDate: document.getElementById('filter-start-date')?.value || '',
    filterEndDate: document.getElementById('filter-end-date')?.value || '',
    fiscalYear: fySelect ? fySelect.value : ''
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
          <td>
            <span style="font-size:0.875rem; color:#475569; font-weight:500;">
              ${x.staffType || '-'}
            </span>
          </td>
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
      <!-- Dummy fields to prevent browser autofill -->
      <input type="text" style="display:none;" name="dummy-username" autocomplete="username">
      <input type="password" style="display:none;" name="dummy-password" autocomplete="new-password">

      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">ชื่อ-นามสกุล</label>
          <input id="edit-fn" class="form-input" value="${u.fullName}" autocomplete="off">
        </div>
        <div>
          <label class="form-label">ตำแหน่ง</label>
          <input id="edit-pos" class="form-input" value="${u.position}" autocomplete="off">
        </div>
        <div>
          <label class="form-label">ประเภทบุคลากร</label>
          <select id="edit-type" class="form-input">
            <option value="" ${!u.staffType ? 'selected' : ''}>-- ไม่ระบุ --</option>
            <option value="ผู้บริหาร" ${u.staffType === 'ผู้บริหาร' ? 'selected' : ''}>ผู้บริหาร</option>
            <option value="ข้าราชการ" ${u.staffType === 'ข้าราชการ' ? 'selected' : ''}>ข้าราชการ</option>
            <option value="พนักงานราชการ" ${u.staffType === 'พนักงานราชการ' ? 'selected' : ''}>พนักงานราชการ</option>
            <option value="ครูพิเศษสอน" ${u.staffType === 'ครูพิเศษสอน' ? 'selected' : ''}>ครูพิเศษสอน</option>
            <option value="เจ้าหน้าที่" ${u.staffType === 'เจ้าหน้าที่' ? 'selected' : ''}>เจ้าหน้าที่</option>
          </select>
        </div>
        <div>
          <label class="form-label">สิทธิ์การเข้าถึง</label>
          <select id="edit-er" class="form-input">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>บุคลากร (User)</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ (Admin)</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>LINE User ID</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">💬 แชทบอตขอ ID</a>
          </label>
          <input id="edit-lid" class="form-input" value="${u.lineUserId || ''}" placeholder="ระบุ LINE User ID (เริ่มต้นด้วย U...)" autocomplete="off">
          <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">*พิมพ์ "ขอ ID" ในห้องแชทเพื่อขอรหัสจากบอต</p>
        </div>
        <div>
          <label class="form-label">รหัสผ่านใหม่ (ปล่อยว่างหากไม่ต้องการเปลี่ยน)</label>
          <input id="edit-eps" type="password" class="form-input" placeholder="กรอกรหัสผ่านใหม่" autocomplete="new-password">
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
        staffType: document.getElementById('edit-type').value || null,
        role: document.getElementById('edit-er').value,
        lineUserId: document.getElementById('edit-lid').value.trim() || null,
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

// Show modal to add new user manually
window.showAddUserModal = () => {
  Swal.fire({
    title: 'เพิ่มผู้ใช้งานใหม่',
    html: `
      <!-- Dummy fields to prevent browser autofill -->
      <input type="text" style="display:none;" name="dummy-username" autocomplete="username">
      <input type="password" style="display:none;" name="dummy-password" autocomplete="new-password">

      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">ชื่อ-นามสกุล <span style="color:var(--danger)">*</span></label>
          <input id="add-fn" class="form-input" placeholder="เช่น นายสมชาย ใจดี" autocomplete="off">
        </div>
        <div>
          <label class="form-label">ตำแหน่ง <span style="color:var(--danger)">*</span></label>
          <input id="add-pos" class="form-input" placeholder="เช่น ครูวิทยฐานะชำนาญการ" autocomplete="off">
        </div>
        <div>
          <label class="form-label">ประเภทบุคลากร</label>
          <select id="add-type" class="form-input">
            <option value="ข้าราชการ">ข้าราชการ</option>
            <option value="พนักงานราชการ">พนักงานราชการ</option>
            <option value="ครูพิเศษสอน" selected>ครูพิเศษสอน</option>
            <option value="เจ้าหน้าที่">เจ้าหน้าที่</option>
            <option value="ผู้บริหาร">ผู้บริหาร</option>
          </select>
        </div>
        <div>
          <label class="form-label">สิทธิ์การเข้าถึง</label>
          <select id="add-er" class="form-input">
            <option value="user" selected>บุคลากร (User)</option>
            <option value="admin">ผู้ดูแลระบบ (Admin)</option>
          </select>
        </div>
        <div>
          <label class="form-label">สถานะบัญชี</label>
          <select id="add-status" class="form-input">
            <option value="approved" selected>อนุมัติแล้ว (Approved)</option>
            <option value="pending">รออนุมัติ (Pending)</option>
          </select>
        </div>
        <div>
          <label class="form-label">ชื่อผู้ใช้ (ภาษาอังกฤษ) <span style="color:var(--danger)">*</span></label>
          <input id="add-ru" class="form-input" placeholder="Username สำหรับเข้าสู่ระบบ" autocomplete="off">
        </div>
        <div>
          <label class="form-label">รหัสผ่าน <span style="color:var(--danger)">*</span></label>
          <input id="add-rp" type="password" class="form-input" placeholder="Password สำหรับเข้าใช้งาน" autocomplete="new-password">
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>LINE User ID</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">💬 แชทบอตขอ ID</a>
          </label>
          <input id="add-lid" class="form-input" placeholder="ระบุ LINE User ID (เริ่มต้นด้วย U...)" autocomplete="off">
          <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">*พิมพ์ "ขอ ID" ในห้องแชทเพื่อขอรหัสจากบอต</p>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    preConfirm: () => {
      const fn = document.getElementById('add-fn').value;
      const pos = document.getElementById('add-pos').value;
      const type = document.getElementById('add-type').value;
      const role = document.getElementById('add-er').value;
      const status = document.getElementById('add-status').value;
      const ru = document.getElementById('add-ru').value;
      const rp = document.getElementById('add-rp').value;
      const lid = document.getElementById('add-lid').value.trim();

      if (!fn || !pos || !ru || !rp) {
        Swal.showValidationMessage('กรุณากรอกข้อมูลหลักที่จำเป็น (*) ให้ครบถ้วน');
        return false;
      }
      return {
        fullName: fn,
        position: pos,
        staffType: type || null,
        role: role,
        status: status,
        username: ru,
        password: rp,
        lineUserId: lid || null
      };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('กำลังบันทึกข้อมูลผู้ใช้งานใหม่...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const r = await res.json();
        
        if (r.success) {
          Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้งานใหม่เรียบร้อยแล้ว', 'success');
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
  return Swal.fire({
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
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed !== null) {
                  label += context.parsed.toFixed(1).replace('.0', '') + ' วัน';
                }
                return label;
              }
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
          label: 'จำนวนการลา (วัน)',
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
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label = 'จำนวนวันลา: ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toFixed(1).replace('.0', '') + ' วัน';
                }
                return label;
              }
            }
          }
        }
      }
    });
  }
}

// ==========================================
// --- Attendance Check-in Controller ---
// ==========================================

function initAttendancePage() {
  const dateInput = document.getElementById('attendance-date');
  if (!dateInput.value) {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset*60*1000));
    dateInput.value = localToday.toISOString().split('T')[0];
  }
  loadAttendanceData();
}

async function loadAttendanceData() {
  const date = document.getElementById('attendance-date').value;
  if (!date) {
    Swal.fire('ข้อผิดพลาด', 'กรุณาระบุวันที่ต้องการดึงข้อมูล', 'error');
    return;
  }

  showLoading('กำลังดึงข้อมูลการลงเวลา...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/attendance?date=${date}`);
    if (!res.ok) throw new Error('ดึงข้อมูลการเข้าปฏิบัติงานล้มเหลว');
    
    const data = await res.json();
    
    // Sort data:
    // 1. ผู้บริหาร
    // 2. ข้าราชการ
    // 3. พนักงานราชการ
    // 4. ครูพิเศษสอน
    // 5. เจ้าหน้าที่
    // 6. Others/Empty
    const staffTypeOrder = [
      'ผู้บริหาร',
      'ข้าราชการ',
      'พนักงานราชการ',
      'ครูพิเศษสอน',
      'เจ้าหน้าที่'
    ];
    const getStaffTypePriority = (type) => {
      const idx = staffTypeOrder.indexOf(type);
      return idx === -1 ? 999 : idx;
    };
    
    data.sort((a, b) => {
      const pA = getStaffTypePriority(a.staffType);
      const pB = getStaffTypePriority(b.staffType);
      if (pA !== pB) {
        return pA - pB;
      }
      return (a.fullName || '').localeCompare(b.fullName || '', 'th');
    });

    currentAttendanceData = data;
    
    const filterSelect = document.getElementById('attendance-filter-type');
    if (filterSelect) {
      filterSelect.value = 'ทั้งหมด';
    }

    filterAndRenderAttendance();
    Swal.close();
  } catch (err) {
    console.error('Error loading attendance:', err);
    Swal.fire('ข้อผิดพลาด', err.message, 'error');
  }
}

function filterAndRenderAttendance() {
  const filterSelect = document.getElementById('attendance-filter-type');
  const filterType = filterSelect ? filterSelect.value : 'ทั้งหมด';
  let filtered = [...currentAttendanceData];
  
  if (filterType !== 'ทั้งหมด') {
    if (filterType === 'อื่นๆ') {
      const knownTypes = ['ผู้บริหาร', 'ข้าราชการ', 'พนักงานราชการ', 'ครูพิเศษสอน', 'เจ้าหน้าที่'];
      filtered = filtered.filter(u => !u.staffType || !knownTypes.includes(u.staffType));
    } else {
      filtered = filtered.filter(u => u.staffType === filterType);
    }
  }
  
  renderAttendanceTable(filtered);
}

function renderAttendanceTable(dataList) {
  const tbody = document.getElementById('attendance-table-body');
  tbody.innerHTML = '';

  if (dataList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:24px; color:var(--neutral-400);">ไม่พบรายชื่อบุคลากร</td></tr>`;
    return;
  }

  dataList.forEach(user => {
    let leaveBadge = '-';
    if (user.activeLeave) {
      let badgeColor = 'var(--warning)';
      let badgeBg = 'var(--warning-light)';
      if (user.activeLeave.leaveType === 'ลาป่วย') {
        badgeColor = '#ef4444';
        badgeBg = '#fef2f2';
      }
      leaveBadge = `<span style="background:${badgeBg}; color:${badgeColor}; padding:4px 8px; border-radius:6px; font-size:0.8rem; font-weight:600; display:inline-block;">⚠️ ลา: ${user.activeLeave.leaveType} (${user.activeLeave.status})</span>`;
    } else if (user.activeTravel) {
      leaveBadge = `<span style="background:#f5f3ff; color:#7c3aed; padding:4px 8px; border-radius:6px; font-size:0.8rem; font-weight:600; display:inline-block;">✈️ ไปราชการ (${user.activeTravel.status})</span>`;
    }

    tbody.innerHTML += `
      <tr>
        <td style="font-weight: 500; text-align: left; padding-left: 20px;">
          ${user.fullName}
          <div style="font-size:0.75rem; color:var(--neutral-500); margin-top:2px;">
            ${user.staffType || 'ไม่ระบุประเภท'}
          </div>
        </td>
        <td style="text-align: left; padding-left: 20px;">${user.position}</td>
        <td id="leave-badge-col-${user.userId}">${leaveBadge}</td>
        <td style="text-align: center;">
          <select class="form-input attendance-select" data-user-id="${user.userId}" style="padding: 6px 12px; font-size: 0.9rem; font-weight: bold; width: 100%; border-radius: 8px;">
            <option value="มาปฏิบัติงาน" ${user.status === 'มาปฏิบัติงาน' ? 'selected' : ''}>มาปฏิบัติงาน</option>
            <option value="ลาป่วย" ${user.status === 'ลาป่วย' ? 'selected' : ''}>ลาป่วย</option>
            <option value="ลากิจ" ${user.status === 'ลากิจ' ? 'selected' : ''}>ลากิจ</option>
            <option value="ลาคลอด" ${user.status === 'ลาคลอด' ? 'selected' : ''}>ลาคลอด</option>
            <option value="ลาพักผ่อน" ${user.status === 'ลาพักผ่อน' ? 'selected' : ''}>ลาพักผ่อน</option>
            <option value="เดินทางไปราชการ" ${user.status === 'เดินทางไปราชการ' ? 'selected' : ''}>เดินทางไปราชการ</option>
            <option value="ขาด" ${user.status === 'ขาด' ? 'selected' : ''}>ขาด</option>
            <option value="มาสาย" ${user.status === 'มาสาย' ? 'selected' : ''}>มาสาย</option>
            <option value="ไม่ทราบสาเหตุ" ${user.status === 'ไม่ทราบสาเหตุ' ? 'selected' : ''}>ไม่ทราบสาเหตุ</option>
          </select>
        </td>
      </tr>
    `;
  });

  const selects = tbody.querySelectorAll('.attendance-select');
  selects.forEach(select => {
    styleAttendanceSelect(select);
    select.addEventListener('change', () => {
      const userId = select.getAttribute('data-user-id');
      const user = currentAttendanceData.find(u => u.userId == userId);
      if (user) {
        user.status = select.value;
      }
      styleAttendanceSelect(select);
    });
  });
}

function styleAttendanceSelect(selectEl) {
  const val = selectEl.value;
  if (val === 'มาปฏิบัติงาน') {
    selectEl.style.color = '#10B981';
    selectEl.style.borderColor = '#10B981';
    selectEl.style.backgroundColor = '#ECFDF5';
  } else if (val.startsWith('ลา')) {
    selectEl.style.color = '#D97706';
    selectEl.style.borderColor = '#F59E0B';
    selectEl.style.backgroundColor = '#FFFBEB';
  } else if (val === 'เดินทางไปราชการ') {
    selectEl.style.color = '#7C3AED';
    selectEl.style.borderColor = '#8B5CF6';
    selectEl.style.backgroundColor = '#F5F3FF';
  } else if (val === 'ขาด' || val === 'ไม่ทราบสาเหตุ') {
    selectEl.style.color = '#EF4444';
    selectEl.style.borderColor = '#EF4444';
    selectEl.style.backgroundColor = '#FEF2F2';
  } else if (val === 'มาสาย') {
    selectEl.style.color = '#3B82F6';
    selectEl.style.borderColor = '#3B82F6';
    selectEl.style.backgroundColor = '#EFF6FF';
  }
}

async function saveAttendanceData() {
  const date = document.getElementById('attendance-date').value;
  if (!date) {
    Swal.fire('ข้อผิดพลาด', 'กรุณาระบุวันที่บันทึก', 'error');
    return;
  }

  const records = currentAttendanceData.map(u => ({
    userId: u.userId,
    status: u.status
  }));

  if (records.length === 0) {
    Swal.fire('ข้อผิดพลาด', 'ไม่มีข้อมูลสำหรับบันทึก', 'error');
    return;
  }

  showLoading('กำลังบันทึกข้อมูลและส่งแจ้งเตือน LINE...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date,
        records,
        adminUserId: currentUser.userId
      })
    });

    if (!res.ok) throw new Error('บันทึกข้อมูลล้มเหลว');
    const result = await res.json();
    
    if (result.success) {
      Swal.fire('สำเร็จ', 'บันทึกข้อมูลและส่งแจ้งเตือนทางไลน์เรียบร้อยแล้ว', 'success');
      loadAttendanceData();
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    console.error('Error saving attendance:', err);
    Swal.fire('ข้อผิดพลาด', err.message, 'error');
  }
}

// ==========================================
// --- Travel Request & Report Controllers ---
// ==========================================

function calculateTravelDays() {
  const startInput = document.getElementById('travel-start-date');
  const endInput = document.getElementById('travel-end-date');
  const daysInput = document.getElementById('travel-total-days');
  const allowanceDays = document.getElementById('travel-days-allowance');
  const rentDays = document.getElementById('travel-days-rent');
  
  if (startInput && endInput && startInput.value && endInput.value) {
    const sDate = new Date(startInput.value);
    const eDate = new Date(endInput.value);
    if (eDate >= sDate) {
      const diffTime = Math.abs(eDate - sDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (daysInput) daysInput.value = diffDays;
      if (allowanceDays) allowanceDays.value = diffDays;
      if (rentDays) rentDays.value = Math.max(0, diffDays - 1);
      
      calculateExpenses();
      return;
    }
  }
  
  if (daysInput) daysInput.value = '';
  if (allowanceDays) allowanceDays.value = 0;
  if (rentDays) rentDays.value = 0;
  calculateExpenses();
}

// Tab switching for travel request form
window.switchTravelTab = (tabId) => {
  const tabs = document.querySelectorAll('.travel-tab-content');
  const buttons = document.querySelectorAll('.travel-tab-btn');
  const navBars = document.querySelectorAll('.travel-tab-nav');

  // Tab nav mapping
  const navMap = {
    'travel-tab-memo':       'travel-nav-tab1',
    'travel-tab-estimation': 'travel-nav-tab2',
    'travel-tab-loan':       'travel-nav-tab3'
  };

  tabs.forEach(tab => {
    if (tab.id === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  buttons.forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Show matching nav bar, hide others
  navBars.forEach(nav => nav.classList.remove('active'));
  const activeNavId = navMap[tabId];
  if (activeNavId) {
    const activeNav = document.getElementById(activeNavId);
    if (activeNav) activeNav.classList.add('active');
  }

  if (tabId === 'travel-tab-estimation') {
    calculateTravelDays();
  }
};

// Alias used by Next / Back buttons inside the tabs
window.travelGoToTab = window.switchTravelTab;


// Traveler dynamic rows management
window.addTravelerRow = (name = '', position = '') => {
  const container = document.getElementById('travel-accompanied-list');
  if (!container) return;
  
  const div = document.createElement('div');
  div.className = 'travel-traveler-row';
  div.style.display = 'flex';
  div.style.gap = '10px';
  div.style.alignItems = 'center';
  div.style.marginTop = '8px';
  
  div.innerHTML = `
    <input type="text" class="form-input travel-accompanied-name" placeholder="ชื่อ-นามสกุล..." value="${name}" required style="flex-grow: 1;">
    <input type="text" class="form-input travel-accompanied-pos" placeholder="ตำแหน่ง..." value="${position}" required style="width: 200px;">
    <button type="button" class="btn btn-outline btn-sm" onclick="removeTravelerRow(this)" style="padding: 10px; border-color:var(--danger); color:var(--danger);">❌</button>
  `;
  container.appendChild(div);
  updateTravelersCount();
};

window.removeTravelerRow = (button) => {
  button.parentElement.remove();
  updateTravelersCount();
};

function updateTravelersCount() {
  const rows = document.querySelectorAll('.travel-traveler-row').length;
  const totalPeople = rows + 1;
  const peopAllow = document.getElementById('travel-people-allowance');
  const peopRent = document.getElementById('travel-people-rent');
  if (peopAllow) peopAllow.value = totalPeople;
  if (peopRent) peopRent.value = totalPeople;
  calculateExpenses();
}

// ============================================================
// Vehicle Type Panel Functions
// ============================================================
window.onVehicleTypeChange = () => {
  const type = document.getElementById('travel-vehicle-type-select').value;
  const panelDist    = document.getElementById('vehicle-panel-distance');
  const panelTicket  = document.getElementById('vehicle-panel-ticket');
  const panelHolder  = document.getElementById('vehicle-panel-placeholder');
  const modeToggle   = document.getElementById('veh-mode-toggle');

  // Hide all panels first
  panelDist.style.display   = 'none';
  panelTicket.style.display = 'none';
  panelHolder.style.display = 'none';

  if (type === 'gov_car' || type === 'personal_car') {
    panelDist.style.display = 'block';
    // Show mode toggle only for gov_car; personal_car always uses distance calc
    if (modeToggle) modeToggle.style.display = type === 'gov_car' ? 'flex' : 'none';
    // personal_car: always calc mode
    if (type === 'personal_car') setVehicleMode('calc');
    calcDistanceCost();
  } else if (type === 'bus' || type === 'train' || type === 'plane') {
    panelTicket.style.display = 'block';
    // Add first leg if empty
    const legs = document.getElementById('vehicle-ticket-legs');
    if (legs && legs.children.length === 0) addTicketLeg();
    calcTicketTotal();
  } else {
    panelHolder.style.display = 'block';
  }
  calculateExpenses();
};

// Toggle between distance-calc mode and direct-loan mode
let _vehicleMode = 'calc';
window.setVehicleMode = (mode) => {
  _vehicleMode = mode;
  const subCalc = document.getElementById('veh-subpanel-calc');
  const subLoan = document.getElementById('veh-subpanel-loan');
  const btnCalc = document.getElementById('veh-mode-btn-calc');
  const btnLoan = document.getElementById('veh-mode-btn-loan');

  if (mode === 'calc') {
    if (subCalc) subCalc.style.display = 'block';
    if (subLoan) subLoan.style.display = 'none';
    if (btnCalc) { btnCalc.style.background = '#3b82f6'; btnCalc.style.color = '#fff'; }
    if (btnLoan) { btnLoan.style.background = '#f1f5f9'; btnLoan.style.color = '#475569'; }
  } else {
    if (subCalc) subCalc.style.display = 'none';
    if (subLoan) subLoan.style.display = 'block';
    if (btnLoan) { btnLoan.style.background = '#3b82f6'; btnLoan.style.color = '#fff'; }
    if (btnCalc) { btnCalc.style.background = '#f1f5f9'; btnCalc.style.color = '#475569'; }
  }
  calcDistanceCost();
};

window.calcDistanceCost = () => {
  let total = 0;
  if (_vehicleMode === 'loan') {
    total = parseFloat(document.getElementById('veh-loan-amount')?.value) || 0;
    const loanTxt = document.getElementById('veh-loan-total-txt');
    if (loanTxt) loanTxt.textContent = total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    const km        = parseFloat(document.getElementById('veh-dist-km')?.value) || 0;
    const roundtrip = document.getElementById('veh-dist-roundtrip')?.checked;
    total           = km * 4 * (roundtrip ? 2 : 1);
    const txtEl     = document.getElementById('veh-dist-total-txt');
    if (txtEl) txtEl.textContent = total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const hidEl = document.getElementById('veh-dist-total');
  if (hidEl) hidEl.value = total;
  calculateExpenses();
};

let ticketLegCounter = 0;
window.addTicketLeg = () => {
  const container = document.getElementById('vehicle-ticket-legs');
  if (!container) return;
  const id = ++ticketLegCounter;
  const div = document.createElement('div');
  div.id = `ticket-leg-${id}`;
  div.style.cssText = 'border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:12px; background:#f8fafc;';
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <span style="font-size:0.82rem; font-weight:700; color:#475569;">เส้นทางที่ ${id}</span>
      <button type="button" class="btn btn-outline btn-xs" onclick="removeTicketLeg(${id})" style="border-color:var(--danger);color:var(--danger);">❌ ลบ</button>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px;">
      <div>
        <label style="font-size:0.78rem; font-weight:600; color:#64748b;">ต้นทาง</label>
        <input type="text" class="form-input form-input-sm ticket-leg-from" placeholder="เช่น น่าน">
      </div>
      <div>
        <label style="font-size:0.78rem; font-weight:600; color:#64748b;">ปลายทาง</label>
        <input type="text" class="form-input form-input-sm ticket-leg-to" placeholder="เช่น กรุงเทพฯ">
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px;">
      <div>
        <label style="font-size:0.78rem; font-weight:600; color:#64748b;">วัน-เวลาออก (ไป)</label>
        <input type="datetime-local" class="form-input form-input-sm ticket-leg-depart">
      </div>
      <div>
        <label style="font-size:0.78rem; font-weight:600; color:#64748b;">ราคาตั๋วขาไป (บาท)</label>
        <input type="number" class="form-input form-input-sm ticket-leg-price-go" placeholder="0" min="0" oninput="calcTicketTotal()">
      </div>
      <div>
        <label style="font-size:0.78rem; font-weight:600; color:#64748b;">วัน-เวลากลับ</label>
        <input type="datetime-local" class="form-input form-input-sm ticket-leg-return">
      </div>
      <div>
        <label style="font-size:0.78rem; font-weight:600; color:#64748b;">ราคาตั๋วขากลับ (บาท)</label>
        <input type="number" class="form-input form-input-sm ticket-leg-price-back" placeholder="0" min="0" oninput="calcTicketTotal()">
      </div>
    </div>
  `;
  container.appendChild(div);
  calcTicketTotal();
};

window.removeTicketLeg = (id) => {
  const el = document.getElementById(`ticket-leg-${id}`);
  if (el) el.remove();
  calcTicketTotal();
};

window.calcTicketTotal = () => {
  let total = 0;
  document.querySelectorAll('.ticket-leg-price-go, .ticket-leg-price-back').forEach(inp => {
    total += parseFloat(inp.value) || 0;
  });
  const txtEl = document.getElementById('veh-ticket-total-txt');
  const hidEl = document.getElementById('veh-ticket-total');
  if (txtEl) txtEl.textContent = total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (hidEl) hidEl.value = total;
  calculateExpenses();
};

// Legacy stubs kept for backward compatibility
window.addRouteRow = () => {};
window.removeRouteRow = () => {};


// Toggle extra vehicle fields
window.toggleVehicleFields = () => {
  const type = document.querySelector('input[name="travel-vehicle-type"]:checked').value;
  const extra = document.getElementById('travel-vehicle-extra-fields');
  if (extra) {
    if (type === 'gov' || type === 'personal') {
      extra.style.display = 'grid';
    } else {
      extra.style.display = 'none';
    }
  }
};

// Toggle expense category fields
window.toggleExpenseFields = () => {
  const type = document.querySelector('input[name="travel-expense-type"]:checked').value;
  const estTab = document.querySelectorAll('.travel-tab-btn')[1];
  const loanTab = document.querySelectorAll('.travel-tab-btn')[2];
  
  if (type === 'claim') {
    if (estTab) estTab.removeAttribute('disabled');
  } else {
    if (estTab) estTab.setAttribute('disabled', 'true');
    if (loanTab) {
      document.getElementById('travel-has-loan').checked = false;
      toggleLoanForm();
    }
  }
};

// Toggle loan form fields
window.toggleLoanForm = () => {
  const checked = document.getElementById('travel-has-loan').checked;
  const container = document.getElementById('travel-loan-form-container');
  if (container) {
    if (checked) {
      container.style.display = 'block';
      // Pull figures from Estimation section
      document.getElementById('travel-loan-allowance').value = parseFloat(document.getElementById('travel-total-allowance-txt').textContent.replace(/,/g, '')) || 0;
      document.getElementById('travel-loan-rent').value = parseFloat(document.getElementById('travel-total-rent-txt').textContent.replace(/,/g, '')) || 0;
      
      // Calculate total transportation cost from routes
      let routeTotal = 0;
      document.querySelectorAll('.travel-route-cost').forEach(input => {
        routeTotal += parseFloat(input.value) || 0;
      });
      document.getElementById('travel-loan-fuel').value = routeTotal;
      
      // Sync purpose and location
      document.getElementById('travel-loan-purpose').value = document.getElementById('travel-subject').value;
      document.getElementById('travel-loan-location').value = document.getElementById('travel-destination').value;
      
      calculateLoanTotal();
    } else {
      container.style.display = 'none';
    }
  }
};

// Calculate expenses
window.calculateExpenses = () => {
  // 1. Vehicle costs from new panels
  const vehicleType = document.getElementById('travel-vehicle-type-select')?.value || '';
  let routeTotal = 0;
  if (vehicleType === 'gov_car' || vehicleType === 'personal_car') {
    routeTotal = parseFloat(document.getElementById('veh-dist-total')?.value) || 0;
  } else if (vehicleType === 'bus' || vehicleType === 'train' || vehicleType === 'plane') {
    routeTotal = parseFloat(document.getElementById('veh-ticket-total')?.value) || 0;
  }

  // 2. Allowance
  const rateAllow = parseFloat(document.getElementById('travel-rate-allowance').value) || 0;
  const daysAllow = parseFloat(document.getElementById('travel-days-allowance').value) || 0;
  const peopleAllow = parseFloat(document.getElementById('travel-people-allowance').value) || 0;
  const totalAllow = rateAllow * daysAllow * peopleAllow;
  const allowTxt = document.getElementById('travel-total-allowance-txt');
  if (allowTxt) allowTxt.textContent = totalAllow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // 3. Rent
  const rateRent = parseFloat(document.getElementById('travel-rate-rent').value) || 0;
  const daysRent = parseFloat(document.getElementById('travel-days-rent').value) || 0;
  const peopleRent = parseFloat(document.getElementById('travel-people-rent').value) || 0;
  const totalRent = rateRent * daysRent * peopleRent;
  const rentTxt = document.getElementById('travel-total-rent-txt');
  if (rentTxt) rentTxt.textContent = totalRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // 4. Other costs
  const otherCost = parseFloat(document.getElementById('travel-other-cost').value) || 0;
  
  // 5. Grand total
  const grandTotal = routeTotal + totalAllow + totalRent + otherCost;
  const grandTxt = document.getElementById('travel-grand-total-txt');
  if (grandTxt) grandTxt.textContent = grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // Sync loan form if active
  const loanCheck = document.getElementById('travel-has-loan');
  if (loanCheck && loanCheck.checked) {
    document.getElementById('travel-loan-allowance').value = totalAllow;
    document.getElementById('travel-loan-rent').value = totalRent;
    document.getElementById('travel-loan-fuel').value = routeTotal;
    calculateLoanTotal();
  }
};

// Calculate loan total
window.calculateLoanTotal = () => {
  const allow = parseFloat(document.getElementById('travel-loan-allowance').value) || 0;
  const rent = parseFloat(document.getElementById('travel-loan-rent').value) || 0;
  const fuel = parseFloat(document.getElementById('travel-loan-fuel').value) || 0;
  const total = allow + rent + fuel;
  
  const totalTxt = document.getElementById('travel-loan-total-txt');
  const totalThaiTxt = document.getElementById('travel-loan-total-thai-txt');
  if (totalTxt) totalTxt.textContent = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (totalThaiTxt) totalThaiTxt.textContent = numToThaiBath(total);
};

// Helper: Convert number to Thai Baht text format
function numToThaiBath(num) {
  if (num === 0) return 'ศูนย์บาทถ้วน';
  const textNum = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ'];
  const textPosition = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  let str = num.toFixed(2).split('.');
  let integerPart = str[0];
  let decimalPart = str[1];
  
  let resText = '';
  
  // Process integer part
  let len = integerPart.length;
  for (let i = 0; i < len; i++) {
    let digit = parseInt(integerPart.charAt(i));
    let pos = len - 1 - i;
    
    if (digit !== 0) {
      if (pos === 0 && digit === 1 && len > 1) {
        resText += 'เอ็ด';
      } else if (pos === 1 && digit === 1) {
        resText += 'สิบ';
      } else if (pos === 1 && digit === 2) {
        resText += 'ยี่สิบ';
      } else {
        resText += textNum[digit] + textPosition[pos];
      }
    }
  }
  
  if (resText !== '') resText += 'บาท';
  
  // Process decimal part
  if (parseInt(decimalPart) === 0) {
    resText += 'ถ้วน';
  } else {
    let decLen = decimalPart.length;
    for (let i = 0; i < decLen; i++) {
      let digit = parseInt(decimalPart.charAt(i));
      let pos = decLen - 1 - i;
      if (digit !== 0) {
        if (pos === 0 && digit === 1 && decLen > 1) {
          resText += 'เอ็ด';
        } else if (pos === 1 && digit === 1) {
          resText += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          resText += 'ยี่สิบ';
        } else {
          resText += textNum[digit] + textPosition[pos];
        }
      }
    }
    resText += 'สตางค์';
  }
  return resText;
}

async function initTravelPage() {
  if (!currentUser) return;
  const form = document.getElementById('travel-request-form');
  if (form) form.reset();
  
  // Set default values
  const docDate = document.getElementById('travel-doc-date');
  if (docDate) docDate.value = new Date().toISOString().substring(0, 10);
  
  const reqName = document.getElementById('travel-requester-name');
  if (reqName) reqName.value = currentUser.fullName;
  
  const accList = document.getElementById('travel-accompanied-list');
  if (accList) accList.innerHTML = '';
  
  // Reset vehicle panels
  const vehicleSelect = document.getElementById('travel-vehicle-type-select');
  if (vehicleSelect) vehicleSelect.value = '';
  const panelDist   = document.getElementById('vehicle-panel-distance');
  const panelTicket = document.getElementById('vehicle-panel-ticket');
  const panelHolder = document.getElementById('vehicle-panel-placeholder');
  if (panelDist)   panelDist.style.display   = 'none';
  if (panelTicket) panelTicket.style.display = 'none';
  if (panelHolder) panelHolder.style.display = 'block';
  const ticketLegs = document.getElementById('vehicle-ticket-legs');
  if (ticketLegs)  ticketLegs.innerHTML = '';
  ticketLegCounter = 0;
  _vehicleMode = 'calc';

  
  // Reset tabs
  switchTravelTab('travel-tab-memo');
  
  await loadTravelHistory();
}

async function loadTravelHistory() {
  const listTitle = document.getElementById('travel-list-title');
  if (!listTitle) return;
  
  if (currentUser.role === 'admin') {
    listTitle.textContent = '📋 รายการคำขอไปราชการทั้งหมด (แอดมิน)';
  } else {
    listTitle.textContent = '📋 ประวัติการยื่นคำขอไปราชการของคุณ';
  }
  
  try {
    const url = currentUser.role === 'admin' 
      ? `${API_BASE_URL}/api/travel`
      : `${API_BASE_URL}/api/travel?userId=${currentUser.userId}`;
      
    const res = await fetch(url);
    const travels = await res.json();
    
    const tbody = document.getElementById('travel-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (travels.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:16px; color:var(--neutral-400);">ไม่มีรายการคำขอไปราชการ</td></tr>`;
      return;
    }
    
    travels.forEach(t => {
      let actionHtml = '-';
      if (currentUser.role === 'admin' && t.status === 'รอการอนุมัติ') {
        actionHtml = `
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="approveTravel('${t.travelId}', 'อนุมัติ')" style="padding:4px 8px; font-size:11px;">อนุมัติ</button>
            <button class="btn btn-danger btn-sm" onclick="approveTravel('${t.travelId}', 'ไม่อนุมัติ')" style="padding:4px 8px; font-size:11px; background:#ef4444; border-color:#ef4444; color:white;">ปฏิเสธ</button>
          </div>
        `;
      }
      
      const budgetText = parseFloat(t.budget) > 0 ? ` (งบ ${parseFloat(t.budget).toLocaleString()} บ.)` : '';
      
      tbody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight:600; color:var(--neutral-800);">${t.subject}</div>
            <div style="font-size:11px; color:var(--neutral-500);">📍 ${t.destination}${budgetText}</div>
            ${currentUser.role === 'admin' ? `<div style="font-size:11px; color:#0369a1; font-weight:500;">ผู้ขอ: ${t.fullName}</div>` : ''}
          </td>
          <td>
            <div style="font-weight:500;">${formatDate(t.startDate)}</div>
            <div style="font-size:11px; color:var(--neutral-500);">ถึง ${formatDate(t.endDate)}</div>
          </td>
          <td style="text-align:center; font-weight:bold;">${parseFloat(t.totalDays)}</td>
          <td>${renderBadge(t.status)}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error loading travel history:', err);
  }
}

async function approveTravel(travelId, status) {
  const confirmText = status === 'อนุมัติ' ? 'อนุมัติคำขอไปราชการนี้?' : 'ปฏิเสธคำขอไปราชการนี้?';
  const result = await Swal.fire({
    title: 'ยืนยันการดำเนินการ',
    text: confirmText,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก'
  });
  
  if (result.isConfirmed) {
    showLoading('กำลังบันทึกข้อมูล...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/travel/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travelId, status })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('สำเร็จ', data.message, 'success');
        loadTravelHistory();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('เกิดข้อผิดพลาด: ' + err.message);
    }
  }
}

async function handleTravelSubmit(e) {
  e.preventDefault();
  const subject = document.getElementById('travel-subject').value;
  const destination = document.getElementById('travel-destination').value;
  const startDate = document.getElementById('travel-start-date').value;
  const endDate = document.getElementById('travel-end-date').value;
  const totalDays = parseFloat(document.getElementById('travel-total-days').value);
  const budget = parseFloat(document.getElementById('travel-budget').value) || 0;
  const vehicleType = document.getElementById('travel-vehicle').value;
  
  if (totalDays <= 0) {
    Swal.fire('ข้อผิดพลาด', 'วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 'error');
    return;
  }
  
  const travelers = [];
  document.querySelectorAll('.travel-traveler-row').forEach(row => {
    const nameInput = row.querySelector('.traveler-name');
    const posInput = row.querySelector('.traveler-position');
    if (nameInput && nameInput.value.trim()) {
      travelers.push({
        name: nameInput.value.trim(),
        position: posInput ? posInput.value.trim() : ''
      });
    }
  });

  // Collect vehicle transport data from new panels
  const vehicleTypeVal = document.getElementById('travel-vehicle-type-select')?.value || '';
  const vehicleData = { type: vehicleTypeVal, routeTotal: 0 };
  const routes = [];

  if (vehicleTypeVal === 'gov_car' || vehicleTypeVal === 'personal_car') {
    vehicleData.mode = _vehicleMode;
    if (_vehicleMode === 'loan' && vehicleTypeVal === 'gov_car') {
      const loanAmt = parseFloat(document.getElementById('veh-loan-amount')?.value) || 0;
      vehicleData.from = document.getElementById('veh-loan-from')?.value || '';
      vehicleData.to   = document.getElementById('veh-loan-to')?.value   || '';
      vehicleData.note = document.getElementById('veh-loan-note')?.value  || '';
      vehicleData.loanAmount = loanAmt;
      vehicleData.total = loanAmt;
      vehicleData.routeTotal = loanAmt;
      routes.push({ from: vehicleData.from, to: vehicleData.to, vehicle: vehicleTypeVal, cost: loanAmt });
    } else {
      const km = parseFloat(document.getElementById('veh-dist-km')?.value) || 0;
      const roundtrip = document.getElementById('veh-dist-roundtrip')?.checked;
      const total = km * 4 * (roundtrip ? 2 : 1);
      vehicleData.from = document.getElementById('veh-dist-from')?.value || '';
      vehicleData.to = document.getElementById('veh-dist-to')?.value || '';
      vehicleData.km = km;
      vehicleData.roundtrip = roundtrip;
      vehicleData.total = total;
      vehicleData.routeTotal = total;
      routes.push({ from: vehicleData.from, to: vehicleData.to, vehicle: vehicleTypeVal, cost: total });
    }
  } else if (vehicleTypeVal === 'bus' || vehicleTypeVal === 'train' || vehicleTypeVal === 'plane') {
    const legs = [];
    document.querySelectorAll('#vehicle-ticket-legs > div').forEach(legEl => {
      legs.push({
        from: legEl.querySelector('.ticket-leg-from')?.value || '',
        to: legEl.querySelector('.ticket-leg-to')?.value || '',
        departDatetime: legEl.querySelector('.ticket-leg-depart')?.value || '',
        returnDatetime: legEl.querySelector('.ticket-leg-return')?.value || '',
        priceGo: parseFloat(legEl.querySelector('.ticket-leg-price-go')?.value) || 0,
        priceBack: parseFloat(legEl.querySelector('.ticket-leg-price-back')?.value) || 0
      });
    });
    vehicleData.legs = legs;
    vehicleData.routeTotal = parseFloat(document.getElementById('veh-ticket-total')?.value) || 0;
    vehicleData.total = vehicleData.routeTotal;
    legs.forEach(l => routes.push({ from: l.from, to: l.to, vehicle: vehicleTypeVal, cost: l.priceGo + l.priceBack }));
  }

  const detailsObj = {
    docDate: document.getElementById('travel-doc-date')?.value || '',
    requesterName: document.getElementById('travel-requester-name')?.value || '',
    department: document.getElementById('travel-department')?.value || '',
    travelers,
    routes,
    vehicleData,
    allowance: {
      days: parseFloat(document.getElementById('travel-days-allowance')?.value) || 0,
      rate: parseFloat(document.getElementById('travel-rate-allowance')?.value) || 0,
      total: parseFloat(document.getElementById('travel-total-allowance-txt')?.textContent?.replace(/,/g,'')) || 0
    },
    rent: {
      days: parseFloat(document.getElementById('travel-days-rent')?.value) || 0,
      rate: parseFloat(document.getElementById('travel-rate-rent')?.value) || 0,
      total: parseFloat(document.getElementById('travel-total-rent-txt')?.textContent?.replace(/,/g,'')) || 0
    },
    hasLoan: document.getElementById('travel-has-loan')?.checked || false,
    loan: {
      docNo: document.getElementById('travel-loan-doc-no')?.value || '',
      loanAmount: parseFloat(document.getElementById('travel-loan-amount')?.value) || 0,
      thaiBathText: document.getElementById('travel-loan-thai-bath')?.value || ''
    }
  };
  
  showLoading('กำลังยื่นคำขอไปราชการ...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/travel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.userId,
        fullName: currentUser.fullName,
        subject,
        destination,
        startDate,
        endDate,
        totalDays,
        budget,
        vehicleType,
        details: JSON.stringify(detailsObj)
      })
    });
    
    const data = await res.json();
    if (data.success) {
      Swal.fire('สำเร็จ', 'ยื่นคำขอไปราชการเรียบร้อยแล้ว', 'success');
      initTravelPage();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('เกิดข้อผิดพลาด: ' + err.message);
  }
}

let reportUploadedPhotos = [];
let approvedTravelsList = [];

async function initTravelReportPage() {
  if (!currentUser) return;
  const form = document.getElementById('travel-report-form');
  if (form) form.reset();
  
  reportUploadedPhotos = [];
  const previewContainer = document.getElementById('report-photo-previews');
  if (previewContainer) previewContainer.innerHTML = '';
  
  const infoCard = document.getElementById('report-travel-info-card');
  if (infoCard) infoCard.style.display = 'none';
  
  const userNameInput = document.getElementById('report-user-name');
  if (userNameInput) userNameInput.value = currentUser.fullName;
  
  await loadApprovedTravelsDropdown();
  await loadTravelReportsHistory();
}

async function loadApprovedTravelsDropdown() {
  const select = document.getElementById('report-travel-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- กรุณาเลือกรายการ --</option>';
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/travel?userId=${currentUser.userId}`);
    const travels = await res.json();
    approvedTravelsList = travels.filter(t => t.status === 'อนุมัติ');
    
    if (approvedTravelsList.length === 0) {
      select.innerHTML = '<option value="">-- ไม่มีประวัติเดินทางที่อนุมัติ --</option>';
      return;
    }
    
    approvedTravelsList.forEach(t => {
      const option = document.createElement('option');
      option.value = t.travelId;
      option.textContent = `${t.subject} ณ ${t.destination} (${formatDate(t.startDate)} - ${formatDate(t.endDate)})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading approved travels for dropdown:', err);
  }
}

window.handleReportTravelSelect = (travelId) => {
  const infoCard = document.getElementById('report-travel-info-card');
  if (!infoCard) return;
  
  if (!travelId) {
    infoCard.style.display = 'none';
    return;
  }
  
  const travel = approvedTravelsList.find(t => t.travelId === travelId);
  if (!travel) return;
  
  infoCard.style.display = 'block';
  document.getElementById('info-report-subject').textContent = travel.subject;
  document.getElementById('info-report-destination').textContent = travel.destination;
  document.getElementById('info-report-dates').textContent = `${formatDate(travel.startDate)} - ${formatDate(travel.endDate)}`;
  document.getElementById('info-report-budget').textContent = parseFloat(travel.budget).toLocaleString('en-US', { minimumFractionDigits: 2 });
  
  // Autofill defaults
  document.getElementById('report-subject').value = travel.subject;
  document.getElementById('report-budget').value = travel.budget;
};

window.previewReportPhotos = (input) => {
  const previewContainer = document.getElementById('report-photo-previews');
  if (!previewContainer) return;
  previewContainer.innerHTML = '';
  reportUploadedPhotos = [];
  
  const files = Array.from(input.files).slice(0, 4); // max 4 photos
  
  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      reportUploadedPhotos.push(base64);
      
      const div = document.createElement('div');
      div.className = 'photo-preview-item';
      div.style.position = 'relative';
      div.style.width = '140px';
      div.style.height = '140px';
      div.style.border = '1px solid #cbd5e1';
      div.style.borderRadius = '6px';
      div.style.overflow = 'hidden';
      div.style.boxShadow = 'var(--shadow-sm)';
      
      div.innerHTML = `
        <img src="${base64}" style="width:100%; height:100%; object-fit:cover;">
        <button type="button" onclick="removeReportPhoto(${index})" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.9); color:white; border:none; border-radius:50%; width:22px; height:22px; font-size:10px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-sm);">✕</button>
      `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
};

window.removeReportPhoto = (index) => {
  reportUploadedPhotos.splice(index, 1);
  const previewContainer = document.getElementById('report-photo-previews');
  if (!previewContainer) return;
  previewContainer.innerHTML = '';
  
  reportUploadedPhotos.forEach((base64, idx) => {
    const div = document.createElement('div');
    div.className = 'photo-preview-item';
    div.style.position = 'relative';
    div.style.width = '140px';
    div.style.height = '140px';
    div.style.border = '1px solid #cbd5e1';
    div.style.borderRadius = '6px';
    div.style.overflow = 'hidden';
    div.style.boxShadow = 'var(--shadow-sm)';
    
    div.innerHTML = `
      <img src="${base64}" style="width:100%; height:100%; object-fit:cover;">
      <button type="button" onclick="removeReportPhoto(${idx})" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.9); color:white; border:none; border-radius:50%; width:22px; height:22px; font-size:10px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-sm);">✕</button>
    `;
    previewContainer.appendChild(div);
  });
};

let reportsHistoryList = [];
let clearancesList = [];

window.toggleClearanceSubform = (subformId, isChecked) => {
  const el = document.getElementById(subformId);
  if (!el) return;
  if (isChecked) {
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
  recalculateClearanceTotals();
};

window.hideClearanceModal = () => {
  document.getElementById('clearance-modal').classList.add('hidden');
};

window.openClearanceModal = (reportId, travelId, budget) => {
  document.getElementById('clearance-report-id').value = reportId;
  document.getElementById('clearance-travel-id').value = travelId;
  
  // Reset checks & inputs
  document.getElementById('chk-doc-replace').checked = false;
  document.getElementById('chk-doc-lodging').checked = false;
  document.getElementById('chk-doc-fuel').checked = false;
  
  document.getElementById('subform-replace').classList.add('hidden');
  document.getElementById('subform-lodging').classList.add('hidden');
  document.getElementById('subform-fuel').classList.add('hidden');
  
  document.querySelectorAll('.replace-amount').forEach(inp => inp.value = 0);
  document.querySelectorAll('.replace-desc').forEach(inp => inp.value = '');
  
  document.getElementById('clearance-lodging-province').value = '';
  document.getElementById('clearance-lodging-nights').value = 0;
  document.getElementById('clearance-lodging-rate').value = 0;
  
  document.getElementById('clearance-fuel-plate').value = '';
  document.getElementById('clearance-fuel-km').value = 0;

  document.getElementById('clearance-borrowed-amt').textContent = budget.toLocaleString('en-US', { minimumFractionDigits: 2 });
  document.getElementById('clearance-total-borrowed').textContent = budget.toFixed(2);
  
  // Find matching report details
  const report = reportsHistoryList.find(r => r.reportId === reportId);
  let contractNo = 'บช. / [เว้นว่าง]';
  let travelers = [];
  
  if (report && report.travelRequestDetails) {
    try {
      const reqDetails = JSON.parse(report.travelRequestDetails);
      if (reqDetails.loan && reqDetails.loan.docNo) {
        contractNo = reqDetails.loan.docNo;
      }
      if (reqDetails.travelers && reqDetails.travelers.length > 0) {
        travelers = reqDetails.travelers;
      }
    } catch(e) {}
  }
  
  document.getElementById('clearance-contract-no').textContent = contractNo;

  // Rebuild travelers table
  const tbody = document.getElementById('clearance-travelers-table-body');
  tbody.innerHTML = '';
  
  // 1. Add main reporter
  const reporterName = report ? report.fullName : currentUser.fullName;
  addTravelerClearanceRow(reporterName, 'ผู้รายงาน');
  
  // 2. Add accompanying travelers
  travelers.forEach(t => {
    addTravelerClearanceRow(t.name, t.position);
  });
  
  recalculateClearanceTotals();
  document.getElementById('clearance-modal').classList.remove('hidden');
};

function addTravelerClearanceRow(name, position) {
  const tbody = document.getElementById('clearance-travelers-table-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <div style="font-weight:600; color:var(--neutral-800);">${name}</div>
      <div style="font-size:10px; color:var(--neutral-500);">${position}</div>
      <input type="hidden" class="cl-trav-name" value="${name}">
      <input type="hidden" class="cl-trav-pos" value="${position}">
    </td>
    <td><input type="number" class="form-input cl-trav-allowance" value="0" style="padding:4px; font-size:12px; width:80px;" onchange="recalculateClearanceTotals()"></td>
    <td><input type="number" class="form-input cl-trav-rent" value="0" style="padding:4px; font-size:12px; width:80px;" onchange="recalculateClearanceTotals()"></td>
    <td><input type="number" class="form-input cl-trav-vehicle" value="0" style="padding:4px; font-size:12px; width:80px;" onchange="recalculateClearanceTotals()"></td>
    <td><input type="number" class="form-input cl-trav-other" value="0" style="padding:4px; font-size:12px; width:80px;" onchange="recalculateClearanceTotals()"></td>
    <td style="text-align:right; font-weight:700; color:var(--neutral-800); padding-right:8px;"><span class="cl-trav-row-total">0.00</span></td>
  `;
  tbody.appendChild(tr);
}

window.recalculateClearanceTotals = () => {
  let grandSpent = 0;
  
  // 1. Calculate traveler table rows
  document.querySelectorAll('#clearance-travelers-table-body tr').forEach(tr => {
    const allowance = parseFloat(tr.querySelector('.cl-trav-allowance').value) || 0;
    const rent = parseFloat(tr.querySelector('.cl-trav-rent').value) || 0;
    const vehicle = parseFloat(tr.querySelector('.cl-trav-vehicle').value) || 0;
    const other = parseFloat(tr.querySelector('.cl-trav-other').value) || 0;
    
    const rowTotal = allowance + rent + vehicle + other;
    tr.querySelector('.cl-trav-row-total').textContent = rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 });
    grandSpent += rowTotal;
  });
  
  // 2. Add replace subform if checked
  if (document.getElementById('chk-doc-replace').checked) {
    document.querySelectorAll('.replace-amount').forEach(inp => {
      grandSpent += parseFloat(inp.value) || 0;
    });
  }
  
  // 3. Add lodging subform if checked
  if (document.getElementById('chk-doc-lodging').checked) {
    const nights = parseFloat(document.getElementById('clearance-lodging-nights').value) || 0;
    const rate = parseFloat(document.getElementById('clearance-lodging-rate').value) || 0;
    grandSpent += (nights * rate);
  }
  
  // 4. Add fuel subform if checked
  if (document.getElementById('chk-doc-fuel').checked) {
    const km = parseFloat(document.getElementById('clearance-fuel-km').value) || 0;
    grandSpent += (km * 4);
  }
  
  document.getElementById('clearance-total-spent').textContent = grandSpent.toFixed(2);
  
  const budget = parseFloat(document.getElementById('clearance-total-borrowed').textContent) || 0;
  const diff = grandSpent - budget;
  const diffText = document.getElementById('clearance-diff-text');
  
  if (diff > 0) {
    diffText.style.color = '#ef4444';
    diffText.textContent = `จ่ายสมทบเพิ่ม: ${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท`;
  } else if (diff < 0) {
    diffText.style.color = '#f59e0b';
    diffText.textContent = `เงินเหลือส่งคืน: ${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท`;
  } else {
    diffText.style.color = '#0d9488';
    diffText.textContent = `ยอดเงินเคลียร์พอดี`;
  }
};

window.handleClearanceSubmit = async (e) => {
  e.preventDefault();
  const reportId = document.getElementById('clearance-report-id').value;
  const travelId = document.getElementById('clearance-travel-id').value;
  
  const totalBorrowed = parseFloat(document.getElementById('clearance-total-borrowed').textContent) || 0;
  const totalSpent = parseFloat(document.getElementById('clearance-total-spent').textContent) || 0;
  
  // Gather travelers list
  const travelers = [];
  document.querySelectorAll('#clearance-travelers-table-body tr').forEach(tr => {
    const name = tr.querySelector('.cl-trav-name').value;
    const position = tr.querySelector('.cl-trav-pos').value;
    const allowance = parseFloat(tr.querySelector('.cl-trav-allowance').value) || 0;
    const rent = parseFloat(tr.querySelector('.cl-trav-rent').value) || 0;
    const vehicle = parseFloat(tr.querySelector('.cl-trav-vehicle').value) || 0;
    const other = parseFloat(tr.querySelector('.cl-trav-other').value) || 0;
    const total = allowance + rent + vehicle + other;
    
    travelers.push({ name, position, allowance, rent, vehicle, other, total });
  });
  
  // Gather subforms
  const hasReplace = document.getElementById('chk-doc-replace').checked;
  const replaceItems = [];
  if (hasReplace) {
    const descs = document.querySelectorAll('.replace-desc');
    const amts = document.querySelectorAll('.replace-amount');
    descs.forEach((dInp, idx) => {
      const desc = dInp.value.trim();
      const amt = parseFloat(amts[idx].value) || 0;
      if (desc || amt > 0) {
        replaceItems.push({ desc, amt });
      }
    });
  }
  
  const hasLodging = document.getElementById('chk-doc-lodging').checked;
  const lodging = {
    province: document.getElementById('clearance-lodging-province').value.trim(),
    nights: parseFloat(document.getElementById('clearance-lodging-nights').value) || 0,
    rate: parseFloat(document.getElementById('clearance-lodging-rate').value) || 0,
    total: (parseFloat(document.getElementById('clearance-lodging-nights').value) || 0) * (parseFloat(document.getElementById('clearance-lodging-rate').value) || 0)
  };
  
  const hasFuel = document.getElementById('chk-doc-fuel').checked;
  const fuel = {
    plate: document.getElementById('clearance-fuel-plate').value.trim(),
    km: parseFloat(document.getElementById('clearance-fuel-km').value) || 0,
    total: (parseFloat(document.getElementById('clearance-fuel-km').value) || 0) * 4
  };
  
  const details = {
    hasReplace,
    replaceItems,
    hasLodging,
    lodging,
    hasFuel,
    fuel,
    travelers
  };
  
  showLoading('กำลังบันทึกและยื่นเอกสารเคลียร์เงิน...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/travel-clearance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId,
        travelId,
        userId: currentUser.userId,
        fullName: currentUser.fullName,
        totalSpent,
        totalBorrowed,
        details: JSON.stringify(details)
      })
    });
    
    const data = await res.json();
    if (data.success) {
      Swal.fire('สำเร็จ', data.message, 'success');
      hideClearanceModal();
      initTravelReportPage();
      
      // Auto-trigger printing of the clearance forms
      printClearance(reportId);
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('เกิดข้อผิดพลาด: ' + err.message);
  }
};

window.approveClearance = async (clearanceId, status) => {
  const confirmText = status === 'อนุมัติแล้ว' ? 'อนุมัติการเคลียร์เงินยืมรายการนี้?' : 'ปฏิเสธการเคลียร์เงินยืมรายการนี้?';
  const result = await Swal.fire({
    title: 'ยืนยันการดำเนินการ',
    text: confirmText,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก'
  });
  
  if (result.isConfirmed) {
    showLoading('กำลังบันทึกข้อมูล...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/travel-clearance/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearanceId, status })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('สำเร็จ', data.message, 'success');
        initTravelReportPage();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('เกิดข้อผิดพลาด: ' + err.message);
    }
  }
};

window.printClearance = (reportId) => {
  window.open(`print_clearance_template.html?reportId=${reportId}`, '_blank');
};

async function loadTravelReportsHistory() {
  try {
    reportsHistoryList = [];
    clearancesList = [];
    
    // Fetch clearances first
    const clearanceUrl = currentUser.role === 'admin'
      ? `${API_BASE_URL}/api/travel-clearance`
      : `${API_BASE_URL}/api/travel-clearance?userId=${currentUser.userId}`;
    const clRes = await fetch(clearanceUrl);
    clearancesList = await clRes.json();
    
    const clMap = {};
    clearancesList.forEach(cl => {
      clMap[cl.reportId] = cl;
    });

    const url = currentUser.role === 'admin'
      ? `${API_BASE_URL}/api/travel-report`
      : `${API_BASE_URL}/api/travel-report?userId=${currentUser.userId}`;
      
    const res = await fetch(url);
    reportsHistoryList = await res.json();
    
    const tbody = document.getElementById('travel-report-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (reportsHistoryList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:16px; color:var(--neutral-400);">ไม่มีประวัติรายงานราชการ</td></tr>`;
      return;
    }
    
    reportsHistoryList.forEach(r => {
      let budgetActionHtml = '';
      
      // Check if original travel had budget > 0 (meaning loan was borrowed)
      let reqDetails = null;
      if (r.travelRequestDetails) {
        try {
          reqDetails = JSON.parse(r.travelRequestDetails);
        } catch(e) {}
      }
      
      const hasOriginalLoan = parseFloat(r.budget) > 0 || (reqDetails && reqDetails.hasLoan);
      
      if (hasOriginalLoan) {
        const originalBudget = parseFloat(r.budget) || (reqDetails && reqDetails.loan ? parseFloat(reqDetails.loan.loanAmount) : 0);
        const cl = clMap[r.reportId];
        
        if (!cl) {
          budgetActionHtml = `
            <div style="margin-top:6px;">
              <button type="button" class="btn btn-primary btn-xs" onclick="openClearanceModal('${r.reportId}', '${r.travelId}', ${originalBudget})" style="background:#0d9488; border-color:#0d9488; display:inline-flex; align-items:center; gap:4px; padding:3px 8px;">💰 เคลียร์เงินยืม</button>
            </div>
          `;
        } else if (cl.status === 'รอการตรวจสอบ') {
          if (currentUser.role === 'admin') {
            budgetActionHtml = `
              <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px; align-items:center;">
                <span class="badge" style="background:#f59e0b; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">⏳ รอตรวจเคลียร์เงิน</span>
                <div style="display:flex; gap:4px;">
                  <button type="button" class="btn btn-primary btn-xs" onclick="approveClearance('${cl.clearanceId}', 'อนุมัติแล้ว')" style="background:#10b981; border-color:#10b981; padding:2px 4px; font-size:10px;">อนุมัติ</button>
                  <button type="button" class="btn btn-danger btn-xs" onclick="approveClearance('${cl.clearanceId}', 'ปฏิเสธ')" style="background:#ef4444; border-color:#ef4444; color:white; padding:2px 4px; font-size:10px;">ปฏิเสธ</button>
                </div>
                <button type="button" class="btn btn-outline btn-xs" onclick="printClearance('${r.reportId}')" style="padding:2px 4px; font-size:10px;">🖨️ ใบเคลียร์เงิน</button>
              </div>
            `;
          } else {
            budgetActionHtml = `
              <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px; align-items:center;">
                <span class="badge" style="background:#f59e0b; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">⏳ รอตรวจเคลียร์เงิน</span>
                <button type="button" class="btn btn-outline btn-xs" onclick="printClearance('${r.reportId}')" style="padding:3px 6px; font-size:10px;">🖨️ ใบเคลียร์เงิน</button>
              </div>
            `;
          }
        } else if (cl.status === 'อนุมัติแล้ว') {
          budgetActionHtml = `
            <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px; align-items:center;">
              <span class="badge" style="background:#10b981; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">✅ เคลียร์เงินสำเร็จ</span>
              <button type="button" class="btn btn-outline btn-xs" onclick="printClearance('${r.reportId}')" style="padding:3px 6px; font-size:10px;">🖨️ ใบเคลียร์เงิน</button>
            </div>
          `;
        } else if (cl.status === 'ปฏิเสธ') {
          budgetActionHtml = `
            <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px; align-items:center;">
              <span class="badge" style="background:#ef4444; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">❌ ปฏิเสธการเคลียร์</span>
              <button type="button" class="btn btn-primary btn-xs" onclick="openClearanceModal('${r.reportId}', '${r.travelId}', ${originalBudget})" style="background:#0d9488; border-color:#0d9488; display:inline-flex; align-items:center; gap:4px; padding:3px 8px;">💰 เคลียร์ใหม่</button>
            </div>
          `;
        }
      }

      tbody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight:600; color:var(--neutral-800);">${r.subject}</div>
            <div style="font-size:11px; color:var(--neutral-500);">📍 ${r.destination} (${formatDate(r.startDate)} - ${formatDate(r.endDate)})</div>
            ${currentUser.role === 'admin' ? `<div style="font-size:11px; color:#0369a1; font-weight:500;">ผู้เขียน: ${r.fullName}</div>` : ''}
          </td>
          <td>
            <div style="font-weight:600; color:var(--neutral-700);">${r.organizer || '-'}</div>
          </td>
          <td style="text-align:right; font-weight:600; color:#0f766e;">
            ${parseFloat(r.budget).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </td>
          <td>
            <div style="font-size:11px; color:var(--neutral-500);">${formatDate(r.createdAt)}</div>
          </td>
          <td style="text-align:center;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
              <button type="button" class="btn btn-outline btn-xs" onclick="printTravelReport('${r.reportId}')" style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px;">🖨️ พิมพ์รายงาน</button>
              ${budgetActionHtml}
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error loading travel reports:', err);
  }
}

window.printTravelReport = (reportId) => {
  window.open(`print_report_template.html?reportId=${reportId}`, '_blank');
};

async function handleTravelReportSubmit(e) {
  e.preventDefault();
  const travelId = document.getElementById('report-travel-select').value;
  const organizer = document.getElementById('report-organizer').value;
  const budget = parseFloat(document.getElementById('report-budget').value) || 0;
  
  const content8_1 = document.getElementById('report-content-8-1').value;
  const content8_2 = document.getElementById('report-content-8-2').value;
  const content8_3 = document.getElementById('report-content-8-3').value;
  const content8_4 = document.getElementById('report-content-8-4').value;
  
  const obstacles = document.getElementById('report-obstacles').value;
  
  const suggestion10_1 = document.getElementById('report-suggestion-10-1').value;
  const suggestion10_2 = document.getElementById('report-suggestion-10-2').value;
  const suggestion10_3 = document.getElementById('report-suggestion-10-3').value;
  
  if (!travelId) {
    Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกรายการที่ไปราชการ', 'error');
    return;
  }
  
  const details = {
    content8_1,
    content8_2,
    content8_3,
    content8_4,
    obstacles,
    suggestion10_1,
    suggestion10_2,
    suggestion10_3,
    photos: reportUploadedPhotos
  };
  
  showLoading('กำลังบันทึกรายงาน...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/travel-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        travelId,
        userId: currentUser.userId,
        fullName: currentUser.fullName,
        reportDetail: content8_1,
        benefits: suggestion10_1,
        organizer,
        budget,
        details: JSON.stringify(details)
      })
    });
    
    const data = await res.json();
    if (data.success) {
      Swal.fire('สำเร็จ', 'ส่งรายงานผลไปราชการเรียบร้อยแล้ว', 'success');
      initTravelReportPage();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('เกิดข้อผิดพลาด: ' + err.message);
  }
}

// ==========================================
// --- Training Record Controllers ---
// ==========================================

async function initTrainingPage() {
  if (!currentUser) return;
  document.getElementById('training-form').reset();
  await loadTrainingHistory();
}

async function loadTrainingHistory() {
  try {
    const url = currentUser.role === 'admin'
      ? `${API_BASE_URL}/api/training`
      : `${API_BASE_URL}/api/training?userId=${currentUser.userId}`;
      
    const res = await fetch(url);
    const trainings = await res.json();
    
    const tbody = document.getElementById('training-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let totalHours = 0;
    
    if (trainings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="padding:16px; color:var(--neutral-400);">ไม่มีประวัติการบันทึกอบรม</td></tr>`;
      const hrsEl = document.getElementById('training-total-hours');
      if (hrsEl) hrsEl.textContent = `ชั่วโมงสะสม: 0 ชม.`;
      return;
    }
    
    trainings.forEach(t => {
      const hrs = parseFloat(t.hours) || 0;
      totalHours += hrs;
      
      tbody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight:600; color:var(--neutral-800);">${t.courseName}</div>
            <div style="font-size:11px; color:var(--neutral-500);">🏢 จัดโดย: ${t.organizer} | 📍 ${t.location}</div>
            ${currentUser.role === 'admin' ? `<div style="font-size:11px; color:#4f46e5; font-weight:500;">ผู้บันทึก: ${t.fullName}</div>` : ''}
          </td>
          <td>
            <div style="font-size:12px; font-weight:500;">${formatDate(t.startDate)}</div>
            <div style="font-size:11px; color:var(--neutral-500);">ถึง ${formatDate(t.endDate)}</div>
          </td>
          <td style="text-align:center; font-weight:bold; color:#4f46e5;">${hrs} ชม.</td>
        </tr>
      `;
    });
    
    const hrsEl = document.getElementById('training-total-hours');
    if (hrsEl) hrsEl.textContent = `ชั่วโมงสะสม: ${totalHours} ชม.`;
  } catch (err) {
    console.error('Error loading training history:', err);
  }
}

async function handleTrainingSubmit(e) {
  e.preventDefault();
  const courseName = document.getElementById('training-course').value;
  const organizer = document.getElementById('training-organizer').value;
  const startDate = document.getElementById('training-start-date').value;
  const endDate = document.getElementById('training-end-date').value;
  const location = document.getElementById('training-location').value;
  const hours = parseFloat(document.getElementById('training-hours').value);
  
  if (hours <= 0) {
    Swal.fire('ข้อผิดพลาด', 'ชั่วโมงอบรมต้องมากกว่า 0', 'error');
    return;
  }
  
  showLoading('กำลังบันทึกประวัติการอบรม...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.userId,
        fullName: currentUser.fullName,
        courseName,
        organizer,
        startDate,
        endDate,
        hours,
        location
      })
    });
    
    const data = await res.json();
    if (data.success) {
      Swal.fire('สำเร็จ', 'บันทึกประวัติการอบรมเรียบร้อยแล้ว', 'success');
      initTrainingPage();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('เกิดข้อผิดพลาด: ' + err.message);
  }
}

// ==========================================
// --- Activity Board Controllers ---
// ==========================================

async function initActivityPage() {
  if (!currentUser) return;
  
  const adminCard = document.getElementById('activity-admin-card');
  const userCard = document.getElementById('activity-user-card');
  
  if (adminCard && userCard) {
    if (currentUser.role === 'admin') {
      adminCard.style.display = 'block';
      userCard.style.display = 'none';
      const f = document.getElementById('activity-create-form');
      if (f) f.reset();
    } else {
      adminCard.style.display = 'none';
      userCard.style.display = 'block';
    }
  }
  
  await loadActivitiesBoard();
}

async function loadActivitiesBoard() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/activities?userId=${currentUser.userId}`);
    const acts = await res.json();
    
    const board = document.getElementById('activities-board-container');
    if (!board) return;
    board.innerHTML = '';
    
    if (acts.length === 0) {
      board.innerHTML = `<div style="text-align:center; padding:32px; color:var(--neutral-400);">ยังไม่มีประกาศกิจกรรมใด ๆ ในระบบ</div>`;
      return;
    }
    
    acts.forEach(act => {
      let regButtonHtml = '';
      if (act.isRegistered) {
        regButtonHtml = `<span style="background:#e6f4ea; color:#137333; padding:6px 16px; border-radius:99px; font-size:0.85rem; font-weight:700; border:1px solid #137333;">✓ เข้าร่วมแล้ว</span>`;
      } else {
        regButtonHtml = `<button class="btn btn-primary btn-sm" onclick="registerActivity('${act.activityId}')" style="padding:6px 16px; font-size:0.85rem;">🙋 ยืนยันการเข้าร่วม</button>`;
      }
      
      let viewParticipantsHtml = `<button class="btn btn-outline btn-sm" onclick="viewParticipants('${act.activityId}', '${act.activityName}')" style="padding:6px 12px; font-size:0.8rem; border-radius:99px;">👥 ดูผู้เข้าร่วม</button>`;
      
      board.innerHTML += `
        <div class="glass-card" style="border-left: 6px solid #0d9488; padding:16px 20px; display:flex; flex-direction:column; gap:12px; transition: var(--transition); border-top:none; border-right:none; border-bottom:none; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:8px;">
            <div>
              <h4 style="font-size:1.05rem; font-weight:700; color:var(--neutral-800); margin:0;">${act.activityName}</h4>
              <p style="font-size:0.85rem; color:var(--neutral-500); margin:4px 0 0 0;">📅 ${formatDate(act.activityDate)} | 📍 ${act.location}</p>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              ${regButtonHtml}
              ${viewParticipantsHtml}
            </div>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error('Error loading activities board:', err);
  }
}

async function registerActivity(activityId) {
  showLoading('กำลังดำเนินการ...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/activities/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        userId: currentUser.userId,
        fullName: currentUser.fullName,
        position: currentUser.position
      })
    });
    
    const data = await res.json();
    if (data.success) {
      Swal.fire('สำเร็จ', 'ยืนยันการเข้าร่วมกิจกรรมวิทยาลัยเรียบร้อยแล้ว', 'success');
      loadActivitiesBoard();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('เกิดข้อผิดพลาด: ' + err.message);
  }
}

async function viewParticipants(activityId, activityName) {
  showLoading('กำลังดึงรายชื่อผู้เข้าร่วม...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/activities/participants/${activityId}`);
    const participants = await res.json();
    
    const titleEl = document.getElementById('participants-modal-title');
    const tbody = document.getElementById('participants-table-body');
    
    if (titleEl) titleEl.textContent = `ผู้ร่วมงาน: ${activityName}`;
    if (tbody) {
      tbody.innerHTML = '';
      if (participants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="padding:16px; color:var(--neutral-400);">ยังไม่มีผู้ลงชื่อเข้าร่วม</td></tr>`;
      } else {
        participants.forEach(p => {
          tbody.innerHTML += `
            <tr>
              <td style="font-weight:500;">${p.fullName}</td>
              <td>${p.position}</td>
              <td style="font-size:11px; color:var(--neutral-500);">${formatDate(p.registeredAt, true)}</td>
            </tr>
          `;
        });
      }
    }
    
    const modal = document.getElementById('modal-participants');
    if (modal) modal.classList.remove('hidden');
    Swal.close();
  } catch (err) {
    showError('เกิดข้อผิดพลาด: ' + err.message);
  }
}

async function handleActivityCreate(e) {
  e.preventDefault();
  const activityName = document.getElementById('act-name').value;
  const activityDate = document.getElementById('act-date').value;
  const location = document.getElementById('act-location').value;
  
  showLoading('กำลังสร้างกิจกรรม...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityName, activityDate, location })
    });
    
    const data = await res.json();
    if (data.success) {
      Swal.fire('สำเร็จ', 'ประกาศกิจกรรมใหม่เรียบร้อยแล้ว', 'success');
      initActivityPage();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('เกิดข้อผิดพลาด: ' + err.message);
  }
}

// --- Fiscal Year & Admin Settings Management ---

function populateDashboardFiscalYearDropdown() {
  const select = document.getElementById('dashboard-fiscal-year-select');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  let years = [];
  if (settings && settings.fiscal_years) {
    years = settings.fiscal_years.split(',').map(y => y.trim()).filter(Boolean);
  }

  if (years.length === 0) {
    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = today.getMonth() + 1;
    let currentFY = tYear + 543;
    if (tMonth >= 10) {
      currentFY += 1;
    }
    years = [String(currentFY), String(currentFY - 1), String(currentFY - 2)];
  }

  years.sort((a, b) => parseInt(b) - parseInt(a));

  years.forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = `ปีงบประมาณ ${yr}`;
    select.appendChild(opt);
  });

  if (currentVal && years.includes(currentVal)) {
    select.value = currentVal;
  } else if (settings && settings.default_fiscal_year && years.includes(settings.default_fiscal_year)) {
    select.value = settings.default_fiscal_year;
  } else {
    select.value = years[0];
  }
}

function populateHistoryFiscalYearDropdown() {
  const select = document.getElementById('history-fiscal-year-select');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  let years = [];
  if (settings && settings.fiscal_years) {
    years = settings.fiscal_years.split(',').map(y => y.trim()).filter(Boolean);
  }

  if (years.length === 0) {
    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = today.getMonth() + 1;
    let currentFY = tYear + 543;
    if (tMonth >= 10) {
      currentFY += 1;
    }
    years = [String(currentFY), String(currentFY - 1), String(currentFY - 2)];
  }

  years.sort((a, b) => parseInt(b) - parseInt(a));

  years.forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = `ปีงบประมาณ ${yr}`;
    select.appendChild(opt);
  });

  if (currentVal && years.includes(currentVal)) {
    select.value = currentVal;
  } else if (settings && settings.default_fiscal_year && years.includes(settings.default_fiscal_year)) {
    select.value = settings.default_fiscal_year;
  } else {
    select.value = years[0];
  }
}

function loadAdminSettingsPage() {
  renderFiscalYearsList();

  const select = document.getElementById('setting-default-fiscal-year');
  if (select) {
    select.innerHTML = '';
    let years = [];
    if (settings && settings.fiscal_years) {
      years = settings.fiscal_years.split(',').map(y => y.trim()).filter(Boolean);
    }
    years.sort((a, b) => parseInt(b) - parseInt(a));
    
    years.forEach(yr => {
      const opt = document.createElement('option');
      opt.value = yr;
      opt.textContent = `ปีงบประมาณ ${yr}`;
      select.appendChild(opt);
    });

    if (settings && settings.default_fiscal_year) {
      select.value = settings.default_fiscal_year;
    }
  }
}

function renderFiscalYearsList() {
  const tbody = document.getElementById('fiscal-years-list-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  let years = [];
  if (settings && settings.fiscal_years) {
    years = settings.fiscal_years.split(',').map(y => y.trim()).filter(Boolean);
  }
  years.sort((a, b) => parseInt(b) - parseInt(a));

  if (years.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center" style="color:var(--neutral-400); padding:16px;">ไม่มีข้อมูลปีงบประมาณ กรุณาเพิ่มปีงบประมาณ</td></tr>`;
    return;
  }

  years.forEach(yr => {
    tbody.innerHTML += `
      <tr>
        <td style="font-weight: 600; padding: 12px 16px;">ปีงบประมาณ ${yr}</td>
        <td style="text-align: center; padding: 12px 16px;">
          <button class="btn btn-outline" style="border-color: #ef4444; color: #ef4444; padding: 4px 8px; font-size: 0.8rem; margin: 0;" onclick="removeFiscalYearSetting('${yr}')">ลบ</button>
        </td>
      </tr>
    `;
  });
}

async function addFiscalYearSetting() {
  const input = document.getElementById('setting-new-fiscal-year');
  if (!input) return;

  const value = input.value.trim();
  if (!value) {
    Swal.fire({ icon: 'warning', title: 'กรุณากรอกปีงบประมาณ', text: 'ตัวอย่างเช่น 2570' });
    return;
  }

  const yr = parseInt(value);
  if (isNaN(yr) || yr < 2500 || yr > 3000) {
    Swal.fire({ icon: 'error', title: 'ปีงบประมาณไม่ถูกต้อง', text: 'กรุณากรอกปี พ.ศ. ระหว่าง 2500 - 3000' });
    return;
  }

  let years = [];
  if (settings && settings.fiscal_years) {
    years = settings.fiscal_years.split(',').map(y => y.trim()).filter(Boolean);
  }

  if (years.includes(String(yr))) {
    Swal.fire({ icon: 'warning', title: 'มีปีงบประมาณนี้อยู่แล้ว' });
    return;
  }

  years.push(String(yr));
  if (!settings) settings = {};
  settings.fiscal_years = years.join(',');

  if (!settings.default_fiscal_year) {
    settings.default_fiscal_year = String(yr);
  }

  input.value = '';
  loadAdminSettingsPage();
}

function removeFiscalYearSetting(yr) {
  let years = [];
  if (settings && settings.fiscal_years) {
    years = settings.fiscal_years.split(',').map(y => y.trim()).filter(Boolean);
  }

  years = years.filter(y => y !== String(yr));
  if (!settings) settings = {};
  settings.fiscal_years = years.join(',');

  if (settings.default_fiscal_year === String(yr)) {
    settings.default_fiscal_year = years[0] || '';
  }

  loadAdminSettingsPage();
}

async function saveAdminSettings() {
  const select = document.getElementById('setting-default-fiscal-year');
  if (select && settings) {
    settings.default_fiscal_year = select.value;
  }

  showLoading('กำลังบันทึกการตั้งค่า...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fiscal_years: (settings && settings.fiscal_years) || '',
        default_fiscal_year: (settings && settings.default_fiscal_year) || ''
      })
    });
    const d = await res.json();
    Swal.close();

    if (d && d.success) {
      // Re-fetch settings
      const setRes = await fetch(`${API_BASE_URL}/api/settings`);
      settings = await setRes.json();

      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: d.message });
      
      const dbSelect = document.getElementById('dashboard-fiscal-year-select');
      if (dbSelect) {
        dbSelect.innerHTML = '';
      }
    } else {
      showError(d.message || 'บันทึกไม่สำเร็จ');
    }
  } catch (err) {
    showError('เกิดข้อผิดพลาด: ' + err.message);
  }
}

// Bind callbacks globally
window.populateDashboardFiscalYearDropdown = populateDashboardFiscalYearDropdown;
window.loadAdminSettingsPage = loadAdminSettingsPage;
window.renderFiscalYearsList = renderFiscalYearsList;
window.addFiscalYearSetting = addFiscalYearSetting;
window.removeFiscalYearSetting = removeFiscalYearSetting;
window.saveAdminSettings = saveAdminSettings;
window.approveTravel = approveTravel;
window.registerActivity = registerActivity;
window.viewParticipants = viewParticipants;
