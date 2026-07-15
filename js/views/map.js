/* AquaTrack — interactive site map (Leaflet + OpenStreetMap) */
window.AA = window.AA || {};
AA.views = AA.views || {};

AA.views.map = function (root) {
  var u = AA.util, st = AA.store;
  var sites = st.data.sites;
  var located = sites.filter(function (s) { return s.lat != null && s.lng != null; });
  var missing = sites.filter(function (s) { return (s.lat == null || s.lng == null) && st.addressString(s); });

  var html =
    '<div class="page-head"><div class="grow"><h1>Site Map</h1>' +
    '<p class="page-sub">' + located.length + ' of ' + sites.length + ' sites located · red markers have out-of-range results</p></div>' +
    '<div class="actions">' +
    (missing.length ? '<button class="btn btn-ghost" id="geo-all">📍 Geocode ' + missing.length + ' missing address' + (missing.length > 1 ? 'es' : '') + '</button>' : '') +
    '<button class="btn btn-primary" id="map-add-site">+ Add Site</button>' +
    '</div></div>';

  if (typeof L === 'undefined') {
    html += '<div class="card"><div class="empty">The map library could not load (no internet connection?).<br>Site coordinates are still saved — the map will appear when you’re back online.</div></div>';
    root.innerHTML = html;
    var addBtnOffline = document.getElementById('map-add-site');
    if (addBtnOffline) addBtnOffline.addEventListener('click', function () { AA.forms.site(null, function () { AA.views.map(root); }); });
    return;
  }

  html += '<div class="card" style="padding:8px"><div id="map-canvas"></div></div>';
  if (!sites.length) {
    html += '<div class="card"><div class="empty">No sites yet — add one and its address to see it here.</div></div>';
  } else if (!located.length) {
    html += '<div class="card"><div class="empty">No sites have coordinates yet. Use “Geocode missing addresses” above, or set coordinates when editing a site.</div></div>';
  }
  root.innerHTML = html;

  var map = L.map('map-canvas', { scrollWheelZoom: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var bounds = [];
  located.forEach(function (s) {
    var flags = st.actionItems(s.id).length;
    var visits = st.visitsOf(s.id);
    var marker = L.circleMarker([s.lat, s.lng], {
      radius: 9,
      color: '#fcfcfb',
      weight: 2,
      fillColor: flags ? '#d03b3b' : '#2a78d6',
      fillOpacity: 0.9
    }).addTo(map);

    /* popup built with textContent — site fields are user data */
    var pop = document.createElement('div');
    pop.className = 'map-popup';
    var nm = document.createElement('div'); nm.className = 'mp-name'; nm.textContent = s.name;
    var ad = document.createElement('div'); ad.className = 'mp-addr'; ad.textContent = st.addressString(s);
    var meta = document.createElement('div'); meta.className = 'mp-meta';
    meta.textContent = (visits.length ? 'Last visit ' + u.fmtDate(visits[0].date) : 'No visits yet');
    pop.appendChild(nm); pop.appendChild(ad); pop.appendChild(meta);
    if (flags) {
      var fl = document.createElement('div'); fl.className = 'mp-flags';
      fl.textContent = '▲ ' + flags + ' result' + (flags > 1 ? 's' : '') + ' out of range';
      pop.appendChild(fl);
    }
    var lnk = document.createElement('a');
    lnk.href = '#/site/' + s.id;
    lnk.textContent = 'Open site →';
    pop.appendChild(lnk);

    marker.bindPopup(pop);
    bounds.push([s.lat, s.lng]);
  });

  if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
  else if (bounds.length === 1) map.setView(bounds[0], 13);
  else map.setView([39.5, -85], 5);

  var addBtn = document.getElementById('map-add-site');
  addBtn.addEventListener('click', function () {
    AA.forms.site(null, function () { AA.views.map(root); });
  });

  var geoBtn = document.getElementById('geo-all');
  if (geoBtn) {
    geoBtn.addEventListener('click', function () {
      geoBtn.disabled = true;
      geoBtn.textContent = 'Geocoding… (about 1 per second)';
      AA.geocode.fillMissing(function (done, total, site, ok) {
        geoBtn.textContent = 'Geocoding ' + done + '/' + total + '…';
        if (!ok) AA.ui.toast('Could not locate: ' + site.name, 'error');
      }).then(function (res) {
        AA.ui.toast('Geocoding finished (' + res.done + ' processed).', 'success');
        AA.views.map(root);
      });
    });
  }
};
