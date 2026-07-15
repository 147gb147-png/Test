/* AquaTrack — shared utilities (DOM helpers, formatting, toasts, modals) */
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

  /* Build one element from an HTML string */
  el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  },

  /* Describe a range like '20 – 60', '≥ 20', '≤ 60' or 'no range' */
  rangeText(range) {
    if (!range || (range.min == null && range.max == null)) return 'no range set';
    if (range.min != null && range.max != null) return range.min + ' – ' + range.max;
    if (range.min != null) return '≥ ' + range.min;
    return '≤ ' + range.max;
  },

  /* Parse a numeric input value; '' -> null */
  num(v) {
    if (v === '' || v == null) return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
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
   *   title        — heading
   *   bodyHTML     — inner form fields (HTML string)
   *   submitLabel  — submit button text (default 'Save'); null hides footer
   *   onSubmit(form, close) — called on submit; call close() to dismiss
   *   wide         — wider dialog
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

  /* Flag chip HTML — icon + text so state never rides on color alone */
  flagChip(flag) {
    if (flag === 'high') return '<span class="chip chip-high" title="Above expected range">▲ High</span>';
    if (flag === 'low') return '<span class="chip chip-low" title="Below expected range">▼ Low</span>';
    if (flag === 'ok') return '<span class="chip chip-ok" title="Within expected range">✓ OK</span>';
    return '<span class="chip chip-none" title="No range configured">—</span>';
  }
};
