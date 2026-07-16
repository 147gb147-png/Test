/*
 * FieldLab — data layer.
 *
 * Two modes:
 *  - SERVER mode: the doc lives on the FieldLab server (server.js). Saves are
 *    versioned; concurrent edits by other reps are merged record-by-record
 *    (every record carries a _ts touched-at stamp, deletions are tombstoned).
 *    The client re-pulls periodically so everyone stays in sync.
 *  - SOLO mode: no server reachable (e.g. opened as a plain file) — the doc
 *    persists to localStorage on this device only.
 *
 * Hierarchy:  Site -> System(s) -> Sample Points -> Tests -> Data (readings)
 * Ranges resolve per sample-point test first, then the test default. Flags are
 * computed from the CURRENT range so range changes re-flag history.
 */
window.AA = window.AA || {};

AA.store = (function () {
  var KEY = 'fieldlab_v1';
  var OLD_KEY = 'aquatrack_v1'; /* pre-rename solo data — adopted on first load */
  var S = { data: null, mode: 'solo', version: 0 };

  var dirty = false, pushing = false, pushAgain = false, pushTimer = null, lastPull = 0;

  /* --------------------------------------------------------- mode & sync */
  S.initSolo = function () {
    S.mode = 'solo';
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
      S.data = raw ? JSON.parse(raw) : AA.defaults.blank();
      localStorage.removeItem(OLD_KEY);
    } catch (e) {
      console.error('FieldLab: failed to load saved data, starting fresh.', e);
      S.data = AA.defaults.blank();
    }
    S.migrate();
    S.persistLocal();
  };

  S.initServer = function (stateResp) {
    S.mode = 'server';
    S.version = stateResp.version || 0;
    S.data = stateResp.doc || AA.defaults.blank();
    S.migrate();
    if (!stateResp.doc) S.save(); /* first login on an empty server: push defaults */
  };

  S.adopt = function (doc, version) {
    S.data = doc;
    S.version = version;
    S.migrate();
  };

  S.persistLocal = function () {
    try { localStorage.setItem(KEY, JSON.stringify(S.data)); }
    catch (e) { AA.ui.toast('Could not save — browser storage may be full.', 'error'); }
  };

  /* Called after EVERY mutation. Solo: write-through. Server: debounce+push. */
  S.save = function () {
    if (S.mode === 'solo') { S.persistLocal(); return; }
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(S.push, 500);
  };

  S.push = function () {
    if (S.mode !== 'server' || !dirty) return;
    if (pushing) { pushAgain = true; return; }
    pushing = true;
    dirty = false;
    AA.api.putState(S.version, S.data).then(function (resp) {
      S.version = resp.version;
      if (resp.merged && resp.doc) {
        S.adopt(resp.doc, resp.version);
        AA.ui.toast('Synced with changes from another user.', 'info');
        if (AA.app && AA.app.rerender) AA.app.rerender();
      }
    }).catch(function (err) {
      if (err.status === 401) {
        AA.ui.toast('Session expired — please sign in again.', 'error');
        if (AA.app && AA.app.forceLogin) AA.app.forceLogin();
      } else if (err.status === 403 || err.status === 409) {
        AA.ui.toast(err.message + ' Reloading latest data.', 'error');
        if (err.data && err.data.doc != null) {
          S.adopt(err.data.doc, err.data.version);
          if (AA.app && AA.app.rerender) AA.app.rerender();
        } else {
          S.pull(true);
        }
      } else {
        /* offline or server hiccup — keep dirty, retry shortly */
        dirty = true;
        setTimeout(S.push, 5000);
      }
    }).then(function () {
      pushing = false;
      if (pushAgain) { pushAgain = false; dirty = true; S.push(); }
    });
  };

  /* Refresh from the server if someone else may have written. */
  S.pull = function (force) {
    if (S.mode !== 'server' || dirty || pushing) return Promise.resolve(false);
    if (!force && Date.now() - lastPull < 10000) return Promise.resolve(false);
    lastPull = Date.now();
    return AA.api.state(S.version).then(function (resp) {
      if (resp.unchanged) return false;
      S.adopt(resp.doc || AA.defaults.blank(), resp.version);
      return true;
    }).catch(function () { return false; });
  };

  S.hasUnsaved = function () { return dirty || pushing; };

  S.replaceAll = function (data) {
    S.data = data;
    S.migrate();
    S.save();
  };

  S.exportJSON = function () { return JSON.stringify(S.data, null, 2); };

  S.importJSON = function (text) {
    var obj = JSON.parse(text); // caller handles parse errors
    var required = ['testDefs', 'templates', 'sites', 'systems', 'samplePoints', 'visits'];
    for (var i = 0; i < required.length; i++) {
      if (!(required[i] in obj)) throw new Error('Not an FieldLab backup: missing "' + required[i] + '"');
    }
    S.replaceAll(obj);
  };

  /* ------------------------------------------------------------ migration */
  S.migrate = function () {
    var d = S.data;
    if (!d) return;
    ['sites', 'systems', 'samplePoints', 'visits', 'products', 'testDefs'].forEach(function (k) {
      if (!Array.isArray(d[k])) d[k] = [];
    });
    if (!d.templates) d.templates = {};
    if (!d.settings) d.settings = { companyName: '', defaultRep: '' };
    if (!d.tombstones) d.tombstones = {};
    if (!d.version || d.version < 2) {
      d.sites.forEach(function (s) {
        if (s.repId === undefined) s.repId = null;
      });
      /* offer the closed-loop template to existing v1 workspaces too */
      if (!d.templates.closed_loop && AA.defaults.CLOSED_LOOP) {
        d.templates.closed_loop = AA.util.clone(AA.defaults.CLOSED_LOOP);
      }
      d.version = 2;
    }
    if (d.version < 3) {
      /* interval-days schedule -> calendar visit frequency */
      d.sites.forEach(function (s) {
        if (s.visitFrequency === undefined) {
          var iv = s.serviceIntervalDays;
          s.visitFrequency = iv == null ? null : (iv <= 10 ? 'weekly' : (iv <= 45 ? 'monthly' : 'quarterly'));
        }
        delete s.serviceIntervalDays;
      });
      d.version = 3;
    }
    if (d.version < 4) {
      /* two-level -> four-level thresholds: the old single range becomes the
       * EXPECTED range (low/high); absolute min/max limits start empty. */
      d.testDefs.forEach(function (t) {
        if (t.defaultLow === undefined) t.defaultLow = t.defaultMin != null ? t.defaultMin : null;
        if (t.defaultHigh === undefined) t.defaultHigh = t.defaultMax != null ? t.defaultMax : null;
        t.defaultMin = null;
        t.defaultMax = null;
      });
      function upgradeEntry(t) {
        if (t.low === undefined) t.low = t.min != null ? t.min : null;
        if (t.high === undefined) t.high = t.max != null ? t.max : null;
        t.min = null;
        t.max = null;
      }
      d.samplePoints.forEach(function (sp) { sp.tests.forEach(upgradeEntry); });
      Object.keys(d.templates).forEach(function (k) {
        d.templates[k].samplePoints.forEach(function (sp) { sp.tests.forEach(upgradeEntry); });
      });
      d.version = 4;
    }
  };

  /* --------------------------------------------------- ts & tombstones */
  function ts(rec) { rec._ts = Date.now(); return rec; }
  S.touch = ts;
  function tomb(id) { S.data.tombstones[id] = Date.now(); }

  /* ------------------------------------------------------------ scoping */
  /* Sites the CURRENT user works with. Reps: assigned sites only.
   * Admin/solo: all sites, narrowed by the admin's rep filter if set. */
  S.scopedSites = function () {
    var u = AA.auth.user;
    var sites = S.data.sites;
    if (u && u.role === 'rep') {
      return sites.filter(function (s) { return s.repId === u.id; });
    }
    if (AA.state.repFilter && AA.state.repFilter !== 'all') {
      if (AA.state.repFilter === 'none') return sites.filter(function (s) { return !s.repId; });
      return sites.filter(function (s) { return s.repId === AA.state.repFilter; });
    }
    return sites;
  };

  S.scopedSiteIds = function () {
    var m = {};
    S.scopedSites().forEach(function (s) { m[s.id] = true; });
    return m;
  };

  S.sitesOfRep = function (repId) {
    return S.data.sites.filter(function (s) { return s.repId === repId; });
  };

  S.canEditSite = function (site) {
    var u = AA.auth.user;
    if (!u || u.role === 'admin') return true;
    return site && site.repId === u.id;
  };

  /* ------------------------------------------------------------- test defs */
  S.getTest = function (id) {
    return S.data.testDefs.find(function (t) { return t.id === id; }) || null;
  };

  S.addTest = function (def) {
    def.id = def.id || AA.util.id();
    S.data.testDefs.push(ts(def));
    S.save();
    return def;
  };

  S.updateTest = function (id, patch) {
    var t = S.getTest(id);
    if (t) { Object.assign(t, patch); ts(t); S.save(); }
  };

  /* Deleting a test removes it everywhere: templates, sample points, readings */
  S.deleteTest = function (id) {
    S.data.testDefs = S.data.testDefs.filter(function (t) { return t.id !== id; });
    tomb(id);
    Object.keys(S.data.templates).forEach(function (k) {
      var tpl = S.data.templates[k];
      var before = JSON.stringify(tpl.samplePoints);
      tpl.samplePoints.forEach(function (sp) {
        sp.tests = sp.tests.filter(function (t) { return t.testId !== id; });
      });
      if (JSON.stringify(tpl.samplePoints) !== before) ts(tpl);
    });
    S.data.samplePoints.forEach(function (sp) {
      var n = sp.tests.length;
      sp.tests = sp.tests.filter(function (t) { return t.testId !== id; });
      if (sp.tests.length !== n) ts(sp);
    });
    S.data.visits.forEach(function (v) {
      var n = v.readings.length;
      v.readings = v.readings.filter(function (r) { return r.testId !== id; });
      if (v.readings.length !== n) ts(v);
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
    var u = AA.auth.user;
    if (site.repId === undefined || site.repId === null) {
      site.repId = (u && u.role === 'rep') ? u.id : (site.repId || null);
    }
    S.data.sites.push(ts(site));
    S.save();
    return site;
  };

  S.updateSite = function (id, patch) {
    var s = S.getSite(id);
    if (s) { Object.assign(s, patch); ts(s); S.save(); }
  };

  S.deleteSite = function (id) {
    S.data.sites = S.data.sites.filter(function (s) { return s.id !== id; });
    tomb(id);
    var sysIds = S.data.systems.filter(function (y) { return y.siteId === id; }).map(function (y) { return y.id; });
    S.data.systems = S.data.systems.filter(function (y) { return y.siteId !== id; });
    sysIds.forEach(tomb);
    S.data.samplePoints = S.data.samplePoints.filter(function (p) {
      if (sysIds.indexOf(p.systemId) === -1) return true;
      tomb(p.id); return false;
    });
    S.data.visits = S.data.visits.filter(function (v) {
      if (v.siteId !== id) return true;
      tomb(v.id); return false;
    });
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
    var tplDef = S.data.templates[type];
    var sys = ts({
      id: AA.util.id(), siteId: siteId, type: type,
      name: name || (tplDef ? tplDef.label : type), notes: '', products: []
    });
    S.data.systems.push(sys);
    if (tplDef) {
      AA.util.clone(tplDef.samplePoints).forEach(function (tp) {
        S.data.samplePoints.push(ts({ id: AA.util.id(), systemId: sys.id, name: tp.name, tests: tp.tests }));
      });
    }
    S.save();
    return sys;
  };

  S.updateSystem = function (id, patch) {
    var y = S.getSystem(id);
    if (y) { Object.assign(y, patch); ts(y); S.save(); }
  };

  S.deleteSystem = function (id) {
    var ptIds = S.pointsOf(id).map(function (p) { return p.id; });
    S.data.systems = S.data.systems.filter(function (y) { return y.id !== id; });
    tomb(id);
    S.data.samplePoints = S.data.samplePoints.filter(function (p) { return p.systemId !== id; });
    ptIds.forEach(tomb);
    S.data.visits.forEach(function (v) {
      var n = v.readings.length;
      v.readings = v.readings.filter(function (r) { return ptIds.indexOf(r.samplePointId) === -1; });
      if (v.readings.length !== n) ts(v);
    });
    S.save();
  };

  /* product assignments on a system */
  S.assignProduct = function (systemId, entry) {
    var y = S.getSystem(systemId);
    if (!y) return;
    y.products = y.products || [];
    y.products.push(entry);
    ts(y); S.save();
  };

  S.unassignProduct = function (systemId, index) {
    var y = S.getSystem(systemId);
    if (!y || !y.products) return;
    y.products.splice(index, 1);
    ts(y); S.save();
  };

  /* ---------------------------------------------------------- sample points */
  S.getPoint = function (id) {
    return S.data.samplePoints.find(function (p) { return p.id === id; }) || null;
  };

  S.pointsOf = function (systemId) {
    return S.data.samplePoints.filter(function (p) { return p.systemId === systemId; });
  };

  S.addPoint = function (systemId, name, tests) {
    var pt = ts({ id: AA.util.id(), systemId: systemId, name: name, tests: tests || [] });
    S.data.samplePoints.push(pt);
    S.save();
    return pt;
  };

  S.updatePoint = function (id, patch) {
    var p = S.getPoint(id);
    if (p) { Object.assign(p, patch); ts(p); S.save(); }
  };

  S.deletePoint = function (id) {
    S.data.samplePoints = S.data.samplePoints.filter(function (p) { return p.id !== id; });
    tomb(id);
    S.data.visits.forEach(function (v) {
      var n = v.readings.length;
      v.readings = v.readings.filter(function (r) { return r.samplePointId !== id; });
      if (v.readings.length !== n) ts(v);
    });
    S.save();
  };

  S.addTestToPoint = function (pointId, entry) {
    var p = S.getPoint(pointId);
    if (!p) return;
    p.tests.push(entry);
    ts(p); S.save();
  };

  S.removeTestFromPoint = function (pointId, testId) {
    var p = S.getPoint(pointId);
    if (!p) return;
    p.tests = p.tests.filter(function (t) { return t.testId !== testId; });
    ts(p); S.save();
  };

  /* vals: {low, high, min, max} — null clears back to the test default */
  S.setPointTestRange = function (pointId, testId, vals) {
    var p = S.getPoint(pointId);
    if (!p) return;
    var entry = p.tests.find(function (t) { return t.testId === testId; });
    if (!entry) return;
    entry.low = vals.low; entry.high = vals.high;
    entry.min = vals.min; entry.max = vals.max;
    ts(p); S.save();
  };

  /* -------------------------------------------------------------- templates */
  S.addTemplate = function (label) {
    var base = AA.util.slug(label), id = base, n = 2;
    while (S.data.templates[id]) { id = base + '_' + n++; }
    S.data.templates[id] = ts({ label: label, samplePoints: [] });
    S.save();
    return id;
  };

  S.renameTemplate = function (type, label) {
    var tpl = S.data.templates[type];
    if (tpl) { tpl.label = label; ts(tpl); S.save(); }
  };

  S.deleteTemplate = function (type) {
    delete S.data.templates[type];
    S.data.tombstones['tpl:' + type] = Date.now();
    S.save();
  };

  S.templateUsage = function (type) {
    return S.data.systems.filter(function (y) { return y.type === type; }).length;
  };

  S.tplMutate = function (type, fn) {
    var tpl = S.data.templates[type];
    if (!tpl) return;
    fn(tpl);
    ts(tpl); S.save();
  };

  /* ---------------------------------------------------------------- settings */
  S.setSettings = function (patch) {
    Object.assign(S.data.settings, patch);
    ts(S.data.settings);
    S.save();
  };

  /* -------------------------------------------------------- ranges & flags
   * Four thresholds per test, all optional:
   *   low / high — the EXPECTED range (▼ Low / ▲ High when crossed)
   *   min / max  — ABSOLUTE limits, highest priority (‼ Below Min / ‼ Above Max)
   * Each level resolves per sample point first, then the test default —
   * which is what makes every threshold adjustable per individual site. */
  S.effRange = function (point, testId) {
    var def = S.getTest(testId) || {};
    var pt = point ? point.tests.find(function (t) { return t.testId === testId; }) : null;
    function pick(ptVal, defVal) {
      if (ptVal != null) return ptVal;
      return defVal != null ? defVal : null;
    }
    return {
      low: pick(pt && pt.low, def.defaultLow),
      high: pick(pt && pt.high, def.defaultHigh),
      min: pick(pt && pt.min, def.defaultMin),
      max: pick(pt && pt.max, def.defaultMax)
    };
  };

  /* 'critLow' | 'critHigh' | 'low' | 'high' | 'ok' | null.
   * Absolute limits are checked first — they are the highest priority. */
  S.evalFlag = function (value, range) {
    if (value == null || isNaN(value)) return null;
    if (!range || (range.low == null && range.high == null && range.min == null && range.max == null)) return null;
    if (range.min != null && value < range.min) return 'critLow';
    if (range.max != null && value > range.max) return 'critHigh';
    if (range.low != null && value < range.low) return 'low';
    if (range.high != null && value > range.high) return 'high';
    return 'ok';
  };

  S.isOut = function (flag) {
    return flag === 'low' || flag === 'high' || flag === 'critLow' || flag === 'critHigh';
  };

  S.isCrit = function (flag) {
    return flag === 'critLow' || flag === 'critHigh';
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
    S.data.visits.push(ts(visit));
    S.save();
    return visit;
  };

  S.updateVisit = function (id, patch) {
    var v = S.getVisit(id);
    if (v) { Object.assign(v, patch); ts(v); S.save(); }
  };

  S.deleteVisit = function (id) {
    S.data.visits = S.data.visits.filter(function (v) { return v.id !== id; });
    tomb(id);
    S.save();
  };

  /* Count readings / flags in one visit (uses current ranges) */
  S.visitStats = function (visit) {
    var n = 0, flagged = 0, crit = 0;
    visit.readings.forEach(function (r) {
      if (r.value == null) return;
      n++;
      var pt = S.getPoint(r.samplePointId);
      var f = S.evalFlag(r.value, S.effRange(pt, r.testId));
      if (S.isOut(f)) flagged++;
      if (S.isCrit(f)) crit++;
    });
    return { readings: n, flagged: flagged, crit: crit };
  };

  /* ------------------------------------------------------------- histories */
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

  S.latest = function (pointId, testId) {
    var h = S.history(pointId, testId);
    return h.length ? h[h.length - 1] : null;
  };

  /* Consecutive out-of-range readings ending at the latest one. */
  S.outOfRangeStreak = function (pointId, testId) {
    var pt = S.getPoint(pointId);
    var range = S.effRange(pt, testId);
    var h = S.history(pointId, testId);
    var streak = 0;
    for (var i = h.length - 1; i >= 0; i--) {
      if (S.isOut(S.evalFlag(h[i].value, range))) streak++;
      else break;
    }
    return streak;
  };

  /* Every currently-out-of-range latest reading, across the given site scope.
   * Chronic = out of range on 3+ consecutive readings (AA-style escalation). */
  S.actionItems = function (siteId, siteIds) {
    var items = [];
    S.data.samplePoints.forEach(function (pt) {
      var sys = S.getSystem(pt.systemId);
      if (!sys) return;
      if (siteId && sys.siteId !== siteId) return;
      if (siteIds && !siteIds[sys.siteId]) return;
      var site = S.getSite(sys.siteId);
      pt.tests.forEach(function (t) {
        var last = S.latest(pt.id, t.testId);
        if (!last) return;
        var range = S.effRange(pt, t.testId);
        var flag = S.evalFlag(last.value, range);
        if (S.isOut(flag)) {
          items.push({
            site: site, system: sys, point: pt,
            test: S.getTest(t.testId), range: range,
            value: last.value, date: last.date, comment: last.comment, flag: flag,
            crit: S.isCrit(flag),
            streak: S.outOfRangeStreak(pt.id, t.testId)
          });
        }
      });
    });
    /* absolute-limit violations first, then chronic, then newest */
    items.sort(function (a, b) {
      if (a.crit !== b.crit) return a.crit ? -1 : 1;
      if ((b.streak >= 3) !== (a.streak >= 3)) return (b.streak >= 3) ? 1 : -1;
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
    return items;
  };

  /* ------------------------------------------- visit schedule & progress
   * Each site can carry a visitFrequency: 'weekly' | 'monthly' | 'quarterly'.
   * A site is "completed" when it has a visit inside the CURRENT calendar
   * period (week starting Monday / calendar month / calendar quarter) — so
   * the count automatically resets to 0/N at the start of every period. */

  S.FREQUENCIES = [
    ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Quarterly']
  ];

  S.freqLabel = function (freq) {
    var f = S.FREQUENCIES.find(function (x) { return x[0] === freq; });
    return f ? f[1] : 'No schedule';
  };

  function isoOf(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* First day of the current period for a frequency (ISO), or null */
  S.periodStart = function (freq) {
    var d = new Date(AA.util.todayISO() + 'T00:00:00');
    if (freq === 'weekly') {
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); /* back to Monday */
    } else if (freq === 'monthly') {
      d.setDate(1);
    } else if (freq === 'quarterly') {
      d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
    } else {
      return null;
    }
    return isoOf(d);
  };

  /* Human name of the current period, e.g. "July", "week of Jul 13", "Q3 2026" */
  S.periodLabel = function (freq) {
    var start = S.periodStart(freq);
    if (!start) return '';
    var d = new Date(start + 'T00:00:00');
    if (freq === 'weekly') return 'week of ' + AA.util.fmtDateShort(start);
    if (freq === 'monthly') return d.toLocaleDateString(undefined, { month: 'long' });
    return 'Q' + (Math.floor(d.getMonth() / 3) + 1) + ' ' + d.getFullYear();
  };

  S.daysLeftInPeriod = function (freq) {
    var start = S.periodStart(freq);
    if (!start) return null;
    var d = new Date(start + 'T00:00:00');
    if (freq === 'weekly') d.setDate(d.getDate() + 7);
    else if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setMonth(d.getMonth() + 3);
    return AA.util.daysBetween(AA.util.todayISO(), isoOf(d));
  };

  /* {scheduled, completed, lastVisit, periodStart, label} for one site */
  S.siteVisitStatus = function (site) {
    var freq = site.visitFrequency;
    var visits = S.visitsOf(site.id);
    var last = visits.length ? visits[0].date : null;
    if (!freq) return { scheduled: false, completed: false, lastVisit: last };
    var ps = S.periodStart(freq);
    return {
      scheduled: true,
      freq: freq,
      completed: !!last && last >= ps,
      lastVisit: last,
      periodStart: ps,
      label: S.periodLabel(freq),
      daysLeft: S.daysLeftInPeriod(freq)
    };
  };

  /* Progress across a scope: done/total scheduled sites + who's still due.
   * Resets automatically because completion is judged per current period. */
  S.visitProgress = function (siteIds) {
    var done = 0, total = 0, due = [];
    S.data.sites.forEach(function (s) {
      if (siteIds && !siteIds[s.id]) return;
      var st = S.siteVisitStatus(s);
      if (!st.scheduled) return;
      total++;
      if (st.completed) done++;
      else due.push({ site: s, status: st });
    });
    due.sort(function (a, b) { return (a.status.daysLeft || 999) - (b.status.daysLeft || 999); });
    return { done: done, total: total, due: due, pct: total ? Math.round(100 * done / total) : null };
  };

  /* ------------------------------------------------------ product inventory */
  S.latestProductLevel = function (systemId, productId) {
    var visits = S.data.visits.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    for (var i = 0; i < visits.length; i++) {
      var pls = visits[i].productLevels || [];
      for (var j = 0; j < pls.length; j++) {
        if (pls[j].systemId === systemId && pls[j].productId === productId && pls[j].level != null) {
          return { level: pls[j].level, date: visits[i].date };
        }
      }
    }
    return null;
  };

  /* Assignments whose latest recorded level is at/below the low threshold. */
  S.lowInventory = function (siteIds) {
    var out = [];
    S.data.systems.forEach(function (sys) {
      if (siteIds && !siteIds[sys.siteId]) return;
      (sys.products || []).forEach(function (ap) {
        if (ap.lowLevel == null) return;
        var last = S.latestProductLevel(sys.id, ap.productId);
        if (last && last.level <= ap.lowLevel) {
          out.push({
            site: S.getSite(sys.siteId), system: sys,
            product: S.getProduct(ap.productId), assignment: ap,
            level: last.level, date: last.date
          });
        }
      });
    });
    return out;
  };

  /* KPI: share of readings in range over the trailing N days, in scope. */
  S.inRangeKPI = function (days, siteIds) {
    var cutoff = AA.util.daysAgoISO(days);
    var total = 0, ok = 0;
    S.data.visits.forEach(function (v) {
      if (v.date < cutoff) return;
      if (siteIds && !siteIds[v.siteId]) return;
      v.readings.forEach(function (r) {
        if (r.value == null) return;
        var pt = S.getPoint(r.samplePointId);
        if (!pt) return;
        var f = S.evalFlag(r.value, S.effRange(pt, r.testId));
        if (f === null) return;
        total++;
        if (f === 'ok') ok++;
        /* both expected-range and absolute-limit violations count against the KPI */
      });
    });
    return total ? { pct: Math.round(100 * ok / total), total: total } : null;
  };

  /* ---------------------------------------------------------------- products */
  S.getProduct = function (id) {
    return S.data.products.find(function (p) { return p.id === id; }) || null;
  };

  S.addProduct = function (p) {
    p.id = AA.util.id();
    S.data.products.push(ts(p));
    S.save();
    return p;
  };

  S.updateProduct = function (id, patch) {
    var p = S.getProduct(id);
    if (p) { Object.assign(p, patch); ts(p); S.save(); }
  };

  S.deleteProduct = function (id) {
    S.data.products = S.data.products.filter(function (p) { return p.id !== id; });
    tomb(id);
    S.data.systems.forEach(function (y) {
      var n = (y.products || []).length;
      y.products = (y.products || []).filter(function (a) { return a.productId !== id; });
      if (y.products.length !== n) ts(y);
    });
    S.save();
  };

  return S;
})();
