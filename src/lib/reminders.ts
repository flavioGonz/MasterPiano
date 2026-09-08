/**
 * Recordatorio de la rutina diaria, con la app abierta.
 *
 * Éste es el aviso que corre en la pestaña: a la hora elegida, o al abrir la
 * app después de esa hora, avisa que la ronda quedó pendiente. Sirve para el
 * celular apoyado en el atril, que es donde la app queda abierta.
 *
 * Para que el aviso llegue con la app cerrada está `push.ts`: ahí el mensaje
 * lo manda el servidor por Web Push y lo muestra el service worker. Los dos
 * conviven —el de acá comprueba de verdad si faltan escalas, el del servidor
 * llega siempre— y ninguno avisa dos veces el mismo día.
 */
import { loadRoutine, roundDoneToday, todayRound, scaleLabel } from './scaleRoutine';

const KEY = 'pianomaster_reminder';
const LAST_KEY = 'pianomaster_reminder_last';

export interface ReminderConfig { enabled: boolean; hour: number; minute: number }

export const DEFAULT_REMINDER: ReminderConfig = { enabled: false, hour: 19, minute: 0 };

export function loadReminder(): ReminderConfig {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && typeof c.hour === 'number') return { ...DEFAULT_REMINDER, ...c };
  } catch { /* se usa el default */ }
  return DEFAULT_REMINDER;
}

export function saveReminder(c: ReminderConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* modo privado */ }
}

export function supportsNotifications(): boolean {
  return typeof Notification !== 'undefined';
}

export function permission(): NotificationPermission | 'unsupported' {
  return supportsNotifications() ? Notification.permission : 'unsupported';
}

export async function askPermission(): Promise<NotificationPermission> {
  if (!supportsNotifications()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

const todayKey = () => new Date().toDateString();

/** Avisa una sola vez por día, aunque la app se abra diez veces. */
function alreadyToday(): boolean {
  try { return localStorage.getItem(LAST_KEY) === todayKey(); } catch { return false; }
}
function markToday() {
  try { localStorage.setItem(LAST_KEY, todayKey()); } catch { /* modo privado */ }
}

async function show(title: string, body: string) {
  if (permission() !== 'granted') return;
  try {
    // Vía service worker cuando hay: así la notificación sobrevive a la pestaña
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) {
      await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'rutina-diaria' });
      return;
    }
    new Notification(title, { body, icon: '/icon-192.png', tag: 'rutina-diaria' });
  } catch { /* el navegador puede negarse sin gesto del usuario */ }
}

function dueNow(c: ReminderConfig, now = new Date()): boolean {
  return now.getHours() > c.hour || (now.getHours() === c.hour && now.getMinutes() >= c.minute);
}

/** Comprueba y avisa si corresponde. Devuelve true si mostró el aviso. */
export async function checkReminder(now = new Date()): Promise<boolean> {
  const c = loadReminder();
  if (!c.enabled || alreadyToday() || !dueNow(c, now)) return false;
  const routine = loadRoutine();
  if (roundDoneToday(routine)) return false;
  const round = todayRound(routine);
  if (!round.length) return false;
  markToday();
  await show(
    'Te faltan tus 3 escalas de hoy',
    round.map(scaleLabel).join(' · '),
  );
  return true;
}

/**
 * Deja el recordatorio andando mientras la app esté abierta. Chequea cada
 * minuto —es barato— y también al volver del segundo plano.
 */
export function startReminderWatch(): () => void {
  void checkReminder();
  const timer = window.setInterval(() => { void checkReminder(); }, 60_000);
  const onVisible = () => { if (document.visibilityState === 'visible') void checkReminder(); };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
