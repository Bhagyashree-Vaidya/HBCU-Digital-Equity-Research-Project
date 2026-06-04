# HBCU Digital Equity Dashboard - Developer Playbook

> Technical documentation for maintaining and extending the dashboard.
> Created by Bhagyashree Vaidya (UW) for the HBCU Library Alliance.

---

## Architecture Overview

This is a **vanilla HTML/CSS/JavaScript** dashboard with no build tools or frameworks.
It runs as a static site — just open `index.html` or serve with any HTTP server.

```
Tracie Hall/
  index.html          # Main page — loads all CSS/JS, defines layout
  css/style.css        # All styles (dark theme, responsive, print)
  js/
    data.js            # Data loader — fetches JSON, computes averages, filtering
    map.js             # Leaflet map — markers, popups, legend, color scales
    charts.js          # Chart.js — radar charts, state bar charts, comparisons
    export.js          # PDF fact sheet export (html2canvas + jsPDF)
    app.js             # App controller — wires everything together
  data/
    hbcu_schools.json  # 103 schools with Census ACS metrics (THE data file)
  fetch_census.py      # One-time script to refresh data from Census API
```

### Key Libraries (loaded via CDN)
- **Leaflet 1.9.4** — Interactive map with CARTO dark tiles
- **Chart.js 4.4.1** — Radar and bar charts
- **html2canvas 1.4.1** — Screenshot DOM elements for PDF
- **jsPDF 2.5.1** — Generate downloadable PDFs

---

## Data Pipeline

### Where the data comes from
All metrics come from the **U.S. Census Bureau American Community Survey (ACS) 5-Year Estimates (2022)**.
Each school's data is based on its **county** (identified by FIPS codes in the JSON).

### The 7 metrics
| Key | ACS Tables | Description |
|-----|-----------|-------------|
| `median_income` | B19013 | Median household income ($) |
| `pct_bachelors` | B15003 | % with bachelor's degree or higher |
| `pct_hs_completion` | B15003 | % with high school diploma or higher |
| `pct_broadband` | B28002 | % with internet subscription |
| `pct_uninsured` | B27010 | % without health insurance |
| `pct_poverty` | B17001 | % below federal poverty line |
| `pct_employment` | B23025 | % employed in civilian labor force |

### Refreshing data
1. Get a free Census API key: https://api.census.gov/data/key_signup.html
2. Run: `python3 fetch_census.py --key YOUR_API_KEY`
3. This overwrites `data/hbcu_schools.json` with fresh values
4. Commit and push — Vercel auto-deploys

**Note:** The U.S. Virgin Islands (FIPS 78) is not in ACS data. That school will show "N/A" for metrics.

---

## How Each File Works

### `data.js` — Data Module (`HBCUData`)
- `load()` — Fetches `data/hbcu_schools.json`, computes national and state averages
- `METRICS` object — Defines each metric's label, format function, color, min/max range, and whether it's inverted (lower = better)
- `filterSchools({state, search, metricKey, threshold, thresholdDir})` — Filters school list
- `normalize(metricKey, value)` — Converts raw value to 0-100 scale for radar charts (respects invert)
- `getSchools()`, `getStates()`, `getStateAverages()`, `getNationalAverages()` — Accessors

### `map.js` — Map Module (`HBCUMap`)
- `init(containerId)` — Creates Leaflet map with dark tiles
- `plotSchools(schools, metricKey)` — Clears and redraws all circle markers with metric-based colors
- `COLOR_SCALES` — 5-color arrays per metric. The color a dot gets is based on where its value falls in the metric's min-max range
- `buildPopup(school)` — HTML for the click tooltip showing all 7 metrics
- `highlightSchool(school)` — Opens popup, draws 5-mile radius, flies to location
- Markers are `L.circleMarker` (radius 5, white border)

### `charts.js` — Charts Module (`HBCUCharts`)
- `renderRadar(canvasId, school)` — School vs HBCU average radar chart (detail tab)
- `renderStateBar(canvasId, metricKey)` — Horizontal bar chart of state averages
- `renderComparisonCharts()` — 7 bar charts for state comparison view
- `renderCompareRadar(canvasId, schools)` — Multi-school overlay radar (compare tab)

### `export.js` — PDF Export (`HBCUExport`)
- `exportCurrentView()` — Exports based on current state filter (or all schools)
- Creates an off-screen fact sheet div, renders with html2canvas, converts to PDF
- The fact sheet has summary cards + full data table + source citation

### `app.js` — App Controller (`App`)
- `init()` — Entry point, called on DOMContentLoaded
- `setupControls()` — Wires metric select, state filter, search, slider, export button
- `refresh()` — Core loop: filter schools → plot on map → update list → update stats
- `selectSchool(school)` — Shows detail panel with metric bars + radar
- `setupCompare()` — School-to-school comparison multi-select
- `updateStats(schools)` — Computes and displays 7 stat card averages

---

## Adding a New Metric

1. **Add the Census variable** in `fetch_census.py`:
   - Add variable code to `VARIABLES` list
   - Add computation in `compute_metrics()`
   - Re-run the script

2. **Add to `data.js` METRICS object:**
   ```js
   new_metric: {
     label: 'Full Label',
     short: 'Short',
     format: v => v.toFixed(1) + '%',
     unit: '%',
     color: '#hexcolor',
     min: 0,
     max: 100,
     invert: false  // set true if lower = better
   }
   ```

3. **Add color scale** in `map.js` COLOR_SCALES:
   ```js
   new_metric: ['#e53935', '#fb8c00', '#fdd835', '#42a5f5', '#2e7d32']
   ```

4. **Add stat card** in `index.html`:
   ```html
   <div class="stat-card">
     <div class="stat-value" id="stat-newmetric">--</div>
     <div class="stat-label">Avg New Metric</div>
   </div>
   ```

5. **Add stat update** in `app.js` updateStats():
   ```js
   set('stat-newmetric', avg('new_metric'), v => v.toFixed(1) + '%');
   ```

6. **Add comparison chart** canvas in `index.html` and call in `charts.js` renderComparisonCharts()

The popup, detail panel, radar chart, and export all auto-include new metrics because they iterate over `Object.keys(METRICS)`.

---

## Deployment

- **Hosting:** Vercel (auto-deploys from GitHub `main` branch)
- **Repo:** `github.com/Bhagyashree-Vaidya/HBCU-Digital-Equity-Research-Project`
- **Live URL:** `https://hbcu-digital-equity-research-projec.vercel.app/`
- **To deploy:** Just `git push origin main` — Vercel picks it up automatically

### Local Development
```bash
# Option 1: Python
python3 -m http.server 8080

# Option 2: Node
npx serve -p 8080

# Then open http://localhost:8080
```

---

## Color System

- **Primary:** `#845ec2` (purple)
- **Accent:** `#b39ddb` (light purple)
- **Background:** `#0d1117` (dark), `#161b22` (cards), `#21262d` (inputs)
- **Text:** `#e6edf3` (primary), `#8b949e` (muted)

### Metric Color Scales (5 steps, worst → best)
- **Standard metrics** (higher = better): red → orange → yellow → blue → green
- **Inverted metrics** (lower = better, e.g. poverty): green → blue → yellow → orange → red
- **Broadband:** red → orange → yellow → blue → dark blue

---

## Common Tasks

### Change dot size
In `map.js`, `plotSchools()` function, change `radius: 5` to desired size.

### Change map starting position
In `map.js`, `init()`: `.setView([lat, lng], zoom)`

### Add a new school
Add an entry to `data/hbcu_schools.json` with all required fields:
`id, name, city, state, lat, lng, fips_state, fips_county` + all 7 metric values.

### Fix broken export
The export uses html2canvas which requires the fact sheet div to render in the DOM (off-screen at `left: -9999px`). If it breaks, check browser console for CORS or rendering errors.

---

## Known Limitations

1. **Virgin Islands data** — FIPS 78 is not in Census ACS; that school shows "N/A"
2. **County-level data** — Metrics are for the entire county, not the campus neighborhood
3. **Static data** — Must manually re-run `fetch_census.py` when new ACS releases come out (typically every December)
4. **No authentication** — Dashboard is public; library data (nearby_libraries) is kept in JSON but not displayed
5. **Mobile** — Sidebar stacks above map at <900px; functional but cramped

---

## Future Expansion Ideas (from Tracie & Krista)

- [ ] 20+ additional indicators (collection size, database diversity, visitation)
- [ ] Library system type filters (Alma, WorldShare, EBSCO)
- [ ] Consortial membership filters (Lyrasis, ACRL)
- [ ] Operating budget ranges
- [ ] Staffing indicators (archivist presence, special collections)
- [ ] R1 aspirant league comparisons
- [ ] Integration with HBCU Library Alliance member portal
- [ ] IMLS library data integration (https://www.imls.gov/research-evaluation/data-collection/public-libraries-survey)

---

## Contact

- **Built by:** Bhagyashree Vaidya — bhagyav@uw.edu
- **For:** Prof. Tracie D. Hall, Executive Director, HBCU Library Alliance
- **Census API docs:** https://www.census.gov/data/developers/data-sets/acs-5year.html
