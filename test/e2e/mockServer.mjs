// Local stand-in for the Google Fact Check API plus a static server for the fixture pages.
// Used by the e2e tests so they run offline and without a real API key.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 4599;
const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');
const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };

// query substring → fact-check reviews returned for it
const KNOWN_MYTHS = {
  'moon landing': [{ publisher: 'Reuters Fact Check', rating: 'False' }],
  'vaccines cause autism': [
    { publisher: 'FactCheck.org', rating: 'False' },
    { publisher: 'Health Feedback', rating: 'Incorrect' },
  ],
  'climate change is a myth': [{ publisher: 'Climate Feedback', rating: 'Incorrect' }],
  mars: [{ publisher: 'PolitiFact', rating: 'Pants on Fire' }],
  'covid-19 was a hoax': [{ publisher: 'AFP Fact Check', rating: 'False' }],
  '5g technology causes cancer': [{ publisher: 'Full Fact', rating: 'False' }],
  // Claims on fake-news.html
  '5g networks spread covid': [{ publisher: 'Reuters Fact Check', rating: 'False' }],
  '5g towers spread the coronavirus': [{ publisher: 'Full Fact', rating: 'False' }],
  microchips: [{ publisher: 'AP Fact Check', rating: 'False' }],
  'faked in a studio': [{ publisher: 'Snopes', rating: 'False' }],
  'climate change is a hoax': [{ publisher: 'Climate Feedback', rating: 'Incorrect' }],
  'great wall of china is visible': [{ publisher: 'Snopes', rating: 'False' }],
  '10 percent of their brains': [{ publisher: 'Science Feedback', rating: 'False' }],
  'drinking bleach': [{ publisher: 'AFP Fact Check', rating: 'False' }],
  'obama was not born': [{ publisher: 'PolitiFact', rating: 'Pants on Fire' }],
  chemtrails: [{ publisher: 'USA Today Fact Check', rating: 'False' }],
  'election was stolen': [{ publisher: 'FactCheck.org', rating: 'False' }],
  'carrots dramatically improves': [{ publisher: 'Snopes', rating: 'Mostly False' }],
  'cracking your knuckles causes arthritis': [{ publisher: 'Health Feedback', rating: 'False' }],
  'lightning never strikes the same place twice.': [{ publisher: 'Snopes', rating: 'False' }],
  'wind turbines cause cancer': [{ publisher: 'PolitiFact', rating: 'Pants on Fire' }],
  // A hostile publisher name: must render as text, never as HTML.
  'world ends by 2027': [{ publisher: '<img src=x onerror="window.__pwned=1">', rating: 'False' }],
};

function claimsFor(query) {
  const q = query.toLowerCase();
  return Object.entries(KNOWN_MYTHS)
    .filter(([needle]) => q.includes(needle))
    .map(([needle, reviews]) => ({
      text: query,
      claimReview: reviews.map((r, i) => ({
        publisher: { name: r.publisher },
        url: `https://factcheck.example/${encodeURIComponent(needle)}/${i}`,
        textualRating: r.rating,
      })),
    }));
}

export const requests = [];

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (url.pathname === '/v1alpha1/claims:search') {
    if (url.searchParams.get('key') !== 'test-key') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'API key not valid' } }));
    }
    const claims = claimsFor(url.searchParams.get('query') ?? '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(claims.length ? { claims } : {}));
  }

  try {
    const file = path.join(fixtures, path.normalize(url.pathname).replace(/^[/\\]+/, ''));
    if (!file.startsWith(fixtures)) throw new Error('outside fixtures');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Fixture pages and mock Fact Check API on http://127.0.0.1:${PORT}`);
  console.log(`  Fake news page:  http://127.0.0.1:${PORT}/fake-news.html`);
  console.log(`  News article:    http://127.0.0.1:${PORT}/article.html`);
  console.log(`  Short test page: http://127.0.0.1:${PORT}/test-article.html`);
  console.log('Press Ctrl+C to stop.');
});
