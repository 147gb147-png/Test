/*
 * AquaTrack — default catalog: tests, system templates, products, demo data.
 * Everything here is a STARTING POINT — all of it is editable in Settings.
 * Control limits are typical industrial water treatment guidelines (ASME-style
 * boiler limits for <300 psi firetube boilers, common open recirculating
 * cooling guidelines). Always tailor them per site in Settings / per sample point.
 */
window.AA = window.AA || {};

AA.defaults = (function () {

  /* ------------------------------------------------------------ test catalog */
  var TESTS = [
    { id: 'ph',        name: 'pH',                        unit: '',            decimals: 2, defaultMin: null, defaultMax: null, description: 'Acidity / alkalinity (0–14).' },
    { id: 'cond',      name: 'Conductivity',              unit: 'µS/cm',       decimals: 0, defaultMin: null, defaultMax: null, description: 'Proxy for total dissolved solids.' },
    { id: 'tds',       name: 'Total Dissolved Solids',    unit: 'ppm',         decimals: 0, defaultMin: null, defaultMax: null, description: 'Dissolved solids, measured or from conductivity.' },
    { id: 'p_alk',     name: 'P-Alkalinity',              unit: 'ppm CaCO₃',   decimals: 0, defaultMin: null, defaultMax: null, description: 'Phenolphthalein alkalinity.' },
    { id: 'm_alk',     name: 'M-Alkalinity (Total)',      unit: 'ppm CaCO₃',   decimals: 0, defaultMin: null, defaultMax: null, description: 'Methyl orange / total alkalinity.' },
    { id: 'oh_alk',    name: 'OH-Alkalinity',             unit: 'ppm CaCO₃',   decimals: 0, defaultMin: null, defaultMax: null, description: 'Hydroxide alkalinity (2P − M).' },
    { id: 't_hard',    name: 'Total Hardness',            unit: 'ppm CaCO₃',   decimals: 1, defaultMin: null, defaultMax: null, description: 'Calcium + magnesium hardness.' },
    { id: 'ca_hard',   name: 'Calcium Hardness',          unit: 'ppm CaCO₃',   decimals: 0, defaultMin: null, defaultMax: null, description: 'Calcium fraction of hardness.' },
    { id: 'chloride',  name: 'Chloride',                  unit: 'ppm Cl⁻',     decimals: 0, defaultMin: null, defaultMax: null, description: 'Often used to calculate cycles of concentration.' },
    { id: 'sulphite',  name: 'Sulphite',                  unit: 'ppm SO₃²⁻',   decimals: 0, defaultMin: 20,   defaultMax: 60,   description: 'Oxygen scavenger residual (boiler water).' },
    { id: 'phosphate', name: 'Phosphate',                 unit: 'ppm PO₄³⁻',   decimals: 1, defaultMin: null, defaultMax: null, description: 'Scale inhibitor / internal treatment residual.' },
    { id: 'silica',    name: 'Silica',                    unit: 'ppm SiO₂',    decimals: 1, defaultMin: null, defaultMax: 150,  description: 'Silica scale risk indicator.' },
    { id: 'iron',      name: 'Iron',                      unit: 'ppm Fe',      decimals: 2, defaultMin: null, defaultMax: 1,    description: 'Corrosion product indicator.' },
    { id: 'copper',    name: 'Copper',                    unit: 'ppm Cu',      decimals: 2, defaultMin: null, defaultMax: 0.05, description: 'Corrosion product indicator (condensate / closed loops).' },
    { id: 'free_cl',   name: 'Free Chlorine',             unit: 'ppm Cl₂',     decimals: 2, defaultMin: null, defaultMax: null, description: 'Free oxidizing biocide residual.' },
    { id: 'total_cl',  name: 'Total Chlorine',            unit: 'ppm Cl₂',     decimals: 2, defaultMin: null, defaultMax: null, description: 'Total oxidizing biocide residual.' },
    { id: 'bromine',   name: 'Bromine',                   unit: 'ppm Br₂',     decimals: 2, defaultMin: null, defaultMax: null, description: 'Bromine biocide residual.' },
    { id: 'orp',       name: 'ORP',                       unit: 'mV',          decimals: 0, defaultMin: null, defaultMax: null, description: 'Oxidation-reduction potential (biocide effectiveness).' },
    { id: 'cycles',    name: 'Cycles of Concentration',   unit: 'cycles',      decimals: 1, defaultMin: null, defaultMax: null, description: 'System concentration vs. makeup (e.g. Cl⁻ ratio).' },
    { id: 'temp',      name: 'Temperature',               unit: '°C',          decimals: 1, defaultMin: null, defaultMax: null, description: 'Water temperature at the sample point.' },
    { id: 'turbidity', name: 'Turbidity',                 unit: 'NTU',         decimals: 1, defaultMin: null, defaultMax: null, description: 'Suspended solids / clarity.' },
    { id: 'azole',     name: 'Azole',                     unit: 'ppm',         decimals: 1, defaultMin: null, defaultMax: null, description: 'Yellow-metal corrosion inhibitor residual.' },
    { id: 'molybdate', name: 'Molybdate',                 unit: 'ppm Mo',      decimals: 1, defaultMin: null, defaultMax: null, description: 'Tracer / corrosion inhibitor residual.' },
    { id: 'nitrite',   name: 'Nitrite',                   unit: 'ppm NO₂⁻',    decimals: 0, defaultMin: null, defaultMax: null, description: 'Closed-loop corrosion inhibitor residual.' },
    { id: 'glycol',    name: 'Glycol',                    unit: '%',           decimals: 1, defaultMin: null, defaultMax: null, description: 'Freeze protection concentration (closed loops).' },
    { id: 'dip_slide', name: 'Dip Slide (Aerobic Count)', unit: 'CFU/mL',      decimals: 0, defaultMin: null, defaultMax: 10000, description: 'Microbiological activity (48 h incubation).' }
  ];

  /* ------------------------------------------------- system-type templates
   * When a system is created these sample points (and their tests + expected
   * ranges) are copied onto it. min/max null = inherit the test's default. */
  var TEMPLATES = {
    boiler: {
      label: 'Boiler System',
      samplePoints: [
        {
          name: 'Makeup Water',
          tests: [
            { testId: 'ph',       min: 6.5,  max: 8.5 },
            { testId: 'cond',     min: null, max: null },
            { testId: 't_hard',   min: null, max: 1 },
            { testId: 'm_alk',    min: null, max: null },
            { testId: 'chloride', min: null, max: null },
            { testId: 'iron',     min: null, max: 0.3 }
          ]
        },
        {
          name: 'Feedwater',
          tests: [
            { testId: 'ph',     min: 8.3,  max: 10 },
            { testId: 'cond',   min: null, max: null },
            { testId: 't_hard', min: null, max: 1 },
            { testId: 'iron',   min: null, max: 0.1 }
          ]
        },
        {
          name: 'Boiler Water',
          tests: [
            { testId: 'ph',        min: 10.5, max: 12 },
            { testId: 'cond',      min: 1000, max: 3500 },
            { testId: 'tds',       min: null, max: 3500 },
            { testId: 'p_alk',     min: 200,  max: 700 },
            { testId: 'm_alk',     min: null, max: 900 },
            { testId: 'oh_alk',    min: 200,  max: 600 },
            { testId: 'sulphite',  min: 20,   max: 60 },
            { testId: 'phosphate', min: 30,   max: 60 },
            { testId: 'chloride',  min: null, max: 300 },
            { testId: 't_hard',    min: null, max: 1 },
            { testId: 'silica',    min: null, max: 150 },
            { testId: 'iron',      min: null, max: 1 }
          ]
        },
        {
          name: 'Condensate',
          tests: [
            { testId: 'ph',     min: 7.5,  max: 9 },
            { testId: 'cond',   min: null, max: 40 },
            { testId: 't_hard', min: null, max: 1 },
            { testId: 'iron',   min: null, max: 0.1 },
            { testId: 'copper', min: null, max: 0.05 }
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
            { testId: 'ph',       min: 6.5,  max: 8.5 },
            { testId: 'cond',     min: null, max: null },
            { testId: 't_hard',   min: null, max: null },
            { testId: 'ca_hard',  min: null, max: null },
            { testId: 'm_alk',    min: null, max: null },
            { testId: 'chloride', min: null, max: null },
            { testId: 'silica',   min: null, max: null },
            { testId: 'iron',     min: null, max: 0.3 }
          ]
        },
        {
          name: 'Recirculating Water',
          tests: [
            { testId: 'ph',        min: 7.5,  max: 9 },
            { testId: 'cond',      min: null, max: 2500 },
            { testId: 't_hard',    min: null, max: null },
            { testId: 'ca_hard',   min: null, max: 600 },
            { testId: 'm_alk',     min: 100,  max: 500 },
            { testId: 'chloride',  min: null, max: null },
            { testId: 'cycles',    min: 3,    max: 8 },
            { testId: 'free_cl',   min: 0.5,  max: 1 },
            { testId: 'orp',       min: 400,  max: 650 },
            { testId: 'phosphate', min: 8,    max: 15 },
            { testId: 'azole',     min: 1,    max: 3 },
            { testId: 'iron',      min: null, max: 1 },
            { testId: 'silica',    min: null, max: 150 },
            { testId: 'temp',      min: null, max: null },
            { testId: 'dip_slide', min: null, max: 10000 }
          ]
        }
      ]
    }
  };

  /* ------------------------------------------------------------- products */
  var PRODUCTS = [
    { id: 'p-bwt100', name: 'BWT-100 Boiler Internal Treatment', description: 'Catalyzed sulphite oxygen scavenger with polymeric sludge conditioner.', dose: 'Maintain 20–60 ppm sulphite in boiler water', notes: 'Example product — replace with your own line in Settings → Products.' },
    { id: 'p-bwt250', name: 'BWT-250 Condensate Treatment', description: 'Neutralizing amine blend for condensate line protection.', dose: 'Maintain condensate pH 7.5–9.0', notes: 'Example product.' },
    { id: 'p-cwt310', name: 'CWT-310 Cooling Water Inhibitor', description: 'Phosphate / azole scale and corrosion inhibitor for open recirculating systems.', dose: 'Maintain 8–15 ppm PO₄ in recirculating water', notes: 'Example product.' },
    { id: 'p-cwt450', name: 'CWT-450 Oxidizing Biocide', description: 'Slow-release bromine tablets for microbiological control.', dose: 'Maintain 0.5–1.0 ppm free halogen', notes: 'Example product.' }
  ];

  function blank() {
    return {
      version: 1,
      settings: { companyName: '', defaultRep: '' },
      testDefs: AA.util.clone(TESTS),
      templates: AA.util.clone(TEMPLATES),
      products: AA.util.clone(PRODUCTS),
      sites: [],
      systems: [],
      samplePoints: [],
      visits: []
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
    'Recirculating Water':  { ph: [8.5, 0.25], cond: [1750, 280], t_hard: [640, 90], ca_hard: [420, 70], m_alk: [320, 60], chloride: [210, 40], cycles: [5.2, 1.0], free_cl: [0.72, 0.16], orp: [520, 55], phosphate: [11.5, 2.0], azole: [2.1, 0.5], iron: [0.4, 0.2], silica: [92, 20], temp: [27, 3], dip_slide: [1000, 900] }
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

  /*
   * Build a full demo dataset: 3 sites (with coordinates so the map works
   * immediately), boiler + cooling systems, and ~10 weekly visits per site
   * including a few deliberately out-of-range results and comments.
   */
  function demoData() {
    var d = blank();
    var u = AA.util;
    d.settings.companyName = 'ClearFlow Water Services (demo)';
    d.settings.defaultRep = 'A. Rivera';

    var sites = [
      { name: 'Riverside Hospital', contact: 'M. Okafor (Chief Engineer)', phone: '(614) 555-0142', email: 'engineering@riversidehosp.example', address: { line1: '1200 River Rd', city: 'Columbus', region: 'OH', postal: '43215', country: 'USA' }, lat: 39.9702, lng: -83.0150, notes: 'Access via loading dock B. Boiler room badge required.', systems: ['boiler', 'cooling_tower'] },
      { name: 'Maplewood Foods Plant', contact: 'S. Grant (Maintenance Lead)', phone: '(216) 555-0187', email: 'maintenance@maplewoodfoods.example', address: { line1: '450 Industrial Pkwy', city: 'Cleveland', region: 'OH', postal: '44113', country: 'USA' }, lat: 41.4820, lng: -81.7040, notes: 'Steam used for process cooking — condensate quality critical.', systems: ['boiler'] },
      { name: 'Lakeside Office Tower', contact: 'D. Kim (Property Manager)', phone: '(312) 555-0116', email: 'ops@lakesidetower.example', address: { line1: '233 W Lake St', city: 'Chicago', region: 'IL', postal: '60606', country: 'USA' }, lat: 41.8858, lng: -87.6355, notes: 'Two-cell tower on roof; seasonal shutdown Nov–Mar.', systems: ['cooling_tower'] }
    ];

    var reps = ['A. Rivera', 'J. Chen'];

    sites.forEach(function (s, si) {
      var site = {
        id: u.id(), name: s.name, contact: s.contact, phone: s.phone, email: s.email,
        address: s.address, lat: s.lat, lng: s.lng, notes: s.notes, createdAt: u.daysAgoISO(90)
      };
      d.sites.push(site);

      var sitePoints = [];
      s.systems.forEach(function (type) {
        var sys = { id: u.id(), siteId: site.id, type: type, name: d.templates[type].label, notes: '', products: [] };
        if (type === 'boiler') sys.products = [{ productId: 'p-bwt100', dose: 'Feed to maintain 20–60 ppm sulphite' }, { productId: 'p-bwt250', dose: 'Feed to condensate header' }];
        else sys.products = [{ productId: 'p-cwt310', dose: 'Maintain 8–15 ppm PO₄' }, { productId: 'p-cwt450', dose: '1 tablet per feeder slot' }];
        d.systems.push(sys);
        AA.util.clone(d.templates[type].samplePoints).forEach(function (tp) {
          var pt = { id: u.id(), systemId: sys.id, name: tp.name, tests: tp.tests };
          d.samplePoints.push(pt);
          sitePoints.push({ point: pt, type: type });
        });
      });

      /* ~10 weekly visits */
      for (var w = 9; w >= 0; w--) {
        var visit = {
          id: u.id(), siteId: site.id, date: u.daysAgoISO(w * 7 + si),
          rep: reps[(w + si) % reps.length], notes: '', readings: [], createdAt: u.daysAgoISO(w * 7 + si)
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
            if (s.name === 'Riverside Hospital' && sp.point.name === 'Recirculating Water' && t.testId === 'free_cl' && w === 0) {
              val = 0.2; comment = 'Bromine feeder empty. Refilled; residual should recover within 24 h.';
            }
            if (s.name === 'Riverside Hospital' && sp.point.name === 'Recirculating Water' && t.testId === 'dip_slide' && w === 4) {
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
        if (s.name === 'Maplewood Foods Plant' && w === 0) {
          visit.notes = 'Condensate iron trending up over the last month. Recommend increasing BWT-250 feed rate by 15% and re-testing in one week. All other parameters within program limits.';
        }
        d.visits.push(visit);
      }
    });

    return d;
  }

  return { blank: blank, demoData: demoData, TEMPLATE_TYPES: ['boiler', 'cooling_tower'] };
})();
