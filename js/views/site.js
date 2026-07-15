/* AquaTrack — site detail, system detail (sample points & tests), test history */
window.AA = window.AA || {};
AA.views = AA.views || {};

/* ------------------------------------------------------------ site detail */
AA.views.site = function (root, params) {
  var u = AA.util, st = AA.store;
  var site = st.getSite(params[0]);
  if (!site) { root.innerHTML = '<div class="card"><div class="empty">Site not found. <a href="#/sites">Back to sites</a></div></div>'; return; }

  var canEdit = st.canEditSite(site);
  var systems = st.systemsOf(site.id);
  var visits = st.visitsOf(site.id);
  var actions = st.actionItems(site.id);
  var addr = st.addressString(site);
  var only = {}; only[site.id] = true;
  var overdue = st.overdueSites(only);
  var repName = AA.env.server ? AA.app.repName(site.repId) : null;

  var html =
    '<div class="page-head"><div class="grow">' +
    '<div class="crumbs"><a href="#/sites">Sites</a> / ' + u.esc(site.name) + '</div>' +
    '<h1>' + u.esc(site.name) + (overdue.length ? ' <span class="chip chip-low">▼ Visit overdue</span>' : '') + '</h1>' +
    (addr ? '<p class="page-sub">📍 ' + u.esc(addr) + (site.lat != null ? ' · <a href="#/map">on map</a>' : '') +
      (repName ? ' · rep: <strong>' + u.esc(repName) + '</strong>' : '') + '</p>' : '') +
    '</div><div class="actions">' +
    (canEdit ? '<a class="btn btn-primary" href="#/visit/new?site=' + site.id + '">+ New Visit</a>' : '') +
    (canEdit ? '<button class="btn btn-ghost" id="site-edit">Edit site</button>' : '') +
    (canEdit ? '<button class="btn btn-danger" id="site-del">Delete</button>' : '') +
    '</div></div>';

  /* contact / notes */
  html += '<div class="grid-2"><div class="card"><h3>Contact & schedule</h3><dl class="kv">' +
    '<dt>Contact</dt><dd>' + (u.esc(site.contact) || '—') + '</dd>' +
    '<dt>Phone</dt><dd>' + (u.esc(site.phone) || '—') + '</dd>' +
    '<dt>Email</dt><dd>' + (site.email ? '<a href="mailto:' + u.esc(site.email) + '">' + u.esc(site.email) + '</a>' : '—') + '</dd>' +
    '<dt>Service interval</dt><dd>' + (site.serviceIntervalDays ? 'every ' + site.serviceIntervalDays + ' days' : '<span class="td-sub">no schedule set</span>') + '</dd>' +
    '<dt>Coordinates</dt><dd>' + (site.lat != null && site.lng != null ? site.lat.toFixed(4) + ', ' + site.lng.toFixed(4) : '<span class="td-sub">not set — edit site to geocode</span>') + '</dd>' +
    '</dl></div>' +
    '<div class="card"><h3>Site notes</h3><p class="td-sub" style="white-space:pre-wrap">' + (u.esc(site.notes) || 'No notes.') + '</p></div></div>';

  /* action items for this site */
  if (actions.length) {
    html += '<div class="card"><h2>⚠ Action items at this site</h2><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>System / sample point</th><th>Test</th><th class="num">Result</th><th>Expected</th><th>Status</th><th>Date</th></tr></thead><tbody>';
    actions.forEach(function (it) {
      html += '<tr class="rowlink" data-href="#/history/' + it.point.id + '/' + it.test.id + '">' +
        '<td>' + u.esc(it.system.name) + ' <span class="td-sub">· ' + u.esc(it.point.name) + '</span></td>' +
        '<td>' + u.esc(it.test.name) + '</td>' +
        '<td class="num"><strong>' + u.fmtNum(it.value, it.test.decimals) + '</strong> <span class="td-sub">' + u.esc(it.test.unit) + '</span></td>' +
        '<td class="td-sub">' + u.esc(u.rangeText(it.range)) + '</td>' +
        '<td>' + AA.ui.flagChip(it.flag) + (it.streak >= 3 ? ' ' + AA.ui.chronicChip() : '') + '</td>' +
        '<td class="td-sub">' + u.fmtDate(it.date) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  /* systems */
  html += '<div class="card"><div class="page-head" style="margin-bottom:8px"><div class="grow"><h2 style="margin:0">Systems</h2></div>' +
    (canEdit ? '<div class="actions"><button class="btn btn-ghost btn-sm" id="add-system">+ Add system</button></div>' : '') + '</div>';
  if (!systems.length) {
    html += '<div class="empty">No systems yet — add a Boiler, Cooling Tower, or any custom system type.</div>';
  } else {
    html += '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>System</th><th>Type</th><th class="num">Sample points</th><th>Products</th><th></th></tr></thead><tbody>';
    systems.forEach(function (y) {
      var pts = st.pointsOf(y.id);
      var prods = (y.products || []).map(function (ap) {
        var p = st.getProduct(ap.productId);
        return p ? u.esc(p.name) : '';
      }).filter(Boolean).join(', ');
      var tpl = st.data.templates[y.type];
      html += '<tr class="rowlink" data-href="#/system/' + y.id + '">' +
        '<td><strong>' + u.esc(y.name) + '</strong></td>' +
        '<td><span class="chip chip-type">' + u.esc(tpl ? tpl.label : y.type) + '</span></td>' +
        '<td class="num">' + pts.length + '</td>' +
        '<td class="td-sub">' + (prods || '—') + '</td>' +
        '<td class="td-sub"><a href="#/trends/' + y.id + '">📈 trends</a> · open →</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  /* visits */
  html += '<div class="card"><h2>Visit history</h2>';
  if (!visits.length) {
    html += '<p class="td-sub">No visits recorded yet.</p>';
  } else {
    html += '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Date</th><th>Rep</th><th class="num">Results</th><th class="num">Flagged</th><th></th></tr></thead><tbody>';
    visits.forEach(function (v) {
      var stats = st.visitStats(v);
      html += '<tr class="rowlink" data-href="#/visit/' + v.id + '">' +
        '<td>' + u.fmtDate(v.date) + '</td><td>' + u.esc(v.rep || '—') + '</td>' +
        '<td class="num">' + stats.readings + '</td>' +
        '<td class="num">' + (stats.flagged ? '<strong style="color:var(--critical)">' + stats.flagged + '</strong>' : '0') + '</td>' +
        '<td class="td-sub">report →</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  root.innerHTML = html;
  AA.views._wireRowLinks(root);
  if (!canEdit) return;

  document.getElementById('site-edit').addEventListener('click', function () {
    AA.forms.site(site, function () { AA.views.site(root, params); });
  });
  document.getElementById('site-del').addEventListener('click', function () {
    if (confirm('Delete "' + site.name + '" and ALL of its systems, sample points and visit data? This cannot be undone.')) {
      st.deleteSite(site.id);
      AA.ui.toast('Site deleted.');
      location.hash = '#/sites';
    }
  });
  document.getElementById('add-system').addEventListener('click', function () {
    var types = Object.keys(st.data.templates);
    var opts = types.map(function (t) {
      return '<option value="' + u.esc(t) + '">' + u.esc(st.data.templates[t].label) + '</option>';
    }).join('');
    AA.ui.modal({
      title: 'Add System',
      bodyHTML:
        '<label class="f">System type<select name="type">' + opts + '</select></label>' +
        '<label class="f">Name <span class="f-hint">(e.g. "Boiler #1 — East Plant")</span><input name="name" placeholder="defaults to the type name"></label>' +
        '<p class="f-hint">Sample points and tests are copied from the template for this type. Need a chiller, RO, softener…? Create new system types in <a href="#/settings/templates">Settings → System templates</a>.</p>',
      submitLabel: 'Add system',
      onSubmit: function (form, close) {
        var sys = st.addSystem(site.id, form.elements.type.value, form.elements.name.value.trim());
        close();
        location.hash = '#/system/' + sys.id;
      }
    });
  });
};

/* ---------------------------------------------------------- system detail */
AA.views.system = function (root, params) {
  var u = AA.util, st = AA.store;
  var sys = st.getSystem(params[0]);
  if (!sys) { root.innerHTML = '<div class="card"><div class="empty">System not found.</div></div>'; return; }
  var site = st.getSite(sys.siteId);
  var canEdit = st.canEditSite(site);
  var points = st.pointsOf(sys.id);
  var tpl = st.data.templates[sys.type];

  var html =
    '<div class="page-head"><div class="grow">' +
    '<div class="crumbs"><a href="#/sites">Sites</a> / <a href="#/site/' + site.id + '">' + u.esc(site.name) + '</a> / ' + u.esc(sys.name) + '</div>' +
    '<h1>' + u.esc(sys.name) + ' <span class="chip chip-type">' + u.esc(tpl ? tpl.label : sys.type) + '</span></h1>' +
    (sys.notes ? '<p class="page-sub">' + u.esc(sys.notes) + '</p>' : '') +
    '</div><div class="actions">' +
    '<a class="btn btn-ghost" href="#/trends/' + sys.id + '">📈 Trends</a>' +
    (canEdit ? '<a class="btn btn-primary" href="#/visit/new?site=' + site.id + '">+ New Visit</a>' : '') +
    (canEdit ? '<button class="btn btn-ghost" id="sys-edit">Rename / notes</button>' : '') +
    (canEdit ? '<button class="btn btn-danger" id="sys-del">Delete system</button>' : '') +
    '</div></div>';

  /* products applied to this system */
  html += '<div class="card"><div class="page-head" style="margin-bottom:8px"><div class="grow"><h2 style="margin:0">Products applied</h2></div>' +
    (canEdit ? '<div class="actions"><button class="btn btn-ghost btn-sm" id="add-prod">+ Assign product</button></div>' : '') + '</div>';
  var assigned = sys.products || [];
  if (!assigned.length) {
    html += '<p class="td-sub">No products assigned. Manage your product catalog in <a href="#/settings/products">Settings → Products</a>.</p>';
  } else {
    html += '<div class="table-wrap"><table class="data"><thead><tr><th>Product</th><th>Feed / target</th><th class="num">Stock level</th><th>Status</th><th></th></tr></thead><tbody>';
    assigned.forEach(function (ap, i) {
      var p = st.getProduct(ap.productId);
      var last = st.latestProductLevel(sys.id, ap.productId);
      var low = ap.lowLevel != null && last && last.level <= ap.lowLevel;
      html += '<tr><td><strong>' + u.esc(p ? p.name : '(deleted product)') + '</strong>' +
        (p && p.description ? '<div class="td-sub">' + u.esc(p.description) + '</div>' : '') + '</td>' +
        '<td class="td-sub">' + (u.esc(ap.dose) || (p ? u.esc(p.dose) : '') || '—') + '</td>' +
        '<td class="num">' + (last ? '<strong>' + u.fmtNum(last.level, 0) + '</strong> ' + u.esc(ap.unit || '') + '<div class="td-sub">' + u.fmtDate(last.date) + '</div>' : '<span class="td-sub">not recorded</span>') + '</td>' +
        '<td>' + (ap.lowLevel == null ? '<span class="td-sub">no threshold</span>' : (low ? '<span class="chip chip-low">▼ Low stock</span>' : (last ? '<span class="chip chip-ok">✓ OK</span>' : '<span class="td-sub">—</span>'))) + '</td>' +
        '<td class="num">' + (canEdit ? '<button class="btn btn-ghost btn-sm unassign-prod" data-i="' + i + '">Remove</button>' : '') + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  /* sample points */
  html += '<div class="page-head" style="margin-bottom:6px"><div class="grow"><h2 style="margin:0">Sample points</h2>' +
    '<p class="page-sub">Tests, expected ranges and latest results per sample point — click a row for full history & trend.</p></div>' +
    (canEdit ? '<div class="actions"><button class="btn btn-ghost btn-sm" id="add-point">+ Add sample point</button></div>' : '') + '</div>';

  if (!points.length) {
    html += '<div class="card"><div class="empty">No sample points on this system yet.</div></div>';
  }

  points.forEach(function (pt) {
    html += '<div class="card"><div class="page-head" style="margin-bottom:6px"><div class="grow"><h3 style="margin:0">🧪 ' + u.esc(pt.name) + '</h3></div>' +
      (canEdit ?
      '<div class="actions">' +
      '<button class="btn btn-ghost btn-sm pt-addtest" data-pt="' + pt.id + '">+ Add test</button>' +
      '<button class="btn btn-ghost btn-sm pt-rename" data-pt="' + pt.id + '">Rename</button>' +
      '<button class="btn btn-danger btn-sm pt-del" data-pt="' + pt.id + '">Delete</button>' +
      '</div>' : '') + '</div>';
    if (!pt.tests.length) {
      html += '<p class="td-sub">No tests configured for this sample point.</p>';
    } else {
      html += '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Test</th><th>Expected range</th><th class="num">Latest</th><th>Status</th><th>Last tested</th><th></th></tr></thead><tbody>';
      pt.tests.forEach(function (t) {
        var def = st.getTest(t.testId);
        if (!def) return;
        var range = st.effRange(pt, t.testId);
        var last = st.latest(pt.id, t.testId);
        var flag = last ? st.evalFlag(last.value, range) : null;
        html += '<tr class="rowlink" data-href="#/history/' + pt.id + '/' + def.id + '">' +
          '<td><strong>' + u.esc(def.name) + '</strong>' + (def.unit ? ' <span class="td-sub">' + u.esc(def.unit) + '</span>' : '') + '</td>' +
          '<td class="td-sub">' + u.esc(u.rangeText(range)) + (canEdit ? ' <button class="btn btn-ghost btn-sm t-range" data-pt="' + pt.id + '" data-test="' + def.id + '">edit</button>' : '') + '</td>' +
          '<td class="num">' + (last ? '<strong>' + u.fmtNum(last.value, def.decimals) + '</strong>' : '—') + '</td>' +
          '<td>' + (last ? AA.ui.flagChip(flag) : '<span class="td-sub">no data</span>') + '</td>' +
          '<td class="td-sub">' + (last ? u.fmtDate(last.date) : '—') + '</td>' +
          '<td class="num">' + (canEdit ? '<button class="btn btn-ghost btn-sm t-remove" data-pt="' + pt.id + '" data-test="' + def.id + '">remove</button>' : '') + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
  });

  root.innerHTML = html;
  AA.views._wireRowLinks(root);
  var rerender = function () { AA.views.system(root, params); };
  if (!canEdit) return;

  document.getElementById('sys-edit').addEventListener('click', function () {
    AA.ui.modal({
      title: 'Edit System',
      bodyHTML:
        '<label class="f">Name<input name="name" required value="' + u.esc(sys.name) + '"></label>' +
        '<label class="f">Notes<textarea name="notes">' + u.esc(sys.notes || '') + '</textarea></label>',
      onSubmit: function (form, close) {
        st.updateSystem(sys.id, { name: form.elements.name.value.trim(), notes: form.elements.notes.value.trim() });
        close(); rerender();
      }
    });
  });

  document.getElementById('sys-del').addEventListener('click', function () {
    if (confirm('Delete "' + sys.name + '" including its sample points and all their readings?')) {
      st.deleteSystem(sys.id);
      location.hash = '#/site/' + site.id;
    }
  });

  document.getElementById('add-prod').addEventListener('click', function () {
    if (!st.data.products.length) { AA.ui.toast('No products in the catalog yet — add them in Settings → Products.', 'error'); return; }
    var opts = st.data.products.map(function (p) {
      return '<option value="' + u.esc(p.id) + '">' + u.esc(p.name) + '</option>';
    }).join('');
    AA.ui.modal({
      title: 'Assign Product',
      bodyHTML:
        '<label class="f">Product<select name="productId">' + opts + '</select></label>' +
        '<label class="f">Feed / target for this system <span class="f-hint">(optional — defaults to the product’s standard dose)</span><input name="dose" placeholder="e.g. Maintain 30–60 ppm"></label>' +
        '<div class="f-row">' +
        '<label class="f">Stock unit <span class="f-hint">(for inventory tracking)</span><input name="unit" placeholder="gal, drums, %…"></label>' +
        '<label class="f">Low-stock alert at ≤ <span class="f-hint">(optional)</span><input name="lowLevel" type="number" step="any"></label>' +
        '</div>' +
        '<p class="f-hint">If you set a unit, reps can record the on-hand level at each visit; a low-stock alert appears when it hits the threshold.</p>',
      submitLabel: 'Assign',
      onSubmit: function (form, close) {
        var f = form.elements;
        st.assignProduct(sys.id, {
          productId: f.productId.value, dose: f.dose.value.trim(),
          unit: f.unit.value.trim(), lowLevel: u.num(f.lowLevel.value)
        });
        close(); rerender();
      }
    });
  });

  root.querySelectorAll('.unassign-prod').forEach(function (btn) {
    btn.addEventListener('click', function () {
      st.unassignProduct(sys.id, Number(btn.getAttribute('data-i')));
      rerender();
    });
  });

  document.getElementById('add-point').addEventListener('click', function () {
    AA.ui.modal({
      title: 'Add Sample Point',
      bodyHTML:
        '<label class="f">Name<input name="name" required placeholder="e.g. Blowdown, Softener Effluent"></label>' +
        '<p class="f-hint">Add tests to the new point afterwards with “+ Add test”.</p>',
      submitLabel: 'Add',
      onSubmit: function (form, close) {
        st.addPoint(sys.id, form.elements.name.value.trim(), []);
        close(); rerender();
      }
    });
  });

  root.querySelectorAll('.pt-rename').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pt = st.getPoint(btn.getAttribute('data-pt'));
      AA.ui.modal({
        title: 'Rename Sample Point',
        bodyHTML: '<label class="f">Name<input name="name" required value="' + u.esc(pt.name) + '"></label>',
        onSubmit: function (form, close) {
          st.updatePoint(pt.id, { name: form.elements.name.value.trim() });
          close(); rerender();
        }
      });
    });
  });

  root.querySelectorAll('.pt-del').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pt = st.getPoint(btn.getAttribute('data-pt'));
      if (confirm('Delete sample point "' + pt.name + '" and all its readings?')) {
        st.deletePoint(pt.id); rerender();
      }
    });
  });

  root.querySelectorAll('.pt-addtest').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pt = st.getPoint(btn.getAttribute('data-pt'));
      var existing = pt.tests.map(function (t) { return t.testId; });
      var avail = st.data.testDefs.filter(function (d) { return existing.indexOf(d.id) === -1; });
      if (!avail.length) { AA.ui.toast('All catalog tests are already on this point. Add new tests in Settings → Tests.', 'error'); return; }
      var opts = avail.map(function (d) {
        return '<option value="' + u.esc(d.id) + '">' + u.esc(d.name) + (d.unit ? ' (' + u.esc(d.unit) + ')' : '') + '</option>';
      }).join('');
      AA.ui.modal({
        title: 'Add Test to ' + pt.name,
        bodyHTML:
          '<label class="f">Test<select name="testId">' + opts + '</select></label>' +
          '<div class="f-row">' +
          '<label class="f">Expected min <span class="f-hint">(blank = test default)</span><input name="min" type="number" step="any"></label>' +
          '<label class="f">Expected max <span class="f-hint">(blank = test default)</span><input name="max" type="number" step="any"></label>' +
          '</div>' +
          '<p class="f-hint">Don’t see the test you need? Create it in Settings → Tests, then add it here.</p>',
        submitLabel: 'Add test',
        onSubmit: function (form, close) {
          st.addTestToPoint(pt.id, {
            testId: form.elements.testId.value,
            min: u.num(form.elements.min.value),
            max: u.num(form.elements.max.value)
          });
          close(); rerender();
        }
      });
    });
  });

  root.querySelectorAll('.t-remove').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pt = st.getPoint(btn.getAttribute('data-pt'));
      var def = st.getTest(btn.getAttribute('data-test'));
      if (confirm('Remove "' + (def ? def.name : '?') + '" from ' + pt.name + '? Recorded values stay in past visit reports but the test will no longer be scheduled or trended here.')) {
        st.removeTestFromPoint(pt.id, btn.getAttribute('data-test'));
        rerender();
      }
    });
  });

  root.querySelectorAll('.t-range').forEach(function (btn) {
    btn.addEventListener('click', function () {
      AA.views._editRange(btn.getAttribute('data-pt'), btn.getAttribute('data-test'), rerender);
    });
  });
};

/* Shared: edit the expected range for one test at one sample point */
AA.views._editRange = function (pointId, testId, onDone) {
  var u = AA.util, st = AA.store;
  var pt = st.getPoint(pointId);
  var def = st.getTest(testId);
  var entry = pt.tests.find(function (t) { return t.testId === testId; });
  if (!entry) return;
  var defText = u.rangeText({ min: def.defaultMin, max: def.defaultMax });
  AA.ui.modal({
    title: 'Expected Range — ' + def.name,
    bodyHTML:
      '<p class="f-hint">For <strong>' + u.esc(pt.name) + '</strong>. Leave blank to inherit the test default (' + u.esc(defText) + '). Values outside the range are flagged on entry, in reports and on trends.</p>' +
      '<div class="f-row">' +
      '<label class="f">Min' + (def.unit ? ' <span class="f-hint">' + u.esc(def.unit) + '</span>' : '') + '<input name="min" type="number" step="any" value="' + (entry.min != null ? entry.min : '') + '"></label>' +
      '<label class="f">Max' + (def.unit ? ' <span class="f-hint">' + u.esc(def.unit) + '</span>' : '') + '<input name="max" type="number" step="any" value="' + (entry.max != null ? entry.max : '') + '"></label>' +
      '</div>',
    onSubmit: function (form, close) {
      st.setPointTestRange(pt.id, testId, u.num(form.elements.min.value), u.num(form.elements.max.value));
      close();
      AA.ui.toast('Range updated — history is re-flagged against the new range.', 'success');
      if (onDone) onDone();
    }
  });
};

/* ----------------------------------------------------- test data & trend */
AA.views.history = function (root, params) {
  var u = AA.util, st = AA.store;
  var pt = st.getPoint(params[0]);
  var def = st.getTest(params[1]);
  if (!pt || !def) { root.innerHTML = '<div class="card"><div class="empty">Not found.</div></div>'; return; }
  var sys = st.getSystem(pt.systemId);
  var site = sys ? st.getSite(sys.siteId) : null;
  var canEdit = st.canEditSite(site);
  var range = st.effRange(pt, def.id);
  var fullHist = st.history(pt.id, def.id);
  var streak = st.outOfRangeStreak(pt.id, def.id);

  function render() {
    var hist = AA.filters.filterHistory(fullHist);
    hist.forEach(function (h) { h.flag = st.evalFlag(h.value, range); });
    var flagged = hist.filter(function (h) { return h.flag === 'low' || h.flag === 'high'; }).length;

    var stats = null;
    if (hist.length) {
      var vals = hist.map(function (h) { return h.value; });
      stats = {
        latest: vals[vals.length - 1],
        min: Math.min.apply(null, vals),
        max: Math.max.apply(null, vals),
        avg: vals.reduce(function (a, b) { return a + b; }, 0) / vals.length
      };
    }

    var html =
      '<div class="page-head"><div class="grow">' +
      '<div class="crumbs"><a href="#/sites">Sites</a> / <a href="#/site/' + (site ? site.id : '') + '">' + u.esc(site ? site.name : '?') + '</a> / ' +
      '<a href="#/system/' + (sys ? sys.id : '') + '">' + u.esc(sys ? sys.name : '?') + '</a> / ' + u.esc(pt.name) + '</div>' +
      '<h1>' + u.esc(def.name) + (def.unit ? ' <span class="td-sub">(' + u.esc(def.unit) + ')</span>' : '') +
      (streak >= 3 ? ' ' + AA.ui.chronicChip() : '') + '</h1>' +
      '<p class="page-sub">' + u.esc(pt.name) + ' — expected: <strong>' + u.esc(u.rangeText(range)) + '</strong>' +
      (def.description ? ' · ' + u.esc(def.description) : '') + '</p>' +
      '</div><div class="actions">' +
      '<button class="btn btn-ghost" id="hist-csv">⬇ CSV</button>' +
      (canEdit ? '<button class="btn btn-ghost" id="hist-range">Edit expected range</button>' : '') +
      '</div></div>';

    html += AA.filters.rowHTML();

    if (stats) {
      html += '<div class="tiles">' +
        '<div class="tile"><div class="t-label">Latest</div><div class="t-value">' + u.fmtNum(stats.latest, def.decimals) + '</div><div class="t-note">' + u.fmtDate(hist[hist.length - 1].date) + '</div></div>' +
        '<div class="tile"><div class="t-label">Average</div><div class="t-value">' + u.fmtNum(stats.avg, def.decimals) + '</div><div class="t-note">across ' + hist.length + ' readings</div></div>' +
        '<div class="tile"><div class="t-label">Observed min – max</div><div class="t-value" style="font-size:1.2rem">' + u.fmtNum(stats.min, def.decimals) + ' – ' + u.fmtNum(stats.max, def.decimals) + '</div></div>' +
        '<div class="tile' + (flagged ? ' alert' : '') + '"><div class="t-label">Out of range</div><div class="t-value">' + flagged + '</div><div class="t-note">of ' + hist.length + ' readings' + (streak >= 3 ? ' · ' + streak + ' in a row' : '') + '</div></div>' +
        '</div>';
    }

    html += '<div class="card"><h2>Trend</h2><div id="trend"></div></div>';

    html += '<div class="card"><h2>Readings</h2>';
    if (!hist.length) {
      html += '<p class="td-sub">No data in this period — widen the time range above, or record a visit.</p>';
    } else {
      html += '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Date</th><th class="num">Value</th><th>Status</th><th>Rep</th><th>Comment</th><th></th></tr></thead><tbody>';
      hist.slice().reverse().forEach(function (h) {
        html += '<tr><td>' + u.fmtDate(h.date) + '</td>' +
          '<td class="num"><strong>' + u.fmtNum(h.value, def.decimals) + '</strong>' + (def.unit ? ' <span class="td-sub">' + u.esc(def.unit) + '</span>' : '') + '</td>' +
          '<td>' + AA.ui.flagChip(h.flag) + '</td>' +
          '<td class="td-sub">' + u.esc(h.rep || '—') + '</td>' +
          '<td class="td-sub">' + (u.esc(h.comment) || '—') + '</td>' +
          '<td class="td-sub"><a href="#/visit/' + h.visitId + '">visit →</a></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    root.innerHTML = html;

    AA.chart.render(document.getElementById('trend'), {
      points: hist, range: range, unit: def.unit, decimals: def.decimals
    });

    AA.filters.wireRow(root, render);

    document.getElementById('hist-csv').addEventListener('click', function () {
      var rows = [['Date', 'Test', 'Sample point', 'System', 'Site', 'Value', 'Unit', 'Expected min', 'Expected max', 'Status', 'Rep', 'Comment']];
      hist.forEach(function (h) {
        rows.push([h.date, def.name, pt.name, sys ? sys.name : '', site ? site.name : '',
          h.value, def.unit, range.min != null ? range.min : '', range.max != null ? range.max : '',
          h.flag || '', h.rep || '', h.comment || '']);
      });
      var csv = rows.map(function (r) { return r.map(u.csvCell).join(','); }).join('\n');
      u.download('aquatrack-' + u.slug(site ? site.name : 'site') + '-' + u.slug(def.name) + '.csv', csv, 'text/csv');
    });

    var rangeBtn = document.getElementById('hist-range');
    if (rangeBtn) rangeBtn.addEventListener('click', function () {
      AA.views._editRange(pt.id, def.id, function () { AA.views.history(root, params); });
    });
  }

  render();
};
