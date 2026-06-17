# Shubh Tristar — CP & Lead Tracking Dashboard

A premium, vanilla HTML/CSS/JS dashboard for managing Channel Partner (CP) leads, site visits, bookings, and brokerage commissions for the Shubh Tristar Skyvilla project.

## Files

| File | Purpose |
|---|---|
| `index.html` | Structural markup — public CP Hub + Admin Console + login modal |
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

### 1. Public Home Page (CP Hub)
Open to everyone. Shows the brokerage offer banner and the **Customer Entry Form**, which any CP/agent can use to log a new site visit. Submitted entries are pushed into the shared `leads` array and saved to `localStorage` immediately — they don't require admin login to be recorded.

### 2. Admin Console
Hidden until login. Once authenticated (`admin` / `admin123`), the "Admin Console" nav link appears and unlocks:
- **Stat cards** — total leads, total bookings, total booked sale value, total commission payable.
- **Lead Management table** — every submitted entry, with an editable **Visit Status** dropdown (`Visit Scheduled`, `Visit Conducted`, `Follow-up`, `Not Interested`, `Booked`).
- **Sale Value input** — enabled only when a lead's status is set to `Booked`. Entering a value (in Cr) records that booking's revenue.
- **CP Leaderboard** — auto-aggregated per CP, sorted by total sales.

### 3. Brokerage / Slab Calculation Logic
For each Channel Partner, the app sums the `saleValue` of every lead whose status is `Booked`. That cumulative total determines the active brokerage slab:

| Cumulative Booked Sales | Brokerage Slab |
|---|---|
| < ₹35 Cr | Not Qualified (0%) |
| ≥ ₹35 Cr | 4% |
| ≥ ₹50 Cr | 5% |

```
commission = cumulativeBookedSales × slabRate
```

The slab logic lives in `getSlab()` in `app.js`, and per-CP aggregation happens in `getCPStats()`. Each CP card on the leaderboard also renders a **slab meter** — a visual bar with markers at ₹35 Cr and ₹50 Cr showing exactly where that CP's cumulative sales sit relative to both thresholds.

### 4. State & Persistence
- All leads are stored under `localStorage` key `st_cp_leads_v1` as a JSON array.
- The app seeds 4 realistic mock entries (two already booked, demonstrating both the 4% and 5% slabs; two still in the pipeline) on first load, so the dashboard never looks empty.
- Admin login state is stored in `sessionStorage` (`st_admin_session_v1`), so it persists across refreshes within the same browser tab/session but resets when the tab/browser is closed — a reasonable simulation of a login session.
- Every mutation (new lead, status change, sale value entry) immediately writes back to `localStorage`, so a page refresh never loses data.

## Customization

- **Colors / fonts** — all defined as CSS variables at the top of `styles.css` (`--navy-900`, `--gold`, `--font-display`, `--font-body`, etc.).
- **Slab thresholds/rates** — change `SLAB1_THRESHOLD`, `SLAB2_THRESHOLD`, `SLAB1_RATE`, `SLAB2_RATE` constants at the top of `app.js`.
- **Status options** — edit the `STATUS_OPTIONS` array in `app.js`; the corresponding color styling can be added in `styles.css` under `.status-select[data-status="..."]`.
- **Reset demo data** — open browser DevTools console and run `localStorage.removeItem('st_cp_leads_v1')`, then refresh.
