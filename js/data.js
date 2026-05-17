// ===== Data Loader & Processing =====

const HBCUData = (() => {
  let schools = [];
  let stateAverages = {};
  let nationalAverages = {};

  const METRICS = {
    median_income: {
      label: 'Median Household Income',
      short: 'Income',
      format: v => '$' + v.toLocaleString(),
      unit: '$',
      color: '#b39ddb',
      min: 20000,
      max: 120000
    },
    pct_bachelors: {
      label: "Educational Attainment (% Bachelor's+)",
      short: "Bachelor's+",
      format: v => v.toFixed(1) + '%',
      unit: '%',
      color: '#42a5f5',
      min: 0,
      max: 65
    },
    pct_hs_completion: {
      label: 'High School Completion Rate (%)',
      short: 'HS Completion',
      format: v => v.toFixed(1) + '%',
      unit: '%',
      color: '#26c6da',
      min: 60,
      max: 100
    },
    pct_broadband: {
      label: 'Broadband Access (%)',
      short: 'Broadband',
      format: v => v.toFixed(1) + '%',
      unit: '%',
      color: '#5c9bd4',
      min: 50,
      max: 95
    },
    pct_uninsured: {
      label: 'Uninsured Rate (%)',
      short: 'Uninsured',
      format: v => v.toFixed(1) + '%',
      unit: '%',
      color: '#ef5350',
      min: 0,
      max: 25,
      invert: true
    },
    pct_poverty: {
      label: 'Poverty Rate (%)',
      short: 'Poverty',
      format: v => v.toFixed(1) + '%',
      unit: '%',
      color: '#ff7043',
      min: 0,
      max: 40,
      invert: true
    },
    pct_employment: {
      label: 'Employment Rate (%)',
      short: 'Employment',
      format: v => v.toFixed(1) + '%',
      unit: '%',
      color: '#66bb6a',
      min: 85,
      max: 100
    }
  };

  async function load() {
    const res = await fetch('data/hbcu_schools.json');
    schools = await res.json();
    computeAverages();
    return schools;
  }

  function computeAverages() {
    const metricKeys = Object.keys(METRICS);

    // National averages
    nationalAverages = {};
    metricKeys.forEach(key => {
      const values = schools.map(s => s[key]).filter(v => v != null);
      nationalAverages[key] = values.reduce((a, b) => a + b, 0) / values.length;
    });

    // State averages
    stateAverages = {};
    const byState = {};
    schools.forEach(s => {
      if (!byState[s.state]) byState[s.state] = [];
      byState[s.state].push(s);
    });

    Object.entries(byState).forEach(([state, stateSchools]) => {
      stateAverages[state] = { count: stateSchools.length };
      metricKeys.forEach(key => {
        const values = stateSchools.map(s => s[key]).filter(v => v != null);
        stateAverages[state][key] = values.reduce((a, b) => a + b, 0) / values.length;
      });
    });
  }

  function getSchools() { return schools; }
  function getStates() { return [...new Set(schools.map(s => s.state))].sort(); }
  function getStateAverages() { return stateAverages; }
  function getNationalAverages() { return nationalAverages; }
  function getMetrics() { return METRICS; }

  function filterSchools({ state, search, metricKey, threshold, thresholdDir }) {
    let filtered = [...schools];

    if (state && state !== 'all') {
      filtered = filtered.filter(s => s.state === state);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q)
      );
    }

    if (metricKey && threshold != null && thresholdDir) {
      if (thresholdDir === 'below') {
        filtered = filtered.filter(s => s[metricKey] <= threshold);
      } else {
        filtered = filtered.filter(s => s[metricKey] >= threshold);
      }
    }

    return filtered;
  }

  // Normalize a metric value to 0-100 scale for radar chart
  function normalize(metricKey, value) {
    if (value == null) return 50;
    const m = METRICS[metricKey];
    let norm = ((value - m.min) / (m.max - m.min)) * 100;
    if (m.invert) norm = 100 - norm;
    return Math.max(0, Math.min(100, norm));
  }

  return { load, getSchools, getStates, getStateAverages, getNationalAverages, getMetrics, filterSchools, normalize, METRICS };
})();
