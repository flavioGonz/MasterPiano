import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Timer, Trophy, Flame, CheckCircle2, XCircle, 
  RotateCcw, Sparkles, Volume2, ArrowRight, Award, 
  HelpCircle, Play, Music, Layers, ShieldCheck, X,
  Compass, BookOpen, Sliders, ChevronRight
} from 'lucide-react';
import * as Tone from 'tone';
import { cn } from '../lib/utils';
import { Piano } from './Piano';
import { LESSONS, Lesson, UserProgress } from '../types';
import { 
  QuickPracticeCategory, 
  QuickExercise, 
  SCALES_EXERCISES, 
  INVERSIONS_EXERCISES, 
  HARMONY_EXERCISES,
  generateDynamicInversionExercise,
  generateDynamicScaleExercise
} from '../data/quickPracticeDatabase';

export interface QuickPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProgress: UserProgress;
  onSessionComplete?: (pointsGained: number, exercisesSolved: number) => void;
}

// Category tabs definition
const CATEGORY_TABS: { id: QuickPracticeCategory; label: string; icon: string; countBadge: string }[] = [
  { id: 'all', label: 'Todos los Temas', icon: '⚡', countBadge: '120+' },
  { id: 'scales', label: 'Escalas & Digitaciones', icon: '🎼', countBadge: '35+' },
  { id: 'inversions', label: 'Inversiones & Voice Leading', icon: '🔄', countBadge: '35+' },
  { id: 'harmony', label: 'Armonías & Acordes', icon: '🎹', countBadge: '35+' },
  { id: 'ear', label: 'Oído Armónico', icon: '👂', countBadge: '15+' },
];

export const QuickPracticeModal: React.FC<QuickPracticeModalProps> = ({
  isOpen,
  onClose,
  userProgress,
  onSessionComplete,
}) => {
  // Game states: 'intro' | 'active' | 'finished'
  const [gameState, setGameState] = useState<'intro' | 'active' | 'finished'>('intro');
  const [selectedCategory, setSelectedCategory] = useState<QuickPracticeCategory>('all');
  const [sessionDuration, setSessionDuration] = useState<number>(60); // 60, 120, or 0 (free practice)
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  // Current question & user input
  const [currentExercise, setCurrentExercise] = useState<QuickExercise | null>(null);
  const [playedNotes, setPlayedNotes] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Audio tone synth references
  const sfxSynthRef = useRef<Tone.PolySynth | null>(null);
  const tickSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const timerRef = useRef<number | null>(null);

  // Latest scores kept in refs to avoid stale closures in effects and timers
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const solvedCountRef = useRef(solvedCount);
  solvedCountRef.current = solvedCount;

  // Highest score record from localStorage
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pianomaster_quick_practice_best');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Sound effects setup
  useEffect(() => {
    const sfx = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.3 }
    }).toDestination();
    sfx.volume.value = -6;
    sfxSynthRef.current = sfx;

    const tick = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }
    }).toDestination();
    tick.volume.value = -12;
    tickSynthRef.current = tick;

    return () => {
      sfx.dispose();
      tick.dispose();
    };
  }, []);

  const playSuccessSfx = () => {
    try {
      const now = Tone.now();
      sfxSynthRef.current?.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '16n', now);
    } catch {
      // ignore
    }
  };

  const playFailSfx = () => {
    try {
      const now = Tone.now();
      sfxSynthRef.current?.triggerAttackRelease(['F3', 'B2'], '8n', now);
    } catch {
      // ignore
    }
  };

  const playEarChallengeSound = (keys: string[], style: 'chord' | 'arpeggio' = 'chord') => {
    try {
      Tone.start();
      const now = Tone.now();
      if (style === 'chord') {
        sfxSynthRef.current?.triggerAttackRelease(keys, '0.8n', now);
      } else {
        keys.forEach((note, idx) => {
          sfxSynthRef.current?.triggerAttackRelease(note, '0.4n', now + idx * 0.25);
        });
      }
    } catch {
      // ignore
    }
  };

  // Compile available exercises strictly based on unlocked progress + selected category
  const generateExercisePool = useCallback((): QuickExercise[] => {
    const unlockedIds = new Set(userProgress.unlockedLessons || ['1']);
    (userProgress.completedLessons || []).forEach(id => unlockedIds.add(id));

    // Fundamental exercises (lesson 1-4)
    const fundamentalsPool: QuickExercise[] = [
      {
        id: 'fund-c4',
        category: 'fundamentals',
        lessonId: '1',
        moduleTitle: 'Fundamentos',
        lessonTitle: 'El Secreto del DO',
        question: 'Toca el Do Central (C4) en el teclado',
        type: 'piano',
        targetKeys: ['C4'],
        mode: 'single',
        hint: 'Tecla blanca justo a la izquierda del grupo de dos teclas negras centrales.',
        aurelioTip: 'El Do Central es tu punto de ancla universal en el piano.'
      },
      {
        id: 'fund-e4',
        category: 'fundamentals',
        lessonId: '1',
        moduleTitle: 'Fundamentos',
        lessonTitle: 'Mapa de Notas',
        question: 'Toca la nota Mi (E4)',
        type: 'piano',
        targetKeys: ['E4'],
        mode: 'single',
        hint: 'A la derecha de Re: Do (C) - Re (D) - Mi (E).',
        aurelioTip: 'Mi es la tercera de Do: tocala con el dedo medio.'
      },
      {
        id: 'fund-fingers-thumb',
        category: 'fundamentals',
        lessonId: '2',
        moduleTitle: 'Fundamentos',
        lessonTitle: 'Código de Dedos',
        question: 'En la numeración universal del piano, ¿a qué dedo corresponde el número 1?',
        type: 'mcq',
        options: ['Pulgar 👍', 'Índice ☝️', 'Medio 🖕', 'Meñique 🖐️'],
        correctIndex: 0,
        explanation: 'El dedo 1 siempre es el pulgar, en ambas manos.',
        aurelioTip: '1=Pulgar, 2=Índice, 3=Medio, 4=Anular, 5=Meñique.'
      },
      {
        id: 'fund-semitono-mifa',
        category: 'fundamentals',
        lessonId: '4',
        moduleTitle: 'Fundamentos',
        lessonTitle: 'Tonos y Semitonos',
        question: '¿Qué distancia exacta hay entre Mi (E) y Fa (F)?',
        type: 'mcq',
        options: [
          '1 Semitono natural (sin tecla negra intermedia)',
          '1 Tono entero (2 semitonos)',
          '2 Tonos completos',
          '3 Semitonos'
        ],
        correctIndex: 0,
        explanation: 'Entre Mi y Fa (y entre Si y Do) la distancia es un semitono directo natural.',
        aurelioTip: 'Fijate en el teclado: no hay tecla negra entre Mi y Fa ni entre Si y Do.'
      }
    ];

    let combined: QuickExercise[] = [];

    if (selectedCategory === 'all') {
      combined = [
        ...fundamentalsPool,
        ...SCALES_EXERCISES,
        ...INVERSIONS_EXERCISES,
        ...HARMONY_EXERCISES
      ];
    } else if (selectedCategory === 'scales') {
      combined = [...SCALES_EXERCISES];
    } else if (selectedCategory === 'inversions') {
      combined = [...INVERSIONS_EXERCISES];
    } else if (selectedCategory === 'harmony') {
      combined = [...HARMONY_EXERCISES];
    } else if (selectedCategory === 'ear') {
      combined = [
        ...SCALES_EXERCISES.filter(e => e.type === 'ear'),
        ...INVERSIONS_EXERCISES.filter(e => e.type === 'ear'),
        ...HARMONY_EXERCISES.filter(e => e.type === 'ear'),
      ];
    }

    // Add procedural exercises dynamically to ensure pool never runs dry
    if (selectedCategory === 'inversions' || selectedCategory === 'all') {
      combined.push(generateDynamicInversionExercise(unlockedIds));
      combined.push(generateDynamicInversionExercise(unlockedIds));
    }
    if (selectedCategory === 'scales' || selectedCategory === 'all') {
      combined.push(generateDynamicScaleExercise());
      combined.push(generateDynamicScaleExercise());
    }

    return combined;
  }, [userProgress.unlockedLessons, userProgress.completedLessons, selectedCategory]);

  // Pick next random exercise
  const pickNextExercise = useCallback((prevId?: string) => {
    const pool = generateExercisePool();
    if (pool.length === 0) return;

    let candidates = pool.filter(e => e.id !== prevId);
    if (candidates.length === 0) candidates = pool;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    setCurrentExercise(chosen);
    setPlayedNotes([]);
    setFeedback('idle');
    setFeedbackNotice(null);
    setSelectedOption(null);

    // If ear challenge, trigger sound after brief delay
    if (chosen.type === 'ear' && chosen.audioKeys) {
      setTimeout(() => {
        playEarChallengeSound(chosen.audioKeys!, chosen.audioStyle);
      }, 250);
    }
  }, [generateExercisePool]);

  // Start the practice
  const handleStartGame = () => {
    Tone.start();
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setSolvedCount(0);
    setTotalAttempts(0);
    setTimeLeft(sessionDuration);
    setGameState('active');
    pickNextExercise();
  };

  // Stop timer and reset when modal is closed
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setGameState('intro');
      setTimeLeft(sessionDuration);
      setFeedback('idle');
      setFeedbackNotice(null);
      setPlayedNotes([]);
    }
  }, [isOpen, sessionDuration]);

  // Complete session & handle scores
  const handleFinishSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setGameState('finished');

    const finalScore = scoreRef.current;
    const finalSolved = solvedCountRef.current;

    // Save best score
    setBestScore(prev => {
      if (finalScore > prev) {
        try {
          localStorage.setItem('pianomaster_quick_practice_best', finalScore.toString());
        } catch {
          // ignore
        }
        return finalScore;
      }
      return prev;
    });

    if (onSessionComplete) {
      onSessionComplete(finalScore, finalSolved);
    }
  }, [onSessionComplete]);

  // Timer loop
  useEffect(() => {
    if (gameState !== 'active' || sessionDuration === 0) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }

        // Warning tick in last 10 seconds
        if (prev <= 10) {
          try {
            tickSynthRef.current?.triggerAttackRelease('C4', '32n');
          } catch {
            // ignore
          }
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState, sessionDuration]);

  // Trigger completion cleanly when timer reaches 0
  useEffect(() => {
    if (gameState === 'active' && sessionDuration > 0 && timeLeft === 0) {
      handleFinishSession();
    }
  }, [timeLeft, gameState, sessionDuration, handleFinishSession]);

  // User plays a note on the piano
  const handlePianoNotePlay = (note: string) => {
    if (gameState !== 'active' || feedback !== 'idle' || !currentExercise) return;

    const targetKeys = currentExercise.targetKeys || [];

    if (currentExercise.mode === 'single') {
      setPlayedNotes([note]);
      if (note === targetKeys[0]) {
        handleSuccess();
      } else {
        handleFail();
      }
    } else if (currentExercise.mode === 'chord') {
      const newPlayed = [...playedNotes, note];
      const trimmed = newPlayed.slice(-targetKeys.length);
      setPlayedNotes(trimmed);

      const allPresent = targetKeys.every(k => trimmed.includes(k));
      if (allPresent) {
        // Inversions validation: if requiredBassNote is defined, verify lowest pitch!
        if (currentExercise.requiredBassNote) {
          const pitchVal = (n: string) => {
            const name = n.slice(0, -1);
            const oct = parseInt(n.slice(-1), 10);
            return oct * 12 + ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(name);
          };
          const lowest = [...trimmed].sort((a, b) => pitchVal(a) - pitchVal(b))[0];
          if (lowest && lowest.slice(0, -1) !== currentExercise.requiredBassNote) {
            handleFail(`¡Casi! Tocaste las notas del acorde, pero el bajo debe ser ${currentExercise.requiredBassNote}.`);
            return;
          }
        }
        handleSuccess();
      }
    } else if (currentExercise.mode === 'sequence') {
      const nextExpectedIndex = playedNotes.length;
      if (note === targetKeys[nextExpectedIndex]) {
        const updated = [...playedNotes, note];
        setPlayedNotes(updated);
        if (updated.length === targetKeys.length) {
          handleSuccess();
        }
      } else {
        handleFail();
      }
    }
  };

  // User chooses an MCQ option
  const handleMcqSelect = (optionIndex: number) => {
    if (gameState !== 'active' || feedback !== 'idle' || !currentExercise) return;

    setSelectedOption(optionIndex);
    if (optionIndex === currentExercise.correctIndex) {
      handleSuccess();
    } else {
      handleFail();
    }
  };

  // Correct answer flow
  const handleSuccess = () => {
    setFeedback('correct');
    setFeedbackNotice(null);
    playSuccessSfx();

    const streakBonus = Math.min(streak * 15, 60);
    const pointsEarned = 100 + streakBonus;

    setScore(prev => prev + pointsEarned);
    setSolvedCount(prev => prev + 1);
    setTotalAttempts(prev => prev + 1);
    setStreak(prev => {
      const next = prev + 1;
      if (next > maxStreak) setMaxStreak(next);
      return next;
    });

    setTimeout(() => {
      pickNextExercise(currentExercise?.id);
    }, 600);
  };

  // Wrong answer flow
  const handleFail = (notice?: string) => {
    setFeedback('wrong');
    if (notice) setFeedbackNotice(notice);
    playFailSfx();
    setTotalAttempts(prev => prev + 1);
    setStreak(0);

    setTimeout(() => {
      setFeedback('idle');
      setPlayedNotes([]);
      setSelectedOption(null);
    }, 700);
  };

  // Skip exercise
  const handleSkip = () => {
    if (gameState !== 'active') return;
    setStreak(0);
    setTotalAttempts(prev => prev + 1);
    pickNextExercise(currentExercise?.id);
  };

  if (!isOpen) return null;

  const totalPoolSize = generateExercisePool().length;
  const accuracy = totalAttempts > 0 ? Math.round((solvedCount / totalAttempts) * 100) : 100;
  const isTimeCritical = sessionDuration > 0 && timeLeft <= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-3xl bg-[#0b0e17] border border-amber-400/30 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col my-auto relative"
      >
        {/* Top Header Bar */}
        <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-bold shadow-md shadow-amber-400/30">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base md:text-lg text-white">
                  Práctica Rápida
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {totalPoolSize}+ Ejercicios
                </span>
              </div>
              <div className="text-[11px] text-white/50 font-mono flex items-center gap-1.5">
                <span>Enfoque:</span>
                <strong className="text-amber-300">
                  {CATEGORY_TABS.find(t => t.id === selectedCategory)?.label}
                </strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Category Filter Pills (Always visible for quick switching) */}
        <div className="px-4 md:px-6 pt-3 pb-1 border-b border-white/5 bg-[#090b12] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map(tab => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(tab.id);
                  if (gameState === 'active') {
                    setTimeout(() => pickNextExercise(), 50);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all shrink-0 border",
                  isSelected
                    ? "bg-amber-400 text-black border-amber-300 font-bold shadow-md shadow-amber-400/20 scale-[1.02]"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.2 rounded-full",
                  isSelected ? "bg-black/20 text-black font-extrabold" : "bg-white/10 text-white/40"
                )}>
                  {tab.countBadge}
                </span>
              </button>
            );
          })}
        </div>

        {/* GAME ARENA */}
        <div className="p-4 md:p-6 space-y-6">

          {/* INTRO SCREEN */}
          {gameState === 'intro' && (
            <div className="text-center space-y-6 py-2 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/30 mx-auto flex items-center justify-center text-amber-400 text-3xl font-serif">
                ⚡
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl md:text-3xl font-serif font-bold text-white">
                  Entrenamiento de Reflejos y Memoria
                </h4>
                <p className="text-xs md:text-sm text-white/70 font-light leading-relaxed">
                  Consolida tu técnica pianística con cientos de desafíos específicos: escalas con digitación recomendada, tríadas en todas sus inversiones con identificación de bajos, armonías diatónicas y reconocimiento de oído.
                </p>
              </div>

              {/* Session Duration Selector */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
                <div className="text-xs font-mono text-white/50 flex items-center gap-1.5">
                  <Timer size={14} className="text-amber-400" />
                  <span>Selecciona el Modo de Práctica:</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { sec: 60, label: 'Blitz 60s', desc: 'Rápido e intenso' },
                    { sec: 120, label: 'Intensivo 120s', desc: 'Doble resistencia' },
                    { sec: 0, label: 'Modo Zen ∞', desc: 'Sin límite de tiempo' },
                  ].map(mode => (
                    <button
                      key={mode.sec}
                      type="button"
                      onClick={() => setSessionDuration(mode.sec)}
                      className={cn(
                        "p-2.5 rounded-xl border text-center font-mono transition-all",
                        sessionDuration === mode.sec
                          ? "bg-amber-400/20 border-amber-400 text-amber-300 font-bold shadow-md shadow-amber-400/10"
                          : "bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <div className="text-xs font-bold">{mode.label}</div>
                      <div className="text-[10px] text-white/40">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Best Score Banner */}
              {bestScore > 0 && (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-white/50">
                  <Trophy size={14} className="text-amber-400" />
                  <span>Récord Personal: <strong className="text-amber-300">{bestScore} PTS</strong></span>
                </div>
              )}

              {/* Start Button */}
              <button
                type="button"
                id="btn-start-quick-practice"
                onClick={handleStartGame}
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono text-sm uppercase tracking-wider shadow-lg shadow-amber-400/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Play size={16} />
                <span>
                  {sessionDuration === 0 
                    ? '¡Comenzar Práctica Sin Límite!' 
                    : `¡Comenzar Desafío (${sessionDuration}s)!`}
                </span>
              </button>
            </div>
          )}

          {/* ACTIVE GAMEPLAY */}
          {gameState === 'active' && currentExercise && (
            <div className="space-y-5">
              
              {/* Heads-Up Display: Timer, Streak, Score */}
              <div className="grid grid-cols-3 gap-3">
                {/* Timer / Mode */}
                <div className={cn(
                  "p-3 rounded-2xl border text-center transition-all",
                  isTimeCritical 
                    ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse" 
                    : "bg-white/5 border-white/10 text-white"
                )}>
                  <div className="text-[10px] font-mono uppercase text-white/40 flex items-center justify-center gap-1">
                    <Timer size={11} />
                    <span>{sessionDuration === 0 ? 'Modo' : 'Tiempo'}</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-mono font-bold",
                    isTimeCritical ? "text-rose-400" : "text-amber-400"
                  )}>
                    {sessionDuration === 0 ? 'Libre ∞' : `${timeLeft}s`}
                  </div>
                </div>

                {/* Score */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] font-mono uppercase text-white/40 flex items-center justify-center gap-1">
                    <Trophy size={11} />
                    <span>Puntaje</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {score} <span className="text-[10px] text-amber-400 font-normal">PTS</span>
                  </div>
                </div>

                {/* Streak */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] font-mono uppercase text-white/40 flex items-center justify-center gap-1">
                    <Flame size={11} />
                    <span>Racha</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-rose-400">
                    {streak} 🔥
                  </div>
                </div>
              </div>

              {/* Progress bar countdown (if timed) */}
              {sessionDuration > 0 && (
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000",
                      isTimeCritical ? "bg-rose-500" : "bg-gradient-to-r from-amber-500 to-amber-300"
                    )}
                    style={{ width: `${(timeLeft / sessionDuration) * 100}%` }}
                  />
                </div>
              )}

              {/* CURRENT EXERCISE CARD */}
              <div className="p-5 md:p-6 rounded-3xl bg-black/40 border border-white/10 text-center space-y-4 relative overflow-hidden">
                
                {/* Meta header of question */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-white/50">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] uppercase font-bold">
                      {currentExercise.moduleTitle}
                    </span>
                    <span className="text-white/60 text-[11px]">
                      {currentExercise.lessonTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    {currentExercise.requiredBassNote && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-bold">
                        Bajo: {currentExercise.requiredBassNote}
                      </span>
                    )}
                    <span>Aciertos: <strong className="text-emerald-400">{solvedCount}</strong></span>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="space-y-1.5">
                  <h3 className="text-lg md:text-2xl font-serif font-bold text-white leading-snug">
                    {currentExercise.question}
                  </h3>
                  {currentExercise.hint && (
                    <p className="text-xs text-amber-300/80 font-mono">
                      💡 {currentExercise.hint}
                    </p>
                  )}
                </div>

                {/* Maestro Aurelio Pedagogical Tip */}
                {currentExercise.aurelioTip && (
                  <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-left flex items-center gap-2.5 text-xs">
                    <span className="text-lg shrink-0">🇺🇾</span>
                    <p className="text-amber-200/90 font-mono text-[11px]">
                      <strong>Tip del Maestro:</strong> {currentExercise.aurelioTip}
                    </p>
                  </div>
                )}

                {/* EAR CHALLENGE AUDIO PLAYER */}
                {currentExercise.type === 'ear' && currentExercise.audioKeys && (
                  <div className="py-2">
                    <button
                      type="button"
                      onClick={() => playEarChallengeSound(currentExercise.audioKeys!, currentExercise.audioStyle)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-mono transition-all shadow hover:scale-105"
                    >
                      <Volume2 size={16} />
                      <span>Volver a Escuchar Sonido</span>
                    </button>
                  </div>
                )}

                {/* INTERACTIVE COMPONENT: PIANO VS MCQ */}
                {currentExercise.type === 'piano' ? (
                  <div className="space-y-3 pt-2">
                    {/* Status of played keys */}
                    <div className="flex items-center justify-center gap-2 min-h-[36px]">
                      {currentExercise.targetKeys?.map((target, idx) => {
                        const hit = playedNotes.includes(target) || (currentExercise.mode === 'sequence' && playedNotes[idx] === target);
                        const finger = currentExercise.fingerGuide?.[target];
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center text-xs font-mono font-bold border transition-all",
                              hit 
                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
                                : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            <span className="text-sm">{target.replace(/\d/, '')}</span>
                            {finger && (
                              <span className="text-[9px] text-amber-300/80 font-normal">
                                d.{finger}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Integrated Mini Piano with Finger Guide Numbers Active */}
                    <div className="pt-2">
                      <Piano
                        compact={true}
                        activeNotes={playedNotes}
                        correctNotes={playedNotes.filter(n => currentExercise.targetKeys?.includes(n))}
                        fingerGuide={currentExercise.fingerGuide}
                        showFingerGuide={true}
                        showFingerGuideToggle={false}
                        onNotePlay={handlePianoNotePlay}
                      />
                    </div>
                  </div>
                ) : (
                  /* MCQ OPTIONS */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {currentExercise.options?.map((opt, index) => {
                      const isSelected = selectedOption === index;
                      const isCorrect = index === currentExercise.correctIndex;
                      let btnStyle = "bg-white/5 border-white/10 hover:bg-white/10 text-white";

                      if (feedback !== 'idle') {
                        if (isCorrect) {
                          btnStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                        } else if (isSelected && !isCorrect) {
                          btnStyle = "bg-rose-500/20 border-rose-400 text-rose-300";
                        } else {
                          btnStyle = "opacity-30 bg-white/5 border-white/5";
                        }
                      }

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleMcqSelect(index)}
                          disabled={feedback !== 'idle'}
                          className={cn(
                            "p-3.5 md:p-4 rounded-2xl border text-left text-xs md:text-sm font-mono flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]",
                            btnStyle
                          )}
                        >
                          <span className="font-semibold">{opt}</span>
                          <span className="w-5 h-5 rounded-md bg-white/10 text-[10px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Actions: Skip or End Free Session */}
                <div className="pt-3 flex items-center justify-between border-t border-white/5 text-xs font-mono text-white/40">
                  <span>Presiona teclas o haz clic para responder</span>
                  <div className="flex items-center gap-3">
                    {sessionDuration === 0 && (
                      <button
                        type="button"
                        onClick={handleFinishSession}
                        className="text-amber-400 hover:text-amber-300 transition-colors font-bold"
                      >
                        Finalizar Práctica Libre
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="hover:text-amber-300 transition-colors underline"
                    >
                      Saltar ejercicio →
                    </button>
                  </div>
                </div>

                {/* Visual Feedback Flash */}
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-none"
                    >
                      <div className="text-center space-y-1">
                        <div className="text-4xl">✨</div>
                        <div className="text-xl font-serif font-bold text-emerald-300">¡Correcto, che!</div>
                        <div className="text-emerald-400 font-mono text-xs">+100 PTS • Racha {streak + 1} 🔥</div>
                      </div>
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-rose-950/85 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-none p-4"
                    >
                      <div className="text-center space-y-1">
                        <div className="text-4xl">💥</div>
                        <div className="text-xl font-serif font-bold text-rose-300">
                          {feedbackNotice || '¡Casi! Revisá las notas'}
                        </div>
                        <div className="text-rose-400 font-mono text-xs">Racha reiniciada • ¡Vamos de vuelta!</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          )}

          {/* FINISHED / RESULTS SCREEN */}
          {gameState === 'finished' && (
            <div className="text-center space-y-6 py-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 text-3xl font-serif">
                🏆
              </div>

              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
                  ¡Sesión Blitz Completada!
                </div>
                <h4 className="text-3xl font-serif font-bold text-white">
                  {score >= 600 ? '¡Rendimiento Virtuoso!' : '¡Excelente Práctica Rápida!'}
                </h4>
                <p className="text-xs text-white/60 font-light">
                  Enfoque en <strong>{CATEGORY_TABS.find(t => t.id === selectedCategory)?.label}</strong>.
                </p>
              </div>

              {/* Stats Summary Bento Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase">Puntos</div>
                  <div className="text-lg font-bold text-amber-400">+{score}</div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase">Aciertos</div>
                  <div className="text-lg font-bold text-emerald-400">{solvedCount}</div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase">Racha Máx.</div>
                  <div className="text-lg font-bold text-rose-400">{maxStreak} 🔥</div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase">Precisión</div>
                  <div className="text-lg font-bold text-purple-300">{accuracy}%</div>
                </div>
              </div>

              {/* Maestro Aurelio quote */}
              <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-left flex items-start gap-3">
                <div className="text-2xl">🇺🇾</div>
                <div className="space-y-1 text-xs">
                  <div className="font-mono font-bold text-amber-300 uppercase">
                    Devolución del Maestro Aurelio:
                  </div>
                  <p className="text-white/80 font-light">
                    {score >= 800
                      ? '¡Impecable che! Reflejos de concertista. Dominar escalas e inversiones con esta velocidad te va a dar una libertad tremenda para tocar cualquier tema.'
                      : score >= 400
                      ? '¡Muy bien metido! Un par de minutos repasando las inversiones y las escalas todos los días te fijan los conceptos en los dedos para siempre.'
                      : '¡Buen intento che! En el piano las inversiones y las escalas se asimilan con calma. Seguí practicando que el tacto y los reflejos se van afinando solos.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="flex-1 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} />
                  <span>Jugar Otra Vez</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
