// Recording usage statistics: pure functions over the persisted stats object.
// Storage lives in storage.js; everything the dashboard derives lives in dashboardModel.js.

export const EMPTY_STATS = Object.freeze({
  totalChecked: 0,
  totalFlagged: 0,
  pagesScanned: 0,
  bySite: {}, // hostname → { checked, flagged }
  byMonth: {}, // 'YYYY-MM' → { checked, flagged }
  byDay: {}, // 'YYYY-MM-DD' → { checked, flagged, pages }
  scanDays: [], // sorted unique 'YYYY-MM-DD'
  byPublisher: {}, // fact-checker name → number of flagged claims they reviewed
  byRating: {}, // rating bucket → number of flagged claims
  recentScans: [], // newest first: { url, site, title, date, checked, flagged }
  recentClaims: [], // newest first: { sentence, publisher, rating, bucket, reviewUrl, pageUrl, pageTitle, date }
});

const MAX_DAYS = 400;
export const MAX_RECENT_SCANS = 50;
export const MAX_RECENT_CLAIMS = 100;
const MAX_TEXT = 300;

const pad = (n) => String(n).padStart(2, '0');
export const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
export const dayKey = (date) => `${monthKey(date)}-${pad(date.getDate())}`;

export function hostnameOf(url) {
  try {
    return new URL(url).hostname || 'local file';
  } catch {
    return 'unknown';
  }
}

/** Groups a fact-checker's free-text rating ("Pants on Fire!", "Mostly False") into a few buckets. */
export function ratingBucket(rating) {
  const r = (rating ?? '').toLowerCase().trim();
  if (!r) return 'Unrated';
  if (/mostly false|largely false|mostly inaccurate/.test(r)) return 'Mostly false';
  if (/mostly true|largely true|mostly accurate/.test(r)) return 'Mostly true';
  if (
    /mislead|mixed|mixture|half|partly|partially|missing context|out of context|exaggerat|unproven|lacks context/.test(
      r,
    )
  )
    return 'Misleading';
  if (
    /pants on fire|false|incorrect|fake|wrong|inaccurate|baseless|not true|unsupported|fabricat|hoax|debunk/.test(
      r,
    )
  )
    return 'False';
  if (/true|correct|accurate/.test(r)) return 'True';
  return 'Other';
}

const add = (bucket = { checked: 0, flagged: 0 }, checked, flagged) => ({
  ...bucket,
  checked: bucket.checked + checked,
  flagged: bucket.flagged + flagged,
});

const countEach = (counts, keys) =>
  keys.reduce((acc, key) => ({ ...acc, [key]: (acc[key] ?? 0) + 1 }), counts);

const clip = (text) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text);

function trimDays(byDay) {
  const keys = Object.keys(byDay).sort();
  return keys.length <= MAX_DAYS
    ? byDay
    : Object.fromEntries(keys.slice(-MAX_DAYS).map((k) => [k, byDay[k]]));
}

/**
 * Returns new stats with one page scan added. Never mutates its input.
 * `flaggedClaims` items: { sentence, publishers: string[], publisher, rating, reviewUrl }.
 */
export function recordScan(
  stats,
  { url, title = '', checked, flagged, flaggedClaims = [], date = new Date() },
) {
  const s = { ...EMPTY_STATS, ...stats };
  const site = hostnameOf(url);
  const day = dayKey(date);
  const iso = date.toISOString();
  const today = s.byDay[day] ?? { checked: 0, flagged: 0, pages: 0 };

  const claims = flaggedClaims.map((c) => ({
    sentence: clip(c.sentence),
    publisher: c.publisher ?? null,
    rating: c.rating ?? null,
    bucket: ratingBucket(c.rating),
    reviewUrl: c.reviewUrl ?? null,
    pageUrl: url,
    pageTitle: clip(title || site),
    date: iso,
  }));

  return {
    ...s,
    totalChecked: s.totalChecked + checked,
    totalFlagged: s.totalFlagged + flagged,
    pagesScanned: s.pagesScanned + 1,
    bySite: { ...s.bySite, [site]: add(s.bySite[site], checked, flagged) },
    byMonth: { ...s.byMonth, [monthKey(date)]: add(s.byMonth[monthKey(date)], checked, flagged) },
    byDay: trimDays({
      ...s.byDay,
      [day]: { ...add(today, checked, flagged), pages: today.pages + 1 },
    }),
    scanDays: [...new Set([...s.scanDays, day])].sort().slice(-MAX_DAYS),
    byPublisher: countEach(
      s.byPublisher,
      flaggedClaims.flatMap((c) => [...new Set(c.publishers ?? [c.publisher].filter(Boolean))]),
    ),
    byRating: countEach(
      s.byRating,
      claims.map((c) => c.bucket),
    ),
    recentScans: [
      { url, site, title: clip(title || site), date: iso, checked, flagged },
      ...s.recentScans,
    ].slice(0, MAX_RECENT_SCANS),
    recentClaims: [...claims, ...s.recentClaims].slice(0, MAX_RECENT_CLAIMS),
  };
}
