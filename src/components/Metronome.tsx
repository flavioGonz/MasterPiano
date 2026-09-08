import React, { useState, useEffect, useRef } from 'react';
import type * as ToneNS from 'tone';
import { Play, Pause, Plus, Minus, Vibrate, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { pulse, stopPulse, supportsVibration } from '../lib/standMode';

export const Metronome: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(72);
  const [currentBeat, setCurrentBeat] = useState(0);
  /* Pulso háptico: sobre el atril del piano, un click no se escucha por encima
     del instrumento, pero la vibración del teléfono sí se siente. Se recuerda
     la elección porque es de las cosas que se activan una vez y quedan. */
  const [haptic, setHaptic] = useState<boolean>(() => localStorage.getItem('pianomaster_metro_haptic') === '1');
  const hapticRef = useRef(haptic);
  const [muted, setMuted] = useState<boolean>(() => localStorage.getItem('pianomaster_metro_muted') === '1');
  const mutedRef = useRef(muted);
  useEffect(() => { hapticRef.current = haptic; localStorage.setItem('pianomaster_metro_haptic', haptic ? '1' : '0'); }, [haptic]);
  useEffect(() => { mutedRef.current = muted; localStorage.setItem('pianomaster_metro_muted', muted ? '1' : '0'); }, [muted]);
  const canVibrate = supportsVibration();

  const clickHighRef = useRef<ToneNS.Synth | null>(null);
  const clickLowRef = useRef<ToneNS.Synth | null>(null);
  const intervalIdRef = useRef<number | null>(null);

  /* El metrónomo vive en la barra superior, o sea que está en todas las
     pantallas. Si importara Tone.js de entrada, esos ~330 kB se bajarían
     siempre, aunque nadie lo encienda: se traen al darle play, que además es
     el gesto que el navegador necesita para dejar sonar el audio. */
  const readyRef = useRef(false);
  const ensureAudio = async () => {
    const Tone = await import('tone');
    await Tone.start();
    if (readyRef.current) return;
    const mk = (vol: number) => {
      const s = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
      }).toDestination();
      s.volume.value = vol;
      return s;
    };
    clickHighRef.current = mk(-4);
    clickLowRef.current = mk(-8);
    readyRef.current = true;
  };

  useEffect(() => () => {
    clickHighRef.current?.dispose();
    clickLowRef.current?.dispose();
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
  }, []);

  const togglePlay = () => {
    void ensureAudio();
    if (isPlaying) {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      stopPulse();
      setIsPlaying(false);
      setCurrentBeat(0);
    } else {
      setIsPlaying(true);
      let beat = 0;
      const intervalMs = (60 / bpm) * 1000;
      
      const tick = () => {
        const strong = beat % 4 === 0;
        if (!mutedRef.current) {
          if (strong) clickHighRef.current?.triggerAttackRelease('C6', '32n');
          else clickLowRef.current?.triggerAttackRelease('G5', '32n');
        }
        // El primer tiempo vibra más largo: se distingue el compás sin mirar
        if (hapticRef.current) pulse(strong);
        setCurrentBeat(beat % 4);
        beat++;
      };

      tick();
      intervalIdRef.current = window.setInterval(tick, intervalMs);
    }
  };

  // Restart interval on BPM change while playing
  useEffect(() => {
    if (isPlaying) {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      let beat = currentBeat;
      const intervalMs = (60 / bpm) * 1000;
      intervalIdRef.current = window.setInterval(() => {
        const strong = beat % 4 === 0;
        if (!mutedRef.current) {
          if (strong) clickHighRef.current?.triggerAttackRelease('C6', '32n');
          else clickLowRef.current?.triggerAttackRelease('G5', '32n');
        }
        if (hapticRef.current) pulse(strong);
        setCurrentBeat(beat % 4);
        beat++;
      }, intervalMs);
    }
  }, [bpm, isPlaying]);

  return (
    <div className="inline-flex items-center gap-2 h-10 pl-3 pr-1.5 rounded-xl bg-surface border border-line">
      {/* BPM */}
      <div className="flex items-baseline gap-1.5 font-mono">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">BPM</span>
        <span className="text-[15px] font-semibold text-ink tabular-nums w-8 text-center">{bpm}</span>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setBpm(prev => Math.max(40, prev - 4))}
          className="w-7 h-7 rounded-lg text-ink-2 hover:text-ink hover:bg-surface-2 flex items-center justify-center"
          aria-label="Disminuir tempo"
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          onClick={() => setBpm(prev => Math.min(220, prev + 4))}
          className="w-7 h-7 rounded-lg text-ink-2 hover:text-ink hover:bg-surface-2 flex items-center justify-center"
          aria-label="Aumentar tempo"
        >
          <Plus size={13} />
        </button>
      </div>

      {canVibrate && (
        <button
          type="button"
          onClick={() => setHaptic(v => !v)}
          aria-pressed={haptic}
          className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
            haptic ? 'bg-brand-soft text-brand-2 border border-brand-line' : 'text-ink-3 hover:text-ink hover:bg-surface-2')}
          data-tip="Vibrar el pulso: se siente en el atril aunque no se escuche"
          aria-label="Pulso vibrado"
        >
          <Vibrate size={13} />
        </button>
      )}
      {canVibrate && (
        <button
          type="button"
          onClick={() => setMuted(v => !v)}
          aria-pressed={muted}
          className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
            muted ? 'bg-surface-3 text-ink-3 line-through' : 'text-ink-2 hover:text-ink hover:bg-surface-2')}
          data-tip={muted ? 'Click silenciado: solo vibración' : 'Silenciar el click y dejar solo la vibración'}
          aria-label="Silenciar el click"
        >
          <Volume2 size={13} />
        </button>
      )}

      {/* Luces de compás */}
      <div className="flex items-center gap-1 px-1" aria-hidden>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-100",
              isPlaying && currentBeat === i
                ? i === 0 ? "bg-brand scale-150 shadow-[0_0_8px_var(--color-brand)]" : "bg-ink scale-125"
                : "bg-surface-3"
            )}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
          isPlaying
            ? "bg-danger-soft text-danger border border-danger/30"
            : "bg-brand text-brand-ink hover:bg-brand-2"
        )}
        aria-pressed={isPlaying}
      >
        {isPlaying ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
        <span className="hidden xl:inline">{isPlaying ? 'Parar' : 'Metrónomo'}</span>
      </button>
    </div>
  );
};
