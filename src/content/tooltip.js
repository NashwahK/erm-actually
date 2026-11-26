// The hover/focus card listing fact-check sources. Built with DOM APIs only (no innerHTML).

const MAX_REVIEWS = 3;
const HIDE_DELAY_MS = 250;

export function renderTooltipContent(doc, claims) {
  const fragment = doc.createDocumentFragment();

  const heading = doc.createElement('strong');
  heading.textContent = '⚠️ Claim flagged';
  fragment.append(heading);

  const reviews = claims.flatMap((claim) => claim.reviews).slice(0, MAX_REVIEWS);
  if (!reviews.length) {
    const none = doc.createElement('p');
    none.textContent = 'Matching fact-checks were found, but none had a usable link.';
    fragment.append(none);
    return fragment;
  }

  const list = doc.createElement('ul');
  for (const review of reviews) {
    const item = doc.createElement('li');
    const link = doc.createElement('a');
    link.href = review.url; // already restricted to http(s) by the provider
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = review.publisher;
    item.append(link);
    if (review.rating) {
      const rating = doc.createElement('span');
      rating.className = 'erm-rating';
      rating.textContent = ` — rated “${review.rating}”`;
      item.append(rating);
    }
    list.append(item);
  }
  fragment.append(list);
  return fragment;
}

export function createTooltip(doc) {
  const el = doc.createElement('div');
  el.className = 'erm-tooltip';
  el.setAttribute('role', 'tooltip');
  el.hidden = true;
  doc.body.append(el);

  let hideTimer = null;
  const cancelHide = () => clearTimeout(hideTimer);

  // Keep the card open while the pointer is over it, so its links can actually be clicked.
  el.addEventListener('mouseenter', cancelHide);
  el.addEventListener('mouseleave', () => api.hideSoon());

  const api = {
    element: el,
    show(anchor, claims) {
      cancelHide();
      el.replaceChildren(renderTooltipContent(doc, claims));
      const rect = anchor.getBoundingClientRect();
      const view = doc.defaultView;
      el.style.top = `${rect.bottom + view.scrollY + 6}px`;
      el.style.left = `${Math.max(8, rect.left + view.scrollX)}px`;
      el.hidden = false;
    },
    hideSoon() {
      cancelHide();
      hideTimer = setTimeout(() => (el.hidden = true), HIDE_DELAY_MS);
    },
    hide() {
      cancelHide();
      el.hidden = true;
    },
  };
  return api;
}
