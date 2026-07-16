/* FieldLab — client API for the FieldLab server (see server.js). */
window.AA = window.AA || {};

AA.api = (function () {
  var TOKEN_KEY = 'fieldlab_token';

  var api = {
    /* fall back to the pre-rename token key so nobody gets signed out */
    token: localStorage.getItem(TOKEN_KEY) || localStorage.getItem('aquatrack_token') || null,

    setToken: function (t) {
      api.token = t;
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    },

    /* fetch wrapper: resolves parsed JSON, rejects {status, message} */
    req: function (method, url, body) {
      var opts = { method: method, headers: {} };
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      if (api.token) opts.headers['Authorization'] = 'Bearer ' + api.token;
      return fetch(url, opts).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (!r.ok) {
            var err = new Error(data.error || ('Request failed (' + r.status + ')'));
            err.status = r.status;
            err.data = data;
            throw err;
          }
          return data;
        });
      });
    },

    loginList: function () { return api.req('GET', '/api/login-list'); },
    setup: function (b) { return api.req('POST', '/api/setup', b); },
    login: function (username, password) { return api.req('POST', '/api/login', { username: username, password: password }); },
    logout: function () { return api.req('POST', '/api/logout', {}); },
    me: function () { return api.req('GET', '/api/me'); },
    users: function () { return api.req('GET', '/api/users'); },
    createUser: function (b) { return api.req('POST', '/api/users', b); },
    updateUser: function (id, b) { return api.req('PUT', '/api/users/' + encodeURIComponent(id), b); },
    state: function (since) { return api.req('GET', '/api/state' + (since != null ? '?since=' + since : '')); },
    putState: function (baseVersion, doc) { return api.req('PUT', '/api/state', { baseVersion: baseVersion, doc: doc }); }
  };

  return api;
})();

/* Auth + shared UI state */
AA.auth = { user: null };           /* {id,name,username,role} in server mode; null in solo */
AA.env = { server: false };         /* true when the FieldLab server is reachable */
AA.state = {
  timeRange: { key: 'all', from: null, to: null },  /* trend/history window */
  repFilter: 'all'                                  /* admin dashboard rep filter */
};
