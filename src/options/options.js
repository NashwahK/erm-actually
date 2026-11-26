import { createSettingsStore, createStatsStore } from '../lib/storage.js';

const settings = createSettingsStore();
const stats = createStatsStore();
const $ = (id) => document.getElementById(id);

const setStatus = (text) => ($('status').textContent = text);

settings.get().then(({ apiKey }) => ($('api-key').value = apiKey));

$('settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  await settings.set({ apiKey: $('api-key').value.trim() });
  setStatus('Saved.');
});

$('reset-stats').addEventListener('click', async () => {
  if (!confirm('Reset all statistics and achievements?')) return;
  await stats.reset();
  setStatus('Statistics reset.');
});
