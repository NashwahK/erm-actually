# Legacy assessment and modernization (v1 → v2)

This assessment uses three sources: _Re-Engineering Legacy Software_ (ch. 1 "Understanding the
challenges of legacy projects", ch. 10 "Stop writing legacy code!"), the _Problem Detection_
lecture (code smells, polymetric views, evolution matrix) and the _Code Clones_ lecture.

## Legacy characteristics found in v1

| Legacy trait (book ch. 1)      | Evidence in v1                                                                 | Fixed in v2 by                                                    |
| ------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Poorly documented              | No README; stale comments; commit messages "Semi Final Commit", "Current code" | README, architecture table, this document, module header comments |
| Untested / untestable          | No tests; `content.js` hardcoded key, endpoint, `fetch`, `document`            | Dependency injection; 24 unit tests and 5 e2e tests               |
| Inflexible                     | New provider = edit the scan loop; stats hardcoded in 3 files                  | Provider interface; stats derived from storage in one place       |
| Technical debt                 | All dashboard/popup numbers fake; empty stub files                             | Real persisted stats; stubs deleted                               |
| Development environment        | No package manager, build, linter or setup docs                                | npm, esbuild, ESLint, Prettier, `npm run check`                   |
| Heterogeneous environments     | Manifest icon path `D:/Hack Tuah!/plugin/assets/icon.png`                      | Relative icons copied by the build                                |
| Outdated/duplicated dependency | Chart.js vendored twice by hand (one copy unused, 400 KB)                      | Chart.js from npm, pinned, tree-shaken; Dependabot                |
| Knowledge silos                | Why the popup re-injects the script etc. lived in the author's head            | Documented message flow; code review via PR + CI                  |

## Code smells (Problem Detection lecture)

| Smell                   | v1 location                                                                                                                                                                 | v2                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Long Method             | `checkForClaimsOnPage` (split, API, regex, DOM, tooltips); 85-line anonymous handler in `dashboard.js`                                                                      | `scanner.scan` orchestrates small functions; dashboard split into `createCharts`/`render`/`showTab` |
| Large Class / god file  | `content.js`: CSS, API client, parsing, DOM, UI, messaging                                                                                                                  | 4 content modules + `lib/` modules                                                                  |
| Shotgun Surgery         | Same stats in `popup.html`, `dashboard.html`, `main.js`                                                                                                                     | `buildDashboardModel(stats)`                                                                        |
| Dead code (Dayfly/Idle) | `utils/claimbuster.js`, `utils/factCheck.js` (empty), `ui/main.js` (never loaded), `assets/js/chart.js`, ~80 lines of `.dark-theme` CSS never switched on, `.popup-content` | Deleted; dark mode now follows the OS via CSS variables                                             |
| Evolution: Supernova    | "Semi Final Commit": +12,406 lines, mostly vendored library                                                                                                                 | Dependencies via npm, not committed                                                                 |
| Evolution: Pulsar       | `content.js` changed in every commit                                                                                                                                        | Responsibilities split so changes stay local                                                        |

## Code clones (Code Clones lecture)

| Clone                                                                                 | Type                                  | v2                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------- |
| Chart tooltip/axis config in both charts                                              | Exact (Type 1)                        | `lib/chartTheme.js`                                            |
| Two `go-to-dashboard-btn` handlers, one broken (`window.location = 'dashboard.html'`) | Near-miss (Type 3) with copied defect | One handler using `chrome.tabs.create`                         |
| Two Chart.js builds                                                                   | Library clone                         | One npm dependency                                             |
| `checkClaim` called again per highlight to rebuild tooltips (2× API calls)            | Logic clone                           | Claims kept in a `WeakMap` from the first call; results cached |
| Light/dark CSS duplicated per component                                               | Near-miss                             | Design tokens in `shared/theme.css`                            |

`jscpd` (token-based, like CCFinderX) on v1 reported 10 clones, all inside the vendored
Chart.js copies. The hand-written clones above were smaller than its 50-token window and were
found by reading the code. v2: **0 clones**, and CI enforces a threshold of 0.

## Defects found and fixed along the way

- **Leaked API key** committed in `content.js` and shipped to every page. _The key is still
  in git history and must be revoked in Google Cloud Console._
- **XSS:** sentence text and API-supplied publisher names/URLs went into `innerHTML`.
- Regex replacement on raw HTML could break markup and remove event listeners.
- The tooltip hid on `mouseleave`, so its links could never be clicked.
- `content.js` was injected on every page and again from the popup, which threw redeclaration errors.
- `"type": "module"` in `content_scripts` and `"icon"` in `action` are not valid manifest keys.
- API calls ran one sentence at a time with no cache.

## Practices adopted (book ch. 10)

- **Automate everything:** CI runs lint, format, clone detection, unit tests, a build with
  zip packaging, and e2e tests in real Chromium. Dependabot keeps dependencies current.
- **Small is beautiful:** every module is small and replaceable. The largest source file is
  under 120 lines.
- **Information doesn't want to be free:** documentation lives in the repository, next to the
  code, and is reviewed with it.
- **Our work is never done:** fix one "broken window" every couple of weeks; review the whole
  codebase periodically using this table as the checklist.
