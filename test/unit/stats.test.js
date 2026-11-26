import { describe, expect, it } from 'vitest';
import {
  badgeProgress,
  buildDashboardModel,
  EMPTY_STATS,
  longestStreak,
  recordScan,
} from '../../src/lib/stats.js';
import { createStatsStore } from '../../src/lib/storage.js';

const day = (iso) => new Date(`${iso}T12:00:00`);

describe('recordScan', () => {
  it('accumulates totals per site and per month without mutating input', () => {
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
      date: day('2026-11-02'),
    });

    expect(EMPTY_STATS.totalChecked).toBe(0);
    expect(second).toMatchObject({ totalChecked: 15, totalFlagged: 3, pagesScanned: 2 });
    expect(second.bySite['news.example']).toEqual({ checked: 15, flagged: 3 });
    expect(second.byMonth['2026-11']).toEqual({ checked: 15, flagged: 3 });
    expect(second.scanDays).toEqual(['2026-11-01', '2026-11-02']);
  });
});

describe('longestStreak', () => {
  it('counts consecutive days', () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-05'])).toBe(3);
  });
});

describe('badgeProgress', () => {
  it('reports the current and next badge', () => {
    const { current, next, progress } = badgeProgress(150);
    expect(current.name).toBe('Skeptic');
    expect(next.name).toBe('Stickler');
    expect(progress).toBeCloseTo(0.5);
  });

  it('caps at the top badge', () => {
    expect(badgeProgress(1e9)).toMatchObject({ next: null, progress: 1 });
  });
});

describe('buildDashboardModel', () => {
  it('derives KPIs and chart series from real stats (no hardcoded numbers)', () => {
    let stats = EMPTY_STATS;
    stats = recordScan(stats, {
      url: 'https://a.test',
      checked: 8,
      flagged: 4,
      date: day('2026-10-10'),
    });
    stats = recordScan(stats, {
      url: 'https://b.test',
      checked: 12,
      flagged: 1,
      date: day('2026-11-20'),
    });

    const model = buildDashboardModel(stats, day('2026-11-26'));

    expect(model.isEmpty).toBe(false);
    expect(model.flaggedThisMonth).toBe(1);
    expect(model.flagRate).toBeCloseTo(5 / 20);
    expect(model.topSite).toBe('a.test');
    expect(model.monthLabels).toEqual(['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
    expect(model.monthlyFlagged).toEqual([0, 0, 0, 0, 4, 1]);
    expect(model.siteLabels).toEqual(['a.test', 'b.test']);
  });

  it('flags an empty state', () => {
    expect(buildDashboardModel(EMPTY_STATS).isEmpty).toBe(true);
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
