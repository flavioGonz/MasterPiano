import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Download, Check, Loader2, Trash2, Shuffle, WifiOff, AlertCircle, Eye, Clock, X,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface VideoPick {
  id: string;
  title: string;
  channel: string;
  views: number;
  duration: number;
}

const fmtViews = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.0', '')} M`
    : n >= 1000 ? `${Math.round(n / 1000)} mil`
    : String(n);

const fmtDur = (s: number) => {
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

const fmtSize = (b: number) => b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.round(b / 1e6)} MB`;

/**
 * El video de la lección.
 *
 * Tres decisiones:
 *
 *  - **No se carga el reproductor hasta que lo pedís.** Se muestra la miniatura
 *    y recién al tocar play entra el iframe. La página abre mucho más rápido y
 *    YouTube no te rastrea por el solo hecho de leer la lección.
 *  - **`youtube-nocookie.com`**, que es el dominio sin cookies de seguimiento.
 *  - **La descarga es tuya y opt-in.** Nada se baja solo; el botón está a la
 *    vista y dice cuánto ocupa. Si el video existe en el servidor, se
 *    reproduce ese archivo y ya no depende de que YouTube siga teniéndolo.
 */
export const LessonVideo: React.FC<{
  lessonId: string; query: string; title: string;
  /** Video elegido a mano para esta lección; si ya no existe, se busca. */
  pinnedId?: string;
}> = ({ lessonId, query, title, pinnedId }) => {
  const [video, setVideo] = useState<VideoPick | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [dl, setDl] = useState<{ status: string; progress: number; bytes?: number } | null>(null);
  const [alts, setAlts] = useState<VideoPick[] | null>(null);
  const [altsLoading, setAltsLoading] = useState(false);
  const poll = useRef<number | null>(null);
  const altsRef = useRef<HTMLDivElement | null>(null);

  const load = async (refresh = false) => {
    setLoading(true); setError(null); setPlaying(false);
    try {
      const r = await fetch(
        `/api/videos/lesson/${encodeURIComponent(lessonId)}?q=${encodeURIComponent(query)}`
        + (pinnedId && !refresh ? `&pin=${encodeURIComponent(pinnedId)}` : '')
        + (refresh ? '&refresh=1' : ''),
        { credentials: 'same-origin' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'no se pudo buscar el video');
      setVideo(d.video); setOffline(Boolean(d.offline));
    } catch (e: any) {
      setError(e?.message || 'no se pudo buscar el video');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); return () => { if (poll.current) clearInterval(poll.current); }; }, [lessonId]);

  const startDownload = async () => {
    if (!video) return;
    setDl({ status: 'downloading', progress: 0 });
    await fetch(`/api/videos/${video.id}/download`, { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    // Se consulta el estado cada 1,5 s: bajar una clase de 10 minutos lleva un rato
    poll.current = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/videos/${video.id}/status`, { credentials: 'same-origin' });
        const d = await r.json();
        setDl(d);
        if (d.status === 'done') { setOffline(true); if (poll.current) clearInterval(poll.current); }
        if (d.status === 'error') { if (poll.current) clearInterval(poll.current); }
      } catch { /* se reintenta en el próximo tick */ }
    }, 1500);
  };

  const removeDownload = async () => {
    if (!video) return;
    await fetch(`/api/videos/${video.id}/download`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    setOffline(false); setDl(null); setPlaying(false);
  };

  const openAlternatives = async () => {
    setAltsLoading(true);
    try {
      const r = await fetch(`/api/videos/search?q=${encodeURIComponent(query)}`, { credentials: 'same-origin' });
      const d = await r.json();
      setAlts(d.results || []);
    } catch { setAlts([]); } finally { setAltsLoading(false); }
    // La lista abre debajo del video: si queda fuera de pantalla no se ve que pasó algo.
    window.setTimeout(() => altsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 350);
  };

  const pick = async (v: VideoPick) => {
    await fetch(`/api/videos/lesson/${encodeURIComponent(lessonId)}`, {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video: v }),
    }).catch(() => {});
    setAlts(null);
    await load();
  };

  if (loading) {
    return (
      <div className="aspect-video rounded-2xl border border-line bg-surface-2 flex items-center justify-center gap-2 text-ink-3 text-sm">
        <Loader2 size={16} className="animate-spin" /> Buscando el mejor video para esta lección…
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="rounded-2xl border border-line bg-surface-2 px-4 py-5 flex items-start gap-3">
        <AlertCircle size={16} className="text-warn shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] text-ink">No se pudo traer el video de esta lección.</div>
          <div className="text-[12px] text-ink-3 mt-0.5">{error}</div>
        </div>
        <button type="button" onClick={() => load(true)} className="btn btn-secondary btn-sm shrink-0">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-line bg-black">
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 w-full h-full"
            aria-label={`Reproducir: ${video.title}`}
          >
            <img
              src={`https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`}
              onError={e => { (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`; }}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-16 h-16 rounded-full bg-brand text-brand-ink flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                <Play size={26} className="fill-current ml-1" />
              </span>
            </span>
            <span className="absolute left-4 right-4 bottom-3 text-left">
              <span className="block text-white text-[14px] font-medium leading-snug line-clamp-2 drop-shadow">
                {video.title}
              </span>
              <span className="block text-white/70 text-[11.5px] mt-0.5">{video.channel}</span>
            </span>
            {offline && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-lg bg-black/70 backdrop-blur px-2 py-1 text-[11px] text-white">
                <Check size={11} className="text-emerald-400" /> Guardado
              </span>
            )}
          </button>
        ) : offline ? (
          // Copia propia: no depende de que YouTube siga teniendo el video
          <video src={`/api/videos/${video.id}/file`} controls autoPlay className="w-full h-full bg-black" />
        ) : (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&hl=es`}
            title={video.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0"
          />
        )}
      </div>

      {/* Ficha y acciones */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11.5px] text-ink-3">
        <span className="inline-flex items-center gap-1"><Eye size={12} /> {fmtViews(video.views)} vistas</span>
        <span className="inline-flex items-center gap-1"><Clock size={12} /> {fmtDur(video.duration)}</span>
        {offline && dl?.bytes ? <span className="text-ok">· copia local {fmtSize(dl.bytes)}</span> : null}

        <span className="ml-auto flex items-center gap-1.5">
          {offline ? (
            <button type="button" onClick={removeDownload} className="btn btn-ghost btn-sm" data-tip="Borrar la copia del servidor">
              <Trash2 size={13} /> Borrar copia
            </button>
          ) : dl?.status === 'downloading' ? (
            <span className="inline-flex items-center gap-1.5 text-brand-2">
              <Loader2 size={13} className="animate-spin" /> Descargando {Math.round((dl.progress || 0) * 100)} %
            </span>
          ) : dl?.status === 'error' ? (
            <span className="inline-flex items-center gap-1.5 text-danger"><AlertCircle size={13} /> No se pudo descargar</span>
          ) : (
            <button type="button" onClick={startDownload} className="btn btn-ghost btn-sm" data-tip="Guardarlo en el servidor por si mañana no está">
              <Download size={13} /> Ver sin conexión
            </button>
          )}
          <button type="button" onClick={openAlternatives} className="btn btn-ghost btn-sm" data-tip="Buscar otro video para esta lección">
            {altsLoading ? <Loader2 size={13} className="animate-spin" /> : <Shuffle size={13} />} Otro
          </button>
        </span>
      </div>

      {!offline && (
        <div className="flex items-start gap-1.5 text-[11px] text-ink-3">
          <WifiOff size={11} className="shrink-0 mt-0.5" />
          <span>Se reproduce desde YouTube. Si querés que siga estando el día que el video desaparezca, guardalo vos.</span>
        </div>
      )}

      {/* Otros candidatos */}
      <AnimatePresence>
        {alts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div ref={altsRef} className="card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="eyebrow">Otros videos para esta lección</div>
                <button type="button" onClick={() => setAlts(null)} className="btn btn-ghost btn-icon" aria-label="Cerrar"><X size={13} /></button>
              </div>
              {alts.length === 0 && <div className="text-[12.5px] text-ink-3 py-2">No aparecieron otros.</div>}
              {alts.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => pick(v)}
                  className={cn('w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2 transition-colors',
                    v.id === video.id && 'ring-1 ring-brand-line')}
                >
                  <img src={`https://i.ytimg.com/vi/${v.id}/default.jpg`} alt="" referrerPolicy="no-referrer"
                       className="w-14 h-10 object-cover rounded shrink-0" loading="lazy" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-ink truncate">{v.title}</span>
                    <span className="block text-[11px] text-ink-3 truncate">
                      {v.channel} · {fmtViews(v.views)} vistas · {fmtDur(v.duration)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
