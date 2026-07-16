# FieldLab 💧

A multi-user web app for **water treatment field service data** — inspired by
AquaAnalytics-style service reporting platforms. Reps record test results
during site visits at the sites assigned to them; the app flags out-of-range
results as they type, escalates chronic problems, tracks product inventory,
trends every test over time, generates printable service reports, and shows
the whole book of business on an interactive map. Admins manage reps, assign
sites, and can drill into any rep's accounts and reports.

## Quick start (multi-user / team mode)

Requires only Node.js ≥ 16 — **no npm install, zero dependencies**.

```bash
node server.js
# → FieldLab server running at http://localhost:8080
```

Open it in a browser: the first visit walks you through creating the **admin
account**. Then, under **Admin**:
1. **+ Add user** — create an account for each rep,
2. assign sites to reps in **Site assignments** (or on each site's edit form).

Everyone signs in from their own browser/tablet/phone against the same server
and works on the same shared data. Sessions survive restarts; passwords are
scrypt-hashed; all data lives in `./data/` (gitignored — backed up with the
built-in JSON export or by copying the folder).

```bash
PORT=3000 node server.js            # custom port
FIELDLAB_DATA=/srv/fieldlab node server.js   # custom data directory
```

> For team use across a shop, run it on any always-on machine (office PC,
> NAS, $5 VPS) and put it behind HTTPS (e.g. Caddy/nginx) if it leaves your LAN.

### Hosting it online

**See [docs/DEPLOY.md](docs/DEPLOY.md)** for step-by-step guides — Railway
(easiest), Fly.io, Render, or any VPS with Docker + automatic HTTPS via
Caddy. The repo ships ready-made `Dockerfile`, `docker-compose.yml`,
`fly.toml` and `render.yaml`; every option keeps `data/` on a persistent
volume so nothing is ever lost on redeploys, and there's a `/api/health`
endpoint for platform health checks.

### Solo mode (no server)

Opening `index.html` directly (or via any static file server) still works —
the app detects there's no FieldLab server and falls back to single-user
**solo mode** with browser localStorage, exactly like v1. Great for trying it
out; the Settings → Data tab explains the difference.

First time in, click **Load demo data** on the dashboard to explore three
example sites with 14 weeks of history, or go straight to **Sites → Add Site**.

## Who sees what

| | Rep | Admin |
|---|---|---|
| Sites | only sites assigned to them (new sites they create are auto-assigned to them) | all sites, filterable by rep |
| Visits / reports | record & edit at their sites; visits filed under their name automatically | everything, plus per-rep drill-down (`Admin → rep`) |
| Test catalog (create/edit tests) | view only | yes |
| Per-site test thresholds | yes — own sites | yes |
| Templates & products | yes — shared | yes |
| Users, site assignment, backup/restore/reset | — | yes |

Scoping is enforced **server-side**: a rep's save that touches another rep's
site is rejected (HTTP 403), not just hidden in the UI.

### Concurrent editing

Every save is versioned. If two users save at once, the server merges
record-by-record (last write wins per record, deletions tombstoned) so nobody's
visit is lost; clients re-pull changes every 15 s and after every save.

## The data model (drill-down)

```
Site (customer, address, map pin, assigned rep, visit frequency)
 └─ System            — Boiler, Cooling Tower, Closed Loop… PLUS any system
     │                  type you create yourself (chiller, RO, softener, …)
     └─ Sample Point  — e.g. Makeup, Feedwater, Boiler Water, Condensate,
        │               Recirculating Water, Loop Water … (add your own)
        └─ Test       — pH, Conductivity, Sulphite, Phosphate, P/M/OH Alk,
            │           Hardness, Chloride, Iron, Free Chlorine, ORP, Cycles,
            │           Nitrite, Glycol, Dip Slides … (add your own)
            └─ Data   — one reading per visit, optional comment, flagged
                        against the expected range, trended over time
```

## Features

**Field workflow**
- One visit-entry screen per site covering every system and sample point;
  results flagged **live** as the rep types (▲ High / ▼ Low / ✓ OK); optional
  comment per reading that lands on the customer report.
- Product **stock levels** recordable per visit; low-stock alerts when a level
  hits the reorder threshold you set on the assignment.
- Printable **service reports** (Print → PDF) grouped by system/sample point
  with flags, comments, product stock, notes & recommendations, and 📈 links
  from every row to that test's trend.

**Analysis & alerts (AA-style)**
- **Trends everywhere**: full-size chart per test (expected-range band,
  out-of-range triangles, crosshair readout) + a **Trends grid** per system —
  every test as small multiples. Both scoped by a time-range filter
  (30/90 days, 6/12 months, all, custom From–To). **CSV export** per test.
- **KPIs**: % of results in range (30d) on the dashboard, per-rep KPIs in Admin.
- **Action items**: every test whose latest reading is out of range, with
  **⟲ Chronic** escalation when it's been out 3+ consecutive readings.
- **Visit schedules & completion tracking**: give each site a visit frequency
  (weekly / monthly / quarterly). Every dashboard shows **"15/25 visited this
  period"** with a progress bar; completed sites show a green **✓ Visited**
  chip, un-visited ones an orange **○ Due** chip (with days left), and the
  count resets automatically at the start of each calendar period (Monday /
  1st of the month / quarter). Admins see per-rep progress and can set
  frequencies in bulk on the assignments table.
- **Interactive map**: geocoded sites (OpenStreetMap Nominatim or manual
  coordinates); markers red for out-of-range results, orange for due-this-
  period, blue for visited/on-program.

**Customization**
- **Create your own system types** (Settings → System templates): chillers,
  RO units, softeners, waste streams — name it, add sample points, pick tests
  and expected ranges; it immediately appears in every site's "Add system" list.
- **Four thresholds per test**: an expected **Low/High** range (flags ▼ Low /
  ▲ High in orange) plus absolute **Min/Max** limits with highest priority
  (flag ‼ Below Min / ‼ Above Max in red, sorted to the top of action items,
  drawn as red limit lines on charts). All four resolve test default →
  template → per-sample-point override.
- **Per-site ranges**: every site has a 🎯 **Test ranges** page showing every
  threshold for every test at that site in one editable table — so site 1 can
  run pH 7.5–9.0 while site 2 runs 8.0–8.8. Reps adjust ranges for their own
  sites; changes re-flag history immediately.
- **Admin-only test catalog**: only admins create/edit/delete tests (enforced
  server-side); any account tunes the thresholds at its own sites.
- Templates and the product catalog remain editable by the whole team.

## Where the data lives

- **Server mode**: `data/store.json` (shared workspace), `data/users.json`
  (accounts), `data/sessions.json` (logins) — all in the server's data
  directory, never committed. JSON export/import in Settings → Data.
- **Solo mode**: browser localStorage (`fieldlab_v1`), same export/import.

## Project layout

```
server.js             zero-dependency Node server: static files, auth,
                      versioned shared store, record-level merge, rep scoping
Dockerfile,           ready-made deployment configs — see docs/DEPLOY.md
docker-compose.yml,
fly.toml, render.yaml
index.html            app shell
css/styles.css        design system (palette documented in docs/DESIGN.md)
js/api.js             server API client + auth/env/UI state
js/util.js            helpers, toasts, modals, time-range filters
js/defaults.js        default test catalog, templates, products, demo data
js/store.js           data layer: sync (server/solo), CRUD, ranges, flags,
                      chronic streaks, overdue, inventory, KPIs
js/geocode.js         OpenStreetMap Nominatim address lookup
js/chart.js           SVG trend chart (full + compact small-multiple modes)
js/views/login.js     sign-in & first-run admin setup
js/views/core.js      dashboard, sites list, site form, rep filter
js/views/site.js      site detail, system detail, test history + CSV
js/views/visit.js     visit entry (with product levels) + service report
js/views/trends.js    per-system trends grid (small multiples)
js/views/map.js       Leaflet site map with status markers
js/views/admin.js     rep overview, per-rep drill-down, user management
js/views/settings.js  tests / system types & templates / products / data
js/app.js             boot, auth flow, router, background sync
```

## Default control limits

The bundled defaults are typical industrial guidelines (e.g. boiler water pH
10.5–12.0, sulphite 20–60 ppm, phosphate 30–60 ppm; cooling water pH 7.5–9.0,
free chlorine 0.5–1.0 ppm, dip slides ≤ 10⁴ CFU/mL; closed loop nitrite
500–1000 ppm). **They are starting points, not a treatment program** — always
set limits per site/system according to your program design, boiler pressure,
metallurgy and local regulations.
