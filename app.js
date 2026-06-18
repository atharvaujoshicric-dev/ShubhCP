/* ==========================================================================
   SHUBH TRISTAR — CP DASHBOARD LOGIC
   Event-driven JS. All state lives in `leads`, synced to localStorage.

   IMPORTANT BUSINESS RULE:
   The 4%/5% brokerage offer is awarded against PROP's (the project's)
   total cumulative booked sales across ALL CPs combined — not against
   any individual CP's personal sales. Every CP earns commission on
   their own booked sales, but the RATE applied is the single PROP-wide
   slab unlocked by the project's combined performance.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Constants ---------- */
  var STORAGE_KEY = 'st_cp_leads_v1';
  var SESSION_KEY = 'st_admin_session_v1';
  var ADMIN_USER = 'admin';
  var ADMIN_PASS = 'admin123';
  var SLAB1_THRESHOLD = 35; // Cr — PROP cumulative
  var SLAB2_THRESHOLD = 50; // Cr — PROP cumulative
  var SLAB1_RATE = 0.04;
  var SLAB2_RATE = 0.05;
  var STATUS_OPTIONS = ['Visit Scheduled', 'Visit Conducted', 'Follow-up', 'Not Interested', 'Booked'];

  /* ---------- DOM refs ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var publicView = $('publicView');
  var adminView = $('adminView');
  var navHomeBtn = $('navHomeBtn');
  var navAdminBtn = $('navAdminBtn');
  var loginBtn = $('loginBtn');
  var logoutBtn = $('logoutBtn');
  var loginModal = $('loginModal');
  var closeLoginBtn = $('closeLoginBtn');
  var loginForm = $('loginForm');
  var loginError = $('loginError');
  var leadForm = $('leadForm');
  var formMsg = $('formMsg');
  var leadTableBody = $('leadTableBody');
  var leadCountBadge = $('leadCount');
  var emptyState = $('emptyState');
  var leaderboardGrid = $('leaderboardGrid');
  var leaderboardSlabBadge = $('leaderboardSlabBadge');
  var toastEl = $('toast');
  var statLeads = $('statLeads');
  var statBookings = $('statBookings');
  var statSales = $('statSales');
  var statCommission = $('statCommission');
  var homeCumValue = $('homeCumValue');
  var homeCumBadge = $('homeCumBadge');
  var homeCumFill = $('homeCumFill');
  var homeTick35 = $('homeTick35');
  var homeTick50 = $('homeTick50');

  /* ---------- State ---------- */
  var leads = [];

  /* ---------- Seed data (used only on first run) ---------- */
  function seedData() {
    return [
      { id: 'L1001', name: 'Aarav Mehta', phone: '9820012345', config: '4 BHK Skyvilla', cpName: 'Prestige Realty Partners', visitDate: '2026-05-12T11:00', status: 'Booked', saleValue: 22 },
      { id: 'L1002', name: 'Ishita Rao', phone: '9876543210', config: '3 BHK Skyvilla', cpName: 'Elite Property Consultants', visitDate: '2026-05-18T16:30', status: 'Booked', saleValue: 18 },
      { id: 'L1003', name: 'Karan Shah', phone: '9988776655', config: '4 BHK Skyvilla', cpName: 'Prestige Realty Partners', visitDate: '2026-06-02T10:00', status: 'Visit Conducted', saleValue: null },
      { id: 'L1004', name: 'Meera Iyer', phone: '9123456780', config: '3 BHK Skyvilla', cpName: 'Skyline Associates', visitDate: '2026-06-08T15:00', status: 'Follow-up', saleValue: null }
    ];
  }

  /* ---------- Persistence ---------- */
  function loadLeads() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { leads = JSON.parse(raw); return; }
    } catch (e) { /* fall through to seed */ }
    leads = seedData();
    saveLeads();
  }

  function saveLeads() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }

  function isAdmin() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }

  /* ---------- Helpers ---------- */
  function genId() {
    return 'L' + Date.now() + Math.floor(Math.random() * 100);
  }

  function formatCr(num) {
    return '\u20B9' + Number(num).toFixed(1) + ' Cr';
  }

  function formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2800);
  }

  /* ---------- PROP-wide brokerage calculation ---------- */
  // Slab is determined ONLY by PROP's total cumulative booked sales —
  // never by an individual CP's own sales.
  function getSlab(totalSales) {
    if (totalSales >= SLAB2_THRESHOLD) return { tier: 2, rate: SLAB2_RATE, label: '5% PROP Slab' };
    if (totalSales >= SLAB1_THRESHOLD) return { tier: 1, rate: SLAB1_RATE, label: '4% PROP Slab' };
    return { tier: 0, rate: 0, label: 'Not Qualified' };
  }

  function getPropTotalSales() {
    return leads.reduce(function (sum, l) {
      return sum + (l.status === 'Booked' ? (Number(l.saleValue) || 0) : 0);
    }, 0);
  }

  // Per-CP stats: each CP's own leads/bookings/sales, with commission
  // computed using the single PROP-wide slab rate (not a per-CP slab).
  function getCPStats() {
    var propSlab = getSlab(getPropTotalSales());
    var map = {};
    leads.forEach(function (l) {
      if (!map[l.cpName]) map[l.cpName] = { name: l.cpName, totalLeads: 0, bookings: 0, totalSales: 0 };
      map[l.cpName].totalLeads += 1;
      if (l.status === 'Booked' && l.saleValue) {
        map[l.cpName].bookings += 1;
        map[l.cpName].totalSales += Number(l.saleValue);
      }
    });
    return Object.keys(map).map(function (k) {
      var cp = map[k];
      cp.commission = +(cp.totalSales * propSlab.rate).toFixed(2);
      return cp;
    }).sort(function (a, b) { return b.totalSales - a.totalSales; });
  }

  /* ---------- Rendering: Public home — cumulative PROP sales ---------- */
  function renderHomeCumulative() {
    var total = getPropTotalSales();
    var slab = getSlab(total);
    var scaleMax = Math.max(SLAB2_THRESHOLD * 1.2, total * 1.05, 1);

    homeCumValue.textContent = formatCr(total);
    homeCumBadge.textContent = slab.label;
    homeCumBadge.className = 'slab-badge slab-badge--' + slab.tier;
    homeCumFill.style.width = Math.min(100, (total / scaleMax) * 100) + '%';
    homeTick35.style.left = (SLAB1_THRESHOLD / scaleMax) * 100 + '%';
    homeTick50.style.left = (SLAB2_THRESHOLD / scaleMax) * 100 + '%';
  }

  /* ---------- Rendering: Lead table ---------- */
  function renderLeadTable() {
    leadTableBody.innerHTML = '';
    leadCountBadge.textContent = leads.length + (leads.length === 1 ? ' lead' : ' leads');
    emptyState.hidden = leads.length !== 0;

    leads.slice().reverse().forEach(function (lead) {
      var tr = document.createElement('tr');
      tr.dataset.id = lead.id;

      tr.innerHTML =
        '<td data-label="Customer"><span class="cust-name">' + escapeHtml(lead.name) + '<small>' + escapeHtml(lead.config) + '</small></span></td>' +
        '<td data-label="Phone">' + escapeHtml(lead.phone) + '</td>' +
        '<td data-label="Configuration">' + escapeHtml(lead.config) + '</td>' +
        '<td data-label="PROP CP">' + escapeHtml(lead.cpName) + '</td>' +
        '<td data-label="Visit Date">' + formatDate(lead.visitDate) + '</td>' +
        '<td data-label="Status"></td>' +
        '<td data-label="Sale Value (Cr)"></td>';

      // Status select
      var statusCell = tr.children[5];
      var select = document.createElement('select');
      select.className = 'status-select';
      select.setAttribute('data-status', lead.status);
      STATUS_OPTIONS.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if (opt === lead.status) o.selected = true;
        select.appendChild(o);
      });
      statusCell.appendChild(select);

      // Sale value input
      var saleCell = tr.children[6];
      var saleInput = document.createElement('input');
      saleInput.type = 'number';
      saleInput.min = '0.1';
      saleInput.step = '0.1';
      saleInput.className = 'sale-value-input';
      saleInput.placeholder = '0.0';
      saleInput.value = lead.saleValue !== null && lead.saleValue !== undefined ? lead.saleValue : '';
      saleInput.disabled = lead.status !== 'Booked';
      saleCell.appendChild(saleInput);

      leadTableBody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  /* ---------- Rendering: Stats ---------- */
  function renderStats() {
    var bookings = leads.filter(function (l) { return l.status === 'Booked'; });
    var totalSales = getPropTotalSales();
    var propSlab = getSlab(totalSales);
    var totalCommission = +(totalSales * propSlab.rate).toFixed(2);

    statLeads.textContent = leads.length;
    statBookings.textContent = bookings.length;
    statSales.textContent = formatCr(totalSales);
    statCommission.textContent = formatCr(totalCommission);
  }

  /* ---------- Rendering: Leaderboard ---------- */
  function renderLeaderboard() {
    var totalPropSales = getPropTotalSales();
    var propSlab = getSlab(totalPropSales);
    var cpStats = getCPStats();

    leaderboardSlabBadge.textContent = propSlab.label;
    leaderboardSlabBadge.className = 'slab-badge slab-badge--' + propSlab.tier;

    leaderboardGrid.innerHTML = '';

    if (cpStats.length === 0) {
      leaderboardGrid.innerHTML = '<p class="empty-state">No PROP CPs tracked yet.</p>';
      return;
    }

    cpStats.forEach(function (cp) {
      var sharePct = totalPropSales > 0 ? Math.min(100, (cp.totalSales / totalPropSales) * 100) : 0;

      var card = document.createElement('div');
      card.className = 'cp-card';
      card.innerHTML =
        '<div class="cp-card-head">' +
          '<div><div class="cp-name">' + escapeHtml(cp.name) + '</div>' +
          '<div class="cp-leads-count">' + cp.totalLeads + ' lead(s) &middot; ' + cp.bookings + ' booking(s)</div></div>' +
        '</div>' +
        '<div class="slab-meter-wrap">' +
          '<div class="slab-meter"><div class="slab-meter-fill" style="width:' + sharePct + '%"></div></div>' +
          '<p class="share-label">' + sharePct.toFixed(0) + '% of total PROP sales contributed</p>' +
        '</div>' +
        '<div class="cp-metrics">' +
          '<div class="cp-metric"><span>Own Sales Booked</span><strong>' + formatCr(cp.totalSales) + '</strong></div>' +
          '<div class="cp-metric"><span>Commission Earned</span><strong>' + formatCr(cp.commission) + '</strong></div>' +
        '</div>';
      leaderboardGrid.appendChild(card);
    });
  }

  function renderAll() {
    renderHomeCumulative();
    renderLeadTable();
    renderStats();
    renderLeaderboard();
  }

  /* ---------- View switching ---------- */
  function showPublic() {
    publicView.classList.add('is-active');
    adminView.classList.remove('is-active');
    navHomeBtn.classList.add('is-active');
    navAdminBtn.classList.remove('is-active');
  }

  function showAdmin() {
    if (!isAdmin()) { openLoginModal(); return; }
    adminView.classList.add('is-active');
    publicView.classList.remove('is-active');
    navAdminBtn.classList.add('is-active');
    navHomeBtn.classList.remove('is-active');
    renderAll();
  }

  function refreshAuthUI() {
    var loggedIn = isAdmin();
    navAdminBtn.hidden = !loggedIn;
    loginBtn.hidden = loggedIn;
    logoutBtn.hidden = !loggedIn;
  }

  /* ---------- Login modal ---------- */
  function openLoginModal() {
    loginModal.hidden = false;
    loginError.textContent = '';
    loginForm.reset();
    $('loginUser').focus();
  }
  function closeLoginModal() { loginModal.hidden = true; }

  /* ---------- Event wiring ---------- */
  navHomeBtn.addEventListener('click', showPublic);
  navAdminBtn.addEventListener('click', showAdmin);
  loginBtn.addEventListener('click', openLoginModal);
  closeLoginBtn.addEventListener('click', closeLoginModal);
  loginModal.addEventListener('click', function (e) { if (e.target === loginModal) closeLoginModal(); });

  logoutBtn.addEventListener('click', function () {
    sessionStorage.removeItem(SESSION_KEY);
    refreshAuthUI();
    showPublic();
    showToast('Logged out successfully.');
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var user = $('loginUser').value.trim();
    var pass = $('loginPass').value;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      refreshAuthUI();
      closeLoginModal();
      showAdmin();
      showToast('Welcome back, Admin.');
    } else {
      loginError.textContent = 'Invalid username or password.';
    }
  });

  // Lead entry form — now only reachable from inside the Admin Console.
  leadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('custName').value.trim();
    var phone = $('custPhone').value.trim();
    var config = $('config').value;
    var cpName = $('cpName').value.trim();
    var visitDate = $('visitDate').value;

    if (!name || !phone || !config || !cpName || !visitDate) {
      formMsg.textContent = 'Please fill in all fields to submit the entry.';
      formMsg.className = 'form-msg error';
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      formMsg.textContent = 'Please enter a valid 10-digit phone number.';
      formMsg.className = 'form-msg error';
      return;
    }

    leads.push({
      id: genId(), name: name, phone: phone, config: config, cpName: cpName,
      visitDate: visitDate, status: 'Visit Scheduled', saleValue: null
    });
    saveLeads();

    formMsg.textContent = 'Visit logged successfully for ' + cpName + '.';
    formMsg.className = 'form-msg success';
    leadForm.reset();
    renderAll();
  });

  /* Delegated events for the lead table (status + sale value) */
  leadTableBody.addEventListener('change', function (e) {
    var tr = e.target.closest('tr');
    if (!tr) return;
    var lead = leads.find(function (l) { return l.id === tr.dataset.id; });
    if (!lead) return;

    if (e.target.classList.contains('status-select')) {
      lead.status = e.target.value;
      if (lead.status !== 'Booked') lead.saleValue = null;
      saveLeads();
      renderAll();
      showToast('Status updated for ' + lead.name + '.');
      return;
    }

    if (e.target.classList.contains('sale-value-input')) {
      var val = parseFloat(e.target.value);
      if (isNaN(val) || val <= 0) {
        showToast('Enter a valid sale value greater than 0.');
        e.target.value = lead.saleValue || '';
        return;
      }
      lead.saleValue = val;
      saveLeads();
      renderHomeCumulative();
      renderStats();
      renderLeaderboard();
      showToast('Sale value of ' + formatCr(val) + ' recorded for ' + lead.name + '.');
    }
  });

  /* ---------- Init ---------- */
  loadLeads();
  refreshAuthUI();
  $('year').textContent = new Date().getFullYear();
  renderAll();   // public cumulative widget must be live even before any admin login
  showPublic();
})();
