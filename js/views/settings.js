/* AquaTrack — Settings: test catalog, system templates (incl. custom system
 * types), products, data & general */
window.AA = window.AA || {};
AA.views = AA.views || {};

AA.views.settings = function (root, params) {
  var tab = params && params[0] ? params[0] : 'tests';
  var u = AA.util, st = AA.store;
  var isAdmin = !AA.env.server || !AA.auth.user || AA.auth.user.role === 'admin';

  var tabs = [
    ['tests', 'Test catalog'],
    ['templates', 'System templates'],
    ['products', 'Products'],
    ['data', 'Data & general']
  ];
  if (!isAdmin) tabs = tabs.filter(function (t) { return t[0] !== 'data'; });
  if (!tabs.some(function (t) { return t[0] === tab; })) tab = 'tests';

  var html =
    '<div class="page-head"><div class="grow"><h1>Settings</h1>' +
    '<p class="page-sub">Customize AquaTrack — your tests, expected ranges, system types and product line</p></div></div>' +
    '<div class="settings-tabs">' + tabs.map(function (t) {
      return '<a href="#/settings/' + t[0] + '" class="' + (tab === t[0] ? 'active' : '') + '">' + t[1] + '</a>';
    }).join('') + '</div><div id="settings-body"></div>';

  root.innerHTML = html;
  var body = document.getElementById('settings-body');
  var rerender = function () { AA.views.settings(root, [tab]); };

  if (tab === 'tests') renderTests(body, rerender);
  else if (tab === 'templates') renderTemplates(body, rerender);
  else if (tab === 'products') renderProducts(body, rerender);
  else renderData(body, rerender);

  /* ------------------------------------------------------------- tests tab */
  function renderTests(body, rerender) {
    var html = '<div class="card"><div class="page-head" style="margin-bottom:8px"><div class="grow">' +
      '<h2 style="margin:0">Test catalog</h2>' +
      '<p class="page-sub">Every test reps can perform. Default ranges apply wherever a sample point has no specific override.</p></div>' +
      '<div class="actions"><button class="btn btn-primary btn-sm" id="add-test">+ New test</button></div></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Test</th><th>Unit</th><th class="num">Decimals</th><th>Default range</th><th>Description</th><th></th></tr></thead><tbody>';

    st.data.testDefs.forEach(function (t) {
      html += '<tr><td><strong>' + u.esc(t.name) + '</strong></td>' +
        '<td class="td-sub">' + (u.esc(t.unit) || '—') + '</td>' +
        '<td class="num">' + (t.decimals != null ? t.decimals : 1) + '</td>' +
        '<td class="td-sub">' + u.esc(u.rangeText({ min: t.defaultMin, max: t.defaultMax })) + '</td>' +
        '<td class="td-sub">' + (u.esc(t.description) || '') + '</td>' +
        '<td class="num" style="white-space:nowrap">' +
        '<button class="btn btn-ghost btn-sm test-edit" data-id="' + u.esc(t.id) + '">Edit</button> ' +
        '<button class="btn btn-danger btn-sm test-del" data-id="' + u.esc(t.id) + '">Delete</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
    body.innerHTML = html;

    function testModal(existing) {
      var t = existing || { name: '', unit: '', decimals: 1, defaultMin: null, defaultMax: null, description: '' };
      AA.ui.modal({
        title: existing ? 'Edit Test' : 'New Test',
        bodyHTML:
          '<label class="f">Name<input name="name" required value="' + u.esc(t.name) + '" placeholder="e.g. Tannin"></label>' +
          '<div class="f-row">' +
          '<label class="f">Unit<input name="unit" value="' + u.esc(t.unit) + '" placeholder="ppm"></label>' +
          '<label class="f">Decimals shown<input name="decimals" type="number" min="0" max="4" value="' + (t.decimals != null ? t.decimals : 1) + '"></label>' +
          '</div>' +
          '<div class="f-row">' +
          '<label class="f">Default min <span class="f-hint">(optional)</span><input name="defaultMin" type="number" step="any" value="' + (t.defaultMin != null ? t.defaultMin : '') + '"></label>' +
          '<label class="f">Default max <span class="f-hint">(optional)</span><input name="defaultMax" type="number" step="any" value="' + (t.defaultMax != null ? t.defaultMax : '') + '"></label>' +
          '</div>' +
          '<label class="f">Description<textarea name="description">' + u.esc(t.description || '') + '</textarea></label>',
        onSubmit: function (form, close) {
          var f = form.elements;
          var patch = {
            name: f.name.value.trim(),
            unit: f.unit.value.trim(),
            decimals: Math.max(0, Math.min(4, Number(f.decimals.value) || 0)),
            defaultMin: u.num(f.defaultMin.value),
            defaultMax: u.num(f.defaultMax.value),
            description: f.description.value.trim()
          };
          if (!patch.name) return;
          if (existing) st.updateTest(existing.id, patch);
          else st.addTest(patch);
          close(); rerender();
        }
      });
    }

    document.getElementById('add-test').addEventListener('click', function () { testModal(null); });
    body.querySelectorAll('.test-edit').forEach(function (b) {
      b.addEventListener('click', function () { testModal(st.getTest(b.getAttribute('data-id'))); });
    });
    body.querySelectorAll('.test-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = st.getTest(b.getAttribute('data-id'));
        if (confirm('Delete "' + t.name + '"? It is removed from all templates and sample points, and its recorded values are removed from visit history.')) {
          st.deleteTest(t.id); rerender();
        }
      });
    });
  }

  /* --------------------------------------------------------- templates tab */
  function renderTemplates(body, rerender) {
    var html = '<div class="card"><div class="page-head" style="margin-bottom:8px"><div class="grow"><h2 style="margin:0">System templates</h2>' +
      '<p class="page-sub">The sample points and tests a NEW system starts with. Existing systems are not changed — adjust those on the system page. ' +
      'Create your own system types here: chillers, closed loops, RO, softeners, waste streams — anything.</p></div>' +
      '<div class="actions"><button class="btn btn-primary btn-sm" id="tpl-new-type">+ New system type</button></div></div></div>';

    Object.keys(st.data.templates).forEach(function (type) {
      var tpl = st.data.templates[type];
      var usage = st.templateUsage(type);
      html += '<div class="card"><div class="page-head" style="margin-bottom:8px"><div class="grow"><h2 style="margin:0">' + u.esc(tpl.label) + '</h2>' +
        '<p class="page-sub">' + (usage ? usage + ' system' + (usage > 1 ? 's' : '') + ' of this type exist' : 'not used by any system yet') + '</p></div>' +
        '<div class="actions">' +
        '<button class="btn btn-ghost btn-sm tpl-addpt" data-type="' + u.esc(type) + '">+ Add sample point</button>' +
        '<button class="btn btn-ghost btn-sm tpl-rename-type" data-type="' + u.esc(type) + '">Rename type</button>' +
        '<button class="btn btn-danger btn-sm tpl-del-type" data-type="' + u.esc(type) + '">Delete type</button>' +
        '</div></div>';

      tpl.samplePoints.forEach(function (sp, spi) {
        html += '<div class="tpl-point"><h4><span class="grow">🧪 ' + u.esc(sp.name) + '</span>' +
          '<button class="btn btn-ghost btn-sm tpl-rename" data-type="' + u.esc(type) + '" data-i="' + spi + '">Rename</button>' +
          '<button class="btn btn-danger btn-sm tpl-delpt" data-type="' + u.esc(type) + '" data-i="' + spi + '">Delete</button></h4>';
        html += '<div class="table-wrap"><table class="data"><thead><tr><th>Test</th><th>Expected min</th><th>Expected max</th><th></th></tr></thead><tbody>';
        sp.tests.forEach(function (t, ti) {
          var def = st.getTest(t.testId);
          if (!def) return;
          html += '<tr><td>' + u.esc(def.name) + (def.unit ? ' <span class="td-sub">' + u.esc(def.unit) + '</span>' : '') + '</td>' +
            '<td><div class="range-inputs"><input type="number" step="any" class="tpl-min" data-type="' + u.esc(type) + '" data-i="' + spi + '" data-t="' + ti + '" value="' + (t.min != null ? t.min : '') + '" placeholder="' + (def.defaultMin != null ? def.defaultMin : '—') + '"></div></td>' +
            '<td><div class="range-inputs"><input type="number" step="any" class="tpl-max" data-type="' + u.esc(type) + '" data-i="' + spi + '" data-t="' + ti + '" value="' + (t.max != null ? t.max : '') + '" placeholder="' + (def.defaultMax != null ? def.defaultMax : '—') + '"></div></td>' +
            '<td class="num"><button class="btn btn-ghost btn-sm tpl-deltest" data-type="' + u.esc(type) + '" data-i="' + spi + '" data-t="' + ti + '">remove</button></td></tr>';
        });
        html += '</tbody></table></div>';

        var used = sp.tests.map(function (t) { return t.testId; });
        var avail = st.data.testDefs.filter(function (d) { return used.indexOf(d.id) === -1; });
        if (avail.length) {
          html += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
            '<select class="tpl-test-sel" data-type="' + u.esc(type) + '" data-i="' + spi + '">' +
            avail.map(function (d) { return '<option value="' + u.esc(d.id) + '">' + u.esc(d.name) + '</option>'; }).join('') +
            '</select><button class="btn btn-ghost btn-sm tpl-addtest" data-type="' + u.esc(type) + '" data-i="' + spi + '">+ Add test</button></div>';
        }
        html += '</div>';
      });
      if (!tpl.samplePoints.length) {
        html += '<p class="td-sub">No sample points yet — add one, then add tests to it.</p>';
      }
      html += '</div>';
    });
    body.innerHTML = html;

    document.getElementById('tpl-new-type').addEventListener('click', function () {
      AA.ui.modal({
        title: 'New System Type',
        bodyHTML:
          '<label class="f">Type name<input name="label" required placeholder="e.g. Chiller — Condenser Loop, RO Unit, Softener"></label>' +
          '<p class="f-hint">You’ll add its sample points and tests next. The new type immediately appears in the “Add system” list on every site.</p>',
        submitLabel: 'Create type',
        onSubmit: function (form, close) {
          var label = form.elements.label.value.trim();
          if (!label) return;
          st.addTemplate(label);
          close(); rerender();
          AA.ui.toast('System type created — now add its sample points and tests.', 'success');
        }
      });
    });

    body.querySelectorAll('.tpl-rename-type').forEach(function (b) {
      b.addEventListener('click', function () {
        var type = b.getAttribute('data-type');
        AA.ui.modal({
          title: 'Rename System Type',
          bodyHTML: '<label class="f">Type name<input name="label" required value="' + u.esc(st.data.templates[type].label) + '"></label>',
          onSubmit: function (form, close) {
            st.renameTemplate(type, form.elements.label.value.trim());
            close(); rerender();
          }
        });
      });
    });

    body.querySelectorAll('.tpl-del-type').forEach(function (b) {
      b.addEventListener('click', function () {
        var type = b.getAttribute('data-type');
        var usage = st.templateUsage(type);
        if (usage) {
          AA.ui.toast('Cannot delete: ' + usage + ' system' + (usage > 1 ? 's use' : ' uses') + ' this type. Delete or re-create those systems first.', 'error');
          return;
        }
        if (confirm('Delete the "' + st.data.templates[type].label + '" system type?')) {
          st.deleteTemplate(type); rerender();
        }
      });
    });

    function saveRange(input, key) {
      st.tplMutate(input.getAttribute('data-type'), function (tpl) {
        tpl.samplePoints[Number(input.getAttribute('data-i'))].tests[Number(input.getAttribute('data-t'))][key] = u.num(input.value);
      });
    }
    body.querySelectorAll('.tpl-min').forEach(function (inp) {
      inp.addEventListener('change', function () { saveRange(inp, 'min'); AA.ui.toast('Template range saved.'); });
    });
    body.querySelectorAll('.tpl-max').forEach(function (inp) {
      inp.addEventListener('change', function () { saveRange(inp, 'max'); AA.ui.toast('Template range saved.'); });
    });
    body.querySelectorAll('.tpl-deltest').forEach(function (b) {
      b.addEventListener('click', function () {
        st.tplMutate(b.getAttribute('data-type'), function (tpl) {
          tpl.samplePoints[Number(b.getAttribute('data-i'))].tests.splice(Number(b.getAttribute('data-t')), 1);
        });
        rerender();
      });
    });
    body.querySelectorAll('.tpl-addtest').forEach(function (b) {
      b.addEventListener('click', function () {
        var sel = body.querySelector('.tpl-test-sel[data-type="' + b.getAttribute('data-type') + '"][data-i="' + b.getAttribute('data-i') + '"]');
        var def = st.getTest(sel.value);
        st.tplMutate(b.getAttribute('data-type'), function (tpl) {
          tpl.samplePoints[Number(b.getAttribute('data-i'))].tests.push({ testId: sel.value, min: def ? def.defaultMin : null, max: def ? def.defaultMax : null });
        });
        rerender();
      });
    });
    body.querySelectorAll('.tpl-addpt').forEach(function (b) {
      b.addEventListener('click', function () {
        AA.ui.modal({
          title: 'Add Sample Point to Template',
          bodyHTML: '<label class="f">Name<input name="name" required placeholder="e.g. Blowdown"></label>',
          submitLabel: 'Add',
          onSubmit: function (form, close) {
            st.tplMutate(b.getAttribute('data-type'), function (tpl) {
              tpl.samplePoints.push({ name: form.elements.name.value.trim(), tests: [] });
            });
            close(); rerender();
          }
        });
      });
    });
    body.querySelectorAll('.tpl-rename').forEach(function (b) {
      b.addEventListener('click', function () {
        var sp = st.data.templates[b.getAttribute('data-type')].samplePoints[Number(b.getAttribute('data-i'))];
        AA.ui.modal({
          title: 'Rename Sample Point',
          bodyHTML: '<label class="f">Name<input name="name" required value="' + u.esc(sp.name) + '"></label>',
          onSubmit: function (form, close) {
            st.tplMutate(b.getAttribute('data-type'), function (tpl) {
              tpl.samplePoints[Number(b.getAttribute('data-i'))].name = form.elements.name.value.trim();
            });
            close(); rerender();
          }
        });
      });
    });
    body.querySelectorAll('.tpl-delpt').forEach(function (b) {
      b.addEventListener('click', function () {
        var tpl = st.data.templates[b.getAttribute('data-type')];
        var sp = tpl.samplePoints[Number(b.getAttribute('data-i'))];
        if (confirm('Remove "' + sp.name + '" from the ' + tpl.label + ' template? Existing systems are unaffected.')) {
          st.tplMutate(b.getAttribute('data-type'), function (t) {
            t.samplePoints.splice(Number(b.getAttribute('data-i')), 1);
          });
          rerender();
        }
      });
    });
  }

  /* ---------------------------------------------------------- products tab */
  function renderProducts(body, rerender) {
    var html = '<div class="card"><div class="page-head" style="margin-bottom:8px"><div class="grow">' +
      '<h2 style="margin:0">Product catalog</h2>' +
      '<p class="page-sub">Your treatment chemicals. Assign them to systems on each system’s page — with an optional stock unit and low-level alert for inventory tracking.</p></div>' +
      '<div class="actions"><button class="btn btn-primary btn-sm" id="add-product">+ New product</button></div></div>';

    if (!st.data.products.length) {
      html += '<div class="empty">No products yet.</div>';
    } else {
      html += '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Product</th><th>Description</th><th>Standard dose / target</th><th>Notes</th><th></th></tr></thead><tbody>';
      st.data.products.forEach(function (p) {
        html += '<tr><td><strong>' + u.esc(p.name) + '</strong></td>' +
          '<td class="td-sub">' + (u.esc(p.description) || '—') + '</td>' +
          '<td class="td-sub">' + (u.esc(p.dose) || '—') + '</td>' +
          '<td class="td-sub">' + (u.esc(p.notes) || '') + '</td>' +
          '<td class="num" style="white-space:nowrap">' +
          '<button class="btn btn-ghost btn-sm prod-edit" data-id="' + u.esc(p.id) + '">Edit</button> ' +
          '<button class="btn btn-danger btn-sm prod-del" data-id="' + u.esc(p.id) + '">Delete</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    body.innerHTML = html;

    function productModal(existing) {
      var p = existing || { name: '', description: '', dose: '', notes: '' };
      AA.ui.modal({
        title: existing ? 'Edit Product' : 'New Product',
        bodyHTML:
          '<label class="f">Name<input name="name" required value="' + u.esc(p.name) + '" placeholder="e.g. BWT-100 Boiler Treatment"></label>' +
          '<label class="f">Description<textarea name="description">' + u.esc(p.description || '') + '</textarea></label>' +
          '<label class="f">Standard dose / control target<input name="dose" value="' + u.esc(p.dose || '') + '" placeholder="e.g. Maintain 20–60 ppm sulphite"></label>' +
          '<label class="f">Notes<textarea name="notes">' + u.esc(p.notes || '') + '</textarea></label>',
        onSubmit: function (form, close) {
          var f = form.elements;
          var patch = { name: f.name.value.trim(), description: f.description.value.trim(), dose: f.dose.value.trim(), notes: f.notes.value.trim() };
          if (!patch.name) return;
          if (existing) st.updateProduct(existing.id, patch);
          else st.addProduct(patch);
          close(); rerender();
        }
      });
    }

    document.getElementById('add-product').addEventListener('click', function () { productModal(null); });
    body.querySelectorAll('.prod-edit').forEach(function (b) {
      b.addEventListener('click', function () { productModal(st.getProduct(b.getAttribute('data-id'))); });
    });
    body.querySelectorAll('.prod-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = st.getProduct(b.getAttribute('data-id'));
        if (confirm('Delete "' + p.name + '"? It is unassigned from all systems.')) {
          st.deleteProduct(p.id); rerender();
        }
      });
    });
  }

  /* -------------------------------------------------------------- data tab */
  function renderData(body, rerender) {
    body.innerHTML =
      '<div class="card"><h2>General</h2><div class="f-row">' +
      '<label class="f">Company name <span class="f-hint">(shown on service reports)</span><input id="set-company" value="' + u.esc(st.data.settings.companyName || '') + '"></label>' +
      '<label class="f">Default representative <span class="f-hint">(solo mode only — signed-in users are used automatically)</span><input id="set-rep" value="' + u.esc(st.data.settings.defaultRep || '') + '"></label>' +
      '</div><button class="btn btn-primary btn-sm" id="set-save">Save</button></div>' +

      '<div class="card"><h2>Backup & restore</h2>' +
      '<p class="page-sub">' + (AA.env.server
        ? 'Data lives on the AquaTrack server (data/store.json) and is shared by all signed-in users. Export a JSON snapshot any time; importing replaces the shared workspace for everyone.'
        : 'Data lives in this browser (localStorage). Export regularly, and use export/import to move data between devices — or run the AquaTrack server (node server.js) for real multi-user sharing.') + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost" id="data-export">⬇ Export JSON backup</button>' +
      '<label class="btn btn-ghost" style="margin:0">⬆ Import backup<input type="file" id="data-import" accept="application/json,.json" style="display:none"></label>' +
      '</div></div>' +

      '<div class="card"><h2>Demo & reset</h2>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost" id="data-demo">Load demo data</button>' +
      '<button class="btn btn-danger" id="data-reset">Reset everything</button>' +
      '</div><p class="f-hint" style="margin-top:8px">Demo data replaces current data with three example sites so you can explore. Reset restores a blank workspace with the default test catalog and templates.' +
      (AA.env.server ? ' Both affect ALL users of this server.' : '') + '</p></div>';

    document.getElementById('set-save').addEventListener('click', function () {
      st.setSettings({
        companyName: document.getElementById('set-company').value.trim(),
        defaultRep: document.getElementById('set-rep').value.trim()
      });
      AA.ui.toast('Settings saved.', 'success');
    });

    document.getElementById('data-export').addEventListener('click', function () {
      u.download('aquatrack-backup-' + u.todayISO() + '.json', st.exportJSON(), 'application/json');
    });

    document.getElementById('data-import').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          if (!confirm('Importing replaces ALL current data' + (AA.env.server ? ' for every user of this server' : '') + '. Continue?')) return;
          st.importJSON(reader.result);
          AA.ui.toast('Backup imported.', 'success');
          location.hash = '#/dashboard';
        } catch (err) {
          AA.ui.toast('Import failed: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('data-demo').addEventListener('click', function () {
      if (st.data.sites.length && !confirm('Loading demo data replaces your current data' + (AA.env.server ? ' for every user' : '') + '. Continue?')) return;
      st.replaceAll(AA.defaults.demoData());
      AA.ui.toast('Demo data loaded.', 'success');
      location.hash = '#/dashboard';
    });

    document.getElementById('data-reset').addEventListener('click', function () {
      if (!confirm('Really delete ALL sites, systems, visits and customizations' + (AA.env.server ? ' for every user of this server' : '') + '?')) return;
      if (!confirm('Last check — this cannot be undone. Export a backup first?  Press OK to wipe everything.')) return;
      st.replaceAll(AA.defaults.blank());
      AA.ui.toast('Workspace reset.');
      location.hash = '#/dashboard';
    });
  }
};
