import React, { useEffect, useRef, useState } from 'react';
import { Waves, Flame, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { transcribeAudio, TranscriptionResult } from '../lib/audioTranscriber';
import { WaterfallSong } from '../lib/midiWaterfall';
import { cn } from '../lib/utils';

interface AudioTranscribePanelProps {
  file: File;
  onImport: (song: WaterfallSong) => void;
}

const SPLIT_OPTIONS = [
  { midi: 55, label: 'Sol3' },
  { midi: 60, label: 'Do4' },
  { midi: 65, label: 'Fa4' },
];

/**
 * "Descomponer en notas": transcribe el audio subido en Bases .WAV a notas
 * (con sensibilidad y punto de división de manos ajustables), muestra una
 * vista previa tipo piano-roll y permite mandarlo a la Catarata de Tonos.
 */
export const AudioTranscribePanel: React.FC<AudioTranscribePanelProps> = ({ file, onImport }) => {
  const [sensitivity, setSensitivity] = useState(0.5);
  const [splitMidi, setSplitMidi] = useState(60);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Al cambiar de archivo se descarta el análisis anterior
  useEffect(() => { setResult(null); setError(null); setProgress(0); }, [file]);

  const analyze = async () => {
    setBusy(true); setError(null); setProgress(0);
    try {
      const r = await transcribeAudio(file, { sensitivity, splitMidi, onProgress: setProgress });
      setResult(r);
    } catch (e: any) {
      setError(e?.message || 'No se pudo decodificar el audio. Probá con un .wav o .mp3 estándar.');
    } finally {
      setBusy(false);
    }
  };

  // Vista previa piano-roll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0c1220'; ctx.fillRect(0, 0, W, H);
    const { song, energy } = result;
    // energía de fondo
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    const maxE = Math.max(...Array.from(energy), 1e-9);
    for (let i = 0; i < energy.length; i++) {
      const x = (i / energy.length) * W; const h = (energy[i] / maxE) * H * 0.5;
      ctx.fillRect(x, H - h, Math.max(1, W / energy.length), h);
    }
    if (song.notes.length === 0) return;
    let lo = 127, hi = 0;
    song.notes.forEach(n => { lo = Math.min(lo, n.midi); hi = Math.max(hi, n.midi); });
    lo -= 1; hi += 1;
    const rowH = H / (hi - lo + 1);
    song.notes.forEach(n => {
      const x = (n.time / song.duration) * W;
      const w = Math.max(2, (n.duration / song.duration) * W);
      const y = H - (n.midi - lo + 1) * rowH;
      ctx.fillStyle = n.hand === 'right' ? '#f97316' : '#a855f7';
      ctx.globalAlpha = 0.5 + n.velocity * 0.5;
      ctx.fillRect(x, y, w, Math.max(2, rowH - 1));
    });
    ctx.globalAlpha = 1;
    // línea de división de manos
    if (splitMidi > lo && splitMidi < hi) {
      const y = H - (splitMidi - lo + 0.5) * rowH;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]);
    }
  }, [result, splitMidi]);

  const song = result?.song;
  const rightCount = song?.notes.filter(n => n.hand === 'right').length ?? 0;
  const leftCount = (song?.notes.length ?? 0) - rightCount;

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Waves size={12} /> Descomponer en notas</div>
          <p className="text-[12.5px] text-ink-2 mt-1 leading-relaxed">
            Analiza el audio y extrae las notas (altura, inicio y duración) para practicarlas en la Catarata de Tonos.
            Funciona mejor con piano solo o melodías claras; con batería o voces aparecen notas de más.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-ink-2">
            <span>Sensibilidad</span>
            <span className="font-mono text-ink">{Math.round(sensitivity * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.05} value={sensitivity} onChange={e => setSensitivity(parseFloat(e.target.value))} className="w-full accent-[var(--color-brand)]" disabled={busy} />
          <div className="text-[10.5px] text-ink-3">Bajo = solo notas fuertes · Alto = más notas (y más ruido)</div>
        </label>
        <label className="space-y-1.5">
          <div className="text-[11px] text-ink-2">División de manos</div>
          <div className="seg w-full">
            {SPLIT_OPTIONS.map(o => (
              <button key={o.midi} type="button" className="seg-item flex-1" data-active={splitMidi === o.midi} onClick={() => setSplitMidi(o.midi)} disabled={busy}>{o.label}</button>
            ))}
          </div>
          <div className="text-[10.5px] text-ink-3">Por debajo → mano izquierda (violeta); desde ahí → derecha (naranja).</div>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={analyze} disabled={busy} className={cn('btn', result ? 'btn-secondary' : 'btn-primary')}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : result ? <RefreshCw size={15} /> : <Waves size={15} />}
          {busy ? `Analizando… ${Math.round(progress * 100)}%` : result ? 'Volver a analizar' : 'Analizar audio'}
        </button>
        {song && (
          <button type="button" onClick={() => onImport(song)} className="btn btn-primary">
            <Flame size={15} /> Importar a Catarata de Tonos <ArrowRight size={14} />
          </button>
        )}
      </div>

      {busy && (
        <div className="progress"><span style={{ width: `${progress * 100}%` }} /></div>
      )}
      {error && <div className="badge badge-danger">{error}</div>}

      {song && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
            <span><strong className="text-ink font-mono">{song.notesCount}</strong> notas</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1" />{rightCount} derecha</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-fuchsia-500 mr-1" />{leftCount} izquierda</span>
            <span><strong className="text-ink font-mono">{song.bpm}</strong> bpm estimados</span>
            <span><strong className="text-ink font-mono">{song.duration.toFixed(1)}</strong> s</span>
            <span className="badge badge-neutral">{song.difficulty}</span>
          </div>
          <canvas ref={canvasRef} className="w-full h-32 rounded-xl border border-line block" />
          {song.notesCount === 0 && (
            <div className="text-[12px] text-warn">No se detectaron notas. Subí la sensibilidad o probá con un audio más limpio.</div>
          )}
        </div>
      )}
    </div>
  );
};
