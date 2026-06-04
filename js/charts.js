// ===== Charts Module (Chart.js) =====

const HBCUCharts = (() => {
  let radarChart = null;
  let stateBarChart = null;
  let compCharts = [];

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#e6edf3', font: { size: 11 } }
      }
    },
    scales: {
      x: {
        ticks: { color: '#8b949e', font: { size: 10 } },
        grid: { color: 'rgba(48,54,61,0.5)' }
      },
      y: {
        ticks: { color: '#8b949e', font: { size: 10 } },
        grid: { color: 'rgba(48,54,61,0.5)' }
      }
    }
  };

  // ===== Radar Chart for School Detail =====
  function renderRadar(canvasId, school) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (radarChart) radarChart.destroy();

    const metrics = HBCUData.getMetrics();
    const natAvg = HBCUData.getNationalAverages();
    const labels = Object.keys(metrics).map(k => metrics[k].short);

    const schoolValues = Object.keys(metrics).map(k => HBCUData.normalize(k, school[k]));
    const avgValues = Object.keys(metrics).map(k => HBCUData.normalize(k, natAvg[k]));

    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: school.name,
            data: schoolValues,
            borderColor: '#b39ddb',
            backgroundColor: 'rgba(132,94,194,0.15)',
            borderWidth: 2,
            pointBackgroundColor: '#b39ddb',
            pointRadius: 4
          },
          {
            label: 'HBCU Average',
            data: avgValues,
            borderColor: '#42a5f5',
            backgroundColor: 'rgba(66,165,245,0.08)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointBackgroundColor: '#42a5f5',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#e6edf3', font: { size: 10 }, boxWidth: 12 }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { display: false, stepSize: 25 },
            grid: { color: 'rgba(48,54,61,0.5)' },
            angleLines: { color: 'rgba(48,54,61,0.5)' },
            pointLabels: { color: '#8b949e', font: { size: 11 } }
          }
        }
      }
    });
  }

  // ===== State Bar Chart (sidebar) =====
  function renderStateBar(canvasId, metricKey) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (stateBarChart) stateBarChart.destroy();

    const stateAvg = HBCUData.getStateAverages();
    const m = HBCUData.getMetrics()[metricKey];

    const sorted = Object.entries(stateAvg)
      .sort((a, b) => b[1][metricKey] - a[1][metricKey]);

    const labels = sorted.map(([state]) => state);
    const values = sorted.map(([, data]) => data[metricKey]);
    const colors = values.map(v => {
      const norm = (v - m.min) / (m.max - m.min);
      if (m.invert) {
        return norm > 0.6 ? '#ef5350' : norm > 0.3 ? '#b39ddb' : '#66bb6a';
      }
      return norm > 0.6 ? '#66bb6a' : norm > 0.3 ? '#b39ddb' : '#ef5350';
    });

    stateBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: m.short,
          data: values,
          backgroundColor: colors,
          borderRadius: 4,
          barThickness: 14
        }]
      },
      options: {
        ...chartDefaults,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => m.format(item.raw)
            }
          }
        },
        scales: {
          x: {
            ...chartDefaults.scales.x,
            ticks: {
              ...chartDefaults.scales.x.ticks,
              callback: v => metricKey === 'median_income' ? '$' + (v/1000) + 'k' : v + m.unit
            }
          },
          y: chartDefaults.scales.y
        }
      }
    });
  }

  // ===== Comparison View Charts =====
  function renderComparisonCharts() {
    compCharts.forEach(c => c.destroy());
    compCharts = [];

    const stateAvg = HBCUData.getStateAverages();
    const sorted = Object.entries(stateAvg).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sorted.map(([s]) => s);

    renderCompChart('comp-income-chart', labels, sorted, 'median_income',
      'Median Household Income', v => '$' + (v/1000).toFixed(0) + 'k', '#b39ddb');

    renderCompChart('comp-broadband-chart', labels, sorted, 'pct_broadband',
      'Broadband Access (%)', v => v.toFixed(0) + '%', '#5c9bd4');

    renderCompChart('comp-education-chart', labels, sorted, 'pct_bachelors',
      "Bachelor's Degree+ (%)", v => v.toFixed(0) + '%', '#42a5f5');

    renderCompChart('comp-health-chart', labels, sorted, 'pct_uninsured',
      'Uninsured Rate (%)', v => v.toFixed(0) + '%', '#ef5350');

    renderCompChart('comp-poverty-chart', labels, sorted, 'pct_poverty',
      'Poverty Rate (%)', v => v.toFixed(0) + '%', '#ff7043');

    renderCompChart('comp-hs-chart', labels, sorted, 'pct_hs_completion',
      'HS Completion Rate (%)', v => v.toFixed(0) + '%', '#26c6da');

    renderCompChart('comp-employment-chart', labels, sorted, 'pct_employment',
      'Employment Rate (%)', v => v.toFixed(0) + '%', '#66bb6a');
  }

  function renderCompChart(canvasId, labels, sorted, metricKey, title, tickFmt, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const values = sorted.map(([, d]) => d[metricKey]);
    const natAvg = HBCUData.getNationalAverages()[metricKey];

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: title,
            data: values,
            backgroundColor: color + '99',
            borderColor: color,
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => tickFmt(item.raw),
              afterLabel: (item) => {
                const count = sorted[item.dataIndex][1].count;
                return count + ' school' + (count > 1 ? 's' : '');
              }
            }
          },
          annotation: {
            annotations: {
              avgLine: {
                type: 'line',
                yMin: natAvg,
                yMax: natAvg,
                borderColor: '#fff',
                borderWidth: 1,
                borderDash: [4, 4],
                label: {
                  display: true,
                  content: 'Avg: ' + tickFmt(natAvg),
                  position: 'start',
                  color: '#fff',
                  font: { size: 10 }
                }
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#8b949e', font: { size: 9 }, maxRotation: 45 },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: '#8b949e',
              font: { size: 10 },
              callback: tickFmt
            },
            grid: { color: 'rgba(48,54,61,0.5)' }
          }
        }
      }
    });
    compCharts.push(chart);
  }

  // ===== School-to-School Comparison Radar =====
  let compareRadarChart = null;
  const COMPARE_COLORS = ['#b39ddb', '#42a5f5', '#66bb6a', '#ff7043', '#ef5350', '#fdd835', '#26c6da', '#ec407a'];

  function renderCompareRadar(canvasId, schools) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (compareRadarChart) compareRadarChart.destroy();

    const metrics = HBCUData.getMetrics();
    const labels = Object.keys(metrics).map(k => metrics[k].short);

    const datasets = schools.map((school, i) => {
      const values = Object.keys(metrics).map(k => HBCUData.normalize(k, school[k]));
      const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
      return {
        label: school.name.split(' ').slice(0, 3).join(' '),
        data: values,
        borderColor: color,
        backgroundColor: color + '15',
        borderWidth: 2,
        pointBackgroundColor: color,
        pointRadius: 3
      };
    });

    compareRadarChart = new Chart(ctx, {
      type: 'radar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#e6edf3', font: { size: 9 }, boxWidth: 10 }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { display: false, stepSize: 25 },
            grid: { color: 'rgba(48,54,61,0.5)' },
            angleLines: { color: 'rgba(48,54,61,0.5)' },
            pointLabels: { color: '#8b949e', font: { size: 10 } }
          }
        }
      }
    });
  }

  return { renderRadar, renderStateBar, renderComparisonCharts, renderCompareRadar };
})();
