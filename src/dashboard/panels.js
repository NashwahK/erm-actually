// Renders each dashboard tab from the model built in lib/dashboardModel.js.
import { h, pct, plural, ratingClass, relativeTime } from './dom.js';

const $ = (id) => document.getElementById(id);
const setText = (id, text) => ($(id).textContent = text);
const days = (n) => plural(n, 'day');

export function renderOverview(m) {
  setText('kpi-flagged-month', m.flaggedThisMonth.toLocaleString());
  setText('kpi-flag-rate', pct(m.flagRate));
  setText('kpi-pages', m.pagesScanned.toLocaleString());
  setText('kpi-checked', m.totalChecked.toLocaleString());
  setText('kpi-today', m.checkedToday.toLocaleString());
  setText(
    'kpi-today-note',
    m.checkedToday ? `${plural(m.flaggedToday, 'claim')} flagged` : 'Nothing checked yet today',
  );
  setText('kpi-streak', days(m.currentStreak));
  setText('kpi-streak-note', `Longest: ${days(m.longestStreak)}`);
  setText('kpi-avg', m.avgPerPage.toFixed(1));
  setText('kpi-top-site', m.topSite ?? '—');
  $('site-chart').parentElement.hidden = m.siteLabels.length === 0;
  $('site-chart-empty').hidden = m.siteLabels.length > 0;
}

export function renderHistory(m, now) {
  const rows = m.history.map((scan) =>
    h(
      'tr',
      {},
      h('td', { class: 'page-cell' }, linkOrText(scan.url, scan.title)),
      h('td', { text: scan.site }),
      h('td', { text: relativeTime(scan.date, now), title: new Date(scan.date).toLocaleString() }),
      h('td', { class: 'num', text: scan.checked.toLocaleString() }),
      h(
        'td',
        { class: 'num' },
        h('span', {
          class: scan.flagged ? 'count flagged' : 'count',
          text: scan.flagged.toLocaleString(),
        }),
      ),
    ),
  );
  $('history-rows').replaceChildren(...rows);
  $('history-empty').hidden = rows.length > 0;
}

export function renderClaims(m, now) {
  const select = $('claim-rating');
  const chosen = select.value;
  const buckets = [...new Set(m.claims.map((c) => c.bucket))];
  select.replaceChildren(
    h('option', { value: '', text: 'All ratings' }),
    ...buckets.map((b) => h('option', { value: b, text: b })),
  );
  select.value = buckets.includes(chosen) ? chosen : '';
  filterClaims(m, now);
}

/** Re-renders the claim list for the current search text and rating filter. */
export function filterClaims(m, now) {
  const query = $('claim-search').value.trim().toLowerCase();
  const rating = $('claim-rating').value;
  const matches = m.claims.filter(
    (c) =>
      (!rating || c.bucket === rating) &&
      (!query ||
        [c.sentence, c.pageTitle, c.publisher ?? ''].some((t) => t.toLowerCase().includes(query))),
  );

  $('claim-list').replaceChildren(...matches.map((c) => claimCard(c, now)));
  $('claims-empty').hidden = m.claims.length > 0;
  $('claim-count').textContent = m.claims.length
    ? `Showing ${matches.length} of ${plural(m.claims.length, 'claim')}`
    : '';
}

function claimCard(c, now) {
  return h(
    'li',
    { class: 'card claim' },
    h('blockquote', { class: 'claim-text', text: c.sentence }),
    h(
      'div',
      { class: 'claim-meta' },
      h('span', {
        class: `chip ${ratingClass(c.bucket)}`,
        text: c.rating ? `${c.bucket} · “${c.rating}”` : c.bucket,
      }),
      c.publisher ? h('span', {}, 'Checked by ', linkOrText(c.reviewUrl, c.publisher)) : null,
    ),
    h(
      'div',
      { class: 'claim-source' },
      'Seen on ',
      linkOrText(c.pageUrl, c.pageTitle),
      h('span', { class: 'muted', text: ` · ${relativeTime(c.date, now)}` }),
    ),
  );
}

export function renderSources(m) {
  const max = Math.max(1, ...m.publishers.map((p) => p.count));
  $('publisher-list').replaceChildren(
    ...m.publishers.map((p) =>
      h(
        'li',
        {},
        h('span', { class: 'bar-label', text: p.name }),
        h(
          'span',
          { class: 'bar-track' },
          h('span', { class: 'bar-fill', style: `width:${(p.count / max) * 100}%` }),
        ),
        h('span', { class: 'bar-value', text: p.count.toLocaleString() }),
      ),
    ),
  );
  $('publisher-empty').hidden = m.publishers.length > 0;
  $('rating-chart').parentElement.hidden = m.ratings.length === 0;
  $('rating-empty').hidden = m.ratings.length > 0;

  $('site-rows').replaceChildren(
    ...m.sites.map((s) =>
      h(
        'tr',
        {},
        h('td', { text: s.site }),
        h('td', { class: 'num', text: s.checked.toLocaleString() }),
        h('td', { class: 'num', text: s.flagged.toLocaleString() }),
        h('td', { class: 'num', text: pct(s.rate) }),
      ),
    ),
  );
}

export function renderAchievements(m) {
  setText('score', m.score.toLocaleString());
  setText('badge', m.current.name);
  setText('claims-checked', m.totalChecked.toLocaleString());
  setText('streak', days(m.longestStreak));
  setText('sites-count', m.sitesVisited.toLocaleString());
  $('badge-progress').value = m.progress;
  setText(
    'progress-label',
    m.next
      ? `Progress to “${m.next.name}” (${m.score.toLocaleString()} / ${m.next.score.toLocaleString()})`
      : 'Top badge reached!',
  );

  $('milestone-list').replaceChildren(
    ...m.milestones.map((ms) =>
      h(
        'li',
        { class: ms.done ? 'done' : '' },
        h('span', { class: 'tick', 'aria-hidden': 'true', text: ms.done ? '✓' : '' }),
        h('span', { class: 'ms-label', text: ms.label }),
        h('span', { class: 'ms-progress', text: `${ms.value}/${ms.goal}` }),
        h('span', { class: 'visually-hidden', text: ms.done ? 'Completed' : 'Not yet completed' }),
      ),
    ),
  );

  $('badge-grid').replaceChildren(
    ...m.badges.map((b) =>
      h(
        'li',
        { class: `card badge ${b.earned ? 'earned' : 'locked'}` },
        h('span', { class: 'badge-medal', 'aria-hidden': 'true', text: b.earned ? '★' : '☆' }),
        h('strong', { text: b.name }),
        h('span', {
          class: 'badge-req',
          text: b.earned ? 'Earned' : `${b.score.toLocaleString()} points`,
        }),
        h('span', { class: 'badge-blurb', text: b.blurb }),
      ),
    ),
  );
}

function linkOrText(url, text) {
  return /^https?:/.test(url ?? '')
    ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text })
    : h('span', { text });
}
