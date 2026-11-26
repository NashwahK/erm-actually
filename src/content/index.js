// Content script entry. Injected on demand by the background worker when the user clicks
// "Check claims", so it may run more than once per page — the guard keeps a single instance.
import { fail, MSG, ok, unwrap } from '../lib/messages.js';
import { createScanner } from './scanner.js';

if (!globalThis.__ermActuallyLoaded) {
  globalThis.__ermActuallyLoaded = true;

  const scanner = createScanner({
    doc: document,
    checkSentences: async (sentences, page) =>
      unwrap(
        await chrome.runtime.sendMessage({
          type: MSG.CHECK_SENTENCES,
          sentences,
          pageUrl: page.url,
          pageTitle: page.title,
        }),
      ),
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== MSG.SCAN_PAGE) return false;
    scanner.scan().then(
      (summary) => sendResponse(ok(summary)),
      (error) => sendResponse(fail(error)),
    );
    return true; // keep the channel open for the async response
  });
}
