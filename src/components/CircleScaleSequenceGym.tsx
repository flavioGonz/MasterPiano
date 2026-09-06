import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, CheckCircle2, 
  HelpCircle, Trophy, Lightbulb, ChevronRight, Zap, Award, Flame, 
  Compass, Sliders, ArrowRight, Music, Check, Settings2, RefreshCw
} from 'lucide-react';
import * as Tone from 'tone';
import { 
  SCALES_DATABASE, ScaleInfo, calculateScaleNotes, 
  ENHARMONIC_MAP, FINGER_NAMES 
} from '../lib/musicGymTheory';
import { Piano } from './Piano';
import { maestroVoice } from '../lib/speech';
import { cn } from '../lib/utils';

export interface CircleKeyDefinition {
  root: string;
  name: string;
  accidentals: string;
  accidentalsShort: string;
  accidentalsType: 'natural' | 'sharp' | 'flat';
  accidentalsCount: number;
  relativeMinor: string;
  circleOrder: number; // 0 = C, 1 = G, 2 = D, etc.
  maestroAdvice: string;
}

export const CIRCLE_OF_FIFTHS_SEQUENCE: CircleKeyDefinition[] = [
  {
    root: 'C',
    name: 'Do Mayor (C)',
    accidentals: '0 alteraciones (todas teclas blancas)',
    accidentalsShort: '0 alt',
    accidentalsType: 'natural',
    accidentalsCount: 0,
    relativeMinor: 'La menor (Am)',
    circleOrder: 0,
    maestroAdvice: 'El Do es la base de todo. Paso del pulgar de dedo 3 a 1 después del Mi sin mover el codo.'
  },
  {
    root: 'G',
    name: 'Sol Mayor (G)',
    accidentals: '1 sostenido (Fa#)',
    accidentalsShort: '1# (F#)',
    accidentalsType: 'sharp',
    accidentalsCount: 1,
    relativeMinor: 'Mi menor (Em)',
    circleOrder: 1,
    maestroAdvice: 'Aparece el primer sostenido: Fa#. El dedo 4 de la mano derecha cae con naturalidad sobre la tecla negra.'
  },
  {
    root: 'D',
    name: 'Re Mayor (D)',
    accidentals: '2 sostenidos (Fa#, Do#)',
    accidentalsShort: '2# (F#, C#)',
    accidentalsType: 'sharp',
    accidentalsCount: 2,
    relativeMinor: 'Si menor (Bm)',
    circleOrder: 2,
    maestroAdvice: 'Dos teclas negras: Fa# y Do#. Mantené la muñeca flexible y relajada.'
  },
  {
    root: 'A',
    name: 'La Mayor (A)',
    accidentals: '3 sostenidos (Fa#, Do#, Sol#)',
    accidentalsShort: '3# (F#, C#, G#)',
    accidentalsType: 'sharp',
    accidentalsCount: 3,
    relativeMinor: 'Fa# menor (F#m)',
    circleOrder: 3,
    maestroAdvice: 'Tres sostenidos. Observá el patrón geométrico: dos teclas negras juntas (Fa# y Sol#).'
  },
  {
    root: 'E',
    name: 'Mi Mayor (E)',
    accidentals: '4 sostenidos (Fa#, Do#, Sol#, Re#)',
    accidentalsShort: '4# (F#, C#, G#, D#)',
    accidentalsType: 'sharp',
    accidentalsCount: 4,
    relativeMinor: 'Do# menor (C#m)',
    circleOrder: 4,
    maestroAdvice: 'Casi todo el grupo de teclas negras está activo. Muy cómoda para la mano porque los dedos largos van a las negras.'
  },
  {
    root: 'B',
    name: 'Si Mayor (B)',
    accidentals: '5 sostenidos (Fa#, Do#, Sol#, Re#, La#)',
    accidentalsShort: '5# (F#, C#, G#, D#, A#)',
    accidentalsType: 'sharp',
    accidentalsCount: 5,
    relativeMinor: 'Sol# menor (G#m)',
    circleOrder: 5,
    maestroAdvice: 'Chopin consideraba a Si Mayor la escala más fisiológica: los 5 dedos se acomodan perfecto en las 5 negras.'
  },
  {
    root: 'F#',
    name: 'Fa# Mayor (F#)',
    accidentals: '6 sostenidos (o 6 bemoles como Sol♭)',
    accidentalsShort: '6# (F#, C#, G#, D#, A#, E#)',
    accidentalsType: 'sharp',
    accidentalsCount: 6,
    relativeMinor: 'Re# menor (D#m)',
    circleOrder: 6,
    maestroAdvice: 'El punto opuesto del círculo: 6 sostenidos. El pulgar toca las únicas dos teclas blancas (Si y Mi#/Fa).'
  },
  {
    root: 'Db',
    name: 'Re♭ Mayor (Db)',
    accidentals: '5 bemoles (Si♭, Mi♭, La♭, Re♭, Sol♭)',
    accidentalsShort: '5♭ (Bb, Eb, Ab, Db, Gb)',
    accidentalsType: 'flat',
    accidentalsCount: 5,
    relativeMinor: 'Si♭ menor (Bbm)',
    circleOrder: 7,
    maestroAdvice: 'Cinco bemoles hermosos y aterciopelados. El pulgar siempre va a las teclas blancas (Fa y Do).'
  },
  {
    root: 'Ab',
    name: 'La♭ Mayor (Ab)',
    accidentals: '4 bemoles (Si♭, Mi♭, La♭, Re♭)',
    accidentalsShort: '4♭ (Bb, Eb, Ab, Db)',
    accidentalsType: 'flat',
    accidentalsCount: 4,
    relativeMinor: 'Fa menor (Fm)',
    circleOrder: 8,
    maestroAdvice: 'Cuatro bemoles. Sonoridad clásica de baladas y sonatas románticas.'
  },
  {
    root: 'Eb',
    name: 'Mi♭ Mayor (Eb)',
    accidentals: '3 bemoles (Si♭, Mi♭, La♭)',
    accidentalsShort: '3♭ (Bb, Eb, Ab)',
    accidentalsType: 'flat',
    accidentalsCount: 3,
    relativeMinor: 'Do menor (Cm)',
    circleOrder: 9,
    maestroAdvice: 'Tres bemoles: La tonalidad de la Heroica de Beethoven. Gran nobleza y plenitud.'
  },
  {
    root: 'Bb',
    name: 'Si♭ Mayor (Bb)',
    accidentals: '2 bemoles (Si♭, Mi♭)',
    accidentalsShort: '2♭ (Bb, Eb)',
    accidentalsType: 'flat',
    accidentalsCount: 2,
    relativeMinor: 'Sol menor (Gm)',
    circleOrder: 10,
    maestroAdvice: 'Dos bemoles. En la mano derecha el pulgar toca el Do y el Fa, nunca las teclas negras.'
  },
  {
    root: 'F',
    name: 'Fa Mayor (F)',
    accidentals: '1 bemol (Si♭)',
    accidentalsShort: '1♭ (Bb)',
    accidentalsType: 'flat',
    accidentalsCount: 1,
    relativeMinor: 'Re menor (Dm)',
    circleOrder: 11,
    maestroAdvice: 'Un bemol: Si♭. En mano derecha la digitación especial usa el dedo 4 en Si♭ para no pasar el pulgar a una negra.'
  },
];

export interface ScaleSequenceStep {
  keyDef: CircleKeyDefinition;
  scaleType: ScaleInfo;
  notes: string[];
  direction: 'ascending' | 'both';
  completed: boolean;
}

interface CircleScaleSequenceGymProps {
  onScoreGain?: (points: number) => void;
}

export const CircleScaleSequenceGym: React.FC<CircleScaleSequenceGymProps> = ({ onScoreGain }) => {
  // -------------------------------------------------------------
  // CONFIGURATION STATES
  // -------------------------------------------------------------
  const [sessionStage, setSessionStage] = useState<'config' | 'workout' | 'completed'>('config');

  // Selected Keys in Circle of Fifths (set of roots, e.g. ['C', 'G', 'D'])
  const [selectedRoots, setSelectedRoots] = useState<string[]>(['C', 'G', 'D', 'A', 'F', 'Bb']);
  
  // Scale Type
  const [selectedScaleId, setSelectedScaleId] = useState<string>('major');
  
  // Hand Selection
  const [selectedHand, setSelectedHand] = useState<'right' | 'left'>('right');

  // Scale Movement Direction
  const [scaleDirection, setScaleDirection] = useState<'ascending' | 'both'>('ascending');

  // METRONOME CONFIGURATION: Velocidad mínima de metrónomo
  const [minBpm, setMinBpm] = useState<number>(72);
  const [tempoProgression, setTempoProgression] = useState<'fixed' | 'increase2' | 'increase4'>('increase2');
  const [isMetronomeMuted, setIsMetronomeMuted] = useState<boolean>(false);

  // -------------------------------------------------------------
  // ACTIVE WORKOUT STATES
  // -------------------------------------------------------------
  const [sequenceList, setSequenceList] = useState<ScaleSequenceStep[]>([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState<number>(0);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number>(0);
  const [playedNotesInScale, setPlayedNotesInScale] = useState<string[]>([]);
  const [isNoteError, setIsNoteError] = useState<boolean>(false);
  const [lastPlayedNote, setLastPlayedNote] = useState<string | null>(null);

  // Live Metronome State
  const [currentBpm, setCurrentBpm] = useState<number>(72);
  const [metronomeBeat, setMetronomeBeat] = useState<number>(0);
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const [countInBeatsLeft, setCountInBeatsLeft] = useState<number>(0); // 4, 3, 2, 1, 0

  // Audio synths & interval references
  const metronomeIntervalRef = useRef<number | null>(null);
  const clickHighRef = useRef<Tone.Synth | null>(null);
  const clickLowRef = useRef<Tone.Synth | null>(null);
  const countInSynthRef = useRef<Tone.Synth | null>(null);
  const successSynthRef = useRef<Tone.PolySynth | null>(null);

  // Score & Stats
  const [workoutScore, setWorkoutScore] = useState<number>(0);
  const [correctNotesCount, setCorrectNotesCount] = useState<number>(0);
  const [totalAttemptsCount, setTotalAttemptsCount] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [completedKeysHistory, setCompletedKeysHistory] = useState<string[]>([]);

  // Demo playback
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Current Scale Definition & Notes
  const currentStep = sequenceList[currentKeyIndex];
  const activeScaleInfo = useMemo(() => {
    return SCALES_DATABASE.find(s => s.id === selectedScaleId) || SCALES_DATABASE[0];
  }, [selectedScaleId]);

  // Target notes for the current active exercise in sequence
  const targetExerciseNotes = useMemo(() => {
    if (!currentStep) return [];
    return currentStep.notes;
  }, [currentStep]);

  // Fingering array for active scale and hand
  const currentFingering = useMemo(() => {
    if (!activeScaleInfo) return [1, 2, 3, 1, 2, 3, 4, 5];
    return selectedHand === 'right'
      ? activeScaleInfo.fingeringRightHand
      : (activeScaleInfo.fingeringLeftHand || [5, 4, 3, 2, 1, 3, 2, 1]);
  }, [selectedHand, activeScaleInfo]);

  // Map each note to recommended finger for the visual piano guide
  const scaleFingerGuide: Record<string, number> = useMemo(() => {
    const guide: Record<string, number> = {};
    targetExerciseNotes.forEach((note, idx) => {
      // If scale is 'both', handle descending finger mirror
      const originalLen = activeScaleInfo.intervals.length;
      let fingerIndex = idx;
      if (idx >= originalLen) {
        fingerIndex = (originalLen - 1) - (idx - (originalLen - 1));
      }
      if (currentFingering[fingerIndex] !== undefined) {
        guide[note] = currentFingering[fingerIndex];
      }
    });
    return guide;
  }, [targetExerciseNotes, currentFingering, activeScaleInfo]);

  // -------------------------------------------------------------
  // METRONOME AUDIO INITIALIZATION
  // -------------------------------------------------------------
  useEffect(() => {
    clickHighRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 }
    }).toDestination();
    clickHighRef.current.volume.value = -6;

    clickLowRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 }
    }).toDestination();
    clickLowRef.current.volume.value = -10;

    countInSynthRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.02 }
    }).toDestination();
    countInSynthRef.current.volume.value = -4;

    successSynthRef.current = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.4 }
    }).toDestination();
    successSynthRef.current.volume.value = -8;

    return () => {
      clickHighRef.current?.dispose();
      clickLowRef.current?.dispose();
      countInSynthRef.current?.dispose();
      successSynthRef.current?.dispose();
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, []);

  // -------------------------------------------------------------
  // METRONOME TICK ENGINE
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isMetronomeActive || sessionStage !== 'workout') {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
      return;
    }

    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
    }

    let beat = 0;
    const intervalMs = (60 / currentBpm) * 1000;

    const tick = () => {
      const beatInBar = beat % 4;
      setMetronomeBeat(beatInBar);

      // Audio Click
      if (!isMetronomeMuted) {
        try {
          if (beatInBar === 0) {
            clickHighRef.current?.triggerAttackRelease('C6', '32n');
          } else {
            clickLowRef.current?.triggerAttackRelease('G5', '32n');
          }
        } catch {
          // ignore audio context safety
        }
      }

      beat++;
    };

    tick();
    metronomeIntervalRef.current = window.setInterval(tick, intervalMs);

    return () => {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
    };
  }, [isMetronomeActive, currentBpm, isMetronomeMuted, sessionStage]);

  // -------------------------------------------------------------
  // PRESET KEY SELECTORS FOR CIRCLE OF FIFTHS
  // -------------------------------------------------------------
  const applyPreset = (presetType: 'beginner' | 'sharps' | 'flats' | 'all12' | 'intermediate') => {
    if (presetType === 'beginner') {
      setSelectedRoots(['C', 'G', 'F']);
    } else if (presetType === 'intermediate') {
      setSelectedRoots(['C', 'G', 'D', 'A', 'F', 'Bb']);
    } else if (presetType === 'sharps') {
      setSelectedRoots(['C', 'G', 'D', 'A', 'E', 'B', 'F#']);
    } else if (presetType === 'flats') {
      setSelectedRoots(['C', 'F', 'Bb', 'Eb', 'Ab', 'Db']);
    } else if (presetType === 'all12') {
      setSelectedRoots(CIRCLE_OF_FIFTHS_SEQUENCE.map(k => k.root));
    }
  };

  const toggleKey = (root: string) => {
    setSelectedRoots(prev => {
      if (prev.includes(root)) {
        if (prev.length <= 1) return prev; // At least one key required
        return prev.filter(r => r !== root);
      } else {
        // Keep in circle of fifths order
        const fullOrder = CIRCLE_OF_FIFTHS_SEQUENCE.map(k => k.root);
        const next = [...prev, root];
        return next.sort((a, b) => fullOrder.indexOf(a) - fullOrder.indexOf(b));
      }
    });
  };

  // -------------------------------------------------------------
  // BUILD WORKOUT SEQUENCE & START
  // -------------------------------------------------------------
  const handleStartWorkout = async () => {
    await Tone.start();

    // Compile scale notes for each selected key
    const generatedSequence: ScaleSequenceStep[] = selectedRoots.map(root => {
      const keyDef = CIRCLE_OF_FIFTHS_SEQUENCE.find(k => k.root === root) || CIRCLE_OF_FIFTHS_SEQUENCE[0];
      const ascendingNotes = calculateScaleNotes(root, activeScaleInfo, 4);

      let sequenceNotes = [...ascendingNotes];
      if (scaleDirection === 'both') {
        const descendingNotes = [...ascendingNotes.slice(0, -1)].reverse();
        sequenceNotes = [...ascendingNotes, ...descendingNotes];
      }

      return {
        keyDef,
        scaleType: activeScaleInfo,
        notes: sequenceNotes,
        direction: scaleDirection,
        completed: false
      };
    });

    setSequenceList(generatedSequence);
    setCurrentKeyIndex(0);
    setCurrentNoteIndex(0);
    setPlayedNotesInScale([]);
    setCurrentBpm(minBpm); // Starts at user's configured minimum BPM
    setWorkoutScore(0);
    setCorrectNotesCount(0);
    setTotalAttemptsCount(0);
    setStreak(0);
    setMaxStreak(0);
    setCompletedKeysHistory([]);
    setSessionStage('workout');

    // Start Metronome with a 4-beat preparatory count-in
    startCountIn(minBpm);
  };

  const startCountIn = (bpmToUse: number) => {
    setCountInBeatsLeft(4);
    setIsMetronomeActive(false);

    let count = 4;
    const intervalMs = (60 / bpmToUse) * 1000;

    const countInterval = setInterval(() => {
      count--;
      setCountInBeatsLeft(count);
      try {
        countInSynthRef.current?.triggerAttackRelease(count === 0 ? 'C5' : 'G4', '16n');
      } catch {
        // ignore
      }

      if (count <= 0) {
        clearInterval(countInterval);
        setIsMetronomeActive(true);
      }
    }, intervalMs);
  };

  // -------------------------------------------------------------
  // PIANO INTERACTION & VALIDATION
  // -------------------------------------------------------------
  const handleNotePlay = useCallback((note: string) => {
    if (sessionStage !== 'workout' || !currentStep) return;

    setLastPlayedNote(note);
    setTotalAttemptsCount(prev => prev + 1);

    const targetNote = targetExerciseNotes[currentNoteIndex];
    if (!targetNote) return;

    const targetBase = targetNote.slice(0, -1);
    const playedBase = note.slice(0, -1);

    const isMatch = playedBase === targetBase || ENHARMONIC_MAP[playedBase] === targetBase;

    if (isMatch) {
      // Correct note
      setIsNoteError(false);
      setCorrectNotesCount(prev => prev + 1);
      setStreak(prev => {
        const next = prev + 1;
        if (next > maxStreak) setMaxStreak(next);
        return next;
      });

      const nextPlayed = [...playedNotesInScale, note];
      setPlayedNotesInScale(nextPlayed);

      // Points calculation
      const streakBonus = Math.min(streak * 5, 50);
      const points = 20 + streakBonus;
      setWorkoutScore(prev => prev + points);
      if (onScoreGain) onScoreGain(points);

      // Check if current scale is completed
      if (currentNoteIndex + 1 >= targetExerciseNotes.length) {
        handleScaleStepCompleted();
      } else {
        setCurrentNoteIndex(prev => prev + 1);
      }
    } else {
      // Wrong note
      setIsNoteError(true);
      setStreak(0);
      setTimeout(() => setIsNoteError(false), 700);
    }
  }, [sessionStage, currentStep, targetExerciseNotes, currentNoteIndex, playedNotesInScale, streak, maxStreak, onScoreGain]);

  // When a scale in the sequence is completed
  const handleScaleStepCompleted = () => {
    try {
      successSynthRef.current?.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '8n');
    } catch {
      // ignore
    }

    const currentKey = currentStep.keyDef.name;
    setCompletedKeysHistory(prev => [...prev, currentStep.keyDef.root]);

    // Check if entire circle sequence is finished
    if (currentKeyIndex + 1 >= sequenceList.length) {
      // FINISHED FULL CYCLE WORKOUT!
      setIsMetronomeActive(false);
      setSessionStage('completed');
      maestroVoice.speak(`¡Extraordinario che! Completaste la secuencia completa del ciclo de quintas con una velocidad de ${currentBpm} BPM.`);
    } else {
      // Move to NEXT key in Circle of Fifths
      const nextKeyIndex = currentKeyIndex + 1;
      setCurrentKeyIndex(nextKeyIndex);
      setCurrentNoteIndex(0);
      setPlayedNotesInScale([]);

      // Apply Tempo Progression if enabled
      let nextBpm = currentBpm;
      if (tempoProgression === 'increase2') {
        nextBpm = Math.min(220, currentBpm + 2);
      } else if (tempoProgression === 'increase4') {
        nextBpm = Math.min(220, currentBpm + 4);
      }
      setCurrentBpm(nextBpm);

      // Brief count-in for next key
      const nextStepKey = sequenceList[nextKeyIndex].keyDef;
      maestroVoice.speak(`¡Muy bien! Pasamos a ${nextStepKey.name}.`);
    }
  };

  // Restart current scale
  const handleRestartCurrentScale = () => {
    setCurrentNoteIndex(0);
    setPlayedNotesInScale([]);
    setIsNoteError(false);
  };

  // Skip current scale
  const handleSkipScale = () => {
    if (currentKeyIndex + 1 >= sequenceList.length) {
      setSessionStage('completed');
    } else {
      setCurrentKeyIndex(prev => prev + 1);
      setCurrentNoteIndex(0);
      setPlayedNotesInScale([]);
    }
  };

  // Listen to scale demo audio
  const handlePlayDemo = async () => {
    if (isPlayingDemo) {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      setIsPlayingDemo(false);
      return;
    }

    await Tone.start();
    setIsPlayingDemo(true);
    let step = 0;

    const synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.02, decay: 0.25, sustain: 0.3, release: 0.5 }
    }).toDestination();
    synth.volume.value = -4;

    const intervalMs = (60 / currentBpm) * 1000;

    demoIntervalRef.current = setInterval(() => {
      if (step >= targetExerciseNotes.length) {
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
        setIsPlayingDemo(false);
        synth.dispose();
        return;
      }

      synth.triggerAttackRelease(targetExerciseNotes[step], '8n');
      setCurrentNoteIndex(step);
      step++;
    }, intervalMs);
  };

  const accuracy = totalAttemptsCount > 0 ? Math.round((correctNotesCount / totalAttemptsCount) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: GENERATOR & SEQUENCE CONFIGURATION */}
      {/* ------------------------------------------------------------- */}
      {sessionStage === 'config' && (
        <div className="glass p-6 md:p-8 rounded-3xl border border-amber-400/30 space-y-8 bg-gradient-to-b from-[#0f1320] to-[#080a11]">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shadow-md shadow-amber-400/30">
                  <Compass size={18} />
                </div>
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold">
                  Generador de Secuencias • Gimnasio Práctico
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white">
                Entrenamiento por Ciclo de Quintas
              </h2>
              <p className="text-xs md:text-sm text-white/60 font-light max-w-2xl">
                Crea rutinas sistemáticas de escalas conectadas a través de la rueda armónica universal. Domina las armaduras de clave con velocidad y digitación impecable.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-xs font-mono text-white/70 self-start md:self-auto">
              <Sparkles size={14} className="text-amber-400" />
              <span>{selectedRoots.length} tonalidades seleccionadas</span>
            </div>
          </div>

          {/* Section 1: Presets & Tonalities Picker */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40 text-xs font-mono font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="font-serif font-bold text-white text-base md:text-lg">
                  Configurar Tonalidades del Ciclo
                </h3>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-white/40 text-[11px] mr-1 hidden sm:inline">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('beginner')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                >
                  🟢 Básicas (C, G, F)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('intermediate')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                >
                  🟡 Intermedio (6 claves)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('sharps')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                >
                  ↗ Sostenidos (7)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('flats')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                >
                  ↙ Bemoles (6)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all12')}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-colors font-bold"
                >
                  🟣 Ciclo Completo (12)
                </button>
              </div>
            </div>

            {/* 12 Keys Interactive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {CIRCLE_OF_FIFTHS_SEQUENCE.map(keyDef => {
                const isSelected = selectedRoots.includes(keyDef.root);
                const orderIndex = selectedRoots.indexOf(keyDef.root);

                return (
                  <button
                    key={keyDef.root}
                    type="button"
                    onClick={() => toggleKey(keyDef.root)}
                    className={cn(
                      "p-3 rounded-2xl border text-left font-mono transition-all relative flex flex-col justify-between group",
                      isSelected
                        ? "bg-amber-400/15 border-amber-400 text-white shadow-md shadow-amber-400/10 scale-[1.02]"
                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn(
                        "text-base font-serif font-bold",
                        isSelected ? "text-amber-300" : "text-white/70"
                      )}>
                        {keyDef.root}
                      </span>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-black text-[10px] font-extrabold flex items-center justify-center">
                          {orderIndex + 1}
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-white/20 text-transparent flex items-center justify-center text-[10px]">
                          +
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-0.5">
                      <div className="text-[11px] font-semibold truncate text-white/90">
                        {keyDef.name.split(' ')[0]}
                      </div>
                      <div className="text-[10px] text-white/40 truncate">
                        {keyDef.accidentalsShort}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-white/40 font-mono flex items-center justify-between">
              <span>Haz clic en cualquier tonalidad para añadirla o quitarla de la secuencia activa.</span>
              <span className="text-amber-400">{selectedRoots.length} de 12 activas</span>
            </div>
          </div>

          {/* Section 2: Scale Type & Hand & Movement Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Scale Type */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-white/50">
                <Music size={14} className="text-emerald-400" />
                <span>Tipo de Escala en la Secuencia:</span>
              </div>
              <div className="space-y-1.5">
                {SCALES_DATABASE.map(scale => (
                  <button
                    key={scale.id}
                    type="button"
                    onClick={() => setSelectedScaleId(scale.id)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between border transition-all text-left",
                      selectedScaleId === scale.id
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold"
                        : "bg-white/5 border-white/5 text-white/60 hover:text-white"
                    )}
                  >
                    <span>{scale.name}</span>
                    <span className="text-[10px] opacity-60 font-light">{scale.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hand Selection */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-white/50">
                <span>✋</span>
                <span>Mano & Técnica de Digitación:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHand('right')}
                  className={cn(
                    "p-3 rounded-xl border text-center font-mono transition-all",
                    selectedHand === 'right'
                      ? "bg-amber-400/20 border-amber-400 text-amber-300 font-bold"
                      : "bg-white/5 border-white/5 text-white/60 hover:text-white"
                  )}
                >
                  <div className="text-lg">✋</div>
                  <div className="text-xs font-bold mt-1">Mano Derecha</div>
                  <div className="text-[10px] text-white/40">Dedos 1-2-3-1-2-3-4-5</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHand('left')}
                  className={cn(
                    "p-3 rounded-xl border text-center font-mono transition-all",
                    selectedHand === 'left'
                      ? "bg-indigo-500/20 border-indigo-400 text-indigo-300 font-bold"
                      : "bg-white/5 border-white/5 text-white/60 hover:text-white"
                  )}
                >
                  <div className="text-lg">🤚</div>
                  <div className="text-xs font-bold mt-1">Mano Izquierda</div>
                  <div className="text-[10px] text-white/40">Dedos 5-4-3-2-1-3-2-1</div>
                </button>
              </div>

              {/* Movement: Ascending vs Both */}
              <div className="pt-2 space-y-1">
                <span className="text-[11px] font-mono text-white/50">Trayectoria:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScaleDirection('ascending')}
                    className={cn(
                      "py-2 px-2.5 rounded-xl border text-center text-xs font-mono transition-all",
                      scaleDirection === 'ascending'
                        ? "bg-white/15 border-white/40 text-white font-bold"
                        : "bg-white/5 border-white/5 text-white/50 hover:text-white"
                    )}
                  >
                    ↗ Ascendente (1 a 8)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScaleDirection('both')}
                    className={cn(
                      "py-2 px-2.5 rounded-xl border text-center text-xs font-mono transition-all",
                      scaleDirection === 'both'
                        ? "bg-white/15 border-white/40 text-white font-bold"
                        : "bg-white/5 border-white/5 text-white/50 hover:text-white"
                    )}
                  >
                    ↕ Ida y Vuelta (1-8-1)
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: METRONOME & MINIMUM SPEED CONFIGURATION */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-white/50">
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  <span className="font-bold text-white">Velocidad Mínima:</span>
                </div>
                <span className="text-amber-400 font-bold text-sm">{minBpm} BPM</span>
              </div>

              {/* Slider for Minimum BPM */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="40"
                  max="180"
                  step="4"
                  value={minBpm}
                  onChange={e => setMinBpm(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 bg-white/10 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-white/40">
                  <span>40 (Lento)</span>
                  <span>72 (Andante)</span>
                  <span>108 (Moderato)</span>
                  <span>140+ (Rápido)</span>
                </div>
              </div>

              {/* Quick BPM step buttons */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {[52, 60, 72, 88, 104, 120].map(bpmPreset => (
                  <button
                    key={bpmPreset}
                    type="button"
                    onClick={() => setMinBpm(bpmPreset)}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[10px] font-mono border transition-all",
                      minBpm === bpmPreset
                        ? "bg-amber-400 text-black font-bold border-amber-300"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                    )}
                  >
                    {bpmPreset}
                  </button>
                ))}
              </div>

              {/* Progression setting */}
              <div className="pt-2 space-y-1.5 border-t border-white/5">
                <span className="text-[11px] font-mono text-white/50">Aceleración por Tonalidad:</span>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                  {[
                    { id: 'fixed', label: 'Tempo Fijo', desc: 'Mismo BPM' },
                    { id: 'increase2', label: '+2 BPM / clave', desc: 'Suave' },
                    { id: 'increase4', label: '+4 BPM / clave', desc: 'Desafío' },
                  ].map(prog => (
                    <button
                      key={prog.id}
                      type="button"
                      onClick={() => setTempoProgression(prog.id as any)}
                      className={cn(
                        "p-1.5 rounded-xl border text-center transition-all",
                        tempoProgression === prog.id
                          ? "bg-amber-400/20 border-amber-400 text-amber-300 font-bold"
                          : "bg-white/5 border-white/5 text-white/50 hover:text-white"
                      )}
                    >
                      <div>{prog.label}</div>
                      <div className="text-[8px] text-white/40">{prog.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-4">
            <button
              type="button"
              id="btn-start-scale-sequence"
              onClick={handleStartWorkout}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-black font-serif font-bold text-base uppercase tracking-wider shadow-xl shadow-amber-400/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5"
            >
              <Play size={18} className="fill-black text-black" />
              <span>
                ¡Comenzar Secuencia del Ciclo ({selectedRoots.length} Tonalidades a {minBpm} BPM)!
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: ACTIVE WORKOUT ARENA */}
      {/* ------------------------------------------------------------- */}
      {sessionStage === 'workout' && currentStep && (
        <div className="glass p-5 md:p-8 rounded-3xl border border-white/10 space-y-6">
          
          {/* Top Workout Status & Navigation */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold uppercase">
                  Ciclo de Quintas • Paso {currentKeyIndex + 1} de {sequenceList.length}
                </span>
                <span className="text-white/40 text-xs font-mono">
                  {currentStep.keyDef.accidentalsShort}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mt-1">
                Escala de {currentStep.keyDef.name}
              </h2>
              <p className="text-xs text-amber-300/80 font-mono mt-0.5">
                💡 Relativa Menor: {currentStep.keyDef.relativeMinor} • {currentStep.keyDef.accidentals}
              </p>
            </div>

            {/* Metronome HUD in Workout */}
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              {/* Metronome Beat Lights (4 pulses) */}
              <div className="flex items-center gap-1.5 bg-black/40 px-3 py-2 rounded-2xl border border-white/10 font-mono text-xs">
                <div className="flex items-center gap-1 mr-2">
                  {[0, 1, 2, 3].map(beatIdx => (
                    <div
                      key={beatIdx}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all duration-75",
                        metronomeBeat === beatIdx && isMetronomeActive
                          ? beatIdx === 0
                            ? "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)] scale-125"
                            : "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-110"
                          : "bg-white/15"
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-white/50 text-[10px]">Tempo:</span>
                  <strong className="text-amber-300 font-bold">{currentBpm} BPM</strong>
                  {currentBpm > minBpm && (
                    <span className="text-[9px] text-emerald-400 font-bold">
                      (+{currentBpm - minBpm})
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsMetronomeMuted(prev => !prev)}
                  className="ml-2 text-white/50 hover:text-white transition-colors"
                  title={isMetronomeMuted ? 'Activar sonido del metrónomo' : 'Silenciar sonido del metrónomo'}
                >
                  {isMetronomeMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-amber-400" />}
                </button>
              </div>

              {/* Score & Streak */}
              <div className="flex items-center gap-3 bg-white/5 px-3.5 py-2 rounded-2xl border border-white/10 font-mono text-xs">
                <div>
                  <span className="text-white/40 text-[10px] uppercase">Puntos: </span>
                  <strong className="text-amber-400">{workoutScore}</strong>
                </div>
                <div className="border-l border-white/10 pl-3">
                  <span className="text-white/40 text-[10px] uppercase">Racha: </span>
                  <strong className="text-rose-400">{streak} 🔥</strong>
                </div>
              </div>

              {/* Exit/Finish button */}
              <button
                type="button"
                onClick={() => setSessionStage('config')}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-mono border border-white/10 transition-colors"
              >
                Configuración
              </button>
            </div>
          </div>

          {/* Circle of Fifths Micro Timeline */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
            {sequenceList.map((step, idx) => {
              const isCurrent = idx === currentKeyIndex;
              const isPast = idx < currentKeyIndex;

              return (
                <div
                  key={idx}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0",
                    isCurrent
                      ? "bg-amber-400 text-black font-bold border-amber-300 shadow-md shadow-amber-400/20 scale-105"
                      : isPast
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      : "bg-white/5 text-white/40 border-white/10"
                  )}
                >
                  {isPast ? <Check size={12} className="text-emerald-400" /> : <span>{idx + 1}.</span>}
                  <span>{step.keyDef.root}</span>
                  <span className={cn(
                    "text-[9px] px-1 rounded",
                    isCurrent ? "bg-black/20 text-black" : "bg-white/10 text-white/50"
                  )}>
                    {step.keyDef.accidentalsShort.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Count-In Alert Overlay */}
          {countInBeatsLeft > 0 && (
            <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-center animate-pulse">
              <span className="text-sm font-mono font-bold text-amber-300">
                ¡Preparación al pulso! Cuenta: {countInBeatsLeft} ...
              </span>
            </div>
          )}

          {/* Maestro Aurelio Pedagogical Tip for Current Scale */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-400/10 via-amber-400/5 to-transparent border border-amber-400/20 text-left flex items-start gap-3">
            <span className="text-2xl shrink-0">🇺🇾</span>
            <div className="space-y-0.5 text-xs">
              <div className="font-mono font-bold text-amber-300 uppercase tracking-wide">
                Consejo del Maestro Aurelio para {currentStep.keyDef.name}:
              </div>
              <p className="text-white/80 font-light">
                {currentStep.keyDef.maestroAdvice}
              </p>
            </div>
          </div>

          {/* Interactive Stepper Visualizer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-white/50">
              <span>Notas de la escala ({currentStep.scaleType.name} - {selectedHand === 'right' ? 'Mano Derecha' : 'Mano Izquierda'}):</span>
              <span>Nota {currentNoteIndex + 1} de {targetExerciseNotes.length}</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-9 lg:grid-cols-16 gap-2">
              {targetExerciseNotes.map((note, idx) => {
                const isCurrent = idx === currentNoteIndex;
                const isPast = idx < currentNoteIndex;
                const finger = scaleFingerGuide[note] || 1;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-2.5 rounded-xl border flex flex-col items-center justify-center font-mono transition-all",
                      isCurrent
                        ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105"
                        : isPast
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : "bg-white/5 border-white/10 text-white/30"
                    )}
                  >
                    <span className="text-sm font-bold">{note.replace(/\d/, '')}</span>
                    <span className="text-[9px] opacity-60">oct {note.slice(-1)}</span>
                    <span className={cn(
                      "mt-1 text-[8px] px-1.5 py-0.2 rounded-full font-bold",
                      isCurrent
                        ? "bg-amber-400 text-black"
                        : isPast
                        ? "bg-emerald-500/30 text-emerald-200"
                        : "bg-white/10 text-white/50"
                    )}>
                      d.{finger}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Directive banner with error status */}
          <div className={cn(
            "p-3.5 rounded-2xl border flex items-center justify-between transition-all",
            isNoteError
              ? "bg-rose-500/20 border-rose-400 text-rose-300"
              : "bg-amber-400/10 border-amber-400/30 text-amber-300"
          )}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{isNoteError ? '💥' : '👉'}</span>
              <div className="text-xs font-mono">
                {isNoteError ? (
                  <span>¡Casi che! Tocaste <strong>{lastPlayedNote}</strong>. La nota que sigue es <strong>{targetExerciseNotes[currentNoteIndex]}</strong>.</span>
                ) : (
                  <span>
                    Tocá la nota <strong>{targetExerciseNotes[currentNoteIndex]}</strong> con el <strong>Dedo {scaleFingerGuide[targetExerciseNotes[currentNoteIndex]] || 1}</strong> ({selectedHand === 'right' ? 'Mano Derecha' : 'Mano Izquierda'}).
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlayDemo}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono border border-white/10 transition-colors flex items-center gap-1.5"
              >
                {isPlayingDemo ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlayingDemo ? 'Pausar' : 'Oír Escala'}</span>
              </button>

              <button
                type="button"
                onClick={handleRestartCurrentScale}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                title="Reiniciar escala actual"
              >
                <RotateCcw size={14} />
              </button>

              <button
                type="button"
                onClick={handleSkipScale}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-mono border border-white/10 transition-colors"
              >
                Saltar →
              </button>
            </div>
          </div>

          {/* Interactive Piano with Live Fingering Guide */}
          <div className="pt-2">
            <Piano
              activeNotes={[targetExerciseNotes[currentNoteIndex]]}
              correctNotes={playedNotesInScale}
              errorNotes={isNoteError && lastPlayedNote ? [lastPlayedNote] : []}
              fingerGuide={scaleFingerGuide}
              showFingerGuide={true}
              showFingerGuideToggle={false}
              onNotePlay={handleNotePlay}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 3: COMPLETED WORKOUT SUMMARY */}
      {/* ------------------------------------------------------------- */}
      {sessionStage === 'completed' && (
        <div className="glass p-8 md:p-12 rounded-3xl border border-emerald-500/30 text-center space-y-6 max-w-xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 text-4xl shadow-xl shadow-emerald-500/20">
            🏆
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
              ¡Ciclo de Quintas Conquistado!
            </div>
            <h3 className="text-3xl font-serif font-bold text-white">
              ¡Entrenamiento Virtuoso Completado!
            </h3>
            <p className="text-xs md:text-sm text-white/60 font-light leading-relaxed">
              Recorriste las tonalidades del ciclo de quintas con ritmo y técnica constante. Tus reflejos para leer y ejecutar sostenidos y bemoles están cada vez más afilados.
            </p>
          </div>

          {/* Bento Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-left">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-white/40 uppercase">Puntos</div>
              <div className="text-lg font-bold text-amber-400">+{workoutScore}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-white/40 uppercase">Tonalidades</div>
              <div className="text-lg font-bold text-emerald-400">{sequenceList.length}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-white/40 uppercase">Tempo Final</div>
              <div className="text-lg font-bold text-purple-300">{currentBpm} BPM</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-white/40 uppercase">Precisión</div>
              <div className="text-lg font-bold text-sky-300">{accuracy}%</div>
            </div>
          </div>

          {/* Maestro Aurelio quote */}
          <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-left flex items-start gap-3">
            <span className="text-2xl shrink-0">🇺🇾</span>
            <div className="space-y-1 text-xs">
              <div className="font-mono font-bold text-amber-300 uppercase">
                Devolución del Maestro Aurelio:
              </div>
              <p className="text-white/80 font-light">
                {accuracy >= 90
                  ? '¡Impecable che! Hiciste cantar a cada tonalidad del ciclo con un pulso de metrónomo redondo y sin titubear en las alteraciones.'
                  : '¡Buen trabajo che! El paso por las tonalidades con varios bemoles o sostenidos requiere memoria muscular. Seguí entrenando con este generador a diario y vas a notar una fluidez brutal.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleStartWorkout}
              className="flex-1 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-serif font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              <span>Repetir Secuencia</span>
            </button>

            <button
              type="button"
              onClick={() => setSessionStage('config')}
              className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Settings2 size={14} />
              <span>Configurar Otra Rutina</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
