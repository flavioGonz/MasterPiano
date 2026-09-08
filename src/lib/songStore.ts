/**
 * Piezas importadas: servidor con caché local.
 *
 * Regla: el servidor es la fuente de verdad cuando hay sesión y red; el
 * localStorage es una copia para poder abrir la app sin conexión. Si el
 * servidor no contesta, se sigue trabajando con la copia y lo que se importe
 * queda marcado como pendiente de subir.
 *
 * Las notas no se guardan en el índice local: una pieza larga son cientos de
 * KB y el localStorage se llena a las pocas. Lo que se cachea es la ficha, más
 * las últimas piezas abiertas completas.
 */
import type { WaterfallSong } from './midiWaterfall';

const INDEX_KEY = 'pianomaster_song_index_v1';
const CACHE_KEY = 'pianomaster_song_cache_v1';
const LEGACY_KEY = 'pianomaster_custom_songs_v1';
const PENDING_KEY = 'pianomaster_songs_pending_v1';
/** Cuántas piezas completas se guardan localmente para el modo sin red. */
const CACHE_LIMIT = 12;

export type SongSummary = Omit<WaterfallSong, 'notes'> & { importedAt?: number };

const readJson = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
};
const writeJson = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio o modo privado */ }
};

/* ------------------------------------------------------------------ */
/*  Índice y caché local                                               */
/* ------------------------------------------------------------------ */
export const localIndex = (): SongSummary[] => readJson<SongSummary[]>(INDEX_KEY, []);
const setLocalIndex = (list: SongSummary[]) => writeJson(INDEX_KEY, list);

const cache = (): Record<string, WaterfallSong> => readJson(CACHE_KEY, {});
function cacheSong(song: WaterfallSong) {
  const c = cache();
  c[song.id] = song;
  // Se conservan las más nuevas; el resto se vuelve a pedir al servidor
  const ids = Object.keys(c).sort((a, b) => ((c[b] as any).importedAt || 0) - ((c[a] as any).importedAt || 0));
  const trimmed: Record<string, WaterfallSong> = {};
  for (const id of ids.slice(0, CACHE_LIMIT)) trimmed[id] = c[id];
  writeJson(CACHE_KEY, trimmed);
}

const summaryOf = (s: WaterfallSong): SongSummary => {
  const { notes, ...rest } = s;
  return { ...rest, importedAt: (s as any).importedAt || Date.now() };
};

/* ------------------------------------------------------------------ */
/*  Cola de subida                                                     */
/* ------------------------------------------------------------------ */
const pending = (): string[] => readJson<string[]>(PENDING_KEY, []);
const setPending = (ids: string[]) => writeJson(PENDING_KEY, [...new Set(ids)]);

/* ------------------------------------------------------------------ */
/*  Servidor                                                           */
/* ------------------------------------------------------------------ */
async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return res.json();
}

/**
 * Migración de las piezas que quedaron en la clave vieja. Se hace una sola vez
 * y solo se borra el original después de que el servidor confirme, para que un
 * corte de red no se lleve puestas las piezas de nadie.
 */
async function migrateLegacy(): Promise<void> {
  const old = readJson<WaterfallSong[]>(LEGACY_KEY, []);
  if (!old.length) return;
  let migrated = 0;
  for (const song of old) {
    try { await api(`/api/songs/${encodeURIComponent(song.id)}`, { method: 'PUT', body: JSON.stringify(song) }); migrated++; }
    catch { /* se reintenta la próxima vez */ }
  }
  if (migrated === old.length) {
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* da igual */ }
  }
}

/** Sube lo que quedó pendiente por falta de red. */
async function flushPending(): Promise<void> {
  const ids = pending();
  if (!ids.length) return;
  const c = cache();
  const left: string[] = [];
  for (const id of ids) {
    const song = c[id];
    if (!song) continue; // se perdió la copia local: nada que subir
    try { await api(`/api/songs/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(song) }); }
    catch { left.push(id); }
  }
  setPending(left);
}

/** Listado de piezas importadas. Refresca el índice local si hay servidor. */
export async function listSongs(): Promise<SongSummary[]> {
  try {
    await migrateLegacy();
    await flushPending();
    const { songs } = await api('/api/songs');
    setLocalIndex(songs);
    return songs;
  } catch {
    return localIndex(); // sin red: lo último que sabíamos
  }
}

/** Pieza completa: primero la caché local, si no al servidor. */
export async function getSong(id: string): Promise<WaterfallSong | null> {
  const cached = cache()[id];
  if (cached) return cached;
  try {
    const { song } = await api(`/api/songs/${encodeURIComponent(id)}`);
    cacheSong(song);
    return song;
  } catch {
    return null;
  }
}

/**
 * Guardar una pieza importada. Devuelve si quedó a salvo en el servidor o solo
 * en este dispositivo — el que llama lo usa para avisar con la verdad.
 */
export async function saveSong(song: WaterfallSong): Promise<{ ok: boolean; offline: boolean }> {
  const stamped = { ...song, isCustom: true, importedAt: (song as any).importedAt || Date.now() };
  cacheSong(stamped);
  setLocalIndex([summaryOf(stamped), ...localIndex().filter(s => s.id !== stamped.id)]);
  try {
    await api(`/api/songs/${encodeURIComponent(stamped.id)}`, { method: 'PUT', body: JSON.stringify(stamped) });
    setPending(pending().filter(i => i !== stamped.id));
    return { ok: true, offline: false };
  } catch {
    setPending([...pending(), stamped.id]);
    return { ok: true, offline: true };
  }
}

export async function deleteSong(id: string): Promise<void> {
  setLocalIndex(localIndex().filter(s => s.id !== id));
  const c = cache(); delete c[id]; writeJson(CACHE_KEY, c);
  setPending(pending().filter(i => i !== id));
  try { await api(`/api/songs/${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch { /* se limpia local igual */ }
}

export const pendingCount = (): number => pending().length;
