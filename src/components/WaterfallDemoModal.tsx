import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, X, Flame, 
  Sparkles, Hand, Sliders, CheckCircle2, ChevronRight, Zap,
  Music2, Eye
} from 'lucide-react';
import * as Tone from 'tone';
import { WaterfallNote, noteNameToMidi, midiToNoteName } from '../lib/midiWaterfall';
import { soundEngine, getSavedSoundPreset } from '../lib/soundPresets';
import { cn } from '../lib/utils';

interface WaterfallDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  composer?: string;
  notes: WaterfallNote[];
  bpm?: number;
  initialHand?: 'both' | 'right' | 'left';
}

export const WaterfallDemoModal: React.FC<WaterfallDemoModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'Demostración de flujo y digitación en tiempo real',
  composer,
  notes,
  bpm = 80,
  initialHand = 'both'
}) => {
  // Playback & engine state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [activeHandFilter, setActiveHandFilter] = useState<'both' | 'right' | 'left'>(initialHand);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activePressedKeys, setActivePressedKeys] = useState<Set<number>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const synthRef = useRef<Tone.PolySynth | null>(null);

  // Compute total duration
  const totalDuration = useMemo(() => {
    if (notes.length === 0) return 10;
    const lastNote = notes[notes.length - 1];
    return Math.max(8, lastNote.time + lastNote.duration + 2);
  }, [notes]);

  // Determine keyboard range based on notes
  const { minMidi, maxMidi, whiteKeys, blackKeys, allKeys } = useMemo(() => {
    if (notes.length === 0) {
      // Default C3 (48) to C6 (84)
      return computeKeyLayout(48, 84);
    }
    const midis = notes.map(n => n.midi);
    const lowest = Math.min(...midis);
    const highest = Math.max(...midis);
    // Expand by a few keys to leave comfortable margin on the keyboard
    const startMidi = Math.max(24, Math.floor((lowest - 4) / 12) * 12); // Round to C
    const endMidi = Math.min(108, Math.ceil((highest + 5) / 12) * 12);   // Round to C
    return computeKeyLayout(startMidi, endMidi);
  }, [notes]);

  // Initialize Synth
  useEffect(() => {
    if (!isOpen) return;

    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.008, decay: 0.25, sustain: 0.35, release: 0.6 },
      oscillator: { type: 'triangle' }
    }).toDestination();
    synthRef.current.volume.value = -4;

    return () => {
      synthRef.current?.dispose();
      synthRef.current = null;
    };
  }, [isOpen]);

  // Reset playback when modal opens or notes change
  useEffect(() => {
    if (isOpen) {
      setCurrentTime(0);
      setIsPlaying(true);
      setActivePressedKeys(new Set());
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  }, [isOpen, notes]);

  // Playback timer ticker
  useEffect(() => {
    if (!isPlaying) return;

    let timer: any;
    const intervalMs = 25;

    timer = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + (intervalMs / 1000) * playbackSpeed;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Audio triggering on note hit
  useEffect(() => {
    if (!isPlaying || isMuted || notes.length === 0) return;

    const notesToPlay = notes.filter(n => {
      if (activeHandFilter === 'right' && n.hand !== 'right') return false;
      if (activeHandFilter === 'left' && n.hand !== 'left') return false;
      return Math.abs(n.time - currentTime) < 0.035;
    });

    notesToPlay.forEach(n => {
      try {
        synthRef.current?.triggerAttackRelease(n.name, n.duration, undefined, n.velocity);
      } catch {
        // audio safe
      }
    });
  }, [isPlaying, currentTime, isMuted, notes, activeHandFilter]);

  // Canvas render loop
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (timestamp: number) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#07090e');
      bgGrad.addColorStop(1, '#0e111a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const hitLineY = height - 12;
      const pixelsPerSecond = 140; // falling speed
      const whiteKeyWidth = width / (whiteKeys.length || 1);

      // Helper: get X coordinate for any MIDI key
      const getKeyX = (midi: number): { x: number; w: number; isBlack: boolean } => {
        const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
        if (!isBlack) {
          const wIndex = whiteKeys.indexOf(midi);
          return {
            x: wIndex >= 0 ? wIndex * whiteKeyWidth : 0,
            w: whiteKeyWidth,
            isBlack: false
          };
        } else {
          // Black key sits between two white keys
          const prevWhite = midi - 1;
          const wIndex = whiteKeys.indexOf(prevWhite);
          const bw = whiteKeyWidth * 0.65;
          const bx = (wIndex >= 0 ? (wIndex + 1) * whiteKeyWidth : 0) - bw / 2;
          return {
            x: bx,
            w: bw,
            isBlack: true
          };
        }
      };

      // Draw subtle vertical lane dividers for white keys
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      whiteKeys.forEach((_, i) => {
        const x = i * whiteKeyWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, hitLineY);
        ctx.stroke();
      });

      // Filter notes by hand
      const visibleNotes = notes.filter(n => {
        if (activeHandFilter === 'right' && n.hand !== 'right') return false;
        if (activeHandFilter === 'left' && n.hand !== 'left') return false;
        return true;
      });

      const currentPressedSet = new Set<number>();

      // Draw falling note blocks
      visibleNotes.forEach(note => {
        const timeUntilHit = note.time - currentTime;
        const bottomY = hitLineY - timeUntilHit * pixelsPerSecond;
        const noteHeight = Math.max(16, note.duration * pixelsPerSecond);
        const topY = bottomY - noteHeight;

        // Skip if outside visible vertical view
        if (bottomY < -20 || topY > height + 20) return;

        const isAtHitLine = timeUntilHit <= 0.05 && (timeUntilHit + note.duration) >= -0.05;
        if (isAtHitLine) {
          currentPressedSet.add(note.midi);
        }

        const { x, w, isBlack } = getKeyX(note.midi);
        const isRight = note.hand === 'right';

        ctx.save();

        // Rounded capsule block
        const radius = Math.min(8, w / 3);
        ctx.beginPath();
        ctx.roundRect(x + 2, topY, w - 4, noteHeight, radius);

        // Gradient styling
        const grad = ctx.createLinearGradient(x, topY, x + w, bottomY);
        if (isRight) {
          // Right Hand: Electric Cyan
          grad.addColorStop(0, isAtHitLine ? '#bae6fd' : '#38bdf8');
          grad.addColorStop(0.5, '#0ea5e9');
          grad.addColorStop(1, '#0369a1');
        } else {
          // Left Hand: Crimson Rose
          grad.addColorStop(0, isAtHitLine ? '#fecdd3' : '#fb7185');
          grad.addColorStop(0.5, '#f43f5e');
          grad.addColorStop(1, '#9f1239');
        }

        ctx.fillStyle = grad;
        ctx.fill();

        // Glow
        if (isAtHitLine) {
          ctx.shadowColor = isRight ? '#38bdf8' : '#fb7185';
          ctx.shadowBlur = 16;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Particle laser beam up
          const beamGrad = ctx.createLinearGradient(x, hitLineY, x, hitLineY - 60);
          beamGrad.addColorStop(0, isRight ? 'rgba(56, 189, 248, 0.7)' : 'rgba(244, 63, 94, 0.7)');
          beamGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(x + 2, hitLineY - 60, w - 4, 60);
        } else {
          ctx.shadowColor = isRight ? 'rgba(56, 189, 248, 0.35)' : 'rgba(251, 113, 133, 0.35)';
          ctx.shadowBlur = 6;
          ctx.strokeStyle = isRight ? 'rgba(186, 230, 253, 0.5)' : 'rgba(254, 205, 211, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw Technical Fingering (Digitación) badge if present!
        if (note.finger) {
          const badgeY = Math.max(topY + 12, Math.min(bottomY - 12, bottomY - 14));
          const badgeRadius = Math.min(10, Math.max(7, w * 0.35));

          // Draw dark background circle for high contrast
          ctx.beginPath();
          ctx.arc(x + w / 2, badgeY, badgeRadius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fill();
          ctx.strokeStyle = isRight ? '#38bdf8' : '#fb7185';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw finger number
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(10, Math.min(13, w * 0.45))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(note.finger), x + w / 2, badgeY);
        } else {
          // Draw note name text
          const noteBase = note.name.replace(/\d/, '');
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(9, Math.min(12, w * 0.4))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const textY = Math.max(topY + 10, Math.min(bottomY - 10, bottomY - 12));
          ctx.fillText(noteBase, x + w / 2, textY);
        }

        ctx.restore();
      });

      setActivePressedKeys(currentPressedSet);

      // Draw Laser Hit / Strike Line
      ctx.save();
      const lineGlow = ctx.createLinearGradient(0, hitLineY, width, hitLineY);
      lineGlow.addColorStop(0, '#38bdf8');
      lineGlow.addColorStop(0.5, '#f43f5e');
      lineGlow.addColorStop(1, '#38bdf8');

      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = lineGlow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, hitLineY);
      ctx.lineTo(width, hitLineY);
      ctx.stroke();

      ctx.shadowBlur = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, hitLineY);
      ctx.lineTo(width, hitLineY);
      ctx.stroke();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isPlaying, currentTime, notes, activeHandFilter, whiteKeys]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl bg-[#0d1017] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-extrabold shadow-lg shadow-amber-400/20 shrink-0">
                <Flame size={20} className="fill-black" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white truncate font-serif">
                    {title}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-widest shrink-0 hidden sm:inline">
                    Demo Catarata
                  </span>
                </div>
                <p className="text-xs text-white/50 truncate font-mono">
                  {composer ? `${composer} • ` : ''}{subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar demostración"
            >
              <X size={20} />
            </button>
          </div>

          {/* Canvas Falling Notes Area */}
          <div className="relative w-full h-[320px] sm:h-[380px] bg-[#07090e] overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={960}
              height={380}
              className="w-full h-full object-fill pointer-events-none"
            />

            {/* Hand Legend Overlays */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Mano Derecha (D1-D5)</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-400/40 text-rose-300 flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>Mano Izquierda (D1-D5)</span>
              </span>
            </div>

            {/* Progress bar inside canvas bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 transition-all"
                style={{ width: `${Math.min(100, (currentTime / totalDuration) * 100)}%` }}
              />
            </div>
          </div>

          {/* Interactive Keyboard Visualizer under the hit line */}
          <div className="bg-[#0a0c12] p-3 border-t border-white/10 overflow-x-auto select-none">
            <div className="flex justify-center min-w-max mx-auto relative pb-1">
              {allKeys.map(midi => {
                const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
                const isHit = activePressedKeys.has(midi);
                const noteName = midiToNoteName(midi);
                const noteBase = noteName.replace(/\d/, '');
                const noteItem = notes.find(n => n.midi === midi && Math.abs(n.time - currentTime) < 0.2);

                if (isBlack) {
                  return (
                    <div
                      key={midi}
                      className={cn(
                        "piano-key-black flex flex-col justify-end items-center pb-1 relative h-20 w-4 -mx-2 z-10 transition-all",
                        isHit && "!bg-gradient-to-b !from-amber-300 !to-amber-500 !border-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.9)] !translate-y-0.5"
                      )}
                    >
                      {noteItem?.finger && (
                        <span className="text-[9px] font-mono font-extrabold text-black bg-white rounded-full w-3.5 h-3.5 flex items-center justify-center shadow">
                          {noteItem.finger}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={midi}
                    className={cn(
                      "piano-key-white flex flex-col justify-end items-center pb-2 relative h-32 w-7 transition-all border-b-2",
                      isHit
                        ? "!bg-amber-100 !border-amber-500 ring-2 ring-amber-400/80 shadow-[0_0_18px_rgba(245,158,11,0.6)] !translate-y-0.5"
                        : midi === 60 ? "border-b-amber-400" : "border-b-white/20"
                    )}
                  >
                    {noteItem?.finger ? (
                      <span className="text-[10px] font-mono font-extrabold text-white bg-black/80 rounded-full w-4 h-4 flex items-center justify-center shadow-md mb-1">
                        {noteItem.finger}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-gray-500 font-semibold mb-0.5">
                        {noteBase}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-black/60 border-t border-white/10">
            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-xs shadow-md shadow-amber-400/20 transition-all hover:scale-105 active:scale-95"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} className="fill-black" />}
                <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentTime(0);
                  setIsPlaying(true);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                title="Reiniciar desde el inicio"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            {/* Hand selector */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 text-xs font-mono">
              <span className="text-white/40 px-2 hidden md:inline">Mano:</span>
              {[
                { id: 'both', label: 'Ambas' },
                { id: 'right', label: 'Mano Der (Cyan)' },
                { id: 'left', label: 'Mano Izq (Roja)' },
              ].map(h => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setActiveHandFilter(h.id as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    activeHandFilter === h.id
                      ? "bg-amber-400 text-black font-bold shadow"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10 text-xs font-mono">
              <span className="text-white/40 px-2 hidden sm:inline">Velocidad:</span>
              {[0.5, 0.75, 1.0, 1.25].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlaybackSpeed(s)}
                  className={cn(
                    "px-2 py-1 rounded-lg transition-all",
                    playbackSpeed === s
                      ? "bg-white/20 text-white font-bold"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Audio Mute & Close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "p-2 rounded-xl border transition-all",
                  isMuted 
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white"
                )}
                title={isMuted ? "Activar audio" : "Silenciar audio"}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-all"
              >
                Cerrar Demo
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

function computeKeyLayout(startMidi: number, endMidi: number) {
  const whiteKeys: number[] = [];
  const blackKeys: number[] = [];
  const allKeys: number[] = [];

  for (let m = startMidi; m <= endMidi; m++) {
    allKeys.push(m);
    if ([1, 3, 6, 8, 10].includes(m % 12)) {
      blackKeys.push(m);
    } else {
      whiteKeys.push(m);
    }
  }

  return { minMidi: startMidi, maxMidi: endMidi, whiteKeys, blackKeys, allKeys };
}
