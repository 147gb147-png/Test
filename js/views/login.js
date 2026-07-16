/* FieldLab — sign-in / first-run setup screens (server mode) */
window.AA = window.AA || {};
AA.views = AA.views || {};

AA.views.login = function (root) {
  var u = AA.util;
  var ll = AA.app.loginList || { setup: false, users: [] };

  if (ll.setup) {
    /* ---- first run: create the admin account ---- */
    root.innerHTML =
      '<div class="login-wrap"><div class="card login-card">' +
      '<div class="login-brand">💧 <strong>FieldLab</strong></div>' +
      '<h2>Welcome — let’s set up your workspace</h2>' +
      '<p class="page-sub">Create the administrator account first. You can add your reps afterwards under <strong>Admin → Users</strong>.</p>' +
      '<form id="setup-form">' +
      '<label class="f">Your name<input name="name" required placeholder="A. Rivera"></label>' +
      '<label class="f">Username<input name="username" required placeholder="arivera" autocomplete="username"></label>' +
      '<label class="f">Password <span class="f-hint">(min 4 characters)</span><input name="password" type="password" required minlength="4" autocomplete="new-password"></label>' +
      '<button class="btn btn-primary" type="submit" style="width:100%">Create admin account</button>' +
      '<p class="f-hint login-err" style="color:var(--critical)"></p>' +
      '</form></div></div>';

    document.getElementById('setup-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target.elements;
      AA.api.setup({ name: f.name.value.trim(), username: f.username.value.trim(), password: f.password.value })
        .then(function (resp) {
          AA.api.setToken(resp.token);
          AA.auth.user = resp.user;
          AA.app.loginList = null;
          return AA.app.afterLogin();
        })
        .catch(function (err) {
          root.querySelector('.login-err').textContent = err.message;
        });
    });
    return;
  }

  /* ---- normal sign-in ---- */
  var options = ll.users.map(function (x) {
    return '<option value="' + u.esc(x.username) + '">' + u.esc(x.name) + ' (' + u.esc(x.username) + ')</option>';
  }).join('');

  root.innerHTML =
    '<div class="login-wrap"><div class="card login-card">' +
    '<div class="login-brand">💧 <strong>FieldLab</strong></div>' +
    '<h2>Sign in</h2>' +
    '<form id="login-form">' +
    (ll.users.length
      ? '<label class="f">Who are you?<select name="username">' + options + '</select></label>'
      : '<label class="f">Username<input name="username" required autocomplete="username"></label>') +
    '<label class="f">Password<input name="password" type="password" required autocomplete="current-password"></label>' +
    '<button class="btn btn-primary" type="submit" style="width:100%">Sign in</button>' +
    '<p class="f-hint login-err" style="color:var(--critical)"></p>' +
    '</form></div></div>';

  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target.elements;
    AA.api.login(f.username.value.trim(), f.password.value)
      .then(function (resp) {
        AA.api.setToken(resp.token);
        AA.auth.user = resp.user;
        return AA.app.afterLogin();
      })
      .catch(function (err) {
        root.querySelector('.login-err').textContent = err.message;
      });
  });
};
