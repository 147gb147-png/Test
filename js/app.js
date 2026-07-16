/* FieldLab — bootstrap, auth flow, hash router, background sync */
window.AA = window.AA || {};

AA.app = (function () {
  var ROUTES = [
    [/^$/, 'dashboard', 'dashboard'],
    [/^dashboard$/, 'dashboard', 'dashboard'],
    [/^sites$/, 'sites', 'sites'],
    [/^site\/([^/]+)$/, 'site', 'sites'],
    [/^system\/([^/]+)$/, 'system', 'sites'],
    [/^ranges\/([^/]+)$/, 'ranges', 'sites'],
    [/^trends\/([^/]+)$/, 'trends', 'sites'],
    [/^history\/([^/]+)\/([^/]+)$/, 'history', 'sites'],
    [/^visit\/new$/, 'visitNew', 'visit'],
    [/^visit\/([^/]+)\/edit$/, 'visitEdit', 'sites'],
    [/^visit\/([^/]+)$/, 'visit', 'sites'],
    [/^map$/, 'map', 'map'],
    [/^admin$/, 'admin', 'admin'],
    [/^admin\/rep\/([^/]+)$/, 'adminRep', 'admin'],
    [/^settings$/, 'settings', 'settings'],
    [/^settings\/([^/]+)$/, 'settings', 'settings']
  ];

  var app = { ready: false, needLogin: false, usersCache: [] };

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
    var view = document.getElementById('view');
    if (!app.ready) return;
    if (app.needLogin) { AA.views.login(view); return; }

    var parsed = parseHash();
    for (var i = 0; i < ROUTES.length; i++) {
      var m = parsed.path.match(ROUTES[i][0]);
      if (m) {
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

  app.rerender = route;

  /* Cached user directory (server mode) — for rep names, filters, admin views */
  app.refreshUsers = function () {
    if (!AA.env.server || !AA.auth.user) return Promise.resolve([]);
    return AA.api.users().then(function (resp) {
      app.usersCache = resp.users || [];
      return app.usersCache;
    }).catch(function () { return app.usersCache; });
  };

  app.userById = function (id) {
    return app.usersCache.find(function (u) { return u.id === id; }) || null;
  };

  app.repName = function (id) {
    var u = app.userById(id);
    return u ? u.name : null;
  };

  /* ------------------------------------------------------------- nav & auth */
  function renderNavUser() {
    var host = document.getElementById('nav-user');
    var adminLink = document.querySelector('#mainnav a[data-nav="admin"]');
    if (adminLink) adminLink.style.display =
      (AA.auth.user && AA.auth.user.role === 'admin') ? '' : 'none';

    if (!AA.env.server) {
      host.innerHTML = '<span class="user-chip" title="No FieldLab server reachable — data is saved on this device only. Run: node server.js">Solo mode</span>';
      return;
    }
    if (!AA.auth.user) { host.innerHTML = ''; return; }
    host.innerHTML =
      '<span class="user-chip" title="Signed in as ' + AA.util.esc(AA.auth.user.username) + '">' +
      (AA.auth.user.role === 'admin' ? '★ ' : '') + AA.util.esc(AA.auth.user.name) + '</span>' +
      '<button class="btn btn-ghost btn-sm" id="logout-btn">Sign out</button>';
    document.getElementById('logout-btn').addEventListener('click', function () {
      AA.api.logout().catch(function () {});
      AA.api.setToken(null);
      location.reload();
    });
  }

  app.forceLogin = function () {
    AA.api.setToken(null);
    AA.auth.user = null;
    app.needLogin = true;
    renderNavUser();
    route();
  };

  /* Called by the login view after a successful sign-in */
  app.afterLogin = function () {
    app.needLogin = false;
    return AA.api.state().then(function (resp) {
      AA.store.initServer(resp);
      return app.refreshUsers();
    }).then(function () {
      renderNavUser();
      if (!location.hash || location.hash === '#/login') location.hash = '#/dashboard';
      route();
    });
  };

  /* ----------------------------------------------------------------- boot */
  function boot() {
    AA.api.loginList().then(function (ll) {
      AA.env.server = true;
      app.loginList = ll;
      if (AA.api.token) {
        return AA.api.me().then(function (resp) {
          AA.auth.user = resp.user;
          return AA.api.state().then(function (stateResp) {
            AA.store.initServer(stateResp);
            return app.refreshUsers();
          });
        }).catch(function () {
          AA.api.setToken(null);
          app.needLogin = true;
        });
      }
      app.needLogin = true;
    }).catch(function () {
      /* no server — solo mode on this device */
      AA.env.server = false;
      AA.store.initSolo();
    }).then(function () {
      app.ready = true;
      renderNavUser();
      if (!location.hash) location.hash = '#/dashboard';
      route();
    });
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', boot);

  /* background freshness: pull other users' changes every 15 s when idle */
  setInterval(function () {
    if (!app.ready || app.needLogin) return;
    AA.store.pull().then(function (changed) {
      if (changed) route();
    });
  }, 15000);

  window.addEventListener('beforeunload', function (e) {
    if (AA.store.hasUnsaved && AA.store.hasUnsaved()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  return app;
})();
