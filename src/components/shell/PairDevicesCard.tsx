import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Link2, QrCode, Check, Loader2, Unlink, RefreshCw, AlertCircle } from 'lucide-react';
import {
  isLinked, profileId, requestPairCode, claimWithCode, sync, unlink, lastSync, deviceName,
} from '../../lib/profileSync';
import { cn } from '../../lib/utils';

/**
 * Continuidad entre dispositivos, sin cuentas ni contraseñas.
 *
 * El que ya tiene el progreso emite un código de 6 dígitos que dura 10 minutos
 * y se usa una sola vez; el otro dispositivo lo escribe, o escanea el QR (que
 * es el mismo código dentro de una URL). Alcanza para una app personal en la
 * red de Infratec y evita inventar un sistema de usuarios que nadie pidió.
 */
export const PairDevicesCard: React.FC = () => {
  const [linked, setLinked] = useState(isLinked());
  const [code, setCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<'code' | 'claim' | 'sync' | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Cuenta regresiva del código
  useEffect(() => {
    if (!code || left <= 0) return;
    const t = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [code, left]);
  useEffect(() => { if (left === 0 && code) { setCode(null); setQr(null); } }, [left, code]);

  const emitCode = async () => {
    setBusy('code'); setMsg(null);
    try {
      const { code: c, expiresIn } = await requestPairCode();
      setCode(c); setLeft(expiresIn); setLinked(true);
      const url = `${location.origin}/?pair=${c}`;
      setQr(await QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#12151c', light: '#ffffff' } }));
    } catch (e: any) {
      setMsg({ text: e?.message || 'No se pudo generar el código.', ok: false });
    } finally { setBusy(null); }
  };

  const claim = async () => {
    setBusy('claim'); setMsg(null);
    const r = await claimWithCode(input.replace(/\D/g, ''));
    setBusy(null);
    if (r.ok) {
      setLinked(true);
      setMsg({ text: 'Listo: este dispositivo quedó con el mismo progreso. Recargando…', ok: true });
      setTimeout(() => location.reload(), 1200);
    } else {
      setMsg({ text: r.error || 'Código inválido o vencido.', ok: false });
    }
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

  const doUnlink = () => { unlink(); setLinked(false); setCode(null); setQr(null); setMsg(null); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <Link2 size={13} className="text-brand" /> Seguir en otro dispositivo
      </div>

      {linked ? (
        <div className="rounded-xl border border-ok/30 bg-ok-soft px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-ink-2">
            <Check size={13} className="text-ok shrink-0" />
            <span className="min-w-0">
              Progreso sincronizado
              {lastSync() > 0 && <span className="text-ink-3"> · {new Date(lastSync()).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={syncNow} disabled={busy !== null} className="btn btn-secondary btn-sm flex-1">
              {busy === 'sync' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Sincronizar
            </button>
            <button type="button" onClick={doUnlink} className="btn btn-ghost btn-sm" data-tip="Este dispositivo deja de sincronizar (el progreso local queda)">
              <Unlink size={13} />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[11.5px] text-ink-3 leading-snug px-1">
          Tu progreso vive solo en este navegador. Vinculá el celular para seguir donde dejaste.
        </p>
      )}

      {code ? (
        <div className="rounded-xl border border-brand-line bg-brand-soft p-3 space-y-2.5 text-center">
          {qr && <img src={qr} alt="" className="w-36 h-36 mx-auto rounded-lg bg-white p-1.5" />}
          <div className="font-mono text-2xl font-bold tracking-[0.3em] text-ink pl-[0.3em]">{code}</div>
          <div className="text-[11px] text-ink-2 leading-snug">
            Escaneá el QR desde el celular o escribí el código ahí. Vence en <span className="font-mono">{mm}:{ss}</span>.
          </div>
        </div>
      ) : (
        <button type="button" onClick={emitCode} disabled={busy !== null} className="btn btn-secondary w-full">
          {busy === 'code' ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />} Vincular otro dispositivo
        </button>
      )}

      <div className="flex items-center gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          placeholder="Código de 6 dígitos"
          aria-label="Código de vinculación"
          className="flex-1 min-w-0 bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono text-ink placeholder:text-ink-3 tracking-widest"
        />
        <button type="button" onClick={claim} disabled={input.length !== 6 || busy !== null} className="btn btn-primary btn-sm shrink-0 disabled:opacity-45">
          {busy === 'claim' ? <Loader2 size={13} className="animate-spin" /> : 'Canjear'}
        </button>
      </div>

      {msg && (
        <div className={cn('flex items-start gap-1.5 text-[11.5px] leading-snug px-1', msg.ok ? 'text-ok' : 'text-danger')}>
          {msg.ok ? <Check size={12} className="shrink-0 mt-0.5" /> : <AlertCircle size={12} className="shrink-0 mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="text-[10.5px] text-ink-3 px-1">Este dispositivo: {deviceName()}</div>
    </section>
  );
};
