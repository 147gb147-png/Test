# AquaTrack 💧

A self-contained web app for **water treatment field service data** — inspired by
AquaAnalytics-style service reporting platforms. Reps record test results during
site visits; the app flags out-of-range results, trends every test over time,
generates printable service reports, and shows all customer sites on an
interactive map.

## Quick start

No build step, no server, no dependencies to install.

```bash
# option 1 — just open it
open index.html            # macOS
xdg-open index.html        # Linux

# option 2 — serve it (recommended)
python3 -m http.server 8000
# then browse to http://localhost:8000
```

> The map (Leaflet/OpenStreetMap) and address geocoding need an internet
> connection; everything else works fully offline.

First time in, click **Load demo data** on the dashboard to explore with three
example sites, or go straight to **Sites → Add Site**.

## The data model (drill-down)

```
Site (customer, address, map pin)
 └─ System            — Boiler and/or Cooling Tower (extensible via templates)
     └─ Sample Point  — e.g. Makeup, Feedwater, Boiler Water, Condensate,
        │               Recirculating Water … (add your own)
        └─ Test       — e.g. pH, Conductivity, Sulphite, Phosphate, P/M/OH
            │           Alkalinity, Hardness, Chloride, Iron, Free Chlorine,
            │           ORP, Cycles, Dip Slides … (add your own)
            └─ Data   — one reading per visit, with optional comment,
                        flagged against the expected range, trended over time
```

## Features

- **Visit entry built for the field** — one screen per visit covering every
  system and sample point at the site; results are flagged **live** as you type
  (▲ High / ▼ Low / ✓ OK); every reading can carry an optional comment that
  appears on the customer report.
- **Expected ranges at three levels** — a default range per test, a range per
  sample point in the system *templates* (what new systems start with), and a
  per-sample-point override on any existing system. History is always evaluated
  against the current range.
- **Trends** — every test at every sample point gets a chart with the expected
  range shown as a band, out-of-range points marked, and a hover readout with
  date, value, status and the rep's comment. A full reading table sits below
  every chart.
- **Service reports** — each visit renders as a printable report (Print/PDF
  button) grouped by system and sample point, including flags, comments and
  your visit notes/recommendations.
- **Action items** — the dashboard and each site page list every test whose
  *latest* reading is out of range across your whole book of business.
- **Interactive map** — every site with an address can be geocoded (free
  OpenStreetMap Nominatim, ~1 request/second) or given manual coordinates.
  Markers turn red when a site has out-of-range results.
- **Products** — keep your product catalog in Settings and assign products with
  a feed target to each system; they appear on the system page.
- **Fully customizable** — Settings lets you:
  - add/edit/delete **tests** (name, unit, decimals, default range),
  - reshape the **Boiler / Cooling Tower templates** (sample points, tests,
    template-level expected ranges),
  - manage **products**,
  - set company name & default rep (report header / visit prefill).
- **Backup / restore** — one-click JSON export and import (also the way to move
  data between devices or share it).

## Where the data lives

All data is stored in the browser's `localStorage` under the key
`aquatrack_v1` — private to the machine/browser/profile you use. Export a JSON
backup regularly from **Settings → Data & general**.

This is deliberately the simplest possible deployment (a folder of static
files). If you later want multi-user sync, the storage layer is isolated in
`js/store.js` — swapping `localStorage` for a small REST API is the only change
needed.

## Project layout

```
index.html            app shell + script/style includes
css/styles.css        design system (palette documented in docs/DESIGN.md)
js/util.js            DOM/format helpers, toasts, modals
js/defaults.js        default test catalog, system templates, products, demo data
js/store.js           data layer: persistence, CRUD, ranges, flags, histories
js/geocode.js         OpenStreetMap Nominatim address lookup
js/chart.js           SVG trend chart (range band, flags, crosshair tooltip)
js/views/core.js      dashboard, sites list, site form
js/views/site.js      site detail, system detail, test history
js/views/visit.js     visit entry form + printable service report
js/views/map.js       Leaflet site map
js/views/settings.js  tests / templates / products / data management
js/app.js             hash router & bootstrap
```

## Default control limits

The bundled defaults are typical industrial guidelines (e.g. boiler water pH
10.5–12.0, sulphite 20–60 ppm, phosphate 30–60 ppm; cooling water pH 7.5–9.0,
free chlorine 0.5–1.0 ppm, dip slides ≤ 10⁴ CFU/mL). **They are starting points,
not a treatment program** — always set limits per site/system according to your
program design, boiler pressure, metallurgy and local regulations.
