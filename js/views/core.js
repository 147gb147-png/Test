/* FieldLab — dashboard + sites list + shared site form (rep-scoped) */
window.AA = window.AA || {};
AA.views = AA.views || {};
AA.forms = AA.forms || {};

/* ------------------------------------------------------- shared site form */
/* Open the add/edit site modal. onDone(site) is called after save. */
AA.forms.site = function (existing, onDone) {
  var u = AA.util;
  var s = existing || { name: '', contact: '', phone: '', email: '', address: { line1: '', city: '', region: '', postal: '', country: '' }, lat: null, lng: null, notes: '', repId: null, visitFrequency: null };
  var a = s.address || {};
  var isAdmin = !AA.auth.user || AA.auth.user.role === 'admin';

  var repField = '';
  if (AA.env.server && isAdmin) {
    var opts = '<option value="">— unassigned —</option>' + (AA.app.usersCache || []).filter(function (x) { return x.active; }).map(function (x) {
      return '<option value="' + u.esc(x.id) + '"' + (s.repId === x.id ? ' selected' : '') + '>' + u.esc(x.name) + '</option>';
    }).join('');
    repField = '<label class="f">Assigned rep<select name="repId">' + opts + '</select></label>';
  }

  AA.ui.modal({
    title: existing ? 'Edit Site' : 'Add Site',
    wide: true,
    bodyHTML:
      '<div class="f-row">' +
      '  <label class="f">Site / customer name<input name="name" required value="' + u.esc(s.name) + '" placeholder="Riverside Hospital"></label>' +
      '  <label class="f">Contact<input name="contact" value="' + u.esc(s.contact || '') + '" placeholder="Name (role)"></label>' +
      '</div>' +
      '<div class="f-row">' +
      '  <label class="f">Phone<input name="phone" value="' + u.esc(s.phone || '') + '"></label>' +
      '  <label class="f">Email<input name="email" type="email" value="' + u.esc(s.email || '') + '"></label>' +
      '</div>' +
      '<div class="f-row">' +
      repField +
      '  <label class="f">Visit frequency <span class="f-hint">(how often this site must be visited — progress resets each period)</span><select name="freq">' +
      '<option value="">No schedule</option>' +
      AA.store.FREQUENCIES.map(function (fr) {
        return '<option value="' + fr[0] + '"' + (s.visitFrequency === fr[0] ? ' selected' : '') + '>' + fr[1] + '</option>';
      }).join('') +
      '</select></label>' +
      '</div>' +
      '<label class="f">Street address<input name="line1" value="' + u.esc(a.line1 || '') + '" placeholder="1200 River Rd"></label>' +
      '<div class="f-row-3">' +
      '  <label class="f">City<input name="city" value="' + u.esc(a.city || '') + '"></label>' +
      '  <label class="f">State / region<input name="region" value="' + u.esc(a.region || '') + '"></label>' +
      '  <label class="f">Postal code<input name="postal" value="' + u.esc(a.postal || '') + '"></label>' +
      '</div>' +
      '<div class="f-row">' +
      '  <label class="f">Country<input name="country" value="' + u.esc(a.country || '') + '" placeholder="USA"></label>' +
      '  <label class="f">&nbsp;<button type="button" class="btn btn-ghost" id="geo-btn">📍 Find coordinates from address</button></label>' +
      '</div>' +
      '<div class="f-row">' +
      '  <label class="f">Latitude <span class="f-hint">(for the map — auto-filled by lookup)</span><input name="lat" value="' + (s.lat != null ? s.lat : '') + '"></label>' +
      '  <label class="f">Longitude<input name="lng" value="' + (s.lng != null ? s.lng : '') + '"></label>' +
      '</div>' +
      '<label class="f">Site notes<textarea name="notes" placeholder="Access instructions, safety requirements…">' + u.esc(s.notes || '') + '</textarea></label>',
    onSubmit: function (form, close) {
      var f = form.elements;
      var patch = {
        name: f.name.value.trim(),
        contact: f.contact.value.trim(),
        phone: f.phone.value.trim(),
        email: f.email.value.trim(),
        address: {
          line1: f.line1.value.trim(), city: f.city.value.trim(), region: f.region.value.trim(),
          postal: f.postal.value.trim(), country: f.country.value.trim()
        },
        lat: AA.util.num(f.lat.value), lng: AA.util.num(f.lng.value),
        visitFrequency: f.freq.value || null,
        notes: f.notes.value.trim()
      };
      if (f.repId) patch.repId = f.repId.value || null;
      if (!patch.name) return;
      var saved;
      if (existing) { AA.store.updateSite(existing.id, patch); saved = AA.store.getSite(existing.id); }
      else { saved = AA.store.addSite(patch); }
      close();
      AA.ui.toast(existing ? 'Site updated.' : 'Site added.', 'success');
      if (onDone) onDone(saved);
    }
  });

  var geoBtn = document.getElementById('geo-btn');
  geoBtn.addEventListener('click', function () {
    var form = geoBtn.closest('form');
    var f = form.elements;
    var q = [f.line1.value, f.city.value, f.region.value, f.postal.value, f.country.value]
      .map(function (x) { return x.trim(); }).filter(Boolean).join(', ');
    if (!q) { AA.ui.toast('Enter an address first.', 'error'); return; }
    geoBtn.disabled = true;
    geoBtn.textContent = 'Looking up…';
    AA.geocode.lookup(q).then(function (res) {
      if (res) {
        f.lat.value = res.lat.toFixed(6);
        f.lng.value = res.lng.toFixed(6);
        AA.ui.toast('Found: ' + res.display, 'success');
      } else {
        AA.ui.toast('Address not found — try simplifying it, or enter coordinates manually.', 'error');
      }
    }).catch(function () {
      AA.ui.toast('Geocoding failed (offline?). You can enter coordinates manually.', 'error');
    }).then(function () {
      geoBtn.disabled = false;
      geoBtn.textContent = '📍 Find coordinates from address';
    });
  });
};

/* Admin-only rep filter row (server mode). Scopes everything below it. */
AA.views._repFilterRow = function () {
  if (!AA.env.server || !AA.auth.user || AA.auth.user.role !== 'admin') return '';
  var u = AA.util;
  var opts = '<option value="all"' + (AA.state.repFilter === 'all' ? ' selected' : '') + '>All reps</option>' +
    '<option value="none"' + (AA.state.repFilter === 'none' ? ' selected' : '') + '>Unassigned sites</option>' +
    (AA.app.usersCache || []).filter(function (x) { return x.active; }).map(function (x) {
      return '<option value="' + u.esc(x.id) + '"' + (AA.state.repFilter === x.id ? ' selected' : '') + '>' + u.esc(x.name) + '</option>';
    }).join('');
  return '<div class="filter-row no-print"><label class="f-inline">Rep <select id="rep-filter">' + opts + '</select></label></div>';
};

AA.views._wireRepFilter = function (root, rerender) {
  var sel = root.querySelector('#rep-filter');
  if (sel) sel.addEventListener('change', function () {
    AA.state.repFilter = sel.value;
    rerender();
  });
};

/* --------------------------------------------------------------- dashboard */
AA.views.dashboard = function (root) {
  var u = AA.util, st = AA.store;
  var d = st.data;
  var isRep = AA.auth.user && AA.auth.user.role === 'rep';

  if (!d.sites.length) {
    var canDemo = !isRep;
    root.innerHTML =
      '<div class="page-head"><div class="grow"><h1>Dashboard</h1></div></div>' +
      '<div class="card"><div class="empty">' +
      '  <h2>Welcome to FieldLab 💧</h2>' +
      '  <p>Track water treatment test data across your customer sites:<br>' +
      '  <strong>Site → System → Sample Points → Tests → Data</strong>, with expected ranges, flags, comments, trends and a site map.</p>' +
      '  <p><button class="btn btn-primary" id="dash-add-site">+ Add your first site</button>&nbsp;' +
      (canDemo ? '  <button class="btn btn-ghost" id="dash-demo">Load demo data</button>' : '') + '</p>' +
      (AA.env.server && AA.auth.user && AA.auth.user.role === 'admin'
        ? '<p class="f-hint">Tip: add your reps under <a href="#/admin">Admin</a>, then assign each site to a rep.</p>' : '') +
      '</div></div>';
    document.getElementById('dash-add-site').addEventListener('click', function () {
      AA.forms.site(null, function (site) { location.hash = '#/site/' + site.id; });
    });
    var demoBtn = document.getElementById('dash-demo');
    if (demoBtn) demoBtn.addEventListener('click', function () {
      st.replaceAll(AA.defaults.demoData());
      AA.ui.toast('Demo data loaded — explore, then reset it in Settings → Data.', 'success');
      AA.views.dashboard(root);
    });
    return;
  }

  var scope = st.scopedSiteIds();
  var scopedSites = st.scopedSites();
  var cutoff = u.daysAgoISO(30);
  var visits30 = d.visits.filter(function (v) { return scope[v.siteId] && v.date >= cutoff; }).length;
  var actions = st.actionItems(null, scope);
  var progress = st.visitProgress(scope);
  var lowInv = st.lowInventory(scope);
  var kpi = st.inRangeKPI(30, scope);

  var html =
    '<div class="page-head"><div class="grow"><h1>Dashboard</h1>' +
    '<p class="page-sub">' + (d.settings.companyName ? u.esc(d.settings.companyName) + ' — ' : '') +
    (isRep ? 'your book of business' : 'program overview') + '</p></div>' +
    '<div class="actions"><a class="btn btn-primary" href="#/visit/new">+ New Visit</a></div></div>';

  html += AA.views._repFilterRow();

  html += '<div class="tiles tiles-5">' +
    '<div class="tile"><div class="t-label">Sites</div><div class="t-value">' + scopedSites.length + '</div></div>' +
    '<div class="tile"><div class="t-label">Visits · last 30 days</div><div class="t-value">' + visits30 + '</div></div>' +
    '<div class="tile"><div class="t-label">Results in range · 30d</div><div class="t-value">' + (kpi ? kpi.pct + '%' : '—') + '</div>' + (kpi ? '<div class="t-note">of ' + kpi.total + ' readings</div>' : '<div class="t-note">no recent readings</div>') + '</div>' +
    '<div class="tile' + (actions.length ? ' alert' : '') + '"><div class="t-label">Out-of-range · latest</div><div class="t-value">' + actions.length + '</div>' +
    '<div class="t-note">' + (actions.length ? 'needs attention' : 'all within range') + '</div></div>' +
    '<div class="tile"><div class="t-label">Visits completed · this period</div>' +
    (progress.total
      ? '<div class="t-value">' + progress.done + '<span class="t-of">/' + progress.total + '</span></div>' +
        '<div class="meter" role="img" aria-label="' + progress.pct + '% of scheduled sites visited"><div class="meter-fill" style="width:' + progress.pct + '%"></div></div>' +
        '<div class="t-note">' + (progress.due.length ? progress.due.length + ' site' + (progress.due.length > 1 ? 's' : '') + ' still due' : 'all scheduled sites visited ✓') + '</div>'
      : '<div class="t-value">—</div><div class="t-note">no visit schedules set</div>') +
    '</div></div>';

  /* action items */
  html += '<div class="card"><h2>⚠ Action items</h2>';
  if (!actions.length && !lowInv.length) {
    html += '<p class="td-sub">No out-of-range results or low inventory in the latest readings. Nice.</p>';
  } else {
    html += '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Site</th><th>Where</th><th>What</th><th class="num">Result</th><th>Expected</th><th>Status</th><th>Date</th></tr></thead><tbody>';
    actions.slice(0, 15).forEach(function (it) {
      html += '<tr class="rowlink" data-href="#/history/' + it.point.id + '/' + it.test.id + '">' +
        '<td>' + u.esc(it.site ? it.site.name : '?') + '</td>' +
        '<td class="td-sub">' + u.esc(it.system.name) + ' · ' + u.esc(it.point.name) + '</td>' +
        '<td>' + u.esc(it.test ? it.test.name : '') + '</td>' +
        '<td class="num"><strong>' + u.fmtNum(it.value, it.test ? it.test.decimals : 1) + '</strong> <span class="td-sub">' + u.esc(it.test ? it.test.unit : '') + '</span></td>' +
        '<td class="td-sub">' + u.esc(u.rangeText(it.range)) + '</td>' +
        '<td>' + AA.ui.flagChip(it.flag) + (it.streak >= 3 ? ' ' + AA.ui.chronicChip() : '') + '</td>' +
        '<td class="td-sub">' + u.fmtDate(it.date) + '</td></tr>';
    });
    lowInv.forEach(function (it) {
      html += '<tr class="rowlink" data-href="#/system/' + it.system.id + '">' +
        '<td>' + u.esc(it.site ? it.site.name : '?') + '</td>' +
        '<td class="td-sub">' + u.esc(it.system.name) + '</td>' +
        '<td>' + u.esc(it.product ? it.product.name : 'Product') + '</td>' +
        '<td class="num"><strong>' + u.fmtNum(it.level, 0) + '</strong> <span class="td-sub">' + u.esc(it.assignment.unit || '') + '</span></td>' +
        '<td class="td-sub">low at ≤ ' + it.assignment.lowLevel + '</td>' +
        '<td><span class="chip chip-low">▼ Low stock</span></td>' +
        '<td class="td-sub">' + u.fmtDate(it.date) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    if (actions.length > 15) html += '<p class="td-sub">…and ' + (actions.length - 15) + ' more.</p>';
  }
  html += '</div>';

  /* sites still due this period */
  if (progress.due.length) {
    html += '<div class="card"><h2>📅 Due this period · ' + progress.done + '/' + progress.total + ' completed</h2>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Site</th><th>Schedule</th><th>Period</th><th>Last visit</th><th class="num">Days left</th><th></th></tr></thead><tbody>';
    progress.due.forEach(function (o) {
      html += '<tr class="rowlink" data-href="#/site/' + o.site.id + '">' +
        '<td><strong>' + u.esc(o.site.name) + '</strong></td>' +
        '<td><span class="chip chip-none">' + u.esc(st.freqLabel(o.status.freq)) + '</span></td>' +
        '<td class="td-sub">' + u.esc(o.status.label) + '</td>' +
        '<td class="td-sub">' + (o.status.lastVisit ? u.fmtDate(o.status.lastVisit) : 'never visited') + '</td>' +
        '<td class="num">' + o.status.daysLeft + '</td>' +
        '<td class="td-sub"><a href="#/visit/new?site=' + o.site.id + '">record visit →</a></td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  /* recent visits */
  var recent = d.visits.filter(function (v) { return scope[v.siteId]; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 8);
  html += '<div class="card"><h2>Recent visits</h2>';
  if (!recent.length) {
    html += '<p class="td-sub">No visits recorded yet. <a href="#/visit/new">Record the first one →</a></p>';
  } else {
    html += '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Date</th><th>Site</th><th>Rep</th><th class="num">Results</th><th class="num">Flagged</th><th></th></tr></thead><tbody>';
    recent.forEach(function (v) {
      var site = st.getSite(v.siteId);
      var stats = st.visitStats(v);
      html += '<tr class="rowlink" data-href="#/visit/' + v.id + '">' +
        '<td>' + u.fmtDate(v.date) + '</td>' +
        '<td>' + u.esc(site ? site.name : '(deleted site)') + '</td>' +
        '<td>' + u.esc(v.rep || '—') + '</td>' +
        '<td class="num">' + stats.readings + '</td>' +
        '<td class="num">' + (stats.flagged ? '<strong style="color:var(--critical)">' + stats.flagged + '</strong>' : '0') + '</td>' +
        '<td class="td-sub">view →</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  root.innerHTML = html;
  AA.views._wireRowLinks(root);
  AA.views._wireRepFilter(root, function () { AA.views.dashboard(root); });
};

/* ------------------------------------------------------------- sites list */
AA.views.sites = function (root) {
  var u = AA.util, st = AA.store;
  var sites = st.scopedSites().slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  var showRepCol = AA.env.server && AA.auth.user && AA.auth.user.role === 'admin';

  var html =
    '<div class="page-head"><div class="grow"><h1>Sites</h1>' +
    '<p class="page-sub">' + (AA.auth.user && AA.auth.user.role === 'rep' ? 'Sites assigned to you' : 'Every customer location in your program') + '</p></div>' +
    '<div class="actions"><a class="btn btn-ghost" href="#/map">🗺 View map</a>' +
    '<button class="btn btn-primary" id="add-site-btn">+ Add Site</button></div></div>';

  html += AA.views._repFilterRow();

  if (!sites.length) {
    html += '<div class="card"><div class="empty">No sites here yet.' +
      (AA.auth.user && AA.auth.user.role === 'rep' ? '<br>Add a site (it will be assigned to you), or ask your admin to assign existing sites.' : '') +
      '</div></div>';
  } else {
    var prog = st.visitProgress((function () { var m = {}; sites.forEach(function (s) { m[s.id] = true; }); return m; })());
    if (prog.total) {
      html += '<div class="filter-row"><span class="progress-inline">This period: <strong>' + prog.done + '/' + prog.total + '</strong> scheduled sites visited' +
        '<span class="meter meter-inline"><span class="meter-fill" style="width:' + prog.pct + '%"></span></span></span></div>';
    }
    html += '<div class="card"><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Site</th><th>Address</th>' + (showRepCol ? '<th>Rep</th>' : '') + '<th>Systems</th><th>Last visit</th><th>This period</th><th class="num">Open flags</th></tr></thead><tbody>';
    sites.forEach(function (s) {
      var systems = st.systemsOf(s.id);
      var flags = st.actionItems(s.id).length;
      var status = st.siteVisitStatus(s);
      var sysChips = systems.map(function (y) {
        return '<span class="chip chip-type">' + u.esc(y.name) + '</span>';
      }).join(' ') || '<span class="td-sub">none</span>';
      var periodCell = !status.scheduled
        ? '<span class="td-sub">no schedule</span>'
        : (status.completed
          ? '<span class="chip chip-done" title="Visited during the current period (' + u.esc(status.label) + ')">✓ Visited · ' + u.esc(status.label) + '</span>'
          : '<span class="chip chip-due" title="No visit yet this period — ' + status.daysLeft + ' days left">○ Due · ' + u.esc(status.label) + '</span>');
      html += '<tr class="rowlink" data-href="#/site/' + s.id + '">' +
        '<td><strong>' + u.esc(s.name) + '</strong>' + (s.contact ? '<div class="td-sub">' + u.esc(s.contact) + '</div>' : '') + '</td>' +
        '<td class="td-sub">' + u.esc(st.addressString(s) || '—') + '</td>' +
        (showRepCol ? '<td class="td-sub">' + u.esc(AA.app.repName(s.repId) || '—') + '</td>' : '') +
        '<td><div class="pill-row">' + sysChips + '</div></td>' +
        '<td class="td-sub">' + (status.lastVisit ? u.fmtDate(status.lastVisit) : 'never') + '</td>' +
        '<td>' + periodCell + '</td>' +
        '<td class="num">' + (flags ? '<strong style="color:var(--critical)">' + flags + '</strong>' : '0') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  root.innerHTML = html;
  document.getElementById('add-site-btn').addEventListener('click', function () {
    AA.forms.site(null, function (site) { location.hash = '#/site/' + site.id; });
  });
  AA.views._wireRowLinks(root);
  AA.views._wireRepFilter(root, function () { AA.views.sites(root); });
};

/* rows with data-href navigate on click */
AA.views._wireRowLinks = function (root) {
  root.querySelectorAll('tr.rowlink').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      if (e.target.closest('a, button, select, input')) return;
      location.hash = tr.getAttribute('data-href');
    });
  });
};
