// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearHighlights, highlightSentence } from '../../src/content/highlighter.js';
import { createScanner } from '../../src/content/scanner.js';
import { renderTooltipContent } from '../../src/content/tooltip.js';

const claim = (publisher = 'FactCheck.org') => ({
  text: 'x',
  reviews: [{ publisher, url: 'https://factcheck.org/x', rating: 'False' }],
});

beforeEach(() => {
  document.body.replaceChildren();
});

describe('highlightSentence', () => {
  it('wraps a sentence that spans a link without destroying the link', () => {
    document.body.innerHTML =
      '<p id="p">Intro. The <a href="/moon">moon landing</a> was a hoax. Outro.</p>';
    const p = document.getElementById('p');
    const link = p.querySelector('a');
    const onClick = vi.fn();
    link.addEventListener('click', (event) => {
      event.preventDefault();
      onClick();
    });

    const spans = highlightSentence(p, 'The moon landing was a hoax.');

    expect(spans).toHaveLength(3);
    expect(spans.map((s) => s.textContent).join('')).toBe('The moon landing was a hoax.');
    expect(p.querySelector('a')).toBe(link); // same node, listeners intact
    link.click();
    expect(onClick).toHaveBeenCalled();
    expect(p.textContent).toBe('Intro. The moon landing was a hoax. Outro.');
  });

  it('treats page text as text, never as HTML', () => {
    document.body.innerHTML = '<p id="p">&lt;img src=x onerror=alert(1)&gt; is a claim here.</p>';
    const p = document.getElementById('p');
    highlightSentence(p, '<img src=x onerror=alert(1)> is a claim here.');
    expect(p.querySelector('img')).toBeNull();
  });

  it('clearHighlights restores the original DOM', () => {
    document.body.innerHTML = '<p id="p">Vaccines cause autism. Fine.</p>';
    const p = document.getElementById('p');
    highlightSentence(p, 'Vaccines cause autism.');
    clearHighlights(document.body);
    expect(p.innerHTML).toBe('Vaccines cause autism. Fine.');
  });
});

describe('renderTooltipContent', () => {
  it('renders publisher names as text, not markup', () => {
    const fragment = renderTooltipContent(document, [claim('<b onclick="x()">Evil</b>')]);
    const div = document.createElement('div');
    div.append(fragment);
    expect(div.querySelector('b')).toBeNull();
    expect(div.querySelector('a').textContent).toBe('<b onclick="x()">Evil</b>');
    expect(div.querySelector('a').rel).toBe('noopener noreferrer');
  });
});

describe('createScanner', () => {
  it('sends each unique sentence once and highlights only flagged ones', async () => {
    document.body.innerHTML = `
      <p>The moon landing was a hoax. The Eiffel Tower is located in Paris.</p>
      <blockquote>The moon landing was a hoax.</blockquote>`;
    const checkSentences = vi.fn(async (sentences) =>
      sentences.map((sentence) => ({
        sentence,
        claims: sentence.includes('hoax') ? [claim()] : [],
      })),
    );
    const scanner = createScanner({ doc: document, checkSentences });

    const summary = await scanner.scan();

    expect(checkSentences).toHaveBeenCalledTimes(1);
    expect(checkSentences.mock.calls[0][0]).toEqual([
      'The moon landing was a hoax.',
      'The Eiffel Tower is located in Paris.',
    ]);
    expect(summary).toEqual({ checked: 2, flagged: 1, failed: 0 });
    expect(document.querySelectorAll('.erm-highlight')).toHaveLength(2);

    const span = document.querySelector('.erm-highlight');
    span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(scanner.tooltip.element.hidden).toBe(false);
    expect(scanner.tooltip.element.textContent).toContain('FactCheck.org');

    // Scanning again does not double-wrap.
    await scanner.scan();
    expect(document.querySelectorAll('.erm-highlight')).toHaveLength(2);
  });
});
