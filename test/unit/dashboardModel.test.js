import { describe, expect, it } from 'vitest';
import {
  badgeProgress,
  buildDashboardModel,
  currentStreak,
  longestStreak,
} from '../../src/lib/dashboardModel.js';
import { EMPTY_STATS, recordScan } from '../../src/lib/stats.js';
import { FUN_FACTS, factIndexFor, factOfTheDay } from '../../src/lib/funFacts.js';

const day = (iso, time = '12:00:00') => new Date(`${iso}T${time}`);

describe('streaks', () => {
  it('longestStreak counts consecutive days', () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-05'])).toBe(3);
  });

  it('currentStreak counts back from today, or from yesterday if today is empty', () => {
    const days = ['2026-11-23', '2026-11-24', '2026-11-25'];
    expect(currentStreak(days, day('2026-11-25'))).toBe(3);
    expect(currentStreak(days, day('2026-11-26'))).toBe(3);
    expect(currentStreak(days, day('2026-11-27'))).toBe(0);
  });
});

describe('badgeProgress', () => {
  it('reports the current and next badge and which badges are earned', () => {
    const { current, next, progress, badges } = badgeProgress(150);
    expect(current.name).toBe('Skeptic');
    expect(next.name).toBe('Stickler');
    expect(progress).toBeCloseTo(0.5);
    expect(badges.filter((b) => b.earned).map((b) => b.name)).toEqual(['Curious', 'Skeptic']);
  });

  it('caps at the top badge', () => {
    expect(badgeProgress(1e9)).toMatchObject({ next: null, progress: 1 });
  });
});

describe('buildDashboardModel', () => {
  const build = () => {
    let stats = EMPTY_STATS;
    stats = recordScan(stats, {
      url: 'https://a.test/1',
      title: 'A',
      checked: 8,
      flagged: 4,
      date: day('2026-10-10'),
      flaggedClaims: [
        { sentence: 'x is y.', publisher: 'Snopes', publishers: ['Snopes'], rating: 'False' },
      ],
    });
    stats = recordScan(stats, {
      url: 'https://b.test/2',
      title: 'B',
      checked: 12,
      flagged: 1,
      date: day('2026-11-25'),
      flaggedClaims: [
        {
          sentence: 'z.',
          publisher: 'PolitiFact',
          publishers: ['PolitiFact'],
          rating: 'Half True',
        },
      ],
    });
    return buildDashboardModel(stats, day('2026-11-26'));
  };

  it('derives KPIs from real stats (no hardcoded numbers)', () => {
    const m = build();
    expect(m.isEmpty).toBe(false);
    expect(m.flaggedThisMonth).toBe(1);
    expect(m.flagRate).toBeCloseTo(5 / 20);
    expect(m.topSite).toBe('a.test');
    expect(m.avgPerPage).toBe(10);
    expect(m.sitesVisited).toBe(2);
    expect(m.checkedToday).toBe(0);
    expect(m.currentStreak).toBe(1);
  });

  it('builds the chart series', () => {
    const m = build();
    expect(m.monthLabels).toEqual(['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
    expect(m.monthlyFlagged).toEqual([0, 0, 0, 0, 4, 1]);
    expect(m.dayLabels).toHaveLength(14);
    expect(m.dayLabels.at(-1)).toBe('Nov 26');
    expect(m.dailyChecked.at(-2)).toBe(12);
    expect(m.siteLabels).toEqual(['a.test', 'b.test']);
  });

  it('feeds the history, claims, sources and achievements tabs', () => {
    const m = build();
    expect(m.history.map((h) => h.title)).toEqual(['B', 'A']);
    expect(m.claims.map((c) => c.bucket)).toEqual(['Misleading', 'False']);
    expect(m.publishers.map((p) => p.name)).toEqual(['PolitiFact', 'Snopes']);
    expect(m.ratings).toEqual([
      { rating: 'False', count: 1 },
      { rating: 'Misleading', count: 1 },
    ]);
    expect(m.milestones.find((x) => x.label === 'Check your first page').done).toBe(true);
    expect(m.milestones.find((x) => x.label === 'Check 10 pages')).toMatchObject({
      value: 2,
      goal: 10,
      done: false,
    });
  });

  it('flags an empty state', () => {
    expect(buildDashboardModel(EMPTY_STATS).isEmpty).toBe(true);
  });
});

describe('fun facts', () => {
  it('has unique, non-empty facts', () => {
    expect(FUN_FACTS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(FUN_FACTS.map((f) => f.fact)).size).toBe(FUN_FACTS.length);
    FUN_FACTS.forEach((f) => expect(f.fact.length).toBeGreaterThan(20));
  });

  it('shows the same fact all day and a different one tomorrow', () => {
    expect(factIndexFor(day('2026-11-26', '00:05:00'))).toBe(
      factIndexFor(day('2026-11-26', '23:55:00')),
    );
    expect(factIndexFor(day('2026-11-27'))).toBe(
      (factIndexFor(day('2026-11-26')) + 1) % FUN_FACTS.length,
    );
    expect(factOfTheDay(day('2026-11-26'))).toBe(FUN_FACTS[factIndexFor(day('2026-11-26'))]);
  });
});
