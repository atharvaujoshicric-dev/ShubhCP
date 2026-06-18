/* ==========================================================================
   SHUBH TRISTAR — CP DASHBOARD LOGIC
   Event-driven JS. All state lives in `leads`, synced to localStorage.

   IMPORTANT BUSINESS RULE:
   The 4%/5% brokerage offer is awarded against PROP's (the project's)
   total cumulative booked sales across ALL CPs combined — not against
   any individual CP's personal sales. Every CP earns commission on
   their own booked sales, but the RATE applied is the single PROP-wide
   slab unlocked by the project's combined performance.

   Flats vs. revenue: PROP's revenue targets (₹35 Cr / ₹50 Cr) are also
   expressed as flat-count milestones (17 / 24 flats) so CPs can track
   progress without any per-unit pricing ever being displayed.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Constants ---------- */
  var STORAGE_KEY = 'st_cp_leads_v1';
  var SESSION_KEY = 'st_admin_session_v1';
  var ADMIN_USER = 'admin';
  var ADMIN_PASS = 'admin123';
  var SLAB1_THRESHOLD = 35;   // Cr — PROP cumulative
  var SLAB2_THRESHOLD = 50;   // Cr — PROP cumulative
  var SLAB1_RATE = 0.04;
  var SLAB2_RATE = 0.05;
  var FLATS_TARGET_1 = 17;    // flats equivalent to ₹35 Cr
  var FLATS_TARGET_2 = 24;    // flats equivalent to ₹50 Cr
  var STATUS_OPTIONS = ['Visit Scheduled', 'Visit Conducted', 'Follow-up', 'Not Interested', 'Booked'];
  var CONFIG_OPTIONS = ['3 BHK Skyvilla (1268 sq.ft)', '3 BHK Skyvilla (1298 sq.ft)', '4 BHK Skyvilla'];
  var DONUT_R = 68;
  var DONUT_CIRC = 2 * Math.PI * DONUT_R;

  var MOTIVATION_QUOTES = [
    'Every site visit you bring in moves PROP closer to the next brokerage slab — keep the momentum going!',
    "Great CPs don't wait for leads, they create them. Today is a great day to close one more.",
    'The 5% slab is closer than you think — one more booking could tip the scale for everyone.',
    "Your hustle today is tomorrow's commission. Keep pushing — Shubh Tristar believes in PROP CPs.",
    'Consistency beats intensity. One quality lead a day adds up to a top performing month.',
    "Top performers aren't lucky, they're consistent. Log today's visit and stay in the race.",
    'PROP rewards collective effort — your booking helps every CP unlock a higher slab.',
    'Confidence sells Skyvillas. Walk every client through the vision, not just the floor plan.',
    'A follow-up call today could be the booking that pushes PROP over the next milestone.',
    'Excellence is a habit. Show up, follow up, and close — that is the PROP CP way.'
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

  var donutLabel = $('donutLabel');
  var donutProgressCircle = $('donutProgressCircle');
  var donutPct = $('donutPct');
  var donutSub = $('donutSub');
  var donutSlabBadge = $('donutSlabBadge');
  var donutFlats = $('donutFlats');

  var motivationText = $('motivationText');
  var latestBookingCP = $('latestBookingCP');
  var latestBookingMeta = $('latestBookingMeta');
  var topCpList = $('topCpList');

  var basicStatLeads = $('basicStatLeads');
  var basicStatBookings = $('basicStatBookings');
  var basicStatFlats = $('basicStatFlats');
  var basicStatCPs = $('basicStatCPs');

  var exportExcelBtn = $('exportExcelBtn');
  var statusBreakdownEl = $('statusBreakdown');
  var configBreakdownEl = $('configBreakdown');
  var revenueByConfigEl = $('revenueByConfig');
  var conversionRateEl = $('conversionRate');
  var activeCpCountEl = $('activeCpCount');
  var avgLeadsPerCpEl = $('avgLeadsPerCp');
  var leadFunnelEl = $('leadFunnel');
  var cpRankingBodyEl = $('cpRankingBody');

  var leadSearchEl = $('leadSearch');
  var statusFilterEl = $('statusFilter');

  /* ---------- State ---------- */
  var leads = [];

  /* ---------- Seed data (used only on first run) ---------- */
  function seedData() {
    return [
      { id: 'L1001', name: 'Aarav Mehta', phone: '9820012345', config: '4 BHK Skyvilla', cpName: 'Prestige Realty Partners', visitDate: '2026-05-12T11:00', status: 'Booked', saleValue: 22, bookedAt: '2026-06-05T10:00' },
      { id: 'L1002', name: 'Ishita Rao', phone: '9876543210', config: '3 BHK Skyvilla (1298 sq.ft)', cpName: 'Elite Property Consultants', visitDate: '2026-05-18T16:30', status: 'Booked', saleValue: 18, bookedAt: '2026-06-15T11:30' },
      { id: 'L1003', name: 'Karan Shah', phone: '9988776655', config: '4 BHK Skyvilla', cpName: 'Prestige Realty Partners', visitDate: '2026-06-02T10:00', status: 'Visit Conducted', saleValue: null, bookedAt: null },
      { id: 'L1004', name: 'Meera Iyer', phone: '9123456780', config: '3 BHK Skyvilla (1268 sq.ft)', cpName: 'Skyline Associates', visitDate: '2026-06-08T15:00', status: 'Follow-up', saleValue: null, bookedAt: null }
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

  function getFlatsSold() {
    return leads.filter(function (l) { return l.status === 'Booked'; }).length;
  }

  // Donut / target-tracker state: target starts at ₹35 Cr (17 flats);
  // once crossed, the SAME chart re-targets to ₹50 Cr (24 flats).
  function getProgressState() {
    var total = getPropTotalSales();
    var flatsSold = getFlatsSold();
    var target, targetFlats, label, tier;
    if (total >= SLAB2_THRESHOLD) {
      target = SLAB2_THRESHOLD; targetFlats = FLATS_TARGET_2; label = 'Both PROP Slabs Achieved!'; tier = 2;
    } else if (total >= SLAB1_THRESHOLD) {
      target = SLAB2_THRESHOLD; targetFlats = FLATS_TARGET_2; label = 'Chasing the 5% Slab'; tier = 1;
    } else {
      target = SLAB1_THRESHOLD; targetFlats = FLATS_TARGET_1; label = 'Chasing the 4% Slab'; tier = 0;
    }
    var pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;
    return { total: total, flatsSold: flatsSold, target: target, targetFlats: targetFlats, label: label, tier: tier, pct: pct };
  }

  // Per-CP stats: each CP's own leads/bookings/sales, with commission
  // computed using the single PROP-wide slab rate (not a per-CP slab).
  //
  // BUG FIX: `bookings` now increments for every status === 'Booked' lead,
  // regardless of whether a sale value has been entered yet. Previously it
  // only counted when saleValue was truthy, which made a freshly-booked
  // lead (awaiting sale-value entry) invisible to the CP leaderboard and
  // the Top Performing CPs list, while still counting toward "Flats Sold"
  // and the admin status breakdown — an inconsistency across the app.
  // Revenue summation is unaffected: unentered sale values still add ₹0.
  function getCPStats() {
    var propSlab = getSlab(getPropTotalSales());
    var map = {};
    leads.forEach(function (l) {
      if (!map[l.cpName]) map[l.cpName] = { name: l.cpName, totalLeads: 0, bookings: 0, totalSales: 0 };
      map[l.cpName].totalLeads += 1;
      if (l.status === 'Booked') {
        map[l.cpName].bookings += 1;
        map[l.cpName].totalSales += Number(l.saleValue) || 0;
      }
    });
    return Object.keys(map).map(function (k) {
      var cp = map[k];
      cp.commission = +(cp.totalSales * propSlab.rate).toFixed(2);
      cp.conversion = cp.totalLeads ? Math.round((cp.bookings / cp.totalLeads) * 100) : 0;
      return cp;
    }).sort(function (a, b) { return b.totalSales - a.totalSales; });
  }

  function getLatestBooking() {
    var booked = leads.filter(function (l) { return l.status === 'Booked' && l.bookedAt; });
    if (booked.length === 0) return null;
    booked.sort(function (a, b) { return new Date(b.bookedAt) - new Date(a.bookedAt); });
    return booked[0];
  }

  function getTodaysMotivation() {
    var start = new Date(new Date().getFullYear(), 0, 0);
    var dayOfYear = Math.floor((new Date() - start) / 86400000);
    return MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length];
  }

  // Non-destructive lead filtering for the Admin lead table — never
  // mutates the underlying `leads` array.
  function getFilteredLeads() {
    var term = (leadSearchEl && leadSearchEl.value || '').toLowerCase().trim();
    var statusVal = statusFilterEl ? statusFilterEl.value : '';
    return leads.filter(function (l) {
      var matchesTerm = !term || l.name.toLowerCase().indexOf(term) !== -1 || l.cpName.toLowerCase().indexOf(term) !== -1;
      var matchesStatus = !statusVal || l.status === statusVal;
      return matchesTerm && matchesStatus;
    });
  }

  /* ---------- Rendering: Donut target chart ---------- */
  function renderDonut() {
    var p = getProgressState();
    var slab = getSlab(p.total);
    var offset = DONUT_CIRC - (p.pct / 100) * DONUT_CIRC;

    donutProgressCircle.style.strokeDasharray = DONUT_CIRC;
    donutProgressCircle.style.strokeDashoffset = offset;
    donutPct.textContent = Math.round(p.pct) + '%';
    donutSub.textContent = formatCr(p.total) + ' of ' + formatCr(p.target);
    donutLabel.textContent = p.label;
    donutFlats.textContent = p.flatsSold + ' of ' + p.targetFlats + ' Flats Sold';

    // "Not Qualified" is intentionally hidden on the public donut — the
    // badge only appears once a slab is actually unlocked (tier 1 or 2).
    // It still appears in the Admin leaderboard panel, since that's an
    // internal view where the literal qualification state is useful.
    if (slab.tier === 0) {
      donutSlabBadge.hidden = true;
    } else {
      donutSlabBadge.hidden = false;
      donutSlabBadge.textContent = slab.label;
      donutSlabBadge.className = 'slab-badge slab-badge--' + slab.tier;
    }
  }

  /* ---------- Rendering: Motivation ---------- */
  function renderMotivation() {
    motivationText.textContent = getTodaysMotivation();
  }

  /* ---------- Rendering: Highlights (latest booking + top CPs) ---------- */
  function renderHighlights() {
    var latest = getLatestBooking();
    if (latest) {
      latestBookingCP.textContent = latest.cpName;
      latestBookingMeta.textContent = latest.config + ' \u00B7 Booked ' + formatDate(latest.bookedAt);
    } else {
      latestBookingCP.textContent = 'No bookings yet';
      latestBookingMeta.textContent = 'Be the first PROP CP to close a deal!';
    }

    var top = getCPStats().filter(function (cp) { return cp.totalSales > 0; }).slice(0, 3);
    if (top.length === 0) {
      topCpList.innerHTML = '<p class="empty-state">No bookings recorded yet. Be the first to top the board!</p>';
      return;
    }
    var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    topCpList.innerHTML = top.map(function (cp, i) {
      var bookingLabel = cp.bookings + (cp.bookings === 1 ? ' Booking' : ' Bookings');
      return '<div class="top-cp-row"><div class="top-cp-left"><span class="top-cp-rank">' + medals[i] + '</span>' +
        '<span class="top-cp-name">' + escapeHtml(cp.name) + '</span></div>' +
        '<div class="top-cp-right"><span class="top-cp-value">' + formatCr(cp.totalSales) + '</span>' +
        '<span class="top-cp-bookings">' + bookingLabel + '</span></div></div>';
    }).join('');
  }

  /* ---------- Rendering: Basic analytics (public) ---------- */
  function renderBasicAnalytics() {
    var p = getProgressState();
    var cpNames = {};
    leads.forEach(function (l) { cpNames[l.cpName] = true; });

    basicStatLeads.textContent = leads.length;
    basicStatBookings.textContent = leads.filter(function (l) { return l.status === 'Booked'; }).length;
    basicStatFlats.textContent = p.flatsSold;
    basicStatCPs.textContent = Object.keys(cpNames).length;
  }

  /* ---------- Rendering: Detailed analytics (admin) ---------- */
  function barRow(label, rightText, pct) {
    return '<div class="bar-row"><div class="bar-row-top"><span>' + label + '</span><span>' + rightText + '</span></div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';
  }

  function renderDetailedAnalytics() {
    var total = leads.length || 1;

    // Visit status breakdown
    var statusCounts = {};
    STATUS_OPTIONS.forEach(function (s) { statusCounts[s] = 0; });
    leads.forEach(function (l) { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
    statusBreakdownEl.innerHTML = STATUS_OPTIONS.map(function (s) {
      var count = statusCounts[s] || 0;
      var pct = Math.round((count / total) * 100);
      return barRow(s, count + ' (' + pct + '%)', pct);
    }).join('');

    // Configuration split
    configBreakdownEl.innerHTML = CONFIG_OPTIONS.map(function (c) {
      var count = leads.filter(function (l) { return l.config === c; }).length;
      var pct = Math.round((count / total) * 100);
      return barRow(c, count + ' (' + pct + '%)', pct);
    }).join('');

    // Revenue by configuration (aggregate Cr only — never a per-unit price)
    var revByConfig = CONFIG_OPTIONS.map(function (c) {
      return { config: c, revenue: leads.filter(function (l) { return l.config === c && l.status === 'Booked'; }).reduce(function (s, l) { return s + (Number(l.saleValue) || 0); }, 0) };
    });
    var maxRev = Math.max.apply(null, revByConfig.map(function (r) { return r.revenue; }).concat([1]));
    revenueByConfigEl.innerHTML = revByConfig.map(function (r) {
      var pct = Math.round((r.revenue / maxRev) * 100);
      return barRow(r.config, formatCr(r.revenue), pct);
    }).join('');

    // Conversion snapshot
    var bookings = leads.filter(function (l) { return l.status === 'Booked'; }).length;
    var conversion = leads.length ? Math.round((bookings / leads.length) * 100) : 0;
    conversionRateEl.textContent = conversion + '%';

    var cpNames = {};
    leads.forEach(function (l) { cpNames[l.cpName] = true; });
    var cpCount = Object.keys(cpNames).length;
    activeCpCountEl.textContent = cpCount;
    avgLeadsPerCpEl.textContent = cpCount ? (leads.length / cpCount).toFixed(1) : '0';

    // Lead status funnel: Total Leads -> Visited -> Booked
    var totalLeads = leads.length;
    var visited = leads.filter(function (l) { return l.status !== 'Visit Scheduled'; }).length;
    var booked = bookings;
    var r1 = totalLeads ? Math.round((visited / totalLeads) * 100) : 0;
    var r2 = visited ? Math.round((booked / visited) * 100) : 0;
    leadFunnelEl.innerHTML =
      '<div class="funnel-row">' +
        '<div class="funnel-step"><strong>' + totalLeads + '</strong><span>Total Leads</span></div>' +
        '<div class="funnel-arrow">&#8594;<small>' + r1 + '%</small></div>' +
        '<div class="funnel-step"><strong>' + visited + '</strong><span>Visited</span></div>' +
        '<div class="funnel-arrow">&#8594;<small>' + r2 + '%</small></div>' +
        '<div class="funnel-step funnel-step--gold"><strong>' + booked + '</strong><span>Booked</span></div>' +
      '</div>';

    // PROP CP performance ranking table
    var cpStats = getCPStats();
    if (cpStats.length === 0) {
      cpRankingBodyEl.innerHTML = '<tr><td colspan="6" class="empty-state">No PROP CPs tracked yet.</td></tr>';
    } else {
      cpRankingBodyEl.innerHTML = cpStats.map(function (cp, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(cp.name) + '</td><td>' + cp.totalLeads + '</td>' +
          '<td>' + cp.bookings + '</td><td>' + cp.conversion + '%</td><td>' + formatCr(cp.totalSales) + '</td></tr>';
      }).join('');
    }
  }

  /* ---------- Rendering: Lead table ---------- */
  function renderLeadTable() {
    var filtered = getFilteredLeads();
    leadTableBody.innerHTML = '';

    var isFiltered = filtered.length !== leads.length;
    leadCountBadge.textContent = isFiltered
      ? filtered.length + ' of ' + leads.length + ' leads'
      : leads.length + (leads.length === 1 ? ' lead' : ' leads');

    emptyState.hidden = filtered.length !== 0;
    emptyState.textContent = leads.length === 0
      ? 'No leads yet. Use the form above to register a PROP CP site visit.'
      : 'No leads match your search or filter.';

    var latest = getLatestBooking();

    filtered.slice().reverse().forEach(function (lead) {
      var tr = document.createElement('tr');
      tr.dataset.id = lead.id;
      var isLatest = !!(latest && latest.id === lead.id);
      if (isLatest) tr.classList.add('is-latest');

      tr.innerHTML =
        '<td data-label="Customer"><span class="cust-name">' + escapeHtml(lead.name) +
          (isLatest ? '<span class="latest-tag">Latest Booking</span>' : '') +
          '<small>' + escapeHtml(lead.config) + '</small></span></td>' +
        '<td data-label="Phone">' + escapeHtml(lead.phone) + '</td>' +
        '<td data-label="Configuration">' + escapeHtml(lead.config) + '</td>' +
        '<td data-label="PROP CP">' + escapeHtml(lead.cpName) + '</td>' +
        '<td data-label="Visit Date">' + formatDate(lead.visitDate) + '</td>' +
        '<td data-label="Status"></td>' +
        '<td data-label="Sale Value (Cr)"></td>' +
        '<td data-label="Actions"><button type="button" class="delete-btn" title="Delete lead">&#128465;</button></td>';

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

  /* ---------- Rendering: Stats (admin) ---------- */
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

  /* ---------- Rendering: Leaderboard (admin) ---------- */
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
    renderDonut();
    renderHighlights();
    renderBasicAnalytics();
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

  /* ---------- Excel export (admin only) ---------- */
  function exportToExcel() {
    if (typeof XLSX === 'undefined') {
      showToast('Export library failed to load. Check your internet connection and try again.');
      return;
    }

    var leadRows = leads.map(function (l) {
      return {
        'Customer Name': l.name,
        'Phone': l.phone,
        'Configuration': l.config,
        'PROP CP': l.cpName,
        'Visit Date': formatDate(l.visitDate),
        'Status': l.status,
        'Sale Value (Cr)': l.saleValue || '',
        'Booked On': l.bookedAt ? formatDate(l.bookedAt) : ''
      };
    });

    var totalPropSales = getPropTotalSales();
    var cpStats = getCPStats();
    var cpRows = cpStats.map(function (cp) {
      return {
        'PROP CP Name': cp.name,
        'Total Leads': cp.totalLeads,
        'Bookings': cp.bookings,
        'Conversion (%)': cp.conversion,
        'Own Sales (Cr)': cp.totalSales,
        'Share of PROP Sales (%)': totalPropSales ? +((cp.totalSales / totalPropSales) * 100).toFixed(1) : 0,
        'Commission Earned (Cr)': cp.commission
      };
    });

    var p = getProgressState();
    var slab = getSlab(totalPropSales);
    var summaryRows = [
      { Metric: 'Total Leads', Value: leads.length },
      { Metric: 'Total Bookings', Value: leads.filter(function (l) { return l.status === 'Booked'; }).length },
      { Metric: 'Flats Sold', Value: p.flatsSold },
      { Metric: 'Cumulative PROP Sales (Cr)', Value: totalPropSales },
      { Metric: 'Active PROP Slab', Value: slab.label },
      { Metric: 'Total Commission Payable (Cr)', Value: +(totalPropSales * slab.rate).toFixed(2) },
      { Metric: 'Export Generated On', Value: new Date().toLocaleString('en-IN') }
    ];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leadRows), 'Leads');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cpRows), 'CP Leaderboard');
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

  if (leadSearchEl) leadSearchEl.addEventListener('input', renderLeadTable);
  if (statusFilterEl) statusFilterEl.addEventListener('change', renderLeadTable);

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

  // Lead entry form — only reachable from inside the Admin Console.
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

  /* Delegated change events for the lead table (status + sale value) */
  leadTableBody.addEventListener('change', function (e) {
    var tr = e.target.closest('tr');
    if (!tr) return;
    var lead = leads.find(function (l) { return l.id === tr.dataset.id; });
    if (!lead) return;

    if (e.target.classList.contains('status-select')) {
      lead.status = e.target.value;
      if (lead.status === 'Booked') {
        if (!lead.bookedAt) lead.bookedAt = new Date().toISOString();
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

  /* Delegated click events for the lead table (delete) */
  leadTableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('.delete-btn');
    if (!btn) return;
    var tr = btn.closest('tr');
    var lead = leads.find(function (l) { return l.id === tr.dataset.id; });
    if (!lead) return;
    var ok = window.confirm('Delete the lead for ' + lead.name + ' (' + lead.cpName + ')? This cannot be undone.');
    if (!ok) return;
    leads = leads.filter(function (l) { return l.id !== lead.id; });
    saveLeads();
    renderAll();
    showToast('Lead deleted.');
  });

  /* ---------- Init ---------- */
  loadLeads();
  refreshAuthUI();
  $('year').textContent = new Date().getFullYear();
  renderMotivation();
  renderAll();   // public widgets must be live even before any admin login
  showPublic();
})();
