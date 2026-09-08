import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Youtube, Upload, Loader2, Play, Pause, Square, Volume2, VolumeX, Download, Trash2,
  Flame, AlertCircle, CheckCircle2, Music, Guitar, Drum, Mic2, Waves, Layers, ChevronRight,
} from 'lucide-react';
import { WaterfallSong } from '../lib/midiWaterfall';
import { cn } from '../lib/utils';
import { EqBars, LiveBars, SplashArt, PipelineSteps, createStemGraph, StemAnalysers } from './StemVisuals';

/* ------------------------------------------------------------------ */
/*  Tipos que devuelve /api/audio                                      */
/* ------------------------------------------------------------------ */
interface StemRef { name: string; wav: string; mp3: string; }
interface AudioJob {
  id: string;
  source: { type: 'youtube'; url: string } | { type: 'upload'; fileName: string };
  title: string;
  duration: number;
  status: 'queued' | 'downloading' | 'separating' | 'encoding' | 'done' | 'error';
  progress: number;
  step: string;
  stems: StemRef[];
  error?: string;
  thumbnail?: string;
  createdAt: number;
}
interface AudioStatus { ready: boolean; model: string; hqModel?: string; maxDurationSec: number; queue: number; running: boolean; }

const STEM_META: Record<string, { label: string; icon: React.ReactNode; color: string; hex: string }> = {
  piano:  { label: 'Piano',    icon: <Music size={14} />,  color: 'bg-orange-500',  hex: '#f97316' },
  guitar: { label: 'Guitarra', icon: <Guitar size={14} />, color: 'bg-amber-400',   hex: '#fbbf24' },
  bass:   { label: 'Bajo',     icon: <Waves size={14} />,  color: 'bg-fuchsia-500', hex: '#d946ef' },
  drums:  { label: 'Batería',  icon: <Drum size={14} />,   color: 'bg-sky-400',     hex: '#38bdf8' },
  vocals: { label: 'Voz',      icon: <Mic2 size={14} />,   color: 'bg-rose-400',    hex: '#fb7185' },
  other:  { label: 'Otros',    icon: <Layers size={14} />, color: 'bg-emerald-400', hex: '#34d399' },
};
const stemMeta = (n: string) => STEM_META[n] ?? { label: n, icon: <Layers size={14} />, color: 'bg-ink-3', hex: '#7c7a74' };

const fmt = (s: number) => { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s - m * 60)).padStart(2, '0')}`; };

interface StemStudioProps {
  onExportToWaterfall?: (song: WaterfallSong) => void;
}

/**
 * "Desde YouTube": pegás un link (o subís un archivo), el servidor separa
 * los instrumentos con Demucs y acá los mezclás: silenciás el piano para
 * tocarlo vos con el Kross 2, mandás el stem de piano a la Catarata, o
 * descargás la base sin piano como WAV 16-bit/44,1 kHz para la SD del Kross 2.
 */
export const StemStudio: React.FC<StemStudioProps> = ({ onExportToWaterfall }) => {
  const [status, setStatus] = useState<AudioStatus | null>(null);
  const [jobs, setJobs] = useState<AudioJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/audio/jobs');
      if (r.ok) setJobs(await r.json());
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    fetch('/api/audio/status').then(r => r.json()).then(setStatus).catch(() => setStatus({ ready: false, model: '', maxDurationSec: 600, queue: 0, running: false }));
    refresh();
  }, [refresh]);

  // Polling mientras haya jobs en curso
  const hasActive = jobs.some(j => j.status !== 'done' && j.status !== 'error');
  useEffect(() => {
    if (!hasActive) return;
    const id = window.setInterval(refresh, 1500);
    return () => window.clearInterval(id);
  }, [hasActive, refresh]);

  const submitUrl = async () => {
    if (!url.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const r = await fetch('/api/audio/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, quality }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo crear el trabajo');
      setUrl(''); setSelectedId(j.id); await refresh();
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  };

  const submitFile = async (file: File) => {
    setSubmitting(true); setError(null);
    try {
      const r = await fetch(`/api/audio/jobs/upload?quality=${quality}`, { method: 'POST', headers: { 'X-Filename': encodeURIComponent(file.name), 'Content-Type': 'application/octet-stream' }, body: file });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo subir el archivo');
      setSelectedId(j.id); await refresh();
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const removeJob = async (id: string) => {
    await fetch(`/api/audio/jobs/${id}`, { method: 'DELETE' });
    if (selectedId === id) setSelectedId(null);
    refresh();
  };

  const selected = jobs.find(j => j.id === selectedId) ?? null;

  return (
    <section className="card p-5 space-y-5 relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <div className="eyebrow flex items-center gap-1.5"><Youtube size={12} /> Desde YouTube · separar instrumentos</div>
          <h2 className="font-serif font-semibold text-xl text-ink mt-1">Armá tu base para el Kross 2</h2>
          <p className="text-[13px] text-ink-2 leading-relaxed mt-1">
            Pegá un link y el servidor separa la canción en piano, guitarra, bajo, batería, voz y otros.
            Silenciá el piano para tocarlo vos, mandá el stem de piano a la Catarata de Tonos, o descargá la base sin piano en WAV para la SD del Kross 2.
          </p>
        </div>
        <div className="hidden md:flex flex-col items-center gap-1 shrink-0 -my-4">
          <SplashArt className="w-[260px] h-auto" spinning={jobs.some(j => j.status !== 'done' && j.status !== 'error')} />
          {status && (
            <div className={cn('badge -mt-3', status.ready ? 'badge-ok' : 'badge-danger')}>
              {status.ready ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
              {status.ready ? `Servidor listo · ${status.model} · máx. ${Math.round(status.maxDurationSec / 60)} min` : 'Herramientas de audio no instaladas'}
            </div>
          )}
        </div>
        {status && !status.ready && (
          <div className="badge badge-danger md:hidden self-start"><AlertCircle size={11} /> Herramientas de audio no instaladas</div>
        )}
      </div>

      {/* Entrada */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-brand-line">
          <Youtube size={16} className="text-ink-3 shrink-0" />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitUrl(); }}
            placeholder="https://www.youtube.com/watch?v=…"
            className="flex-1 bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            disabled={submitting || !status?.ready}
          />
        </div>
        <button type="button" onClick={submitUrl} disabled={submitting || !url.trim() || !status?.ready} className="btn btn-primary">
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Layers size={15} />} Separar instrumentos
        </button>
        <input ref={fileRef} type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) submitFile(f); }} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={submitting || !status?.ready} className="btn btn-secondary" title="Separar un archivo de audio propio">
          <Upload size={15} /> <span className="hidden sm:inline">Archivo</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-2">
        <span>Calidad de separación:</span>
        <div className="seg">
          <button type="button" className="seg-item" data-active={quality === 'fast'} onClick={() => setQuality('fast')}>Rápida</button>
          <button type="button" className="seg-item" data-active={quality === 'high'} onClick={() => setQuality('high')}>Alta · mejor voz y bajo</button>
        </div>
        <span className="text-[11px] text-ink-3">{quality === 'high' ? `Suma ${status?.hqModel ?? 'htdemucs_ft'} para voz, bajo y batería: ~4× más lento, voz mucho más limpia.` : 'Un solo pase de htdemucs_6s: ~1 min por cada 3–4 min de canción.'}</span>
      </div>
      {error && <div className="badge badge-danger"><AlertCircle size={11} /> {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Biblioteca */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3">Canciones procesadas</div>
          {jobs.length === 0 && <div className="text-[12.5px] text-ink-3 card-2 p-4">Todavía no hay canciones. Pegá un link de YouTube arriba.</div>}
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {jobs.map(j => {
              const active = j.status !== 'done' && j.status !== 'error';
              return (
                <div
                  key={j.id}
                  onClick={() => setSelectedId(j.id)}
                  className={cn('rounded-xl border p-3 cursor-pointer transition-colors', selectedId === j.id ? 'border-brand-line bg-brand-soft/40' : 'border-line bg-surface-2 hover:border-line-strong')}
                >
                  <div className="flex items-start gap-2.5">
                    {j.thumbnail ? <img src={j.thumbnail} alt="" className="w-14 h-10 rounded-md object-cover shrink-0 bg-surface-3" /> : <div className="w-14 h-10 rounded-md bg-surface-3 flex items-center justify-center text-ink-3 shrink-0"><Music size={16} /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-ink truncate">{j.title}</div>
                      <div className="text-[11px] text-ink-3 flex items-center gap-1.5">
                        {j.duration > 0 && <span className="font-mono">{fmt(j.duration)}</span>}
                        {j.status === 'done' && <span className="text-ok">· {j.stems.length} pistas</span>}
                        {j.status === 'error' && <span className="text-danger">· Error</span>}
                        {active && <span className="text-brand-2">· {j.step}</span>}
                      </div>
                      {active && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <EqBars bars={8} height={14} className="w-12 shrink-0" />
                          <div className="progress h-1.5 flex-1"><span style={{ width: `${Math.max(3, j.progress * 100)}%` }} /></div>
                        </div>
                      )}
                      {j.status === 'error' && <div className="text-[11px] text-danger mt-1 line-clamp-2">{j.error}</div>}
                    </div>
                    {!active && (
                      <button type="button" onClick={e => { e.stopPropagation(); removeJob(j.id); }} className="btn btn-ghost btn-icon text-ink-3 hover:text-danger" aria-label="Eliminar" data-tip="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mezclador */}
        <div className="lg:col-span-8">
          {selected && selected.status === 'done' ? (
            <StemMixer key={selected.id} job={selected} onExportToWaterfall={onExportToWaterfall} />
          ) : selected ? (
            <div className="card-2 p-6 h-full min-h-[320px] flex flex-col items-center justify-center text-center gap-4 fade-up">
              {selected.status === 'error' ? (
                <>
                  <AlertCircle size={30} className="text-danger" />
                  <div className="text-sm font-semibold text-ink">No se pudo procesar</div>
                  <div className="text-[12.5px] text-ink-2 max-w-md">{selected.error}</div>
                </>
              ) : (
                <>
                  <EqBars bars={28} height={56} className="w-72" />
                  <div>
                    <div className="text-[15px] font-semibold text-ink">{selected.title !== (selected.source as any).url ? selected.title : 'Leyendo el video…'}</div>
                    <div className="text-[12.5px] text-brand-2 mt-0.5">{selected.step}</div>
                  </div>
                  <PipelineSteps status={selected.status} progress={selected.progress} />
                  <div className="text-[11.5px] text-ink-3 max-w-sm">Separar en CPU tarda ~1 min por cada 3–4 min de canción. Podés seguir usando la app mientras tanto: la lista se actualiza sola.</div>
                </>
              )}
            </div>
          ) : (
            <div className="card-2 p-6 h-full min-h-[320px] flex flex-col items-center justify-center text-center gap-3 fade-up">
              <SplashArt className="w-64 h-auto" />
              <div className="font-serif font-semibold text-lg text-ink">Tu banda, a tu medida</div>
              <div className="text-[13px] text-ink-2 max-w-sm">Pegá un link de YouTube o elegí una canción procesada. Silenciá el instrumento que querés tocar vos y llevate la base al Kross 2.</div>
              <EqBars bars={20} height={22} active={false} className="w-56 mt-1" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  Mezclador de stems (reproducción sincronizada con <audio>)         */
/* ------------------------------------------------------------------ */
interface StemMixerProps { job: AudioJob; onExportToWaterfall?: (song: WaterfallSong) => void; }

const StemMixer: React.FC<StemMixerProps> = ({ job, onExportToWaterfall }) => {
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [solo, setSolo] = useState<string | null>(null);
  const [gains, setGains] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const audios = useRef<Map<string, HTMLAudioElement>>(new Map());
  const graphRef = useRef<{ ctx: AudioContext; analysers: StemAnalysers } | null>(null);
  const [analysers, setAnalysers] = useState<StemAnalysers | null>(null);

  const audible = useCallback((name: string) => solo ? name === solo : !muted.has(name), [solo, muted]);

  // Crear los <audio> una vez
  useEffect(() => {
    const map = audios.current;
    job.stems.forEach(s => {
      const a = new Audio(s.mp3);
      a.preload = 'auto';
      map.set(s.name, a);
    });
    const first = map.get(job.stems[0]?.name);
    const onTime = () => setTime(first?.currentTime ?? 0);
    const onEnd = () => setPlaying(false);
    first?.addEventListener('timeupdate', onTime);
    first?.addEventListener('ended', onEnd);
    return () => {
      first?.removeEventListener('timeupdate', onTime);
      first?.removeEventListener('ended', onEnd);
      map.forEach(a => { a.pause(); a.src = ''; });
      map.clear();
      graphRef.current?.ctx.close().catch(() => {});
      graphRef.current = null;
    };
  }, [job]);

  // Aplicar volumen / mute
  useEffect(() => {
    audios.current.forEach((a, name) => { a.volume = audible(name) ? Math.min(1, gains[name] ?? 1) : 0; });
  }, [muted, solo, gains, audible]);

  const play = async () => {
    // Grafo de audio (analizadores) al primer play: requiere gesto del usuario
    if (!graphRef.current) {
      try { graphRef.current = createStemGraph(audios.current); setAnalysers(graphRef.current.analysers); } catch { /* sin visualización */ }
    }
    await graphRef.current?.ctx.resume().catch(() => {});
    const list = Array.from(audios.current.values());
    const t = list[0]?.currentTime ?? 0;
    list.forEach(a => { a.currentTime = t; });
    await Promise.all(list.map(a => a.play().catch(() => {})));
    setPlaying(true);
  };
  const pause = () => { audios.current.forEach(a => a.pause()); setPlaying(false); };
  const stop = () => { audios.current.forEach(a => { a.pause(); a.currentTime = 0; }); setPlaying(false); setTime(0); };
  const seek = (t: number) => { audios.current.forEach(a => { a.currentTime = t; }); setTime(t); };

  const excluded = job.stems.map(s => s.name).filter(n => !audible(n));
  const mixUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (excluded.length) p.set('exclude', excluded.join(','));
    const g = Object.entries(gains).filter(([n, v]) => v !== 1 && !excluded.includes(n)).map(([n, v]) => `${n}:${v.toFixed(2)}`);
    if (g.length) p.set('gain', g.join(','));
    const q = p.toString();
    return `/api/audio/jobs/${job.id}/mix.wav${q ? `?${q}` : ''}`;
  }, [job.id, excluded, gains]);

  const [sensitivity, setSensitivity] = useState(0.5);

  /** Pide al servidor la transcripción multipista (voz y bajo en modo monofónico) y la manda a la Catarata. */
  const transcribe = async (stemNames: string[]) => {
    if (!onExportToWaterfall) return;
    const wanted = stemNames.filter(n => n !== 'drums' && job.stems.some(s => s.name === n));
    if (wanted.length === 0) { setTranscribeError('La batería no tiene notas; elegí otro instrumento.'); return; }
    setTranscribing(wanted.join('+')); setTranscribeError(null); setTranscribeProgress(0);
    const tick = window.setInterval(() => setTranscribeProgress(p => Math.min(0.9, p + 0.04)), 500);
    try {
      const r = await fetch(`/api/audio/jobs/${job.id}/notes?stems=${encodeURIComponent(wanted.join(','))}&sensitivity=${sensitivity}`);
      const song: WaterfallSong = await r.json();
      if (!r.ok) throw new Error((song as any).error || 'No se pudo transcribir');
      setTranscribeProgress(1);
      onExportToWaterfall(song);
    } catch (e: any) { setTranscribeError(e.message || 'Error al transcribir'); } finally { window.clearInterval(tick); setTranscribing(null); }
  };

  const pianoLike = job.stems.find(s => s.name === 'piano') ? 'piano' : job.stems[0]?.name;

  return (
    <div className="card-2 p-4 space-y-4 fade-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink truncate">{job.title}</div>
          <div className="text-[11.5px] text-ink-3">{job.stems.length} pistas · {fmt(job.duration)} · {job.source.type === 'youtube' ? 'YouTube' : 'archivo propio'}</div>
        </div>
        {job.source.type === 'youtube' && (
          <a href={job.source.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm text-ink-3"><Youtube size={14} /> Ver</a>
        )}
      </div>

      {/* Transporte */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={playing ? pause : play} className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shrink-0" aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {playing ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
        </button>
        <button type="button" onClick={stop} className="w-9 h-9 rounded-full bg-surface-3 border border-line text-ink-2 flex items-center justify-center shrink-0" aria-label="Detener"><Square size={12} className="fill-current" /></button>
        <span className="font-mono text-xs text-ink tabular-nums">{fmt(time)} <span className="text-ink-3">/ {fmt(job.duration)}</span></span>
        <input type="range" min={0} max={job.duration || 1} step={0.1} value={time} onChange={e => seek(parseFloat(e.target.value))} className="flex-1 accent-orange-500" aria-label="Posición" />
      </div>
      <div className="h-14 rounded-xl bg-[#0c1220] border border-line overflow-hidden px-2">
        <LiveBars analyser={analysers?.master ?? null} color="#e5b53f" bars={48} active={playing} mirror />
      </div>

      {/* Stems */}
      <div className="space-y-1.5">
        {job.stems.map(s => {
          const m = stemMeta(s.name);
          const on = audible(s.name);
          return (
            <div key={s.name} className={cn('flex items-center gap-2 rounded-lg border px-2 py-1.5', on ? 'border-line bg-surface' : 'border-transparent bg-surface/40 opacity-60')}>
              <span className={cn('w-2 h-2 rounded-full shrink-0', m.color)} />
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink w-24 shrink-0">{m.icon} {m.label}</span>
              <div className="w-20 h-6 shrink-0 hidden sm:block">
                <LiveBars analyser={analysers?.byName.get(s.name) ?? null} color={m.hex} bars={14} active={playing && on} />
              </div>
              <button type="button" onClick={() => setMuted(prev => { const n = new Set(prev); n.has(s.name) ? n.delete(s.name) : n.add(s.name); return n; })} className={cn('w-7 h-7 rounded-md border border-line text-[11px] flex items-center justify-center', muted.has(s.name) ? 'text-danger' : 'text-ink-2')} aria-label={muted.has(s.name) ? 'Activar' : 'Silenciar'} data-tip={muted.has(s.name) ? 'Activar' : 'Silenciar (la tocás vos)'}>
                {muted.has(s.name) ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <button type="button" onClick={() => setSolo(v => (v === s.name ? null : s.name))} className={cn('w-7 h-7 rounded-md border border-line text-[11px] font-mono font-bold flex items-center justify-center', solo === s.name ? 'bg-brand text-brand-ink border-brand' : 'text-ink-3')} aria-label="Solo" data-tip="Solo">S</button>
              <input type="range" min={0} max={1} step={0.02} value={gains[s.name] ?? 1} onChange={e => setGains(g => ({ ...g, [s.name]: parseFloat(e.target.value) }))} className="flex-1 accent-[var(--color-brand)]" aria-label={`Volumen ${m.label}`} />
              <a href={s.wav} download className="btn btn-ghost btn-icon text-ink-3" data-tip="Descargar WAV" aria-label="Descargar WAV"><Download size={14} /></a>
            </div>
          );
        })}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line">
        <a href={mixUrl} className="btn btn-primary" download>
          <Download size={15} /> Descargar base para Kross 2 {excluded.length > 0 && <span className="text-[11px] opacity-80">(sin {excluded.map(n => stemMeta(n).label.toLowerCase()).join(', ')})</span>}
        </a>
        {onExportToWaterfall && pianoLike && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" disabled={!!transcribing} onClick={() => transcribe(job.stems.map(s => s.name))} className="btn btn-secondary">
              {transcribing ? <Loader2 size={15} className="animate-spin" /> : <Flame size={15} className="text-orange-400" />}
              {transcribing ? `Transcribiendo… ${Math.round(transcribeProgress * 100)}%` : 'Todos los instrumentos a la Catarata'}
              {!transcribing && <ChevronRight size={14} />}
            </button>
            <select
              className="bg-surface-2 border border-line rounded-lg text-xs text-ink px-2 py-2"
              value=""
              onChange={e => { if (e.target.value) transcribe([e.target.value]); }}
              disabled={!!transcribing}
              aria-label="Transcribir solo un instrumento"
            >
              <option value="">Solo uno…</option>
              {job.stems.filter(s => s.name !== 'drums').map(s => <option key={s.name} value={s.name}>{stemMeta(s.name).label}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-[11px] text-ink-3 ml-1" title="Más alto = más notas (y más ruido)">
              Sensibilidad
              <input type="range" min={0.2} max={0.9} step={0.05} value={sensitivity} onChange={e => setSensitivity(parseFloat(e.target.value))} className="w-20 accent-[var(--color-brand)]" disabled={!!transcribing} />
              <span className="font-mono text-ink-2">{Math.round(sensitivity * 100)}%</span>
            </label>
          </div>
        )}
      </div>
      {transcribeError && <div className="badge badge-danger">{transcribeError}</div>}
      <p className="text-[11px] text-ink-3">
        La base se exporta como WAV 16-bit · 44,1 kHz estéreo con las pistas silenciadas fuera de la mezcla: copiala a la tarjeta SD del Kross 2 y reproducila desde su reproductor de audio mientras tocás la parte que silenciaste.
      </p>
    </div>
  );
};
