import { describe, expect, it } from 'vitest';
import { EMPTY_STATS, MAX_RECENT_SCANS, ratingBucket, recordScan } from '../../src/lib/stats.js';
import { createStatsStore } from '../../src/lib/storage.js';

const day = (iso) => new Date(`${iso}T12:00:00`);

const claim = (sentence, publisher, rating) => ({
  sentence,
  publisher,
  publishers: [publisher],
  rating,
  reviewUrl: `https://check.test/${encodeURIComponent(sentence)}`,
});

describe('recordScan', () => {
  it('accumulates totals per site, month and day without mutating input', () => {
    const first = recordScan(EMPTY_STATS, {
      url: 'https://news.example/a',
      checked: 10,
      flagged: 2,
      date: day('2026-11-01'),
    });
    const second = recordScan(first, {
      url: 'https://news.example/b',
      checked: 5,
      flagged: 1,
      date: day('2026-11-01'),
    });

    expect(EMPTY_STATS.totalChecked).toBe(0);
    expect(second).toMatchObject({ totalChecked: 15, totalFlagged: 3, pagesScanned: 2 });
    expect(second.bySite['news.example']).toEqual({ checked: 15, flagged: 3 });
    expect(second.byMonth['2026-11']).toEqual({ checked: 15, flagged: 3 });
    expect(second.byDay['2026-11-01']).toEqual({ checked: 15, flagged: 3, pages: 2 });
    expect(second.scanDays).toEqual(['2026-11-01']);
  });

  it('keeps recent scans and flagged claims newest first, with publishers and ratings counted', () => {
    const stats = recordScan(EMPTY_STATS, {
      url: 'https://news.example/a',
      title: 'Moon story',
      checked: 3,
      flagged: 2,
      flaggedClaims: [
        claim('The moon landing was faked.', 'Snopes', 'False'),
        claim('Carrots give you night vision.', 'Snopes', 'Mostly False'),
      ],
      date: day('2026-11-02'),
    });

    expect(stats.recentScans[0]).toMatchObject({
      title: 'Moon story',
      site: 'news.example',
      flagged: 2,
    });
    expect(stats.recentClaims.map((c) => c.bucket)).toEqual(['False', 'Mostly false']);
    expect(stats.recentClaims[0]).toMatchObject({ pageTitle: 'Moon story', publisher: 'Snopes' });
    expect(stats.byPublisher).toEqual({ Snopes: 2 });
    expect(stats.byRating).toEqual({ False: 1, 'Mostly false': 1 });
  });

  it('caps the history so storage cannot grow without limit', () => {
    let stats = EMPTY_STATS;
    for (let i = 0; i < MAX_RECENT_SCANS + 10; i++) {
      stats = recordScan(stats, { url: `https://x.test/${i}`, checked: 1, flagged: 0 });
    }
    expect(stats.recentScans).toHaveLength(MAX_RECENT_SCANS);
    expect(stats.recentScans[0].url).toBe(`https://x.test/${MAX_RECENT_SCANS + 9}`);
  });
});

describe('ratingBucket', () => {
  it.each([
    ['False', 'False'],
    ['Pants on Fire!', 'False'],
    ['Incorrect', 'False'],
    ['Mostly False', 'Mostly false'],
    ['Half True', 'Misleading'],
    ['Missing context', 'Misleading'],
    ['Mostly True', 'Mostly true'],
    ['Correct', 'True'],
    ['Satire', 'Other'],
    [null, 'Unrated'],
  ])('%s → %s', (rating, bucket) => {
    expect(ratingBucket(rating)).toBe(bucket);
  });
});

describe('createStatsStore', () => {
  it('serialises concurrent writes so no scan is lost', async () => {
    const data = {};
    const area = {
      get: async (key) => {
        await new Promise((r) => setTimeout(r, 1));
        return { [key]: data[key] };
      },
      set: async (obj) => Object.assign(data, obj),
      remove: async (key) => delete data[key],
    };
    const store = createStatsStore(area);
    await Promise.all(
      [1, 2, 3].map(() => store.record({ url: 'https://x.test', checked: 1, flagged: 0 })),
    );
    expect((await store.get()).totalChecked).toBe(3);
  });
});
