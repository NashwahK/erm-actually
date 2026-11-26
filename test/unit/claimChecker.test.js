import { describe, expect, it, vi } from 'vitest';
import { createClaimChecker, mapWithConcurrency } from '../../src/lib/claimChecker.js';

describe('createClaimChecker', () => {
  it('caches results so the same sentence is only sent once', async () => {
    const provider = { check: vi.fn(async (s) => (s.includes('hoax') ? [{ text: s }] : [])) };
    const checker = createClaimChecker({ provider });

    const results = await checker.checkAll(['The moon landing was a hoax.', 'Paris is in France.']);
    await checker.checkAll(['The moon  landing was a hoax.']);

    expect(results.map((r) => r.claims.length)).toEqual([1, 0]);
    expect(provider.check).toHaveBeenCalledTimes(2);
  });

  it('reports per-sentence errors without failing the batch, and does not cache failures', async () => {
    let calls = 0;
    const provider = {
      check: vi.fn(async () => {
        calls += 1;
        if (calls === 1) throw new Error('network down');
        return [];
      }),
    };
    const checker = createClaimChecker({ provider, concurrency: 1 });

    const [first] = await checker.checkAll(['A sentence to check.']);
    expect(first.error.message).toBe('network down');

    const [second] = await checker.checkAll(['A sentence to check.']);
    expect(second.error).toBeUndefined();
    expect(provider.check).toHaveBeenCalledTimes(2);
  });
});

describe('mapWithConcurrency', () => {
  it('keeps order and never exceeds the limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const result = await mapWithConcurrency([5, 1, 4, 2, 3], 2, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, n));
      inFlight -= 1;
      return n * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });
});
