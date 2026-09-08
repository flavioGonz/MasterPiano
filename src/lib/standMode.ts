/**
 * Modo atril: el celular apoyado en el atril del piano.
 *
 * Tres cosas que el navegador da y que casi nadie usa:
 *  - Wake Lock: la pantalla no se apaga mientras practicás. Sin esto el
 *    teléfono se apaga a los 30 s y hay que tocarlo con las manos ocupadas.
 *  - Vibración: el pulso se siente en vez de sonar. Un click no compite con
 *    el piano; una vibración en el atril, sí se percibe.
 *  - Orientación: la catarata pide horizontal.
 *
 * Ninguna es imprescindible: si el navegador no la tiene, el modo igual sirve.
 */

let sentinel: WakeLockSentinel | null = null;
let reacquire: (() => void) | null = null;

export function supportsWakeLock(): boolean {
  return 'wakeLock' in navigator;
}
export function supportsVibration(): boolean {
  return typeof navigator.vibrate === 'function';
}

/**
 * Mantiene la pantalla encendida. El sistema suelta el bloqueo cuando la
 * pestaña pasa a segundo plano, así que se vuelve a pedir al regresar.
 */
export async function keepScreenAwake(): Promise<boolean> {
  if (!supportsWakeLock()) return false;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    if (!reacquire) {
      reacquire = async () => {
        if (document.visibilityState === 'visible' && sentinel !== null) {
          try { sentinel = await navigator.wakeLock.request('screen'); } catch { /* sin permiso */ }
        }
      };
      document.addEventListener('visibilitychange', reacquire);
    }
    return true;
  } catch {
    return false; // suele ser batería baja o falta de gesto del usuario
  }
}

export async function releaseScreen(): Promise<void> {
  try { await sentinel?.release(); } catch { /* ya liberado */ }
  sentinel = null;
}

export function isScreenAwake(): boolean {
  return sentinel !== null && !sentinel.released;
}

/**
 * Pulso háptico del metrónomo.
 * El primer tiempo del compás vibra más largo: se distingue sin mirar.
 */
export function pulse(strong = false): void {
  if (!supportsVibration()) return;
  try { navigator.vibrate(strong ? 45 : 18); } catch { /* el navegador puede ignorarlo */ }
}

export function stopPulse(): void {
  if (!supportsVibration()) return;
  try { navigator.vibrate(0); } catch { /* nada que cortar */ }
}

/** Fijar horizontal, para la catarata a pantalla completa en el celular. */
export async function lockLandscape(): Promise<boolean> {
  const so: any = screen.orientation;
  if (!so?.lock) return false;
  try { await so.lock('landscape'); return true; } catch { return false; }
}
export function unlockOrientation(): void {
  const so: any = screen.orientation;
  try { so?.unlock?.(); } catch { /* no todos lo permiten */ }
}

export function isTouchDevice(): boolean {
  return matchMedia('(pointer: coarse)').matches;
}
