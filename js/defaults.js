/*
 * FieldLab — default catalog: tests, system templates, products, demo data.
 * Everything here is a STARTING POINT — all of it is editable in Settings,
 * including creating entirely new system types (chillers, RO, softeners…).
 * Control limits are typical industrial water treatment guidelines. Always
 * tailor them per site / sample point to your actual program design.
 */
window.AA = window.AA || {};

AA.defaults = (function () {

  /* ------------------------------------------------------------ test catalog */
  var TESTS = [
    { id: 'ph',        name: 'pH',                        unit: '',            decimals: 2, defaultLow: null, defaultHigh: null, description: 'Acidity / alkalinity (0–14).' },
    { id: 'cond',      name: 'Conductivity',              unit: 'µS/cm',       decimals: 0, defaultLow: null, defaultHigh: null, description: 'Proxy for total dissolved solids.' },
    { id: 'tds',       name: 'Total Dissolved Solids',    unit: 'ppm',         decimals: 0, defaultLow: null, defaultHigh: null, description: 'Dissolved solids, measured or from conductivity.' },
    { id: 'p_alk',     name: 'P-Alkalinity',              unit: 'ppm CaCO₃',   decimals: 0, defaultLow: null, defaultHigh: null, description: 'Phenolphthalein alkalinity.' },
    { id: 'm_alk',     name: 'M-Alkalinity (Total)',      unit: 'ppm CaCO₃',   decimals: 0, defaultLow: null, defaultHigh: null, description: 'Methyl orange / total alkalinity.' },
    { id: 'oh_alk',    name: 'OH-Alkalinity',             unit: 'ppm CaCO₃',   decimals: 0, defaultLow: null, defaultHigh: null, description: 'Hydroxide alkalinity (2P − M).' },
    { id: 't_hard',    name: 'Total Hardness',            unit: 'ppm CaCO₃',   decimals: 1, defaultLow: null, defaultHigh: null, description: 'Calcium + magnesium hardness.' },
    { id: 'ca_hard',   name: 'Calcium Hardness',          unit: 'ppm CaCO₃',   decimals: 0, defaultLow: null, defaultHigh: null, description: 'Calcium fraction of hardness.' },
    { id: 'chloride',  name: 'Chloride',                  unit: 'ppm Cl⁻',     decimals: 0, defaultLow: null, defaultHigh: null, description: 'Often used to calculate cycles of concentration.' },
    { id: 'sulphite',  name: 'Sulphite',                  unit: 'ppm SO₃²⁻',   decimals: 0, defaultLow: 20,   defaultHigh: 60,   description: 'Oxygen scavenger residual (boiler water).' },
    { id: 'phosphate', name: 'Phosphate',                 unit: 'ppm PO₄³⁻',   decimals: 1, defaultLow: null, defaultHigh: null, description: 'Scale inhibitor / internal treatment residual.' },
    { id: 'silica',    name: 'Silica',                    unit: 'ppm SiO₂',    decimals: 1, defaultLow: null, defaultHigh: 150,  description: 'Silica scale risk indicator.' },
    { id: 'iron',      name: 'Iron',                      unit: 'ppm Fe',      decimals: 2, defaultLow: null, defaultHigh: 1,    description: 'Corrosion product indicator.' },
    { id: 'copper',    name: 'Copper',                    unit: 'ppm Cu',      decimals: 2, defaultLow: null, defaultHigh: 0.05, description: 'Corrosion product indicator (condensate / closed loops).' },
    { id: 'free_cl',   name: 'Free Chlorine',             unit: 'ppm Cl₂',     decimals: 2, defaultLow: null, defaultHigh: null, description: 'Free oxidizing biocide residual.' },
    { id: 'total_cl',  name: 'Total Chlorine',            unit: 'ppm Cl₂',     decimals: 2, defaultLow: null, defaultHigh: null, description: 'Total oxidizing biocide residual.' },
    { id: 'bromine',   name: 'Bromine',                   unit: 'ppm Br₂',     decimals: 2, defaultLow: null, defaultHigh: null, description: 'Bromine biocide residual.' },
    { id: 'orp',       name: 'ORP',                       unit: 'mV',          decimals: 0, defaultLow: null, defaultHigh: null, description: 'Oxidation-reduction potential (biocide effectiveness).' },
    { id: 'cycles',    name: 'Cycles of Concentration',   unit: 'cycles',      decimals: 1, defaultLow: null, defaultHigh: null, description: 'System concentration vs. makeup (e.g. Cl⁻ ratio).' },
    { id: 'temp',      name: 'Temperature',               unit: '°C',          decimals: 1, defaultLow: null, defaultHigh: null, description: 'Water temperature at the sample point.' },
    { id: 'turbidity', name: 'Turbidity',                 unit: 'NTU',         decimals: 1, defaultLow: null, defaultHigh: null, description: 'Suspended solids / clarity.' },
    { id: 'azole',     name: 'Azole',                     unit: 'ppm',         decimals: 1, defaultLow: null, defaultHigh: null, description: 'Yellow-metal corrosion inhibitor residual.' },
    { id: 'molybdate', name: 'Molybdate',                 unit: 'ppm Mo',      decimals: 1, defaultLow: null, defaultHigh: null, description: 'Tracer / corrosion inhibitor residual.' },
    { id: 'nitrite',   name: 'Nitrite',                   unit: 'ppm NO₂⁻',    decimals: 0, defaultLow: null, defaultHigh: null, description: 'Closed-loop corrosion inhibitor residual.' },
    { id: 'glycol',    name: 'Glycol',                    unit: '%',           decimals: 1, defaultLow: null, defaultHigh: null, description: 'Freeze protection concentration (closed loops).' },
    { id: 'dip_slide', name: 'Dip Slide (Aerobic Count)', unit: 'CFU/mL',      decimals: 0, defaultLow: null, defaultHigh: 10000, description: 'Microbiological activity (48 h incubation).' }
  ];

  /* ------------------------------------------------- system-type templates
   * When a system is created these sample points (and their tests + expected
   * ranges) are copied onto it. min/max null = inherit the test's default.
   * New system types can be created in Settings → System templates. */
  var CLOSED_LOOP = {
    label: 'Closed Loop (Chilled / Hot Water)',
    samplePoints: [
      {
        name: 'Loop Water',
        tests: [
          { testId: 'ph',        low: 8.5,  high: 10.5 },
          { testId: 'cond',      low: null, high: null },
          { testId: 'nitrite',   low: 500,  high: 1000 },
          { testId: 'molybdate', low: null, high: null },
          { testId: 'glycol',    low: null, high: null },
          { testId: 'iron',      low: null, high: 1 },
          { testId: 'copper',    low: null, high: 0.2 }
        ]
      }
    ]
  };

  var TEMPLATES = {
    boiler: {
      label: 'Boiler System',
      samplePoints: [
        {
          name: 'Makeup Water',
          tests: [
            { testId: 'ph',       low: 6.5,  high: 8.5 },
            { testId: 'cond',     low: null, high: null },
            { testId: 't_hard',   low: null, high: 1 },
            { testId: 'm_alk',    low: null, high: null },
            { testId: 'chloride', low: null, high: null },
            { testId: 'iron',     low: null, high: 0.3 }
          ]
        },
        {
          name: 'Feedwater',
          tests: [
            { testId: 'ph',     low: 8.3,  high: 10 },
            { testId: 'cond',   low: null, high: null },
            { testId: 't_hard', low: null, high: 1 },
            { testId: 'iron',   low: null, high: 0.1 }
          ]
        },
        {
          name: 'Boiler Water',
          tests: [
            { testId: 'ph',        low: 10.5, high: 12, min: 10, max: 12.8 },
            { testId: 'cond',      low: 1000, high: 3500 },
            { testId: 'tds',       low: null, high: 3500 },
            { testId: 'p_alk',     low: 200,  high: 700 },
            { testId: 'm_alk',     low: null, high: 900 },
            { testId: 'oh_alk',    low: 200,  high: 600 },
            { testId: 'sulphite',  low: 20,   high: 60, min: 10 },
            { testId: 'phosphate', low: 30,   high: 60 },
            { testId: 'chloride',  low: null, high: 300 },
            { testId: 't_hard',    low: null, high: 1 },
            { testId: 'silica',    low: null, high: 150 },
            { testId: 'iron',      low: null, high: 1 }
          ]
        },
        {
          name: 'Condensate',
          tests: [
            { testId: 'ph',     low: 7.5,  high: 9 },
            { testId: 'cond',   low: null, high: 40 },
            { testId: 't_hard', low: null, high: 1 },
            { testId: 'iron',   low: null, high: 0.1, max: 0.25 },
            { testId: 'copper', low: null, high: 0.05 }
          ]
        }
      ]
    },
    cooling_tower: {
      label: 'Cooling Tower System',
      samplePoints: [
        {
          name: 'Makeup Water',
          tests: [
            { testId: 'ph',       low: 6.5,  high: 8.5 },
            { testId: 'cond',     low: null, high: null },
            { testId: 't_hard',   low: null, high: null },
            { testId: 'ca_hard',  low: null, high: null },
            { testId: 'm_alk',    low: null, high: null },
            { testId: 'chloride', low: null, high: null },
            { testId: 'silica',   low: null, high: null },
            { testId: 'iron',     low: null, high: 0.3 }
          ]
        },
        {
          name: 'Recirculating Water',
          tests: [
            { testId: 'ph',        low: 7.5,  high: 9, min: 6.5, max: 9.5 },
            { testId: 'cond',      low: null, high: 2500 },
            { testId: 't_hard',    low: null, high: null },
            { testId: 'ca_hard',   low: null, high: 600 },
            { testId: 'm_alk',     low: 100,  high: 500 },
            { testId: 'chloride',  low: null, high: null },
            { testId: 'cycles',    low: 3,    high: 8 },
            { testId: 'free_cl',   low: 0.5,  high: 1, min: 0.2, max: 2 },
            { testId: 'orp',       low: 400,  high: 650 },
            { testId: 'phosphate', low: 8,    high: 15 },
            { testId: 'azole',     low: 1,    high: 3 },
            { testId: 'iron',      low: null, high: 1 },
            { testId: 'silica',    low: null, high: 150 },
            { testId: 'temp',      low: null, high: null },
            { testId: 'dip_slide', low: null, high: 10000, max: 50000 }
          ]
        }
      ]
    },
    closed_loop: CLOSED_LOOP
  };

  /* ------------------------------------------------------------- products */
  var PRODUCTS = [
    { id: 'p-bwt100', name: 'BWT-100 Boiler Internal Treatment', description: 'Catalyzed sulphite oxygen scavenger with polymeric sludge conditioner.', dose: 'Maintain 20–60 ppm sulphite in boiler water', notes: 'Example product — replace with your own line in Settings → Products.' },
    { id: 'p-bwt250', name: 'BWT-250 Condensate Treatment', description: 'Neutralizing amine blend for condensate line protection.', dose: 'Maintain condensate pH 7.5–9.0', notes: 'Example product.' },
    { id: 'p-cwt310', name: 'CWT-310 Cooling Water Inhibitor', description: 'Phosphate / azole scale and corrosion inhibitor for open recirculating systems.', dose: 'Maintain 8–15 ppm PO₄ in recirculating water', notes: 'Example product.' },
    { id: 'p-cwt450', name: 'CWT-450 Oxidizing Biocide', description: 'Slow-release bromine tablets for microbiological control.', dose: 'Maintain 0.5–1.0 ppm free halogen', notes: 'Example product.' },
    { id: 'p-clt500', name: 'CLT-500 Closed Loop Treatment', description: 'Nitrite / azole corrosion inhibitor for closed loops.', dose: 'Maintain 500–1000 ppm nitrite', notes: 'Example product.' }
  ];

  function blank() {
    return {
      version: 4,
      settings: { companyName: '', defaultRep: '' },
      testDefs: AA.util.clone(TESTS),
      templates: AA.util.clone(TEMPLATES),
      products: AA.util.clone(PRODUCTS),
      sites: [],
      systems: [],
      samplePoints: [],
      visits: [],
      tombstones: {}
    };
  }

  /* ------------------------------------------------------------ demo data */

  /* Typical reading per test id: [base, jitter] — demo values wander around base */
  var DEMO_BASES = {
    'Makeup Water:boiler':  { ph: [7.4, 0.3], cond: [420, 60], t_hard: [0.4, 0.3], m_alk: [120, 20], chloride: [26, 6], iron: [0.08, 0.05] },
    'Feedwater':            { ph: [9.0, 0.4], cond: [500, 70], t_hard: [0.3, 0.2], iron: [0.05, 0.03] },
    'Boiler Water':         { ph: [11.2, 0.35], cond: [2700, 380], tds: [2500, 350], p_alk: [420, 90], m_alk: [640, 90], oh_alk: [340, 70], sulphite: [38, 10], phosphate: [44, 7], chloride: [180, 45], t_hard: [0.3, 0.2], silica: [88, 22], iron: [0.4, 0.2] },
    'Condensate':           { ph: [8.2, 0.3], cond: [18, 8], t_hard: [0.2, 0.15], iron: [0.05, 0.03], copper: [0.01, 0.008] },
    'Makeup Water:cooling': { ph: [7.5, 0.3], cond: [350, 45], t_hard: [140, 20], ca_hard: [95, 15], m_alk: [110, 15], chloride: [40, 8], silica: [18, 4], iron: [0.1, 0.05] },
    'Recirculating Water':  { ph: [8.5, 0.25], cond: [1750, 280], t_hard: [640, 90], ca_hard: [420, 70], m_alk: [320, 60], chloride: [210, 40], cycles: [5.2, 1.0], free_cl: [0.72, 0.16], orp: [520, 55], phosphate: [11.5, 2.0], azole: [2.1, 0.5], iron: [0.4, 0.2], silica: [92, 20], temp: [27, 3], dip_slide: [1000, 900] },
    'Loop Water':           { ph: [9.4, 0.3], cond: [2800, 160], nitrite: [720, 120], molybdate: [4, 1], glycol: [21, 1.2], iron: [0.3, 0.15], copper: [0.04, 0.03] }
  };

  function demoBaseFor(pointName, systemType) {
    if (pointName === 'Makeup Water') {
      return DEMO_BASES[systemType === 'boiler' ? 'Makeup Water:boiler' : 'Makeup Water:cooling'];
    }
    return DEMO_BASES[pointName];
  }

  function round(v, d) {
    var f = Math.pow(10, d == null ? 1 : d);
    return Math.round(v * f) / f;
  }

  /* Sawtooth product level: consumes ratePerWeek from start, refilled when it
   * dips below refillAt (refillAt=null means never refilled in the demo). */
  function levelAt(weeksElapsed, start, ratePerWeek, refillAt) {
    var lvl = start;
    for (var i = 0; i < weeksElapsed; i++) {
      lvl -= ratePerWeek;
      if (refillAt != null && lvl < refillAt) lvl = start;
    }
    return Math.max(0, Math.round(lvl));
  }

  /*
   * Build a full demo dataset: 3 sites (with coordinates so the map works
   * immediately), boiler / cooling / closed-loop systems, ~14 weekly visits
   * per site with deliberate out-of-range stories, comments, product levels
   * and one overdue site.
   */
  function demoData() {
    var d = blank();
    var u = AA.util;
    d.settings.companyName = 'ClearFlow Water Services (demo)';
    d.settings.defaultRep = 'A. Rivera';

    var sites = [
      { name: 'Riverside Hospital', contact: 'M. Okafor (Chief Engineer)', phone: '(614) 555-0142', email: 'engineering@riversidehosp.example', address: { line1: '1200 River Rd', city: 'Columbus', region: 'OH', postal: '43215', country: 'USA' }, lat: 39.9702, lng: -83.0150, notes: 'Access via loading dock B. Boiler room badge required.', systems: ['boiler', 'cooling_tower'], offsetDays: 0, freq: 'weekly' },
      { name: 'Maplewood Foods Plant', contact: 'S. Grant (Maintenance Lead)', phone: '(216) 555-0187', email: 'maintenance@maplewoodfoods.example', address: { line1: '450 Industrial Pkwy', city: 'Cleveland', region: 'OH', postal: '44113', country: 'USA' }, lat: 41.4820, lng: -81.7040, notes: 'Steam used for process cooking — condensate quality critical.', systems: ['boiler'], offsetDays: 20, freq: 'monthly' },
      { name: 'Lakeside Office Tower', contact: 'D. Kim (Property Manager)', phone: '(312) 555-0116', email: 'ops@lakesidetower.example', address: { line1: '233 W Lake St', city: 'Chicago', region: 'IL', postal: '60606', country: 'USA' }, lat: 41.8858, lng: -87.6355, notes: 'Two-cell tower on roof; seasonal shutdown Nov–Mar. Chilled loop serves floors 1–22.', systems: ['cooling_tower', 'closed_loop'], offsetDays: 1, freq: 'monthly' }
    ];

    var reps = ['A. Rivera', 'J. Chen'];
    var WEEKS = 14;

    sites.forEach(function (s, si) {
      var site = {
        id: u.id(), name: s.name, contact: s.contact, phone: s.phone, email: s.email,
        address: s.address, lat: s.lat, lng: s.lng, notes: s.notes,
        repId: null, visitFrequency: s.freq,
        createdAt: u.daysAgoISO(120), _ts: 1
      };
      d.sites.push(site);

      var sitePoints = [];
      var siteSystems = [];
      s.systems.forEach(function (type) {
        var sys = { id: u.id(), siteId: site.id, type: type, name: d.templates[type].label, notes: '', products: [], _ts: 1 };
        if (type === 'boiler') {
          sys.products = [
            { productId: 'p-bwt100', dose: 'Feed to maintain 20–60 ppm sulphite', unit: 'gal', lowLevel: 15 },
            { productId: 'p-bwt250', dose: 'Feed to condensate header', unit: 'gal', lowLevel: 8 }
          ];
        } else if (type === 'cooling_tower') {
          sys.products = [
            { productId: 'p-cwt310', dose: 'Maintain 8–15 ppm PO₄', unit: 'gal', lowLevel: 10 },
            { productId: 'p-cwt450', dose: '2 tablets per feeder slot', unit: 'tubs', lowLevel: 2 }
          ];
        } else {
          sys.products = [{ productId: 'p-clt500', dose: 'Maintain 500–1000 ppm nitrite', unit: 'gal', lowLevel: 5 }];
        }
        d.systems.push(sys);
        siteSystems.push(sys);
        AA.util.clone(d.templates[type].samplePoints).forEach(function (tp) {
          var pt = { id: u.id(), systemId: sys.id, name: tp.name, tests: tp.tests, _ts: 1 };
          d.samplePoints.push(pt);
          sitePoints.push({ point: pt, type: type });
        });
      });

      for (var w = WEEKS - 1; w >= 0; w--) {
        var visit = {
          id: u.id(), siteId: site.id, date: u.daysAgoISO(w * 7 + s.offsetDays),
          rep: reps[(w + si) % reps.length], notes: '', readings: [], productLevels: [],
          createdAt: u.daysAgoISO(w * 7 + s.offsetDays), _ts: 1
        };
        sitePoints.forEach(function (sp) {
          var bases = demoBaseFor(sp.point.name, sp.type);
          if (!bases) return;
          sp.point.tests.forEach(function (t) {
            var b = bases[t.testId];
            if (!b) return;
            var def = d.testDefs.find(function (td) { return td.id === t.testId; });
            var val = b[0] + (Math.random() * 2 - 1) * b[1];
            var comment = '';

            /* deliberate story lines so flags/trends show up in the demo */
            if (s.name === 'Riverside Hospital' && sp.point.name === 'Boiler Water' && t.testId === 'sulphite' && w === 0) {
              val = 12; comment = 'Chemical feed pump found air-locked — re-primed on site. Recheck next visit.';
            }
            if (s.name === 'Riverside Hospital' && sp.point.name === 'Recirculating Water' && t.testId === 'free_cl' && w <= 2) {
              val = [0.2, 0.31, 0.4][w]; comment = w === 0 ? 'Bromine feeder empty and biocide stock nearly out — reorder placed.' : (w === 2 ? 'Residual trending down — check feeder.' : '');
            }
            if (s.name === 'Riverside Hospital' && sp.point.name === 'Recirculating Water' && t.testId === 'dip_slide' && w === 5) {
              val = 100000; comment = 'Elevated count after feeder outage — shock dosed non-oxidizer.';
            }
            if (s.name === 'Maplewood Foods Plant' && sp.point.name === 'Condensate' && t.testId === 'iron' && w <= 1) {
              val = 0.22 + 0.06 * (1 - w); comment = w === 0 ? 'Rising iron — suspect corrosion in east return line. Recommend amine feed increase (see notes).' : '';
            }
            if (s.name === 'Lakeside Office Tower' && sp.point.name === 'Recirculating Water' && t.testId === 'cond' && w === 2) {
              val = 2900; comment = 'Blowdown valve found nearly closed; reopened and verified controller setpoint.';
            }

            val = Math.max(0, round(val, def ? def.decimals : 1));
            visit.readings.push({ samplePointId: sp.point.id, testId: t.testId, value: val, comment: comment });
          });
        });

        /* product level readings (drum inventory) */
        var elapsed = WEEKS - 1 - w;
        siteSystems.forEach(function (sys) {
          (sys.products || []).forEach(function (ap) {
            var lvl = null;
            if (ap.productId === 'p-bwt100') lvl = levelAt(elapsed, 55, 3, 18);
            if (ap.productId === 'p-bwt250') lvl = levelAt(elapsed, 30, 1.5, 9);
            if (ap.productId === 'p-cwt310') lvl = levelAt(elapsed, 42, 2, 12);
            if (ap.productId === 'p-cwt450' && s.name === 'Riverside Hospital') lvl = Math.max(1, 15 - elapsed); /* never refilled — runs low */
            if (ap.productId === 'p-cwt450' && s.name !== 'Riverside Hospital') lvl = levelAt(elapsed, 12, 0.7, 3);
            if (ap.productId === 'p-clt500') lvl = levelAt(elapsed, 20, 0.5, 6);
            if (lvl != null) visit.productLevels.push({ systemId: sys.id, productId: ap.productId, level: lvl });
          });
        });

        if (s.name === 'Maplewood Foods Plant' && w === 0) {
          visit.notes = 'Condensate iron trending up over the last month. Recommend increasing BWT-250 feed rate by 15% and re-testing in one week. All other parameters within program limits.';
        }
        if (s.name === 'Riverside Hospital' && w === 0) {
          visit.notes = 'Free halogen below target for three consecutive visits (feeder outage) — biocide reordered, PO raised with plant engineering. Sulphite low this visit after feed pump air-lock; corrected on site.';
        }
        d.visits.push(visit);
      }
    });

    return d;
  }

  return { blank: blank, demoData: demoData, CLOSED_LOOP: CLOSED_LOOP };
})();
