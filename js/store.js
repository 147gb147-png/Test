/*
 * AquaTrack — data layer.
 * Single source of truth persisted to localStorage, with JSON export/import.
 *
 * Hierarchy:  Site -> System(s) -> Sample Points -> Tests -> Data (visit readings)
 * Expected ranges resolve per sample-point test first, falling back to the
 * test definition's default. Flags are computed from the CURRENT range, so
 * tightening a range immediately re-flags history.
 */
window.AA = window.AA || {};

AA.store = (function () {
  var KEY = 'aquatrack_v1';
  var S = { data: null };

  /* ------------------------------------------------------------ persistence */
  S.load = function () {
    try {
      var raw = localStorage.getItem(KEY);
      S.data = raw ? JSON.parse(raw) : AA.defaults.blank();
    } catch (e) {
      console.error('AquaTrack: failed to load saved data, starting fresh.', e);
      S.data = AA.defaults.blank();
    }
    if (!S.data.version) S.data.version = 1;
    S.save();
  };

  S.save = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(S.data));
    } catch (e) {
      AA.ui.toast('Could not save — browser storage may be full.', 'error');
    }
  };

  S.replaceAll = function (data) { S.data = data; S.save(); };

  S.exportJSON = function () { return JSON.stringify(S.data, null, 2); };

  S.importJSON = function (text) {
    var obj = JSON.parse(text); // caller handles parse errors
    var required = ['testDefs', 'templates', 'sites', 'systems', 'samplePoints', 'visits'];
    for (var i = 0; i < required.length; i++) {
      if (!(required[i] in obj)) throw new Error('Not an AquaTrack backup: missing "' + required[i] + '"');
    }
    if (!obj.products) obj.products = [];
    if (!obj.settings) obj.settings = { companyName: '', defaultRep: '' };
    S.replaceAll(obj);
  };

  /* ------------------------------------------------------------- test defs */
  S.getTest = function (id) {
    return S.data.testDefs.find(function (t) { return t.id === id; }) || null;
  };

  S.addTest = function (def) {
    def.id = def.id || AA.util.id();
    S.data.testDefs.push(def);
    S.save();
    return def;
  };

  S.updateTest = function (id, patch) {
    var t = S.getTest(id);
    if (t) { Object.assign(t, patch); S.save(); }
  };

  /* Deleting a test removes it everywhere: templates, sample points, readings */
  S.deleteTest = function (id) {
    S.data.testDefs = S.data.testDefs.filter(function (t) { return t.id !== id; });
    Object.keys(S.data.templates).forEach(function (k) {
      S.data.templates[k].samplePoints.forEach(function (sp) {
        sp.tests = sp.tests.filter(function (t) { return t.testId !== id; });
      });
    });
    S.data.samplePoints.forEach(function (sp) {
      sp.tests = sp.tests.filter(function (t) { return t.testId !== id; });
    });
    S.data.visits.forEach(function (v) {
      v.readings = v.readings.filter(function (r) { return r.testId !== id; });
    });
    S.save();
  };

  /* ----------------------------------------------------------------- sites */
  S.getSite = function (id) {
    return S.data.sites.find(function (s) { return s.id === id; }) || null;
  };

  S.addSite = function (site) {
    site.id = AA.util.id();
    site.createdAt = AA.util.todayISO();
    S.data.sites.push(site);
    S.save();
    return site;
  };

  S.updateSite = function (id, patch) {
    var s = S.getSite(id);
    if (s) { Object.assign(s, patch); S.save(); }
  };

  S.deleteSite = function (id) {
    S.data.sites = S.data.sites.filter(function (s) { return s.id !== id; });
    var sysIds = S.data.systems.filter(function (y) { return y.siteId === id; }).map(function (y) { return y.id; });
    S.data.systems = S.data.systems.filter(function (y) { return y.siteId !== id; });
    S.data.samplePoints = S.data.samplePoints.filter(function (p) { return sysIds.indexOf(p.systemId) === -1; });
    S.data.visits = S.data.visits.filter(function (v) { return v.siteId !== id; });
    S.save();
  };

  S.addressString = function (site) {
    if (!site || !site.address) return '';
    var a = site.address;
    return [a.line1, a.city, a.region, a.postal, a.country]
      .filter(function (x) { return x && String(x).trim(); }).join(', ');
  };

  /* --------------------------------------------------------------- systems */
  S.getSystem = function (id) {
    return S.data.systems.find(function (y) { return y.id === id; }) || null;
  };

  S.systemsOf = function (siteId) {
    return S.data.systems.filter(function (y) { return y.siteId === siteId; });
  };

  /* Create a system and seed its sample points from the type template */
  S.addSystem = function (siteId, type, name) {
    var sys = { id: AA.util.id(), siteId: siteId, type: type, name: name || (S.data.templates[type] ? S.data.templates[type].label : type), notes: '', products: [] };
    S.data.systems.push(sys);
    var tpl = S.data.templates[type];
    if (tpl) {
      AA.util.clone(tpl.samplePoints).forEach(function (tp) {
        S.data.samplePoints.push({ id: AA.util.id(), systemId: sys.id, name: tp.name, tests: tp.tests });
      });
    }
    S.save();
    return sys;
  };

  S.updateSystem = function (id, patch) {
    var y = S.getSystem(id);
    if (y) { Object.assign(y, patch); S.save(); }
  };

  S.deleteSystem = function (id) {
    var ptIds = S.pointsOf(id).map(function (p) { return p.id; });
    S.data.systems = S.data.systems.filter(function (y) { return y.id !== id; });
    S.data.samplePoints = S.data.samplePoints.filter(function (p) { return p.systemId !== id; });
    S.data.visits.forEach(function (v) {
      v.readings = v.readings.filter(function (r) { return ptIds.indexOf(r.samplePointId) === -1; });
    });
    S.save();
  };

  /* ---------------------------------------------------------- sample points */
  S.getPoint = function (id) {
    return S.data.samplePoints.find(function (p) { return p.id === id; }) || null;
  };

  S.pointsOf = function (systemId) {
    return S.data.samplePoints.filter(function (p) { return p.systemId === systemId; });
  };

  S.addPoint = function (systemId, name, tests) {
    var pt = { id: AA.util.id(), systemId: systemId, name: name, tests: tests || [] };
    S.data.samplePoints.push(pt);
    S.save();
    return pt;
  };

  S.updatePoint = function (id, patch) {
    var p = S.getPoint(id);
    if (p) { Object.assign(p, patch); S.save(); }
  };

  S.deletePoint = function (id) {
    S.data.samplePoints = S.data.samplePoints.filter(function (p) { return p.id !== id; });
    S.data.visits.forEach(function (v) {
      v.readings = v.readings.filter(function (r) { return r.samplePointId !== id; });
    });
    S.save();
  };

  /* -------------------------------------------------------- ranges & flags */

  /* Effective expected range for a test at a sample point.
   * Point-level override wins; null falls back to the test default. */
  S.effRange = function (point, testId) {
    var def = S.getTest(testId);
    var pt = point ? point.tests.find(function (t) { return t.testId === testId; }) : null;
    return {
      min: pt && pt.min != null ? pt.min : (def && def.defaultMin != null ? def.defaultMin : null),
      max: pt && pt.max != null ? pt.max : (def && def.defaultMax != null ? def.defaultMax : null)
    };
  };

  /* 'low' | 'high' | 'ok' | null (no value or no range) */
  S.evalFlag = function (value, range) {
    if (value == null || isNaN(value)) return null;
    if (!range || (range.min == null && range.max == null)) return null;
    if (range.min != null && value < range.min) return 'low';
    if (range.max != null && value > range.max) return 'high';
    return 'ok';
  };

  /* ---------------------------------------------------------------- visits */
  S.getVisit = function (id) {
    return S.data.visits.find(function (v) { return v.id === id; }) || null;
  };

  S.visitsOf = function (siteId) {
    return S.data.visits
      .filter(function (v) { return v.siteId === siteId; })
      .sort(function (a, b) { return b.date < a.date ? -1 : b.date > a.date ? 1 : 0; });
  };

  S.addVisit = function (visit) {
    visit.id = AA.util.id();
    visit.createdAt = AA.util.todayISO();
    S.data.visits.push(visit);
    S.save();
    return visit;
  };

  S.updateVisit = function (id, patch) {
    var v = S.getVisit(id);
    if (v) { Object.assign(v, patch); S.save(); }
  };

  S.deleteVisit = function (id) {
    S.data.visits = S.data.visits.filter(function (v) { return v.id !== id; });
    S.save();
  };

  /* Count readings / flags in one visit (uses current ranges) */
  S.visitStats = function (visit) {
    var n = 0, flagged = 0;
    visit.readings.forEach(function (r) {
      if (r.value == null) return;
      n++;
      var pt = S.getPoint(r.samplePointId);
      var f = S.evalFlag(r.value, S.effRange(pt, r.testId));
      if (f === 'low' || f === 'high') flagged++;
    });
    return { readings: n, flagged: flagged };
  };

  /* ------------------------------------------------------------- histories */

  /* Chronological data for one test at one sample point */
  S.history = function (pointId, testId) {
    var out = [];
    S.data.visits.forEach(function (v) {
      v.readings.forEach(function (r) {
        if (r.samplePointId === pointId && r.testId === testId && r.value != null) {
          out.push({ visitId: v.id, date: v.date, rep: v.rep, value: r.value, comment: r.comment || '' });
        }
      });
    });
    out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return out;
  };

  /* Latest reading for one test at one point (or null) */
  S.latest = function (pointId, testId) {
    var h = S.history(pointId, testId);
    return h.length ? h[h.length - 1] : null;
  };

  /* Every currently-out-of-range latest reading, across all sites.
   * Powers the dashboard action list and map marker states. */
  S.actionItems = function (siteId) {
    var items = [];
    S.data.samplePoints.forEach(function (pt) {
      var sys = S.getSystem(pt.systemId);
      if (!sys) return;
      if (siteId && sys.siteId !== siteId) return;
      var site = S.getSite(sys.siteId);
      pt.tests.forEach(function (t) {
        var last = S.latest(pt.id, t.testId);
        if (!last) return;
        var range = S.effRange(pt, t.testId);
        var flag = S.evalFlag(last.value, range);
        if (flag === 'low' || flag === 'high') {
          items.push({
            site: site, system: sys, point: pt,
            test: S.getTest(t.testId), range: range,
            value: last.value, date: last.date, comment: last.comment, flag: flag
          });
        }
      });
    });
    items.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return items;
  };

  /* ---------------------------------------------------------------- products */
  S.getProduct = function (id) {
    return S.data.products.find(function (p) { return p.id === id; }) || null;
  };

  S.addProduct = function (p) {
    p.id = AA.util.id();
    S.data.products.push(p);
    S.save();
    return p;
  };

  S.updateProduct = function (id, patch) {
    var p = S.getProduct(id);
    if (p) { Object.assign(p, patch); S.save(); }
  };

  S.deleteProduct = function (id) {
    S.data.products = S.data.products.filter(function (p) { return p.id !== id; });
    S.data.systems.forEach(function (y) {
      y.products = (y.products || []).filter(function (a) { return a.productId !== id; });
    });
    S.save();
  };

  return S;
})();
