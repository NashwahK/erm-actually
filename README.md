# Erm... Actually!

A Chrome extension that checks the sentences on a page against published fact-checks and
highlights the ones that professional fact-checkers have reviewed. Hover (or tab to) a
highlight to see who reviewed it and how they rated it.

## Install (for users)

1. `npm ci && npm run build`
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `dist/`.
3. The Settings page opens on first install. Paste a **Google Fact Check Tools API key**
   (Google Cloud Console → enable "Fact Check Tools API" → Credentials → Create API key).
4. On any article, click the toolbar button → **Check claims on this page**.

The key and your statistics are stored only in `chrome.storage.local` in your browser.

## Develop

Requires Node 20+.

| Command            | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `npm run build`    | Bundle `src/` into `dist/` (esbuild)                          |
| `npm run watch`    | Rebuild JS on change                                          |
| `npm test`         | Unit tests (Vitest + jsdom)                                   |
| `npm run test:e2e` | Loads the real extension in Chromium against a local mock API |
| `npm run lint`     | ESLint                                                        |
| `npm run format`   | Prettier                                                      |
| `npm run clones`   | Code-clone detection (jscpd); CI fails on any clone           |
| `npm run check`    | Everything CI runs except e2e                                 |
| `npm run package`  | Build and zip into `release/` for the Chrome Web Store        |

The e2e tests need no API key and no internet: `test/e2e/mockServer.mjs` serves the fixture
articles and imitates the Fact Check API. Set `SCREENSHOT_DIR=/some/dir` to save screenshots, or
`HEADED=1` to watch the browser.

## Architecture

```
popup ──scanTab──▶ background service worker ──scanPage──▶ content script
                   (API key, API calls, cache,  ◀─checkSentences─ (find sentences,
                    stats)                                         highlight, tooltip)
```

| Path                                        | Responsibility                                           |
| ------------------------------------------- | -------------------------------------------------------- |
| `src/background/index.js`                   | Message routing, script injection, owns the API key      |
| `src/lib/providers/googleFactCheck.js`      | Fact Check API client → normalised `Claim[]`             |
| `src/lib/claimChecker.js`                   | Caching, de-duplication, concurrency limit               |
| `src/lib/sentences.js`                      | Sentence splitting and claim-candidate filtering         |
| `src/lib/stats.js`                          | Pure stats/achievement maths (dashboard view model)      |
| `src/lib/storage.js`                        | `chrome.storage` wrappers (injectable for tests)         |
| `src/content/highlighter.js`                | Wraps sentences via text nodes — never `innerHTML`       |
| `src/content/tooltip.js`                    | Source card, built with DOM APIs                         |
| `src/content/scanner.js`                    | One page scan, dependencies injected                     |
| `src/popup`, `src/dashboard`, `src/options` | UI pages; shared design tokens in `src/shared/theme.css` |

Design rules:

- **API calls only happen in the background worker**, so the key never reaches web pages.
- **No `innerHTML` in `src/`** (enforced by ESLint). Page text and API data are always text.
- **Modules take their dependencies as parameters** (`fetchImpl`, storage area, `doc`,
  `checkSentences`) so they can be unit-tested without a browser.
- **Content script is injected on demand** (`activeTab`), not on every site.

### Adding a provider

A provider is any object with `check(sentence) → Promise<Claim[]>` where
`Claim = { text, claimant, reviews: [{ publisher, url, rating, title }] }`.
Add a file in `src/lib/providers/`, give it unit tests with a fake `fetchImpl`, and pass it to
`createClaimChecker` in `src/background/index.js`.

## History

v1 was built in a hackathon. `docs/legacy-assessment.md` covers what made it hard to maintain
and how v2 fixed each problem.
