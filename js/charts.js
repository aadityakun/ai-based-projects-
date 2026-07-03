/**
 * StudyOS v5 - High Performance SVG Charting Engine
 * Renders smooth responsive charts (Study Hours Bar Chart, Subject Donut Chart,
 * XP Trajectory Line Chart, and 365-Day Calendar Heatmap) under 100ms.
 */

/**
 * Renders Weekly / Monthly Study Hours Bar Chart
 */
export function renderStudyHoursBarChart(container, data = []) {
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="chart-empty">No study session data logged yet</div>`;
    return;
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const chartHeight = 160;
  const barWidth = Math.max(16, Math.floor(300 / data.length) - 8);

  const barsSVG = data.map((item, idx) => {
    const height = Math.round((item.value / maxVal) * (chartHeight - 40));
    const y = chartHeight - 25 - height;
    const x = idx * (barWidth + 10) + 15;

    return `
      <g class="chart-bar-group" data-val="${item.value} hrs">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="4" fill="url(#barGradient)" class="chart-bar"></rect>
        <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="var(--text-muted)" font-weight="600">${item.value > 0 ? item.value : ''}</text>
        <text x="${x + barWidth / 2}" y="${chartHeight - 8}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${item.label}</text>
      </g>
    `;
  }).join('');

  const svg = `
    <svg viewBox="0 0 ${Math.max(340, data.length * (barWidth + 10) + 30)} ${chartHeight}" class="svg-chart">
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--primary-grass)" />
          <stop offset="100%" stop-color="var(--accent-emerald)" />
        </linearGradient>
      </defs>
      ${barsSVG}
    </svg>
  `;

  container.innerHTML = svg;
}

/**
 * Renders Subject Distribution Donut Chart
 */
export function renderSubjectDistributionDonut(container, data = []) {
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="chart-empty">No subjects created yet</div>`;
    return;
  }

  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    container.innerHTML = `<div class="chart-empty">Start a study session to view distribution</div>`;
    return;
  }

  let cumulativeAngle = 0;
  const size = 180;
  const radius = 65;
  const center = size / 2;

  const slices = data.map(item => {
    const angle = (item.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const x1 = center + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
    const y1 = center + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
    const x2 = center + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
    const y2 = center + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;
    const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return `
      <path d="${pathData}" fill="${item.color || 'var(--primary-grass)'}" opacity="0.95">
        <title>${item.label}: ${Math.round((item.value / total) * 100)}%</title>
      </path>
    `;
  }).join('');

  const legend = data.map(item => `
    <div class="legend-item">
      <span class="legend-dot" style="background-color: ${item.color};"></span>
      <span class="legend-label">${item.label}</span>
      <span class="legend-value">${Math.round((item.value / total) * 100)}%</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="donut-chart-wrapper">
      <svg viewBox="0 0 ${size} ${size}" class="svg-donut">
        ${slices}
        <circle cx="${center}" cy="${center}" r="40" fill="var(--card-solid-bg)" />
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>
  `;
}

/**
 * Renders 365-Day GitHub Style Performance Calendar Heatmap
 */
export function renderAnnualHeatmap(container, calendarDaysData = []) {
  if (!container) return;

  const dayMap = new Map(calendarDaysData.map(d => [d.date, d.status]));
  const today = new Date();
  const days = [];

  // Generate last 365 days
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const status = dayMap.get(dateStr) || 'GRAY';
    days.push({ date: dateStr, status });
  }

  const rects = days.map((day, idx) => {
    const col = Math.floor(idx / 7);
    const row = idx % 7;
    const x = col * 12 + 10;
    const y = row * 12 + 10;

    let colorClass = 'heatmap-gray';
    if (day.status === 'GREEN') colorClass = 'heatmap-green';
    else if (day.status === 'YELLOW') colorClass = 'heatmap-yellow';
    else if (day.status === 'ORANGE') colorClass = 'heatmap-orange';
    else if (day.status === 'RED') colorClass = 'heatmap-red';
    else if (day.status === 'REST') colorClass = 'heatmap-rest';

    return `
      <rect x="${x}" y="${y}" width="9" height="9" rx="2" class="heatmap-cell ${colorClass}">
        <title>${day.date}: ${day.status}</title>
      </rect>
    `;
  }).join('');

  const width = Math.ceil(365 / 7) * 12 + 20;

  container.innerHTML = `
    <div class="heatmap-scroll-container">
      <svg viewBox="0 0 ${width} 100" class="svg-heatmap">
        ${rects}
      </svg>
    </div>
    <div class="heatmap-legend">
      <span class="legend-pill heatmap-green">Green (100%)</span>
      <span class="legend-pill heatmap-yellow">Yellow (80%)</span>
      <span class="legend-pill heatmap-orange">Orange (50%)</span>
      <span class="legend-pill heatmap-red">Red (<50%)</span>
      <span class="legend-pill heatmap-rest">Rest Day</span>
    </div>
  `;
}
