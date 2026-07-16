/* FieldLab — Admin: rep overview, per-rep drill-down, user management */
window.AA = window.AA || {};
AA.views = AA.views || {};

/* ------------------------------------------------------------- admin home */
AA.views.admin = function (root) {
  var u = AA.util, st = AA.store;

  if (!AA.env.server) {
    root.innerHTML =
      '<div class="page-head"><div class="grow"><h1>Admin</h1></div></div>' +
      '<div class="card"><div class="empty">Multi-user features need the FieldLab server.<br>' +
      'Run <code>node server.js</code> and open the app through it (see README) to manage reps, accounts and shared data.</div></div>';
    return;
  }
  if (!AA.auth.user || AA.auth.user.role !== 'admin') {
    root.innerHTML = '<div class="card"><div class="empty">Admins only.</div></div>';
    return;
  }

  AA.app.refreshUsers().then(function (users) {
    var cutoff30 = u.daysAgoISO(30);

    var html =
      '<div class="page-head"><div class="grow"><h1>Admin</h1>' +
      '<p class="page-sub">Reps, their books of business, and user accounts</p></div>' +
      '<div class="actions"><button class="btn btn-primary" id="add-user">+ Add user</button></div></div>';

    /* ---- rep overview ---- */
    html += '<div class="card"><h2>Reps overview</h2><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>User</th><th>Role</th><th class="num">Sites</th><th class="num">Visits · 30d</th>' +
      '<th class="num">Open flags</th><th>Visits · this period</th><th>In range · 30d</th><th></th></tr></thead><tbody>';

    users.forEach(function (usr) {
      var sites = st.sitesOfRep(usr.id);
      var ids = {};
      sites.forEach(function (s) { ids[s.id] = true; });
      var visits30 = st.data.visits.filter(function (v) { return ids[v.siteId] && v.date >= cutoff30; }).length;
      var flags = st.actionItems(null, ids).length;
      var prog = st.visitProgress(ids);
      var kpi = st.inRangeKPI(30, ids);
      html += '<tr class="rowlink" data-href="#/admin/rep/' + u.esc(usr.id) + '">' +
        '<td><strong>' + u.esc(usr.name) + '</strong><div class="td-sub">' + u.esc(usr.username) + (usr.active ? '' : ' · deactivated') + '</div></td>' +
        '<td>' + (usr.role === 'admin' ? '<span class="chip chip-type">★ Admin</span>' : '<span class="chip chip-none">Rep</span>') + '</td>' +
        '<td class="num">' + sites.length + '</td>' +
        '<td class="num">' + visits30 + '</td>' +
        '<td class="num">' + (flags ? '<strong style="color:var(--critical)">' + flags + '</strong>' : '0') + '</td>' +
        '<td>' + (prog.total
          ? '<span class="progress-inline"><strong>' + prog.done + '/' + prog.total + '</strong>' +
            '<span class="meter meter-inline"><span class="meter-fill" style="width:' + prog.pct + '%"></span></span></span>'
          : '<span class="td-sub">no schedules</span>') + '</td>' +
        '<td class="td-sub">' + (kpi ? kpi.pct + '% of ' + kpi.total : '—') + '</td>' +
        '<td class="td-sub">open →</td></tr>';
    });
    html += '</tbody></table></div>';

    var unassigned = st.data.sites.filter(function (s) { return !s.repId; });
    if (unassigned.length) {
      html += '<p class="f-hint">⚠ ' + unassigned.length + ' site' + (unassigned.length > 1 ? 's are' : ' is') +
        ' not assigned to any rep — assign them below or when editing the site.</p>';
    }
    html += '</div>';

    /* ---- site assignment ---- */
    html += '<div class="card"><h2>Site assignments & schedules</h2>' +
      '<p class="page-sub">Which rep owns each site and how often it must be visited. Reps only see and edit their own sites; progress resets at the start of each period.</p>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Site</th><th>City</th><th>Assigned rep</th><th>Visit frequency</th><th>This period</th></tr></thead><tbody>';
    st.data.sites.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (s) {
      var opts = '<option value="">— unassigned —</option>' + users.filter(function (x) { return x.active; }).map(function (x) {
        return '<option value="' + u.esc(x.id) + '"' + (s.repId === x.id ? ' selected' : '') + '>' + u.esc(x.name) + '</option>';
      }).join('');
      var fopts = '<option value="">No schedule</option>' + st.FREQUENCIES.map(function (fr) {
        return '<option value="' + fr[0] + '"' + (s.visitFrequency === fr[0] ? ' selected' : '') + '>' + fr[1] + '</option>';
      }).join('');
      var status = st.siteVisitStatus(s);
      var cell = !status.scheduled ? '<span class="td-sub">—</span>' :
        (status.completed
          ? '<span class="chip chip-done">✓ Visited</span>'
          : '<span class="chip chip-due">○ Due · ' + status.daysLeft + 'd left</span>');
      html += '<tr><td><a href="#/site/' + s.id + '">' + u.esc(s.name) + '</a></td>' +
        '<td class="td-sub">' + u.esc((s.address && s.address.city) || '') + '</td>' +
        '<td><select class="assign-rep" data-site="' + s.id + '">' + opts + '</select></td>' +
        '<td><select class="assign-freq" data-site="' + s.id + '">' + fopts + '</select></td>' +
        '<td>' + cell + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    /* ---- user management ---- */
    html += '<div class="card"><h2>User accounts</h2><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>';
    users.forEach(function (usr) {
      html += '<tr><td>' + u.esc(usr.name) + '</td><td class="td-sub">' + u.esc(usr.username) + '</td>' +
        '<td>' + (usr.role === 'admin' ? '★ Admin' : 'Rep') + '</td>' +
        '<td>' + (usr.active ? '<span class="chip chip-ok">✓ Active</span>' : '<span class="chip chip-none">Deactivated</span>') + '</td>' +
        '<td class="num" style="white-space:nowrap">' +
        '<button class="btn btn-ghost btn-sm user-edit" data-id="' + u.esc(usr.id) + '">Edit</button> ' +
        '<button class="btn btn-ghost btn-sm user-pw" data-id="' + u.esc(usr.id) + '">Reset password</button> ' +
        '<button class="btn ' + (usr.active ? 'btn-danger' : 'btn-ghost') + ' btn-sm user-toggle" data-id="' + u.esc(usr.id) + '">' + (usr.active ? 'Deactivate' : 'Reactivate') + '</button>' +
        '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    root.innerHTML = html;
    AA.views._wireRowLinks(root);
    var rerender = function () { AA.views.admin(root); };

    root.querySelectorAll('.assign-rep').forEach(function (sel) {
      sel.addEventListener('click', function (e) { e.stopPropagation(); });
      sel.addEventListener('change', function () {
        st.updateSite(sel.getAttribute('data-site'), { repId: sel.value || null });
        AA.ui.toast('Assignment saved.', 'success');
      });
    });

    root.querySelectorAll('.assign-freq').forEach(function (sel) {
      sel.addEventListener('click', function (e) { e.stopPropagation(); });
      sel.addEventListener('change', function () {
        st.updateSite(sel.getAttribute('data-site'), { visitFrequency: sel.value || null });
        AA.ui.toast('Schedule saved.', 'success');
        rerender();
      });
    });

    document.getElementById('add-user').addEventListener('click', function () {
      AA.ui.modal({
        title: 'Add User',
        bodyHTML:
          '<label class="f">Full name<input name="name" required placeholder="J. Chen"></label>' +
          '<div class="f-row">' +
          '<label class="f">Username<input name="username" required placeholder="jchen"></label>' +
          '<label class="f">Role<select name="role"><option value="rep">Rep</option><option value="admin">Admin</option></select></label>' +
          '</div>' +
          '<label class="f">Password <span class="f-hint">(they can change it later)</span><input name="password" type="text" required minlength="4"></label>',
        submitLabel: 'Create user',
        onSubmit: function (form, close) {
          var f = form.elements;
          AA.api.createUser({ name: f.name.value.trim(), username: f.username.value.trim(), role: f.role.value, password: f.password.value })
            .then(function () { close(); AA.ui.toast('User created.', 'success'); rerender(); })
            .catch(function (err) { AA.ui.toast(err.message, 'error'); });
        }
      });
    });

    root.querySelectorAll('.user-edit').forEach(function (b) {
      b.addEventListener('click', function () {
        var usr = AA.app.userById(b.getAttribute('data-id'));
        AA.ui.modal({
          title: 'Edit User',
          bodyHTML:
            '<label class="f">Full name<input name="name" required value="' + u.esc(usr.name) + '"></label>' +
            '<div class="f-row">' +
            '<label class="f">Username<input name="username" required value="' + u.esc(usr.username) + '"></label>' +
            '<label class="f">Role<select name="role"><option value="rep"' + (usr.role !== 'admin' ? ' selected' : '') + '>Rep</option><option value="admin"' + (usr.role === 'admin' ? ' selected' : '') + '>Admin</option></select></label>' +
            '</div>',
          onSubmit: function (form, close) {
            var f = form.elements;
            AA.api.updateUser(usr.id, { name: f.name.value.trim(), username: f.username.value.trim(), role: f.role.value })
              .then(function () { close(); rerender(); })
              .catch(function (err) { AA.ui.toast(err.message, 'error'); });
          }
        });
      });
    });

    root.querySelectorAll('.user-pw').forEach(function (b) {
      b.addEventListener('click', function () {
        var usr = AA.app.userById(b.getAttribute('data-id'));
        AA.ui.modal({
          title: 'Reset Password — ' + usr.name,
          bodyHTML: '<label class="f">New password<input name="password" type="text" required minlength="4"></label>',
          submitLabel: 'Reset',
          onSubmit: function (form, close) {
            AA.api.updateUser(usr.id, { password: form.elements.password.value })
              .then(function () { close(); AA.ui.toast('Password reset.', 'success'); })
              .catch(function (err) { AA.ui.toast(err.message, 'error'); });
          }
        });
      });
    });

    root.querySelectorAll('.user-toggle').forEach(function (b) {
      b.addEventListener('click', function () {
        var usr = AA.app.userById(b.getAttribute('data-id'));
        if (usr.active && !confirm('Deactivate ' + usr.name + '? They will no longer be able to sign in. Their sites stay assigned until you move them.')) return;
        AA.api.updateUser(usr.id, { active: !usr.active })
          .then(function () { rerender(); })
          .catch(function (err) { AA.ui.toast(err.message, 'error'); });
      });
    });
  });
};

/* ---------------------------------------------------------- rep drill-down */
AA.views.adminRep = function (root, params) {
  var u = AA.util, st = AA.store;

  if (!AA.env.server || !AA.auth.user || AA.auth.user.role !== 'admin') {
    root.innerHTML = '<div class="card"><div class="empty">Admins only.</div></div>';
    return;
  }

  AA.app.refreshUsers().then(function () {
    var usr = AA.app.userById(params[0]);
    if (!usr) { root.innerHTML = '<div class="card"><div class="empty">User not found.</div></div>'; return; }

    var sites = st.sitesOfRep(usr.id);
    var ids = {};
    sites.forEach(function (s) { ids[s.id] = true; });
    var cutoff30 = u.daysAgoISO(30);
    var visits = st.data.visits.filter(function (v) { return ids[v.siteId]; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var visits30 = visits.filter(function (v) { return v.date >= cutoff30; }).length;
    var actions = st.actionItems(null, ids);
    var prog = st.visitProgress(ids);
    var kpi = st.inRangeKPI(30, ids);

    var html =
      '<div class="page-head"><div class="grow">' +
      '<div class="crumbs"><a href="#/admin">Admin</a> / ' + u.esc(usr.name) + '</div>' +
      '<h1>' + u.esc(usr.name) + ' <span class="chip ' + (usr.role === 'admin' ? 'chip-type' : 'chip-none') + '">' + (usr.role === 'admin' ? '★ Admin' : 'Rep') + '</span></h1>' +
      '<p class="page-sub">Book of business, activity and program health for this rep</p>' +
      '</div></div>';

    html += '<div class="tiles">' +
      '<div class="tile"><div class="t-label">Assigned sites</div><div class="t-value">' + sites.length + '</div></div>' +
      '<div class="tile"><div class="t-label">Visits · last 30 days</div><div class="t-value">' + visits30 + '</div></div>' +
      '<div class="tile"><div class="t-label">Results in range · 30d</div><div class="t-value">' + (kpi ? kpi.pct + '%' : '—') + '</div>' + (kpi ? '<div class="t-note">of ' + kpi.total + ' readings</div>' : '') + '</div>' +
      '<div class="tile' + (actions.length ? ' alert' : '') + '"><div class="t-label">Open flags</div><div class="t-value">' + actions.length + '</div></div>' +
      '<div class="tile"><div class="t-label">Visits · this period</div>' +
      (prog.total
        ? '<div class="t-value">' + prog.done + '<span class="t-of">/' + prog.total + '</span></div>' +
          '<div class="meter"><div class="meter-fill" style="width:' + prog.pct + '%"></div></div>' +
          '<div class="t-note">' + (prog.due.length ? prog.due.length + ' still due' : 'all visited ✓') + '</div>'
        : '<div class="t-value">—</div><div class="t-note">no schedules set</div>') +
      '</div></div>';

    /* their sites */
    html += '<div class="card"><h2>Sites</h2>';
    if (!sites.length) {
      html += '<p class="td-sub">No sites assigned. Assign sites on the <a href="#/admin">Admin page</a>.</p>';
    } else {
      html += '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Site</th><th>City</th><th>Last visit</th><th>This period</th><th class="num">Open flags</th></tr></thead><tbody>';
      /* sites still due first, so the remaining work is at the top */
      var ordered = sites.slice().sort(function (a, b) {
        var sa = st.siteVisitStatus(a), sb = st.siteVisitStatus(b);
        var ra = sa.scheduled ? (sa.completed ? 1 : 0) : 2;
        var rb = sb.scheduled ? (sb.completed ? 1 : 0) : 2;
        return ra - rb || a.name.localeCompare(b.name);
      });
      ordered.forEach(function (s) {
        var flags = st.actionItems(s.id).length;
        var status = st.siteVisitStatus(s);
        var cell = !status.scheduled
          ? '<span class="td-sub">no schedule</span>'
          : (status.completed
            ? '<span class="chip chip-done">✓ Visited · ' + u.esc(status.label) + '</span>'
            : '<span class="chip chip-due">○ Due · ' + status.daysLeft + 'd left</span>');
        html += '<tr class="rowlink" data-href="#/site/' + s.id + '">' +
          '<td><strong>' + u.esc(s.name) + '</strong></td>' +
          '<td class="td-sub">' + u.esc((s.address && s.address.city) || '') + '</td>' +
          '<td class="td-sub">' + (status.lastVisit ? u.fmtDate(status.lastVisit) : 'never') + '</td>' +
          '<td>' + cell + '</td>' +
          '<td class="num">' + (flags ? '<strong style="color:var(--critical)">' + flags + '</strong>' : '0') + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    /* open flags */
    if (actions.length) {
      html += '<div class="card"><h2>⚠ Open flags</h2><div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Site</th><th>Test</th><th class="num">Result</th><th>Expected</th><th>Status</th><th>Date</th></tr></thead><tbody>';
      actions.forEach(function (it) {
        html += '<tr class="rowlink" data-href="#/history/' + it.point.id + '/' + it.test.id + '">' +
          '<td>' + u.esc(it.site.name) + ' <span class="td-sub">· ' + u.esc(it.point.name) + '</span></td>' +
          '<td>' + u.esc(it.test.name) + '</td>' +
          '<td class="num"><strong>' + u.fmtNum(it.value, it.test.decimals) + '</strong></td>' +
          '<td class="td-sub">' + u.esc(u.rangeText(it.range)) + '</td>' +
          '<td>' + AA.ui.flagChip(it.flag) + (it.streak >= 3 ? ' ' + AA.ui.chronicChip() : '') + '</td>' +
          '<td class="td-sub">' + u.fmtDate(it.date) + '</td></tr>';
      });
      html += '</tbody></table></div></div>';
    }

    /* recent reports */
    html += '<div class="card"><h2>Recent service reports</h2>';
    if (!visits.length) {
      html += '<p class="td-sub">No visits recorded yet.</p>';
    } else {
      html += '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Date</th><th>Site</th><th class="num">Results</th><th class="num">Flagged</th><th></th></tr></thead><tbody>';
      visits.slice(0, 15).forEach(function (v) {
        var site = st.getSite(v.siteId);
        var stats = st.visitStats(v);
        html += '<tr class="rowlink" data-href="#/visit/' + v.id + '">' +
          '<td>' + u.fmtDate(v.date) + '</td>' +
          '<td>' + u.esc(site ? site.name : '?') + '</td>' +
          '<td class="num">' + stats.readings + '</td>' +
          '<td class="num">' + (stats.flagged ? '<strong style="color:var(--critical)">' + stats.flagged + '</strong>' : '0') + '</td>' +
          '<td class="td-sub">report →</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    root.innerHTML = html;
    AA.views._wireRowLinks(root);
  });
};
