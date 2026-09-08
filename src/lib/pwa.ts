/**
 * Registro del service worker + aviso de actualización + instalación.
 *
 * Nada de esto funciona sobre http:// salvo en localhost: el navegador exige
 * contexto seguro. En la LAN por IP la app anda igual, solo que sin instalar
 * ni offline (y sin micrófono). Por eso `pwaStatus()` explica el motivo en vez
 * de fallar en silencio.
 */
type UpdateHandler = (apply: () => void) => void;

let waitingWorker: ServiceWorker | null = null;
let deferredPrompt: any = null;
const installListeners = new Set<(can: boolean) => void>();

export function isSecure(): boolean {
  return window.isSecureContext;
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

export function pwaStatus(): { ok: boolean; reason?: string } {
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'Este navegador no soporta apps instalables.' };
  if (!isSecure()) return { ok: false, reason: 'Hace falta HTTPS: por IP en la red local el navegador no deja instalar la app ni usar el micrófono.' };
  return { ok: true };
}

export function registerServiceWorker(onUpdate?: UpdateHandler) {
  if (!pwaStatus().ok) return;

  // Registrar después de 'load' para no competir por ancho de banda con el
  // primer render. Si la página ya cargó (el efecto de React puede correr
  // después), registrar en el acto: esperar un evento que ya pasó no vuelve.
  const start = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      const track = (sw: ServiceWorker | null) => {
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          // Hay versión nueva esperando y ya había una controlando la página
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = sw;
            onUpdate?.(applyUpdate);
          }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingWorker = reg.waiting;
        onUpdate?.(applyUpdate);
      }
      track(reg.installing);
      reg.addEventListener('updatefound', () => track(reg.installing));

      // Al volver del segundo plano, chequear si hay versión nueva
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch {
      // sin service worker la app funciona igual, solo que sin offline
    }
  };

  if (document.readyState === 'complete') void start();
  else window.addEventListener('load', () => { void start(); }, { once: true });
}

function applyUpdate() {
  if (!waitingWorker) { location.reload(); return; }
  waitingWorker.postMessage('skip-waiting');
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}

/** Android/Chrome avisa cuándo se puede ofrecer la instalación. */
export function watchInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    installListeners.forEach(fn => fn(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach(fn => fn(false));
  });
}

export function canInstall(): boolean {
  return deferredPrompt !== null;
}

export function onInstallAvailable(fn: (can: boolean) => void): () => void {
  installListeners.add(fn);
  return () => { installListeners.delete(fn); };
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installListeners.forEach(fn => fn(false));
  return outcome;
}

/** iOS no tiene beforeinstallprompt: hay que decirle al usuario cómo hacerlo. */
export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
