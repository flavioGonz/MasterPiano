import React, { useEffect, useState } from 'react';
import { Smartphone, Download, Sun, Vibrate, Check, Info, Share, Bell, BellOff, BellRing } from 'lucide-react';
import {
  canInstall, onInstallAvailable, promptInstall, pwaStatus, isStandalone, isIOS,
} from '../../lib/pwa';
import {
  keepScreenAwake, releaseScreen, isScreenAwake, supportsWakeLock,
  supportsVibration, isTouchDevice,
} from '../../lib/standMode';
import {
  loadReminder, saveReminder, askPermission, permission, supportsNotifications,
} from '../../lib/reminders';
import { pushSupported, pushState, enablePush, disablePush, PushState } from '../../lib/push';
import { cn } from '../../lib/utils';

/**
 * "Modo atril": lo que el celular aporta cuando está apoyado sobre el piano.
 * Solo aparece completo donde tiene sentido — en un escritorio sin pantalla
 * táctil se muestra apenas la instalación.
 */
export const StandModeCard: React.FC = () => {
  const [installable, setInstallable] = useState(canInstall());
  const [awake, setAwake] = useState(isScreenAwake());
  const [awakeError, setAwakeError] = useState(false);
  const [reminder, setReminder] = useState(() => loadReminder());
  const [perm, setPerm] = useState(() => permission());
  /* El aviso con la app cerrada es aparte: necesita permiso, service worker y
     una suscripción guardada en el servidor, y cualquiera de las tres puede
     faltar. */
  const [push, setPush] = useState<PushState>('off');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  useEffect(() => { void pushState().then(setPush); }, []);
  const status = pwaStatus();
  const touch = isTouchDevice();
  const installed = isStandalone();

  useEffect(() => onInstallAvailable(setInstallable), []);

  const toggleAwake = async () => {
    if (awake) { await releaseScreen(); setAwake(false); return; }
    const ok = await keepScreenAwake();
    setAwake(ok);
    setAwakeError(!ok);
  };

  const toggleReminder = async () => {
    if (!reminder.enabled) {
      const p = await askPermission();
      setPerm(p);
      if (p !== 'granted') return;
    }
    const next = { ...reminder, enabled: !reminder.enabled };
    setReminder(next); saveReminder(next);
  };

  const setHour = (hour: number) => {
    const next = { ...reminder, hour };
    setReminder(next); saveReminder(next);
    // Si el aviso con la app cerrada ya estaba activo, se reprograma
    if (push === 'on') void enablePush(next.hour, next.minute);
  };

  const togglePush = async () => {
    setPushBusy(true); setPushError(null);
    if (push === 'on') {
      await disablePush();
      setPush('off');
    } else {
      const r = await enablePush(reminder.hour, reminder.minute);
      if (r.ok) {
        setPush('on');
        // Con el aviso del servidor andando, el recordatorio queda encendido
        if (!reminder.enabled) { const next = { ...reminder, enabled: true }; setReminder(next); saveReminder(next); }
        setPerm(permission());
      } else {
        setPushError(r.error ?? null);
        setPush(await pushState());
      }
    }
    setPushBusy(false);
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <Smartphone size={13} className="text-brand" /> En el celular
      </div>

      {/* Instalación */}
      {installed ? (
        <div className="flex items-center gap-2 rounded-xl border border-ok/30 bg-ok-soft px-3 py-2.5 text-[12px] text-ink-2">
          <Check size={14} className="text-ok shrink-0" /> Instalada como app. Funciona sin conexión.
        </div>
      ) : installable ? (
        <button type="button" onClick={promptInstall} className="btn btn-primary w-full">
          <Download size={14} /> Instalar PianoMaster
        </button>
      ) : !status.ok ? (
        <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[11.5px] text-ink-2 leading-snug">
          <Info size={13} className="text-brand shrink-0 mt-0.5" />
          <span>{status.reason}</span>
        </div>
      ) : isIOS() ? (
        <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[11.5px] text-ink-2 leading-snug">
          <Share size={13} className="text-brand shrink-0 mt-0.5" />
          <span>Para instalarla: Compartir → <strong className="text-ink">Agregar a la pantalla de inicio</strong>.</span>
        </div>
      ) : (
        <div className="text-[11.5px] text-ink-3 leading-snug px-1">
          Se puede instalar desde el menú del navegador (Instalar aplicación).
        </div>
      )}

      {/* Pantalla siempre encendida */}
      {(touch || supportsWakeLock()) && (
        <button
          type="button"
          onClick={toggleAwake}
          aria-pressed={awake}
          disabled={!supportsWakeLock()}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-45',
            awake ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface-2 hover:bg-surface-3'
          )}
        >
          <Sun size={14} className={cn('shrink-0', awake ? 'text-brand-2' : 'text-ink-3')} />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-ink">
              {awake ? 'La pantalla no se apaga' : 'Mantener la pantalla encendida'}
            </span>
            <span className="block text-[11px] text-ink-3 leading-snug">
              {!supportsWakeLock()
                ? 'Este navegador no lo permite.'
                : awakeError
                  ? 'El sistema no lo concedió (suele ser batería baja).'
                  : 'Para dejar el celular en el atril mientras tocás.'}
            </span>
          </span>
        </button>
      )}

      {/* Recordatorio de la rutina */}
      {supportsNotifications() && (
        <div className={cn('rounded-xl border px-3 py-2.5 space-y-2',
          reminder.enabled ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface-2')}>
          <button type="button" onClick={toggleReminder} aria-pressed={reminder.enabled}
            className="w-full flex items-center gap-2.5 text-left">
            {reminder.enabled ? <Bell size={14} className="text-brand-2 shrink-0" /> : <BellOff size={14} className="text-ink-3 shrink-0" />}
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-ink">Recordarme la rutina</span>
              <span className="block text-[11px] text-ink-3 leading-snug">
                {perm === 'denied'
                  ? 'Las notificaciones están bloqueadas en este navegador.'
                  : reminder.enabled
                    ? 'Avisa si a esa hora te faltan las 3 escalas del día.'
                    : 'Un aviso por día, solo si la ronda quedó pendiente.'}
              </span>
            </span>
          </button>
          {reminder.enabled && (
            <div className="flex items-center gap-2 pl-6">
              <span className="text-[11px] text-ink-2">A las</span>
              <select
                value={reminder.hour}
                onChange={e => setHour(Number(e.target.value))}
                className="bg-surface-2 border border-line rounded-lg px-2 py-1 text-xs font-mono text-ink"
                aria-label="Hora del recordatorio"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
              <span className="text-[10.5px] text-ink-3">{push === 'on' ? 'aunque la app esté cerrada' : 'mientras la app esté abierta'}</span>
            </div>
          )}

          {/* Aviso con la app cerrada */}
          {reminder.enabled && pushSupported() && (
            <div className="pl-6 space-y-1">
              <button
                type="button"
                onClick={togglePush}
                disabled={pushBusy}
                aria-pressed={push === 'on'}
                className={cn('w-full flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                  push === 'on' ? 'border-ok/40 bg-ok-soft' : 'border-line bg-surface-2 hover:border-line-strong',
                  pushBusy && 'opacity-60 pointer-events-none')}
              >
                {push === 'on' ? <Check size={13} className="text-ok shrink-0" /> : <BellRing size={13} className="text-ink-3 shrink-0" />}
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-medium text-ink">
                    {push === 'on' ? 'Te avisa aunque cierres la app' : 'Avisarme aunque cierre la app'}
                  </span>
                  <span className="block text-[10.5px] text-ink-3 leading-snug">
                    {push === 'on'
                      ? 'El aviso lo manda el servidor a la hora que elegiste.'
                      : 'Hoy el aviso sólo aparece si la app quedó abierta.'}
                  </span>
                </span>
              </button>
              {pushError && <p className="text-[10.5px] text-danger">{pushError}</p>}
            </div>
          )}
        </div>
      )}

      {supportsVibration() && (
        <div className="flex items-start gap-2 px-1 text-[11px] text-ink-3 leading-snug">
          <Vibrate size={12} className="shrink-0 mt-0.5 text-ink-3" />
          <span>El metrónomo puede vibrar el pulso en vez de sonar: se siente en el atril aunque el piano tape el click.</span>
        </div>
      )}
    </section>
  );
};
