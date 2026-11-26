// Message types exchanged between popup, background service worker and content script.
//
//   popup ──SCAN_TAB──▶ background ──SCAN_PAGE──▶ content
//                       background ◀─CHECK_SENTENCES── content
//
// Every handler answers with { ok: true, data } or { ok: false, error, code }.
export const MSG = Object.freeze({
  SCAN_TAB: 'erm/scanTab',
  SCAN_PAGE: 'erm/scanPage',
  CHECK_SENTENCES: 'erm/checkSentences',
});

export const ok = (data) => ({ ok: true, data });
export const fail = (error) => ({
  ok: false,
  error: error?.message ?? String(error),
  code: error?.code ?? 'UNKNOWN',
});

/** Unwraps a { ok, data } response, re-throwing failures as Errors with their code. */
export function unwrap(response) {
  if (!response)
    throw Object.assign(new Error('No response from extension'), { code: 'NO_RESPONSE' });
  if (!response.ok) throw Object.assign(new Error(response.error), { code: response.code });
  return response.data;
}
