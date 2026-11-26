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

server.listen(PORT, '127.0.0.1', () =>
  console.log(`Mock fact-check API on http://127.0.0.1:${PORT}`),
);
