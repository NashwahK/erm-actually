// Tiny DOM builder so the dashboard never needs innerHTML (which ESLint forbids in src/).
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", else a short date. */
export function relativeTime(iso, now = new Date()) {
  const then = new Date(iso);
  const minutes = Math.round((now - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const ratingClass = (bucket) => `rating-${bucket.toLowerCase().replace(/\s+/g, '-')}`;

export const pct = (x) => `${(x * 100).toFixed(1)}%`;

export const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
