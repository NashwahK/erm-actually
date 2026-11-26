// Orchestrates one page scan. Dependencies are injected so this runs under jsdom in unit tests.
import { extractClaimCandidates } from '../lib/sentences.js';
import {
  clearHighlights,
  collectBlocks,
  highlightSentence,
  HIGHLIGHT_CLASS,
} from './highlighter.js';
import { createTooltip } from './tooltip.js';

export function createScanner({ doc, checkSentences }) {
  const tooltip = createTooltip(doc);
  const claimsBySpan = new WeakMap();

  const highlightFor = (target) =>
    target instanceof doc.defaultView.Element ? target.closest(`.${HIGHLIGHT_CLASS}`) : null;

  const showFor = (event) => {
    const span = highlightFor(event.target);
    if (span && claimsBySpan.has(span)) tooltip.show(span, claimsBySpan.get(span));
  };
  const hideFor = (event) => {
    if (highlightFor(event.target)) tooltip.hideSoon();
  };

  // One delegated listener per event instead of one per highlight.
  doc.addEventListener('mouseover', showFor);
  doc.addEventListener('focusin', showFor);
  doc.addEventListener('mouseout', hideFor);
  doc.addEventListener('focusout', hideFor);
  doc.addEventListener('keydown', (event) => event.key === 'Escape' && tooltip.hide());

  async function scan() {
    tooltip.hide();
    clearHighlights(doc.body);

    const blocks = collectBlocks(doc.body).map((block) => ({
      block,
      sentences: extractClaimCandidates(block.textContent),
    }));
    const unique = [...new Set(blocks.flatMap((b) => b.sentences))];
    if (!unique.length) return { checked: 0, flagged: 0, failed: 0 };

    const results = await checkSentences(unique, { url: doc.location.href, title: doc.title });
    const flaggedClaims = new Map(
      results.filter((r) => r.claims.length > 0).map((r) => [r.sentence, r.claims]),
    );

    for (const { block, sentences } of blocks) {
      for (const sentence of sentences) {
        const claims = flaggedClaims.get(sentence);
        if (!claims) continue;
        for (const span of highlightSentence(block, sentence)) claimsBySpan.set(span, claims);
      }
    }

    return {
      checked: results.filter((r) => !r.error).length,
      flagged: flaggedClaims.size,
      failed: results.filter((r) => r.error).length,
    };
  }

  return { scan, tooltip };
}
