# Shubh Tristar — PROP CP & Lead Tracking Dashboard

A premium, vanilla HTML/CSS/JS dashboard for managing PROP Channel Partner (CP) leads, site visits, bookings, and brokerage commissions for the Shubh Tristar Skyvilla project.

## Files

| File | Purpose |
|---|---|
| `index.html` | Structural markup — public PROP Hub + Admin Console + login modal |
| `styles.css` | Premium navy/gold theme, layout, responsive rules |
| `app.js` | All state, business logic, rendering, and `localStorage` persistence |

No build tools or frameworks. The only external dependency is the [SheetJS](https://sheetjs.com) library, loaded via CDN, used solely for the Admin "Export to Excel" feature.

## Hosting on GitHub Pages

1. Push these 3 files to the root of a GitHub repository.
2. Go to **Settings → Pages**.
3. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Your site goes live at `https://<your-username>.github.io/<repo-name>/`.

## Demo Admin Credentials

```
Username: admin
Password: admin123
```

Front-end simulation only — not secure for real production use. For a live deployment, replace with a real backend/auth provider.

## Public Home Page

- **Hero (two columns):** Brokerage offer cards (4% / 5%) on the **left**; a live **target-progress donut chart** on the **right**.
- **Target donut chart:** Starts by tracking progress toward **₹35 Cr (17 Flats)**. The moment PROP's cumulative sales cross ₹35 Cr, the *same* donut automatically re-targets to **₹50 Cr (24 Flats)** — no separate chart, no reset. Center shows live percentage, current vs. target revenue, the active slab badge, and the flats-sold count. No per-unit pricing is ever shown anywhere — only total revenue and flat counts.
- **Daily motivation banner:** A rotating motivational line for PROP CPs that changes once every day (deterministic by day-of-year, not random on every page load — everyone sees the same line on a given day).
- **Latest Booking spotlight:** Highlights the PROP CP firm behind the most recent booking, with a trophy callout. The same lead is also tagged "Latest Booking" in the Admin lead table.
- **Top Performing PROP CPs:** Public top-3 leaderboard (🥇🥈🥉) ranked by total booked sales — commission figures stay admin-only.
- **Basic Analytics:** Total Site Visits, Total Bookings, Flats Sold, Active PROP CPs — public, non-sensitive numbers.

There is **no entry form on the public page** — visits are logged only by Admin inside the Admin Console.

## Admin Console

Hidden until login (`admin` / `admin123`):

- **Export to Excel** button (top of console) — downloads a 3-sheet workbook: `Summary` (totals, active slab, commission payable), `Leads` (every entry with status/sale value/booking date), and `CP Leaderboard` (per-CP leads, bookings, sales, share %, commission).
- **Stat cards** — total leads, bookings, cumulative PROP sales, total commission payable.
- **Detailed Analytics** — Visit Status breakdown (bar chart), Configuration split (3 BHK vs 4 BHK), and a Conversion Snapshot (conversion rate, active CP count, average leads per CP).
- **Register New PROP CP Visit** — the customer entry form (Customer Name, Phone, Configuration, PROP CP Name, Visit Date & Time).
- **Lead Management table** — editable Visit Status (`Visit Scheduled`, `Visit Conducted`, `Follow-up`, `Not Interested`, `Booked`) and a Sale Value (Cr) input that unlocks only when status is `Booked`. The most recent booking is highlighted in the table.
- **PROP CP Leaderboard** — per-CP leads, bookings, own sales, share of total PROP sales, and commission earned, plus the single PROP-wide slab badge that applies to everyone.

## Brokerage / Slab Calculation Logic — PROP-wide, not per CP

The offer belongs to **PROP (the project)**, not to any individual CP:

1. The app sums the `saleValue` of every `Booked` lead across **every CP combined** — this is the cumulative PROP sales figure.
2. That one project-wide figure decides the **one slab** that applies to everyone:

   | Cumulative PROP Sales | Brokerage Slab |
   |---|---|
   | < ₹35 Cr | Not Qualified (0%) |
   | ≥ ₹35 Cr | 4% |
   | ≥ ₹50 Cr | 5% |

3. Each CP earns commission only on **their own** booked sales, always at the **current PROP-wide rate**:

   ```
   propTotalSales = SUM(saleValue) for all Booked leads, across all CPs
   propSlab       = getSlab(propTotalSales)        // one slab for everyone
   cpCommission   = cpOwnBookedSales × propSlab.rate
   ```

This logic lives in `getSlab()`, `getPropTotalSales()`, `getProgressState()`, and `getCPStats()` in `app.js`.

## Revenue ↔ Flats Equivalence

PROP's revenue milestones are also expressed as flat-count milestones so CPs have an intuitive, non-monetary way to track progress — **no per-unit or average pricing is displayed anywhere in the UI**:

- ₹35 Cr ⇔ 17 Flats
- ₹50 Cr ⇔ 24 Flats

`FLATS_TARGET_1` / `FLATS_TARGET_2` in `app.js` hold these constants. "Flats Sold" is simply the count of leads with status `Booked` (one booking = one flat).

## State & Persistence

- All leads are stored under `localStorage` key `st_cp_leads_v1` as a JSON array. Seeded with 4 realistic mock entries on first load.
- A lead's `bookedAt` timestamp is set automatically the moment its status is changed to `Booked` (and cleared if changed away) — this drives the "Latest Booking" spotlight.
- Admin login state lives in `sessionStorage` (`st_admin_session_v1`).
- Every mutation immediately re-renders all public and admin widgets — a page refresh never loses data, and the public donut/highlights/analytics always reflect the latest state.

## Customization

- **Colors / fonts** — CSS variables at the top of `styles.css`.
- **Slab thresholds/rates/flats** — `SLAB1_THRESHOLD`, `SLAB2_THRESHOLD`, `SLAB1_RATE`, `SLAB2_RATE`, `FLATS_TARGET_1`, `FLATS_TARGET_2` in `app.js`.
- **Motivation quotes** — edit the `MOTIVATION_QUOTES` array in `app.js`; the line shown rotates by day-of-year.
- **Status / configuration options** — `STATUS_OPTIONS` / `CONFIG_OPTIONS` arrays in `app.js` (add matching `.status-select[data-status="..."]` CSS if you add a new status color).
- **Reset demo data** — in the browser console: `localStorage.removeItem('st_cp_leads_v1')`, then refresh.
