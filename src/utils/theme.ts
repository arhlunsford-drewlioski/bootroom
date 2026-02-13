export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'bootroom-theme';

/** Convert hex (#RRGGBB) to "R G B" channel string for CSS variables */
function hexToChannels(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Darken a hex color by a percentage (0–1) */
function darkenHex(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Read persisted theme, default to light */
export function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

/** Persist and apply theme mode instantly */
export function setTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  if (mode === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }
}

/** Apply team accent colors as CSS variable overrides on :root */
export function applyTeamColors(primaryColor?: string, secondaryColor?: string) {
  const root = document.documentElement.style;
  if (primaryColor) {
    root.setProperty('--accent', hexToChannels(primaryColor));
    root.setProperty('--accent-dark', hexToChannels(darkenHex(primaryColor, 0.12)));
    root.setProperty('--accent-2', hexToChannels(secondaryColor || primaryColor));
  } else {
    // Clear overrides, fall back to theme defaults
    root.removeProperty('--accent');
    root.removeProperty('--accent-dark');
    root.removeProperty('--accent-2');
  }
}

/** Initialize theme on app boot */
export function initTheme() {
  setTheme(getStoredTheme());
}
