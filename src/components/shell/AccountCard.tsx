import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  UserRound, QrCode, Check, Loader2, LogOut, RefreshCw, AlertCircle, Smartphone, Monitor, X,
} from 'lucide-react';
import { issueQrToken, logout, type AuthUser } from '../../lib/auth';
import { sync, lastSync, devices as listDevices, forgetDevice, deviceId, deviceName } from '../../lib/profileSync';
import { cn } from '../../lib/utils';

/**
 * Cuenta: quién sos, sincronizar a mano, entrar en el celular con un QR y ver
 * dónde quedó sesión abierta.
 *
 * El QR lleva un token de un solo uso que vive 2 minutos: escanearlo desde el
 * celular abre sesión ahí sin escribir la contraseña en una pantalla táctil,
 * que es donde más se equivoca uno.
 */
export const AccountCard: React.FC<{ user: AuthUser }> = ({ user }) => {
  const [qr, setQr] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState<'qr' | 'sync' | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [devs, setDevs] = useState<{ id: string; name: string; lastSeen: number }[]>([]);
  /* Cada navegador que entra suma un dispositivo. Con seis o siete la lista se
     comía el panel entero y empujaba fuera de pantalla todo lo que viene
     después, así que se muestran los últimos y el resto se despliega. */
  const [allDevices, setAllDevices] = useState(false);

  useEffect(() => { void listDevices().then(setDevs); }, []);
  useEffect(() => {
    if (!qr || left <= 0) return;
    const t = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [qr, left]);
  useEffect(() => { if (left === 0) setQr(null); }, [left]);

  const makeQr = async () => {
    setBusy('qr'); setMsg(null);
    try {
      const { token, expiresIn } = await issueQrToken();
      setLeft(expiresIn);
      setQr(await QRCode.toDataURL(`${location.origin}/?login=${token}`, {
        margin: 1, width: 320, color: { dark: '#12151c', light: '#ffffff' },
      }));
    } catch (e: any) {
      setMsg({ text: e?.message || 'No se pudo generar el código.', ok: false });
    } finally { setBusy(null); }
  };

  const syncNow = async () => {
    setBusy('sync'); setMsg(null);
    const r = await sync();
    setBusy(null);
    setMsg(r.ok
      ? { text: r.updatedFromServer ? 'Se trajo el progreso más avanzado. Recargando…' : 'Todo al día.', ok: true }
      : { text: r.error || 'No se pudo sincronizar.', ok: false });
    if (r.ok && r.updatedFromServer) setTimeout(() => location.reload(), 1200);
  };

  const doLogout = async () => { await logout(); location.reload(); };

  const forget = async (id: string) => {
    await forgetDevice(id).catch(() => {});
    setDevs(d => d.filter(x => x.id !== id));
  };

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const mine = deviceId();

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <UserRound size={13} className="text-brand" /> Tu cuenta
      </div>

      <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand text-brand-ink flex items-center justify-center font-serif font-semibold shrink-0">
          {(user.displayName || user.username).slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-ink truncate">{user.displayName}</div>
          <div className="text-[11px] text-ink-3 truncate">
            @{user.username}
            {lastSync() > 0 && <> · al día {new Date(lastSync()).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}</>}
          </div>
        </div>
        <button type="button" onClick={syncNow} disabled={busy !== null} className="btn btn-ghost btn-icon shrink-0" data-tip="Sincronizar ahora" aria-label="Sincronizar">
          {busy === 'sync' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {qr ? (
        <div className="rounded-xl border border-brand-line bg-brand-soft p-3 space-y-2 text-center">
          <img src={qr} alt="" className="w-36 h-36 mx-auto rounded-lg bg-white p-1.5" />
          <div className="text-[11px] text-ink-2 leading-snug">
            Escaneá desde el celular para entrar sin escribir la contraseña.<br />
            Vence en <span className="font-mono">{mm}:{ss}</span>.
          </div>
        </div>
      ) : (
        <button type="button" onClick={makeQr} disabled={busy !== null} className="btn btn-secondary w-full">
          {busy === 'qr' ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />} Entrar en el celular con QR
        </button>
      )}

      {devs.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10.5px] uppercase tracking-wider text-ink-3 px-1">Dispositivos</div>
          {[...devs].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, allDevices ? undefined : 4).map(d => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5">
              {/Celular/i.test(d.name) ? <Smartphone size={12} className="text-ink-3 shrink-0" /> : <Monitor size={12} className="text-ink-3 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] text-ink truncate">
                  {d.name}{d.id === mine && <span className="text-brand-2"> · este</span>}
                </div>
                <div className="text-[10px] text-ink-3">
                  {new Date(d.lastSeen).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' })}
                </div>
              </div>
              {d.id !== mine && (
                <button type="button" onClick={() => forget(d.id)} className="btn btn-ghost btn-icon shrink-0" aria-label={`Olvidar ${d.name}`} data-tip="Sacar de la lista">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          {devs.length > 4 && (
            <button type="button" onClick={() => setAllDevices(v => !v)} className="btn btn-ghost btn-sm w-full">
              {allDevices ? 'Ver menos' : `Ver los ${devs.length}`}
            </button>
          )}
        </div>
      )}

      {msg && (
        <div className={cn('flex items-start gap-1.5 text-[11.5px] leading-snug px-1', msg.ok ? 'text-ok' : 'text-danger')}>
          {msg.ok ? <Check size={12} className="shrink-0 mt-0.5" /> : <AlertCircle size={12} className="shrink-0 mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      <button type="button" onClick={doLogout} className="btn btn-ghost btn-sm w-full justify-start text-danger">
        <LogOut size={13} /> Cerrar sesión
      </button>
      <div className="text-[10.5px] text-ink-3 px-1">Este dispositivo: {deviceName()}</div>
    </section>
  );
};
