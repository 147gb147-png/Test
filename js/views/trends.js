/* AquaTrack — trends grid: every test at every sample point of a system,
 * as small multiples with a shared time-range filter. */
window.AA = window.AA || {};
AA.views = AA.views || {};

AA.views.trends = function (root, params) {
  var u = AA.util, st = AA.store;
  var sys = st.getSystem(params[0]);
  if (!sys) { root.innerHTML = '<div class="card"><div class="empty">System not found.</div></div>'; return; }
  var site = st.getSite(sys.siteId);
  var points = st.pointsOf(sys.id);

  function render() {
    var html =
      '<div class="page-head"><div class="grow">' +
      '<div class="crumbs"><a href="#/sites">Sites</a> / <a href="#/site/' + site.id + '">' + u.esc(site.name) + '</a> / ' +
      '<a href="#/system/' + sys.id + '">' + u.esc(sys.name) + '</a> / Trends</div>' +
      '<h1>Trends — ' + u.esc(sys.name) + '</h1>' +
      '<p class="page-sub">Every test on this system at a glance. Click any chart title for the full history & readings table.</p>' +
      '</div></div>';

    html += AA.filters.rowHTML();

    points.forEach(function (pt) {
      html += '<div class="card"><h2>🧪 ' + u.esc(pt.name) + '</h2><div class="mini-grid">';
      pt.tests.forEach(function (t) {
        var def = st.getTest(t.testId);
        if (!def) return;
        var range = st.effRange(pt, t.testId);
        var hist = AA.filters.filterHistory(st.history(pt.id, t.testId));
        hist.forEach(function (h) { h.flag = st.evalFlag(h.value, range); });
        var last = hist.length ? hist[hist.length - 1] : null;
        var lastFlag = last ? st.evalFlag(last.value, range) : null;
        html += '<div class="mini-cell">' +
          '<div class="mini-head"><a href="#/history/' + pt.id + '/' + def.id + '"><strong>' + u.esc(def.name) + '</strong></a>' +
          '<span class="mini-latest">' + (last ? '<strong>' + u.fmtNum(last.value, def.decimals) + '</strong> ' + AA.ui.flagChip(lastFlag) : '<span class="td-sub">no data</span>') + '</span></div>' +
          '<div class="mini-chart" data-pt="' + pt.id + '" data-test="' + def.id + '"></div>' +
          '</div>';
      });
      html += '</div></div>';
    });

    root.innerHTML = html;

    AA.filters.wireRow(root, render);

    root.querySelectorAll('.mini-chart').forEach(function (div) {
      var pt = st.getPoint(div.getAttribute('data-pt'));
      var def = st.getTest(div.getAttribute('data-test'));
      var range = st.effRange(pt, def.id);
      var hist = AA.filters.filterHistory(st.history(pt.id, def.id));
      hist.forEach(function (h) { h.flag = st.evalFlag(h.value, range); });
      AA.chart.render(div, { points: hist, range: range, unit: def.unit, decimals: def.decimals, compact: true });
    });
  }

  render();
};
