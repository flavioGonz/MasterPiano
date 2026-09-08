/**
 * Suscripción del navegador al recordatorio con la app cerrada.
 *
 * El servidor guarda la hora y manda el mensaje; acá sólo se pide permiso, se
 * obtiene la suscripción del navegador y se la entrega. La hora viaja junto
 * con el desfase horario del dispositivo, así el servidor sabe qué es "las 7
 * de la tarde" para quien la eligió sin tener que suponer la zona.
 */

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && typeof Notification !== 'undefined';
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try { return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready); }
  catch { return null; }
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

/** base64url → Uint8Array, que es lo que pide `applicationServerKey`. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function enablePush(hour: number, minute: number): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: 'Este navegador no puede recibir avisos con la app cerrada.' };
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, error: 'Hace falta permitir las notificaciones.' };

  const reg = await registration();
  if (!reg) return { ok: false, error: 'El service worker todavía no está listo.' };

  try {
    const r = await fetch('/api/push/key', { credentials: 'same-origin' });
    const { publicKey } = await r.json();
    if (!publicKey) throw new Error('el servidor no tiene claves VAPID');

    const sub = await reg.pushManager.getSubscription()
      ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
      });

    const save = await fetch('/api/push/subscribe', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        hour, minute,
        // getTimezoneOffset() devuelve el signo al revés de lo intuitivo
        tzOffsetMinutes: -new Date().getTimezoneOffset(),
      }),
    });
    if (!save.ok) throw new Error('el servidor rechazó la suscripción');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'No se pudo activar el aviso.' };
  }
}

export async function disablePush(): Promise<void> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try { await sub.unsubscribe(); } catch { /* ya no estaba */ }
  await fetch('/api/push/subscribe', {
    method: 'DELETE', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => { /* queda sin uso y el servidor la descarta al fallar */ });
}

/** Manda uno ahora mismo, para comprobar el camino completo. */
export async function testPush(): Promise<boolean> {
  try {
    const r = await fetch('/api/push/test', { method: 'POST', credentials: 'same-origin' });
    return r.ok;
  } catch { return false; }
}
