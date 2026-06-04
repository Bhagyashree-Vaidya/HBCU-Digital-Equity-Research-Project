// ===== PDF Fact Sheet Export =====

const HBCUExport = (() => {
  function buildFactSheetHTML(title, subtitle, summaryCards, tableRows) {
    const cardsHTML = summaryCards.map(c =>
      `<div class="fs-card"><div class="fs-val">${c.value}</div><div class="fs-lbl">${c.label}</div></div>`
    ).join('');

    const headerRow = `<tr><th>School</th><th>City</th><th>Income</th><th>Bachelor's+</th><th>HS Comp</th><th>Broadband</th><th>Uninsured</th><th>Poverty</th><th>Employment</th></tr>`;
    const bodyRows = tableRows.map(r =>
      `<tr><td>${r.name}</td><td>${r.city}</td><td>${r.income}</td><td>${r.bachelors}</td><td>${r.hs}</td><td>${r.broadband}</td><td>${r.uninsured}</td><td>${r.poverty}</td><td>${r.employment}</td></tr>`
    ).join('');

    return `
      <div class="fact-sheet" id="fact-sheet-render">
        <h1>HBCU Digital Equity Fact Sheet</h1>
        <h2>${title} | ${subtitle}</h2>
        <div class="fs-grid">${cardsHTML}</div>
        <table class="fs-table">${headerRow}${bodyRows}</table>
        <div class="fs-footer">
          Source: U.S. Census Bureau, ACS 5-Year Estimates (2022) | HBCU Library Alliance<br>
          Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    `;
  }

  function getSchoolRow(s) {
    const m = HBCUData.METRICS;
    const fmt = (key) => s[key] != null ? m[key].format(s[key]) : 'N/A';
    return {
      name: s.name,
      city: `${s.city}, ${s.state}`,
      income: fmt('median_income'),
      bachelors: fmt('pct_bachelors'),
      hs: fmt('pct_hs_completion'),
      broadband: fmt('pct_broadband'),
      uninsured: fmt('pct_uninsured'),
      poverty: fmt('pct_poverty'),
      employment: fmt('pct_employment')
    };
  }

  function getSummaryCards(schools) {
    const n = schools.length;
    const avg = (key) => {
      const valid = schools.filter(sc => sc[key] != null);
      return valid.length ? valid.reduce((s, sc) => s + sc[key], 0) / valid.length : null;
    };
    const m = HBCUData.METRICS;
    const fmtAvg = (key) => { const v = avg(key); return v != null ? m[key].format(key === 'median_income' ? Math.round(v) : v) : 'N/A'; };
    return [
      { value: n.toString(), label: 'Schools' },
      { value: fmtAvg('median_income'), label: 'Avg Income' },
      { value: fmtAvg('pct_bachelors'), label: "Avg Bachelor's+" },
      { value: fmtAvg('pct_broadband'), label: 'Avg Broadband' },
      { value: fmtAvg('pct_hs_completion'), label: 'Avg HS Completion' },
      { value: fmtAvg('pct_uninsured'), label: 'Avg Uninsured' },
      { value: fmtAvg('pct_poverty'), label: 'Avg Poverty' },
      { value: fmtAvg('pct_employment'), label: 'Avg Employment' }
    ];
  }

  async function exportPDF(schools, title, subtitle) {
    const tableRows = schools.map(getSchoolRow);
    const summaryCards = getSummaryCards(schools);
    const html = buildFactSheetHTML(title, subtitle, summaryCards, tableRows);

    let container = document.getElementById('fact-sheet-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fact-sheet-container';
      document.body.appendChild(container);
    }
    container.innerHTML = html;

    const el = document.getElementById('fact-sheet-render');

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const { jsPDF } = window.jspdf;
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let pdf;
      if (imgHeight > 297) {
        pdf = new jsPDF('p', 'mm', [imgWidth, imgHeight + 20]);
      } else {
        pdf = new jsPDF('p', 'mm', 'a4');
      }

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);

      const filename = title.replace(/[^a-zA-Z0-9]/g, '_') + '_Fact_Sheet.pdf';
      pdf.save(filename);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      container.innerHTML = '';
    }
  }

  function exportCurrentView() {
    const stateSelect = document.getElementById('state-select');
    const state = stateSelect ? stateSelect.value : 'all';

    let schools, title, subtitle;

    if (state && state !== 'all') {
      schools = HBCUData.filterSchools({ state });
      title = state;
      subtitle = schools.length + ' HBCU Schools';
    } else {
      schools = HBCUData.getSchools();
      title = 'All States';
      subtitle = '103 HBCU Member Schools';
    }

    exportPDF(schools, title, subtitle);
  }

  return { exportPDF, exportCurrentView };
})();
