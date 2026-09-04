import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Plus, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

export const Metronome: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(72);
  const [currentBeat, setCurrentBeat] = useState(0);

  const clickHighRef = useRef<Tone.Synth | null>(null);
  const clickLowRef = useRef<Tone.Synth | null>(null);
  const intervalIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Sharp click sounds
    clickHighRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }
    }).toDestination();
    clickHighRef.current.volume.value = -4;

    clickLowRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }
    }).toDestination();
    clickLowRef.current.volume.value = -8;

    return () => {
      clickHighRef.current?.dispose();
      clickLowRef.current?.dispose();
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, []);

  const togglePlay = () => {
    Tone.start();
    if (isPlaying) {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      setIsPlaying(false);
      setCurrentBeat(0);
    } else {
      setIsPlaying(true);
      let beat = 0;
      const intervalMs = (60 / bpm) * 1000;
      
      const tick = () => {
        if (beat % 4 === 0) {
          clickHighRef.current?.triggerAttackRelease('C6', '32n');
        } else {
          clickLowRef.current?.triggerAttackRelease('G5', '32n');
        }
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
        if (beat % 4 === 0) {
          clickHighRef.current?.triggerAttackRelease('C6', '32n');
        } else {
          clickLowRef.current?.triggerAttackRelease('G5', '32n');
        }
        setCurrentBeat(beat % 4);
        beat++;
      }, intervalMs);
    }
  }, [bpm, isPlaying]);

  return (
    <div className="glass px-4 py-2.5 rounded-2xl flex items-center gap-4 text-xs font-mono border border-white/10">
      <div className="flex items-center gap-1.5 text-amber-400 font-semibold uppercase tracking-wider">
        <span>BPM</span>
        <span className="text-white text-sm w-8 text-center">{bpm}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setBpm(prev => Math.max(40, prev - 4))}
          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/70"
          title="Disminuir tempo"
        >
          <Minus size={12} />
        </button>
        <button
          type="button"
          onClick={() => setBpm(prev => Math.min(220, prev + 4))}
          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/70"
          title="Aumentar tempo"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Beat Lights */}
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-100",
              isPlaying && currentBeat === i
                ? i === 0 ? "bg-amber-400 scale-125 shadow-[0_0_8px_#f59e0b]" : "bg-emerald-400 scale-110"
                : "bg-white/10"
            )}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-xl font-medium transition-all",
          isPlaying
            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            : "bg-amber-400 text-black hover:bg-amber-300 shadow"
        )}
      >
        {isPlaying ? (
          <>
            <Pause size={12} />
            <span>Pausar</span>
          </>
        ) : (
          <>
            <Play size={12} />
            <span>Metrónomo</span>
          </>
        )}
      </button>
    </div>
  );
};
