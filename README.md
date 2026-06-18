# Shubh Tristar — PROP CP & Lead Tracking Dashboard

A premium, vanilla HTML/CSS/JS dashboard for managing PROP Channel Partner (CP) leads, site visits, bookings, and brokerage commissions for the Shubh Tristar Skyvilla project.

## Files

| File | Purpose |
|---|---|
| `index.html` | Structural markup — public PROP Hub + Admin Console + login modal |
| `styles.css` | Navy/gold theme, layout, responsive rules |
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

## Public Home Page — single screen on desktop

The home page is laid out to fit entirely within one screen on typical desktop/laptop viewports — no scrolling required to see the offers, the live target chart, the latest booking, the top CPs, and the basic stats all at once. Tested with zero overflow at 1920×1080, 1440×900, 1366×768, 1280×720, and even a tight 1280×600.

**Honest caveat:** below ~980px width (tablets and phones), the page intentionally reverts to a normal stacked, scrollable layout. True no-scroll isn't physically achievable on a small phone screen with this much content without making the text illegibly tiny, so readability wins on small devices — this is a deliberate trade-off, not an oversight.

- **Hero (two columns):** Brokerage offer cards (4% / 5%) on the **left**; a live **target-progress donut chart** on the **right**.
- **Target donut chart:** Tracks progress toward **₹35 Cr (17 Flats)** first. The moment PROP's cumulative sales cross ₹35 Cr, the *same* donut automatically re-targets to **₹50 Cr (24 Flats)** — no separate chart, no reset. The slab badge under the chart only appears once a slab is actually unlocked ("4% PROP Slab" / "5% PROP Slab") — it stays hidden rather than showing "Not Qualified" before that point, since this is the public-facing view. No per-unit pricing is ever shown anywhere — only total revenue and flat counts.
- **Daily motivation banner:** A rotating motivational line for PROP CPs, changing once per day (deterministic by day-of-year).
- **Latest Booking spotlight:** Highlights the PROP CP firm behind the most recent booking.
- **Top Performing PROP CPs:** Public top-3 leaderboard (🥇🥈🥉), now showing each CP's **total sales value and number of bookings** side-by-side. Commission figures stay admin-only.
- **Basic Analytics:** Total Site Visits, Total Bookings, Flats Sold, Active PROP CPs — public, non-sensitive numbers, each with a small icon for quick scanning.

There is **no entry form on the public page** — visits are logged only by Admin inside the Admin Console.

## Admin Console

Hidden until login (`admin` / `admin123`):

- **Export to Excel** — downloads a 3-sheet workbook: `Summary`, `Leads`, and `CP Leaderboard` (now including a Conversion % column).
- **Stat cards** — total leads, bookings, cumulative PROP sales, total commission payable.
- **Detailed Analytics** (expanded this round):
  - Visit Status Breakdown and Configuration Split (bar charts)
  - **Revenue by Configuration** — aggregate booked ₹ Cr per configuration (never a per-unit price)
  - Conversion Snapshot (conversion rate, active CP count, average leads per CP)
  - **Lead Status Funnel** — Total Leads → Visited → Booked, with retention % at each stage
  - **PROP CP Performance Ranking table** — rank, leads, bookings, conversion %, and sales per CP
  - The admin leaderboard's slab badge still shows the literal "Not Qualified" state when applicable — this internal-only view is meant to be precise, unlike the public donut.
- **Register New PROP CP Visit** — the customer entry form (Customer Name, Phone, Configuration, PROP CP Name, Visit Date & Time).
- **Lead Management table** — now with a **search box** (matches customer or CP name) and a **status filter dropdown** above the table, plus a **delete** action per row (with a confirmation prompt). The lead count badge shows "X of Y leads" while a filter is active.
- **PROP CP Leaderboard** — per-CP leads, bookings, own sales, share of total PROP sales, and commission earned.

## Configuration Options

The 3 BHK Skyvilla now has **two carpet-area variants**, matching the actual unit mix:

- 3 BHK Skyvilla (1268 sq.ft)
- 3 BHK Skyvilla (1298 sq.ft)
- 4 BHK Skyvilla

These appear in the entry form, the Configuration Split chart, the new Revenue by Configuration chart, and the Excel export — with no per-unit price ever displayed.

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

- ₹35 Cr ⇔ 17 Flats
- ₹50 Cr ⇔ 24 Flats

`FLATS_TARGET_1` / `FLATS_TARGET_2` in `app.js` hold these constants. "Flats Sold" / "bookings" both simply count leads with status `Booked` — one booking is one flat, regardless of whether its sale value has been entered yet (see bug fix below).

## Bug Fix This Round

Previously, a CP's `bookings` count only incremented when a lead's status was `Booked` **and** it already had a sale value entered. This meant a freshly-booked lead (status changed to `Booked`, but the sale value not yet typed in) would count toward "Flats Sold" and the admin status breakdown, but would **not** show up in the CP's bookings count, the Top Performing CPs list, or the CP ranking table — an inconsistency. Fixed so that `bookings` increments for any `status === 'Booked'` lead regardless of sale value; the revenue sum is unaffected (an unentered sale value still contributes ₹0 until filled in).

## State & Persistence

- All leads are stored under `localStorage` key `st_cp_leads_v1` as a JSON array. Seeded with 4 realistic mock entries on first load.
- A lead's `bookedAt` timestamp is set automatically the moment its status is changed to `Booked` (and cleared if changed away) — this drives the "Latest Booking" spotlight.
- Admin login state lives in `sessionStorage` (`st_admin_session_v1`).
- Every mutation immediately re-renders all public and admin widgets.

## Customization

- **Colors / fonts** — CSS variables at the top of `styles.css`.
- **Slab thresholds/rates/flats** — `SLAB1_THRESHOLD`, `SLAB2_THRESHOLD`, `SLAB1_RATE`, `SLAB2_RATE`, `FLATS_TARGET_1`, `FLATS_TARGET_2` in `app.js`.
- **Motivation quotes** — edit the `MOTIVATION_QUOTES` array in `app.js`.
- **Status / configuration options** — `STATUS_OPTIONS` / `CONFIG_OPTIONS` arrays in `app.js` (keep the matching `<option>` list in `index.html`'s `#config` select in sync, and add a matching `.status-select[data-status="..."]` CSS rule if you add a new status color).
- **Reset demo data** — in the browser console: `localStorage.removeItem('st_cp_leads_v1')`, then refresh.
