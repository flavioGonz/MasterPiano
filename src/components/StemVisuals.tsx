import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Barras tipo ecualizador (CSS, sin audio): decorativas / "en curso"   */
/* ------------------------------------------------------------------ */
interface EqBarsProps { bars?: number; active?: boolean; className?: string; color?: string; height?: number; }
export const EqBars: React.FC<EqBarsProps> = ({ bars = 12, active = true, className, color = 'var(--color-brand)', height = 28 }) => (
  <div className={cn('flex items-end gap-[3px]', className)} style={{ height }} aria-hidden>
    {Array.from({ length: bars }).map((_, i) => (
      <span
        key={i}
        className={cn('eq-bar', !active && 'eq-bar-idle')}
        style={{
          background: color,
          animationDelay: `${(i * 0.11) % 1.1}s`,
          animationDuration: `${0.9 + ((i * 7) % 5) * 0.12}s`,
        }}
      />
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Analizador de espectro real por <audio> (Web Audio AnalyserNode)   */
/* ------------------------------------------------------------------ */
export interface StemAnalysers { master: AnalyserNode | null; byName: Map<string, AnalyserNode>; }

/**
 * Conecta cada <audio> a un AnalyserNode y a un bus maestro. El volumen se
 * sigue manejando con `audio.volume` (aplica antes del MediaElementSource).
 * Se crea a demanda en el primer play (autoplay policy).
 */
export function createStemGraph(audios: Map<string, HTMLAudioElement>): { ctx: AudioContext; analysers: StemAnalysers } {
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  const ctx = new Ctx();
  const master = ctx.createAnalyser();
  master.fftSize = 512; master.smoothingTimeConstant = 0.82;
  master.connect(ctx.destination);
  const byName = new Map<string, AnalyserNode>();
  audios.forEach((a, name) => {
    const src = ctx.createMediaElementSource(a);
    const an = ctx.createAnalyser();
    an.fftSize = 256; an.smoothingTimeConstant = 0.8;
    src.connect(an); an.connect(master);
    byName.set(name, an);
  });
  return { ctx, analysers: { master, byName } };
}

/** Canvas de barras alimentado por un AnalyserNode (o animación idle si no hay). */
interface LiveBarsProps { analyser: AnalyserNode | null; color: string; bars?: number; className?: string; active: boolean; mirror?: boolean; }
export const LiveBars: React.FC<LiveBarsProps> = ({ analyser, color, bars = 24, className, active, mirror = false }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf = 0;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const levels = new Float32Array(bars);
    let t = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (W === 0) { raf = requestAnimationFrame(draw); return; }
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      t += 0.04;
      if (analyser && data && active) {
        analyser.getByteFrequencyData(data);
        // Agrupar bins en escala ~logarítmica
        const n = data.length;
        for (let i = 0; i < bars; i++) {
          const a = Math.floor(Math.pow(i / bars, 1.6) * n * 0.7);
          const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / bars, 1.6) * n * 0.7));
          let s = 0; for (let k = a; k < b; k++) s += data[k];
          const v = (s / (b - a)) / 255;
          levels[i] = Math.max(v, levels[i] * 0.85);
        }
      } else {
        for (let i = 0; i < bars; i++) {
          const target = active ? 0.15 + 0.12 * Math.abs(Math.sin(t * 1.3 + i * 0.7)) : 0.08 + 0.04 * Math.abs(Math.sin(t * 0.6 + i * 0.5));
          levels[i] += (target - levels[i]) * 0.1;
        }
      }
      const gap = 2; const bw = (W - gap * (bars - 1)) / bars;
      ctx.fillStyle = color;
      for (let i = 0; i < bars; i++) {
        const h = Math.max(2, levels[i] * H);
        const x = i * (bw + gap);
        ctx.globalAlpha = 0.35 + levels[i] * 0.65;
        if (mirror) ctx.fillRect(x, H / 2 - h / 2, bw, h);
        else ctx.fillRect(x, H - h, bw, h);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, color, bars, active, mirror]);
  return <canvas ref={ref} className={cn('block w-full h-full', className)} aria-hidden />;
};

/* ------------------------------------------------------------------ */
/*  Arte SVG animado: disco + ondas + notas (splash / estado vacío)     */
/* ------------------------------------------------------------------ */
export const SplashArt: React.FC<{ className?: string; spinning?: boolean }> = ({ className, spinning = true }) => (
  <svg viewBox="0 0 320 200" className={className} aria-hidden>
    <defs>
      <linearGradient id="sa-gold" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#f2cc66" /><stop offset="1" stopColor="#c2410c" />
      </linearGradient>
      <linearGradient id="sa-violet" x1="0" x2="1">
        <stop offset="0" stopColor="#d8b4fe" /><stop offset="1" stopColor="#7e22ce" />
      </linearGradient>
      <radialGradient id="sa-glow"><stop offset="0" stopColor="#e5b53f" stopOpacity="0.35" /><stop offset="1" stopColor="#e5b53f" stopOpacity="0" /></radialGradient>
    </defs>
    <circle cx="160" cy="100" r="95" fill="url(#sa-glow)" className="sa-breathe" />
    {/* anillos que se expanden */}
    {[0, 1, 2].map(i => (
      <circle key={i} cx="160" cy="100" r="40" fill="none" stroke="#e5b53f" strokeWidth="1.2" className="sa-ring" style={{ animationDelay: `${i * 1.1}s` }} />
    ))}
    {/* disco */}
    <g className={spinning ? 'sa-spin' : undefined} style={{ transformOrigin: '160px 100px' }}>
      <circle cx="160" cy="100" r="42" fill="#0d1322" stroke="#2a3a58" strokeWidth="2" />
      <circle cx="160" cy="100" r="34" fill="none" stroke="#1f2a44" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="160" cy="100" r="26" fill="none" stroke="#1f2a44" strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="160" cy="100" r="13" fill="url(#sa-gold)" />
      <circle cx="160" cy="100" r="3" fill="#0d1322" />
    </g>
    {/* ondas izquierda / derecha */}
    <path d="M18 100 C 40 60, 60 140, 82 100 S 120 60, 120 100" fill="none" stroke="url(#sa-gold)" strokeWidth="2.5" strokeLinecap="round" className="sa-wave" />
    <path d="M200 100 C 222 140, 242 60, 264 100 S 302 140, 302 100" fill="none" stroke="url(#sa-violet)" strokeWidth="2.5" strokeLinecap="round" className="sa-wave" style={{ animationDelay: '0.6s' }} />
    {/* notas que flotan */}
    <g className="sa-float" style={{ animationDelay: '0s' }}><text x="52" y="52" fontSize="22" fill="#f2cc66" fontFamily="serif">♪</text></g>
    <g className="sa-float" style={{ animationDelay: '1.3s' }}><text x="250" y="60" fontSize="18" fill="#d8b4fe" fontFamily="serif">♫</text></g>
    <g className="sa-float" style={{ animationDelay: '2.1s' }}><text x="225" y="160" fontSize="16" fill="#67e8f9" fontFamily="serif">♩</text></g>
    {/* teclas al pie */}
    {Array.from({ length: 14 }).map((_, i) => (
      <rect key={i} x={54 + i * 15.5} y="168" width="13" height="26" rx="2" fill={i % 7 === 2 || i % 7 === 6 ? '#e5b53f' : '#2a3a58'} className="sa-key" style={{ animationDelay: `${i * 0.13}s` }} />
    ))}
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Pipeline de procesamiento (descargar → separar → preparar)          */
/* ------------------------------------------------------------------ */
const STEPS = [
  { id: 'downloading', label: 'Descargar' },
  { id: 'separating', label: 'Separar instrumentos' },
  { id: 'encoding', label: 'Preparar pistas' },
];
export const PipelineSteps: React.FC<{ status: string; progress: number }> = ({ status, progress }) => {
  const idx = Math.max(0, STEPS.findIndex(s => s.id === status));
  const done = status === 'done';
  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const state = done || i < idx ? 'done' : i === idx ? 'active' : 'todo';
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1.5 w-24">
                <span className={cn(
                  'relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-mono font-bold border',
                  state === 'done' ? 'bg-ok text-bg border-ok' : state === 'active' ? 'bg-brand text-brand-ink border-brand' : 'bg-surface-3 text-ink-3 border-line'
                )}>
                  {state === 'active' && <span className="absolute inset-0 rounded-full border-2 border-brand animate-ping opacity-60" />}
                  {state === 'done' ? '✓' : i + 1}
                </span>
                <span className={cn('text-[10.5px] text-center leading-tight', state === 'active' ? 'text-ink font-medium' : 'text-ink-3')}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 rounded-full bg-white/10 overflow-hidden -mt-5">
                  <div className={cn('h-full bg-brand transition-all duration-500', (done || i < idx) ? 'w-full' : i === idx ? 'w-1/2' : 'w-0')} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="progress h-2 relative overflow-hidden">
        <span style={{ width: `${Math.max(3, progress * 100)}%` }} />
        <span className="shimmer absolute inset-y-0 left-0 w-1/3 !bg-transparent" />
      </div>
    </div>
  );
};
