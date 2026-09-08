/**
 * Tema claro / oscuro.
 *
 * El tema vive en el atributo `data-theme` del <html> y lo escribe un script
 * inline en index.html ANTES del primer pintado, así no hay destello blanco
 * al recargar en oscuro (ni al revés). Este módulo solo lo cambia después.
 *
 * Tres estados en la preferencia guardada: 'light', 'dark' y 'system' (sin
 * nada guardado). "system" sigue al sistema operativo en vivo: si el celular
 * pasa a modo noche a las 20:00, la app acompaña.
 */
export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

const KEY = 'pianomaster_theme';
const listeners = new Set<(t: Theme) => void>();

export function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function getTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) || 'dark';
}

/** Color de la barra del navegador en móvil: tiene que seguir al fondo real. */
function paintBrowserChrome(theme: Theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f4f1ea' : '#0b0d12');
}

export function applyTheme(theme: Theme, animate = true) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-anim');
    window.setTimeout(() => root.classList.remove('theme-anim'), 400);
  }
  root.setAttribute('data-theme', theme);
  paintBrowserChrome(theme);
  listeners.forEach(fn => fn(theme));
}

export function setPreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // modo privado: el tema vale para esta sesión y listo
  }
  applyTheme(pref === 'system' ? systemTheme() : pref);
}

export function toggleTheme() {
  setPreference(getTheme() === 'dark' ? 'light' : 'dark');
}

export function onThemeChange(fn: (t: Theme) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Mientras la preferencia sea "system", seguir al sistema en vivo. */
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = () => { if (getPreference() === 'system') applyTheme(systemTheme()); };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
