import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { cn } from '../lib/utils';
import { Volume2, Keyboard, Music2 } from 'lucide-react';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [3, 4, 5];

const KEYBOARD_MAP: Record<string, string> = {
  // Lower octave (C3 - B3)
  'z': 'C3', 's': 'C#3', 'x': 'D3', 'd': 'D#3', 'c': 'E3', 'v': 'F3', 'g': 'F#3', 'b': 'G3', 'h': 'G#3', 'n': 'A3', 'j': 'A#3', 'm': 'B3',
  // Middle octave (C4 - B4)
  'q': 'C4', '2': 'C#4', 'w': 'D4', '3': 'D#4', 'e': 'E4', 'r': 'F4', '5': 'F#4', 't': 'G4', '6': 'G#4', 'y': 'A4', '7': 'A#4', 'u': 'B4',
  // Higher octave (C5 - G5)
  'i': 'C5', '9': 'C#5', 'o': 'D5', '0': 'D#5', 'p': 'E5', '[': 'F5', '=': 'F#5', ']': 'G5',
};

interface PianoProps {
  activeNotes?: string[];
  correctNotes?: string[];
  errorNotes?: string[];
  fingerGuide?: Record<string, number>;
  onNotePlay?: (note: string) => void;
  compact?: boolean;
}

export const Piano: React.FC<PianoProps> = ({
  activeNotes = [],
  correctNotes = [],
  errorNotes = [],
  fingerGuide,
  onNotePlay,
  compact = false,
}) => {
  const [pressedNotes, setPressedNotes] = useState<Set<string>>(new Set());
  const [showKeyboardLabels, setShowKeyboardLabels] = useState(true);
  const [showNoteNames, setShowNoteNames] = useState(true);
  const [soundReady, setSoundReady] = useState(false);
  const [lastChordDetected, setLastChordDetected] = useState<string>('');

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const samplerRef = useRef<Tone.Sampler | null>(null);

  // Initialize synthesizer fallback immediately and load acoustic piano sampler
  useEffect(() => {
    // Polyphonic synthesizer with soft attack and gentle release for authentic warm tone
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle8" },
      envelope: {
        attack: 0.005,
        decay: 1.2,
        sustain: 0.15,
        release: 1.2,
      },
    }).toDestination();
    synth.volume.value = -6;
    synthRef.current = synth;
    setSoundReady(true);

    // Salamander Acoustic Piano Sampler for rich resonance
    const sampler = new Tone.Sampler({
      urls: {
        A1: "A1.mp3",
        C2: "C2.mp3",
        C3: "C3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
      },
      release: 1.5,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      onload: () => {
        samplerRef.current = sampler;
      }
    }).toDestination();

    return () => {
      synth.dispose();
      sampler.dispose();
    };
  }, []);

  const playNoteAudio = useCallback((note: string) => {
    Tone.start();
    if (samplerRef.current && samplerRef.current.loaded) {
      samplerRef.current.triggerAttackRelease(note, "1.5n");
    } else if (synthRef.current) {
      synthRef.current.triggerAttackRelease(note, "1.5n");
    }
  }, []);

  const handleNoteTrigger = useCallback((note: string) => {
    playNoteAudio(note);
    setPressedNotes(prev => {
      const next = new Set(prev);
      next.add(note);
      return next;
    });

    onNotePlay?.(note);

    setTimeout(() => {
      setPressedNotes(prev => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    }, 250);
  }, [playNoteAudio, onNotePlay]);

  // Physical computer keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note) {
        e.preventDefault();
        handleNoteTrigger(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNoteTrigger]);

  // Calculate keyboard layout keys
  const allKeys = OCTAVES.flatMap(octave => 
    NOTES.map(note => `${note}${octave}`)
  );

  // Helper to reverse lookup PC key shortcut for display
  const getPcKeyForNote = (note: string): string | null => {
    const entry = Object.entries(KEYBOARD_MAP).find(([_, n]) => n === note);
    return entry ? entry[0].toUpperCase() : null;
  };

  return (
    <div className="w-full space-y-3">
      {/* Piano Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-white/50">
        <div className="flex items-center gap-2 font-mono">
          <Music2 size={14} className="text-amber-400" />
          <span>Teclado Acústico Virtual (3 Octavas: C3 - B5)</span>
          {soundReady && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Audio Listo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowKeyboardLabels(prev => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-mono transition-all",
              showKeyboardLabels
                ? "bg-amber-400/10 border-amber-400/40 text-amber-300"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
            )}
            title="Mostrar u ocultar teclas de atajo de tu computadora"
          >
            <Keyboard size={13} />
            <span>Atajos PC ({showKeyboardLabels ? 'ON' : 'OFF'})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNoteNames(prev => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-mono transition-all",
              showNoteNames
                ? "bg-amber-400/10 border-amber-400/40 text-amber-300"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
            )}
            title="Mostrar u ocultar nombres de notas (Do, Re, Mi...)"
          >
            <span>Notas ({showNoteNames ? 'ON' : 'OFF'})</span>
          </button>
        </div>
      </div>

      {/* Piano Keys Stage */}
      <div className="relative p-4 md:p-6 bg-gradient-to-b from-[#141721] to-[#0a0c12] rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-x-auto select-none">
        <div className="flex justify-center min-w-max mx-auto relative pt-4 pb-2">
          {allKeys.map((noteKey) => {
            const isBlack = noteKey.includes('#');
            const isPressed = pressedNotes.has(noteKey);
            const isActive = activeNotes.includes(noteKey);
            const isCorrect = correctNotes.includes(noteKey);
            const isError = errorNotes.includes(noteKey);
            const finger = fingerGuide?.[noteKey];
            const pcKey = getPcKeyForNote(noteKey);

            // Pitch note base name (e.g. C, D, C#)
            const noteBase = noteKey.replace(/\d/, '');
            const octave = noteKey.slice(-1);

            if (isBlack) {
              return (
                <button
                  key={noteKey}
                  type="button"
                  onMouseDown={() => handleNoteTrigger(noteKey)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleNoteTrigger(noteKey);
                  }}
                  className={cn(
                    "piano-key-black flex flex-col justify-between items-center py-2 relative",
                    compact && "h-24 w-5 -mx-2.5",
                    isPressed && "!bg-amber-300 !translate-y-1 shadow-[0_0_20px_rgba(245,158,11,0.8)]",
                    isActive && !isPressed && "!bg-gradient-to-b !from-amber-500 !to-amber-600 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
                    isCorrect && "!bg-emerald-500 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.8)]",
                    isError && "!bg-rose-600 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.8)]"
                  )}
                  title={`${noteKey} (${pcKey ? `Tecla PC: ${pcKey}` : ''})`}
                >
                  {/* Finger number badge if provided */}
                  {finger ? (
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-black font-bold text-[11px] flex items-center justify-center shadow">
                      {finger}
                    </span>
                  ) : <span />}

                  {/* Hotkey label */}
                  {showKeyboardLabels && pcKey && (
                    <span className="text-[9px] font-mono text-amber-300/80 bg-black/60 px-1 rounded">
                      {pcKey}
                    </span>
                  )}
                </button>
              );
            }

            // White Key
            return (
              <button
                key={noteKey}
                type="button"
                onMouseDown={() => handleNoteTrigger(noteKey)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleNoteTrigger(noteKey);
                }}
                className={cn(
                  "piano-key-white flex flex-col justify-between items-center py-3 relative group",
                  compact && "h-36 w-8",
                  noteKey === 'C4' && "border-b-4 border-b-amber-400",
                  isPressed && "!bg-amber-200 !translate-y-1 shadow-inner",
                  isActive && !isPressed && "!bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
                  isCorrect && "!bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)]",
                  isError && "!bg-rose-100 border-rose-500 ring-2 ring-rose-500/50"
                )}
                title={`${noteKey} (${pcKey ? `Tecla PC: ${pcKey}` : ''})`}
              >
                {/* Finger guide pill */}
                {finger ? (
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold text-xs flex items-center justify-center shadow-md">
                    {finger}
                  </span>
                ) : (
                  noteKey === 'C4' ? (
                    <span className="text-[9px] font-mono font-bold text-amber-600 bg-amber-400/20 px-1 rounded">
                      Do Central
                    </span>
                  ) : <span />
                )}

                {/* Bottom indicators: Note name & PC hotkey */}
                <div className="flex flex-col items-center gap-0.5 pointer-events-none">
                  {showKeyboardLabels && pcKey && (
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-200/80 px-1 rounded border border-gray-300">
                      {pcKey}
                    </span>
                  )}
                  {showNoteNames && (
                    <span className="text-[11px] font-mono font-semibold text-gray-700">
                      {noteBase}<span className="text-[9px] text-gray-400">{octave}</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
