/* AquaTrack — hash router & bootstrap */
window.AA = window.AA || {};

(function () {
  var ROUTES = [
    [/^$/, 'dashboard', 'dashboard'],
    [/^dashboard$/, 'dashboard', 'dashboard'],
    [/^sites$/, 'sites', 'sites'],
    [/^site\/([^/]+)$/, 'site', 'sites'],
    [/^system\/([^/]+)$/, 'system', 'sites'],
    [/^history\/([^/]+)\/([^/]+)$/, 'history', 'sites'],
    [/^visit\/new$/, 'visitNew', 'visit'],
    [/^visit\/([^/]+)\/edit$/, 'visitEdit', 'sites'],
    [/^visit\/([^/]+)$/, 'visit', 'sites'],
    [/^map$/, 'map', 'map'],
    [/^settings$/, 'settings', 'settings'],
    [/^settings\/([^/]+)$/, 'settings', 'settings']
  ];

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var qIdx = h.indexOf('?');
    var query = {};
    if (qIdx !== -1) {
      h.slice(qIdx + 1).split('&').forEach(function (kv) {
        var p = kv.split('=');
        if (p[0]) query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
      h = h.slice(0, qIdx);
    }
    return { path: h, query: query };
  }

  function route() {
    var parsed = parseHash();
    var view = document.getElementById('view');

    for (var i = 0; i < ROUTES.length; i++) {
      var m = parsed.path.match(ROUTES[i][0]);
      if (m) {
        /* close any open modal on navigation */
        document.getElementById('modal-root').innerHTML = '';
        document.body.classList.remove('modal-open');

        AA.views[ROUTES[i][1]](view, m.slice(1), parsed.query);

        document.querySelectorAll('#mainnav a').forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('data-nav') === ROUTES[i][2] && !a.classList.contains('nav-cta'));
        });
        window.scrollTo(0, 0);
        return;
      }
    }
    location.hash = '#/dashboard';
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', function () {
    AA.store.load();
    if (!location.hash) location.hash = '#/dashboard';
    route();
  });
})();
