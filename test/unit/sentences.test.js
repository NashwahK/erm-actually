import { describe, expect, it } from 'vitest';
import { extractClaimCandidates, normalizeQuery, splitSentences } from '../../src/lib/sentences.js';

describe('splitSentences', () => {
  it('splits on sentence punctuation and returns exact substrings', () => {
    const text = 'The moon landing was a hoax. Water freezes at 0 degrees Celsius!  Is it true?';
    const sentences = splitSentences(text);
    expect(sentences).toEqual([
      'The moon landing was a hoax.',
      'Water freezes at 0 degrees Celsius!',
      'Is it true?',
    ]);
    sentences.forEach((s) => expect(text).toContain(s));
  });
});

describe('extractClaimCandidates', () => {
  it('drops fragments that are too short to be claims and de-duplicates', () => {
    const text = 'Yes. Vaccines cause autism. Vaccines cause autism. OK then.';
    expect(extractClaimCandidates(text)).toEqual(['Vaccines cause autism.']);
  });

  it('drops very long run-on text', () => {
    expect(extractClaimCandidates(`${'word '.repeat(100)}.`)).toEqual([]);
  });
});

describe('normalizeQuery', () => {
  it('collapses whitespace', () => {
    expect(normalizeQuery('  Climate\n change   is a myth. ')).toBe('Climate change is a myth.');
  });
});
