# Shubh Tristar — CP & Lead Tracking Dashboard

A premium, vanilla HTML/CSS/JS dashboard for managing PROP Channel Partner (CP) leads, site visits, bookings, and brokerage commissions for the Shubh Tristar Skyvilla project.

## Files

| File | Purpose |
|---|---|
| `index.html` | Structural markup — public PROP Hub + Admin Console + login modal |
| `styles.css` | Premium navy/gold theme, layout, responsive rules |
| `app.js` | All state, business logic, rendering, and `localStorage` persistence |

No build tools, frameworks, or dependencies. Just open `index.html` in a browser.

## Hosting on GitHub Pages

1. Push these 4 files to the root of a GitHub repository (e.g. `shubh-tristar-dashboard`).
2. Go to **Settings → Pages**.
3. Under "Build and deployment", set **Source: Deploy from a branch**, branch: `main`, folder: `/ (root)`.
4. Save — your site will be live at `https://<your-username>.github.io/<repo-name>/` within a minute.

## Demo Admin Credentials

```
Username: admin
Password: admin123
```

This is a front-end simulation only (credentials live in `app.js`). It is **not** secure for real production use — for a live deployment, replace this with a real backend/auth provider.

## How It Works

### 1. Public Home Page
Open to everyone, no login required. Shows:
- The PROP brokerage offer banner (4% / 5% slabs).
- A **Cumulative PROP Sales** widget — a live, public-facing total of every booked sale recorded across all PROP CPs, with a badge showing the brokerage slab currently active project-wide, and a meter marking the ₹35 Cr / ₹50 Cr thresholds.

There is **no entry form on the public page**. Site visits are logged only by Admin, inside the Admin Console.

### 2. Admin Console
Hidden until login. Once authenticated (`admin` / `admin123`), the "Admin Console" nav link appears and unlocks:
- **Register New PROP CP Visit** — the customer entry form (Customer Name, Phone, Configuration, PROP CP Name, Visit Date & Time). This is now an admin-only action.
- **Stat cards** — total leads, total bookings, cumulative PROP sales, total commission payable.
- **Lead Management table** — every submitted entry, with an editable **Visit Status** dropdown (`Visit Scheduled`, `Visit Conducted`, `Follow-up`, `Not Interested`, `Booked`).
- **Sale Value input** — enabled only when a lead's status is set to `Booked`. Entering a value (in Cr) records that booking's revenue.
- **PROP CP Leaderboard** — per-CP breakdown of leads, bookings, own sales, share of total PROP sales, and commission earned.

### 3. Brokerage / Slab Calculation Logic — PROP-wide, not per CP
This is the core business rule: **the offer belongs to PROP (the project), not to any individual CP.**

1. The app sums the `saleValue` of every lead across **every CP combined** whose status is `Booked`. This is the single **cumulative PROP sales** figure shown on the home page and in the Admin Console.
2. That one project-wide figure decides the **one slab** that applies to everyone:

   | Cumulative PROP Sales | Brokerage Slab |
   |---|---|
   | < ₹35 Cr | Not Qualified (0%) |
   | ≥ ₹35 Cr | 4% |
   | ≥ ₹50 Cr | 5% |

3. Each CP still earns commission only on **their own** booked sales, but always at the **current PROP-wide rate**:

   ```
   propTotalSales = SUM(saleValue) for all Booked leads, across all CPs
   propSlab       = getSlab(propTotalSales)        // one slab for everyone
   cpCommission   = cpOwnBookedSales × propSlab.rate
   ```

   So if PROP's combined sales cross ₹50 Cr, every CP's commission jumps to 5% on their own bookings — even a CP whose own sales are small benefits once PROP as a whole crosses a threshold.

This logic lives in `getSlab()`, `getPropTotalSales()`, and `getCPStats()` in `app.js`. The leaderboard panel header also shows a single slab badge (the current PROP-wide rate), and each CP card shows a contribution bar (their % share of total PROP sales) instead of an individual slab — there is no per-CP slab anymore.

### 4. State & Persistence
- All leads are stored under `localStorage` key `st_cp_leads_v1` as a JSON array.
- The app seeds 4 realistic mock entries on first load (two already booked, two still in the pipeline), so the dashboard never looks empty.
- Admin login state is stored in `sessionStorage` (`st_admin_session_v1`), so it persists across refreshes within the same browser tab/session but resets when the tab/browser is closed.
- Every mutation (new lead, status change, sale value entry) immediately writes back to `localStorage`, and the public Cumulative PROP Sales widget reflects it instantly — a refresh never loses data.

## Customization

- **Colors / fonts** — all defined as CSS variables at the top of `styles.css` (`--navy-900`, `--gold`, `--font-display`, `--font-body`, etc.).
- **Slab thresholds/rates** — change `SLAB1_THRESHOLD`, `SLAB2_THRESHOLD`, `SLAB1_RATE`, `SLAB2_RATE` constants at the top of `app.js`.
- **Status options** — edit the `STATUS_OPTIONS` array in `app.js`; the corresponding color styling can be added in `styles.css` under `.status-select[data-status="..."]`.
- **Reset demo data** — open browser DevTools console and run `localStorage.removeItem('st_cp_leads_v1')`, then refresh.
