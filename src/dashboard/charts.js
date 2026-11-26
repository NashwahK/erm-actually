import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  PieController,
  Tooltip,
} from 'chart.js';
import { chartTheme } from '../lib/chartTheme.js';

// Register only what we use so the bundle stays small (v1 shipped two full copies of Chart.js).
Chart.register(
  BarController,
  BarElement,
  PieController,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

const $ = (id) => document.getElementById(id);

export function createCharts() {
  const theme = chartTheme();
  const common = { maintainAspectRatio: false, animation: { duration: 400 } };
  const barOptions = (legend) => ({
    ...common,
    plugins: {
      legend: legend ? { labels: theme.legendLabels } : { display: false },
      tooltip: theme.tooltip,
    },
    scales: { x: theme.axis(false), y: theme.axis(true) },
  });
  const roundOptions = {
    ...common,
    plugins: { legend: { position: 'right', labels: theme.legendLabels }, tooltip: theme.tooltip },
  };

  const charts = {
    daily: new Chart($('daily-chart'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Sentences checked',
            data: [],
            backgroundColor: theme.secondary,
            borderRadius: 4,
          },
          { label: 'Claims flagged', data: [], backgroundColor: theme.accent, borderRadius: 4 },
        ],
      },
      options: barOptions(true),
    }),
    monthly: new Chart($('monthly-chart'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          { label: 'Claims flagged', data: [], backgroundColor: theme.accent, borderRadius: 6 },
        ],
      },
      options: barOptions(false),
    }),
    sites: new Chart($('site-chart'), {
      type: 'pie',
      data: { labels: [], datasets: [{ data: [], backgroundColor: theme.accentPalette }] },
      options: roundOptions,
    }),
    ratings: new Chart($('rating-chart'), {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
      options: { ...roundOptions, cutout: '55%' },
    }),
  };

  return {
    update(model) {
      set(charts.daily, model.dayLabels, model.dailyChecked, model.dailyFlagged);
      set(charts.monthly, model.monthLabels, model.monthlyFlagged);
      set(charts.sites, model.siteLabels, model.siteFlagged);
      set(
        charts.ratings,
        model.ratings.map((r) => r.rating),
        model.ratings.map((r) => r.count),
      );
      charts.ratings.data.datasets[0].backgroundColor = model.ratings.map(
        (r) => theme.ratingColors[r.rating],
      );
      charts.ratings.update();
    },
    /** Charts created inside a hidden tab have no size until it is shown. */
    resize() {
      Object.values(charts).forEach((chart) => chart.resize());
    },
  };
}

function set(chart, labels, ...series) {
  chart.data.labels = labels;
  series.forEach((data, i) => (chart.data.datasets[i].data = data));
  chart.update();
}
