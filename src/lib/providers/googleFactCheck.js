// Google Fact Check Tools API provider.
// A provider is any object with `check(sentence) → Promise<Claim[]>`; see README "Adding a provider".
import { missingApiKey, providerError } from '../errors.js';
import { safeHttpUrl } from '../safeUrl.js';
import { normalizeQuery } from '../sentences.js';

export const GOOGLE_FACT_CHECK_ENDPOINT =
  'https://factchecktools.googleapis.com/v1alpha1/claims:search';

export function createGoogleFactCheckProvider({
  apiKey,
  endpoint = GOOGLE_FACT_CHECK_ENDPOINT,
  fetchImpl = (...args) => fetch(...args),
  pageSize = 5,
}) {
  if (!apiKey) throw missingApiKey();

  return {
    id: 'google-fact-check',
    async check(sentence) {
      const url = new URL(endpoint);
      url.searchParams.set('query', normalizeQuery(sentence));
      url.searchParams.set('pageSize', String(pageSize));
      url.searchParams.set('key', apiKey);

      const response = await fetchImpl(url.href);
      if (!response.ok) throw providerError(response.status);
      const data = await response.json();
      return normalizeClaims(data.claims);
    },
  };
}

/** Maps the API's claim objects to the small, serialisable shape the UI needs. */
export function normalizeClaims(claims = []) {
  return claims.map((claim) => ({
    text: claim.text ?? '',
    claimant: claim.claimant ?? null,
    reviews: (claim.claimReview ?? [])
      .map((review) => ({
        publisher: review.publisher?.name || review.publisher?.site || 'Source',
        url: safeHttpUrl(review.url),
        rating: review.textualRating ?? null,
        title: review.title ?? null,
      }))
      .filter((review) => review.url),
  }));
}
