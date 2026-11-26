// Everything the dashboard shows, derived from the recorded stats. Pure: no DOM, no storage.
import { dayKey, EMPTY_STATS, monthKey } from './stats.js';

export const BADGES = [
  { name: 'Curious', score: 0, blurb: 'Installed the extension and started asking questions.' },
  { name: 'Skeptic', score: 50, blurb: 'Doesn’t take headlines at face value.' },
  { name: 'Stickler', score: 250, blurb: 'Reads the fine print, then checks it.' },
  { name: 'Pedant', score: 1000, blurb: 'Has corrected someone at dinner. Twice.' },
  { name: 'Professor Actually', score: 5000, blurb: '“Erm... actually” is now a lifestyle.' },
];

export const RATING_ORDER = [
  'False',
  'Mostly false',
  'Misleading',
  'Mostly true',
  'True',
  'Other',
  'Unrated',
];

const DAY_MS = 86_400_000;
const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const shiftDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

export const scoreOf = (stats) => stats.totalChecked + 5 * stats.totalFlagged;

/** Longest run of consecutive calendar days with at least one scan. */
export function longestStreak(scanDays) {
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of scanDays) {
    const current = Date.parse(`${day}T00:00:00Z`);
    run = previous !== null && current - previous === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
    previous = current;
  }
  return best;
}

/** Consecutive days up to today (or up to yesterday, if nothing has been checked yet today). */
export function currentStreak(scanDays, now = new Date()) {
  const days = new Set(scanDays);
  let cursor = dayStart(now);
  if (!days.has(dayKey(cursor))) cursor = shiftDays(cursor, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

export function badgeProgress(score) {
  const index = BADGES.findLastIndex((badge) => score >= badge.score);
  const current = BADGES[index];
  const next = BADGES[index + 1] ?? null;
  const progress = next ? (score - current.score) / (next.score - current.score) : 1;
  return {
    current,
    next,
    progress,
    badges: BADGES.map((b) => ({ ...b, earned: score >= b.score })),
  };
}

export function milestones(s, streak) {
  const sites = Object.keys(s.bySite).length;
  const items = [
    ['Check your first page', s.pagesScanned, 1],
    ['Check 10 pages', s.pagesScanned, 10],
    ['Check 100 sentences', s.totalChecked, 100],
    ['Flag 25 claims', s.totalFlagged, 25],
    ['Check 5 different websites', sites, 5],
    ['Use it 3 days in a row', streak, 3],
    ['Use it 7 days in a row', streak, 7],
  ];
  return items.map(([label, value, goal]) => ({
    label,
    value: Math.min(value, goal),
    goal,
    done: value >= goal,
  }));
}

const flaggedIn = (stats, date) => stats.byMonth[monthKey(date)]?.flagged ?? 0;

/** Labels and flagged counts for the last `months` calendar months, oldest first. */
export function monthlySeries(stats, now, months) {
  const dates = Array.from(
    { length: months },
    (_, i) => new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1),
  );
  return {
    monthLabels: dates.map((d) => d.toLocaleString('en', { month: 'short' })),
    monthlyFlagged: dates.map((d) => flaggedIn(stats, d)),
  };
}

/** Sentences checked and claims flagged on each of the last `days` days, oldest first. */
export function dailySeries(stats, now, days) {
  const dates = Array.from({ length: days }, (_, i) => shiftDays(dayStart(now), i - (days - 1)));
  const at = (d) => stats.byDay[dayKey(d)] ?? { checked: 0, flagged: 0 };
  return {
    dayLabels: dates.map((d) => d.toLocaleString('en', { month: 'short', day: 'numeric' })),
    dailyChecked: dates.map((d) => at(d).checked),
    dailyFlagged: dates.map((d) => at(d).flagged),
  };
}

/** Sites with the most flagged claims, most first, with their flag rate. */
export function siteTable(stats, limit = 8) {
  return Object.entries(stats.bySite)
    .map(([site, v]) => ({ site, ...v, rate: v.checked ? v.flagged / v.checked : 0 }))
    .sort((a, b) => b.flagged - a.flagged || b.checked - a.checked)
    .slice(0, limit);
}

export function topPublishers(stats, limit = 8) {
  return Object.entries(stats.byPublisher)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function ratingBreakdown(stats) {
  return RATING_ORDER.filter((r) => stats.byRating[r]).map((r) => ({
    rating: r,
    count: stats.byRating[r],
  }));
}

/** Everything the dashboard renders, derived from stats. */
export function buildDashboardModel(stats, now = new Date()) {
  const s = { ...EMPTY_STATS, ...stats };
  const sites = siteTable(s);
  const flaggedSites = sites.filter((x) => x.flagged > 0).slice(0, 5);
  const score = scoreOf(s);
  const streakNow = currentStreak(s.scanDays, now);
  const today = s.byDay[dayKey(now)] ?? { checked: 0, flagged: 0, pages: 0 };

  return {
    isEmpty: s.pagesScanned === 0,
    // Overview KPIs
    flaggedThisMonth: flaggedIn(s, now),
    flagRate: s.totalChecked ? s.totalFlagged / s.totalChecked : 0,
    topSite: flaggedSites[0]?.site ?? null,
    pagesScanned: s.pagesScanned,
    totalChecked: s.totalChecked,
    totalFlagged: s.totalFlagged,
    checkedToday: today.checked,
    flaggedToday: today.flagged,
    sitesVisited: Object.keys(s.bySite).length,
    avgPerPage: s.pagesScanned ? s.totalChecked / s.pagesScanned : 0,
    currentStreak: streakNow,
    longestStreak: longestStreak(s.scanDays),
    // Charts
    ...monthlySeries(s, now, 6),
    ...dailySeries(s, now, 14),
    siteLabels: flaggedSites.map((x) => x.site),
    siteFlagged: flaggedSites.map((x) => x.flagged),
    // Tabs
    sites,
    publishers: topPublishers(s),
    ratings: ratingBreakdown(s),
    history: s.recentScans,
    claims: s.recentClaims,
    // Achievements
    score,
    milestones: milestones(s, Math.max(streakNow, longestStreak(s.scanDays))),
    ...badgeProgress(score),
  };
}
