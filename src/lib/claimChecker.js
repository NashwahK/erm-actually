// Checks many sentences against a provider with caching, de-duplication and a concurrency limit.
import { normalizeQuery } from './sentences.js';

export function createClaimChecker({ provider, concurrency = 4, maxCacheEntries = 500 }) {
  const cache = new Map(); // query → Promise<Claim[]>

  function checkOne(sentence) {
    const key = normalizeQuery(sentence).toLowerCase();
    if (!cache.has(key)) {
      const pending = provider.check(sentence).catch((error) => {
        cache.delete(key); // never cache failures
        throw error;
      });
      cache.set(key, pending);
      if (cache.size > maxCacheEntries) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }

  async function checkAll(sentences) {
    return mapWithConcurrency(sentences, concurrency, async (sentence) => {
      try {
        return { sentence, claims: await checkOne(sentence) };
      } catch (error) {
        return { sentence, claims: [], error };
      }
    });
  }

  return {
    checkOne,
    checkAll,
    get cacheSize() {
      return cache.size;
    },
  };
}

/** Like Promise.all(items.map(fn)) but with at most `limit` calls in flight. Keeps order. */
export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
