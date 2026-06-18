# Shubh Tristar — CP & Lead Tracking Dashboard

A premium, vanilla HTML/CSS/JS dashboard for managing PROP Channel Partner (CP) leads, site visits, bookings, and brokerage commissions for the Shubh Tristar Skyvilla project.

## Files

| File | Purpose |
|---|---|
| `index.html` | Structural markup — public PROP Hub + Admin Console + login modal |
| `styles.css` | Premium navy/gold theme, layout, responsive rules |
| `app.js` | All state, business logic, rendering, and `localStorage` persistence |

No build tools or frameworks. The only external dependency is [SheetJS](https://sheetjs.com) (`xlsx.full.min.js`), loaded from its CDN purely to power the Admin Console's **Export as Excel** button — everything else is plain JS.

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

Front-end simulation only (credentials live in `app.js`) — **not** secure for real production use. For a live deployment, replace this with a real backend/auth provider.

## What's on the Home Page (Public)

- **Hero, two columns** — brokerage offers (4% / 5%) on the left, with each slab labelled by its flat-count equivalent (₹35 Cr → 17 Flats, ₹50 Cr → 24 Flats). On the right, a donut chart shows the percentage of the ₹50 Cr target completed so far. No per-unit/carpet pricing is shown or referenced anywhere in the app.
- **Daily motivation strip** — a short, encouraging line for CPs that automatically rotates once every day (picked deterministically from the current date, so it's stable all day and changes the next day).
- **Cumulative PROP Sales card** — the live total of every `Booked` sale across all CPs, the currently active brokerage slab badge, and a progress meter marked at the 17-flat and 24-flat milestones.
- **Highlights** — the PROP CP firm behind the most recent booking (by the actual time it was marked Booked, not the visit date), and a top-3 leaderboard of the best-performing CPs by total sales.
- **PROP Performance Snapshot** — basic public analytics: total leads, total bookings, flats sold, and conversion rate.

## Admin Console (after login)

- **Export as Excel** — one click downloads a `.xlsx` workbook with three sheets: `PROP Summary` (top-line figures), `Leads` (every entry with status/sale value/booked date), and `CP Leaderboard` (per-CP totals and commission).
- **Register New PROP CP Visit** — the customer entry form (moved here from the public page; only Admin can log new visits).
- **Stat cards, Lead Management table, PROP CP Leaderboard** — as before, with status tagging and sale-value capture.
- **Detailed Analytics** — a visit-status breakdown (with proportion bars) and a configuration-wise performance split (3 BHK vs 4 BHK Skyvilla: leads, bookings, revenue).

## Brokerage / Slab Calculation Logic — PROP-wide, not per CP

The core business rule: **the offer belongs to PROP (the project), not to any individual CP.**

1. The app sums the `saleValue` of every lead across **every CP combined** whose status is `Booked`. This is the single **cumulative PROP sales** figure shown on the home page and in the Admin Console.
2. That one project-wide figure decides the **one slab** that applies to everyone:

   | Cumulative PROP Sales | Flats Equivalent | Brokerage Slab |
   |---|---|---|
   | < ₹35 Cr | < 17 Flats | Not Qualified (0%) |
   | ≥ ₹35 Cr | ≥ 17 Flats | 4% |
   | ≥ ₹50 Cr | ≥ 24 Flats | 5% |

3. Each CP still earns commission only on **their own** booked sales, but always at the **current PROP-wide rate**:

   ```
   propTotalSales = SUM(saleValue) for all Booked leads, across all CPs
   propSlab       = getSlab(propTotalSales)        // one slab for everyone
   cpCommission   = cpOwnBookedSales × propSlab.rate
   ```

   So if PROP's combined sales cross ₹50 Cr, every CP's commission jumps to 5% on their own bookings — even a CP whose own sales are small benefits once PROP as a whole crosses a threshold.

The flat-count figures (17 and 24) are fixed business inputs supplied for the two revenue thresholds; the app does not store, display, or derive any per-unit/carpet pricing — "Flats Sold" on the dashboard is simply a count of leads marked `Booked` (one booking = one flat), so no pricing assumption is ever needed or shown.

This logic lives in `getSlab()`, `getPropTotalSales()`, and `getCPStats()` in `app.js`.

## State & Persistence

- All leads are stored under `localStorage` key `st_cp_leads_v1` as a JSON array, including a `bookedAt` timestamp captured the moment a lead is marked `Booked` (used to determine the "Latest Booking" highlight).
- The app seeds 4 realistic mock entries on first load (two already booked, two still in the pipeline), so the dashboard never looks empty.
- Admin login state is stored in `sessionStorage` (`st_admin_session_v1`) — persists across refreshes within the same tab/session, resets when the tab/browser closes.
- Every mutation (new lead, status change, sale value entry) immediately writes back to `localStorage`, and every public widget (donut, cumulative card, highlights, snapshot) reflects it instantly — a refresh never loses data.

## Customization

- **Colors / fonts** — CSS variables at the top of `styles.css` (`--navy-900`, `--gold`, `--font-display`, `--font-body`, etc.).
- **Slab thresholds/rates/flat targets** — `SLAB1_THRESHOLD`, `SLAB2_THRESHOLD`, `SLAB1_FLATS`, `SLAB2_FLATS`, `SLAB1_RATE`, `SLAB2_RATE` constants at the top of `app.js`.
- **Motivation quotes** — edit the `MOTIVATION_QUOTES` array in `app.js`; it rotates by calendar day automatically.
- **Status options** — edit `STATUS_OPTIONS`; matching color styling lives in `styles.css` under `.status-select[data-status="..."]`.
- **Reset demo data** — open DevTools console and run `localStorage.removeItem('st_cp_leads_v1')`, then refresh.
