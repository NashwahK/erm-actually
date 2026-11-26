// Pure functions over the persisted usage statistics. Storage lives in statsStore.js.

export const EMPTY_STATS = Object.freeze({
  totalChecked: 0,
  totalFlagged: 0,
  pagesScanned: 0,
  bySite: {}, // hostname → { checked, flagged }
  byMonth: {}, // 'YYYY-MM' → { checked, flagged }
  scanDays: [], // sorted unique 'YYYY-MM-DD'
});

export const BADGES = [
  { name: 'Curious', score: 0 },
  { name: 'Skeptic', score: 50 },
  { name: 'Stickler', score: 250 },
  { name: 'Pedant', score: 1000 },
  { name: 'Professor Actually', score: 5000 },
];

const MAX_SCAN_DAYS = 400;
const pad = (n) => String(n).padStart(2, '0');
export const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
export const dayKey = (date) => `${monthKey(date)}-${pad(date.getDate())}`;

function hostnameOf(url) {
  try {
    return new URL(url).hostname || 'local file';
  } catch {
    return 'unknown';
  }
}

const add = (bucket = { checked: 0, flagged: 0 }, checked, flagged) => ({
  checked: bucket.checked + checked,
  flagged: bucket.flagged + flagged,
});

/** Returns new stats with one page scan added. Never mutates its input. */
export function recordScan(stats, { url, checked, flagged, date = new Date() }) {
  const s = { ...EMPTY_STATS, ...stats };
  const site = hostnameOf(url);
  const month = monthKey(date);
  const day = dayKey(date);
  return {
    totalChecked: s.totalChecked + checked,
    totalFlagged: s.totalFlagged + flagged,
    pagesScanned: s.pagesScanned + 1,
    bySite: { ...s.bySite, [site]: add(s.bySite[site], checked, flagged) },
    byMonth: { ...s.byMonth, [month]: add(s.byMonth[month], checked, flagged) },
    scanDays: [...new Set([...s.scanDays, day])].sort().slice(-MAX_SCAN_DAYS),
  };
}

export const scoreOf = (stats) => stats.totalChecked + 5 * stats.totalFlagged;

/** Longest run of consecutive calendar days with at least one scan. */
export function longestStreak(scanDays) {
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of scanDays) {
    const current = Date.parse(`${day}T00:00:00Z`);
    run = previous !== null && current - previous === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = current;
  }
  return best;
}

export function badgeProgress(score) {
  const index = BADGES.findLastIndex((badge) => score >= badge.score);
  const current = BADGES[index];
  const next = BADGES[index + 1] ?? null;
  const progress = next ? (score - current.score) / (next.score - current.score) : 1;
  return { current, next, progress };
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

/** The sites with the most flagged claims, most first. */
export function topSites(stats, limit = 5) {
  const sites = Object.entries(stats.bySite)
    .filter(([, v]) => v.flagged > 0)
    .sort((a, b) => b[1].flagged - a[1].flagged)
    .slice(0, limit);
  return {
    siteLabels: sites.map(([site]) => site),
    siteFlagged: sites.map(([, v]) => v.flagged),
  };
}

/** Everything the dashboard renders, derived from stats. */
export function buildDashboardModel(stats, now = new Date(), months = 6) {
  const s = { ...EMPTY_STATS, ...stats };
  const sites = topSites(s);
  const score = scoreOf(s);
  return {
    isEmpty: s.pagesScanned === 0,
    flaggedThisMonth: flaggedIn(s, now),
    flagRate: s.totalChecked ? s.totalFlagged / s.totalChecked : 0,
    topSite: sites.siteLabels[0] ?? null,
    pagesScanned: s.pagesScanned,
    totalChecked: s.totalChecked,
    totalFlagged: s.totalFlagged,
    ...monthlySeries(s, now, months),
    ...sites,
    score,
    longestStreak: longestStreak(s.scanDays),
    ...badgeProgress(score),
  };
}
