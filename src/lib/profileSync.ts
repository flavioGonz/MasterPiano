/**
 * Cliente de sincronización de perfil.
 *
 * Regla de oro: la app sigue funcionando exactamente igual sin servidor. El
 * localStorage manda para pintar la pantalla; la sincronización es una capa
 * que corre en segundo plano y nunca bloquea nada. Si el servidor no está,
 * cada dispositivo queda como estaba.
 */
const DEVICE_KEY = 'pianomaster_device_id';
const PROGRESS_KEY = 'pianomaster_user_progress_v2';
const ROUTINE_KEY = 'pianomaster_routine_v1';
const LIBRARY_KEY = 'pianomaster_library_v1';
const LAST_SYNC_KEY = 'pianomaster_last_sync';

export interface SyncResult {
  ok: boolean;
  /** El servidor tenía una versión mejor: hay que recargar el estado local. */
  updatedFromServer?: boolean;
  error?: string;
}

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };

export function deviceId(): string {
  let id = read(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    write(DEVICE_KEY, id);
  }
  return id;
}

/** Un nombre reconocible en la lista de dispositivos vinculados. */
export function deviceName(): string {
  const ua = navigator.userAgent;
  const mobile = /android|iphone|ipad|ipod/i.test(ua);
  const os = /android/i.test(ua) ? 'Android'
    : /iphone|ipad|ipod/i.test(ua) ? 'iPhone/iPad'
    : /windows/i.test(ua) ? 'Windows'
    : /mac os/i.test(ua) ? 'Mac'
    : /linux/i.test(ua) ? 'Linux' : 'Navegador';
  return `${mobile ? 'Celular' : 'Computadora'} · ${os}`;
}

export function lastSync(): number { return Number(read(LAST_SYNC_KEY)) || 0; }

function localState() {
  let progress: unknown = null, routine: unknown = null, library: unknown = null;
  try { progress = JSON.parse(read(PROGRESS_KEY) || 'null'); } catch { /* corrupto: va null */ }
  try { routine = JSON.parse(read(ROUTINE_KEY) || 'null'); } catch { /* idem */ }
  try { library = JSON.parse(read(LIBRARY_KEY) || 'null'); } catch { /* idem */ }
  return { progress, routine, library };
}

function applyState(progress: unknown, routine: unknown, library: unknown) {
  if (progress) write(PROGRESS_KEY, JSON.stringify(progress));
  if (routine) write(ROUTINE_KEY, JSON.stringify(routine));
  if (library) write(LIBRARY_KEY, JSON.stringify(library));
}

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
 * Empujar lo local y quedarse con lo que el servidor considere bueno.
 *
 * Dos detalles que importan:
 *
 *  - **Una sola sincronización a la vez.** Dos PUT simultáneos se pisan: el
 *    primero deja `updatedAt` fresco en el servidor y el segundo, que salió
 *    con una marca de tiempo anterior, "pierde" y vuelve marcado como que ganó
 *    el servidor. Si eso dispara una recarga, la recarga vuelve a sincronizar
 *    y queda un bucle. Las llamadas concurrentes comparten la misma promesa.
 *  - **`updatedFromServer` solo si el contenido cambió de verdad.** Que el
 *    servidor "gane" no significa que traiga algo distinto; comparar el
 *    contenido evita recargar la página para nada.
 */
let inFlight: Promise<SyncResult> | null = null;

export async function sync(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { progress, routine, library } = localState();
      const data = await api('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          deviceId: deviceId(), deviceName: deviceName(),
          progress, routine, library, updatedAt: Date.now(),
        }),
      });
      let changed = false;
      if (data.tookServer) {
        changed = JSON.stringify(data.progress ?? null) !== JSON.stringify(progress ?? null)
               || JSON.stringify(data.routine ?? null) !== JSON.stringify(routine ?? null)
               || JSON.stringify(data.library ?? null) !== JSON.stringify(library ?? null);
        if (changed) applyState(data.progress, data.routine, data.library);
      }
      write(LAST_SYNC_KEY, String(Date.now()));
      return { ok: true, updatedFromServer: changed };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'sin conexión' };
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Traer el perfil del servidor y pisar lo local (al iniciar sesión). */
export async function pull(): Promise<SyncResult> {
  try {
    const data = await api('/api/profile');
    applyState(data.progress, data.routine, data.library);
    write(LAST_SYNC_KEY, String(Date.now()));
    return { ok: true, updatedFromServer: Boolean(data.progress) };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'sin conexión' };
  }
}

/** Dispositivos donde hay sesión abierta de esta cuenta. */
export async function devices(): Promise<{ id: string; name: string; lastSeen: number }[]> {
  try { return (await api('/api/profile')).devices ?? []; } catch { return []; }
}

export async function forgetDevice(id: string): Promise<void> {
  await api(`/api/profile/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * Sincroniza en los momentos que importan: al abrir, al volver del segundo
 * plano y antes de cerrar. No hay temporizador: el progreso cambia cuando se
 * aprueba una lección, no cada 30 segundos.
 */
export function startAutoSync(onServerWins?: () => void) {
  const run = async () => {
    const r = await sync();
    if (r.updatedFromServer) onServerWins?.();
  };
  void run();
  // Un solo escucha: al volver se trae lo que haya, al irse se empuja lo local
  const onChange = () => {
    if (document.visibilityState === 'visible') void run();
    else void sync();
  };
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
