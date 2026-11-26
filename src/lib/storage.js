// Thin wrappers around a chrome.storage area. The area is injectable so tests can pass a fake.
import { EMPTY_STATS, recordScan } from './stats.js';

const STATS_KEY = 'stats';
const SETTINGS_KEY = 'settings';

const defaultArea = () => chrome.storage.local;

export function createStatsStore(area = defaultArea()) {
  let queue = Promise.resolve(); // serialise read-modify-write so parallel scans don't lose counts
  return {
    async get() {
      const { [STATS_KEY]: stats } = await area.get(STATS_KEY);
      return { ...EMPTY_STATS, ...stats };
    },
    record(scan) {
      queue = queue.then(async () => {
        const updated = recordScan(await this.get(), scan);
        await area.set({ [STATS_KEY]: updated });
        return updated;
      });
      return queue;
    },
    async reset() {
      await area.remove(STATS_KEY);
    },
  };
}

export function createSettingsStore(area = defaultArea()) {
  return {
    async get() {
      const { [SETTINGS_KEY]: settings } = await area.get(SETTINGS_KEY);
      return { apiKey: '', ...settings };
    },
    async set(patch) {
      const updated = { ...(await this.get()), ...patch };
      await area.set({ [SETTINGS_KEY]: updated });
      return updated;
    },
  };
}

export const STORAGE_KEYS = { STATS_KEY, SETTINGS_KEY };
