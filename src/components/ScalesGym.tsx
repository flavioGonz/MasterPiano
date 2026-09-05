import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, Sparkles, CheckCircle2, 
  HelpCircle, Trophy, Lightbulb, ChevronRight, Zap, Award, Flame, Heart
} from 'lucide-react';
import { 
  SCALES_DATABASE, COMMON_SCALE_ROOTS, ScaleInfo, 
  calculateScaleNotes, ENHARMONIC_MAP 
} from '../lib/musicGymTheory';
import { Piano } from './Piano';
import { maestroVoice } from '../lib/speech';
import { cn } from '../lib/utils';
import * as Tone from 'tone';

type GameMode = 'pathway' | 'missingNote' | 'formula' | 'speedRun';

interface ScalesGymProps {
  onScoreGain?: (points: number) => void;
}

export const ScalesGym: React.FC<ScalesGymProps> = ({ onScoreGain }) => {
  // Config
  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedScaleId, setSelectedScaleId] = useState<string>('major');
  const [gameMode, setGameMode] = useState<GameMode>('pathway');

  // Scale object & computed notes
  const activeScale = SCALES_DATABASE.find(s => s.id === selectedScaleId) || SCALES_DATABASE[0];
  const scaleNotes = calculateScaleNotes(selectedRoot, activeScale);

  // Pathway Mode state
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [lastPlayedNote, setLastPlayedNote] = useState<string | null>(null);
  const [isNoteError, setIsNoteError] = useState(false);
  const [isScaleCompleted, setIsScaleCompleted] = useState(false);

  // Audio Playback
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Missing Note Mode state
  const [missingIndex, setMissingIndex] = useState<number>(2);
  const [missingLives, setMissingLives] = useState<number>(3);
  const [missingScore, setMissingScore] = useState<number>(0);
  const [missingFeedback, setMissingFeedback] = useState<string | null>(null);

  // Speed Run Mode state
  const [speedRunActive, setSpeedRunActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [speedRunScore, setSpeedRunScore] = useState(0);

  // Reset pathway when root or scale changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setIsScaleCompleted(false);
    setIsNoteError(false);
    
    // Pick random missing note
    const randomMissing = Math.floor(Math.random() * (scaleNotes.length - 2)) + 1;
    setMissingIndex(randomMissing);
    setMissingFeedback(null);
  }, [selectedRoot, selectedScaleId]);

  // Handle Note play in Pathway mode
  const handleNotePlay = useCallback((note: string) => {
    setLastPlayedNote(note);

    if (gameMode === 'pathway') {
      if (isScaleCompleted) return;

      const targetNote = scaleNotes[currentStepIndex];
      // Compare pitch class or octave (allow octave flexibility if same pitch class)
      const targetBase = targetNote.slice(0, -1);
      const playedBase = note.slice(0, -1);

      if (playedBase === targetBase || ENHARMONIC_MAP[playedBase] === targetBase) {
        // Correct note
        setIsNoteError(false);
        const nextCompleted = [...completedSteps, currentStepIndex];
        setCompletedSteps(nextCompleted);

        if (currentStepIndex + 1 >= scaleNotes.length) {
          setIsScaleCompleted(true);
          if (onScoreGain) onScoreGain(150);
          maestroVoice.speak(`¡Impecable che! Completaste la escala de ${selectedRoot} ${activeScale.name}. Sonó redondita.`);
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
      } else {
        // Wrong note
        setIsNoteError(true);
        setTimeout(() => setIsNoteError(false), 800);
      }
    } else if (gameMode === 'missingNote') {
      const targetNote = scaleNotes[missingIndex];
      const targetBase = targetNote.slice(0, -1);
      const playedBase = note.slice(0, -1);

      if (playedBase === targetBase || ENHARMONIC_MAP[playedBase] === targetBase) {
        setMissingFeedback('¡Exacto! Esa es la nota que faltaba en la escala.');
        setMissingScore(prev => prev + 100);
        if (onScoreGain) onScoreGain(100);
        setTimeout(() => {
          // Next challenge
          const nextIndex = Math.floor(Math.random() * (scaleNotes.length - 2)) + 1;
          setMissingIndex(nextIndex);
          setMissingFeedback(null);
        }, 1200);
      } else {
        setMissingLives(prev => Math.max(0, prev - 1));
        setMissingFeedback(`Ojo che, tocaste ${playedBase}. La nota faltante es ${targetBase}.`);
      }
    }
  }, [gameMode, isScaleCompleted, scaleNotes, currentStepIndex, completedSteps, selectedRoot, activeScale, onScoreGain, missingIndex]);

  // Demo playback of the full scale
  const playScaleDemo = async () => {
    if (isPlayingDemo) {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      setIsPlayingDemo(false);
      return;
    }

    await Tone.start();
    setIsPlayingDemo(true);
    let step = 0;

    const synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.6 }
    }).toDestination();

    demoIntervalRef.current = setInterval(() => {
      if (step >= scaleNotes.length) {
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
        setIsPlayingDemo(false);
        synth.dispose();
        return;
      }

      synth.triggerAttackRelease(scaleNotes[step], '8n');
      setCurrentStepIndex(step);
      step++;
    }, 450);
  };

  const restartPathway = () => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setIsScaleCompleted(false);
    setIsNoteError(false);
  };

  const speakScaleTip = () => {
    const text = `Escala de ${selectedRoot} ${activeScale.name}. ${activeScale.description} Acordate de la fórmula: ${activeScale.formula}. ${activeScale.mnemonic}`;
    maestroVoice.speak(text);
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Mode Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400">
              Gimnasio Lúdico de Escalas
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mt-1">
            Memorización y Destreza de Escalas
          </h2>
          <p className="text-xs text-white/50 font-light max-w-xl mt-0.5">
            Aprende la geometría del teclado nota a nota, sin frustraciones y con la digitación correcta.
          </p>
        </div>

        {/* Gamified Mode Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          {[
            { id: 'pathway', label: 'Camino de Notas', icon: '🚶‍♂️' },
            { id: 'missingNote', label: 'Nota Faltante', icon: '🧩' },
            { id: 'formula', label: 'Fórmula T - S', icon: '📐' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setGameMode(tab.id as GameMode)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all",
                gameMode === tab.id
                  ? "bg-amber-400 text-black font-semibold shadow"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Root Note & Scale Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selector de Tónica / Raíz */}
        <div className="glass p-4 rounded-2xl border border-white/10 space-y-2.5">
          <div className="flex justify-between items-center text-xs font-mono text-white/50">
            <span>1. Elige la Tónica (Raíz):</span>
            <span className="text-amber-400 font-bold">{selectedRoot}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SCALE_ROOTS.map(r => (
              <button
                key={r.note}
                type="button"
                onClick={() => setSelectedRoot(r.note)}
                className={cn(
                  "flex-1 min-w-[50px] py-2 rounded-xl text-xs font-mono font-bold transition-all border",
                  selectedRoot === r.note
                    ? "bg-amber-400 text-black border-amber-300 shadow-md scale-105"
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                )}
                title={r.difficulty}
              >
                {r.note}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de Tipo de Escala */}
        <div className="glass p-4 rounded-2xl border border-white/10 space-y-2.5">
          <div className="flex justify-between items-center text-xs font-mono text-white/50">
            <span>2. Tipo de Escala:</span>
            <span className="text-emerald-400 font-bold">{activeScale.name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SCALES_DATABASE.map(scale => (
              <button
                key={scale.id}
                type="button"
                onClick={() => setSelectedScaleId(scale.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-mono transition-all border",
                  selectedScaleId === scale.id
                    ? "bg-emerald-500 text-black font-semibold border-emerald-400 shadow-md"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                )}
              >
                {scale.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info Card: Formula & Mnemonic */}
      <div className="glass p-5 rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/30">
              Fórmula: {activeScale.formula}
            </span>
            <span className="text-xs font-light text-white/60">
              Carácter: <strong className="text-white">{activeScale.mood}</strong>
            </span>
          </div>
          <p className="text-xs text-white/80 font-light italic">
            💡 {activeScale.mnemonic}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playScaleDemo}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono transition-all border",
              isPlayingDemo
                ? "bg-amber-400 text-black border-amber-300"
                : "bg-white/5 text-white/70 hover:text-white border-white/10"
            )}
          >
            {isPlayingDemo ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlayingDemo ? 'Pausar Demo' : 'Oír Escala'}</span>
          </button>

          <button
            type="button"
            onClick={speakScaleTip}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-all"
            title="Escuchar consejo del Maestro Aurelio"
          >
            <Volume2 size={13} />
            <span>Maestro 🇺🇾</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODE 1: CAMINO DE NOTAS (PASO A PASO INTERACTIVO) */}
      {/* ------------------------------------------------------------- */}
      {gameMode === 'pathway' && (
        <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400">
                Paso a Paso Interactivo
              </span>
              <h3 className="text-xl font-serif font-bold text-white">
                Tocá cada nota en orden ascendente
              </h3>
            </div>
            <button
              type="button"
              onClick={restartPathway}
              className="flex items-center gap-1 text-xs font-mono text-white/50 hover:text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Reiniciar</span>
            </button>
          </div>

          {/* Interactive Stepper Visualizer */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {scaleNotes.map((note, index) => {
              const isCurrent = index === currentStepIndex && !isScaleCompleted;
              const isPast = completedSteps.includes(index) || (isScaleCompleted && index <= currentStepIndex);
              const finger = activeScale.fingeringRightHand[index] || 1;
              const isThumbPass = activeScale.thumbPassStepIndex === index;

              return (
                <motion.div
                  key={index}
                  animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={cn(
                    "relative rounded-2xl p-3 flex flex-col items-center justify-center border-2 transition-all font-mono",
                    isCurrent
                      ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                      : isPast
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                      : "bg-white/5 border-white/10 text-white/30"
                  )}
                >
                  {/* Step number badge */}
                  <span className="text-[9px] uppercase tracking-wider opacity-60">
                    {activeScale.degreeNames[index] ? activeScale.degreeNames[index].split(' ')[0] : `Grado ${index + 1}`}
                  </span>

                  {/* Note Name */}
                  <span className="text-xl font-bold my-1">
                    {note.replace(/\d/, '')}
                  </span>
                  <span className="text-[10px] opacity-70">
                    octava {note.slice(-1)}
                  </span>

                  {/* Finger Guidance badge */}
                  <div className={cn(
                    "mt-2 text-[9px] px-2 py-0.5 rounded-full border",
                    isCurrent
                      ? "bg-amber-400 text-black font-bold border-amber-300"
                      : "bg-white/10 text-white/70 border-white/10"
                  )}>
                    Dedo {finger}
                  </div>

                  {/* Thumb Pass indicator */}
                  {isThumbPass && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                      ↷ Pasa Pulgar
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Current Target Directive Banner */}
          <div className={cn(
            "p-4 rounded-2xl border flex items-center justify-between transition-all",
            isScaleCompleted
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
              : isNoteError
              ? "bg-red-500/10 border-red-500/40 text-red-300"
              : "bg-amber-400/10 border-amber-400/30 text-amber-300"
          )}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {isScaleCompleted ? '🏆' : isNoteError ? '⚠️' : '👉'}
              </span>
              <div>
                <div className="font-bold text-sm">
                  {isScaleCompleted
                    ? '¡Escala Completada con Éxito!'
                    : isNoteError
                    ? `Nota equivocada: tocaste ${lastPlayedNote}. Buscá ${scaleNotes[currentStepIndex]}.`
                    : `Siguiente nota: Toca ${scaleNotes[currentStepIndex]} (Dedo ${activeScale.fingeringRightHand[currentStepIndex] || 1})`}
                </div>
                <p className="text-xs text-white/60 font-light">
                  {isScaleCompleted
                    ? 'Excelente coordinación y memoria muscular. Podés volver a probar o cambiar de escala.'
                    : 'Tocá en el teclado interactivo abajo o usá las teclas de tu computadora.'}
                </p>
              </div>
            </div>

            {isScaleCompleted && (
              <button
                type="button"
                onClick={restartPathway}
                className="px-4 py-2 rounded-xl bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider shadow hover:bg-emerald-300 transition-all"
              >
                Tocar de Nuevo
              </button>
            )}
          </div>

          {/* Piano Keyboard Component */}
          <div className="pt-2">
            <Piano
              activeNotes={
                isScaleCompleted
                  ? scaleNotes
                  : [scaleNotes[currentStepIndex]]
              }
              correctNotes={completedSteps.map(i => scaleNotes[i])}
              errorNotes={isNoteError && lastPlayedNote ? [lastPlayedNote] : []}
              onNotePlay={handleNotePlay}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 2: LA NOTA FALTANTE / DETECTAR EL INTRUSO */}
      {/* ------------------------------------------------------------- */}
      {gameMode === 'missingNote' && (
        <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400">
                Juego de Memoria Visual & Auditiva
              </span>
              <h3 className="text-xl font-serif font-bold text-white">
                ¿Qué nota falta para completar la escala?
              </h3>
            </div>

            {/* Score & Lives */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm font-mono text-red-400">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} className={i < missingLives ? 'opacity-100' : 'opacity-20'}>❤️</span>
                ))}
              </div>
              <div className="text-sm font-mono font-bold text-amber-400">
                {missingScore} PTS
              </div>
            </div>
          </div>

          {/* Cards with 1 blank missing slot */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {scaleNotes.map((note, index) => {
              const isMissing = index === missingIndex;
              return (
                <div
                  key={index}
                  className={cn(
                    "rounded-2xl p-4 flex flex-col items-center justify-center border-2 transition-all font-mono min-h-[95px]",
                    isMissing
                      ? "bg-amber-400/20 border-amber-400 text-amber-300 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                      : "bg-white/5 border-white/10 text-white/80"
                  )}
                >
                  <span className="text-[9px] uppercase tracking-wider opacity-50">
                    Grado {index + 1}
                  </span>
                  <span className="text-2xl font-bold my-1">
                    {isMissing ? '❓' : note.replace(/\d/, '')}
                  </span>
                  <span className="text-[10px] opacity-60">
                    {isMissing ? '¿Cuál es?' : `oct ${note.slice(-1)}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Feedback banner */}
          {missingFeedback && (
            <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono text-center">
              {missingFeedback}
            </div>
          )}

          {/* Instruction to play on Piano */}
          <div className="text-center text-xs font-mono text-white/50">
            Tocá la nota faltante en el piano para ganar puntos:
          </div>

          <Piano
            onNotePlay={handleNotePlay}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 3: FÓRMULA INTERACTIVA DE TONOS Y SEMITONOS */}
      {/* ------------------------------------------------------------- */}
      {gameMode === 'formula' && (
        <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400">
              Desglose Anatómico del Teclado
            </span>
            <h3 className="text-xl font-serif font-bold text-white">
              La Regla de los Tonos (T) y Semitonos (S)
            </h3>
            <p className="text-xs text-white/60 font-light">
              Un <strong>Semitono (S)</strong> es la distancia mínima entre dos teclas pegadas (1 tecla). Un <strong>Tono (T)</strong> equivale a 2 semitonos (salteas una tecla en el medio).
            </p>
          </div>

          {/* Step-by-step Interval Chain */}
          <div className="flex flex-wrap items-center justify-center gap-2 py-4">
            {scaleNotes.map((note, idx) => {
              if (idx === scaleNotes.length - 1) {
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-amber-400 text-black font-bold flex flex-col items-center justify-center font-mono shadow">
                      <span>{note.replace(/\d/, '')}</span>
                      <span className="text-[9px]">Octava</span>
                    </div>
                  </div>
                );
              }

              const semitonesDiff = activeScale.intervals[idx + 1] - activeScale.intervals[idx];
              const stepLabel = semitonesDiff === 1 ? 'S (1 tecla)' : semitonesDiff === 2 ? 'T (2 teclas)' : '1.5 T';

              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-white font-bold flex flex-col items-center justify-center font-mono">
                    <span>{note.replace(/\d/, '')}</span>
                    <span className="text-[9px] opacity-60">G{idx + 1}</span>
                  </div>

                  {/* Interval bridge */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                      +{stepLabel}
                    </span>
                    <ChevronRight size={14} className="text-white/30" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Piano highlighting all notes of the formula */}
          <div className="pt-2">
            <Piano
              activeNotes={scaleNotes}
              onNotePlay={handleNotePlay}
            />
          </div>
        </div>
      )}
    </div>
  );
};
