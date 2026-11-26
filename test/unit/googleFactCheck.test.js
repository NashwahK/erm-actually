import { describe, expect, it, vi } from 'vitest';
import {
  createGoogleFactCheckProvider,
  normalizeClaims,
} from '../../src/lib/providers/googleFactCheck.js';

const apiClaim = {
  text: 'Vaccines cause autism',
  claimant: 'Someone',
  claimReview: [
    {
      publisher: { name: 'FactCheck.org' },
      url: 'https://factcheck.org/a',
      textualRating: 'False',
    },
    { publisher: { name: 'Evil' }, url: 'javascript:alert(1)', textualRating: 'False' },
  ],
};

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('createGoogleFactCheckProvider', () => {
  it('requires an API key', () => {
    expect(() => createGoogleFactCheckProvider({ apiKey: '' })).toThrow(
      expect.objectContaining({ code: 'MISSING_API_KEY' }),
    );
  });

  it('queries the endpoint with the normalized sentence and key', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ claims: [apiClaim] }));
    const provider = createGoogleFactCheckProvider({
      apiKey: 'k',
      endpoint: 'https://api.test/claims:search',
      fetchImpl,
    });

    const claims = await provider.check('Vaccines   cause\nautism.');

    const url = new URL(fetchImpl.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.test/claims:search');
    expect(url.searchParams.get('query')).toBe('Vaccines cause autism.');
    expect(url.searchParams.get('key')).toBe('k');
    expect(claims).toHaveLength(1);
  });

  it('returns no claims when the API has no matches', async () => {
    const provider = createGoogleFactCheckProvider({
      apiKey: 'k',
      fetchImpl: async () => jsonResponse({}),
    });
    expect(await provider.check('The Eiffel Tower is in Paris.')).toEqual([]);
  });

  it('maps a rejected key to INVALID_API_KEY', async () => {
    const provider = createGoogleFactCheckProvider({
      apiKey: 'bad',
      fetchImpl: async () => jsonResponse({}, 403),
    });
    await expect(provider.check('Some sentence here.')).rejects.toMatchObject({
      code: 'INVALID_API_KEY',
    });
  });
});

describe('normalizeClaims', () => {
  it('keeps only http(s) review links and fills in the publisher name', () => {
    const [claim] = normalizeClaims([apiClaim]);
    expect(claim.reviews).toEqual([
      { publisher: 'FactCheck.org', url: 'https://factcheck.org/a', rating: 'False', title: null },
    ]);
  });
});
