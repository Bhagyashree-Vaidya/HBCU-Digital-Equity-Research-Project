// ===== Leaflet Map Module =====

const HBCUMap = (() => {
  let map;
  let markersLayer;
  let radiusLayer;
  let legend;
  let currentMetric = 'median_income';
  let onSchoolClick = null;

  const COLOR_SCALES = {
    median_income: ['#e53935', '#fb8c00', '#fdd835', '#42a5f5', '#2e7d32'],
    pct_bachelors: ['#e53935', '#fb8c00', '#fdd835', '#42a5f5', '#2e7d32'],
    pct_hs_completion: ['#e53935', '#fb8c00', '#fdd835', '#42a5f5', '#2e7d32'],
    pct_broadband: ['#e53935', '#ef5350', '#5c9bd4', '#42a5f5', '#1565c0'],
    pct_uninsured: ['#2e7d32', '#42a5f5', '#fdd835', '#fb8c00', '#e53935'],
    pct_poverty: ['#2e7d32', '#42a5f5', '#fdd835', '#fb8c00', '#e53935'],
    pct_employment: ['#e53935', '#fb8c00', '#fdd835', '#42a5f5', '#2e7d32']
  };

  function init(containerId) {
    map = L.map(containerId, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([35.5, -85.0], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | Census ACS Data',
      maxZoom: 18
    }).addTo(map);

    markersLayer = L.markerClusterGroup({
      maxClusterRadius: 35,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 20) size = 'large';
        else if (count > 5) size = 'medium';
        return L.divIcon({
          html: '<div></div>',
          className: 'marker-cluster marker-cluster-' + size,
          iconSize: L.point(40, 40)
        });
      }
    }).addTo(map);
    radiusLayer = L.layerGroup().addTo(map);

    addLegend();
    return map;
  }

  function getColor(value, metricKey) {
    if (value == null) return '#555';
    const m = HBCUData.METRICS[metricKey];
    const scale = COLOR_SCALES[metricKey];
    const range = m.max - m.min;
    const pct = (value - m.min) / range;
    const idx = Math.min(Math.floor(pct * scale.length), scale.length - 1);
    return scale[Math.max(0, idx)];
  }

  function addLegend() {
    legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'map-legend');
      updateLegendContent(div);
      return div;
    };
    legend.addTo(map);
  }

  function updateLegendContent(container) {
    const m = HBCUData.METRICS[currentMetric];
    const scale = COLOR_SCALES[currentMetric];
    const range = m.max - m.min;
    const steps = scale.length;

    let html = `<h4>${m.short}</h4>`;
    for (let i = 0; i < steps; i++) {
      const low = m.min + (range / steps) * i;
      const high = m.min + (range / steps) * (i + 1);
      const lowStr = currentMetric === 'median_income'
        ? '$' + Math.round(low / 1000) + 'k'
        : Math.round(low) + (m.unit === '%' ? '%' : '');
      const highStr = currentMetric === 'median_income'
        ? '$' + Math.round(high / 1000) + 'k'
        : Math.round(high) + (m.unit === '%' ? '%' : '');
      html += `<div class="legend-item">
        <span class="legend-color" style="background:${scale[i]}"></span>
        ${lowStr} to ${highStr}
      </div>`;
    }
    container.innerHTML = html;
  }

  function plotSchools(schools, metricKey) {
    currentMetric = metricKey;
    markersLayer.clearLayers();
    radiusLayer.clearLayers();

    const m = HBCUData.METRICS[metricKey];

    schools.forEach(school => {
      const value = school[metricKey];
      const color = getColor(value, metricKey);

      const marker = L.circleMarker([school.lat, school.lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.85
      });

      const popupContent = buildPopup(school);
      marker.bindPopup(popupContent, { maxWidth: 280 });

      marker.on('click', () => {
        showRadius(school);
        if (onSchoolClick) onSchoolClick(school);
      });

      marker.schoolData = school;
      markersLayer.addLayer(marker);
    });

    // Update legend
    const legendContainer = document.querySelector('.map-legend');
    if (legendContainer) updateLegendContent(legendContainer);
  }

  function buildPopup(school) {
    const metrics = HBCUData.METRICS;
    const fmt = (key) => school[key] != null ? metrics[key].format(school[key]) : 'N/A';
    return `
      <div class="popup-title">${school.name}</div>
      <div class="popup-location">${school.city}, ${school.state}</div>
      <div class="popup-metrics">
        <div class="popup-metric"><span class="label">Income:</span><span class="value">${fmt('median_income')}</span></div>
        <div class="popup-metric"><span class="label">Bachelor's+:</span><span class="value">${fmt('pct_bachelors')}</span></div>
        <div class="popup-metric"><span class="label">HS Completion:</span><span class="value">${fmt('pct_hs_completion')}</span></div>
        <div class="popup-metric"><span class="label">Broadband:</span><span class="value">${fmt('pct_broadband')}</span></div>
        <div class="popup-metric"><span class="label">Uninsured:</span><span class="value">${fmt('pct_uninsured')}</span></div>
        <div class="popup-metric"><span class="label">Poverty:</span><span class="value">${fmt('pct_poverty')}</span></div>
        <div class="popup-metric"><span class="label">Employment:</span><span class="value">${fmt('pct_employment')}</span></div>
      </div>
    `;
  }

  function showRadius(school) {
    radiusLayer.clearLayers();
    // 5-mile radius ≈ 8046.72 meters
    L.circle([school.lat, school.lng], {
      radius: 8047,
      color: '#b39ddb',
      fillColor: '#b39ddb',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '6 4'
    }).addTo(radiusLayer);
  }

  function clearRadius() {
    radiusLayer.clearLayers();
  }

  function flyTo(lat, lng, zoom = 12) {
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }

  function resetView() {
    map.flyTo([35.5, -85.0], 5, { duration: 1 });
    radiusLayer.clearLayers();
  }

  function setSchoolClickHandler(handler) {
    onSchoolClick = handler;
  }

  function highlightSchool(school) {
    markersLayer.eachLayer(layer => {
      if (layer.schoolData && layer.schoolData.id === school.id) {
        layer.openPopup();
        showRadius(school);
        flyTo(school.lat, school.lng, 11);
      }
    });
  }

  return { init, plotSchools, flyTo, resetView, setSchoolClickHandler, highlightSchool, clearRadius };
})();
