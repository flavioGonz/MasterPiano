import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Play, Pause, RotateCcw, Volume2, Award, Sparkles, 
  CheckCircle2, Target, Trophy, Flame, ChevronRight, Music, 
  HelpCircle, Compass, RefreshCw, Zap, ArrowRight, PartyPopper,
  Hand, Info, Layers
} from 'lucide-react';
import { 
  CLASSICAL_BOOKS, ClassicalBook, ClassicalExercise, 
  ClassicalBookId, MethodNote 
} from '../data/classicalMethodsData';
import { Piano } from './Piano';
import { AcousticPianoListener } from './AcousticPianoListener';
import { ClassicalScoreEngineViewer } from './ClassicalScoreEngineViewer';
import { WaterfallDemoModal } from './WaterfallDemoModal';
import { buildWaterfallFromMethodNotes } from '../lib/midiWaterfall';
import { pianoPitchDetector } from '../lib/pitchDetector';
import { soundEngine, getSavedSoundPreset } from '../lib/soundPresets';
import { triggerCurriculumConfetti } from '../lib/celebration';
import { maestroVoice } from '../lib/speech';
import { cn } from '../lib/utils';
import * as Tone from 'tone';

interface ClassicalMethodsGymProps {
  onScoreGain?: (points: number) => void;
}

export const ClassicalMethodsGym: React.FC<ClassicalMethodsGymProps> = ({
  onScoreGain,
}) => {
  const [selectedBookId, setSelectedBookId] = useState<ClassicalBookId>('hanon');
  const [difficultyFilter, setDifficultyFilter] = useState<'Todos' | 'Principiante' | 'Intermedio' | 'Avanzado'>('Todos');
  
  const currentBook = CLASSICAL_BOOKS.find(b => b.id === selectedBookId) || CLASSICAL_BOOKS[0];
  const filteredExercises = currentBook.exercises.filter(ex => 
    difficultyFilter === 'Todos' ? true : ex.difficulty === difficultyFilter
  );

  const [selectedExercise, setSelectedExercise] = useState<ClassicalExercise>(currentBook.exercises[0]);

  // Main Gym View Mode: 'score_module' (Partituras Técnicas JSON/MIDI) or 'guided_practice' (Entrenamiento en Piano)
  const [gymViewMode, setGymViewMode] = useState<'score_module' | 'guided_practice'>('score_module');

  // Practice & Playback State
  const [handMode, setHandMode] = useState<'both' | 'right' | 'left'>('right');
  const [tempoBpm, setTempoBpm] = useState<number>(selectedExercise.recommendedBpm);
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  // Interactive Play-along Mode
  const [isInteractivePractice, setIsInteractivePractice] = useState<boolean>(false);
  const [practiceProgressIdx, setPracticeProgressIdx] = useState<number>(0);
  const [practiceErrors, setPracticeErrors] = useState<number>(0);
  const [practiceSuccess, setPracticeSuccess] = useState<boolean>(false);
  const [streakCount, setStreakCount] = useState<number>(0);

  // Tone Waterfall Demo Modal State
  const [isWaterfallModalOpen, setIsWaterfallModalOpen] = useState<boolean>(false);
  const [waterfallExercise, setWaterfallExercise] = useState<ClassicalExercise | null>(null);

  const playbackTimerRef = useRef<any>(null);

  // Open Tone Waterfall demo for specific or selected exercise
  const handleOpenWaterfallDemo = (ex?: ClassicalExercise) => {
    stopPlayback();
    const target = ex || selectedExercise;
    setWaterfallExercise(target);
    setIsWaterfallModalOpen(true);
  };

  // Change exercise handler
  const handleSelectExercise = (ex: ClassicalExercise) => {
    stopPlayback();
    setSelectedExercise(ex);
    setTempoBpm(ex.recommendedBpm);
    setCurrentStepIdx(0);
    setPracticeProgressIdx(0);
    setPracticeErrors(0);
    setPracticeSuccess(false);
  };

  // Change book handler
  const handleSelectBook = (bookId: ClassicalBookId) => {
    stopPlayback();
    setSelectedBookId(bookId);
    const newBook = CLASSICAL_BOOKS.find(b => b.id === bookId) || CLASSICAL_BOOKS[0];
    const initialEx = newBook.exercises[0];
    setSelectedExercise(initialEx);
    setTempoBpm(initialEx.recommendedBpm);
    setCurrentStepIdx(0);
    setPracticeProgressIdx(0);
    setPracticeErrors(0);
    setPracticeSuccess(false);
  };

  // Get active notes sequence based on hand mode
  const getActiveNotesSequence = useCallback((): MethodNote[] => {
    if (handMode === 'right') return selectedExercise.rightHandNotes;
    if (handMode === 'left') return selectedExercise.leftHandNotes;
    // Both hands: merge or prioritize right hand melody
    return selectedExercise.rightHandNotes;
  }, [handMode, selectedExercise]);

  const activeSequence = getActiveNotesSequence();
  const currentExpectedNote = activeSequence[isInteractivePractice ? practiceProgressIdx : currentStepIdx];

  // Stop playback cleanly
  const stopPlayback = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlayingDemo(false);
  };

  // Play audio demonstration
  const handleToggleDemo = () => {
    if (isPlayingDemo) {
      stopPlayback();
      return;
    }

    setIsInteractivePractice(false);
    setIsPlayingDemo(true);
    let step = currentStepIdx >= activeSequence.length - 1 ? 0 : currentStepIdx;
    setCurrentStepIdx(step);

    const stepIntervalMs = Math.max(180, (60 / tempoBpm) * 500); // 8th note speed roughly
    const preset = getSavedSoundPreset();

    playbackTimerRef.current = setInterval(() => {
      if (step >= activeSequence.length) {
        stopPlayback();
        setCurrentStepIdx(0);
        return;
      }

      const noteItem = activeSequence[step];
      if (noteItem) {
        soundEngine.playNote(noteItem.note, preset, noteItem.duration || '8n');

        // Also play left hand in 'both' mode
        if (handMode === 'both' && selectedExercise.leftHandNotes[step]) {
          soundEngine.playNote(selectedExercise.leftHandNotes[step].note, preset, '8n');
        }
      }

      setCurrentStepIdx(step);
      step++;
    }, stepIntervalMs);
  };

  // Reset current playback on unmount or exercise change
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  // Handle note pressed on Piano (screen or physical/MIDI)
  const handleNotePressed = (pressedNote: string) => {
    if (isPlayingDemo) return;

    const preset = getSavedSoundPreset();
    soundEngine.playNote(pressedNote, preset, '4n');

    if (!isInteractivePractice) {
      // Free play or exploration
      return;
    }

    // Interactive practice evaluation
    const expected = activeSequence[practiceProgressIdx];
    if (!expected) return;

    if (pressedNote === expected.note) {
      // Correct!
      const nextIdx = practiceProgressIdx + 1;
      setStreakCount(prev => prev + 1);
      if (onScoreGain) onScoreGain(15);

      if (nextIdx >= activeSequence.length) {
        // Exercise completed!
        setPracticeProgressIdx(activeSequence.length);
        setPracticeSuccess(true);
        setIsInteractivePractice(false);
        triggerCurriculumConfetti('grand');
        maestroVoice.speak(`¡Excelente! Has dominado el ejercicio ${selectedExercise.exerciseNumber} con maestría.`);
        if (onScoreGain) onScoreGain(100);
      } else {
        setPracticeProgressIdx(nextIdx);
      }
    } else {
      // Wrong note
      setPracticeErrors(prev => prev + 1);
      setStreakCount(0);
    }
  };

  // Subscribe to real-time acoustic microphone pitch detector
  useEffect(() => {
    const unsub = pianoPitchDetector.subscribeNoteOnset((info) => {
      handleNotePressed(info.note);
    });
    return unsub;
  }, [handleNotePressed]);

  // Start guided interactive practice
  const handleStartPractice = () => {
    stopPlayback();
    setIsInteractivePractice(true);
    setPracticeProgressIdx(0);
    setPracticeErrors(0);
    setPracticeSuccess(false);
    setStreakCount(0);
  };

  // Currently active highlighted keys for the Piano visualizer
  const activeKeysToHighlight: string[] = [];
  if (currentExpectedNote) {
    activeKeysToHighlight.push(currentExpectedNote.note);
    if (handMode === 'both' && selectedExercise.leftHandNotes[isInteractivePractice ? practiceProgressIdx : currentStepIdx]) {
      activeKeysToHighlight.push(selectedExercise.leftHandNotes[isInteractivePractice ? practiceProgressIdx : currentStepIdx].note);
    }
  }

  return (
    <div className="space-y-10">
      {/* MODULE NAVIGATION BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-black/60 border border-white/10">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setGymViewMode('score_module')}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all uppercase tracking-wider",
              gymViewMode === 'score_module'
                ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Layers size={15} />
            <span>Módulo de Partituras Técnicas (JSON / MIDI)</span>
          </button>

          <button
            type="button"
            onClick={() => setGymViewMode('guided_practice')}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all uppercase tracking-wider",
              gymViewMode === 'guided_practice'
                ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Target size={15} />
            <span>Entrenamiento Guiado & Práctica en Vivo</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-white/40 hidden md:flex items-center gap-2 px-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Hanon • Czerny • Suzuki Integrados</span>
        </div>
      </div>

      {gymViewMode === 'score_module' ? (
        <ClassicalScoreEngineViewer
          onSelectExerciseToPractice={(ex) => {
            handleSelectBook(ex.bookId);
            handleSelectExercise(ex);
            setGymViewMode('guided_practice');
          }}
        />
      ) : (
        <>
          {/* 3 BOOKS BANNER & SELECTOR CARDS */}
      <div className="space-y-4">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold tracking-widest uppercase">
            <BookOpen size={14} />
            <span>Trilogía de Métodos Clásicos Universales</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">
            Biblioteca de los 3 Grandes Métodos
          </h2>
          <p className="text-xs md:text-sm text-white/60 font-light leading-relaxed">
            Los tres pilares pedagógicos de todo conservatorio: la mecánica pura de <strong>Hanon</strong>, la técnica y lectura clásica de <strong>Czerny</strong>, y el oído musical y musicalidad bella de <strong>Suzuki</strong>.
          </p>
        </div>

        {/* 3 Iconic Book Covers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {CLASSICAL_BOOKS.map((book) => {
            const isSelected = book.id === selectedBookId;
            return (
              <button
                key={book.id}
                type="button"
                onClick={() => handleSelectBook(book.id)}
                className={cn(
                  "relative p-6 rounded-3xl text-left transition-all duration-300 flex flex-col justify-between border overflow-hidden group",
                  isSelected
                    ? "ring-2 shadow-2xl scale-[1.02]"
                    : "bg-[#0b0e17] border-white/10 hover:border-white/20 opacity-85 hover:opacity-100"
                )}
                style={{
                  backgroundColor: isSelected ? book.colorScheme.coverBg : '#0b0e17',
                  borderColor: isSelected ? book.colorScheme.primary : 'rgba(255,255,255,0.1)',
                  boxShadow: isSelected ? `0 10px 30px -10px ${book.colorScheme.primary}40` : 'none',
                }}
              >
                {/* Visual book style badge */}
                <div className="flex items-center justify-between gap-2 w-full mb-4">
                  <span 
                    className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: book.colorScheme.badgeBg,
                      color: book.colorScheme.badgeText,
                      borderColor: book.colorScheme.border,
                    }}
                  >
                    {book.coverTag}
                  </span>
                  <span className="text-[11px] font-mono text-white/40">
                    {book.volumeOrOpus}
                  </span>
                </div>

                {/* Book Title & Cover Graphic Accent */}
                <div className="space-y-1.5 mb-5">
                  <h3 className="text-xl md:text-2xl font-serif font-bold text-white group-hover:text-amber-300 transition-colors">
                    {book.title}
                  </h3>
                  <div className="text-xs font-mono text-white/50">
                    {book.author}
                  </div>
                  <p className="text-xs text-white/70 line-clamp-2 pt-1 font-light">
                    {book.subtitle}
                  </p>
                </div>

                {/* Footer specs */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-white/40">
                    {book.exercises.length} Ejercicios Clave
                  </span>
                  <span 
                    className="font-bold flex items-center gap-1"
                    style={{ color: book.colorScheme.badgeText }}
                  >
                    <span>{isSelected ? 'Estudiando' : 'Abrir Libro'}</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED BOOK OVERVIEW & METHODOLOGY CARD */}
      <div 
        className="glass p-6 md:p-8 rounded-3xl border space-y-6 relative overflow-hidden"
        style={{ borderColor: currentBook.colorScheme.border }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentBook.colorScheme.primary }}
              />
              <span className="text-xs font-mono uppercase tracking-widest text-white/60">
                Pedagogía Oficial: {currentBook.author}
              </span>
            </div>
            <h3 className="text-2xl font-serif font-bold text-white">
              {currentBook.title} — {currentBook.volumeOrOpus}
            </h3>
            <p className="text-xs md:text-sm text-white/70 font-light leading-relaxed">
              {currentBook.description}
            </p>
          </div>

          {/* Quick Audio Advice button */}
          <button
            type="button"
            onClick={() => maestroVoice.speak(currentBook.methodology)}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono text-white flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap shadow"
          >
            <Volume2 size={15} className="text-amber-400" />
            <span>Escuchar Enfoque del Método</span>
          </button>
        </div>

        {/* 4 Pillars of this Book */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {currentBook.keyBenefits.map((benefit, i) => (
            <div 
              key={i} 
              className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-2.5 text-xs text-white/80"
            >
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span className="font-light leading-snug">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Real Acoustic Piano Microphone Analyzer */}
      <AcousticPianoListener
        currentTargetNote={isInteractivePractice ? activeSequence[practiceProgressIdx]?.note : null}
        exerciseName={`${currentBook.title}: ${selectedExercise.title}`}
      />

      {/* EXERCISE SELECTION TABS & WORKSPACE */}
      <div className="space-y-6">
        {/* Filter and Exercise Selector Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-white/40 mr-1">Dificultad:</span>
            {(['Todos', 'Principiante', 'Intermedio', 'Avanzado'] as const).map(diff => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficultyFilter(diff)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                  difficultyFilter === diff
                    ? "bg-amber-400 text-black font-bold shadow"
                    : "text-white/60 hover:text-white bg-white/5"
                )}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Hand Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-black/50 rounded-2xl border border-white/10 text-xs font-mono">
            <span className="text-white/40 px-2 hidden sm:inline">Mano:</span>
            {[
              { id: 'right', label: 'Derecha (MD)', Icon: Hand, iconClass: 'rotate-12' },
              { id: 'left', label: 'Izquierda (MI)', Icon: Hand, iconClass: '-scale-x-100 -rotate-12' },
              { id: 'both', label: 'Ambas Manos', Icon: Layers, iconClass: '' },
            ].map(m => {
              const ModeIcon = m.Icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setHandMode(m.id as any);
                    setCurrentStepIdx(0);
                    setPracticeProgressIdx(0);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all",
                    handMode === m.id
                      ? "bg-amber-400 text-black font-bold shadow"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <ModeIcon size={14} className={m.iconClass} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercises Scroll List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredExercises.map(ex => {
            const isThis = ex.id === selectedExercise.id;
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelectExercise(ex)}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-3",
                  isThis
                    ? "bg-amber-400/15 border-amber-400/50 shadow-lg shadow-amber-400/10"
                    : "bg-black/30 border-white/10 hover:border-white/20 hover:bg-black/50"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-amber-400">
                      Nº {ex.exerciseNumber} • {ex.keySignature}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      ex.difficulty === 'Principiante' ? "bg-emerald-500/20 text-emerald-300" :
                      ex.difficulty === 'Intermedio' ? "bg-amber-500/20 text-amber-300" : "bg-purple-500/20 text-purple-300"
                    )}>
                      {ex.difficulty}
                    </span>
                  </div>
                  <div className="font-serif font-bold text-base text-white">
                    {ex.title}
                  </div>
                  <div className="text-xs text-white/50 line-clamp-1 font-light">
                    {ex.subtitle}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-white/40 pt-2 border-t border-white/5">
                  <span>Tempo: {ex.recommendedBpm} BPM</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenWaterfallDemo(ex);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                      title="Ver en Catarata de Tonos con Digitación"
                    >
                      <Flame size={11} className="text-cyan-400" />
                      <span>Catarata</span>
                    </button>
                    <span className={cn("font-bold flex items-center gap-1", isThis ? "text-amber-300" : "text-white/40")}>
                      <span>{isThis ? 'Activo' : 'Cargar'}</span>
                      <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE EXERCISE INTERACTIVE STAGE */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-8">
        {/* Header with Title & Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <Sparkles size={14} />
              <span>Estudio Activo • {currentBook.title}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-white">
              {selectedExercise.title}
            </h3>
            <p className="text-xs md:text-sm text-white/60 font-light">
              {selectedExercise.focusTechnique}
            </p>
          </div>

          {/* Control Buttons (Demo, Practice, Tempo) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Metronome / BPM Slider */}
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-2xl border border-white/10 text-xs font-mono">
              <span className="text-white/40">Tempo:</span>
              <span className="text-amber-400 font-bold w-12 text-center">{tempoBpm} BPM</span>
              <input
                type="range"
                min={40}
                max={140}
                step={2}
                value={tempoBpm}
                onChange={(e) => setTempoBpm(Number(e.target.value))}
                className="w-20 accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Play/Stop Demo Button */}
            <button
              type="button"
              onClick={handleToggleDemo}
              className={cn(
                "px-4 py-2.5 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow",
                isPlayingDemo
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              )}
            >
              {isPlayingDemo ? <Pause size={15} /> : <Play size={15} className="text-amber-400" />}
              <span>{isPlayingDemo ? 'Pausar Demo' : 'Escuchar Demo'}</span>
            </button>

            {/* Tone Waterfall Demo Button */}
            <button
              type="button"
              id="btn-open-waterfall-demo"
              onClick={() => handleOpenWaterfallDemo()}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95"
              title="Abrir demostración de Catarata de Tonos con notas cayendo y digitación animada"
            >
              <Flame size={15} className="fill-black" />
              <span>Demo Catarata</span>
            </button>

            {/* Interactive Play-Along Practice Button */}
            <button
              type="button"
              onClick={handleStartPractice}
              className={cn(
                "px-5 py-2.5 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg",
                isInteractivePractice
                  ? "bg-emerald-500 text-black shadow-emerald-500/30 ring-2 ring-emerald-400"
                  : "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-amber-400/30"
              )}
            >
              <Target size={15} />
              <span>{isInteractivePractice ? 'Practicando...' : 'Iniciar Práctica Guiada'}</span>
            </button>

            {/* Open in Score Viewer Button */}
            <button
              type="button"
              onClick={() => setGymViewMode('score_module')}
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
              title="Abrir en el Módulo de Partituras Técnicas"
            >
              <Layers size={14} className="text-amber-400" />
              <span>Ver Partitura Técnica</span>
            </button>
          </div>
        </div>

        {/* INTERACTIVE SHEET MUSIC & FINGERING DISPLAY */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-white/50">
            <span className="flex items-center gap-1.5 text-white">
              <BookOpen size={14} className="text-amber-400" />
              <span>Partitura Secuencial con Digitaciones Clásicas (1=Pulgar, 2=Índice, 3=Medio, 4=Anular, 5=Meñique):</span>
            </span>

            {isInteractivePractice && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-bold">
                  Nota {practiceProgressIdx + 1} de {activeSequence.length}
                </span>
                {streakCount > 0 && (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Flame size={13} /> {streakCount} Racha
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Interactive Notes Ribbon with Fingerings */}
          <div className="p-4 rounded-3xl bg-black/50 border border-white/10 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-max py-2 px-1">
              {activeSequence.map((item, idx) => {
                const isCurrent = isInteractivePractice 
                  ? idx === practiceProgressIdx 
                  : idx === currentStepIdx;
                const isPast = isInteractivePractice && idx < practiceProgressIdx;
                
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col items-center justify-center w-14 h-20 rounded-2xl border transition-all duration-200 relative",
                      isCurrent
                        ? "bg-amber-400 text-black border-amber-300 scale-110 shadow-lg shadow-amber-400/40 z-10"
                        : isPast
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 opacity-80"
                          : "bg-white/5 text-white/70 border-white/10"
                    )}
                  >
                    {/* Fingering Number at Top */}
                    <div className={cn(
                      "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full mb-1",
                      isCurrent ? "bg-black/30 text-black" : "bg-white/10 text-white/60"
                    )}>
                      Dedo {item.fingering}
                    </div>

                    {/* Note name */}
                    <div className="font-serif font-bold text-base leading-none">
                      {item.note}
                    </div>

                    {/* Hand indicator */}
                    <div className={cn("text-[9px] font-mono pt-1", isCurrent ? "text-black/70" : "text-white/40")}>
                      {item.hand === 'right' ? 'MD' : 'MI'}
                    </div>

                    {/* Cursor indicator */}
                    {isCurrent && (
                      <div className="absolute -bottom-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PIANO KEYBOARD COMPONENT */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-white/50 px-1">
            <span>
              {isInteractivePractice ? (
                <span className="text-amber-400 font-bold animate-pulse">
                  Toca la nota resaltada en el teclado o usa tus teclas físicas:
                </span>
              ) : (
                <span>Teclado Acústico del Conservatorio:</span>
              )}
            </span>

            {currentExpectedNote && (
              <div className="flex items-center gap-2">
                <span className="text-white/40">Nota esperada:</span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                  {currentExpectedNote.note} (Dedo {currentExpectedNote.fingering} {currentExpectedNote.hand === 'right' ? 'Mano Derecha' : 'Mano Izquierda'})
                </span>
              </div>
            )}
          </div>

          <Piano 
            activeNotes={activeKeysToHighlight} 
            fingerGuide={currentExpectedNote ? { [currentExpectedNote.note]: currentExpectedNote.fingering } : undefined}
            showFingerGuide={true}
            onNotePlay={handleNotePressed}
          />
        </div>

        {/* PRACTICE SUCCESS CELEBRATION CARD */}
        <AnimatePresence>
          {practiceSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-black to-amber-950/80 border border-emerald-500/40 text-center space-y-4 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center mx-auto">
                <Trophy size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-serif font-bold text-white">
                  ¡Ejercicio Completado con Éxito!
                </h4>
                <p className="text-xs md:text-sm text-white/70 font-light">
                  Has ejecutado todas las notas con la digitación correcta de <strong>{selectedExercise.title}</strong>.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => triggerCurriculumConfetti('grand')}
                  className="px-4 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold flex items-center gap-2 transition-all"
                >
                  <PartyPopper size={15} />
                  <span>Celebrar con Confeti</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartPractice}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold flex items-center gap-2 transition-all shadow"
                >
                  <RotateCcw size={15} />
                  <span>Repetir para Perfeccionar</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAESTRO AURELIO PEDAGOGICAL ADVICE */}
        <div className="p-6 rounded-3xl bg-black/40 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
              <Sparkles size={14} />
              <span>Instrucción del Maestro Aurelio</span>
            </div>
            <button
              type="button"
              onClick={() => maestroVoice.speak(selectedExercise.maestroAdvice)}
              className="flex items-center gap-1.5 text-xs font-mono text-white/60 hover:text-white transition-colors"
            >
              <Volume2 size={13} className="text-amber-400" />
              <span>Escuchar voz</span>
            </button>
          </div>
          <p className="text-xs md:text-sm text-white/80 font-light leading-relaxed italic">
            "{selectedExercise.maestroAdvice}"
          </p>
          <div className="text-[11px] font-mono text-white/40 pt-1 border-t border-white/5">
            Nota histórica: {selectedExercise.historicalNote}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Tone Waterfall Demo Modal */}
      {isWaterfallModalOpen && (
        <WaterfallDemoModal
          isOpen={isWaterfallModalOpen}
          onClose={() => setIsWaterfallModalOpen(false)}
          title={waterfallExercise?.title || selectedExercise.title}
          subtitle={`${waterfallExercise?.focusTechnique || selectedExercise.focusTechnique} • ${CLASSICAL_BOOKS.find(b => b.id === (waterfallExercise?.bookId || selectedExercise.bookId))?.author || activeBook.author}`}
          composer={CLASSICAL_BOOKS.find(b => b.id === (waterfallExercise?.bookId || selectedExercise.bookId))?.author || activeBook.author}
          bpm={tempoBpm || waterfallExercise?.recommendedBpm || selectedExercise.recommendedBpm}
          notes={buildWaterfallFromMethodNotes(
            (waterfallExercise || selectedExercise).rightHandNotes,
            (waterfallExercise || selectedExercise).leftHandNotes,
            tempoBpm || (waterfallExercise || selectedExercise).recommendedBpm
          )}
        />
      )}
    </div>
  );
};
