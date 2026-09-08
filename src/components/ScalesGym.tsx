import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, RotateCcw, CheckCircle2, HelpCircle, Trophy, Lightbulb, Heart,
  Footprints, Puzzle, Compass, RotateCw, Hand, ArrowRight, AlertCircle, ListOrdered,
  GraduationCap, Flame, Mic, ChevronDown, Music2, Target,
} from 'lucide-react';
import {
  SCALES_DATABASE, ALL_SCALE_ROOTS, calculateScaleNotes, ENHARMONIC_MAP, FINGER_NAMES,
  preferredRootName, spellScaleNotes, keySignatureLabel, keyName, scaleSpellingMap,
} from '../lib/musicGymTheory';
import { Piano } from './Piano';
import { AcousticPianoListener } from './AcousticPianoListener';
import { WaterfallDemoModal } from './WaterfallDemoModal';
import { buildWaterfallFromScale } from '../lib/midiWaterfall';
import { pianoPitchDetector } from '../lib/pitchDetector';
import { maestroVoice } from '../lib/speech';
import { cn } from '../lib/utils';
import * as Tone from 'tone';

type GameMode = 'pathway' | 'missingNote' | 'formula';

interface ScalesGymProps {
  onScoreGain?: (points: number) => void;
  onSwitchToCircleSequence?: () => void;
}

const MODES: { id: GameMode; label: string; hint: string; Icon: typeof Footprints }[] = [
  { id: 'pathway', label: 'Camino de notas', hint: 'Tocá la escala nota a nota con la digitación correcta', Icon: Footprints },
  { id: 'missingNote', label: 'Nota faltante', hint: 'Adiviná qué grado falta en la escala', Icon: Puzzle },
  { id: 'formula', label: 'Fórmula T–S', hint: 'La anatomía de tonos y semitonos que forma la escala', Icon: Compass },
];

const DIFFICULTY_STYLE: Record<string, string> = {
  'Fácil': 'text-ok',
  'Media': 'text-brand-2',
  'Avanzada': 'text-warn',
};

/* ------------------------------------------------------------------ */
/*  Mini teclado para elegir la tónica (las 12)                        */
/* ------------------------------------------------------------------ */
const RootKeyboard: React.FC<{
  value: number;                       // pitch class 0..11
  onChange: (pc: number) => void;
  scaleId: string;                     // define si la tónica se escribe Mib o Re#
}> = ({ value, onChange, scaleId }) => {
  const whites = ALL_SCALE_ROOTS.filter(r => !r.isBlack);
  // Posición de cada negra sobre el índice de blanca a su izquierda
  const blackAfter: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
  return (
    <div className="relative h-[72px] select-none" role="group" aria-label="Tónica de la escala">
      <div className="flex h-full gap-[3px]">
        {whites.map(r => {
          const active = value === r.pc;
          const name = preferredRootName(r.pc, scaleId);
          return (
            <button
              key={r.pc}
              type="button"
              onClick={() => onChange(r.pc)}
              aria-pressed={active}
              title={`${r.solfege} (${name}) — dificultad ${r.difficulty.toLowerCase()}`}
              className={cn(
                'flex-1 rounded-b-lg rounded-t-sm border flex flex-col items-center justify-end pb-1.5 gap-0.5 transition-colors',
                active
                  ? 'bg-brand border-brand text-brand-ink font-semibold'
                  : 'bg-surface-2 border-line text-ink-2 hover:bg-surface-3 hover:text-ink'
              )}
            >
              <span className="font-mono text-[13px] leading-none">{name}</span>
              <span className={cn('text-[9.5px] leading-none', active ? 'opacity-70' : 'text-ink-3')}>{r.solfege}</span>
            </button>
          );
        })}
      </div>
      <div className="absolute inset-x-0 top-0 h-[62%] pointer-events-none">
        {ALL_SCALE_ROOTS.filter(r => r.isBlack).map(r => {
          const active = value === r.pc;
          const name = preferredRootName(r.pc, scaleId);
          const i = blackAfter[r.pc];
          const w = 100 / whites.length;
          return (
            <button
              key={r.pc}
              type="button"
              onClick={() => onChange(r.pc)}
              aria-pressed={active}
              title={`${r.solfege} (${name}) — dificultad ${r.difficulty.toLowerCase()}`}
              style={{ left: `calc(${(i + 1) * w}% - ${w * 0.3}%)`, width: `${w * 0.6}%` }}
              className={cn(
                'absolute top-0 h-full rounded-b-md pointer-events-auto flex items-end justify-center pb-1 font-mono text-[10px] transition-colors',
                active
                  ? 'bg-brand text-brand-ink font-semibold shadow-lg'
                  : 'bg-[#11151f] text-[#c9c5bb] hover:bg-[#1d2334] hover:text-white border border-white/10 shadow-[0_3px_6px_rgba(0,0,0,0.7)]'
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Ficha de una nota de la escala (usada en Camino y Nota faltante)   */
/* ------------------------------------------------------------------ */
interface NoteCardProps {
  note: string;            // nombre de tecla con octava (C#5) — de dónde sale la octava
  label?: string;          // ortografía correcta según la armadura (E#, Bb…)
  degree?: string; finger?: number;
  state: 'todo' | 'current' | 'done' | 'hidden';
  thumbPass?: boolean;
}
const NoteCard: React.FC<NoteCardProps> = ({ note, label, degree, finger, state, thumbPass }) => (
  <motion.div
    animate={state === 'current' ? { scale: [1, 1.035, 1] } : { scale: 1 }}
    transition={state === 'current' ? { repeat: Infinity, duration: 1.6 } : { duration: 0.2 }}
    className={cn(
      'relative rounded-xl border px-2 py-2.5 flex flex-col items-center gap-1 transition-colors',
      state === 'current' ? 'bg-brand-soft border-brand text-ink shadow-[var(--shadow-glow)]'
        : state === 'done' ? 'bg-ok-soft border-ok/40 text-ink'
        : state === 'hidden' ? 'bg-brand-soft border-brand border-dashed text-brand-2'
        : 'bg-surface-2 border-line text-ink-3'
    )}
  >
    {degree && <span className="text-[9.5px] uppercase tracking-wider text-ink-3 leading-none truncate max-w-full">{degree}</span>}
    <span className={cn('font-mono font-semibold leading-none', state === 'hidden' ? 'text-xl py-1' : 'text-[22px]')}>
      {state === 'hidden' ? <HelpCircle size={22} className="animate-pulse" /> : (label ?? note.replace(/\d/, ''))}
    </span>
    <span className="text-[9.5px] text-ink-3 leading-none">{state === 'hidden' ? '¿cuál?' : `oct. ${note.slice(-1)}`}</span>
    {finger !== undefined && state !== 'hidden' && (
      <span className={cn(
        'mt-0.5 w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center',
        state === 'current' ? 'bg-brand text-brand-ink' : state === 'done' ? 'bg-ok/25 text-ok' : 'bg-white/8 text-ink-3'
      )} title={`Dedo ${finger}: ${FINGER_NAMES[finger]?.name ?? ''}`}>
        {finger}
      </span>
    )}
    {thumbPass && (
      <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono text-brand-2 bg-surface border border-brand-line px-1.5 py-px rounded-full">
        ↷ pulgar
      </span>
    )}
  </motion.div>
);

/* ------------------------------------------------------------------ */
/*  Gimnasio de escalas                                                */
/* ------------------------------------------------------------------ */
export const ScalesGym: React.FC<ScalesGymProps> = ({ onScoreGain, onSwitchToCircleSequence }) => {
  /* Si se llegó desde la rutina del día ("Practicar" en una escala concreta),
     el gimnasio abre en esa escala en vez de en Do mayor. */
  const focus = (() => {
    try {
      const raw = localStorage.getItem('pianomaster_routine_focus');
      if (!raw) return null;
      localStorage.removeItem('pianomaster_routine_focus'); // se usa una vez
      const [pc, scaleId] = raw.split(':');
      const n = Number(pc);
      if (!Number.isInteger(n) || n < 0 || n > 11 || !scaleId) return null;
      return { pc: n, scaleId };
    } catch { return null; }
  })();
  const [rootPc, setRootPc] = useState(() => focus?.pc ?? 0); // tónica como pitch class: el nombre depende del modo
  const [selectedScaleId, setSelectedScaleId] = useState(() => focus?.scaleId ?? 'major');
  const [gameMode, setGameMode] = useState<GameMode>('pathway');
  const [selectedHand, setSelectedHand] = useState<'right' | 'left'>('right');
  const [showFingeringNumbers, setShowFingeringNumbers] = useState(true);
  const [isWaterfallModalOpen, setIsWaterfallModalOpen] = useState(false);
  const [micOpen, setMicOpen] = useState(false);

  const activeScale = SCALES_DATABASE.find(s => s.id === selectedScaleId) || SCALES_DATABASE[0];
  const rootInfo = ALL_SCALE_ROOTS[rootPc];
  /* Ortografía: el nombre correcto de la tónica y de cada grado según la armadura.
     El motor (Piano, Tone, catarata) sigue usando `scaleNotes`, que son nombres de tecla. */
  const rootName = preferredRootName(rootPc, selectedScaleId);
  const scaleNotes = calculateScaleNotes(keyName(rootPc), activeScale);
  const displayNames = useMemo(() => spellScaleNotes(rootName, activeScale), [rootName, activeScale]);
  const keySignature = useMemo(() => keySignatureLabel(rootName, activeScale), [rootName, activeScale]);
  /* Para que el teclado escriba Mi# donde la tonalidad pide Mi# y no F. */
  const spelling = useMemo(() => scaleSpellingMap(rootName, activeScale), [rootName, activeScale]);

  const currentFingering = useMemo(
    () => (selectedHand === 'right' ? activeScale.fingeringRightHand : (activeScale.fingeringLeftHand || [5, 4, 3, 2, 1, 3, 2, 1])),
    [selectedHand, activeScale]
  );
  const currentThumbPassIndex = useMemo(
    () => (selectedHand === 'right' ? activeScale.thumbPassStepIndex : (activeScale.thumbPassStepIndexLeftHand ?? 4)),
    [selectedHand, activeScale]
  );
  const scaleFingerGuide = useMemo(() => {
    const guide: Record<string, number> = {};
    scaleNotes.forEach((note, idx) => { if (currentFingering[idx] !== undefined) guide[note] = currentFingering[idx]; });
    return guide;
  }, [scaleNotes, currentFingering]);

  // Camino de notas
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [lastPlayedNote, setLastPlayedNote] = useState<string | null>(null);
  const [isNoteError, setIsNoteError] = useState(false);
  const [isScaleCompleted, setIsScaleCompleted] = useState(false);

  // Demo
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Nota faltante
  const [missingIndex, setMissingIndex] = useState(2);
  const [missingLives, setMissingLives] = useState(3);
  const [missingScore, setMissingScore] = useState(0);
  const [missingStreak, setMissingStreak] = useState(0);
  const [missingFeedback, setMissingFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setCurrentStepIndex(0); setCompletedSteps([]); setIsScaleCompleted(false); setIsNoteError(false);
    setMissingIndex(Math.floor(Math.random() * (scaleNotes.length - 2)) + 1);
    setMissingFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootPc, selectedScaleId]);

  const handleNotePlay = useCallback((note: string) => {
    setLastPlayedNote(note);
    const matches = (target: string) => {
      const t = target.slice(0, -1), p = note.slice(0, -1);
      return p === t || ENHARMONIC_MAP[p] === t;
    };

    if (gameMode === 'pathway') {
      if (isScaleCompleted) return;
      if (matches(scaleNotes[currentStepIndex])) {
        setIsNoteError(false);
        setCompletedSteps(prev => [...prev, currentStepIndex]);
        if (currentStepIndex + 1 >= scaleNotes.length) {
          setIsScaleCompleted(true);
          onScoreGain?.(150);
          maestroVoice.speak(`¡Impecable che! Completaste la escala de ${rootName} ${activeScale.name}. Sonó redondita.`);
        } else setCurrentStepIndex(prev => prev + 1);
      } else {
        setIsNoteError(true);
        setTimeout(() => setIsNoteError(false), 800);
      }
    } else if (gameMode === 'missingNote') {
      if (matches(scaleNotes[missingIndex])) {
        setMissingFeedback({ text: '¡Exacto! Esa era la nota que faltaba.', ok: true });
        setMissingScore(prev => prev + 100);
        setMissingStreak(prev => prev + 1);
        onScoreGain?.(100);
        setTimeout(() => {
          setMissingIndex(Math.floor(Math.random() * (scaleNotes.length - 2)) + 1);
          setMissingFeedback(null);
        }, 1200);
      } else {
        setMissingLives(prev => Math.max(0, prev - 1));
        setMissingStreak(0);
        setMissingFeedback({ text: `Tocaste ${note.replace(/\d/, '')}. La que falta es ${displayNames[missingIndex]}.`, ok: false });
      }
    }
  }, [gameMode, isScaleCompleted, scaleNotes, displayNames, currentStepIndex, rootName, activeScale, onScoreGain, missingIndex]);

  useEffect(() => pianoPitchDetector.subscribeNoteOnset(info => handleNotePlay(info.note)), [handleNotePlay]);

  const stopScaleDemo = () => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    setIsPlayingDemo(false);
  };
  const playScaleDemo = async () => {
    if (isPlayingDemo) { stopScaleDemo(); return; }
    await Tone.start();
    setIsPlayingDemo(true);
    let step = 0;
    const synth = new Tone.PolySynth(Tone.Synth, { envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.6 } }).toDestination();
    demoIntervalRef.current = setInterval(() => {
      if (step >= scaleNotes.length) { stopScaleDemo(); synth.dispose(); return; }
      synth.triggerAttackRelease(scaleNotes[step], '8n');
      setCurrentStepIndex(step);
      step++;
    }, 450);
  };
  useEffect(() => () => { if (demoIntervalRef.current) clearInterval(demoIntervalRef.current); }, []);

  const restartPathway = () => {
    setCurrentStepIndex(0); setCompletedSteps([]); setIsScaleCompleted(false); setIsNoteError(false);
  };
  const speakScaleTip = () => {
    maestroVoice.speak(`Escala de ${rootName} ${activeScale.name}. ${activeScale.description} Acordate de la fórmula: ${activeScale.formula}. ${activeScale.mnemonic}`);
  };

  const progress = isScaleCompleted ? 1 : completedSteps.length / scaleNotes.length;
  const activeMode = MODES.find(m => m.id === gameMode)!;

  return (
    <div className="space-y-5">
      {/* ---------- Encabezado + modos ---------- */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="eyebrow">Gimnasio de escalas</div>
          <h2 className="font-serif font-semibold text-2xl md:text-[28px] text-ink leading-tight">
            Memorización y destreza de escalas
          </h2>
          <p className="text-sm text-ink-2 max-w-xl leading-relaxed">{activeMode.hint}.</p>
        </div>

        <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0 lg:overflow-visible">
          <div className="seg shrink-0">
            {MODES.map(m => (
              <button key={m.id} type="button" data-active={gameMode === m.id} onClick={() => setGameMode(m.id)} className="seg-item flex items-center gap-1.5">
                <m.Icon size={13} /> {m.label}
              </button>
            ))}
          </div>
          {onSwitchToCircleSequence && (
            <button type="button" onClick={onSwitchToCircleSequence} className="btn btn-secondary btn-sm shrink-0" data-tip="Generador de secuencias por ciclo de quintas">
              <RotateCw size={14} /> Ciclo de quintas
            </button>
          )}
        </div>
      </header>

      {/* ---------- Configuración de la escala ---------- */}
      <section className="card p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Tónica */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-medium text-ink-2">Tónica</span>
              <span className="text-[11px] text-ink-3">
                {rootInfo?.solfege} ({rootName}) · <span className={DIFFICULTY_STYLE[rootInfo?.difficulty ?? 'Fácil']}>{keySignature}</span>
              </span>
            </div>
            <RootKeyboard value={rootPc} onChange={setRootPc} scaleId={selectedScaleId} />
          </div>

          {/* Tipo de escala */}
          <div className="lg:col-span-7 space-y-2">
            <span className="text-[11px] font-medium text-ink-2 block">Tipo de escala</span>
            <div className="flex flex-wrap gap-1.5">
              {SCALES_DATABASE.map(scale => (
                <button
                  key={scale.id}
                  type="button"
                  onClick={() => setSelectedScaleId(scale.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    selectedScaleId === scale.id
                      ? 'bg-brand-soft border-brand-line text-brand-2'
                      : 'bg-surface-2 border-line text-ink-2 hover:text-ink hover:border-line-strong'
                  )}
                >
                  {scale.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mano */}
          <div className="lg:col-span-12 flex items-center gap-3 pt-1">
            <span className="text-[11px] font-medium text-ink-2 shrink-0">Digitación de la mano</span>
            <div className="seg">
              {(['right', 'left'] as const).map(h => (
                <button
                  key={h}
                  type="button"
                  data-active={selectedHand === h}
                  onClick={() => { setSelectedHand(h); restartPathway(); }}
                  className="seg-item flex items-center justify-center gap-1.5"
                  title={h === 'right' ? 'Digitación de mano derecha' : 'Digitación de mano izquierda'}
                >
                  <Hand size={12} className={h === 'left' ? 'scale-x-[-1]' : ''} /> {h === 'right' ? 'Derecha' : 'Izquierda'}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-ink-3 hidden md:inline">
              Cambia los números de dedo y el pasaje de pulgar.
            </span>
          </div>
        </div>

        {/* Identidad de la escala + acciones */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-line">
          <div className="min-w-0 space-y-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h3 className="font-serif font-semibold text-lg text-ink">{rootName} {activeScale.name}</h3>
              <span className="badge badge-brand font-mono">{activeScale.formula}</span>
              <span className="text-[12px] text-ink-3">{activeScale.mood}</span>
            </div>
            <p className="text-[12.5px] text-ink-2 flex items-start gap-1.5 leading-relaxed">
              <Lightbulb size={13} className="text-brand shrink-0 mt-0.5" />
              <span>{activeScale.mnemonic}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onClick={playScaleDemo} className={cn('btn btn-sm', isPlayingDemo ? 'btn-primary' : 'btn-secondary')}>
              {isPlayingDemo ? <Pause size={14} /> : <Play size={14} className="fill-current" />} Oír escala
            </button>
            <button type="button" id="btn-scalesgym-waterfall-demo" onClick={() => { stopScaleDemo(); setIsWaterfallModalOpen(true); }} className="btn btn-secondary btn-sm">
              <Flame size={14} className="text-orange-400" /> Catarata
            </button>
            <button type="button" onClick={speakScaleTip} className="btn btn-ghost btn-sm" data-tip="Escuchar el consejo del Maestro Aurelio">
              <GraduationCap size={14} /> <span className="hidden sm:inline">Maestro</span>
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Micrófono acústico (plegado por defecto) ---------- */}
      <section className={cn('rounded-[var(--radius-card)] border', micOpen ? 'border-line' : 'border-transparent')}>
        <button
          type="button"
          onClick={() => setMicOpen(v => !v)}
          className={cn(
            'w-full flex items-center gap-2.5 px-4 py-2.5 text-left rounded-[var(--radius-card)] transition-colors',
            micOpen ? 'bg-surface rounded-b-none' : 'bg-surface-2 hover:bg-surface-3 border border-line'
          )}
          aria-expanded={micOpen}
        >
          <Mic size={15} className="text-brand shrink-0" />
          <span className="text-[13px] font-medium text-ink">¿Tocás en un piano de verdad?</span>
          <span className="text-[12px] text-ink-2 hidden sm:inline">Activá el micrófono y validamos cada nota que toques.</span>
          <ChevronDown size={15} className={cn('ml-auto text-ink-3 transition-transform', micOpen && 'rotate-180')} />
        </button>
        <AnimatePresence initial={false}>
          {micOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-3">
                <AcousticPianoListener
                  currentTargetNote={gameMode === 'pathway' ? scaleNotes[currentStepIndex] : scaleNotes[missingIndex]}
                  exerciseName={`Escala ${rootName} ${activeScale.name}`}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ================= MODO: CAMINO DE NOTAS ================= */}
      {gameMode === 'pathway' && (
        <section className="card p-4 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand-soft border border-brand-line flex items-center justify-center text-brand shrink-0">
                <Footprints size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-ink leading-tight">Tocá cada nota en orden</h3>
                <p className="text-[12.5px] text-ink-2">
                  Mano {selectedHand === 'right' ? 'derecha' : 'izquierda'} · seguí el número de dedo sobre cada tecla
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 mr-1">
                <div className="progress w-24"><span style={{ width: `${Math.max(3, progress * 100)}%` }} /></div>
                <span className="font-mono text-xs text-ink tabular-nums">{completedSteps.length}/{scaleNotes.length}</span>
              </div>
              <button
                type="button"
                id="btn-gym-toggle-fingering"
                onClick={() => setShowFingeringNumbers(v => !v)}
                className={cn('btn btn-sm', showFingeringNumbers ? 'btn-secondary border-brand-line text-brand-2' : 'btn-ghost')}
                data-tip="Mostrar los números de dedo sobre las teclas"
              >
                <ListOrdered size={14} /> <span className="hidden md:inline">Dedos</span>
              </button>
              <button type="button" onClick={restartPathway} className="btn btn-ghost btn-sm" data-tip="Volver a la primera nota">
                <RotateCcw size={14} /> <span className="hidden sm:inline">Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Fichas de la escala */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {scaleNotes.map((note, index) => (
              <NoteCard
                key={index}
                note={note}
                label={displayNames[index]}
                degree={activeScale.degreeNames[index]?.split(' ')[0]}
                finger={currentFingering[index]}
                thumbPass={currentThumbPassIndex === index}
                state={
                  completedSteps.includes(index) || (isScaleCompleted && index <= currentStepIndex) ? 'done'
                    : index === currentStepIndex && !isScaleCompleted ? 'current'
                    : 'todo'
                }
              />
            ))}
          </div>

          {/* Objetivo actual */}
          <div className={cn(
            'rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
            isScaleCompleted ? 'bg-ok-soft border-ok/30'
              : isNoteError ? 'bg-danger-soft border-danger/30'
              : 'bg-brand-soft border-brand-line'
          )}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                isScaleCompleted ? 'bg-ok text-bg' : isNoteError ? 'bg-danger text-bg' : 'bg-brand text-brand-ink'
              )}>
                {isScaleCompleted ? <Trophy size={16} /> : isNoteError ? <AlertCircle size={16} /> : <ArrowRight size={16} />}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink flex flex-wrap items-center gap-2">
                  {isScaleCompleted ? '¡Escala completa!'
                    : isNoteError ? <>Esa no: tocaste <span className="font-mono">{lastPlayedNote?.replace(/\d/, '')}</span>, buscá <span className="font-mono text-brand-2">{displayNames[currentStepIndex]}</span></>
                    : <>Siguiente: <span className="font-mono text-brand-2">{displayNames[currentStepIndex]}</span></>}
                  {!isScaleCompleted && !isNoteError && (
                    <span className="badge badge-brand font-mono">
                      dedo {currentFingering[currentStepIndex]} · {FINGER_NAMES[currentFingering[currentStepIndex]]?.name}
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-ink-2 mt-0.5">
                  {isScaleCompleted
                    ? `Buena coordinación con la mano ${selectedHand === 'right' ? 'derecha' : 'izquierda'}. Probá la otra mano o subí el tempo.`
                    : 'El número sobre la tecla es el dedo que te conviene usar.'}
                </p>
              </div>
            </div>
            {isScaleCompleted && (
              <button type="button" onClick={restartPathway} className="btn btn-primary btn-sm shrink-0">
                <RotateCcw size={14} /> Tocar de nuevo
              </button>
            )}
          </div>

          <Piano
            activeNotes={isScaleCompleted ? scaleNotes : [scaleNotes[currentStepIndex]]}
            correctNotes={completedSteps.map(i => scaleNotes[i])}
            errorNotes={isNoteError && lastPlayedNote ? [lastPlayedNote] : []}
            noteSpelling={spelling}
            fingerGuide={showFingeringNumbers ? scaleFingerGuide : undefined}
            showFingerGuide={showFingeringNumbers}
            onToggleFingerGuide={setShowFingeringNumbers}
            showFingerGuideToggle={false}
            showSoundSelector={false}
            showSplitToggle={false}
            showIntervalColorToggle={false}
            showIntervalColors={false}
            onNotePlay={handleNotePlay}
          />
        </section>
      )}

      {/* ================= MODO: NOTA FALTANTE ================= */}
      {gameMode === 'missingNote' && (
        <section className="card p-4 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-soft border border-brand-line flex items-center justify-center text-brand shrink-0">
                <Puzzle size={17} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-ink leading-tight">¿Qué nota falta?</h3>
                <p className="text-[12.5px] text-ink-2">Tocala en el teclado para sumar puntos</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1" title={`${missingLives} vidas`}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart key={i} size={15} className={cn(i < missingLives ? 'text-danger fill-current' : 'text-ink-3/40')} />
                ))}
              </div>
              {missingStreak > 1 && <span className="badge badge-brand"><Flame size={11} /> {missingStreak} seguidas</span>}
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-ink-3 leading-none">Puntos</div>
                <div className="font-mono text-sm font-semibold text-ink tabular-nums">{missingScore}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {scaleNotes.map((note, index) => (
              <NoteCard
                key={index}
                note={note}
                label={displayNames[index]}
                degree={activeScale.degreeNames[index]?.split(' ')[0]}
                state={index === missingIndex ? 'hidden' : 'todo'}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {missingFeedback && (
              <motion.div
                key={missingFeedback.text}
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-[13px] flex items-center gap-2',
                  missingFeedback.ok ? 'bg-ok-soft border-ok/30 text-ok' : 'bg-danger-soft border-danger/30 text-danger'
                )}
              >
                {missingFeedback.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {missingFeedback.text}
              </motion.div>
            )}
          </AnimatePresence>

          {missingLives === 0 && (
            <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-[13px] text-ink-2">Te quedaste sin vidas. Empezá otra ronda cuando quieras.</span>
              <button type="button" onClick={() => { setMissingLives(3); setMissingScore(0); setMissingStreak(0); setMissingFeedback(null); }} className="btn btn-primary btn-sm">
                <RotateCcw size={14} /> Nueva ronda
              </button>
            </div>
          )}

          <Piano onNotePlay={handleNotePlay} noteSpelling={spelling} showSoundSelector={false} showSplitToggle={false} showIntervalColorToggle={false} showIntervalColors={false} showFingerGuideToggle={false} />
        </section>
      )}

      {/* ================= MODO: FÓRMULA T–S ================= */}
      {gameMode === 'formula' && (
        <section className="card p-4 md:p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-soft border border-brand-line flex items-center justify-center text-brand shrink-0">
              <Compass size={17} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink leading-tight">La regla de tonos y semitonos</h3>
              <p className="text-[12.5px] text-ink-2 leading-relaxed mt-0.5 max-w-2xl">
                Un <strong className="text-ink">semitono (S)</strong> es la distancia mínima: dos teclas pegadas, contando las negras.
                Un <strong className="text-ink">tono (T)</strong> son dos semitonos: salteás una tecla en el medio.
              </p>
            </div>
          </div>

          {/* Cadena de intervalos */}
          <div className="flex flex-wrap items-center gap-1.5">
            {scaleNotes.map((note, idx) => {
              const isLast = idx === scaleNotes.length - 1;
              const semis = isLast ? 0 : activeScale.intervals[idx + 1] - activeScale.intervals[idx];
              const label = semis === 1 ? 'S' : semis === 2 ? 'T' : semis === 3 ? 'T+S' : `${semis}`;
              return (
                <React.Fragment key={idx}>
                  <div className={cn(
                    'w-14 h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 shrink-0',
                    idx === 0 || isLast ? 'bg-brand-soft border-brand-line text-brand-2' : 'bg-surface-2 border-line text-ink'
                  )}>
                    <span className="font-mono text-base font-semibold leading-none">{displayNames[idx]}</span>
                    <span className="text-[9px] text-ink-3 leading-none">{isLast ? 'octava' : idx === 0 ? 'tónica' : `grado ${idx + 1}`}</span>
                  </div>
                  {!isLast && (
                    <div className="flex flex-col items-center gap-0.5 shrink-0 w-11" title={semis === 1 ? '1 semitono: teclas pegadas' : `${semis} semitonos`}>
                      <span className={cn(
                        'font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border',
                        semis === 1 ? 'bg-danger-soft border-danger/40 text-danger' : 'bg-surface-3 border-line text-ink-2'
                      )}>
                        {label}
                      </span>
                      <span className="text-[9px] text-ink-3 leading-none">{semis} st</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-2">
            <span className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border bg-danger-soft border-danger/40 text-danger">S</span>
              Semitono: teclas pegadas, sin ninguna en el medio
            </span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border bg-surface-3 border-line text-ink-2">T</span>
              Tono: salteás una tecla (dos semitonos)
            </span>
          </div>

          <Piano
            activeNotes={scaleNotes}
            noteSpelling={spelling}
            fingerGuide={showFingeringNumbers ? scaleFingerGuide : undefined}
            showFingerGuide={showFingeringNumbers}
            onToggleFingerGuide={setShowFingeringNumbers}
            showFingerGuideToggle={false}
            showSoundSelector={false}
            showSplitToggle={false}
            showIntervalColorToggle={false}
            showIntervalColors={false}
            onNotePlay={handleNotePlay}
          />
        </section>
      )}

      {isWaterfallModalOpen && (
        <WaterfallDemoModal
          isOpen={isWaterfallModalOpen}
          onClose={() => setIsWaterfallModalOpen(false)}
          title={`Escala de ${rootName} ${activeScale.name}`}
          subtitle={`Mano ${selectedHand === 'right' ? 'derecha' : 'izquierda'} · digitación clásica`}
          composer="Conservatorio Clásico"
          bpm={80}
          notes={buildWaterfallFromScale(rootName, activeScale.name, scaleNotes, currentFingering, 80)}
        />
      )}
    </div>
  );
};
