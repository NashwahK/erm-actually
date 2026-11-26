// Dashboard entry: tabs, live updates from storage, and the fun fact of the day.
import { buildDashboardModel } from '../lib/dashboardModel.js';
import { FUN_FACTS, factIndexFor } from '../lib/funFacts.js';
import { createStatsStore, STORAGE_KEYS } from '../lib/storage.js';
import { createCharts } from './charts.js';
import {
  filterClaims,
  renderAchievements,
  renderClaims,
  renderHistory,
  renderOverview,
  renderSources,
} from './panels.js';

const $ = (id) => document.getElementById(id);
const stats = createStatsStore();
const charts = createCharts();
let model = null;

const TABS = {
  overview: { title: 'Overview', subtitle: 'Your fact-checking at a glance' },
  history: { title: 'History', subtitle: 'Pages you’ve checked, newest first' },
  claims: {
    title: 'Flagged claims',
    subtitle: 'Sentences fact-checkers have reviewed, with their verdicts',
  },
  sources: {
    title: 'Sources',
    subtitle: 'Who reviewed your flagged claims, and where you found them',
  },
  achievements: { title: 'Achievements', subtitle: 'Points, badges and milestones' },
};

async function render() {
  const now = new Date();
  model = buildDashboardModel(await stats.get(), now);
  $('empty-state').hidden = !model.isEmpty;
  renderOverview(model);
  renderHistory(model, now);
  renderClaims(model, now);
  renderSources(model);
  renderAchievements(model);
  charts.update(model);
}

// ---------- tabs (the open tab is kept in the URL hash, so reloads and links keep it) ----------
function showTab(name) {
  const tab = TABS[name] ? name : 'overview';
  document.querySelectorAll('[data-tab]').forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tab;
  });
  $('main-heading').textContent = TABS[tab].title;
  $('subtitle').textContent = TABS[tab].subtitle;
  charts.resize();
}

const tabButtons = [...document.querySelectorAll('[data-tab]')];
tabButtons.forEach((button, i) => {
  button.addEventListener('click', () => (location.hash = button.dataset.tab));
  // Arrow keys move between tabs, as screen-reader users expect from a tab list.
  button.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    const next = tabButtons[(i + step + tabButtons.length) % tabButtons.length];
    next.focus();
    location.hash = next.dataset.tab;
  });
});
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

$('settings-link').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('claim-search').addEventListener('input', () => model && filterClaims(model, new Date()));
$('claim-rating').addEventListener('change', () => model && filterClaims(model, new Date()));

// ---------- fun fact of the day ----------
let factIndex = factIndexFor(new Date());

function showFact() {
  const fact = FUN_FACTS[factIndex];
  $('fun-fact-topic').textContent = fact.topic;
  $('fun-fact-myth').hidden = !fact.myth;
  $('fun-fact-myth-text').textContent = fact.myth ?? '';
  $('fun-fact-text').textContent = fact.fact;
  const isToday = factIndex === factIndexFor(new Date());
  $('fun-fact-title').textContent = isToday ? 'Fun fact of the day' : 'Another fun fact';
  $('fun-fact-count').textContent = `Fact ${factIndex + 1} of ${FUN_FACTS.length}`;
}

$('fun-fact-next').addEventListener('click', () => {
  factIndex = (factIndex + 1) % FUN_FACTS.length;
  showFact();
});

// Re-render live when a scan in another tab updates the stats.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEYS.STATS_KEY]) render();
});

showTab(location.hash.slice(1));
showFact();
render();
