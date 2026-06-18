/* ==========================================================================
   SHUBH TRISTAR — CP DASHBOARD LOGIC
   Event-driven JS. All state lives in `leads`, synced to localStorage.

   IMPORTANT BUSINESS RULE:
   The 4%/5% brokerage offer is awarded against PROP's (the project's)
   total cumulative booked sales across ALL CPs combined — not against
   any individual CP's personal sales. Every CP earns commission on
   their own booked sales, but the RATE applied is the single PROP-wide
   slab unlocked by the project's combined performance.

   Flat-count targets (17 / 24 flats) are fixed business figures supplied
   by Shubh Tristar — no per-unit pricing is stored, shown, or derived
   anywhere in this app.
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
  var SLAB1_FLATS = 17;     // Flats equivalent to Slab 1 target
  var SLAB2_FLATS = 24;     // Flats equivalent to Slab 2 target
  var SLAB1_RATE = 0.04;
  var SLAB2_RATE = 0.05;
  var STATUS_OPTIONS = ['Visit Scheduled', 'Visit Conducted', 'Follow-up', 'Not Interested', 'Booked'];
  var CONFIG_OPTIONS = ['3 BHK Skyvilla', '4 BHK Skyvilla'];

  var MOTIVATION_QUOTES = [
    "Every site visit is a step closer to a milestone — keep the momentum going!",
    "Great CPs don't wait for leads, they create opportunities.",
    "One more booking today could unlock the next brokerage slab for everyone.",
    "Your hustle today is tomorrow's closed deal.",
    "Consistency closes more deals than talent alone.",
    "Bring the right buyer, and Shubh Tristar will do the rest.",
    "Every follow-up call is a brick in your commission tower.",
    "Top CPs are made one site visit at a time.",
    "The best time to follow up was yesterday — the next best time is now.",
    "Champions are built on relentless follow-ups.",
    "A confident pitch today builds a confirmed booking tomorrow.",
    "Together, PROP CPs are closer to the next brokerage slab than ever."
  ];

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
  var motivationText = $('motivationText');
  var targetDonut = $('targetDonut');
  var donutPct = $('donutPct');
  var latestBookingCP = $('latestBookingCP');
  var latestBookingMeta = $('latestBookingMeta');
  var topCpList = $('topCpList');
  var pubStatLeads = $('pubStatLeads');
  var pubStatBookings = $('pubStatBookings');
  var pubStatFlats = $('pubStatFlats');
  var pubStatConversion = $('pubStatConversion');
  var statusBreakdown = $('statusBreakdown');
  var configBreakdown = $('configBreakdown');
  var exportExcelBtn = $('exportExcelBtn');

  /* ---------- State ---------- */
  var leads = [];

  /* ---------- Seed data (used only on first run) ---------- */
  function seedData() {
    return [
      { id: 'L1001', name: 'Aarav Mehta', phone: '9820012345', config: '4 BHK Skyvilla', cpName: 'Prestige Realty Partners', visitDate: '2026-05-12T11:00', status: 'Booked', saleValue: 22, bookedAt: '2026-06-15T09:30:00' },
      { id: 'L1002', name: 'Ishita Rao', phone: '9876543210', config: '3 BHK Skyvilla', cpName: 'Elite Property Consultants', visitDate: '2026-05-18T16:30', status: 'Booked', saleValue: 18, bookedAt: '2026-06-10T14:00:00' },
      { id: 'L1003', name: 'Karan Shah', phone: '9988776655', config: '4 BHK Skyvilla', cpName: 'Prestige Realty Partners', visitDate: '2026-06-02T10:00', status: 'Visit Conducted', saleValue: null, bookedAt: null },
      { id: 'L1004', name: 'Meera Iyer', phone: '9123456780', config: '3 BHK Skyvilla', cpName: 'Skyline Associates', visitDate: '2026-06-08T15:00', status: 'Follow-up', saleValue: null, bookedAt: null }
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

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
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

  function getBookedLeads() {
    return leads.filter(function (l) { return l.status === 'Booked'; });
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

  function getStatusBreakdown() {
    return STATUS_OPTIONS.map(function (status) {
      var count = leads.filter(function (l) { return l.status === status; }).length;
      var pct = leads.length ? (count / leads.length) * 100 : 0;
      return { status: status, count: count, pct: pct };
    });
  }

  function getConfigBreakdown() {
    return CONFIG_OPTIONS.map(function (config) {
      var configLeads = leads.filter(function (l) { return l.config === config; });
      var booked = configLeads.filter(function (l) { return l.status === 'Booked'; });
      var revenue = booked.reduce(function (s, l) { return s + (Number(l.saleValue) || 0); }, 0);
      return { config: config, leadsCount: configLeads.length, bookedCount: booked.length, revenue: revenue };
    });
  }

  /* ---------- Rendering: Daily motivation ---------- */
  function renderMotivation() {
    var dayIndex = Math.floor(Date.now() / 86400000);
    motivationText.textContent = MOTIVATION_QUOTES[dayIndex % MOTIVATION_QUOTES.length];
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
    homeTick35.innerHTML = '<span class="tick-label">' + SLAB1_FLATS + ' Flats<br>(&#8377;' + SLAB1_THRESHOLD + ' Cr)</span>';
    homeTick50.innerHTML = '<span class="tick-label">' + SLAB2_FLATS + ' Flats<br>(&#8377;' + SLAB2_THRESHOLD + ' Cr)</span>';
  }

  /* ---------- Rendering: Target-completion donut ---------- */
  function renderDonut() {
    var total = getPropTotalSales();
    var pct = Math.min(100, (total / SLAB2_THRESHOLD) * 100);
    targetDonut.style.background = 'conic-gradient(var(--gold) 0% ' + pct + '%, var(--gray-100) ' + pct + '% 100%)';
    donutPct.textContent = pct.toFixed(0) + '%';
  }

  /* ---------- Rendering: Highlights (latest booking + top CPs) ---------- */
  function renderHighlights() {
    var booked = getBookedLeads().filter(function (l) { return l.bookedAt; });
    booked.sort(function (a, b) { return new Date(b.bookedAt) - new Date(a.bookedAt); });

    if (booked.length) {
      var latest = booked[0];
      latestBookingCP.textContent = latest.cpName;
      latestBookingMeta.textContent = latest.config + ' \u00B7 Booked on ' + formatDate(latest.bookedAt);
    } else {
      latestBookingCP.textContent = '\u2014';
      latestBookingMeta.textContent = 'No bookings yet — be the first PROP CP to close a deal!';
    }

    var topCps = getCPStats().filter(function (cp) { return cp.totalSales > 0; }).slice(0, 3);
    topCpList.innerHTML = '';
    if (topCps.length === 0) {
      topCpList.innerHTML = '<p class="empty-state">No bookings recorded yet.</p>';
      return;
    }
    topCps.forEach(function (cp, idx) {
      var rank = idx + 1;
      var li = document.createElement('li');
      li.className = 'top-cp-item';
      li.innerHTML =
        '<span class="rank-badge rank-badge--' + rank + '">' + rank + '</span>' +
        '<div class="top-cp-info"><strong>' + escapeHtml(cp.name) + '</strong>' +
        '<span>' + formatCr(cp.totalSales) + ' \u00B7 ' + cp.bookings + ' booking(s)</span></div>';
      topCpList.appendChild(li);
    });
  }

  /* ---------- Rendering: Public basic analytics ---------- */
  function renderPublicAnalytics() {
    var bookings = getBookedLeads();
    pubStatLeads.textContent = leads.length;
    pubStatBookings.textContent = bookings.length;
    pubStatFlats.textContent = bookings.length; // each booked lead represents one flat
    pubStatConversion.textContent = (leads.length ? Math.round((bookings.length / leads.length) * 100) : 0) + '%';
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

  /* ---------- Rendering: Stats ---------- */
  function renderStats() {
    var bookings = getBookedLeads();
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
        '<div class="slab-meter-wrap" style="margin-bottom:6px">' +
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

  /* ---------- Rendering: Detailed analytics (admin) ---------- */
  function renderDetailedAnalytics() {
    statusBreakdown.innerHTML = '';
    getStatusBreakdown().forEach(function (row) {
      var div = document.createElement('div');
      div.className = 'breakdown-row';
      div.innerHTML =
        '<span class="breakdown-label">' + row.status + '</span>' +
        '<span class="breakdown-bar-track"><span class="breakdown-bar-fill" style="width:' + row.pct + '%"></span></span>' +
        '<span class="breakdown-count">' + row.count + '</span>';
      statusBreakdown.appendChild(div);
    });

    configBreakdown.innerHTML = '';
    getConfigBreakdown().forEach(function (row) {
      var div = document.createElement('div');
      div.className = 'config-row';
      div.innerHTML =
        '<span><strong>' + row.config + '</strong>' + row.leadsCount + ' lead(s)</span>' +
        '<span><strong>Booked</strong>' + row.bookedCount + '</span>' +
        '<span><strong>Revenue</strong>' + formatCr(row.revenue) + '</span>';
      configBreakdown.appendChild(div);
    });
  }

  function renderAll() {
    renderHomeCumulative();
    renderDonut();
    renderHighlights();
    renderPublicAnalytics();
    renderLeadTable();
    renderStats();
    renderLeaderboard();
    renderDetailedAnalytics();
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

  /* ---------- Excel export (Admin Console only) ---------- */
  function exportToExcel() {
    if (typeof XLSX === 'undefined') {
      showToast('Excel library failed to load — check your internet connection.');
      return;
    }
    var leadsSheet = leads.map(function (l) {
      return {
        'Customer Name': l.name,
        'Phone Number': l.phone,
        'Configuration': l.config,
        'PROP CP Name': l.cpName,
        'Visit Date': formatDate(l.visitDate),
        'Visit Status': l.status,
        'Sale Value (Cr)': l.saleValue || '',
        'Booked On': l.bookedAt ? formatDate(l.bookedAt) : ''
      };
    });

    var propSlab = getSlab(getPropTotalSales());
    var cpSheet = getCPStats().map(function (cp) {
      return {
        'PROP CP Name': cp.name,
        'Total Leads': cp.totalLeads,
        'Bookings': cp.bookings,
        'Total Sales (Cr)': cp.totalSales,
        'Active PROP Slab': propSlab.label,
        'Commission Earned (Cr)': cp.commission
      };
    });

    var summarySheet = [{
      'Cumulative PROP Sales (Cr)': getPropTotalSales(),
      'Active PROP Slab': propSlab.label,
      'Total Leads': leads.length,
      'Total Bookings': getBookedLeads().length,
      'Total Commission Payable (Cr)': +(getPropTotalSales() * propSlab.rate).toFixed(2),
      'Exported On': formatDate(new Date().toISOString())
    }];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'PROP Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leadsSheet), 'Leads');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cpSheet), 'CP Leaderboard');
    XLSX.writeFile(wb, 'ShubhTristar_PROP_Export_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    showToast('Excel file exported successfully.');
  }

  /* ---------- Event wiring ---------- */
  navHomeBtn.addEventListener('click', showPublic);
  navAdminBtn.addEventListener('click', showAdmin);
  loginBtn.addEventListener('click', openLoginModal);
  closeLoginBtn.addEventListener('click', closeLoginModal);
  loginModal.addEventListener('click', function (e) { if (e.target === loginModal) closeLoginModal(); });
  exportExcelBtn.addEventListener('click', exportToExcel);

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
      visitDate: visitDate, status: 'Visit Scheduled', saleValue: null, bookedAt: null
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
      if (lead.status === 'Booked') {
        lead.bookedAt = new Date().toISOString();
      } else {
        lead.saleValue = null;
        lead.bookedAt = null;
      }
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
      renderAll();
      showToast('Sale value of ' + formatCr(val) + ' recorded for ' + lead.name + '.');
    }
  });

  /* ---------- Init ---------- */
  loadLeads();
  refreshAuthUI();
  $('year').textContent = new Date().getFullYear();
  renderMotivation();
  renderAll();   // public widgets must be live even before any admin login
  showPublic();
})();
