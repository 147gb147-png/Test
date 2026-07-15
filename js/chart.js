/*
 * AquaTrack — SVG trend chart for a single test at a single sample point.
 *
 * Design notes (see docs/DESIGN.md):
 *  - single series -> no legend; the page heading names what is plotted
 *  - expected range drawn as a soft "good zone" band with labeled min/max hairlines
 *  - in-range points are circles; out-of-range points are triangles (▲ above the
 *    max, ▼ below the min) so state never rides on color alone
 *  - crosshair + tooltip: pointer snaps to the nearest visit date
 *  - every plotted value is also in the history table below the chart
 */
window.AA = window.AA || {};

AA.chart = (function () {
  var W = 800, H = 300;
  var PAD = { l: 58, r: 20, t: 20, b: 34 };

  var C = {
    line: '#2a78d6',      /* series blue */
    flag: '#d03b3b',      /* status critical — out-of-range marks only */
    band: 'rgba(12,163,12,0.08)',   /* status good as a wash for the in-range zone */
    bandEdge: 'rgba(12,163,12,0.45)',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    muted: '#898781',
    surface: '#fcfcfb'
  };

  function niceStep(rough) {
    var pow = Math.pow(10, Math.floor(Math.log10(rough)));
    var n = rough / pow;
    if (n <= 1) return pow;
    if (n <= 2) return 2 * pow;
    if (n <= 5) return 5 * pow;
    return 10 * pow;
  }

  /*
   * render(container, opts)
   *   opts.points   [{date:'YYYY-MM-DD', value, comment, flag}] chronological
   *   opts.range    {min, max} (either may be null)
   *   opts.unit     e.g. 'ppm SO₃²⁻'
   *   opts.decimals value formatting
   */
  function render(container, opts) {
    var pts = opts.points || [];
    container.classList.add('chart');
    container.innerHTML = '';

    if (!pts.length) {
      container.innerHTML = '<div class="chart-empty">No data recorded yet — values will chart here after the first visit.</div>';
      return;
    }

    var range = opts.range || { min: null, max: null };

    /* ---- scales ---- */
    var t0 = new Date(pts[0].date + 'T00:00:00').getTime();
    var t1 = new Date(pts[pts.length - 1].date + 'T00:00:00').getTime();
    if (t1 === t0) { t0 -= 43200000; t1 += 43200000; }

    var vals = pts.map(function (p) { return p.value; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (range.min != null) lo = Math.min(lo, range.min);
    if (range.max != null) hi = Math.max(hi, range.max);
    if (lo === hi) { lo -= 1; hi += 1; }
    var padV = (hi - lo) * 0.12;
    lo -= padV; hi += padV;
    if (lo < 0 && Math.min.apply(null, vals) >= 0 && (range.min == null || range.min >= 0)) lo = 0;

    var iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
    function x(t) { return PAD.l + (t - t0) / (t1 - t0) * iw; }
    function y(v) { return PAD.t + (1 - (v - lo) / (hi - lo)) * ih; }

    var P = pts.map(function (p) {
      return { x: x(new Date(p.date + 'T00:00:00').getTime()), y: y(p.value), d: p };
    });

    /* ---- y ticks ---- */
    var step = niceStep((hi - lo) / 4);
    var ticks = [];
    for (var tv = Math.ceil(lo / step) * step; tv <= hi + 1e-9; tv += step) {
      ticks.push(Math.round(tv * 1e6) / 1e6);
    }

    /* ---- x ticks (up to 6 dates) ---- */
    var xt = [];
    var nx = Math.min(6, pts.length);
    for (var i = 0; i < nx; i++) {
      var tt = t0 + (t1 - t0) * (nx === 1 ? 0.5 : i / (nx - 1));
      xt.push(tt);
    }

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart-svg" role="img" aria-label="Trend chart">';

    /* gridlines + y labels */
    ticks.forEach(function (v) {
      var yy = y(v);
      s += '<line x1="' + PAD.l + '" y1="' + yy + '" x2="' + (W - PAD.r) + '" y2="' + yy + '" stroke="' + C.grid + '" stroke-width="1"/>';
      s += '<text x="' + (PAD.l - 8) + '" y="' + (yy + 3.5) + '" text-anchor="end" class="tick">' + AA.util.fmtNum(v, opts.decimals) + '</text>';
    });

    /* expected-range band (drawn above grid, below data) */
    var bandTop = range.max != null ? y(Math.min(range.max, hi)) : PAD.t;
    var bandBot = range.min != null ? y(Math.max(range.min, lo)) : H - PAD.b;
    if (range.min != null || range.max != null) {
      s += '<rect x="' + PAD.l + '" y="' + bandTop + '" width="' + iw + '" height="' + Math.max(0, bandBot - bandTop) + '" fill="' + C.band + '"/>';
      if (range.max != null) {
        s += '<line x1="' + PAD.l + '" y1="' + y(range.max) + '" x2="' + (W - PAD.r) + '" y2="' + y(range.max) + '" stroke="' + C.bandEdge + '" stroke-width="1"/>';
        s += '<text x="' + (W - PAD.r - 4) + '" y="' + (y(range.max) - 5) + '" text-anchor="end" class="limit">Max ' + AA.util.fmtNum(range.max, opts.decimals) + '</text>';
      }
      if (range.min != null) {
        s += '<line x1="' + PAD.l + '" y1="' + y(range.min) + '" x2="' + (W - PAD.r) + '" y2="' + y(range.min) + '" stroke="' + C.bandEdge + '" stroke-width="1"/>';
        s += '<text x="' + (W - PAD.r - 4) + '" y="' + (y(range.min) + 13) + '" text-anchor="end" class="limit">Min ' + AA.util.fmtNum(range.min, opts.decimals) + '</text>';
      }
    }

    /* baseline + x labels */
    s += '<line x1="' + PAD.l + '" y1="' + (H - PAD.b) + '" x2="' + (W - PAD.r) + '" y2="' + (H - PAD.b) + '" stroke="' + C.axis + '" stroke-width="1"/>';
    xt.forEach(function (tt) {
      var d = new Date(tt);
      var lbl = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      s += '<text x="' + x(tt) + '" y="' + (H - PAD.b + 18) + '" text-anchor="middle" class="tick">' + lbl + '</text>';
    });

    /* crosshair (hidden until hover) */
    s += '<line class="xhair" x1="0" y1="' + PAD.t + '" x2="0" y2="' + (H - PAD.b) + '" stroke="' + C.axis + '" stroke-width="1" style="display:none"/>';

    /* the line */
    if (P.length > 1) {
      var dPath = P.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ');
      s += '<path d="' + dPath + '" fill="none" stroke="' + C.line + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    }

    /* markers: circle = in range / no range; triangles = out of range */
    P.forEach(function (p) {
      var f = p.d.flag;
      if (f === 'high') {
        s += '<path d="M' + p.x + ' ' + (p.y - 5.5) + ' L' + (p.x + 5.5) + ' ' + (p.y + 4.5) + ' L' + (p.x - 5.5) + ' ' + (p.y + 4.5) + ' Z" fill="' + C.flag + '" stroke="' + C.surface + '" stroke-width="2"/>';
      } else if (f === 'low') {
        s += '<path d="M' + p.x + ' ' + (p.y + 5.5) + ' L' + (p.x + 5.5) + ' ' + (p.y - 4.5) + ' L' + (p.x - 5.5) + ' ' + (p.y - 4.5) + ' Z" fill="' + C.flag + '" stroke="' + C.surface + '" stroke-width="2"/>';
      } else {
        s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="' + C.line + '" stroke="' + C.surface + '" stroke-width="2"/>';
      }
    });

    s += '</svg>';
    container.innerHTML = s;

    /* ------------------------------------------------ crosshair + tooltip */
    var svg = container.querySelector('svg');
    var xhair = svg.querySelector('.xhair');
    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.style.display = 'none';
    container.appendChild(tip);

    function showAt(idx, clientX) {
      var p = P[idx];
      xhair.style.display = '';
      xhair.setAttribute('x1', p.x);
      xhair.setAttribute('x2', p.x);

      /* tooltip content — textContent only (values may contain user text) */
      tip.innerHTML = '';
      var d1 = document.createElement('div'); d1.className = 'tip-date';
      d1.textContent = AA.util.fmtDate(p.d.date);
      var d2 = document.createElement('div'); d2.className = 'tip-value';
      d2.textContent = AA.util.fmtNum(p.d.value, opts.decimals) + (opts.unit ? ' ' + opts.unit : '');
      tip.appendChild(d1); tip.appendChild(d2);

      var status = document.createElement('div');
      status.className = 'tip-status';
      if (p.d.flag === 'high') { status.textContent = '▲ High — above max'; status.classList.add('bad'); }
      else if (p.d.flag === 'low') { status.textContent = '▼ Low — below min'; status.classList.add('bad'); }
      else if (p.d.flag === 'ok') { status.textContent = '✓ Within expected range'; }
      else { status.textContent = 'No range configured'; }
      tip.appendChild(status);

      if (p.d.comment) {
        var c = document.createElement('div');
        c.className = 'tip-comment';
        c.textContent = p.d.comment;
        tip.appendChild(c);
      }

      var rect = container.getBoundingClientRect();
      var svgRect = svg.getBoundingClientRect();
      var px = svgRect.left - rect.left + (p.x / W) * svgRect.width;
      tip.style.display = '';
      var left = px + 14;
      if (left + tip.offsetWidth > rect.width - 8) left = px - tip.offsetWidth - 14;
      tip.style.left = Math.max(4, left) + 'px';
      tip.style.top = '14px';
    }

    function hide() {
      xhair.style.display = 'none';
      tip.style.display = 'none';
    }

    svg.addEventListener('pointermove', function (e) {
      var svgRect = svg.getBoundingClientRect();
      var xs = (e.clientX - svgRect.left) / svgRect.width * W;
      var best = 0, bd = Infinity;
      P.forEach(function (p, i) {
        var d = Math.abs(p.x - xs);
        if (d < bd) { bd = d; best = i; }
      });
      showAt(best, e.clientX);
    });
    svg.addEventListener('pointerleave', hide);
  }

  return { render: render };
})();
