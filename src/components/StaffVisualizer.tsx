import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Volume2, Eye, EyeOff, BookOpen, Layers, 
  Sparkles, CheckCircle2, RotateCcw, ArrowRight, 
  HelpCircle, Music, Trophy, Flame
} from 'lucide-react';
import * as Tone from 'tone';
import { cn } from '../lib/utils';
import { ROOTS, CHORD_TYPES, getChordKeys } from '../types';
import { soundEngine, getSavedSoundPreset } from '../lib/soundPresets';

export interface StaffVisualizerProps {
  notes?: string[]; // e.g. ['C4', 'E4', 'G4']
  chordName?: string; // e.g. 'C Major'
  root?: string;
  chordType?: string;
  inversion?: number;
  onNoteClick?: (note: string) => void;
  interactiveMode?: boolean;
}

type ClefMode = 'grand' | 'treble' | 'bass';
type LabelMode = 'none' | 'notes' | 'solfege' | 'intervals';

// Diatonic step calculation: C=0, D=1, E=2, F=3, G=4, A=5, B=6
const DIATONIC_STEPS: Record<string, number> = {
  'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6
};

const SOLFEGE_MAP: Record<string, string> = {
  'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 'G': 'Sol', 'A': 'La', 'B': 'Si'
};

export const StaffVisualizer: React.FC<StaffVisualizerProps> = ({
  notes = ['C4', 'E4', 'G4'],
  chordName = 'Do Mayor (C Major)',
  root = 'C',
  chordType = 'Major',
  inversion = 0,
  onNoteClick,
  interactiveMode = true,
}) => {
  const [clefMode, setClefMode] = useState<ClefMode>('grand');
  const [labelMode, setLabelMode] = useState<LabelMode>('notes');
  const [showHelperGuides, setShowHelperGuides] = useState(false);
  const [highlightedNote, setHighlightedNote] = useState<string | null>(null);
  const [isPlayingArpeggio, setIsPlayingArpeggio] = useState(false);

  // Sight-Reading Training Drill state
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [drillTarget, setDrillTarget] = useState<{
    name: string;
    root: string;
    type: string;
    inversion: number;
    notes: string[];
  } | null>(null);
  const [drillOptions, setDrillOptions] = useState<string[]>([]);
  const [drillFeedback, setDrillFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [drillScore, setDrillScore] = useState(0);
  const [drillStreak, setDrillStreak] = useState(0);

  const synthRef = useRef<Tone.PolySynth | null>(null);

  // Initialize Tone Synth
  useEffect(() => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.6 }
    }).toDestination();
    synth.volume.value = -4;
    synthRef.current = synth;

    return () => {
      synth.dispose();
    };
  }, []);

  // Display notes (either from props or from active drill)
  const currentNotes = isDrillActive && drillTarget ? drillTarget.notes : notes;
  const currentTitle = isDrillActive 
    ? (drillFeedback === 'idle' ? '¿Qué acorde es este?' : drillTarget?.name || '')
    : chordName;

  // Sound playback helpers
  const playAllNotes = async () => {
    try {
      soundEngine.playChord(currentNotes, getSavedSoundPreset(), '1.2n');
    } catch {
      // ignore
    }
  };

  const playArpeggio = async () => {
    if (isPlayingArpeggio || currentNotes.length === 0) return;
    try {
      setIsPlayingArpeggio(true);
      const step = 0.32;
      const preset = getSavedSoundPreset();

      currentNotes.forEach((n, idx) => {
        setTimeout(() => {
          soundEngine.playNote(n, preset, '0.6n');
          setHighlightedNote(n);
        }, idx * step * 1000);
      });

      setTimeout(() => {
        setHighlightedNote(null);
        setIsPlayingArpeggio(false);
      }, currentNotes.length * step * 1000 + 400);
    } catch {
      setIsPlayingArpeggio(false);
    }
  };

  // Sight reading drill generator
  const startSightReadingDrill = () => {
    setIsDrillActive(true);
    generateNextDrill();
  };

  const stopSightReadingDrill = () => {
    setIsDrillActive(false);
    setDrillTarget(null);
    setDrillFeedback('idle');
  };

  const generateNextDrill = () => {
    const randomRoots = ['C', 'G', 'F', 'D', 'A', 'E', 'B'];
    const randomTypes = ['Major', 'Minor', '7th', 'Sus4'];
    const rRoot = randomRoots[Math.floor(Math.random() * randomRoots.length)];
    const rType = randomTypes[Math.floor(Math.random() * randomTypes.length)];
    const rInv = Math.floor(Math.random() * 2); // 0 or 1
    const rNotes = getChordKeys(rRoot, rType, rInv);
    const invLabel = rInv === 1 ? ' (1ª Inv)' : '';
    const correctName = `${rRoot} ${rType}${invLabel}`;

    // Options generator (1 correct, 3 decoys)
    const optionsSet = new Set<string>([correctName]);
    while (optionsSet.size < 4) {
      const dRoot = randomRoots[Math.floor(Math.random() * randomRoots.length)];
      const dType = randomTypes[Math.floor(Math.random() * randomTypes.length)];
      const dInv = Math.random() > 0.5 ? 1 : 0;
      const dInvLabel = dInv === 1 ? ' (1ª Inv)' : '';
      optionsSet.add(`${dRoot} ${dType}${dInvLabel}`);
    }

    const shuffled = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    setDrillTarget({
      name: correctName,
      root: rRoot,
      type: rType,
      inversion: rInv,
      notes: rNotes
    });
    setDrillOptions(shuffled);
    setDrillFeedback('idle');
  };

  const handleOptionAnswer = (chosen: string) => {
    if (!drillTarget || drillFeedback !== 'idle') return;

    if (chosen === drillTarget.name) {
      setDrillFeedback('correct');
      setDrillScore(prev => prev + 120 + drillStreak * 20);
      setDrillStreak(prev => prev + 1);
      playAllNotes();
      setTimeout(() => {
        generateNextDrill();
      }, 1200);
    } else {
      setDrillFeedback('wrong');
      setDrillStreak(0);
      setTimeout(() => {
        setDrillFeedback('idle');
      }, 900);
    }
  };

  // SVG Geometry Dimensions
  const svgWidth = 640;
  const lineSpacing = 16; // space between staff lines (vertical distance)
  const staffHeight = lineSpacing * 4; // 64px for 5 lines (4 spaces)
  
  // Staves vertical positions in Grand Staff
  // Treble staff lines: 5 lines at topTreble, topTreble+16, +32, +48, +64
  const trebleTop = 45;
  const bassTop = trebleTop + staffHeight + 52; // 45 + 64 + 52 = 161
  const svgHeight = clefMode === 'grand' ? 275 : 175;

  // Single clef offsets
  const singleStaffTop = 55;

  // Calculate note position
  const getNoteLayout = (noteStr: string) => {
    const match = noteStr.match(/^([A-G])(#|b)?(\d)$/);
    if (!match) return null;

    const letter = match[1];
    const accidental = match[2] || '';
    const octave = parseInt(match[3], 10);

    const step = DIATONIC_STEPS[letter];
    // Diatonic absolute position: C4 = 28
    const diatonicPos = octave * 7 + step;

    // Which staff to place it on?
    // If clefMode is 'treble', everything on treble
    // If clefMode is 'bass', everything on bass
    // If 'grand', notes >= 28 (C4+) go to Treble, < 28 go to Bass
    let targetClef: 'treble' | 'bass' = 'treble';
    if (clefMode === 'bass') {
      targetClef = 'bass';
    } else if (clefMode === 'grand') {
      targetClef = diatonicPos >= 28 ? 'treble' : 'bass';
    }

    let y = 0;
    const currentStaffTop = clefMode === 'grand' 
      ? (targetClef === 'treble' ? trebleTop : bassTop) 
      : singleStaffTop;

    if (targetClef === 'treble') {
      // Line 5 (F5) = diatonicPos 38 -> at currentStaffTop
      // Each diatonic step is half a line spacing (8px)
      y = currentStaffTop + (38 - diatonicPos) * (lineSpacing / 2);
    } else {
      // Line 5 (A3) = diatonicPos 26 -> at currentStaffTop
      y = currentStaffTop + (26 - diatonicPos) * (lineSpacing / 2);
    }

    // Ledger lines computation
    const ledgerLines: number[] = [];
    if (targetClef === 'treble') {
      // Below staff (Line 1 is E4 = 30):
      // C4 (28) -> line at 28
      // A3 (26) -> lines at 28, 26
      if (diatonicPos <= 28) {
        for (let p = 28; p >= diatonicPos; p -= 2) {
          ledgerLines.push(currentStaffTop + (38 - p) * (lineSpacing / 2));
        }
      }
      // Above staff (Line 5 is F5 = 38):
      // A5 (40) -> line at 40
      // C6 (42) -> lines at 40, 42
      if (diatonicPos >= 40) {
        for (let p = 40; p <= diatonicPos; p += 2) {
          ledgerLines.push(currentStaffTop + (38 - p) * (lineSpacing / 2));
        }
      }
    } else {
      // Bass Clef:
      // Above staff (Line 5 is A3 = 26):
      // C4 (28) -> line at 28
      if (diatonicPos >= 28) {
        for (let p = 28; p <= diatonicPos; p += 2) {
          ledgerLines.push(currentStaffTop + (26 - p) * (lineSpacing / 2));
        }
      }
      // Below staff (Line 1 is G2 = 18):
      // E2 (16) -> line at 16
      // C2 (14) -> lines at 16, 14
      if (diatonicPos <= 16) {
        for (let p = 16; p >= diatonicPos; p -= 2) {
          ledgerLines.push(currentStaffTop + (26 - p) * (lineSpacing / 2));
        }
      }
    }

    return {
      noteStr,
      letter,
      accidental,
      octave,
      diatonicPos,
      targetClef,
      y,
      ledgerLines
    };
  };

  // Process all notes and handle collisions (adjacent notes offset in X)
  const parsedNotes = currentNotes
    .map(getNoteLayout)
    .filter((n): n is NonNullable<typeof n> => n !== null)
    .sort((a, b) => a.diatonicPos - b.diatonicPos);

  // Group notes into horizontal chord column
  const chordBaseX = 350;

  // Collision adjustment: if two notes on the same clef are within 1 step (e.g. C and D),
  // shift the higher note to the right
  const notePositions = parsedNotes.map((note, idx) => {
    let xOffset = 0;
    if (idx > 0) {
      const prev = parsedNotes[idx - 1];
      if (prev.targetClef === note.targetClef && Math.abs(note.diatonicPos - prev.diatonicPos) <= 1) {
        xOffset = 18; // shift right
      }
    }
    return {
      ...note,
      x: chordBaseX + xOffset
    };
  });

  // Calculate note interval tag relative to root
  const getIntervalTag = (noteStr: string) => {
    const rootLetter = root.replace(/\d/, '');
    const cleanNote = noteStr.replace(/\d/, '');
    if (cleanNote === rootLetter) return '1ª Fund';
    return cleanNote;
  };

  return (
    <div className="w-full bg-[#0a0d16] border border-amber-400/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6 text-white overflow-hidden relative">
      
      {/* Visual Header / Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold shadow-md shadow-amber-400/10">
            <Music size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg md:text-xl font-serif font-bold text-white tracking-wide">
                Visualizador de Partituras en Tiempo Real
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                Notación Viva
              </span>
            </div>
            <p className="text-xs text-white/50 font-mono">
              Traduce acordes e inversiones a notación tradicional para entrenar lectura a primera vista
            </p>
          </div>
        </div>

        {/* Action Buttons: Play, Arpeggio, Sight Drill */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={playAllNotes}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold transition-all shadow hover:scale-105 active:scale-95"
            title="Escuchar acorde en bloque"
          >
            <Play size={13} className="fill-black" />
            <span>Tocar Acorde</span>
          </button>

          <button
            type="button"
            onClick={playArpeggio}
            disabled={isPlayingArpeggio}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border",
              isPlayingArpeggio 
                ? "bg-amber-400/20 border-amber-400/60 text-amber-300 animate-pulse"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-white/80"
            )}
            title="Escuchar arpegio ascendente"
          >
            <Volume2 size={13} />
            <span>Arpegiar</span>
          </button>

          {/* Sight Reading Drill Toggle */}
          <button
            type="button"
            onClick={isDrillActive ? stopSightReadingDrill : startSightReadingDrill}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border",
              isDrillActive
                ? "bg-rose-500/20 border-rose-500 text-rose-300 hover:bg-rose-500/30"
                : "bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30"
            )}
          >
            <Trophy size={13} />
            <span>{isDrillActive ? 'Salir del Reto' : 'Entrenador de Lectura'}</span>
          </button>
        </div>
      </div>

      {/* Sight Reading Active Drill Banner */}
      <AnimatePresence>
        {isDrillActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono"
          >
            <div className="flex items-center gap-2 text-purple-300">
              <Sparkles size={16} />
              <span>
                <strong>Modo Desafío de Lectura:</strong> Descifra las notas en el pentagrama y elige el acorde correcto.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-amber-300">
                <Trophy size={14} />
                <span>{drillScore} PTS</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400">
                <Flame size={14} />
                <span>Racha: {drillStreak}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clef & Annotation Config Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-black/40 p-2.5 rounded-2xl border border-white/5">
        
        {/* Clef Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-white/40 hidden md:inline">Clave:</span>
          {(['grand', 'treble', 'bass'] as ClefMode[]).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setClefMode(mode)}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all",
                clefMode === mode 
                  ? "bg-amber-400 text-black font-bold shadow" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {mode === 'grand' ? 'Gran Pentagrama' : mode === 'treble' ? 'Clave de Sol' : 'Clave de Fa'}
            </button>
          ))}
        </div>

        {/* Note Labels Toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-white/40 hidden md:inline">Guías:</span>
          {(['none', 'notes', 'solfege', 'intervals'] as LabelMode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setLabelMode(m)}
              className={cn(
                "px-2 py-1 rounded-lg transition-all",
                labelMode === m 
                  ? "bg-white/20 text-white font-bold" 
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {m === 'none' ? 'Sin Nombres' : m === 'notes' ? 'C - E - G' : m === 'solfege' ? 'Do-Mi-Sol' : 'Intervalos'}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowHelperGuides(!showHelperGuides)}
            className={cn(
              "px-2 py-1 rounded-lg border text-[11px] transition-all ml-1",
              showHelperGuides 
                ? "border-amber-400/60 bg-amber-400/10 text-amber-300 font-bold" 
                : "border-white/10 text-white/40 hover:text-white/70"
            )}
            title="Mostrar nombres mnemotécnicos en las líneas"
          >
            Líneas E-G-B
          </button>
        </div>
      </div>

      {/* NOTATION CANVAS / SVG SHEET MUSIC STAGE */}
      <div className="w-full bg-[#05070e] border border-white/10 rounded-2xl p-2 sm:p-4 overflow-x-auto shadow-inner flex flex-col items-center">
        
        {/* Title above sheet music */}
        <div className="w-full flex items-center justify-between px-3 pt-1 pb-3 text-xs font-mono text-white/50 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-sm">
              {currentTitle}
            </span>
            {inversion > 0 && !isDrillActive && (
              <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px]">
                {inversion === 1 ? '1ª Inversión' : '2ª Inversión'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/40">Compás: 4/4 (Redonda)</span>
          </div>
        </div>

        {/* SVG Notation Element */}
        <div className="w-full max-w-[660px] flex justify-center py-2">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none overflow-visible"
            style={{ minWidth: '460px' }}
          >
            <defs>
              {/* Soft gold glow for active notes */}
              <filter id="noteGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="staffGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#fef08a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Background Parchment/Slate Line */}
            <rect x="10" y="10" width={svgWidth - 20} height={svgHeight - 20} rx="12" fill="#090d18" stroke="#1f293d" strokeWidth="1" />

            {/* Left System Line & Piano Brace for Grand Staff */}
            {clefMode === 'grand' && (
              <>
                {/* Grand Staff Connecting Vertical Line */}
                <line
                  x1="60"
                  y1={trebleTop}
                  x2="60"
                  y2={bassTop + staffHeight}
                  stroke="#94a3b8"
                  strokeWidth="2.5"
                />
                {/* Decorative Classic Piano Brace (Llave de piano) */}
                <path
                  d={`M 56 ${trebleTop} 
                     C 44 ${trebleTop + 20}, 44 ${trebleTop + 45}, 38 ${trebleTop + staffHeight + 26}
                     C 44 ${trebleTop + staffHeight + 35}, 44 ${bassTop + staffHeight - 20}, 56 ${bassTop + staffHeight}
                     C 48 ${bassTop + staffHeight - 15}, 48 ${trebleTop + staffHeight + 35}, 42 ${trebleTop + staffHeight + 26}
                     C 48 ${trebleTop + 45}, 48 ${trebleTop + 15}, 56 ${trebleTop} Z`}
                  fill="#f59e0b"
                  opacity="0.85"
                />
              </>
            )}

            {/* ================= TREBLE STAFF ================= */}
            {(clefMode === 'grand' || clefMode === 'treble') && (
              <g id="treble-staff">
                {/* 5 Horizontal Staff Lines */}
                {[0, 1, 2, 3, 4].map(idx => {
                  const y = (clefMode === 'grand' ? trebleTop : singleStaffTop) + idx * lineSpacing;
                  return (
                    <line
                      key={`tr-line-${idx}`}
                      x1="60"
                      y1={y}
                      x2={svgWidth - 40}
                      y2={y}
                      stroke="#475569"
                      strokeWidth="1.3"
                    />
                  );
                })}

                {/* Helper Line Labels (E4, G4, B4, D5, F5) */}
                {showHelperGuides && (
                  <g className="text-[9px] font-mono fill-amber-300/40" opacity="0.8">
                    {[
                      { name: 'F5', line: 0 },
                      { name: 'D5', line: 1 },
                      { name: 'B4', line: 2 },
                      { name: 'G4', line: 3 },
                      { name: 'E4', line: 4 }
                    ].map(l => (
                      <text
                        key={l.name}
                        x="66"
                        y={(clefMode === 'grand' ? trebleTop : singleStaffTop) + l.line * lineSpacing - 2}
                      >
                        {l.name}
                      </text>
                    ))}
                  </g>
                )}

                {/* Treble Clef Symbol (Clave de Sol) */}
                <text
                  x="80"
                  y={(clefMode === 'grand' ? trebleTop : singleStaffTop) + 54}
                  fontSize="58"
                  fontFamily="serif"
                  fill="#f8fafc"
                  className="select-none"
                  style={{ textShadow: '0 0 10px rgba(255,255,255,0.2)' }}
                >
                  𝄞
                </text>

                {/* Time Signature: 4/4 */}
                <text
                  x="145"
                  y={(clefMode === 'grand' ? trebleTop : singleStaffTop) + 26}
                  fontSize="22"
                  fontFamily="serif"
                  fontWeight="bold"
                  fill="#94a3b8"
                >
                  4
                </text>
                <text
                  x="145"
                  y={(clefMode === 'grand' ? trebleTop : singleStaffTop) + 54}
                  fontSize="22"
                  fontFamily="serif"
                  fontWeight="bold"
                  fill="#94a3b8"
                >
                  4
                </text>
              </g>
            )}

            {/* ================= BASS STAFF ================= */}
            {(clefMode === 'grand' || clefMode === 'bass') && (
              <g id="bass-staff">
                {/* 5 Horizontal Staff Lines */}
                {[0, 1, 2, 3, 4].map(idx => {
                  const y = (clefMode === 'grand' ? bassTop : singleStaffTop) + idx * lineSpacing;
                  return (
                    <line
                      key={`ba-line-${idx}`}
                      x1="60"
                      y1={y}
                      x2={svgWidth - 40}
                      y2={y}
                      stroke="#475569"
                      strokeWidth="1.3"
                    />
                  );
                })}

                {/* Helper Line Labels (G2, B2, D3, F3, A3) */}
                {showHelperGuides && (
                  <g className="text-[9px] font-mono fill-amber-300/40" opacity="0.8">
                    {[
                      { name: 'A3', line: 0 },
                      { name: 'F3', line: 1 },
                      { name: 'D3', line: 2 },
                      { name: 'B2', line: 3 },
                      { name: 'G2', line: 4 }
                    ].map(l => (
                      <text
                        key={l.name}
                        x="66"
                        y={(clefMode === 'grand' ? bassTop : singleStaffTop) + l.line * lineSpacing - 2}
                      >
                        {l.name}
                      </text>
                    ))}
                  </g>
                )}

                {/* Bass Clef Symbol (Clave de Fa) */}
                <text
                  x="80"
                  y={(clefMode === 'grand' ? bassTop : singleStaffTop) + 42}
                  fontSize="48"
                  fontFamily="serif"
                  fill="#f8fafc"
                  className="select-none"
                  style={{ textShadow: '0 0 10px rgba(255,255,255,0.2)' }}
                >
                  𝄢
                </text>

                {/* Time Signature: 4/4 */}
                <text
                  x="145"
                  y={(clefMode === 'grand' ? bassTop : singleStaffTop) + 26}
                  fontSize="22"
                  fontFamily="serif"
                  fontWeight="bold"
                  fill="#94a3b8"
                >
                  4
                </text>
                <text
                  x="145"
                  y={(clefMode === 'grand' ? bassTop : singleStaffTop) + 54}
                  fontSize="22"
                  fontFamily="serif"
                  fontWeight="bold"
                  fill="#94a3b8"
                >
                  4
                </text>
              </g>
            )}

            {/* Ending Double Bar Line */}
            <line
              x1={svgWidth - 45}
              y1={clefMode === 'bass' ? singleStaffTop : (clefMode === 'grand' ? trebleTop : singleStaffTop)}
              x2={svgWidth - 45}
              y2={clefMode === 'treble' ? singleStaffTop + staffHeight : (clefMode === 'grand' ? bassTop + staffHeight : singleStaffTop + staffHeight)}
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <line
              x1={svgWidth - 40}
              y1={clefMode === 'bass' ? singleStaffTop : (clefMode === 'grand' ? trebleTop : singleStaffTop)}
              x2={svgWidth - 40}
              y2={clefMode === 'treble' ? singleStaffTop + staffHeight : (clefMode === 'grand' ? bassTop + staffHeight : singleStaffTop + staffHeight)}
              stroke="#cbd5e1"
              strokeWidth="3.5"
            />

            {/* Middle C (C4) Grand Staff Guide Line Indicator */}
            {clefMode === 'grand' && showHelperGuides && (
              <g opacity="0.6">
                <text x="210" y={trebleTop + staffHeight + 28} fontSize="9" fontFamily="monospace" fill="#f59e0b">
                  --- Do Central (C4) Línea Adicional ---
                </text>
              </g>
            )}

            {/* ================= NOTEHEADS & ACCIDENTALS ================= */}
            {notePositions.map((n, i) => {
              const isGlowing = highlightedNote === n.noteStr;
              
              // Text label under/beside note
              let labelText = '';
              if (labelMode === 'notes') {
                labelText = n.noteStr.replace(/\d/, '');
              } else if (labelMode === 'solfege') {
                labelText = `${SOLFEGE_MAP[n.letter] || n.letter}${n.accidental ? (n.accidental === '#' ? '♯' : '♭') : ''}`;
              } else if (labelMode === 'intervals') {
                labelText = getIntervalTag(n.noteStr);
              }

              return (
                <g 
                  key={`${n.noteStr}-${i}`}
                  className="transition-transform duration-200 cursor-pointer"
                  onClick={() => onNoteClick?.(n.noteStr)}
                >
                  {/* Ledger Lines for Notes outside 5 staff lines */}
                  {n.ledgerLines.map((ly, lIdx) => (
                    <line
                      key={`ledger-${lIdx}`}
                      x1={n.x - 14}
                      y1={ly}
                      x2={n.x + 14}
                      y2={ly}
                      stroke={isGlowing ? '#fbbf24' : '#e2e8f0'}
                      strokeWidth="2"
                    />
                  ))}

                  {/* Accidental (# or b) to the left of notehead */}
                  {n.accidental && (
                    <text
                      x={n.x - 19}
                      y={n.y + 6}
                      fontSize="22"
                      fontFamily="serif"
                      fontWeight="bold"
                      fill={isGlowing ? '#fbbf24' : '#f8fafc'}
                      className="select-none"
                    >
                      {n.accidental === '#' ? '♯' : '♭'}
                    </text>
                  )}

                  {/* Whole Note (Redonda) Notehead: Oval with rotated counter */}
                  <g transform={`rotate(-18, ${n.x}, ${n.y})`}>
                    {/* Outer notehead ring */}
                    <ellipse
                      cx={n.x}
                      cy={n.y}
                      rx="9.5"
                      ry="6.5"
                      fill={isGlowing ? '#fbbf24' : '#ffffff'}
                      filter={isGlowing ? 'url(#noteGlow)' : undefined}
                      stroke={isGlowing ? '#d97706' : '#ffffff'}
                      strokeWidth="1.5"
                    />
                    {/* Inner hole (makes it a authentic whole note) */}
                    <ellipse
                      cx={n.x}
                      cy={n.y}
                      rx="4.2"
                      ry="2.4"
                      fill="#05070e"
                    />
                  </g>

                  {/* Note Label Tag (if enabled) */}
                  {labelMode !== 'none' && (
                    <g>
                      <rect
                        x={n.x + 14}
                        y={n.y - 8}
                        width="30"
                        height="16"
                        rx="4"
                        fill="#0f172a"
                        stroke={isGlowing ? '#fbbf24' : '#334155'}
                        strokeWidth="1"
                        opacity="0.95"
                      />
                      <text
                        x={n.x + 29}
                        y={n.y + 4}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                        fill={isGlowing ? '#fbbf24' : '#38bdf8'}
                      >
                        {labelText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sight Reading Multiple Choice Drill Answers */}
        {isDrillActive && drillTarget && (
          <div className="w-full max-w-xl py-3 border-t border-white/10 space-y-3">
            <div className="text-center text-xs font-mono text-white/60">
              Selecciona el nombre del acorde escrito arriba:
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {drillOptions.map((opt, oIdx) => {
                const isCorrect = opt === drillTarget.name;
                let btnStyle = "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-amber-400/40";

                if (drillFeedback === 'correct') {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                  } else {
                    btnStyle = "opacity-30 bg-white/5 border-white/5";
                  }
                } else if (drillFeedback === 'wrong') {
                  btnStyle = "bg-white/5 border-white/10 text-white";
                }

                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleOptionAnswer(opt)}
                    disabled={drillFeedback !== 'idle'}
                    className={cn(
                      "p-3 rounded-xl border text-center text-xs sm:text-sm font-mono font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]",
                      btnStyle
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Theoretical & Harmonic Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-white/40 uppercase text-[10px]">Estructura de Notas</div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentNotes.map(note => (
              <span 
                key={note} 
                className={cn(
                  "px-2 py-0.5 rounded-lg border font-bold text-xs transition-all",
                  highlightedNote === note 
                    ? "bg-amber-400 text-black border-amber-400 shadow" 
                    : "bg-white/10 border-white/10 text-white/80"
                )}
              >
                {note}
              </span>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-white/40 uppercase text-[10px]">Lectura Visual en Pentagrama</div>
          <div className="text-white/80 font-light text-[11px] leading-snug">
            {parsedNotes.length > 0 ? (
              <span>
                {parsedNotes.some(n => n.targetClef === 'bass') && 'Mano Izquierda (Bajos)'}
                {parsedNotes.some(n => n.targetClef === 'bass') && parsedNotes.some(n => n.targetClef === 'treble') && ' + '}
                {parsedNotes.some(n => n.targetClef === 'treble') && 'Mano Derecha (Armonía)'}
              </span>
            ) : (
              'Sin notas'
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-white/40 uppercase text-[10px]">Regla Nemotécnica</div>
          <div className="text-amber-300 font-light text-[11px] leading-snug">
            {clefMode === 'treble' 
              ? 'Líneas: Mi-Sol-Si-Re-Fa | Espacios: Fa-La-Do-Mi (FACE)'
              : clefMode === 'bass'
              ? 'Líneas: Sol-Si-Re-Fa-La | Espacios: La-Do-Mi-Sol'
              : 'Do Central (C4) es el puente entre ambas claves.'}
          </div>
        </div>
      </div>

    </div>
  );
};
