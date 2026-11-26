import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  PieController,
  Tooltip,
} from 'chart.js';
import { chartTheme } from '../lib/chartTheme.js';
import { buildDashboardModel } from '../lib/stats.js';
import { createStatsStore, STORAGE_KEYS } from '../lib/storage.js';

// Register only what we use so the bundle stays small (v1 shipped two full copies of Chart.js).
Chart.register(
  BarController,
  BarElement,
  PieController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

const $ = (id) => document.getElementById(id);
const stats = createStatsStore();
const charts = {};

function createCharts() {
  const theme = chartTheme();
  charts.monthly = new Chart($('monthly-chart'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Claims flagged',
          data: [],
          backgroundColor: theme.accentPalette[0],
          borderRadius: 8,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false }, tooltip: theme.tooltip },
      scales: { x: theme.axis(false), y: theme.axis(true) },
    },
  });
  charts.sites = new Chart($('site-chart'), {
    type: 'pie',
    data: { labels: [], datasets: [{ data: [], backgroundColor: theme.accentPalette }] },
    options: {
      aspectRatio: 1.6,
      plugins: {
        legend: { position: 'right', labels: theme.legendLabels },
        tooltip: theme.tooltip,
      },
    },
  });
}

function setChartData(chart, labels, data) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update();
}

async function render() {
  const model = buildDashboardModel(await stats.get());

  $('empty-state').hidden = !model.isEmpty;
  $('kpi-flagged-month').textContent = model.flaggedThisMonth.toLocaleString();
  $('kpi-flag-rate').textContent = `${(model.flagRate * 100).toFixed(1)}%`;
  $('kpi-top-site').textContent = model.topSite ?? '—';
  $('kpi-pages').textContent = model.pagesScanned.toLocaleString();

  setChartData(charts.monthly, model.monthLabels, model.monthlyFlagged);
  setChartData(charts.sites, model.siteLabels, model.siteFlagged);
  $('site-chart').hidden = model.siteLabels.length === 0;
  $('site-chart-empty').hidden = model.siteLabels.length > 0;

  $('score').textContent = model.score.toLocaleString();
  $('claims-checked').textContent = model.totalChecked.toLocaleString();
  $('streak').textContent = `${model.longestStreak} day${model.longestStreak === 1 ? '' : 's'}`;
  $('badge').textContent = model.current.name;
  $('badge-progress').value = model.progress;
  $('progress-label').textContent = model.next
    ? `Progress to “${model.next.name}” (${model.score}/${model.next.score})`
    : 'Top badge reached!';
}

function showTab(tab) {
  document.querySelectorAll('[data-tab]').forEach((link) => {
    const active = link.dataset.tab === tab;
    link.classList.toggle('active', active);
    link.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tab;
  });
  $('main-heading').textContent = tab === 'achievements' ? 'Achievements' : 'Dashboard';
}

document
  .querySelectorAll('[data-tab]')
  .forEach((link) => link.addEventListener('click', () => showTab(link.dataset.tab)));
$('settings-link').addEventListener('click', () => chrome.runtime.openOptionsPage());

// Re-render live when a scan in another tab updates the stats.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEYS.STATS_KEY]) render();
});

createCharts();
render();
