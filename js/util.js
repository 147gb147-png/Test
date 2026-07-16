/* FieldLab — shared utilities (DOM helpers, formatting, toasts, modals, filters) */
window.AA = window.AA || {};

AA.util = {
  /* Unique-enough id for local records */
  id() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  },

  /* Escape a value for interpolation into HTML strings */
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  slug(label) {
    var s = String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return s || 'type';
  },

  fmtNum(v, decimals) {
    if (v == null || isNaN(v)) return '—';
    var d = (decimals == null ? 1 : decimals);
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: d });
  },

  /* 'YYYY-MM-DD' -> 'Jan 5, 2026' */
  fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  },

  fmtDateShort(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  },

  todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  daysAgoISO(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  daysBetween(isoA, isoB) {
    var a = new Date(isoA + 'T00:00:00'), b = new Date(isoB + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  },

  /* Build one element from an HTML string */
  el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  },

  /* Describe a 4-level range: expected low/high plus absolute min/max limits.
   * e.g. '20 – 60 · limits ≥10 ≤80', '≥ 20', 'limits ≤80', 'no range set' */
  rangeText(range) {
    if (!range) return 'no range set';
    var exp = '';
    if (range.low != null && range.high != null) exp = range.low + ' – ' + range.high;
    else if (range.low != null) exp = '≥ ' + range.low;
    else if (range.high != null) exp = '≤ ' + range.high;
    var hard = '';
    if (range.min != null || range.max != null) {
      hard = 'limits ' + [range.min != null ? '≥' + range.min : '', range.max != null ? '≤' + range.max : '']
        .filter(Boolean).join(' ');
    }
    if (!exp && !hard) return 'no range set';
    return [exp, hard].filter(Boolean).join(' · ');
  },

  /* Parse a numeric input value; '' -> null */
  num(v) {
    if (v === '' || v == null) return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  },

  /* Trigger a client-side file download */
  download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
};

/* -------------------------------------------------- time-range filtering */
AA.filters = {
  PRESETS: [
    ['30d', 'Last 30 days'], ['90d', 'Last 90 days'], ['6m', 'Last 6 months'],
    ['12m', 'Last 12 months'], ['all', 'All time'], ['custom', 'Custom…']
  ],

  /* {from, to} ISO bounds (null = unbounded) for the current selection */
  bounds() {
    var tr = AA.state.timeRange;
    if (tr.key === 'custom') return { from: tr.from || null, to: tr.to || null };
    var days = { '30d': 30, '90d': 90, '6m': 182, '12m': 365 }[tr.key];
    if (!days) return { from: null, to: null };
    return { from: AA.util.daysAgoISO(days), to: null };
  },

  filterHistory(arr) {
    var b = AA.filters.bounds();
    return arr.filter(function (h) {
      if (b.from && h.date < b.from) return false;
      if (b.to && h.date > b.to) return false;
      return true;
    });
  },

  /* One filter row above the charts it scopes (chips + custom dates) */
  rowHTML() {
    var tr = AA.state.timeRange;
    var html = '<div class="filter-row no-print">';
    AA.filters.PRESETS.forEach(function (p) {
      html += '<button type="button" class="fchip' + (tr.key === p[0] ? ' on' : '') + '" data-range="' + p[0] + '">' +
        (tr.key === p[0] ? '✓ ' : '') + p[1] + '</button>';
    });
    html += '<span class="fcustom" style="' + (tr.key === 'custom' ? '' : 'display:none') + '">' +
      '<input type="date" class="f-from" value="' + (tr.from || '') + '" aria-label="From date"> – ' +
      '<input type="date" class="f-to" value="' + (tr.to || '') + '" aria-label="To date"></span>';
    html += '</div>';
    return html;
  },

  wireRow(container, onChange) {
    container.querySelectorAll('.fchip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        AA.state.timeRange.key = chip.getAttribute('data-range');
        onChange();
      });
    });
    var from = container.querySelector('.f-from'), to = container.querySelector('.f-to');
    if (from) from.addEventListener('change', function () { AA.state.timeRange.from = from.value || null; onChange(); });
    if (to) to.addEventListener('change', function () { AA.state.timeRange.to = to.value || null; onChange(); });
  }
};

/* ---------------------------------------------------------------- UI bits */
AA.ui = {
  toast(msg, type) {
    var root = document.getElementById('toast-root');
    var el = AA.util.el('<div class="toast toast-' + (type || 'info') + '"></div>');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 10);
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 3200);
  },

  /*
   * Open a modal containing a <form>. Options:
   *   title, bodyHTML, submitLabel (null hides footer), onSubmit(form, close), wide
   * Returns { root, close }.
   */
  modal(opts) {
    var rootHost = document.getElementById('modal-root');
    var root = AA.util.el(
      '<div class="modal-overlay">' +
      '  <div class="modal' + (opts.wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true">' +
      '    <div class="modal-head">' +
      '      <h3>' + AA.util.esc(opts.title || '') + '</h3>' +
      '      <button type="button" class="modal-x" aria-label="Close">×</button>' +
      '    </div>' +
      '    <form class="modal-form">' +
      '      <div class="modal-body">' + (opts.bodyHTML || '') + '</div>' +
      (opts.submitLabel === null ? '' :
      '      <div class="modal-foot">' +
      '        <button type="button" class="btn btn-ghost modal-cancel">Cancel</button>' +
      '        <button type="submit" class="btn btn-primary">' + AA.util.esc(opts.submitLabel || 'Save') + '</button>' +
      '      </div>') +
      '    </form>' +
      '  </div>' +
      '</div>'
    );

    function close() {
      root.remove();
      document.body.classList.remove('modal-open');
    }

    root.addEventListener('click', function (e) {
      if (e.target === root) close();
    });
    root.querySelector('.modal-x').addEventListener('click', close);
    var cancel = root.querySelector('.modal-cancel');
    if (cancel) cancel.addEventListener('click', close);

    var form = root.querySelector('form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (opts.onSubmit) opts.onSubmit(form, close);
      else close();
    });

    rootHost.appendChild(root);
    document.body.classList.add('modal-open');
    var first = form.querySelector('input, select, textarea');
    if (first) first.focus();
    return { root: root, close: close };
  },

  /* Flag chip HTML — icon + text so state never rides on color alone.
   * Expected-range violations are orange; absolute-limit violations are red
   * and highest priority. */
  flagChip(flag) {
    if (flag === 'critHigh') return '<span class="chip chip-crit" title="Above the ABSOLUTE maximum — highest priority">‼ Above Max</span>';
    if (flag === 'critLow') return '<span class="chip chip-crit" title="Below the ABSOLUTE minimum — highest priority">‼ Below Min</span>';
    if (flag === 'high') return '<span class="chip chip-high" title="Above expected range">▲ High</span>';
    if (flag === 'low') return '<span class="chip chip-low" title="Below expected range">▼ Low</span>';
    if (flag === 'ok') return '<span class="chip chip-ok" title="Within expected range">✓ OK</span>';
    return '<span class="chip chip-none" title="No range configured">—</span>';
  },

  chronicChip() {
    return '<span class="chip chip-chronic" title="Out of range on 3+ consecutive readings — needs escalation">⟲ Chronic</span>';
  }
};
