# AquaTrack — design notes

## Palette

The UI and charts use the validated brand-neutral reference palette:

| Role | Hex |
|---|---|
| Page plane | `#f9f9f7` |
| Surface | `#fcfcfb` |
| Primary ink | `#0b0b0b` |
| Secondary ink | `#52514e` |
| Muted (axis/labels) | `#898781` |
| Gridline | `#e1e0d9` |
| Baseline/axis | `#c3c2b7` |
| Series (single) | `#2a78d6` (blue) |
| Status good | `#0ca30c` (text variant `#006300`) |
| Status critical | `#d03b3b` |
| Status warning | `#fab219` (reserved, unused so far) |

## Chart rules applied (js/chart.js)

- **One series per chart** (a test at a sample point) → no legend box; the page
  heading names what is plotted.
- The expected range is a **band** (status-good at 8 % opacity) with labeled
  min/max hairlines — state is labeled, never color-alone.
- **Out-of-range points are triangles** (▲ above max, ▼ below min) in status
  critical, with a 2 px surface ring; in-range points are 8 px circles in the
  series blue. Shape + position carry the state redundantly with color.
- 2 px line, round joins; hairline solid gridlines; muted tabular-num ticks.
- **Crosshair + tooltip**: pointer snaps to the nearest visit; the tooltip leads
  with the value, then status text and any rep comment. Tooltip content is
  inserted via `textContent` (comments are user data).
- Every charted value is also in the **readings table** below the chart, so the
  tooltip enhances but never gates.
- Status chips throughout the app pair an icon/word with the color
  (▲ High / ▼ Low / ✓ OK) — never color alone.

The app ships a fixed light theme; the palette table above is the single place
to swap in brand colors (mirrored as CSS custom properties in
`css/styles.css`).

## Time-range filters & trends grid

- One **filter row above the charts it scopes** (chips: 30d / 90d / 6m / 12m /
  all / custom From–To). Everything below it — stats tiles, chart, readings
  table — re-renders against the same slice, so the numbers always agree.
- The per-system **trends grid** uses the same chart renderer in `compact`
  mode (smaller geometry, 3 y-ticks, 3 x-ticks) — same marks, same band, same
  tooltip; each cell's title links to the full history page.

## Status vocabulary (never color-alone)

| State | Chip | Where |
|---|---|---|
| In range | `✓ OK` (good) | everywhere |
| Above max / below min | `▲ High` / `▼ Low` (critical) | entry, reports, tables, charts (as triangles) |
| Chronic (3+ consecutive out) | `⟲ Chronic` (critical, filled) | action items, history header |
| Low product stock | `▼ Low stock` (critical) | inventory, action items |
| Visit overdue | `▼ Overdue` chip · orange `#ec835a` marker | sites list, site page, map |

Map legend pairs each marker color with a text label; popups repeat the
status in words.

## Multi-user sync (server mode)

Docs are versioned; each record carries `_ts` and deletions are tombstoned so
the server can merge concurrent saves record-by-record (LWW). Reps' writes are
validated server-side against their base version: anything touching a site not
assigned to them is rejected with 403. Clients pull every 15 s and adopt
merged docs, showing a "Synced with changes from another user" toast.
