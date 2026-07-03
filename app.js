// ================================================================= */
//                     FRONTEND CONTROLLER (Vanilla JS)              */
//                     à¸£à¸°à¸šà¸šà¸šà¸£à¸´à¸«à¸²à¸£à¸‡à¸²à¸™à¸šà¸¸à¸„à¸¥à¸²à¸à¸£ à¸§à¸´à¸—à¸¢à¸²à¸¥à¸±à¸¢à¸ªà¸²à¸£à¸žà¸±à¸”à¸Šà¹ˆà¸²à¸‡à¸™à¹ˆà¸²à¸™             */
// ================================================================= */


// Automatically detect backend API domain
const API_BASE_URL = window.location.hostname !== 'service.npc.ac.th'
  ? `http://${window.location.hostname || 'localhost'}:5000`
  : 'https://service.npc.ac.th/npc_eleve_backend'; // Replace with your production Node.js API domain

// ---------------------------------------------------------------
// Safe fetch wrapper â€” converts 502/HTML responses to clear errors
// ---------------------------------------------------------------
let _serverDown = false;
async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Server returned HTML (e.g. 502 Bad Gateway)
      showServerDownBanner(res.status);
      throw new Error(`à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œà¹„à¸¡à¹ˆà¸žà¸£à¹‰à¸­à¸¡à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ (HTTP ${res.status}) â€” à¸à¸£à¸¸à¸“à¸²à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¹ƒà¸™à¸ à¸²à¸¢à¸«à¸¥à¸±à¸‡`);
    }
    if (!_serverDown && res.ok) hideServerDownBanner();
    return res;
  } catch (err) {
    if (err.name === 'TypeError') {
      // Network error (no connection)
      showServerDownBanner(0);
      throw new Error('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œà¹„à¸”à¹‰ â€” à¸à¸£à¸¸à¸“à¸²à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¸­à¸´à¸™à¹€à¸—à¸­à¸£à¹Œà¹€à¸™à¹‡à¸•');
    }
    throw err;
  }
}

function showServerDownBanner(code) {
  if (_serverDown) return;
  _serverDown = true;
  let banner = document.getElementById('server-down-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'server-down-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:#fff;text-align:center;padding:10px 16px;font-size:0.88rem;font-weight:600;display:flex;justify-content:center;align-items:center;gap:12px;';
    banner.innerHTML = `âš ï¸ à¸£à¸°à¸šà¸šà¸«à¸¥à¸±à¸‡à¸šà¹‰à¸²à¸™à¹„à¸¡à¹ˆà¸žà¸£à¹‰à¸­à¸¡à¹ƒà¸Šà¹‰à¸‡à¸²à¸™${code ? ' (HTTP ' + code + ')' : ''} â€” à¸à¸£à¸¸à¸“à¸²à¸£à¸­à¸ªà¸±à¸à¸„à¸£à¸¹à¹ˆà¹à¸¥à¹‰à¸§à¸£à¸µà¹€à¸Ÿà¸£à¸Šà¸«à¸™à¹‰à¸²à¹ƒà¸«à¸¡à¹ˆ
      <button onclick="location.reload()" style="background:#fff;color:#dc2626;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-weight:700;margin-left:8px;">ðŸ”„ à¸£à¸µà¹€à¸Ÿà¸£à¸Š</button>`;
    document.body.prepend(banner);
  }
}

function hideServerDownBanner() {
  _serverDown = false;
  const banner = document.getElementById('server-down-banner');
  if (banner) banner.remove();
}


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
        showLoading('à¸à¸³à¸¥à¸±à¸‡à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸à¸´à¸ˆà¸à¸£à¸£à¸¡...');
        try {
          const res = await safeFetch(`${API_BASE_URL}/api/auth/get-apr-id?username=${currentUser.username}`);
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
    Swal.fire('à¸›à¸à¸´à¹€à¸ªà¸˜à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡', 'à¹€à¸‰à¸žà¸²à¸°à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸šà¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™à¸—à¸µà¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸‚à¹‰à¸²à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸«à¸™à¹‰à¸²à¸™à¸µà¹‰à¹„à¸”à¹‰', 'warning');
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
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™...');
  try {
    // Fetch Settings
    const setRes = await safeFetch(`${API_BASE_URL}/api/settings`);
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
    showError("à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¸«à¸¥à¸±à¸‡à¸šà¹‰à¸²à¸™: " + err.message);
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
    showError('à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸à¹„à¸Ÿà¸¥à¹Œà¸—à¸µà¹ˆà¹€à¸›à¹‡à¸™à¸£à¸¹à¸›à¸ à¸²à¸žà¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™');
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
    title: 'à¸£à¸µà¹€à¸‹à¹‡à¸•à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¸”à¹‰à¸§à¸¢ LINE ID',
    html: `
      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰ (Username)</label>
          <input id="reset-username" class="form-input" placeholder="à¸à¸£à¸­à¸ Username à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™" autocomplete="off">
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>LINE User ID (à¸—à¸µà¹ˆà¸œà¸¹à¸à¹„à¸§à¹‰à¸à¸±à¸šà¸£à¸°à¸šà¸š)</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">ðŸ’¬ à¹à¸Šà¸—à¸šà¸­à¸•à¸‚à¸­ ID</a>
          </label>
          <input id="reset-lineid" class="form-input" placeholder="à¸à¸£à¸­à¸à¸£à¸«à¸±à¸ªà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹„à¸¥à¸™à¹Œ (à¸‚à¸¶à¹‰à¸™à¸•à¹‰à¸™à¸”à¹‰à¸§à¸¢ U...)" autocomplete="off">
          <p style="font-size:11px; color:var(--secondary); margin-top:4px;">*à¸à¸”à¸›à¸¸à¹ˆà¸¡à¸ªà¸µà¹€à¸‚à¸µà¸¢à¸§à¹€à¸žà¸·à¹ˆà¸­à¹€à¸›à¸´à¸”à¹à¸Šà¸—à¸à¸±à¸šà¸šà¸­à¸• -> à¸žà¸´à¸¡à¸žà¹Œ "à¸‚à¸­ ID" à¸ªà¹ˆà¸‡à¹„à¸›à¹ƒà¸™à¹à¸Šà¸—à¹€à¸žà¸·à¹ˆà¸­à¸‚à¸­à¸£à¸«à¸±à¸ª</p>
        </div>
        <div>
          <label class="form-label">à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹ƒà¸«à¸¡à¹ˆà¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸•à¸±à¹‰à¸‡</label>
          <input id="reset-newpassword" type="password" class="form-input" placeholder="à¸£à¸°à¸šà¸¸à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹ƒà¸«à¸¡à¹ˆ" autocomplete="new-password">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™',
    cancelButtonText: 'à¸¢à¸à¹€à¸¥à¸´à¸',
    preConfirm: () => {
      const u = document.getElementById('reset-username').value.trim();
      const lid = document.getElementById('reset-lineid').value.trim();
      const np = document.getElementById('reset-newpassword').value;

      if (!u || !lid || !np) {
        Swal.showValidationMessage('à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸„à¸£à¸šà¸—à¸¸à¸à¸Šà¹ˆà¸­à¸‡');
        return false;
      }
      return { username: u, lineUserId: lid, newPassword: np };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥...');
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', data.message, 'success').then(() => {
            showLoginModal();
          });
        } else {
          showError(data.message).then(() => {
            showLoginModal();
          });
        }
      } catch (err) {
        showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­: ' + err.message).then(() => {
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
    title: 'à¹à¸à¹‰à¹„à¸‚à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§',
    html: `
      <!-- Dummy fields to prevent browser autofill -->
      <input type="text" style="display:none;" name="dummy-username" autocomplete="username">
      <input type="password" style="display:none;" name="dummy-password" autocomplete="new-password">

      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥</label>
          <input id="self-fn" class="form-input" value="${currentUser.fullName || ''}" autocomplete="off">
        </div>
        <div>
          <label class="form-label">à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡</label>
          <input id="self-pos" class="form-input" value="${currentUser.position || ''}" autocomplete="off">
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>LINE User ID</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">ðŸ’¬ à¹à¸Šà¸—à¸šà¸­à¸•à¸‚à¸­ ID</a>
          </label>
          <input id="self-lid" class="form-input" value="${currentUser.lineUserId || ''}" placeholder="à¸£à¸°à¸šà¸¸ LINE User ID (à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸”à¹‰à¸§à¸¢ U...)" autocomplete="off">
          <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">*à¸žà¸´à¸¡à¸žà¹Œ "à¸‚à¸­ ID" à¹ƒà¸™à¸«à¹‰à¸­à¸‡à¹à¸Šà¸—à¹€à¸žà¸·à¹ˆà¸­à¸‚à¸­à¸£à¸«à¸±à¸ªà¸ˆà¸²à¸à¸šà¸­à¸•</p>
        </div>
        <div>
          <label class="form-label">à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹ƒà¸«à¸¡à¹ˆ (à¸›à¸¥à¹ˆà¸­à¸¢à¸§à¹ˆà¸²à¸‡à¸«à¸²à¸à¹„à¸¡à¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™)</label>
          <input id="self-eps" type="password" class="form-input" placeholder="à¸à¸£à¸­à¸à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹ƒà¸«à¸¡à¹ˆ" autocomplete="new-password">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'à¸šà¸±à¸™à¸—à¸¶à¸',
    cancelButtonText: 'à¸¢à¸à¹€à¸¥à¸´à¸',
    preConfirm: () => {
      const fn = document.getElementById('self-fn').value.trim();
      const pos = document.getElementById('self-pos').value.trim();
      const lid = document.getElementById('self-lid').value.trim();
      const ps = document.getElementById('self-eps').value;
      if (!fn || !pos) {
        Swal.showValidationMessage('à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸Šà¸·à¹ˆà¸­à¹à¸¥à¸°à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡à¸‡à¸²à¸™');
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

      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥...');
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/users/${currentUser.userId}`, {
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

          Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸­à¸±à¸›à¹€à¸”à¸•à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
        } else {
          showError(data.message);
        }
      } catch (err) {
        showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­: ' + err.message);
      }
    }
  });
};

window.handleCustomLogin = async (e) => {
  e.preventDefault();
  const u = document.getElementById('login-u').value;
  const p = document.getElementById('login-p').value;
  
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/auth/login`, {
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
        title: 'à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸ªà¸³à¹€à¸£à¹‡à¸ˆ',
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
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œ: ' + err.message);
  }
};

function showRegisterModal() {
  Swal.fire({
    title: 'à¸¥à¸‡à¸—à¸°à¹€à¸šà¸µà¸¢à¸™à¹€à¸‚à¹‰à¸²à¹ƒà¸Šà¹‰à¸‡à¸²à¸™',
    html: `
      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥</label>
          <input id="reg-fn" class="form-input" placeholder="à¹€à¸Šà¹ˆà¸™ à¸™à¸²à¸¢à¸ªà¸¡à¸Šà¸²à¸¢ à¹ƒà¸ˆà¸”à¸µ">
        </div>
        <div>
          <label class="form-label">à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡</label>
          <input id="reg-pos" class="form-input" placeholder="à¹€à¸Šà¹ˆà¸™ à¸„à¸£à¸¹à¸§à¸´à¸—à¸¢à¸à¸²à¸™à¸°à¸Šà¸³à¸™à¸²à¸à¸à¸²à¸£à¸žà¸´à¹€à¸¨à¸©">
        </div>
        <div>
          <label class="form-label">à¸›à¸£à¸°à¹€à¸ à¸—à¸šà¸¸à¸„à¸¥à¸²à¸à¸£</label>
          <select id="reg-type" class="form-input">
            <option value="à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£">à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£</option>
            <option value="à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£">à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£</option>
            <option value="à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£">à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£</option>
            <option value="à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™" selected>à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™</option>
            <option value="à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ">à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ</option>
          </select>
        </div>
        <div>
          <label class="form-label">à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰ (à¸ à¸²à¸©à¸²à¸­à¸±à¸‡à¸à¸¤à¸©)</label>
          <input id="reg-ru" class="form-input" placeholder="Username à¸ªà¸³à¸«à¸£à¸±à¸šà¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š">
        </div>
        <div>
          <label class="form-label">à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™</label>
          <input id="reg-rp" type="password" class="form-input" placeholder="Password">
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­ LINE User ID (à¸ªà¸³à¸„à¸±à¸à¸¡à¸²à¸à¹€à¸žà¸·à¹ˆà¸­à¸£à¸±à¸šà¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™)</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold;">ðŸ’¬ à¸‚à¸­à¸£à¸±à¸šà¸£à¸«à¸±à¸ª LINE ID</a>
          </label>
          <input id="reg-lid" class="form-input" placeholder="à¸à¸£à¸­à¸à¸£à¸«à¸±à¸ªà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹„à¸¥à¸™à¹Œà¸‚à¸­à¸‡à¸„à¸¸à¸“ (à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸”à¹‰à¸§à¸¢ U...)">
          <p style="font-size:10px; color:var(--secondary); margin-top:4px;">*à¸à¸”à¸›à¸¸à¹ˆà¸¡à¹€à¸‚à¸µà¸¢à¸§à¹à¸­à¸”à¸šà¸­à¸—à¹„à¸¥à¸™à¹Œ -> à¸žà¸´à¸¡à¸žà¹Œà¸„à¸³à¸§à¹ˆà¸² "à¸‚à¸­ ID" à¹ƒà¸™à¸Šà¹ˆà¸­à¸‡à¹à¸Šà¸— -> à¸™à¸³à¸£à¸«à¸±à¸ªà¸—à¸µà¹ˆà¹„à¸”à¹‰à¸¡à¸²à¸§à¸²à¸‡à¸Šà¹ˆà¸­à¸‡à¸™à¸µà¹‰</p>
        </div>
      </div>
    `,
    confirmButtonText: 'à¸¥à¸‡à¸—à¸°à¹€à¸šà¸µà¸¢à¸™',
    showCancelButton: true,
    cancelButtonText: 'à¸¢à¸à¹€à¸¥à¸´à¸',
    preConfirm: () => {
      const fn = document.getElementById('reg-fn').value;
      const pos = document.getElementById('reg-pos').value;
      const type = document.getElementById('reg-type').value;
      const ru = document.getElementById('reg-ru').value;
      const rp = document.getElementById('reg-rp').value;
      const lid = document.getElementById('reg-lid').value.trim();

      if (!fn || !pos || !ru || !rp) {
        Swal.showValidationMessage('à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸«à¸¥à¸±à¸à¹ƒà¸«à¹‰à¸„à¸£à¸šà¸–à¹‰à¸§à¸™');
      }
      return { fullName: fn, position: pos, staffType: type, username: ru, password: rp, lineUserId: lid };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸¥à¸‡à¸—à¸°à¹€à¸šà¸µà¸¢à¸™...');
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const data = await res.json();
        
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'à¸¥à¸‡à¸—à¸°à¹€à¸šà¸µà¸¢à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ',
            text: data.message,
            confirmButtonText: 'à¸•à¸à¸¥à¸‡'
          });
        } else {
          showError(data.message);
        }
      } catch (err) {
        showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­: ' + err.message);
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
    title: 'à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸šà¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢',
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
          <span class="user-dropdown-role">${currentUser.role === 'admin' ? 'à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸š' : 'à¸šà¸¸à¸„à¸¥à¸²à¸à¸£'}</span>
        </div>
        <div id="user-dropdown-items"></div>
        <button id="logout-btn" class="user-dropdown-item logout">à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š</button>
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
      btn.innerHTML = `<span>âš–ï¸</span> <span class="shortcut-text">à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²</span>`;
      btn.onclick = () => {
        enterModule('approval-page', true);
      };
    } else {
      btn.innerHTML = `<span>ðŸ“…</span> <span class="shortcut-text">à¸£à¸°à¸šà¸šà¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸¥à¸²</span>`;
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
    welcomeEl.innerHTML = `ðŸ‘¤ à¸ªà¸§à¸±à¸ªà¸”à¸µà¸„à¸¸à¸“ <strong>${currentUser.fullName}</strong> (${currentUser.role === 'admin' ? 'à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸š' : 'à¸šà¸¸à¸„à¸¥à¸²à¸à¸£'}) | à¸¢à¸´à¸™à¸”à¸µà¸•à¹‰à¸­à¸™à¸£à¸±à¸šà¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š`;
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
    welcomeEl.innerHTML = `ðŸ‘¤ à¸¢à¸´à¸™à¸”à¸µà¸•à¹‰à¸­à¸™à¸£à¸±à¸šà¸œà¸¹à¹‰à¹€à¸¢à¸µà¹ˆà¸¢à¸¡à¸Šà¸¡ | à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸£à¸°à¸šà¸šà¸šà¸£à¸´à¸«à¸²à¸£à¸‡à¸²à¸™à¸šà¸¸à¸„à¸„à¸¥`;
  }

  buildNavigation();
}

function buildNavigation() {
  const navMenu = document.getElementById('nav-menu');
  const mobileNav = document.getElementById('mobile-nav-links');
  if (navMenu) navMenu.innerHTML = '';
  if (mobileNav) mobileNav.innerHTML = '';

  let menuItems = [
    { text: 'à¸«à¸™à¹‰à¸²à¸«à¸¥à¸±à¸à¸žà¸­à¸£à¹Œà¸—à¸±à¸¥', icon: 'ðŸ ', page: 'portal-page', action: () => showPage('portal-page') }
  ];

  if (currentUser) {
    // Add Portal Links
    menuItems.push({ text: 'à¸£à¸°à¸šà¸šà¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸¥à¸²', icon: 'ðŸ“…', page: 'dashboard-page', action: loadDashboardData });
    menuItems.push({ text: 'à¸£à¸°à¸šà¸šà¸‚à¸­à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£', icon: 'âœˆï¸', page: 'travel-page', action: initTravelPage });
    menuItems.push({ text: 'à¸£à¸°à¸šà¸šà¸£à¸²à¸¢à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£', icon: 'ðŸ“', page: 'travel-report-page', action: initTravelReportPage });
    menuItems.push({ text: 'à¸£à¸°à¸šà¸šà¸šà¸±à¸™à¸—à¸¶à¸à¸­à¸šà¸£à¸¡', icon: 'ðŸŽ“', page: 'training-page', action: initTrainingPage });

    if (currentUser.role === 'admin') {
      menuItems.push(
        { text: 'à¹€à¸Šà¹‡à¸„à¸Šà¸·à¹ˆà¸­à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™', icon: 'â±ï¸', page: 'attendance-page', action: initAttendancePage },
        { text: 'à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²', icon: 'âš–ï¸', page: 'approval-page', action: loadApprovalPage },
        { text: 'à¸£à¸²à¸¢à¸‡à¸²à¸™à¸ªà¸£à¸¸à¸›à¸à¸²à¸£à¸¥à¸²', icon: 'ðŸ“Š', page: 'report-page', action: loadReportPage },
        { text: 'à¸ˆà¸±à¸”à¸à¸²à¸£à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™', icon: 'âš™ï¸', page: 'user-management-page', action: loadUserManagementPage },
        { text: 'à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“', icon: 'ðŸ”§', page: 'admin-settings-page', action: loadAdminSettingsPage }
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
      editProfileBtn.innerHTML = `<span style="margin-right: 8px;">ðŸ‘¤</span> à¹à¸à¹‰à¹„à¸‚à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§ / à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™`;
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

// Helper to format days count nicely (e.g. 2.5 à¸§à¸±à¸™, 1 à¸§à¸±à¸™, 0 à¸§à¸±à¸™)
function formatDays(val) {
  const num = parseFloat(val) || 0;
  return num.toFixed(1).replace('.0', '') + ' à¸§à¸±à¸™';
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
    const res = await safeFetch(url);
    const d = await res.json();
    
    if (d && d.stats) {
      // Dynamic Labels based on Role
      const totalLabel = document.getElementById('stat-total-label');
      const dashboardTitle = document.getElementById('dashboard-main-title');
      const chartTypeLabel = document.getElementById('chart-type-label');
      const chartMonthlyLabel = document.getElementById('chart-monthly-label');

      const yrDisplay = fiscalYear ? `à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“ ${fiscalYear}` : 'à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™';

      const totalStaffEl = document.getElementById('stat-total-staff');
      const approvedEl = document.getElementById('stat-approved');
      const pendingEl = document.getElementById('stat-pending');
      const rejectedEl = document.getElementById('stat-rejected');
      const travelsEl = document.getElementById('stat-travels');

      if (currentUser && currentUser.role === 'admin') {
        if (totalLabel) totalLabel.textContent = 'à¸šà¸¸à¸„à¸¥à¸²à¸à¸£à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”';
        if (dashboardTitle) dashboardTitle.textContent = `à¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ à¸²à¸žà¸£à¸§à¸¡${yrDisplay}`;
        if (chartTypeLabel) chartTypeLabel.textContent = `à¸ªà¸±à¸”à¸ªà¹ˆà¸§à¸™à¸›à¸£à¸°à¹€à¸ à¸—à¸à¸²à¸£à¸¥à¸²à¸‚à¸­à¸‡à¸šà¸¸à¸„à¸¥à¸²à¸à¸£ (${yrDisplay})`;
        if (chartMonthlyLabel) chartMonthlyLabel.textContent = `à¸ªà¸–à¸´à¸•à¸´à¸ˆà¸³à¸™à¸§à¸™à¸à¸²à¸£à¸¥à¸²à¸ªà¸°à¸ªà¸¡à¸£à¸²à¸¢à¹€à¸”à¸·à¸­à¸™ (${yrDisplay})`;
        
        if (totalStaffEl) totalStaffEl.textContent = d.stats.totalStaff;
        if (approvedEl) approvedEl.textContent = d.stats.approved;
        if (pendingEl) pendingEl.textContent = d.stats.pending;
        if (rejectedEl) rejectedEl.textContent = d.stats.rejected;
        
        const travelLabel = document.getElementById('stat-travel-label');
        if (travelLabel) travelLabel.textContent = 'à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” (à¸„à¸£à¸±à¹‰à¸‡)';
        if (travelsEl) travelsEl.textContent = d.stats.totalTravels;

        const loanEl = document.getElementById('stat-loan-total');
        if (loanEl) {
          const total = parseFloat(d.stats.totalLoanBudget) || 0;
          const cleared = parseFloat(d.stats.clearedLoanBudget) || 0;
          const pending = parseFloat(d.stats.pendingLoanBudget) || 0;
          loanEl.innerHTML = `<span style="font-size:0.95rem;">${total.toLocaleString('th-TH')} à¸šà¸²à¸—</span><br><small style="font-size:0.7rem;color:#0d9488;font-weight:500;">à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹à¸¥à¹‰à¸§ ${cleared.toLocaleString('th-TH')} à¸šà¸²à¸—</small><br><small style="font-size:0.7rem;color:#f59e0b;font-weight:500;">à¸„à¹‰à¸²à¸‡à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œ ${pending.toLocaleString('th-TH')} à¸šà¸²à¸—</small>`;
        }
      } else {
        if (totalLabel) totalLabel.textContent = `à¸§à¸±à¸™à¸¥à¸²à¸ªà¸°à¸ªà¸¡${yrDisplay}`;
        if (dashboardTitle) dashboardTitle.textContent = `à¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”à¸à¸²à¸£à¸¥à¸²à¸‚à¸­à¸‡à¸‰à¸±à¸™ (${yrDisplay})`;
        if (chartTypeLabel) chartTypeLabel.textContent = `à¸ªà¸±à¸”à¸ªà¹ˆà¸§à¸™à¸›à¸£à¸°à¹€à¸ à¸—à¸à¸²à¸£à¸¥à¸²à¸‚à¸­à¸‡à¸‰à¸±à¸™ (${yrDisplay})`;
        if (chartMonthlyLabel) chartMonthlyLabel.textContent = `à¸ªà¸–à¸´à¸•à¸´à¸ˆà¸³à¸™à¸§à¸™à¸à¸²à¸£à¸¥à¸²à¸ªà¸°à¸ªà¸¡à¸£à¸²à¸¢à¹€à¸”à¸·à¸­à¸™à¸‚à¸­à¸‡à¸‰à¸±à¸™ (${yrDisplay})`;
        
        if (totalStaffEl) totalStaffEl.textContent = formatDays(d.stats.totalStaff);
        if (approvedEl) approvedEl.textContent = formatDays(d.stats.approved);
        if (pendingEl) pendingEl.textContent = formatDays(d.stats.pending);
        if (rejectedEl) rejectedEl.textContent = formatDays(d.stats.rejected);
        
        const travelLabel = document.getElementById('stat-travel-label');
        if (travelLabel) travelLabel.textContent = 'à¹€à¸”à¸´à¸™à¸—à¸²à¸‡à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£ (à¸§à¸±à¸™)';
        if (travelsEl) travelsEl.textContent = formatDays(d.stats.totalTravels);

        const loanEl = document.getElementById('stat-loan-total');
        if (loanEl) {
          const total = parseFloat(d.stats.totalLoanBudget) || 0;
          const cleared = parseFloat(d.stats.clearedLoanBudget) || 0;
          const pending = parseFloat(d.stats.pendingLoanBudget) || 0;
          loanEl.innerHTML = `<span style="font-size:0.95rem;">${total.toLocaleString('th-TH')} à¸šà¸²à¸—</span><br><small style="font-size:0.7rem;color:#0d9488;font-weight:500;">à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹à¸¥à¹‰à¸§ ${cleared.toLocaleString('th-TH')} à¸šà¸²à¸—</small><br><small style="font-size:0.7rem;color:#f59e0b;font-weight:500;">à¸„à¹‰à¸²à¸‡à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œ ${pending.toLocaleString('th-TH')} à¸šà¸²à¸—</small>`;
        }
      }
      
      // Render Charts
      renderCharts(d.charts);
      
      // Render Recent Leaves Table
      const tb = document.getElementById('recent-leaves-table');
      if (tb) {
        tb.innerHTML = '';
        if (!d.recentLeaves.length) {
          tb.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--neutral-400); padding:24px;">à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸„à¸³à¸‚à¸­à¸¥à¸²à¸¥à¹ˆà¸²à¸ªà¸¸à¸”</td></tr>`;
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
                  ${l.pdfUrl ? `<a href="${l.pdfUrl}" target="_blank" style="color:var(--primary); font-weight:600;">à¸žà¸´à¸¡à¸žà¹Œà¹ƒà¸šà¸¥à¸²</a>` : '-'}
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
  document.getElementById('form-school-name').value = settings.schoolName || 'à¸§à¸´à¸—à¸¢à¸²à¸¥à¸±à¸¢à¸ªà¸²à¸£à¸žà¸±à¸”à¸Šà¹ˆà¸²à¸‡à¸™à¹ˆà¸²à¸™';
  document.getElementById('form-request-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('form-user-name').value = currentUser.fullName;
  document.getElementById('form-user-position').value = currentUser.position;

  // Retrieve last approved leave to auto fill history table
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/leaves/last-approved/${currentUser.userId}`);
    const l = await res.json();
    
    const sel = document.getElementById('form-last-leave-type');
    if (l) {
      // Find and select matching leave type
      let found = false;
      const targetText = "à¹„à¸”à¹‰ " + l.leaveType;
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
      sel.value = "à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸¥à¸²à¹ƒà¸™à¸£à¸­à¸šà¸„à¸£à¸¶à¹ˆà¸‡à¸›à¸µà¸à¹ˆà¸­à¸™";
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

  document.getElementById('form-total-days').value = 'à¸„à¸³à¸™à¸§à¸“...';
  
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/leaves/calculate-days`, {
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
  // so "à¸¥à¸²à¸¡à¸²à¹à¸¥à¹‰à¸§" always shows the full fiscal year count
  const today = new Date();
  const todayMonth = today.getMonth(); // 0-indexed; 9 = October
  // Fiscal year ends Sep 30. If current month is Oct-Dec, fiscal year ends this year's Sep 30 (next year).
  // If Jan-Sep, fiscal year ends this year's Sep 30.
  const fiscalEndYear = todayMonth >= 9 ? today.getFullYear() + 1 : today.getFullYear();
  const beforeDate = `${fiscalEndYear}-09-30`;
  
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/leaves/stats/${currentUser.userId}?beforeDate=${beforeDate}`);
    const stats = await res.json();
    
    // 1. Sick Leave (à¸¥à¸²à¸›à¹ˆà¸§à¸¢)
    const prevSickCount = stats["à¸›à¹ˆà¸§à¸¢"].count;
    const prevSickDays = stats["à¸›à¹ˆà¸§à¸¢"].days;
    const currSickCount = t === 'à¸¥à¸²à¸›à¹ˆà¸§à¸¢' && currDays > 0 ? 1 : 0;
    const currSickDays = t === 'à¸¥à¸²à¸›à¹ˆà¸§à¸¢' ? currDays : 0;
    
    document.getElementById('stats-sick-prev').textContent = `${prevSickCount} à¸„à¸£à¸±à¹‰à¸‡ / ${prevSickDays.toFixed(1).replace('.0', '')} à¸§à¸±à¸™`;
    document.getElementById('stats-sick-curr').textContent = `${currSickCount} à¸„à¸£à¸±à¹‰à¸‡ / ${currSickDays.toFixed(1).replace('.0', '')} à¸§à¸±à¸™`;
    document.getElementById('stats-sick-total').textContent = `${prevSickCount + currSickCount} à¸„à¸£à¸±à¹‰à¸‡ / ${(prevSickDays + currSickDays).toFixed(1).replace('.0', '')} à¸§à¸±à¸™`;
    
    // 2. Personal Leave (à¸¥à¸²à¸à¸´à¸ˆà¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§)
    const prevPersCount = stats["à¸à¸´à¸ˆ"].count;
    const prevPersDays = stats["à¸à¸´à¸ˆ"].days;
    const currPersCount = t === 'à¸¥à¸²à¸à¸´à¸ˆà¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§' && currDays > 0 ? 1 : 0;
    const currPersDays = t === 'à¸¥à¸²à¸à¸´à¸ˆà¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§' ? currDays : 0;
    
    document.getElementById('stats-personal-prev').textContent = `${prevPersCount} à¸„à¸£à¸±à¹‰à¸‡ / ${prevPersDays.toFixed(1).replace('.0', '')} à¸§à¸±à¸™`;
    document.getElementById('stats-personal-curr').textContent = `${currPersCount} à¸„à¸£à¸±à¹‰à¸‡ / ${currPersDays.toFixed(1).replace('.0', '')} à¸§à¸±à¸™`;
    document.getElementById('stats-personal-total').textContent = `${prevPersCount + currPersCount} à¸„à¸£à¸±à¹‰à¸‡ / ${(prevPersDays + currPersDays).toFixed(1).replace('.0', '')} à¸§à¸±à¸™`;
    
    // 3. Maternity Leave (à¸¥à¸²à¸„à¸¥à¸­à¸”à¸šà¸¸à¸•à¸£)
    const prevMatCount = stats["à¸„à¸¥à¸­à¸”"].count;
    const prevMatDays = stats["à¸„à¸¥à¸­à¸”"].days;
    const currMatCount = t === 'à¸¥à¸²à¸„à¸¥à¸­à¸”à¸šà¸¸à¸•à¸£' && currDays > 0 ? 1 : 0;
    const currMatDays = t === 'à¸¥à¸²à¸„à¸¥à¸­à¸”à¸šà¸¸à¸•à¸£' ? currDays : 0;
    
    document.getElementById('stats-maternity-prev').textContent = `${prevMatCount} à¸„à¸£à¸±à¹‰à¸‡ / ${prevMatDays.toFixed(1).replace('.0', '')} à¸§à¸±à¸™`;
    document.getElementById('stats-maternity-curr').textContent = `${currMatCount} à¸„à¸£à¸±à¹‰à¸‡ / ${currMatDays.toFixed(1).replace('.0', '')} à¸§à¸±à¸™`;
    document.getElementById('stats-maternity-total').textContent = `${prevMatCount + currMatCount} à¸„à¸£à¸±à¹‰à¸‡ / ${(prevMatDays + currMatDays).toFixed(1).replace('.0', '')} à¸§à¸±à¸™`;
    
  } catch (err) {
    console.error('Error updating leave stats table:', err);
  }
}

// Submit Leave Request
async function handleLeaveSubmit(e) {
  e.preventDefault();
  
  if (signaturePad.isEmpty()) {
    return showError('à¸à¸£à¸¸à¸“à¸²à¸¥à¸‡à¸¥à¸²à¸¢à¸¡à¸·à¸­à¸Šà¸·à¹ˆà¸­à¸à¹ˆà¸­à¸™à¸à¸”à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸¥à¸²');
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

  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸‚à¸­à¸¥à¸²à¹à¸¥à¸°à¸ªà¹ˆà¸‡à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™ LINE...');
  
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leavePayload)
    });
    const result = await res.json();
    
    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'à¸¢à¸·à¹ˆà¸™à¹ƒà¸šà¸¥à¸²à¸ªà¸³à¹€à¸£à¹‡à¸ˆ',
        text: 'à¸£à¸°à¸šà¸šà¹„à¸”à¹‰à¸ªà¹ˆà¸‡à¹€à¸£à¸·à¹ˆà¸­à¸‡à¹ƒà¸«à¹‰à¸«à¸±à¸§à¸«à¸™à¹‰à¸²à¸‡à¸²à¸™/à¸œà¸¹à¹‰à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´ à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§',
        confirmButtonText: 'à¸•à¸à¸¥à¸‡'
      });
      showPage('history-page');
      loadHistory();
    } else {
      showError(result.message);
    }
  } catch (err) {
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¹ƒà¸šà¸¥à¸²: ' + err.message);
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
    document.getElementById('history-title').textContent = 'à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²à¸‚à¸­à¸‡à¸šà¸¸à¸„à¸¥à¸²à¸à¸£à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”';
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
    document.getElementById('history-title').textContent = 'à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸²à¸žà¹€à¸ˆà¹‰à¸²';
    userColHeader.classList.add('hidden');
    filterSec.classList.add('hidden');
  }
  
  loadHistoryData();
}

async function loadHistoryData() {
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸›à¸£à¸°à¸§à¸±à¸•à¸´...');
  
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
    const res = await safeFetch(`${API_BASE_URL}/api/leaves/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filterPayload)
    });
    const d = await res.json();
    
    Swal.close();
    
    const tb = document.getElementById('history-table-body');
    tb.innerHTML = '';
    
    if (!d || !d.length) {
      tb.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--neutral-400); padding:24px;">à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²</td></tr>`;
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
                ${i.pdfUrl ? `<a href="${i.pdfUrl}" target="_blank" class="btn btn-outline btn-sm">ðŸ–¨ï¸ à¸žà¸´à¸¡à¸žà¹Œà¹ƒà¸šà¸¥à¸²</a>` : ''}
                ${i.status === 'à¸£à¸­à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´' ? `<button onclick="cancelLeave('${i.leaveId}')" class="btn btn-secondary btn-sm" style="padding: 4px 10px;">à¸¢à¸à¹€à¸¥à¸´à¸</button>` : ''}
                ${currentUser.role === 'admin' ? `<button onclick="deleteLeaveRecord('${i.leaveId}')" class="btn btn-secondary btn-sm" style="padding: 4px 10px; background:#f43f5e;">à¸¥à¸š</button>` : ''}
              </div>
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    showError('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²à¹„à¸”à¹‰: ' + err.message);
  }
}

// Cancel Leave Request (by User)
window.cancelLeave = (leaveId) => {
  Swal.fire({
    title: 'à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸¢à¸à¹€à¸¥à¸´à¸à¹ƒà¸šà¸¥à¸²?',
    text: "à¸„à¸³à¸‚à¸­à¸¥à¸²à¸ˆà¸°à¸–à¸¹à¸à¸¢à¸à¹€à¸¥à¸´à¸à¸à¸²à¸£à¸—à¸³à¸‡à¸²à¸™",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: 'var(--secondary)',
    confirmButtonText: 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸¢à¸à¹€à¸¥à¸´à¸',
    cancelButtonText: 'à¸›à¸´à¸”'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸¢à¸à¹€à¸¥à¸´à¸...');
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/leaves/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leaveId, userId: currentUser.userId })
        });
        const r = await res.json();
        
        if (r.success) {
          Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸¢à¸à¹€à¸¥à¸´à¸à¹ƒà¸šà¸¥à¸²à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
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
    title: 'à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸¥à¸šà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸•à¹‰à¸™à¸‰à¸šà¸±à¸š?',
    text: "à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²à¸™à¸µà¹‰à¸£à¸§à¸¡à¸–à¸¶à¸‡à¹„à¸Ÿà¸¥à¹Œà¹à¸™à¸šà¸•à¹ˆà¸²à¸‡à¹† à¸šà¸™à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œà¸ˆà¸°à¸–à¸¹à¸à¸¥à¸šà¸–à¸²à¸§à¸£",
    icon: 'error',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸¥à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥',
    cancelButtonText: 'à¸›à¸´à¸”'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸¥à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥...');
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/leaves/${leaveId}`, {
          method: 'DELETE'
        });
        const r = await res.json();
        if (r.success) {
          Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸¥à¸šà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸„à¸³à¸‚à¸­à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
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
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸à¸²à¸£à¸£à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´...');
  
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/leaves/pending`);
    const d = await res.json();
    
    Swal.close();
    const tb = document.getElementById('approval-table-body');
    tb.innerHTML = '';
    
    if (!d || !d.length) {
      tb.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--neutral-400); padding:24px;">à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£à¹ƒà¸šà¸¥à¸²à¸—à¸µà¹ˆà¸£à¸­à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹ƒà¸™à¸‚à¸“à¸°à¸™à¸µà¹‰</td></tr>`;
    } else {
      d.forEach(l => {
        tb.innerHTML += `
          <tr>
            <td style="font-weight: 500;">${l.fullName}</td>
            <td>${l.position}</td>
            <td style="color:var(--primary); font-weight:600;">${l.leaveType}</td>
            <td>${formatDate(l.startDate)} - ${formatDate(l.endDate)} (à¸£à¸§à¸¡ ${l.totalDays} à¸§à¸±à¸™)</td>
            <td>
              <button onclick='openApprovalModal(${JSON.stringify(l)})' class="btn btn-primary btn-sm">ðŸ“„ à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹à¸¥à¸°à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´</button>
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    showError('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸„à¸³à¸‚à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹„à¸”à¹‰: ' + err.message);
  }
}

window.openApprovalModal = (l) => {
  const frontendUrl = window.location.href.split('?')[0].split('#')[0];

  Swal.fire({
    title: 'à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸„à¸³à¸‚à¸­à¸¥à¸²',
    html: `
      <div style="text-align: left; background:var(--neutral-50); padding:16px; border-radius:12px; margin-bottom:16px; font-size:14px; border:1px solid var(--neutral-200);">
        <p style="margin-bottom:6px;"><strong>à¸œà¸¹à¹‰à¸‚à¸­à¸¥à¸²:</strong> ${l.fullName}</p>
        <p style="margin-bottom:6px;"><strong>à¸›à¸£à¸°à¹€à¸ à¸—à¸à¸²à¸£à¸¥à¸²:</strong> ${l.leaveType}</p>
        <p style="margin-bottom:6px;"><strong>à¹€à¸«à¸•à¸¸à¸œà¸¥à¸à¸²à¸£à¸¥à¸²:</strong> ${l.reason}</p>
        <p style="margin-bottom:6px;"><strong>à¸œà¸¹à¹‰à¸ªà¸­à¸™à¹à¸—à¸™:</strong> ${l.teacherName} (à¸§à¸´à¸Šà¸²: ${l.subject})</p>
        <p><strong>à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¸•à¸´à¸”à¸•à¹ˆà¸­:</strong> ${l.contactAddress} (à¹‚à¸—à¸£: ${l.contactPhone})</p>
      </div>
      
      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">à¸„à¸³à¸ªà¸±à¹ˆà¸‡ / à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™</label>
          <select id="swal-status" class="form-input">
            <option value="à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´">âœ… à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²</option>
            <option value="à¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸¡à¸±à¸•à¸´">âŒ à¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²</option>
          </select>
        </div>
        
        <div id="swal-comment-div" style="display:none;">
          <label class="form-label">à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸ (à¸à¸£à¸“à¸µà¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸¡à¸±à¸•à¸´)</label>
          <textarea id="swal-comment" class="form-input" placeholder="à¸£à¸°à¸šà¸¸à¸ªà¸²à¹€à¸«à¸•à¸¸..."></textarea>
        </div>
        
        <div>
          <label class="form-label">à¸¥à¸‡à¸™à¸²à¸¡à¸¥à¸²à¸¢à¸¡à¸·à¸­à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´</label>
          <div style="background:white; border:2px dashed var(--neutral-400); border-radius:12px; padding:10px; width:100%;">
            <canvas id="swal-admin-sig" class="signature-canvas" style="width:100%; height:120px;"></canvas>
            <div style="text-align:right; margin-top:8px;">
              <button type="button" id="swal-clear-sig" style="font-size:12px; color:var(--secondary); font-weight:bold; border:none; background:none; cursor:pointer;">à¸¥à¹‰à¸²à¸‡à¸¥à¸²à¸¢à¹€à¸‹à¹‡à¸™</button>
            </div>
          </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸ªà¸±à¹ˆà¸‡',
    cancelButtonText: 'à¸›à¸´à¸”à¸«à¸™à¹‰à¸²à¸•à¹ˆà¸²à¸‡',
    didOpen: () => {
      const c = document.getElementById('swal-admin-sig');
      c.width = c.parentElement.offsetWidth - 20;
      c.height = 120;
      adminSignaturePad = new SignaturePad(c, { backgroundColor: 'rgb(255, 255, 255)' });
      
      document.getElementById('swal-clear-sig').onclick = () => adminSignaturePad.clear();
      
      document.getElementById('swal-status').onchange = (e) => {
        const commentDiv = document.getElementById('swal-comment-div');
        if (e.target.value === 'à¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸¡à¸±à¸•à¸´') {
          commentDiv.style.display = 'block';
        } else {
          commentDiv.style.display = 'none';
        }
      };
    },
    preConfirm: () => {
      const status = document.getElementById('swal-status').value;
      const comment = document.getElementById('swal-comment').value;
      
      if (status === 'à¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸¡à¸±à¸•à¸´' && !comment.trim()) {
        Swal.showValidationMessage('à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸à¸à¸²à¸£à¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸¡à¸±à¸•à¸´');
      }
      
      if (adminSignaturePad.isEmpty()) {
        Swal.showValidationMessage('à¸à¸£à¸¸à¸“à¸²à¹€à¸‹à¹‡à¸™à¸Šà¸·à¹ˆà¸­à¸£à¸±à¸šà¸£à¸­à¸‡');
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
      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹à¸¥à¸°à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸œà¸¹à¹‰à¸¥à¸²...');
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/leaves/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const r = await res.json();
        
        if (r.success) {
          Swal.fire({
            icon: 'success',
            title: 'à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸ªà¸³à¹€à¸£à¹‡à¸ˆ',
            text: `à¸ªà¹ˆà¸‡à¸œà¸¥à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸—à¸²à¸‡ LINE à¹„à¸›à¸¢à¸±à¸‡à¸œà¸¹à¹‰à¸¥à¸²à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§`,
            confirmButtonText: 'à¸•à¸à¸¥à¸‡'
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
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸‡à¸²à¸™...');
  
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/reports/all`);
    const data = await res.json();
    
    Swal.close();
    
    const tb = document.getElementById('report-table-body');
    tb.innerHTML = '';
    
    if (!data || !data.length) {
      tb.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--neutral-400); padding:24px;">à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸„à¸³à¸‚à¸­à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¹ƒà¸™à¸£à¸°à¸šà¸š</td></tr>`;
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
              ${l.pdfUrl ? `<a href="${l.pdfUrl}" target="_blank" style="color:var(--primary); font-weight:600;">à¸žà¸´à¸¡à¸žà¹Œà¹ƒà¸šà¸¥à¸²</a>` : '-'}
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    showError('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸²à¸¢à¸‡à¸²à¸™à¹„à¸”à¹‰: ' + err.message);
  }
}

// Export excel report
async function handleExportExcel() {
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸žà¸·à¹ˆà¸­à¸ªà¹ˆà¸‡à¸­à¸­à¸à¹„à¸Ÿà¸¥à¹Œ Excel...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/reports/all`);
    const data = await res.json();
    
    Swal.close();
    
    if (data && data.length) {
      // Map to Thai excel column headers
      const formatted = data.map((item, index) => ({
        "à¸¥à¸³à¸”à¸±à¸š": index + 1,
        "à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥": item.fullName,
        "à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡": item.position,
        "à¸§à¸±à¸™à¸—à¸µà¹ˆà¸¢à¸·à¹ˆà¸™à¹ƒà¸šà¸¥à¸²": formatDate(item.requestDate),
        "à¸›à¸£à¸°à¹€à¸ à¸—à¸à¸²à¸£à¸¥à¸²": item.leaveType,
        "à¸§à¸±à¸™à¹€à¸£à¸´à¹ˆà¸¡à¸¥à¸²": formatDate(item.startDate),
        "à¸§à¸±à¸™à¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”à¸¥à¸²": formatDate(item.endDate),
        "à¸£à¸§à¸¡à¸ˆà¸³à¸™à¸§à¸™ (à¸§à¸±à¸™)": item.totalDays,
        "à¸ªà¸–à¸²à¸™à¸°": item.status,
        "à¸¥à¸´à¸‡à¸à¹Œà¹€à¸­à¸à¸ªà¸²à¸£à¸žà¸´à¸¡à¸žà¹Œ": item.pdfUrl || ''
      }));
      
      const ws = XLSX.utils.json_to_sheet(formatted);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²");
      
      // Auto fit column width
      const max_len = formatted.reduce((acc, row) => {
        Object.keys(row).forEach((k, i) => {
          const w = String(row[k]).length;
          acc[i] = Math.max(acc[i] || 0, w);
        });
        return acc;
      }, []);
      ws['!cols'] = max_len.map(w => ({ w: Math.min(w + 3, 30) }));

      XLSX.writeFile(wb, `à¸£à¸²à¸¢à¸‡à¸²à¸™à¸ªà¸£à¸¸à¸›à¸à¸²à¸£à¸¥à¸²_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      showError('à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸³à¸«à¸£à¸±à¸šà¸ˆà¸±à¸”à¸—à¸³à¸£à¸²à¸¢à¸‡à¸²à¸™ Excel');
    }
  } catch (err) {
    showError(err.message);
  }
}

// Print Summary Report Modal
async function handlePrintReport() {
  const s = document.getElementById('print-start-date').value;
  const e = document.getElementById('print-end-date').value;
  
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸„à¸³à¸™à¸§à¸“à¸ªà¸£à¸¸à¸›...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/reports/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: s, endDate: e })
    });
    const data = await res.json();
    
    Swal.close();
    
    if (!data || !data.length) {
      return showError('à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸²à¸£à¸¥à¸²à¹ƒà¸™à¸Šà¹ˆà¸§à¸‡à¸§à¸±à¸™à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸');
    }
    
    // Prepare HTML content for printing
    let html = `
      <html>
      <head>
        <title>à¸£à¸²à¸¢à¸‡à¸²à¸™à¸ªà¸£à¸¸à¸›à¸ªà¸–à¸´à¸•à¸´à¸à¸²à¸£à¸¥à¸²à¸šà¸¸à¸„à¸„à¸¥</title>
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
        <h2>à¸£à¸²à¸¢à¸‡à¸²à¸™à¸ªà¸£à¸¸à¸›à¸ªà¸–à¸´à¸•à¸´à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸² (à¸£à¸²à¸¢à¸šà¸¸à¸„à¸„à¸¥)</h2>
        <div class="sub">
          à¸§à¸´à¸—à¸¢à¸²à¸¥à¸±à¸¢à¸ªà¸²à¸£à¸žà¸±à¸”à¸Šà¹ˆà¸²à¸‡à¸™à¹ˆà¸²à¸™ <br>
          ${s ? `à¸•à¸±à¹‰à¸‡à¹à¸•à¹ˆà¸§à¸±à¸™à¸—à¸µà¹ˆ ${formatDateThai(s)}` : ''} ${e ? `à¸–à¸¶à¸‡à¸§à¸±à¸™à¸—à¸µà¹ˆ ${formatDateThai(e)}` : ''} 
          (à¹€à¸‰à¸žà¸²à¸°à¸£à¸²à¸¢à¸à¸²à¸£à¸—à¸µà¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´)
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 50px;">à¸—à¸µà¹ˆ</th>
              <th>à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥</th>
              <th>à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡</th>
              <th class="text-center" style="width: 100px;">à¸ˆà¸³à¸™à¸§à¸™à¸„à¸£à¸±à¹‰à¸‡à¸¥à¸²</th>
              <th class="text-center" style="width: 100px;">à¸£à¸§à¸¡à¸ˆà¸³à¸™à¸§à¸™ (à¸§à¸±à¸™)</th>
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
          à¸žà¸´à¸¡à¸žà¹Œà¸£à¸²à¸¢à¸‡à¸²à¸™à¹€à¸¡à¸·à¹ˆà¸­à¸§à¸±à¸™à¸—à¸µà¹ˆ: ${new Date().toLocaleString('th-TH')}
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
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™...');
  
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/users`);
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
              ${x.role === 'admin' ? 'à¹à¸­à¸”à¸¡à¸´à¸™' : 'à¸šà¸¸à¸„à¸¥à¸²à¸à¸£'}
            </span>
          </td>
          <td>${renderBadge(x.status, true)}</td>
          <td>
            <div style="display:flex; gap:8px;">
              ${x.status === 'pending' ? `<button onclick="approveUser('${x.userId}')" class="btn btn-primary btn-sm" style="padding:4px 10px; background:#10b981; box-shadow:none;">à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´</button>` : ''}
              <button onclick='editUser(${JSON.stringify(x)})' class="btn btn-outline btn-sm" style="padding:4px 10px;">à¹à¸à¹‰à¹„à¸‚</button>
              <button onclick="deleteUser('${x.userId}')" class="btn btn-secondary btn-sm" style="padding:4px 10px; background:#f43f5e; box-shadow:none;">à¸¥à¸š</button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    showError('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­à¸šà¸¸à¸„à¸¥à¸²à¸à¸£à¹„à¸”à¹‰: ' + err.message);
  }
}

// Approve User Registration
window.approveUser = async (userId) => {
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸šà¸±à¸à¸Šà¸µ...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/users/approve/${userId}`, { method: 'POST' });
    const r = await res.json();
    if (r.success) {
      Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸šà¸±à¸à¸Šà¸µà¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢', 'success');
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
    title: 'à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸¥à¸šà¸šà¸±à¸à¸Šà¸µà¸šà¸¸à¸„à¸¥à¸²à¸à¸£?',
    text: "à¸šà¸±à¸à¸Šà¸µà¹à¸¥à¸°à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸¥à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¸‚à¸­à¸‡à¸šà¸±à¸à¸Šà¸µà¸™à¸µà¹‰à¸ˆà¸°à¸–à¸¹à¸à¸¥à¸šà¸–à¸²à¸§à¸£",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸¥à¸š',
    cancelButtonText: 'à¸›à¸´à¸”'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸¥à¸šà¸šà¸±à¸à¸Šà¸µ...');
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/users/${userId}`, { method: 'DELETE' });
        const r = await res.json();
        if (r.success) {
          Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸¥à¸šà¸šà¸±à¸à¸Šà¸µà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
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
    title: 'à¹à¸à¹‰à¹„à¸‚à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰',
    html: `
      <!-- Dummy fields to prevent browser autofill -->
      <input type="text" style="display:none;" name="dummy-username" autocomplete="username">
      <input type="password" style="display:none;" name="dummy-password" autocomplete="new-password">

      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥</label>
          <input id="edit-fn" class="form-input" value="${u.fullName}" autocomplete="off">
        </div>
        <div>
          <label class="form-label">à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡</label>
          <input id="edit-pos" class="form-input" value="${u.position}" autocomplete="off">
        </div>
        <div>
          <label class="form-label">à¸›à¸£à¸°à¹€à¸ à¸—à¸šà¸¸à¸„à¸¥à¸²à¸à¸£</label>
          <select id="edit-type" class="form-input">
            <option value="" ${!u.staffType ? 'selected' : ''}>-- à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸ --</option>
            <option value="à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£" ${u.staffType === 'à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£' ? 'selected' : ''}>à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£</option>
            <option value="à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£" ${u.staffType === 'à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£' ? 'selected' : ''}>à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£</option>
            <option value="à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£" ${u.staffType === 'à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£' ? 'selected' : ''}>à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£</option>
            <option value="à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™" ${u.staffType === 'à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™' ? 'selected' : ''}>à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™</option>
            <option value="à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ" ${u.staffType === 'à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ' ? 'selected' : ''}>à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ</option>
          </select>
        </div>
        <div>
          <label class="form-label">à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡</label>
          <select id="edit-er" class="form-input">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>à¸šà¸¸à¸„à¸¥à¸²à¸à¸£ (User)</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸š (Admin)</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>LINE User ID</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">ðŸ’¬ à¹à¸Šà¸—à¸šà¸­à¸•à¸‚à¸­ ID</a>
          </label>
          <input id="edit-lid" class="form-input" value="${u.lineUserId || ''}" placeholder="à¸£à¸°à¸šà¸¸ LINE User ID (à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸”à¹‰à¸§à¸¢ U...)" autocomplete="off">
          <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">*à¸žà¸´à¸¡à¸žà¹Œ "à¸‚à¸­ ID" à¹ƒà¸™à¸«à¹‰à¸­à¸‡à¹à¸Šà¸—à¹€à¸žà¸·à¹ˆà¸­à¸‚à¸­à¸£à¸«à¸±à¸ªà¸ˆà¸²à¸à¸šà¸­à¸•</p>
        </div>
        <div>
          <label class="form-label">à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹ƒà¸«à¸¡à¹ˆ (à¸›à¸¥à¹ˆà¸­à¸¢à¸§à¹ˆà¸²à¸‡à¸«à¸²à¸à¹„à¸¡à¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™)</label>
          <input id="edit-eps" type="password" class="form-input" placeholder="à¸à¸£à¸­à¸à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹ƒà¸«à¸¡à¹ˆ" autocomplete="new-password">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'à¸šà¸±à¸™à¸—à¸¶à¸',
    cancelButtonText: 'à¸¢à¸à¹€à¸¥à¸´à¸',
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
      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥...');
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/users/${u.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const r = await res.json();
        
        if (r.success) {
          Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸­à¸±à¸›à¹€à¸”à¸•à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
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
    title: 'à¹€à¸žà¸´à¹ˆà¸¡à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹ƒà¸«à¸¡à¹ˆ',
    html: `
      <!-- Dummy fields to prevent browser autofill -->
      <input type="text" style="display:none;" name="dummy-username" autocomplete="username">
      <input type="password" style="display:none;" name="dummy-password" autocomplete="new-password">

      <div style="text-align: left; display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="form-label">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥ <span style="color:var(--danger)">*</span></label>
          <input id="add-fn" class="form-input" placeholder="à¹€à¸Šà¹ˆà¸™ à¸™à¸²à¸¢à¸ªà¸¡à¸Šà¸²à¸¢ à¹ƒà¸ˆà¸”à¸µ" autocomplete="off">
        </div>
        <div>
          <label class="form-label">à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡ <span style="color:var(--danger)">*</span></label>
          <input id="add-pos" class="form-input" placeholder="à¹€à¸Šà¹ˆà¸™ à¸„à¸£à¸¹à¸§à¸´à¸—à¸¢à¸à¸²à¸™à¸°à¸Šà¸³à¸™à¸²à¸à¸à¸²à¸£" autocomplete="off">
        </div>
        <div>
          <label class="form-label">à¸›à¸£à¸°à¹€à¸ à¸—à¸šà¸¸à¸„à¸¥à¸²à¸à¸£</label>
          <select id="add-type" class="form-input">
            <option value="à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£">à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£</option>
            <option value="à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£">à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£</option>
            <option value="à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™" selected>à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™</option>
            <option value="à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ">à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ</option>
            <option value="à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£">à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£</option>
          </select>
        </div>
        <div>
          <label class="form-label">à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡</label>
          <select id="add-er" class="form-input">
            <option value="user" selected>à¸šà¸¸à¸„à¸¥à¸²à¸à¸£ (User)</option>
            <option value="admin">à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸š (Admin)</option>
          </select>
        </div>
        <div>
          <label class="form-label">à¸ªà¸–à¸²à¸™à¸°à¸šà¸±à¸à¸Šà¸µ</label>
          <select id="add-status" class="form-input">
            <option value="approved" selected>à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹à¸¥à¹‰à¸§ (Approved)</option>
            <option value="pending">à¸£à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´ (Pending)</option>
          </select>
        </div>
        <div>
          <label class="form-label">à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰ (à¸ à¸²à¸©à¸²à¸­à¸±à¸‡à¸à¸¤à¸©) <span style="color:var(--danger)">*</span></label>
          <input id="add-ru" class="form-input" placeholder="Username à¸ªà¸³à¸«à¸£à¸±à¸šà¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š" autocomplete="off">
        </div>
        <div>
          <label class="form-label">à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™ <span style="color:var(--danger)">*</span></label>
          <input id="add-rp" type="password" class="form-input" placeholder="Password à¸ªà¸³à¸«à¸£à¸±à¸šà¹€à¸‚à¹‰à¸²à¹ƒà¸Šà¹‰à¸‡à¸²à¸™" autocomplete="new-password">
        </div>
        <div>
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>LINE User ID</span>
            <a href="https://line.me/R/ti/p/@943jvlmv" target="_blank" style="background:#06c755; color:white; padding:4px 10px; font-size:11px; border-radius:6px; font-weight:bold; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">ðŸ’¬ à¹à¸Šà¸—à¸šà¸­à¸•à¸‚à¸­ ID</a>
          </label>
          <input id="add-lid" class="form-input" placeholder="à¸£à¸°à¸šà¸¸ LINE User ID (à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸”à¹‰à¸§à¸¢ U...)" autocomplete="off">
          <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">*à¸žà¸´à¸¡à¸žà¹Œ "à¸‚à¸­ ID" à¹ƒà¸™à¸«à¹‰à¸­à¸‡à¹à¸Šà¸—à¹€à¸žà¸·à¹ˆà¸­à¸‚à¸­à¸£à¸«à¸±à¸ªà¸ˆà¸²à¸à¸šà¸­à¸•</p>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'à¸šà¸±à¸™à¸—à¸¶à¸',
    cancelButtonText: 'à¸¢à¸à¹€à¸¥à¸´à¸',
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
        Swal.showValidationMessage('à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸«à¸¥à¸±à¸à¸—à¸µà¹ˆà¸ˆà¸³à¹€à¸›à¹‡à¸™ (*) à¹ƒà¸«à¹‰à¸„à¸£à¸šà¸–à¹‰à¸§à¸™');
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
      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹ƒà¸«à¸¡à¹ˆ...');
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        });
        const r = await res.json();
        
        if (r.success) {
          Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¹€à¸žà¸´à¹ˆà¸¡à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹ƒà¸«à¸¡à¹ˆà¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
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
  
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸­à¹ˆà¸²à¸™à¹„à¸Ÿà¸¥à¹Œ Excel...');
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      
      showLoading('à¸à¸³à¸¥à¸±à¸‡à¸™à¸³à¹€à¸‚à¹‰à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸¡à¸²à¸Šà¸´à¸...');
      const res = await safeFetch(`${API_BASE_URL}/api/users/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json)
      });
      const result = await res.json();
      
      if (result.success) {
        Swal.fire('à¸™à¸³à¹€à¸‚à¹‰à¸²à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', result.message, 'success');
        loadUserManagementPage();
      } else {
        showError(result.message);
      }
    } catch (err) {
      showError('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸­à¹ˆà¸²à¸™à¹„à¸Ÿà¸¥à¹Œà¹„à¸”à¹‰: ' + err.message);
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
    title: 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”',
    text: typeof msg === 'object' ? JSON.stringify(msg) : msg,
    icon: 'error',
    confirmButtonText: 'à¸•à¸à¸¥à¸‡',
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
      label = 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹à¸¥à¹‰à¸§';
    } else if (status === 'pending') {
      className = 'badge-pending';
      label = 'à¸£à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´';
    }
  } else {
    if (status === 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´') {
      className = 'badge-approved';
    } else if (status === 'à¸£à¸­à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´') {
      className = 'badge-pending';
    } else if (status === 'à¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸¡à¸±à¸•à¸´') {
      className = 'badge-rejected';
    } else if (status === 'à¸¢à¸à¹€à¸¥à¸´à¸à¹‚à¸”à¸¢à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰') {
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
                  label += context.parsed.toFixed(1).replace('.0', '') + ' à¸§à¸±à¸™';
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
          label: 'à¸ˆà¸³à¸™à¸§à¸™à¸à¸²à¸£à¸¥à¸² (à¸§à¸±à¸™)',
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
                  label = 'à¸ˆà¸³à¸™à¸§à¸™à¸§à¸±à¸™à¸¥à¸²: ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toFixed(1).replace('.0', '') + ' à¸§à¸±à¸™';
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
    Swal.fire('à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”', 'à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¸§à¸±à¸™à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥', 'error');
    return;
  }

  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸²à¸£à¸¥à¸‡à¹€à¸§à¸¥à¸²...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/attendance?date=${date}`);
    if (!res.ok) throw new Error('à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™à¸¥à¹‰à¸¡à¹€à¸«à¸¥à¸§');
    
    const data = await res.json();
    
    // Sort data:
    // 1. à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£
    // 2. à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£
    // 3. à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£
    // 4. à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™
    // 5. à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ
    // 6. Others/Empty
    const staffTypeOrder = [
      'à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£',
      'à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£',
      'à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£',
      'à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™',
      'à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ'
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
      filterSelect.value = 'à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”';
    }

    filterAndRenderAttendance();
    Swal.close();
  } catch (err) {
    console.error('Error loading attendance:', err);
    Swal.fire('à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”', err.message, 'error');
  }
}

function filterAndRenderAttendance() {
  const filterSelect = document.getElementById('attendance-filter-type');
  const filterType = filterSelect ? filterSelect.value : 'à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”';
  let filtered = [...currentAttendanceData];
  
  if (filterType !== 'à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”') {
    if (filterType === 'à¸­à¸·à¹ˆà¸™à¹†') {
      const knownTypes = ['à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£', 'à¸‚à¹‰à¸²à¸£à¸²à¸Šà¸à¸²à¸£', 'à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£', 'à¸„à¸£à¸¹à¸žà¸´à¹€à¸¨à¸©à¸ªà¸­à¸™', 'à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ'];
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
    tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:24px; color:var(--neutral-400);">à¹„à¸¡à¹ˆà¸žà¸šà¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­à¸šà¸¸à¸„à¸¥à¸²à¸à¸£</td></tr>`;
    return;
  }

  dataList.forEach(user => {
    let leaveBadge = '-';
    if (user.activeLeave) {
      let badgeColor = 'var(--warning)';
      let badgeBg = 'var(--warning-light)';
      if (user.activeLeave.leaveType === 'à¸¥à¸²à¸›à¹ˆà¸§à¸¢') {
        badgeColor = '#ef4444';
        badgeBg = '#fef2f2';
      }
      leaveBadge = `<span style="background:${badgeBg}; color:${badgeColor}; padding:4px 8px; border-radius:6px; font-size:0.8rem; font-weight:600; display:inline-block;">âš ï¸ à¸¥à¸²: ${user.activeLeave.leaveType} (${user.activeLeave.status})</span>`;
    } else if (user.activeTravel) {
      leaveBadge = `<span style="background:#f5f3ff; color:#7c3aed; padding:4px 8px; border-radius:6px; font-size:0.8rem; font-weight:600; display:inline-block;">âœˆï¸ à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£ (${user.activeTravel.status})</span>`;
    }

    tbody.innerHTML += `
      <tr>
        <td style="font-weight: 500; text-align: left; padding-left: 20px;">
          ${user.fullName}
          <div style="font-size:0.75rem; color:var(--neutral-500); margin-top:2px;">
            ${user.staffType || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸à¸›à¸£à¸°à¹€à¸ à¸—'}
          </div>
        </td>
        <td style="text-align: left; padding-left: 20px;">${user.position}</td>
        <td id="leave-badge-col-${user.userId}">${leaveBadge}</td>
        <td style="text-align: center;">
          <select class="form-input attendance-select" data-user-id="${user.userId}" style="padding: 6px 12px; font-size: 0.9rem; font-weight: bold; width: 100%; border-radius: 8px;">
            <option value="à¸¡à¸²à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™" ${user.status === 'à¸¡à¸²à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™' ? 'selected' : ''}>à¸¡à¸²à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™</option>
            <option value="à¸¥à¸²à¸›à¹ˆà¸§à¸¢" ${user.status === 'à¸¥à¸²à¸›à¹ˆà¸§à¸¢' ? 'selected' : ''}>à¸¥à¸²à¸›à¹ˆà¸§à¸¢</option>
            <option value="à¸¥à¸²à¸à¸´à¸ˆ" ${user.status === 'à¸¥à¸²à¸à¸´à¸ˆ' ? 'selected' : ''}>à¸¥à¸²à¸à¸´à¸ˆ</option>
            <option value="à¸¥à¸²à¸„à¸¥à¸­à¸”" ${user.status === 'à¸¥à¸²à¸„à¸¥à¸­à¸”' ? 'selected' : ''}>à¸¥à¸²à¸„à¸¥à¸­à¸”</option>
            <option value="à¸¥à¸²à¸žà¸±à¸à¸œà¹ˆà¸­à¸™" ${user.status === 'à¸¥à¸²à¸žà¸±à¸à¸œà¹ˆà¸­à¸™' ? 'selected' : ''}>à¸¥à¸²à¸žà¸±à¸à¸œà¹ˆà¸­à¸™</option>
            <option value="à¹€à¸”à¸´à¸™à¸—à¸²à¸‡à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£" ${user.status === 'à¹€à¸”à¸´à¸™à¸—à¸²à¸‡à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£' ? 'selected' : ''}>à¹€à¸”à¸´à¸™à¸—à¸²à¸‡à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£</option>
            <option value="à¸‚à¸²à¸”" ${user.status === 'à¸‚à¸²à¸”' ? 'selected' : ''}>à¸‚à¸²à¸”</option>
            <option value="à¸¡à¸²à¸ªà¸²à¸¢" ${user.status === 'à¸¡à¸²à¸ªà¸²à¸¢' ? 'selected' : ''}>à¸¡à¸²à¸ªà¸²à¸¢</option>
            <option value="à¹„à¸¡à¹ˆà¸—à¸£à¸²à¸šà¸ªà¸²à¹€à¸«à¸•à¸¸" ${user.status === 'à¹„à¸¡à¹ˆà¸—à¸£à¸²à¸šà¸ªà¸²à¹€à¸«à¸•à¸¸' ? 'selected' : ''}>à¹„à¸¡à¹ˆà¸—à¸£à¸²à¸šà¸ªà¸²à¹€à¸«à¸•à¸¸</option>
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
  if (val === 'à¸¡à¸²à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™') {
    selectEl.style.color = '#10B981';
    selectEl.style.borderColor = '#10B981';
    selectEl.style.backgroundColor = '#ECFDF5';
  } else if (val.startsWith('à¸¥à¸²')) {
    selectEl.style.color = '#D97706';
    selectEl.style.borderColor = '#F59E0B';
    selectEl.style.backgroundColor = '#FFFBEB';
  } else if (val === 'à¹€à¸”à¸´à¸™à¸—à¸²à¸‡à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£') {
    selectEl.style.color = '#7C3AED';
    selectEl.style.borderColor = '#8B5CF6';
    selectEl.style.backgroundColor = '#F5F3FF';
  } else if (val === 'à¸‚à¸²à¸”' || val === 'à¹„à¸¡à¹ˆà¸—à¸£à¸²à¸šà¸ªà¸²à¹€à¸«à¸•à¸¸') {
    selectEl.style.color = '#EF4444';
    selectEl.style.borderColor = '#EF4444';
    selectEl.style.backgroundColor = '#FEF2F2';
  } else if (val === 'à¸¡à¸²à¸ªà¸²à¸¢') {
    selectEl.style.color = '#3B82F6';
    selectEl.style.borderColor = '#3B82F6';
    selectEl.style.backgroundColor = '#EFF6FF';
  }
}

async function saveAttendanceData() {
  const date = document.getElementById('attendance-date').value;
  if (!date) {
    Swal.fire('à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”', 'à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¸§à¸±à¸™à¸—à¸µà¹ˆà¸šà¸±à¸™à¸—à¸¶à¸', 'error');
    return;
  }

  const records = currentAttendanceData.map(u => ({
    userId: u.userId,
    status: u.status
  }));

  if (records.length === 0) {
    Swal.fire('à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”', 'à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸³à¸«à¸£à¸±à¸šà¸šà¸±à¸™à¸—à¸¶à¸', 'error');
    return;
  }

  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¸°à¸ªà¹ˆà¸‡à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™ LINE...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/attendance`, {
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

    if (!res.ok) throw new Error('à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸¥à¹‰à¸¡à¹€à¸«à¸¥à¸§');
    const result = await res.json();
    
    if (result.success) {
      Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¸°à¸ªà¹ˆà¸‡à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸—à¸²à¸‡à¹„à¸¥à¸™à¹Œà¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
      loadAttendanceData();
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    console.error('Error saving attendance:', err);
    Swal.fire('à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”', err.message, 'error');
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
    <input type="text" class="form-input travel-accompanied-name" placeholder="à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥..." value="${name}" required style="flex-grow: 1;">
    <input type="text" class="form-input travel-accompanied-pos" placeholder="à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡..." value="${position}" required style="width: 200px;">
    <button type="button" class="btn btn-outline btn-sm" onclick="removeTravelerRow(this)" style="padding: 10px; border-color:var(--danger); color:var(--danger);">âŒ</button>
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
// MULTI-LEG TRAVEL VEHICLE SYSTEM
// Each leg has its own vehicle type and input fields
// ============================================================
let _travelLegCounter = 0;

const VEHICLE_OPTIONS = `
  <option value="">-- à¹€à¸¥à¸·à¸­à¸à¸žà¸²à¸«à¸™à¸° --</option>
  <optgroup label="âœˆ à¸¢à¸²à¸™à¸žà¸²à¸«à¸™à¸°à¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¸•à¸±à¹‹à¸§">
    <option value="plane">âœˆï¸ à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸šà¸´à¸™</option>
    <option value="train">ðŸš‚ à¸£à¸–à¹„à¸Ÿ</option>
    <option value="bus">ðŸšŒ à¸£à¸–à¹‚à¸”à¸¢à¸ªà¸²à¸£à¸›à¸£à¸°à¸ˆà¸³à¸—à¸²à¸‡</option>
  </optgroup>
  <optgroup label="ðŸš• à¸„à¹ˆà¸²à¹‚à¸”à¸¢à¸ªà¸²à¸£/à¸ˆà¹‰à¸²à¸‡">
    <option value="taxi">ðŸš• à¹à¸—à¹‡à¸à¸‹à¸µà¹ˆ / à¸£à¸–à¸£à¸±à¸šà¸ˆà¹‰à¸²à¸‡</option>
    <option value="van">ðŸš à¸£à¸–à¸•à¸¹à¹‰à¹‚à¸”à¸¢à¸ªà¸²à¸£</option>
    <option value="boat">â›µ à¹€à¸£à¸·à¸­</option>
    <option value="other_transport">ðŸš— à¸žà¸²à¸«à¸™à¸°à¸­à¸·à¹ˆà¸™à¹†</option>
  </optgroup>
  <optgroup label="ðŸš— à¸£à¸–à¸£à¸²à¸Šà¸à¸²à¸£ / à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§">
    <option value="gov_car">ðŸšŒ à¸£à¸–à¸§à¸´à¸—à¸¢à¸²à¸¥à¸±à¸¢</option>
    <option value="personal_car">ðŸš— à¸£à¸–à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§</option>
  </optgroup>
`;

window.addTravelLeg = () => {
  const container = document.getElementById('travel-legs-container');
  if (!container) return;
  const id = ++_travelLegCounter;

  const card = document.createElement('div');
  card.id = `tleg-${id}`;
  card.style.cssText = 'border:1px solid #e2e8f0; border-radius:10px; padding:14px; background:#f8fafc; position:relative;';
  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <span style="font-size:0.82rem; font-weight:700; color:#334155; background:#dbeafe; padding:3px 10px; border-radius:20px;">à¹€à¸ªà¹‰à¸™à¸—à¸²à¸‡à¸—à¸µà¹ˆ ${id}</span>
        <select class="form-input leg-vehicle-select" style="padding:5px 12px; font-size:0.83rem; width:auto;"
          onchange="onLegVehicleChange(${id})">
          ${VEHICLE_OPTIONS}
        </select>
      </div>
      <button type="button" class="btn btn-outline btn-xs" onclick="removeTravelLeg(${id})"
        style="border-color:var(--danger); color:var(--danger); white-space:nowrap;">âŒ à¸¥à¸šà¹€à¸ªà¹‰à¸™à¸—à¸²à¸‡à¸™à¸µà¹‰</button>
    </div>
    <div id="tleg-fields-${id}" style="min-height:40px; color:#94a3b8; font-size:0.85rem;">
      â† à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸à¸žà¸²à¸«à¸™à¸°à¸à¹ˆà¸­à¸™
    </div>
    <div style="text-align:right; margin-top:10px; font-weight:700; color:#0f766e; font-size:0.95rem;">
      à¸¢à¸­à¸”à¸¢à¹ˆà¸­à¸¢: <span id="tleg-sub-${id}">0.00</span> à¸šà¸²à¸—
      <input type="hidden" id="tleg-val-${id}" value="0">
    </div>
  `;
  container.appendChild(card);
  calcAllLegsTotal();
};

window.removeTravelLeg = (id) => {
  const el = document.getElementById(`tleg-${id}`);
  if (el) el.remove();
  calcAllLegsTotal();
};

window.onLegVehicleChange = (id) => {
  const select = document.querySelector(`#tleg-${id} .leg-vehicle-select`);
  if (!select) return;
  const type = select.value;
  const fieldsEl = document.getElementById(`tleg-fields-${id}`);
  if (!fieldsEl) return;

  // Group A: ticket-based (plane, train, bus)
  if (['plane','train','bus'].includes(type)) {
    const label = type === 'plane' ? 'à¸£à¸²à¸„à¸²à¸•à¸±à¹‹à¸§à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸šà¸´à¸™' : type === 'train' ? 'à¸£à¸²à¸„à¸²à¸•à¸±à¹‹à¸§à¸£à¸–à¹„à¸Ÿ' : 'à¸£à¸²à¸„à¸²à¸•à¸±à¹‹à¸§à¸£à¸–à¹‚à¸”à¸¢à¸ªà¸²à¸£';
    fieldsEl.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px;">
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸•à¹‰à¸™à¸—à¸²à¸‡</label>
          <input type="text" class="form-input form-input-sm leg-from" placeholder="à¹€à¸Šà¹ˆà¸™ à¸™à¹ˆà¸²à¸™"></div>
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸›à¸¥à¸²à¸¢à¸—à¸²à¸‡</label>
          <input type="text" class="form-input form-input-sm leg-to" placeholder="à¹€à¸Šà¹ˆà¸™ à¸à¸£à¸¸à¸‡à¹€à¸—à¸žà¸¯"></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px;">
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸§à¸±à¸™-à¹€à¸§à¸¥à¸²à¸­à¸­à¸ (à¹„à¸›)</label>
          <input type="datetime-local" class="form-input form-input-sm leg-depart"></div>
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">${label} à¸‚à¸²à¹„à¸› (à¸šà¸²à¸—)</label>
          <input type="number" class="form-input form-input-sm leg-price-go" placeholder="0" min="0" oninput="calcLegCost(${id})"></div>
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸§à¸±à¸™-à¹€à¸§à¸¥à¸²à¸à¸¥à¸±à¸š</label>
          <input type="datetime-local" class="form-input form-input-sm leg-return"></div>
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">${label} à¸‚à¸²à¸à¸¥à¸±à¸š (à¸šà¸²à¸—)</label>
          <input type="number" class="form-input form-input-sm leg-price-back" placeholder="0" min="0" oninput="calcLegCost(${id})"></div>
      </div>`;

  // Group B: fare/hire (taxi, van, boat, other)
  } else if (['taxi','van','boat','other_transport'].includes(type)) {
    const typeName = {taxi:'à¹à¸—à¹‡à¸à¸‹à¸µà¹ˆ/à¸£à¸–à¸£à¸±à¸šà¸ˆà¹‰à¸²à¸‡', van:'à¸£à¸–à¸•à¸¹à¹‰à¹‚à¸”à¸¢à¸ªà¸²à¸£', boat:'à¹€à¸£à¸·à¸­', other_transport:'à¸žà¸²à¸«à¸™à¸°à¸­à¸·à¹ˆà¸™à¹†'}[type];
    const isTaxi   = type === 'taxi';
    // Taxi gets 200 default; others start at 0
    const defaultAmt = isTaxi ? 200 : 0;
    fieldsEl.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px;">
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸•à¹‰à¸™à¸—à¸²à¸‡</label>
          <input type="text" class="form-input form-input-sm leg-from" placeholder="à¹€à¸Šà¹ˆà¸™ à¸ªà¸™à¸²à¸¡à¸šà¸´à¸™à¸ªà¸¸à¸§à¸£à¸£à¸“à¸ à¸¹à¸¡à¸´"></div>
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸›à¸¥à¸²à¸¢à¸—à¸²à¸‡</label>
          <input type="text" class="form-input form-input-sm leg-to" placeholder="à¹€à¸Šà¹ˆà¸™ à¹‚à¸£à¸‡à¹à¸£à¸¡ / à¸—à¸µà¹ˆà¸žà¸±à¸"></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr auto; gap:12px; align-items:end; margin-bottom:${isTaxi ? '8' : '0'}px;">
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸</label>
          <input type="text" class="form-input form-input-sm leg-note" id="tleg-note-${id}"
            placeholder="à¸£à¸°à¸šà¸¸à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”..."></div>
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸„à¹ˆà¸²à¹‚à¸”à¸¢à¸ªà¸²à¸£${typeName} (à¸šà¸²à¸—)</label>
          <input type="number" class="form-input form-input-sm leg-amount" value="${defaultAmt}"
            min="0" oninput="calcLegCost(${id})">
          ${isTaxi ? `<div style="font-size:0.73rem;color:#64748b;margin-top:3px;">à¸­à¸±à¸•à¸£à¸²à¹€à¸«à¸¡à¸²à¹€à¸—à¸µà¹ˆà¸¢à¸§à¸¥à¸° 200 à¸šà¸²à¸—</div>` : ''}
        </div>
      </div>
      ${isTaxi ? `
      <div style="display:flex; align-items:center; gap:8px; background:#fefce8; border:1px solid #fde68a; border-radius:6px; padding:8px 12px;">
        <input type="checkbox" id="tleg-luggage-${id}" onchange="onLuggageChange(${id})"
          style="width:16px;height:16px;cursor:pointer;accent-color:#f59e0b;">
        <label for="tleg-luggage-${id}" style="font-size:0.82rem;font-weight:600;color:#92400e;cursor:pointer;margin:0;">
          ðŸ§³ à¸¡à¸µà¸ªà¸±à¸¡à¸ à¸²à¸£à¸°à¹ƒà¸™à¸à¸²à¸£à¹€à¸”à¸´à¸™à¸—à¸²à¸‡
        </label>
        <span style="font-size:0.75rem;color:#b45309;">(à¸ˆà¸°à¸šà¸±à¸™à¸—à¸¶à¸à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸à¹ƒà¸«à¹‰à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´)</span>
      </div>` : ''}`;
    // Auto-calculate immediately for taxi
    if (isTaxi) calcLegCost(id);



  // Group C: gov_car â€” km calc OR advance loan
  } else if (type === 'gov_car') {
    fieldsEl.innerHTML = `
      <div style="display:flex; gap:0; margin-bottom:12px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; width:fit-content;">
        <button type="button" id="tleg-mbtn-calc-${id}" onclick="setLegMode(${id},'calc')"
          style="padding:6px 16px;font-size:0.8rem;font-weight:600;background:#3b82f6;color:#fff;border:none;cursor:pointer;">
          ðŸ“ à¸„à¸³à¸™à¸§à¸“à¸ˆà¸²à¸à¸£à¸°à¸¢à¸°à¸—à¸²à¸‡
        </button>
        <button type="button" id="tleg-mbtn-loan-${id}" onclick="setLegMode(${id},'loan')"
          style="padding:6px 16px;font-size:0.8rem;font-weight:600;background:#f1f5f9;color:#475569;border:none;cursor:pointer;border-left:1px solid #cbd5e1;">
          ðŸ’µ à¸£à¸°à¸šà¸¸à¸¢à¸­à¸”à¸¢à¸·à¸¡à¸¥à¹ˆà¸§à¸‡à¸«à¸™à¹‰à¸²
        </button>
      </div>
      <!-- calc sub-panel -->
      <div id="tleg-calc-${id}">
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:10px;">
          <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸•à¹‰à¸™à¸—à¸²à¸‡</label>
            <input type="text" class="form-input form-input-sm leg-from" placeholder="à¹€à¸Šà¹ˆà¸™ à¸™à¹ˆà¸²à¸™"></div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸›à¸¥à¸²à¸¢à¸—à¸²à¸‡</label>
            <input type="text" class="form-input form-input-sm leg-to" placeholder="à¹€à¸Šà¹ˆà¸™ à¹€à¸Šà¸µà¸¢à¸‡à¹ƒà¸«à¸¡à¹ˆ"></div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸£à¸°à¸¢à¸°à¸—à¸²à¸‡à¸£à¸§à¸¡ (à¸à¸¡.)</label>
            <input type="number" class="form-input form-input-sm leg-km" placeholder="0" min="0" oninput="calcLegCost(${id})"></div>
        </div>
        <div style="font-size:0.8rem;color:#64748b;">
          à¸­à¸±à¸•à¸£à¸² 4 à¸šà¸²à¸—/à¸à¸¡. &nbsp;
          <label><input type="checkbox" class="leg-roundtrip" checked onchange="calcLegCost(${id})"> à¸„à¸´à¸”à¹„à¸›-à¸à¸¥à¸±à¸š (Ã—2)</label>
        </div>
      </div>
      <!-- loan sub-panel -->
      <div id="tleg-loan-${id}" style="display:none;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px;">
          <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸•à¹‰à¸™à¸—à¸²à¸‡</label>
            <input type="text" class="form-input form-input-sm leg-from-loan" placeholder="à¹€à¸Šà¹ˆà¸™ à¸™à¹ˆà¸²à¸™"></div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸›à¸¥à¸²à¸¢à¸—à¸²à¸‡</label>
            <input type="text" class="form-input form-input-sm leg-to-loan" placeholder="à¹€à¸Šà¹ˆà¸™ à¹€à¸Šà¸µà¸¢à¸‡à¹ƒà¸«à¸¡à¹ˆ"></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸ / à¸§à¸±à¸•à¸–à¸¸à¸›à¸£à¸°à¸ªà¸‡à¸„à¹Œ</label>
            <input type="text" class="form-input form-input-sm leg-note-loan" placeholder="à¹€à¸Šà¹ˆà¸™ à¸„à¹ˆà¸²à¸™à¹‰à¸³à¸¡à¸±à¸™à¹€à¸Šà¸·à¹‰à¸­à¹€à¸žà¸¥à¸´à¸‡à¸£à¸–à¸§à¸´à¸—à¸¢à¸²à¸¥à¸±à¸¢"></div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸¢à¸­à¸”à¸¢à¸·à¸¡à¸¥à¹ˆà¸§à¸‡à¸«à¸™à¹‰à¸² (à¸šà¸²à¸—)</label>
            <input type="number" class="form-input form-input-sm leg-loan-amount" placeholder="0" min="0" oninput="calcLegCost(${id})"></div>
        </div>
      </div>`;

  // Group D: personal_car â€” km calc only
  } else if (type === 'personal_car') {
    fieldsEl.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:10px;">
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸•à¹‰à¸™à¸—à¸²à¸‡</label>
          <input type="text" class="form-input form-input-sm leg-from" placeholder="à¹€à¸Šà¹ˆà¸™ à¸™à¹ˆà¸²à¸™"></div>
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸›à¸¥à¸²à¸¢à¸—à¸²à¸‡</label>
          <input type="text" class="form-input form-input-sm leg-to" placeholder="à¹€à¸Šà¹ˆà¸™ à¹€à¸Šà¸µà¸¢à¸‡à¹ƒà¸«à¸¡à¹ˆ"></div>
        <div><label style="font-size:0.78rem;font-weight:600;color:#64748b;">à¸£à¸°à¸¢à¸°à¸—à¸²à¸‡à¸£à¸§à¸¡ (à¸à¸¡.)</label>
          <input type="number" class="form-input form-input-sm leg-km" placeholder="0" min="0" oninput="calcLegCost(${id})"></div>
      </div>
      <div style="font-size:0.8rem;color:#64748b;">
        à¸­à¸±à¸•à¸£à¸² 4 à¸šà¸²à¸—/à¸à¸¡. &nbsp;
        <label><input type="checkbox" class="leg-roundtrip" checked onchange="calcLegCost(${id})"> à¸„à¸´à¸”à¹„à¸›-à¸à¸¥à¸±à¸š (Ã—2)</label>
      </div>`;

  } else {
    fieldsEl.innerHTML = '<span style="color:#94a3b8;font-size:0.85rem;">â† à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸à¸žà¸²à¸«à¸™à¸°à¸à¹ˆà¸­à¸™</span>';
  }

  calcLegCost(id);
};

// Toggle mode for gov_car leg: 'calc' or 'loan'
window.setLegMode = (id, mode) => {
  const calcEl  = document.getElementById(`tleg-calc-${id}`);
  const loanEl  = document.getElementById(`tleg-loan-${id}`);
  const btnCalc = document.getElementById(`tleg-mbtn-calc-${id}`);
  const btnLoan = document.getElementById(`tleg-mbtn-loan-${id}`);
  if (!calcEl || !loanEl) return;
  if (mode === 'calc') {
    calcEl.style.display = 'block'; loanEl.style.display = 'none';
    if (btnCalc) { btnCalc.style.background='#3b82f6'; btnCalc.style.color='#fff'; }
    if (btnLoan) { btnLoan.style.background='#f1f5f9'; btnLoan.style.color='#475569'; }
  } else {
    calcEl.style.display = 'none'; loanEl.style.display = 'block';
    if (btnLoan) { btnLoan.style.background='#3b82f6'; btnLoan.style.color='#fff'; }
    if (btnCalc) { btnCalc.style.background='#f1f5f9'; btnCalc.style.color='#475569'; }
  }
  calcLegCost(id);
};

window.calcLegCost = (id) => {
  const card   = document.getElementById(`tleg-${id}`);
  const valEl  = document.getElementById(`tleg-val-${id}`);
  const subTxt = document.getElementById(`tleg-sub-${id}`);
  if (!card || !valEl) return;

  const select = card.querySelector('.leg-vehicle-select');
  const type   = select ? select.value : '';
  let total    = 0;

  if (['plane','train','bus'].includes(type)) {
    const go   = parseFloat(card.querySelector('.leg-price-go')?.value)   || 0;
    const back = parseFloat(card.querySelector('.leg-price-back')?.value)  || 0;
    total = go + back;
  } else if (['taxi','van','boat','other_transport'].includes(type)) {
    total = parseFloat(card.querySelector('.leg-amount')?.value) || 0;
  } else if (type === 'gov_car') {
    const calcPanel = document.getElementById(`tleg-calc-${id}`);
    if (calcPanel && calcPanel.style.display !== 'none') {
      const km       = parseFloat(card.querySelector('.leg-km')?.value) || 0;
      const rt       = card.querySelector('.leg-roundtrip')?.checked;
      total          = km * 4 * (rt ? 2 : 1);
    } else {
      total = parseFloat(card.querySelector('.leg-loan-amount')?.value) || 0;
    }
  } else if (type === 'personal_car') {
    const km  = parseFloat(card.querySelector('.leg-km')?.value) || 0;
    const rt  = card.querySelector('.leg-roundtrip')?.checked;
    total     = km * 4 * (rt ? 2 : 1);
  }

  valEl.value = total;
  if (subTxt) subTxt.textContent = total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  calcAllLegsTotal();
};

// Handle luggage checkbox for taxi: auto-append/remove note
window.onLuggageChange = (id) => {
  const checkbox = document.getElementById(`tleg-luggage-${id}`);
  const noteInput = document.getElementById(`tleg-note-${id}`);
  if (!checkbox || !noteInput) return;
  const LUGGAGE_TAG = 'à¸¡à¸µà¸ªà¸±à¸¡à¸ à¸²à¸£à¸°à¹ƒà¸™à¸à¸²à¸£à¹€à¸”à¸´à¸™à¸—à¸²à¸‡';
  if (checkbox.checked) {
    // Append tag if not already present
    const current = noteInput.value.trim();
    if (!current.includes(LUGGAGE_TAG)) {
      noteInput.value = current ? `${current}, ${LUGGAGE_TAG}` : LUGGAGE_TAG;
    }
  } else {
    // Remove tag
    noteInput.value = noteInput.value.replace(`, ${LUGGAGE_TAG}`, '').replace(LUGGAGE_TAG, '').trim().replace(/^,\s*/, '');
  }
};

window.calcAllLegsTotal = () => {

  let grand = 0;
  document.querySelectorAll('[id^="tleg-val-"]').forEach(el => {
    grand += parseFloat(el.value) || 0;
  });
  const grandTxt = document.getElementById('travel-legs-grand-txt');
  const grandHid = document.getElementById('travel-legs-grand');
  if (grandTxt) grandTxt.textContent = grand.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (grandHid) grandHid.value = grand;
  calculateExpenses();
};

// Legacy stubs (kept for any old references)
window.addRouteRow = () => {};
window.removeRouteRow = () => {};
window.addTicketLeg = () => {};
window.removeTicketLeg = () => {};
window.calcTicketTotal = () => {};
window.onVehicleTypeChange = () => {};
window.calcDistanceCost = () => {};
window.setVehicleMode = () => {};
let _vehicleMode = 'calc';
let ticketLegCounter = 0;


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

// ============================================================
// PER-DAY ALLOWANCE SYSTEM
// ============================================================
let _allowanceDayCounter = 0;

// Preset rate labels
const ALLOW_RATE_OPTIONS = `
  <option value="240">à¹€à¸•à¹‡à¸¡ (100%) â€” 240 à¸šà¸²à¸—/à¸§à¸±à¸™</option>
  <option value="160">2/3 â€” 160 à¸šà¸²à¸—/à¸§à¸±à¸™</option>
  <option value="80">1/3 â€” 80 à¸šà¸²à¸—/à¸§à¸±à¸™</option>
  <option value="custom">à¸à¸³à¸«à¸™à¸”à¹€à¸­à¸‡</option>
`;

window.addAllowanceDay = (defaultRate = 240, defaultDate = '') => {
  const container = document.getElementById('allowance-days-container');
  if (!container) return;
  const id = ++_allowanceDayCounter;

  const row = document.createElement('div');
  row.id = `aday-${id}`;
  row.style.cssText = 'display:grid; grid-template-columns:150px 1fr 80px 90px 32px; gap:8px; align-items:center; background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:6px 8px;';
  const isCustom = ![240, 160, 80].includes(defaultRate);
  const selectedRate = isCustom ? 'custom' : defaultRate;
  row.innerHTML = `
    <input type="date" class="form-input form-input-sm aday-date" value="${defaultDate}"
      style="font-size:0.78rem; padding:4px 6px;">
    <select class="form-input form-input-sm aday-rate-select" style="font-size:0.78rem; padding:4px 6px;"
      onchange="onAllowanceRateChange(${id})">
      ${ALLOW_RATE_OPTIONS}
    </select>
    <input type="number" class="form-input form-input-sm aday-rate-val" value="${defaultRate}"
      min="0" style="font-size:0.78rem; padding:4px 6px; text-align:center;"
      ${isCustom ? '' : 'readonly'} oninput="calcAllAllowanceDays()">
    <span id="aday-sub-${id}" style="text-align:right; font-weight:600; color:#0f766e; font-size:0.82rem;">0.00</span>
    <button type="button" onclick="removeAllowanceDay(${id})"
      style="background:none; border:none; color:#ef4444; font-size:1rem; cursor:pointer; padding:0; line-height:1;">âœ•</button>
  `;
  container.appendChild(row);

  // Set select to correct value
  const sel = row.querySelector('.aday-rate-select');
  sel.value = String(selectedRate);

  calcAllAllowanceDays();
};

window.removeAllowanceDay = (id) => {
  const el = document.getElementById(`aday-${id}`);
  if (el) el.remove();
  calcAllAllowanceDays();
};

window.onAllowanceRateChange = (id) => {
  const row   = document.getElementById(`aday-${id}`);
  if (!row) return;
  const sel   = row.querySelector('.aday-rate-select');
  const input = row.querySelector('.aday-rate-val');
  if (sel.value === 'custom') {
    input.removeAttribute('readonly');
    input.value = '';
    input.focus();
  } else {
    input.setAttribute('readonly', true);
    input.value = sel.value;
  }
  calcAllAllowanceDays();
};

window.calcAllAllowanceDays = () => {
  const people = parseFloat(document.getElementById('travel-people-allowance')?.value) || 1;
  let grand = 0;
  document.querySelectorAll('[id^="aday-"]').forEach(row => {
    if (!row.id.startsWith('aday-') || row.id.includes('sub')) return;
    const rateVal = parseFloat(row.querySelector('.aday-rate-val')?.value) || 0;
    const sub     = rateVal * people;
    grand        += sub;
    const subEl   = row.querySelector('[id^="aday-sub-"]');
    if (subEl) subEl.textContent = sub.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
  const txt = document.getElementById('travel-total-allowance-txt');
  if (txt) txt.textContent = grand.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  calculateExpenses();
};

// Quick-fill: set all rows to the given rate
window.fillAllowanceRate = (rate) => {
  document.querySelectorAll('[id^="aday-"]').forEach(row => {
    if (!row.id.startsWith('aday-') || row.id.includes('sub')) return;
    const sel   = row.querySelector('.aday-rate-select');
    const input = row.querySelector('.aday-rate-val');
    if (sel) sel.value = String(rate);
    if (input) { input.value = rate; input.setAttribute('readonly', true); }
  });
  calcAllAllowanceDays();
};

// Calculate expenses

window.calculateExpenses = () => {
  // 1. Vehicle costs from multi-leg system
  const routeTotal = parseFloat(document.getElementById('travel-legs-grand')?.value) || 0;

  // 2. Allowance â€” read from per-day table total
  const totalAllow = parseFloat(
    document.getElementById('travel-total-allowance-txt')?.textContent?.replace(/,/g, '')
  ) || 0;

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
  if (num === 0) return 'à¸¨à¸¹à¸™à¸¢à¹Œà¸šà¸²à¸—à¸–à¹‰à¸§à¸™';
  const textNum = ['à¸¨à¸¹à¸™à¸¢à¹Œ', 'à¸«à¸™à¸¶à¹ˆà¸‡', 'à¸ªà¸­à¸‡', 'à¸ªà¸²à¸¡', 'à¸ªà¸µà¹ˆ', 'à¸«à¹‰à¸²', 'à¸«à¸', 'à¹€à¸ˆà¹‡à¸”', 'à¹à¸›à¸”', 'à¹€à¸à¹‰à¸²', 'à¸ªà¸´à¸š'];
  const textPosition = ['', 'à¸ªà¸´à¸š', 'à¸£à¹‰à¸­à¸¢', 'à¸žà¸±à¸™', 'à¸«à¸¡à¸·à¹ˆà¸™', 'à¹à¸ªà¸™', 'à¸¥à¹‰à¸²à¸™'];
  
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
        resText += 'à¹€à¸­à¹‡à¸”';
      } else if (pos === 1 && digit === 1) {
        resText += 'à¸ªà¸´à¸š';
      } else if (pos === 1 && digit === 2) {
        resText += 'à¸¢à¸µà¹ˆà¸ªà¸´à¸š';
      } else {
        resText += textNum[digit] + textPosition[pos];
      }
    }
  }
  
  if (resText !== '') resText += 'à¸šà¸²à¸—';
  
  // Process decimal part
  if (parseInt(decimalPart) === 0) {
    resText += 'à¸–à¹‰à¸§à¸™';
  } else {
    let decLen = decimalPart.length;
    for (let i = 0; i < decLen; i++) {
      let digit = parseInt(decimalPart.charAt(i));
      let pos = decLen - 1 - i;
      if (digit !== 0) {
        if (pos === 0 && digit === 1 && decLen > 1) {
          resText += 'à¹€à¸­à¹‡à¸”';
        } else if (pos === 1 && digit === 1) {
          resText += 'à¸ªà¸´à¸š';
        } else if (pos === 1 && digit === 2) {
          resText += 'à¸¢à¸µà¹ˆà¸ªà¸´à¸š';
        } else {
          resText += textNum[digit] + textPosition[pos];
        }
      }
    }
    resText += 'à¸ªà¸•à¸²à¸‡à¸„à¹Œ';
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

  // Reset multi-leg vehicle container
  const legsContainer = document.getElementById('travel-legs-container');
  if (legsContainer) legsContainer.innerHTML = '';
  _travelLegCounter = 0;
  const grandHid = document.getElementById('travel-legs-grand');
  const grandTxt = document.getElementById('travel-legs-grand-txt');
  if (grandHid) grandHid.value = '0';
  if (grandTxt) grandTxt.textContent = '0.00';

  // Add first leg by default
  addTravelLeg();

  // Reset allowance days container
  const adaysContainer = document.getElementById('allowance-days-container');
  if (adaysContainer) adaysContainer.innerHTML = '';
  _allowanceDayCounter = 0;
  const allowTxt = document.getElementById('travel-total-allowance-txt');
  if (allowTxt) allowTxt.textContent = '0.00';
  // Add one default day
  addAllowanceDay(240, '');

  // Reset tabs
  switchTravelTab('travel-tab-memo');
  
  await loadTravelHistory();
}

async function loadTravelHistory() {
  const listTitle = document.getElementById('travel-list-title');
  if (!listTitle) return;
  
  if (currentUser.role === 'admin') {
    listTitle.textContent = 'ðŸ“‹ à¸£à¸²à¸¢à¸à¸²à¸£à¸„à¸³à¸‚à¸­à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” (à¹à¸­à¸”à¸¡à¸´à¸™)';
  } else {
    listTitle.textContent = 'ðŸ“‹ à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£à¸‚à¸­à¸‡à¸„à¸¸à¸“';
  }
  
  try {
    const url = currentUser.role === 'admin' 
      ? `${API_BASE_URL}/api/travel`
      : `${API_BASE_URL}/api/travel?userId=${currentUser.userId}`;
      
    const res = await safeFetch(url);
    const travels = await res.json();
    
    const tbody = document.getElementById('travel-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (travels.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:16px; color:var(--neutral-400);">à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£à¸„à¸³à¸‚à¸­à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£</td></tr>`;
      return;
    }
    
    travels.forEach(t => {
      let actionHtml = '-';
      if (currentUser.role === 'admin' && t.status === 'à¸£à¸­à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´') {
        actionHtml = `
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="approveTravel('${t.travelId}', 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´')" style="padding:4px 8px; font-size:11px;">à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´</button>
            <button class="btn btn-danger btn-sm" onclick="approveTravel('${t.travelId}', 'à¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸¡à¸±à¸•à¸´')" style="padding:4px 8px; font-size:11px; background:#ef4444; border-color:#ef4444; color:white;">à¸›à¸à¸´à¹€à¸ªà¸˜</button>
          </div>
        `;
      }
      
      const budgetText = parseFloat(t.budget) > 0 ? ` (à¸‡à¸š ${parseFloat(t.budget).toLocaleString()} à¸š.)` : '';
      
      tbody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight:600; color:var(--neutral-800);">${t.subject}</div>
            <div style="font-size:11px; color:var(--neutral-500);">ðŸ“ ${t.destination}${budgetText}</div>
            ${currentUser.role === 'admin' ? `<div style="font-size:11px; color:#0369a1; font-weight:500;">à¸œà¸¹à¹‰à¸‚à¸­: ${t.fullName}</div>` : ''}
          </td>
          <td>
            <div style="font-weight:500;">${formatDate(t.startDate)}</div>
            <div style="font-size:11px; color:var(--neutral-500);">à¸–à¸¶à¸‡ ${formatDate(t.endDate)}</div>
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
  const confirmText = status === 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´' ? 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸„à¸³à¸‚à¸­à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£à¸™à¸µà¹‰?' : 'à¸›à¸à¸´à¹€à¸ªà¸˜à¸„à¸³à¸‚à¸­à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£à¸™à¸µà¹‰?';
  const result = await Swal.fire({
    title: 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£',
    text: confirmText,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'à¸¢à¸·à¸™à¸¢à¸±à¸™',
    cancelButtonText: 'à¸¢à¸à¹€à¸¥à¸´à¸'
  });
  
  if (result.isConfirmed) {
    showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥...');
    try {
      const res = await safeFetch(`${API_BASE_URL}/api/travel/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travelId, status })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', data.message, 'success');
        loadTravelHistory();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
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
    Swal.fire('à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”', 'à¸§à¸±à¸™à¸—à¸µà¹ˆà¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸•à¹‰à¸­à¸‡à¹„à¸¡à¹ˆà¸¡à¸²à¸à¸à¸§à¹ˆà¸²à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”', 'error');
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

  // Collect vehicle transport data from multi-leg system
  const routes = [];
  const vehicleLegs = [];
  document.querySelectorAll('#travel-legs-container > div[id^="tleg-"]').forEach(card => {
    const legId  = card.id.replace('tleg-', '');
    const select = card.querySelector('.leg-vehicle-select');
    const type   = select ? select.value : '';
    const cost   = parseFloat(document.getElementById(`tleg-val-${legId}`)?.value) || 0;
    const legData = { type, cost };

    if (['plane','train','bus'].includes(type)) {
      legData.from          = card.querySelector('.leg-from')?.value || '';
      legData.to            = card.querySelector('.leg-to')?.value   || '';
      legData.departDatetime= card.querySelector('.leg-depart')?.value || '';
      legData.returnDatetime= card.querySelector('.leg-return')?.value || '';
      legData.priceGo       = parseFloat(card.querySelector('.leg-price-go')?.value)   || 0;
      legData.priceBack     = parseFloat(card.querySelector('.leg-price-back')?.value)  || 0;
    } else if (['taxi','van','boat','other_transport'].includes(type)) {
      legData.from = card.querySelector('.leg-from')?.value || '';
      legData.to   = card.querySelector('.leg-to')?.value   || '';
      legData.note = card.querySelector('.leg-note')?.value || '';
    } else if (type === 'gov_car') {
      const calcPanel = document.getElementById(`tleg-calc-${legId}`);
      if (calcPanel && calcPanel.style.display !== 'none') {
        legData.mode      = 'calc';
        legData.from      = card.querySelector('.leg-from')?.value || '';
        legData.to        = card.querySelector('.leg-to')?.value   || '';
        legData.km        = parseFloat(card.querySelector('.leg-km')?.value) || 0;
        legData.roundtrip = card.querySelector('.leg-roundtrip')?.checked;
      } else {
        legData.mode       = 'loan';
        legData.from       = card.querySelector('.leg-from-loan')?.value || '';
        legData.to         = card.querySelector('.leg-to-loan')?.value   || '';
        legData.note       = card.querySelector('.leg-note-loan')?.value || '';
        legData.loanAmount = parseFloat(card.querySelector('.leg-loan-amount')?.value) || 0;
      }
    } else if (type === 'personal_car') {
      legData.from      = card.querySelector('.leg-from')?.value || '';
      legData.to        = card.querySelector('.leg-to')?.value   || '';
      legData.km        = parseFloat(card.querySelector('.leg-km')?.value) || 0;
      legData.roundtrip = card.querySelector('.leg-roundtrip')?.checked;
    }

    vehicleLegs.push(legData);
    if (legData.from || legData.to) {
      routes.push({ from: legData.from || '', to: legData.to || '', vehicle: type, cost });
    }
  });
  const vehicleData = {
    legs: vehicleLegs,
    routeTotal: parseFloat(document.getElementById('travel-legs-grand')?.value) || 0
  };

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
  
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/travel`, {
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
      Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
      initTravelPage();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
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
  select.innerHTML = '<option value="">-- à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸à¸£à¸²à¸¢à¸à¸²à¸£ --</option>';
  
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/travel?userId=${currentUser.userId}`);
    const travels = await res.json();
    approvedTravelsList = travels.filter(t => t.status === 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´');
    
    if (approvedTravelsList.length === 0) {
      select.innerHTML = '<option value="">-- à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¹€à¸”à¸´à¸™à¸—à¸²à¸‡à¸—à¸µà¹ˆà¸­à¸™à¸¸à¸¡à¸±à¸•à¸´ --</option>';
      return;
    }
    
    approvedTravelsList.forEach(t => {
      const option = document.createElement('option');
      option.value = t.travelId;
      option.textContent = `${t.subject} à¸“ ${t.destination} (${formatDate(t.startDate)} - ${formatDate(t.endDate)})`;
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
        <button type="button" onclick="removeReportPhoto(${index})" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.9); color:white; border:none; border-radius:50%; width:22px; height:22px; font-size:10px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-sm);">âœ•</button>
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
      <button type="button" onclick="removeReportPhoto(${idx})" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.9); color:white; border:none; border-radius:50%; width:22px; height:22px; font-size:10px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-sm);">âœ•</button>
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
  let contractNo = 'à¸šà¸Š. / [à¹€à¸§à¹‰à¸™à¸§à¹ˆà¸²à¸‡]';
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
  addTravelerClearanceRow(reporterName, 'à¸œà¸¹à¹‰à¸£à¸²à¸¢à¸‡à¸²à¸™');
  
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
    diffText.textContent = `à¸ˆà¹ˆà¸²à¸¢à¸ªà¸¡à¸—à¸šà¹€à¸žà¸´à¹ˆà¸¡: ${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })} à¸šà¸²à¸—`;
  } else if (diff < 0) {
    diffText.style.color = '#f59e0b';
    diffText.textContent = `à¹€à¸‡à¸´à¸™à¹€à¸«à¸¥à¸·à¸­à¸ªà¹ˆà¸‡à¸„à¸·à¸™: ${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2 })} à¸šà¸²à¸—`;
  } else {
    diffText.style.color = '#0d9488';
    diffText.textContent = `à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¸žà¸­à¸”à¸µ`;
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
  
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¹à¸¥à¸°à¸¢à¸·à¹ˆà¸™à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/travel-clearance`, {
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
      Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', data.message, 'success');
      hideClearanceModal();
      initTravelReportPage();
      
      // Auto-trigger printing of the clearance forms
      printClearance(reportId);
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
  }
};

window.approveClearance = async (clearanceId, status) => {
  const confirmText = status === 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹à¸¥à¹‰à¸§' ? 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸à¸²à¸£à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™à¸¢à¸·à¸¡à¸£à¸²à¸¢à¸à¸²à¸£à¸™à¸µà¹‰?' : 'à¸›à¸à¸´à¹€à¸ªà¸˜à¸à¸²à¸£à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™à¸¢à¸·à¸¡à¸£à¸²à¸¢à¸à¸²à¸£à¸™à¸µà¹‰?';
  const result = await Swal.fire({
    title: 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£',
    text: confirmText,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'à¸¢à¸·à¸™à¸¢à¸±à¸™',
    cancelButtonText: 'à¸¢à¸à¹€à¸¥à¸´à¸'
  });
  
  if (result.isConfirmed) {
    showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥...');
    try {
      const res = await safeFetch(`${API_BASE_URL}/api/travel-clearance/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearanceId, status })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', data.message, 'success');
        initTravelReportPage();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
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
    const clRes = await safeFetch(clearanceUrl);
    clearancesList = await clRes.json();
    
    const clMap = {};
    clearancesList.forEach(cl => {
      clMap[cl.reportId] = cl;
    });

    const url = currentUser.role === 'admin'
      ? `${API_BASE_URL}/api/travel-report`
      : `${API_BASE_URL}/api/travel-report?userId=${currentUser.userId}`;
      
    const res = await safeFetch(url);
    reportsHistoryList = await res.json();
    
    const tbody = document.getElementById('travel-report-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (reportsHistoryList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:16px; color:var(--neutral-400);">à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸£à¸²à¸¢à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£</td></tr>`;
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
              <button type="button" class="btn btn-primary btn-xs" onclick="openClearanceModal('${r.reportId}', '${r.travelId}', ${originalBudget})" style="background:#0d9488; border-color:#0d9488; display:inline-flex; align-items:center; gap:4px; padding:3px 8px;">ðŸ’° à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™à¸¢à¸·à¸¡</button>
            </div>
          `;
        } else if (cl.status === 'à¸£à¸­à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š') {
          if (currentUser.role === 'admin') {
            budgetActionHtml = `
              <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px; align-items:center;">
                <span class="badge" style="background:#f59e0b; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">â³ à¸£à¸­à¸•à¸£à¸§à¸ˆà¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™</span>
                <div style="display:flex; gap:4px;">
                  <button type="button" class="btn btn-primary btn-xs" onclick="approveClearance('${cl.clearanceId}', 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹à¸¥à¹‰à¸§')" style="background:#10b981; border-color:#10b981; padding:2px 4px; font-size:10px;">à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´</button>
                  <button type="button" class="btn btn-danger btn-xs" onclick="approveClearance('${cl.clearanceId}', 'à¸›à¸à¸´à¹€à¸ªà¸˜')" style="background:#ef4444; border-color:#ef4444; color:white; padding:2px 4px; font-size:10px;">à¸›à¸à¸´à¹€à¸ªà¸˜</button>
                </div>
                <button type="button" class="btn btn-outline btn-xs" onclick="printClearance('${r.reportId}')" style="padding:2px 4px; font-size:10px;">ðŸ–¨ï¸ à¹ƒà¸šà¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™</button>
              </div>
            `;
          } else {
            budgetActionHtml = `
              <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px; align-items:center;">
                <span class="badge" style="background:#f59e0b; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">â³ à¸£à¸­à¸•à¸£à¸§à¸ˆà¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™</span>
                <button type="button" class="btn btn-outline btn-xs" onclick="printClearance('${r.reportId}')" style="padding:3px 6px; font-size:10px;">ðŸ–¨ï¸ à¹ƒà¸šà¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™</button>
              </div>
            `;
          }
        } else if (cl.status === 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹à¸¥à¹‰à¸§') {
          budgetActionHtml = `
            <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px; align-items:center;">
              <span class="badge" style="background:#10b981; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">âœ… à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ</span>
              <button type="button" class="btn btn-outline btn-xs" onclick="printClearance('${r.reportId}')" style="padding:3px 6px; font-size:10px;">ðŸ–¨ï¸ à¹ƒà¸šà¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹€à¸‡à¸´à¸™</button>
            </div>
          `;
        } else if (cl.status === 'à¸›à¸à¸´à¹€à¸ªà¸˜') {
          budgetActionHtml = `
            <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px; align-items:center;">
              <span class="badge" style="background:#ef4444; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">âŒ à¸›à¸à¸´à¹€à¸ªà¸˜à¸à¸²à¸£à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œ</span>
              <button type="button" class="btn btn-primary btn-xs" onclick="openClearanceModal('${r.reportId}', '${r.travelId}', ${originalBudget})" style="background:#0d9488; border-color:#0d9488; display:inline-flex; align-items:center; gap:4px; padding:3px 8px;">ðŸ’° à¹€à¸„à¸¥à¸µà¸¢à¸£à¹Œà¹ƒà¸«à¸¡à¹ˆ</button>
            </div>
          `;
        }
      }

      tbody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight:600; color:var(--neutral-800);">${r.subject}</div>
            <div style="font-size:11px; color:var(--neutral-500);">ðŸ“ ${r.destination} (${formatDate(r.startDate)} - ${formatDate(r.endDate)})</div>
            ${currentUser.role === 'admin' ? `<div style="font-size:11px; color:#0369a1; font-weight:500;">à¸œà¸¹à¹‰à¹€à¸‚à¸µà¸¢à¸™: ${r.fullName}</div>` : ''}
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
              <button type="button" class="btn btn-outline btn-xs" onclick="printTravelReport('${r.reportId}')" style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px;">ðŸ–¨ï¸ à¸žà¸´à¸¡à¸žà¹Œà¸£à¸²à¸¢à¸‡à¸²à¸™</button>
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
    Swal.fire('à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”', 'à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸à¸£à¸²à¸¢à¸à¸²à¸£à¸—à¸µà¹ˆà¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£', 'error');
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
  
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸£à¸²à¸¢à¸‡à¸²à¸™...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/travel-report`, {
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
      Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸ªà¹ˆà¸‡à¸£à¸²à¸¢à¸‡à¸²à¸™à¸œà¸¥à¹„à¸›à¸£à¸²à¸Šà¸à¸²à¸£à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
      initTravelReportPage();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
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
      
    const res = await safeFetch(url);
    const trainings = await res.json();
    
    const tbody = document.getElementById('training-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let totalHours = 0;
    
    if (trainings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="padding:16px; color:var(--neutral-400);">à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸šà¸±à¸™à¸—à¸¶à¸à¸­à¸šà¸£à¸¡</td></tr>`;
      const hrsEl = document.getElementById('training-total-hours');
      if (hrsEl) hrsEl.textContent = `à¸Šà¸±à¹ˆà¸§à¹‚à¸¡à¸‡à¸ªà¸°à¸ªà¸¡: 0 à¸Šà¸¡.`;
      return;
    }
    
    trainings.forEach(t => {
      const hrs = parseFloat(t.hours) || 0;
      totalHours += hrs;
      
      tbody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight:600; color:var(--neutral-800);">${t.courseName}</div>
            <div style="font-size:11px; color:var(--neutral-500);">ðŸ¢ à¸ˆà¸±à¸”à¹‚à¸”à¸¢: ${t.organizer} | ðŸ“ ${t.location}</div>
            ${currentUser.role === 'admin' ? `<div style="font-size:11px; color:#4f46e5; font-weight:500;">à¸œà¸¹à¹‰à¸šà¸±à¸™à¸—à¸¶à¸: ${t.fullName}</div>` : ''}
          </td>
          <td>
            <div style="font-size:12px; font-weight:500;">${formatDate(t.startDate)}</div>
            <div style="font-size:11px; color:var(--neutral-500);">à¸–à¸¶à¸‡ ${formatDate(t.endDate)}</div>
          </td>
          <td style="text-align:center; font-weight:bold; color:#4f46e5;">${hrs} à¸Šà¸¡.</td>
        </tr>
      `;
    });
    
    const hrsEl = document.getElementById('training-total-hours');
    if (hrsEl) hrsEl.textContent = `à¸Šà¸±à¹ˆà¸§à¹‚à¸¡à¸‡à¸ªà¸°à¸ªà¸¡: ${totalHours} à¸Šà¸¡.`;
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
    Swal.fire('à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”', 'à¸Šà¸±à¹ˆà¸§à¹‚à¸¡à¸‡à¸­à¸šà¸£à¸¡à¸•à¹‰à¸­à¸‡à¸¡à¸²à¸à¸à¸§à¹ˆà¸² 0', 'error');
    return;
  }
  
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸­à¸šà¸£à¸¡...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/training`, {
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
      Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸šà¸±à¸™à¸—à¸¶à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸­à¸šà¸£à¸¡à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
      initTrainingPage();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
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
    const res = await safeFetch(`${API_BASE_URL}/api/activities?userId=${currentUser.userId}`);
    const acts = await res.json();
    
    const board = document.getElementById('activities-board-container');
    if (!board) return;
    board.innerHTML = '';
    
    if (acts.length === 0) {
      board.innerHTML = `<div style="text-align:center; padding:32px; color:var(--neutral-400);">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸à¸²à¸¨à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¹ƒà¸” à¹† à¹ƒà¸™à¸£à¸°à¸šà¸š</div>`;
      return;
    }
    
    acts.forEach(act => {
      let regButtonHtml = '';
      if (act.isRegistered) {
        regButtonHtml = `<span style="background:#e6f4ea; color:#137333; padding:6px 16px; border-radius:99px; font-size:0.85rem; font-weight:700; border:1px solid #137333;">âœ“ à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡à¹à¸¥à¹‰à¸§</span>`;
      } else {
        regButtonHtml = `<button class="btn btn-primary btn-sm" onclick="registerActivity('${act.activityId}')" style="padding:6px 16px; font-size:0.85rem;">ðŸ™‹ à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡</button>`;
      }
      
      let viewParticipantsHtml = `<button class="btn btn-outline btn-sm" onclick="viewParticipants('${act.activityId}', '${act.activityName}')" style="padding:6px 12px; font-size:0.8rem; border-radius:99px;">ðŸ‘¥ à¸”à¸¹à¸œà¸¹à¹‰à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡</button>`;
      
      board.innerHTML += `
        <div class="glass-card" style="border-left: 6px solid #0d9488; padding:16px 20px; display:flex; flex-direction:column; gap:12px; transition: var(--transition); border-top:none; border-right:none; border-bottom:none; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:8px;">
            <div>
              <h4 style="font-size:1.05rem; font-weight:700; color:var(--neutral-800); margin:0;">${act.activityName}</h4>
              <p style="font-size:0.85rem; color:var(--neutral-500); margin:4px 0 0 0;">ðŸ“… ${formatDate(act.activityDate)} | ðŸ“ ${act.location}</p>
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
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/activities/register`, {
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
      Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸§à¸´à¸—à¸¢à¸²à¸¥à¸±à¸¢à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
      loadActivitiesBoard();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
  }
}

async function viewParticipants(activityId, activityName) {
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸”à¸¶à¸‡à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/activities/participants/${activityId}`);
    const participants = await res.json();
    
    const titleEl = document.getElementById('participants-modal-title');
    const tbody = document.getElementById('participants-table-body');
    
    if (titleEl) titleEl.textContent = `à¸œà¸¹à¹‰à¸£à¹ˆà¸§à¸¡à¸‡à¸²à¸™: ${activityName}`;
    if (tbody) {
      tbody.innerHTML = '';
      if (participants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="padding:16px; color:var(--neutral-400);">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸œà¸¹à¹‰à¸¥à¸‡à¸Šà¸·à¹ˆà¸­à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡</td></tr>`;
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
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
  }
}

async function handleActivityCreate(e) {
  e.preventDefault();
  const activityName = document.getElementById('act-name').value;
  const activityDate = document.getElementById('act-date').value;
  const location = document.getElementById('act-location').value;
  
  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¸à¸´à¸ˆà¸à¸£à¸£à¸¡...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityName, activityDate, location })
    });
    
    const data = await res.json();
    if (data.success) {
      Swal.fire('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', 'à¸›à¸£à¸°à¸à¸²à¸¨à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¹ƒà¸«à¸¡à¹ˆà¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
      initActivityPage();
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
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
    opt.textContent = `à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“ ${yr}`;
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
    opt.textContent = `à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“ ${yr}`;
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
      opt.textContent = `à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“ ${yr}`;
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
    tbody.innerHTML = `<tr><td colspan="2" class="text-center" style="color:var(--neutral-400); padding:16px;">à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“ à¸à¸£à¸¸à¸“à¸²à¹€à¸žà¸´à¹ˆà¸¡à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“</td></tr>`;
    return;
  }

  years.forEach(yr => {
    tbody.innerHTML += `
      <tr>
        <td style="font-weight: 600; padding: 12px 16px;">à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“ ${yr}</td>
        <td style="text-align: center; padding: 12px 16px;">
          <button class="btn btn-outline" style="border-color: #ef4444; color: #ef4444; padding: 4px 8px; font-size: 0.8rem; margin: 0;" onclick="removeFiscalYearSetting('${yr}')">à¸¥à¸š</button>
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
    Swal.fire({ icon: 'warning', title: 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“', text: 'à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸Šà¹ˆà¸™ 2570' });
    return;
  }

  const yr = parseInt(value);
  if (isNaN(yr) || yr < 2500 || yr > 3000) {
    Swal.fire({ icon: 'error', title: 'à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡', text: 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸›à¸µ à¸ž.à¸¨. à¸£à¸°à¸«à¸§à¹ˆà¸²à¸‡ 2500 - 3000' });
    return;
  }

  let years = [];
  if (settings && settings.fiscal_years) {
    years = settings.fiscal_years.split(',').map(y => y.trim()).filter(Boolean);
  }

  if (years.includes(String(yr))) {
    Swal.fire({ icon: 'warning', title: 'à¸¡à¸µà¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“à¸™à¸µà¹‰à¸­à¸¢à¸¹à¹ˆà¹à¸¥à¹‰à¸§' });
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

  showLoading('à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²...');
  try {
    const res = await safeFetch(`${API_BASE_URL}/api/settings`, {
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
      const setRes = await safeFetch(`${API_BASE_URL}/api/settings`);
      settings = await setRes.json();

      Swal.fire({ icon: 'success', title: 'à¸šà¸±à¸™à¸—à¸¶à¸à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', text: d.message });
      
      const dbSelect = document.getElementById('dashboard-fiscal-year-select');
      if (dbSelect) {
        dbSelect.innerHTML = '';
      }
    } else {
      showError(d.message || 'à¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ');
    }
  } catch (err) {
    showError('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + err.message);
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



