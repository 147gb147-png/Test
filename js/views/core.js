/* AquaTrack — dashboard + sites list + shared site form */
window.AA = window.AA || {};
AA.views = AA.views || {};
AA.forms = AA.forms || {};

/* ------------------------------------------------------- shared site form */
/* Open the add/edit site modal. onDone(site) is called after save. */
AA.forms.site = function (existing, onDone) {
  var u = AA.util;
  var s = existing || { name: '', contact: '', phone: '', email: '', address: { line1: '', city: '', region: '', postal: '', country: '' }, lat: null, lng: null, notes: '' };
  var a = s.address || {};

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
        notes: f.notes.value.trim()
      };
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

/* --------------------------------------------------------------- dashboard */
AA.views.dashboard = function (root) {
  var u = AA.util, st = AA.store;
  var d = st.data;

  if (!d.sites.length) {
    root.innerHTML =
      '<div class="page-head"><div class="grow"><h1>Dashboard</h1></div></div>' +
      '<div class="card"><div class="empty">' +
      '  <h2>Welcome to AquaTrack 💧</h2>' +
      '  <p>Track water treatment test data across your customer sites:<br>' +
      '  <strong>Site → System → Sample Points → Tests → Data</strong>, with expected ranges, flags, comments, trends and a site map.</p>' +
      '  <p><button class="btn btn-primary" id="dash-add-site">+ Add your first site</button>&nbsp;' +
      '  <button class="btn btn-ghost" id="dash-demo">Load demo data</button></p>' +
      '</div></div>';
    document.getElementById('dash-add-site').addEventListener('click', function () {
      AA.forms.site(null, function (site) { location.hash = '#/site/' + site.id; });
    });
    document.getElementById('dash-demo').addEventListener('click', function () {
      st.replaceAll(AA.defaults.demoData());
      AA.ui.toast('Demo data loaded — explore, then reset it in Settings → Data.', 'success');
      AA.views.dashboard(root);
    });
    return;
  }

  var cutoff = u.daysAgoISO(30);
  var visits30 = d.visits.filter(function (v) { return v.date >= cutoff; }).length;
  var actions = st.actionItems();

  var html =
    '<div class="page-head"><div class="grow"><h1>Dashboard</h1>' +
    '<p class="page-sub">' + (d.settings.companyName ? u.esc(d.settings.companyName) + ' — ' : '') + 'program overview across all sites</p></div>' +
    '<div class="actions"><a class="btn btn-primary" href="#/visit/new">+ New Visit</a></div></div>';

  html += '<div class="tiles">' +
    '<div class="tile"><div class="t-label">Sites</div><div class="t-value">' + d.sites.length + '</div></div>' +
    '<div class="tile"><div class="t-label">Systems</div><div class="t-value">' + d.systems.length + '</div></div>' +
    '<div class="tile"><div class="t-label">Visits · last 30 days</div><div class="t-value">' + visits30 + '</div></div>' +
    '<div class="tile' + (actions.length ? ' alert' : '') + '"><div class="t-label">Out-of-range · latest results</div><div class="t-value">' + actions.length + '</div>' +
    '<div class="t-note">' + (actions.length ? 'needs attention' : 'all within range') + '</div></div>' +
    '</div>';

  /* action items */
  html += '<div class="card"><h2>⚠ Action items</h2>';
  if (!actions.length) {
    html += '<p class="td-sub">No out-of-range results in the latest readings. Nice.</p>';
  } else {
    html += '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Site</th><th>System / sample point</th><th>Test</th><th class="num">Result</th><th>Expected</th><th>Status</th><th>Date</th></tr></thead><tbody>';
    actions.slice(0, 12).forEach(function (it) {
      html += '<tr class="rowlink" data-href="#/history/' + it.point.id + '/' + it.test.id + '">' +
        '<td>' + u.esc(it.site ? it.site.name : '?') + '</td>' +
        '<td>' + u.esc(it.system.name) + ' <span class="td-sub">· ' + u.esc(it.point.name) + '</span></td>' +
        '<td>' + u.esc(it.test ? it.test.name : it.flag) + '</td>' +
        '<td class="num"><strong>' + u.fmtNum(it.value, it.test ? it.test.decimals : 1) + '</strong> <span class="td-sub">' + u.esc(it.test ? it.test.unit : '') + '</span></td>' +
        '<td class="td-sub">' + u.esc(u.rangeText(it.range)) + '</td>' +
        '<td>' + AA.ui.flagChip(it.flag) + '</td>' +
        '<td class="td-sub">' + u.fmtDate(it.date) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    if (actions.length > 12) html += '<p class="td-sub">…and ' + (actions.length - 12) + ' more.</p>';
  }
  html += '</div>';

  /* recent visits */
  var recent = d.visits.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 8);
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
};

/* ------------------------------------------------------------- sites list */
AA.views.sites = function (root) {
  var u = AA.util, st = AA.store;
  var sites = st.data.sites.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });

  var html =
    '<div class="page-head"><div class="grow"><h1>Sites</h1>' +
    '<p class="page-sub">Every customer location in your program</p></div>' +
    '<div class="actions"><a class="btn btn-ghost" href="#/map">🗺 View map</a>' +
    '<button class="btn btn-primary" id="add-site-btn">+ Add Site</button></div></div>';

  if (!sites.length) {
    html += '<div class="card"><div class="empty">No sites yet. Add your first customer site to get started.</div></div>';
  } else {
    html += '<div class="card"><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Site</th><th>Address</th><th>Systems</th><th>Last visit</th><th class="num">Open flags</th></tr></thead><tbody>';
    sites.forEach(function (s) {
      var systems = st.systemsOf(s.id);
      var visits = st.visitsOf(s.id);
      var flags = st.actionItems(s.id).length;
      var sysChips = systems.map(function (y) {
        return '<span class="chip chip-type">' + u.esc(y.name) + '</span>';
      }).join(' ') || '<span class="td-sub">none</span>';
      html += '<tr class="rowlink" data-href="#/site/' + s.id + '">' +
        '<td><strong>' + u.esc(s.name) + '</strong>' + (s.contact ? '<div class="td-sub">' + u.esc(s.contact) + '</div>' : '') + '</td>' +
        '<td class="td-sub">' + u.esc(st.addressString(s) || '—') + '</td>' +
        '<td><div class="pill-row">' + sysChips + '</div></td>' +
        '<td class="td-sub">' + (visits.length ? u.fmtDate(visits[0].date) : 'never') + '</td>' +
        '<td class="num">' + (flags ? '<strong style="color:var(--critical)">' + flags + '</strong>' : '0') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  root.innerHTML = html;
  document.getElementById('add-site-btn').addEventListener('click', function () {
    AA.forms.site(null, function (site) { location.hash = '#/site/' + site.id; });
  });
  AA.views._wireRowLinks(root);
};

/* rows with data-href navigate on click */
AA.views._wireRowLinks = function (root) {
  root.querySelectorAll('tr.rowlink').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      location.hash = tr.getAttribute('data-href');
    });
  });
};
