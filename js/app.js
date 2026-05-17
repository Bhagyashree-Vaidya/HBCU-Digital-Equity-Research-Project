// ===== App Controller =====

const App = (() => {
  let currentMetric = 'median_income';
  let currentState = 'all';
  let currentSearch = '';
  let currentView = 'map'; // 'map' or 'compare'
  let selectedSchool = null;

  async function init() {
    await HBCUData.load();
    HBCUMap.init('map');
    HBCUMap.setSchoolClickHandler(selectSchool);

    setupControls();
    setupTabs();
    setupViewToggle();

    refresh();
    updateStats(HBCUData.getSchools());
  }

  // ===== Controls =====
  function setupControls() {
    // Metric selector
    const metricSelect = document.getElementById('metric-select');
    const metrics = HBCUData.getMetrics();
    Object.entries(metrics).forEach(([key, m]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = m.label;
      metricSelect.appendChild(opt);
    });
    metricSelect.addEventListener('change', (e) => {
      currentMetric = e.target.value;
      refresh();
    });

    // State filter
    const stateSelect = document.getElementById('state-select');
    HBCUData.getStates().forEach(state => {
      const opt = document.createElement('option');
      opt.value = state;
      opt.textContent = state;
      stateSelect.appendChild(opt);
    });
    stateSelect.addEventListener('change', (e) => {
      currentState = e.target.value;
      refresh();
      if (currentState !== 'all') {
        const schools = HBCUData.filterSchools({ state: currentState });
        if (schools.length > 0) {
          const avgLat = schools.reduce((s, sc) => s + sc.lat, 0) / schools.length;
          const avgLng = schools.reduce((s, sc) => s + sc.lng, 0) / schools.length;
          HBCUMap.flyTo(avgLat, avgLng, 7);
        }
      } else {
        HBCUMap.resetView();
      }
    });

    // Search
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSearch = e.target.value;
        refresh();
      }, 200);
    });

    // Threshold slider
    const slider = document.getElementById('threshold-slider');
    const sliderValue = document.getElementById('threshold-value');
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      sliderValue.textContent = val + '%';
      refresh();
    });

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => HBCUExport.exportCurrentView());
    }

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
      currentState = 'all';
      currentSearch = '';
      currentMetric = 'median_income';
      selectedSchool = null;

      metricSelect.value = 'median_income';
      stateSelect.value = 'all';
      searchInput.value = '';
      slider.value = 0;
      sliderValue.textContent = '0%';

      HBCUMap.resetView();
      HBCUMap.clearRadius();
      hideDetail();
      refresh();
    });
  }

  // ===== Tabs =====
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');

        if (btn.dataset.tab === 'tab-charts') {
          setTimeout(() => HBCUCharts.renderStateBar('state-bar-chart', currentMetric), 100);
        }
      });
    });
  }

  // ===== View Toggle =====
  function setupViewToggle() {
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;

        const mapEl = document.getElementById('map');
        const compEl = document.getElementById('comparison-view');

        if (currentView === 'map') {
          mapEl.style.display = 'block';
          compEl.classList.remove('active');
          setTimeout(() => HBCUMap.init && map.invalidateSize(), 100);
        } else {
          mapEl.style.display = 'none';
          compEl.classList.add('active');
          setTimeout(() => HBCUCharts.renderComparisonCharts(), 100);
        }
      });
    });
  }

  // ===== Refresh =====
  function refresh() {
    const slider = document.getElementById('threshold-slider');
    const thresholdPct = parseInt(slider.value);

    let filters = {
      state: currentState,
      search: currentSearch
    };

    // Apply threshold: filter schools below X percentile of current metric
    if (thresholdPct > 0) {
      const allSchools = HBCUData.filterSchools({ state: currentState, search: currentSearch });
      const values = allSchools.map(s => s[currentMetric]).sort((a, b) => a - b);
      const idx = Math.floor((thresholdPct / 100) * values.length);
      const threshold = values[idx] || values[0];
      const m = HBCUData.getMetrics()[currentMetric];
      if (m.invert) {
        filters.metricKey = currentMetric;
        filters.threshold = threshold;
        filters.thresholdDir = 'below';
      } else {
        filters.metricKey = currentMetric;
        filters.threshold = threshold;
        filters.thresholdDir = 'below';
      }
    }

    const filtered = HBCUData.filterSchools(filters);
    HBCUMap.plotSchools(filtered, currentMetric);
    renderSchoolList(filtered);
    updateStats(filtered);
    updateSchoolCount(filtered.length, HBCUData.getSchools().length);
  }

  // ===== School List =====
  function renderSchoolList(schools) {
    const list = document.getElementById('school-list');
    const m = HBCUData.getMetrics()[currentMetric];

    list.innerHTML = schools.map(s => `
      <li class="school-item ${selectedSchool && selectedSchool.id === s.id ? 'selected' : ''}"
          data-id="${s.id}">
        <div class="school-name">${s.name}</div>
        <div class="school-location">${s.city}, ${s.state}</div>
        <div class="school-metric" style="color:${m.color}">${m.short}: ${m.format(s[currentMetric])}</div>
      </li>
    `).join('');

    list.querySelectorAll('.school-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        const school = HBCUData.getSchools().find(s => s.id === id);
        if (school) {
          selectSchool(school);
          HBCUMap.highlightSchool(school);
        }
      });
    });
  }

  // ===== Select School =====
  function selectSchool(school) {
    selectedSchool = school;
    showDetail(school);

    // Highlight in list
    document.querySelectorAll('.school-item').forEach(item => {
      item.classList.toggle('selected', parseInt(item.dataset.id) === school.id);
    });
  }

  // ===== Detail Panel =====
  function showDetail(school) {
    const panel = document.getElementById('detail-panel');
    panel.classList.add('visible');

    document.getElementById('detail-name').textContent = school.name;
    document.getElementById('detail-location').textContent = `${school.city}, ${school.state}`;

    const metrics = HBCUData.getMetrics();
    const natAvg = HBCUData.getNationalAverages();
    const barsContainer = document.getElementById('metric-bars');

    barsContainer.innerHTML = Object.entries(metrics).map(([key, m]) => {
      const value = school[key];
      const avg = natAvg[key];
      if (value == null) return `
        <div class="metric-bar-item">
          <div class="metric-bar-label"><span>${m.short}</span><span style="color:var(--text-muted)">N/A</span></div>
          <div class="metric-bar-track"><div class="metric-bar-fill" style="width:0%"></div></div>
        </div>`;
      let pct = ((value - m.min) / (m.max - m.min)) * 100;
      pct = Math.max(0, Math.min(100, pct));

      const isWorse = m.invert ? value > avg : value < avg;
      const barColor = isWorse ? '#ef5350' : '#66bb6a';

      return `
        <div class="metric-bar-item">
          <div class="metric-bar-label">
            <span>${m.short}</span>
            <span style="color:${barColor}">${m.format(value)} <span style="color:var(--text-muted);font-weight:400;font-size:10px">(avg: ${m.format(avg)})</span></span>
          </div>
          <div class="metric-bar-track">
            <div class="metric-bar-fill" style="width:${pct}%;background:${barColor}"></div>
          </div>
        </div>
      `;
    }).join('');

    // Render radar
    setTimeout(() => HBCUCharts.renderRadar('radar-chart', school), 100);

    // Switch to detail tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-tab="tab-detail"]').classList.add('active');
    document.getElementById('tab-detail').classList.add('active');
  }

  function hideDetail() {
    document.getElementById('detail-panel').classList.remove('visible');
    selectedSchool = null;
  }

  // ===== Stats =====
  function updateStats(schools) {
    const n = schools.length;
    const ids = ['stat-income','stat-broadband','stat-education','stat-uninsured','stat-poverty','stat-hs','stat-employment'];
    if (n === 0) {
      ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '--'; });
      return;
    }

    const avg = (key) => {
      const valid = schools.filter(sc => sc[key] != null);
      return valid.length ? valid.reduce((s, sc) => s + sc[key], 0) / valid.length : null;
    };

    const set = (id, val, fmt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val != null ? fmt(val) : '--';
    };

    set('stat-income', avg('median_income'), v => '$' + Math.round(v).toLocaleString());
    set('stat-broadband', avg('pct_broadband'), v => v.toFixed(1) + '%');
    set('stat-education', avg('pct_bachelors'), v => v.toFixed(1) + '%');
    set('stat-uninsured', avg('pct_uninsured'), v => v.toFixed(1) + '%');
    set('stat-poverty', avg('pct_poverty'), v => v.toFixed(1) + '%');
    set('stat-hs', avg('pct_hs_completion'), v => v.toFixed(1) + '%');
    set('stat-employment', avg('pct_employment'), v => v.toFixed(1) + '%');
  }

  function updateSchoolCount(shown, total) {
    document.getElementById('school-count').innerHTML =
      `Showing <strong>${shown}</strong> of <strong>${total}</strong> schools`;
  }

  // Expose close detail for button
  window.closeDetail = hideDetail;

  return { init };
})();

// ===== Launch =====
document.addEventListener('DOMContentLoaded', App.init);
