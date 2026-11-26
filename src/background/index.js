// Background service worker: owns the API key, talks to the fact-check API and records stats.
// Keeping network calls here (not in the content script) means the key never enters web pages.
import { createClaimChecker } from '../lib/claimChecker.js';
import { fail, MSG, ok, unwrap } from '../lib/messages.js';
import { missingApiKey } from '../lib/errors.js';
import { createGoogleFactCheckProvider } from '../lib/providers/googleFactCheck.js';
import { createSettingsStore, createStatsStore } from '../lib/storage.js';

/* global __FACTCHECK_ENDPOINT__ */
const settings = createSettingsStore();
const stats = createStatsStore();

let checker = null;
let checkerApiKey = null;

async function getChecker() {
  const { apiKey } = await settings.get();
  if (!apiKey) throw missingApiKey();
  if (apiKey !== checkerApiKey) {
    checker = createClaimChecker({
      provider: createGoogleFactCheckProvider({ apiKey, endpoint: __FACTCHECK_ENDPOINT__ }),
    });
    checkerApiKey = apiKey;
  }
  return checker;
}

/** One record per flagged sentence: its first review plus every publisher that reviewed it. */
function summariseFlagged(results) {
  return results
    .filter((r) => r.claims.length > 0)
    .map(({ sentence, claims }) => {
      const reviews = claims.flatMap((c) => c.reviews);
      return {
        sentence,
        publishers: [...new Set(reviews.map((r) => r.publisher))],
        publisher: reviews[0]?.publisher ?? null,
        rating: reviews[0]?.rating ?? null,
        reviewUrl: reviews[0]?.url ?? null,
      };
    });
}

async function checkSentences(sentences, pageUrl, pageTitle) {
  const results = await (await getChecker()).checkAll(sentences);
  const failures = results.filter((r) => r.error);
  // If every request failed it's a configuration problem (bad key, offline) — surface it.
  if (results.length && failures.length === results.length) throw failures[0].error;

  const flaggedClaims = summariseFlagged(results);
  await stats.record({
    url: pageUrl,
    title: pageTitle,
    checked: results.length - failures.length,
    flagged: flaggedClaims.length,
    flaggedClaims,
  });
  return results.map(({ sentence, claims, error }) => ({
    sentence,
    claims,
    error: error ? error.message : undefined,
  }));
}

/** Injects the content script into a tab and runs a scan. Exposed on globalThis for e2e tests. */
async function scanTab(tabId) {
  await chrome.scripting.insertCSS({ target: { tabId }, files: ['content/content.css'] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  return unwrap(await chrome.tabs.sendMessage(tabId, { type: MSG.SCAN_PAGE }));
}

const handlers = {
  [MSG.SCAN_TAB]: (message) => scanTab(message.tabId),
  [MSG.CHECK_SENTENCES]: (message) =>
    checkSentences(message.sentences, message.pageUrl, message.pageTitle),
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) return false;
  handler(message).then(
    (data) => sendResponse(ok(data)),
    (error) => sendResponse(fail(error)),
  );
  return true;
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL && !(await settings.get()).apiKey) {
    chrome.runtime.openOptionsPage();
  }
});

globalThis.ermActually = { scanTab };
