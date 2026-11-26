// Turns a block of page text into sentences worth sending to a fact-check provider.

const DEFAULTS = { minLength: 15, maxLength: 300, minWords: 3 };

/** Splits text into sentences. Returned strings are exact substrings of `text` (trimmed). */
export function splitSentences(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    return [...segmenter.segment(text)].map((s) => s.segment.trim()).filter(Boolean);
  }
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Sentences long enough to be a claim, de-duplicated, in page order. */
export function extractClaimCandidates(text, options = {}) {
  const { minLength, maxLength, minWords } = { ...DEFAULTS, ...options };
  const seen = new Set();
  return splitSentences(text).filter((sentence) => {
    if (sentence.length < minLength || sentence.length > maxLength) return false;
    if (sentence.split(/\s+/).length < minWords) return false;
    if (seen.has(sentence)) return false;
    seen.add(sentence);
    return true;
  });
}

/** Collapses whitespace so the same sentence always produces the same API query. */
export const normalizeQuery = (sentence) => sentence.replace(/\s+/g, ' ').trim();
