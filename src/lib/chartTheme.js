// One place for chart styling (v1 copy-pasted the same tooltip/axis config into every chart).

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function chartTheme() {
  const text = css('--text-muted');
  return {
    accentPalette: [css('--accent'), '#f59e0b', '#d97706', '#b45309', '#92400e'],
    tooltip: {
      backgroundColor: css('--surface-inverse'),
      titleColor: css('--text-inverse'),
      bodyColor: css('--text-inverse'),
    },
    legendLabels: { color: text, font: { size: 13 } },
    axis: (showGrid) => ({
      ticks: { color: text, precision: 0 },
      grid: showGrid ? { color: css('--border') } : { display: false },
      beginAtZero: true,
    }),
  };
}
