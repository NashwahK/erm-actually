import { MSG, unwrap } from '../lib/messages.js';
import { createStatsStore } from '../lib/storage.js';

const $ = (id) => document.getElementById(id);
const stats = createStatsStore();

async function renderStats() {
  const { totalChecked, totalFlagged } = await stats.get();
  $('claims-count').textContent = totalChecked.toLocaleString();
  $('flagged-count').textContent = totalFlagged.toLocaleString();
}

function setStatus(text, isError = false) {
  $('status').textContent = text;
  $('status').classList.toggle('status-error', isError);
}

async function checkClaims() {
  const button = $('check-claims-btn');
  button.disabled = true;
  setStatus('Checking claims…');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { checked, flagged, failed } = unwrap(
      await chrome.runtime.sendMessage({ type: MSG.SCAN_TAB, tabId: tab.id }),
    );
    const failedNote = failed ? ` (${failed} could not be checked)` : '';
    setStatus(
      checked + failed === 0
        ? 'No sentences to check on this page.'
        : `Checked ${checked} sentences, flagged ${flagged}${failedNote}.`,
    );
  } catch (error) {
    const blocked = /Cannot access|chrome:\/\/|extensions gallery/i.test(error.message);
    setStatus(blocked ? 'Browser pages can’t be fact-checked.' : error.message, true);
  } finally {
    button.disabled = false;
    renderStats();
  }
}

$('check-claims-btn').addEventListener('click', checkClaims);
$('dashboard-btn').addEventListener('click', () =>
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') }),
);
$('settings-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());

renderStats();
