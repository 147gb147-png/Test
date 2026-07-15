/* AquaTrack — visit data entry (the rep's on-site workflow) + visit report */
window.AA = window.AA || {};
AA.views = AA.views || {};

/* ------------------------------------------------------------ entry form */
/* Used for both #/visit/new (query.site optional) and #/visit/:id/edit */
AA.views.visitForm = function (root, params, query, editVisit) {
  var u = AA.util, st = AA.store;

  if (!st.data.sites.length) {
    root.innerHTML = '<div class="card"><div class="empty">Add a site before recording a visit.<br><a class="btn btn-primary" href="#/sites">Go to Sites</a></div></div>';
    return;
  }

  var siteId = editVisit ? editVisit.siteId : (query.site || st.data.sites[0].id);
  if (!st.getSite(siteId)) siteId = st.data.sites[0].id;

  function readingFor(ptId, testId) {
    if (!editVisit) return null;
    return editVisit.readings.find(function (r) { return r.samplePointId === ptId && r.testId === testId; }) || null;
  }

  function render() {
    var site = st.getSite(siteId);
    var systems = st.systemsOf(siteId);

    var siteOpts = st.data.sites.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === siteId ? ' selected' : '') + '>' + u.esc(s.name) + '</option>';
    }).join('');

    var html =
      '<div class="page-head"><div class="grow">' +
      '<div class="crumbs"><a href="#/site/' + site.id + '">' + u.esc(site.name) + '</a></div>' +
      '<h1>' + (editVisit ? 'Edit Visit — ' + u.fmtDate(editVisit.date) : 'New Site Visit') + '</h1>' +
      '<p class="page-sub">Enter results as you test — anything outside the expected range is flagged immediately. Blank fields are simply skipped.</p>' +
      '</div></div>';

    html += '<div class="card"><div class="f-row-3">' +
      '<label class="f">Site' + (editVisit ? '<input value="' + u.esc(site.name) + '" disabled>' : '<select id="visit-site">' + siteOpts + '</select>') + '</label>' +
      '<label class="f">Date<input type="date" id="visit-date" value="' + (editVisit ? editVisit.date : u.todayISO()) + '"></label>' +
      '<label class="f">Representative<input id="visit-rep" value="' + u.esc(editVisit ? (editVisit.rep || '') : (st.data.settings.defaultRep || '')) + '" placeholder="Your name"></label>' +
      '</div></div>';

    if (!systems.length) {
      html += '<div class="card"><div class="empty">This site has no systems yet — <a href="#/site/' + site.id + '">add a Boiler or Cooling Tower system first</a>.</div></div>';
    }

    systems.forEach(function (sys) {
      var points = st.pointsOf(sys.id);
      var tpl = st.data.templates[sys.type];
      html += '<div class="card"><h2>' + u.esc(sys.name) + ' <span class="chip chip-type">' + u.esc(tpl ? tpl.label : sys.type) + '</span></h2>';
      if (!points.length) html += '<p class="td-sub">No sample points configured.</p>';
      points.forEach(function (pt) {
        html += '<div class="vp-point"><h4>🧪 ' + u.esc(pt.name) + '</h4><div class="vp-grid">';
        pt.tests.forEach(function (t) {
          var def = st.getTest(t.testId);
          if (!def) return;
          var range = st.effRange(pt, t.testId);
          var r = readingFor(pt.id, t.testId);
          var val = r && r.value != null ? r.value : '';
          var comment = r ? (r.comment || '') : '';
          html +=
            '<div class="vp-test" data-pt="' + pt.id + '" data-test="' + def.id + '">' +
            '<div class="vt-name"><span>' + u.esc(def.name) + '</span><span class="vt-range">' + u.esc(u.rangeText(range)) + '</span></div>' +
            '<div class="vt-row">' +
            '<input class="vt-input" type="number" step="any" inputmode="decimal" value="' + val + '" data-min="' + (range.min != null ? range.min : '') + '" data-max="' + (range.max != null ? range.max : '') + '" aria-label="' + u.esc(def.name) + '">' +
            (def.unit ? '<span class="vt-unit">' + u.esc(def.unit) + '</span>' : '') +
            '<button type="button" class="vt-comment-btn' + (comment ? ' has' : '') + '" title="Add a comment for the customer">💬</button>' +
            '</div>' +
            '<textarea class="vt-comment" placeholder="Optional comment shown on the report…" style="' + (comment ? '' : 'display:none') + '">' + u.esc(comment) + '</textarea>' +
            '<div class="vt-flag"></div>' +
            '</div>';
        });
        html += '</div></div>';
      });
      html += '</div>';
    });

    html += '<div class="card"><label class="f">Visit notes / recommendations <span class="f-hint">(appears on the service report)</span>' +
      '<textarea id="visit-notes" placeholder="Overall observations, recommendations, actions taken…">' + u.esc(editVisit ? (editVisit.notes || '') : '') + '</textarea></label>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
      (editVisit ? '<a class="btn btn-ghost" href="#/visit/' + editVisit.id + '">Cancel</a>' : '<a class="btn btn-ghost" href="#/site/' + site.id + '">Cancel</a>') +
      '<button class="btn btn-primary" id="visit-save">💾 Save visit</button>' +
      '</div></div>';

    root.innerHTML = html;

    /* live flagging as values are typed */
    function updateFlag(box) {
      var input = box.querySelector('.vt-input');
      var flagEl = box.querySelector('.vt-flag');
      var v = u.num(input.value);
      var range = { min: u.num(input.getAttribute('data-min')), max: u.num(input.getAttribute('data-max')) };
      var f = st.evalFlag(v, range);
      if (v == null) { flagEl.innerHTML = ''; input.classList.remove('out'); return; }
      flagEl.innerHTML = AA.ui.flagChip(f);
      input.classList.toggle('out', f === 'low' || f === 'high');
    }

    root.querySelectorAll('.vp-test').forEach(function (box) {
      var input = box.querySelector('.vt-input');
      input.addEventListener('input', function () { updateFlag(box); });
      updateFlag(box);
      box.querySelector('.vt-comment-btn').addEventListener('click', function () {
        var ta = box.querySelector('.vt-comment');
        ta.style.display = ta.style.display === 'none' ? '' : 'none';
        if (ta.style.display !== 'none') ta.focus();
      });
    });

    var siteSel = document.getElementById('visit-site');
    if (siteSel) {
      siteSel.addEventListener('change', function () {
        siteId = siteSel.value;
        render();
      });
    }

    document.getElementById('visit-save').addEventListener('click', function () {
      var readings = [];
      root.querySelectorAll('.vp-test').forEach(function (box) {
        var v = u.num(box.querySelector('.vt-input').value);
        var comment = box.querySelector('.vt-comment').value.trim();
        if (v == null && !comment) return;
        readings.push({
          samplePointId: box.getAttribute('data-pt'),
          testId: box.getAttribute('data-test'),
          value: v,
          comment: comment
        });
      });
      if (!readings.length && !document.getElementById('visit-notes').value.trim()) {
        AA.ui.toast('Nothing to save — enter at least one result or a note.', 'error');
        return;
      }
      var payload = {
        siteId: siteId,
        date: document.getElementById('visit-date').value || u.todayISO(),
        rep: document.getElementById('visit-rep').value.trim(),
        notes: document.getElementById('visit-notes').value.trim(),
        readings: readings
      };
      var id;
      if (editVisit) { st.updateVisit(editVisit.id, payload); id = editVisit.id; }
      else { id = st.addVisit(payload).id; }
      AA.ui.toast('Visit saved.', 'success');
      location.hash = '#/visit/' + id;
    });
  }

  render();
};

AA.views.visitNew = function (root, params, query) {
  AA.views.visitForm(root, params, query, null);
};

AA.views.visitEdit = function (root, params, query) {
  var v = AA.store.getVisit(params[0]);
  if (!v) { root.innerHTML = '<div class="card"><div class="empty">Visit not found.</div></div>'; return; }
  AA.views.visitForm(root, params, query, v);
};

/* --------------------------------------------------------- visit report */
AA.views.visit = function (root, params) {
  var u = AA.util, st = AA.store;
  var v = st.getVisit(params[0]);
  if (!v) { root.innerHTML = '<div class="card"><div class="empty">Visit not found.</div></div>'; return; }
  var site = st.getSite(v.siteId);
  var stats = st.visitStats(v);

  var html =
    '<div class="page-head"><div class="grow">' +
    '<div class="crumbs"><a href="#/sites">Sites</a> / <a href="#/site/' + (site ? site.id : '') + '">' + u.esc(site ? site.name : '(deleted site)') + '</a> / Visit</div>' +
    '<h1>Service Report</h1>' +
    '<p class="page-sub">' + u.fmtDate(v.date) + (v.rep ? ' · ' + u.esc(v.rep) : '') + ' · ' + stats.readings + ' results' +
    (stats.flagged ? ' · <strong style="color:var(--critical)">' + stats.flagged + ' out of range</strong>' : ' · all in range') + '</p>' +
    '</div><div class="actions no-print">' +
    '<button class="btn btn-ghost" onclick="window.print()">🖨 Print / PDF</button>' +
    '<a class="btn btn-ghost" href="#/visit/' + v.id + '/edit">Edit</a>' +
    '<button class="btn btn-danger" id="visit-del">Delete</button>' +
    '</div></div>';

  /* report header */
  html += '<div class="card"><dl class="kv">' +
    (st.data.settings.companyName ? '<dt>Service provider</dt><dd>' + u.esc(st.data.settings.companyName) + '</dd>' : '') +
    '<dt>Customer / site</dt><dd>' + u.esc(site ? site.name : '(deleted site)') + '</dd>' +
    (site && st.addressString(site) ? '<dt>Address</dt><dd>' + u.esc(st.addressString(site)) + '</dd>' : '') +
    '<dt>Visit date</dt><dd>' + u.fmtDate(v.date) + '</dd>' +
    (v.rep ? '<dt>Representative</dt><dd>' + u.esc(v.rep) + '</dd>' : '') +
    '</dl></div>';

  /* results grouped by system, then sample point */
  var bySystem = {};
  v.readings.forEach(function (r) {
    var pt = st.getPoint(r.samplePointId);
    if (!pt) return;
    if (!bySystem[pt.systemId]) bySystem[pt.systemId] = {};
    if (!bySystem[pt.systemId][pt.id]) bySystem[pt.systemId][pt.id] = [];
    bySystem[pt.systemId][pt.id].push(r);
  });

  Object.keys(bySystem).forEach(function (sysId) {
    var sys = st.getSystem(sysId);
    html += '<div class="card"><h2>' + u.esc(sys ? sys.name : '(deleted system)') + '</h2>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Sample point</th><th>Test</th><th class="num">Result</th><th>Expected</th><th>Status</th><th>Comment</th></tr></thead><tbody>';
    Object.keys(bySystem[sysId]).forEach(function (ptId) {
      var pt = st.getPoint(ptId);
      bySystem[sysId][ptId].forEach(function (r, i) {
        var def = st.getTest(r.testId);
        var range = st.effRange(pt, r.testId);
        var flag = st.evalFlag(r.value, range);
        html += '<tr>' +
          '<td>' + (i === 0 ? '<strong>' + u.esc(pt.name) + '</strong>' : '') + '</td>' +
          '<td>' + u.esc(def ? def.name : r.testId) + '</td>' +
          '<td class="num">' + (r.value != null ? '<strong>' + u.fmtNum(r.value, def ? def.decimals : 1) + '</strong>' + (def && def.unit ? ' <span class="td-sub">' + u.esc(def.unit) + '</span>' : '') : '—') + '</td>' +
          '<td class="td-sub">' + u.esc(u.rangeText(range)) + '</td>' +
          '<td>' + (r.value != null ? AA.ui.flagChip(flag) : '<span class="td-sub">—</span>') + '</td>' +
          '<td class="td-sub">' + (u.esc(r.comment) || '') + '</td></tr>';
      });
    });
    html += '</tbody></table></div></div>';
  });

  if (v.notes) {
    html += '<div class="card"><h2>Notes & recommendations</h2><p style="white-space:pre-wrap">' + u.esc(v.notes) + '</p></div>';
  }

  root.innerHTML = html;

  document.getElementById('visit-del').addEventListener('click', function () {
    if (confirm('Delete this visit and all its readings?')) {
      st.deleteVisit(v.id);
      AA.ui.toast('Visit deleted.');
      location.hash = site ? '#/site/' + site.id : '#/sites';
    }
  });
};
