// Wraps sentences in highlight spans by walking text nodes — no innerHTML, no regex over markup,
// so page HTML, event listeners and links inside the sentence are left intact.

export const HIGHLIGHT_CLASS = 'erm-highlight';
export const BLOCK_SELECTOR = 'p, blockquote, li, h1, h2, h3';

/** Top-level text blocks to scan (an <li> containing a <p> is only returned once). */
export function collectBlocks(root) {
  return [...root.querySelectorAll(BLOCK_SELECTOR)].filter(
    (el) => !el.parentElement?.closest(BLOCK_SELECTOR) && !el.closest('[contenteditable="true"]'),
  );
}

function textNodesOf(block) {
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);
  return nodes;
}

/**
 * Highlights the first occurrence of `sentence` inside `block`.
 * A sentence spanning several elements (e.g. part of it is a link) gets one span per text node.
 * Returns the created spans (empty if the sentence was not found).
 */
export function highlightSentence(block, sentence) {
  const nodes = textNodesOf(block);
  const starts = [];
  let text = '';
  for (const node of nodes) {
    starts.push(text.length);
    text += node.data;
  }

  const start = text.indexOf(sentence);
  if (start === -1) return [];
  const end = start + sentence.length;

  const spans = [];
  nodes.forEach((node, i) => {
    const nodeStart = starts[i];
    const nodeEnd = nodeStart + node.data.length;
    if (nodeEnd <= start || nodeStart >= end) return;

    let target = node;
    const localStart = Math.max(start, nodeStart) - nodeStart;
    const localEnd = Math.min(end, nodeEnd) - nodeStart;
    if (localStart > 0) target = target.splitText(localStart);
    if (localEnd - localStart < target.data.length) target.splitText(localEnd - localStart);

    const span = block.ownerDocument.createElement('span');
    span.className = HIGHLIGHT_CLASS;
    target.replaceWith(span);
    span.append(target);
    spans.push(span);
  });

  // Only the first span is focusable so keyboard users get one stop per sentence.
  if (spans.length) {
    spans[0].tabIndex = 0;
    spans[0].setAttribute('role', 'button');
    spans[0].setAttribute('aria-label', `Fact-checked claim: ${sentence}`);
  }
  return spans;
}

/** Removes all highlights, restoring the original text nodes. */
export function clearHighlights(root) {
  const parents = new Set();
  root.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((span) => {
    parents.add(span.parentNode);
    span.replaceWith(...span.childNodes);
  });
  parents.forEach((parent) => parent?.normalize());
}
