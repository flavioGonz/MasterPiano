import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, Trophy, RefreshCw, Play, Volume2, Sparkles, 
  MessageSquare, Lightbulb, Music, Target, Repeat, Flame,
  Music2, Waves, RotateCw, Shuffle, Headphones, Zap, BookOpen, Piano as PianoIcon
} from 'lucide-react';
import { Exercise, getRandomChordExercise, getChordKeys, ROOTS, CHORD_TYPES } from '../types';
import { Piano } from './Piano';
import { ScalesGym } from './ScalesGym';
import { CircleScaleSequenceGym } from './CircleScaleSequenceGym';
import { ToneWaterfallGym } from './ToneWaterfallGym';
import { InversionsGym } from './InversionsGym';
import { EarTrainingGym } from './EarTrainingGym';
import { StaffVisualizer } from './StaffVisualizer';
import { ClassicalMethodsGym } from './ClassicalMethodsGym';
import { AcousticPianoListener } from './AcousticPianoListener';
import { FloatingChordPanel } from './FloatingChordPanel';
import { pianoPitchDetector } from '../lib/pitchDetector';
import { InstructorChatModal } from './InstructorChatModal';
import { WaterfallDemoModal } from './WaterfallDemoModal';
import { buildWaterfallFromChord } from '../lib/midiWaterfall';
import { cn } from '../lib/utils';
import * as Tone from 'tone';
import { Radio } from 'lucide-react';

type GymCategory = 'scales' | 'classicalMethods' | 'circleSequence' | 'waterfall' | 'inversions' | 'earTraining' | 'chords' | 'sightReading';

interface ExerciseSystemProps {
  initialCategory?: GymCategory;
}

export const ExerciseSystem: React.FC<ExerciseSystemProps> = ({ initialCategory = 'scales' }) => {
  const [gymCategory, setGymCategory] = useState<GymCategory>(initialCategory);
  const [totalGymScore, setTotalGymScore] = useState(0);

  // Original Chord Gym State
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [userNotes, setUserNotes] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'playing' | 'success' | 'fail'>('idle');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [difficulty, setDifficulty] = useState<'Principiante' | 'Intermedio' | 'Avanzado'>('Principiante');
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Cerrado por defecto: abierto tapaba los controles de la sección activa (se abre con "Panel Acordes Mic")
  const [showFloatingChordPanel, setShowFloatingChordPanel] = useState<boolean>(false);
  const [isWaterfallModalOpen, setIsWaterfallModalOpen] = useState(false);

  const handleScoreGain = (points: number) => {
    setTotalGymScore(prev => prev + points);
  };

  const startNewChordExercise = useCallback(() => {
    let allowedTypes = ['Major', 'Minor'];
    if (difficulty === 'Intermedio') {
      allowedTypes = ['Major', 'Minor', 'Sus2', 'Sus4', '7th', 'Major 7th'];
    } else if (difficulty === 'Avanzado') {
      allowedTypes = CHORD_TYPES;
    }

    const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
    const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
    const inversion = difficulty === 'Principiante' ? 0 : Math.floor(Math.random() * 3);
    const keys = getChordKeys(root, type, inversion);
    const inversionText = inversion === 0 ? '' : inversion === 1 ? '(1ª Inversión)' : '(2ª Inversión)';

    setExercise({
      id: Math.random().toString(36).substr(2, 9),
      title: `Toca el acorde de ${root} ${type} ${inversionText}`,
      targetChord: `${root} ${type} ${inversionText}`,
      targetRoot: root,
      targetType: type,
      keys,
    });
    setUserNotes([]);
    setStatus('playing');
    setHintVisible(false);
  }, [difficulty]);

  const handleChordNotePlay = useCallback((note: string) => {
    if (status !== 'playing' || !exercise) return;

    const newNotes = [...userNotes, note];
    const trimmedNotes = newNotes.slice(-exercise.keys.length);
    setUserNotes(trimmedNotes);

    const isCorrect = exercise.keys.every(key => trimmedNotes.includes(key));

    if (isCorrect) {
      setStatus('success');
      setScore(prev => prev + 100);
      setStreak(prev => prev + 1);
      setTotalGymScore(prev => prev + 100);
      setTimeout(() => {
        startNewChordExercise();
      }, 1500);
    }
  }, [status, exercise, userNotes, startNewChordExercise]);

  // Subscribe to acoustic pitch detector for Chord Challenge
  useEffect(() => {
    if (gymCategory === 'chords' && status === 'playing') {
      const unsub = pianoPitchDetector.subscribeNoteOnset((info) => {
        handleChordNotePlay(info.note);
      });
      return unsub;
    }
  }, [gymCategory, status, handleChordNotePlay]);

  const playChordDemoSound = async () => {
    if (!exercise) return;
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.triggerAttackRelease(exercise.keys, '1n');
    setTimeout(() => synth.dispose(), 1500);
  };

  return (
    <div className="space-y-8">
      {/* Category Navigation Bar */}
      <div className="glass p-2 rounded-2xl border border-line flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'classicalMethods', label: '3 Métodos Clásicos', badge: 'Hanon • Czerny • Suzuki', Icon: BookOpen },
            { id: 'scales', label: 'Gimnasio de Escalas', badge: 'Lúdico & Memoria', Icon: Music2 },
            { id: 'waterfall', label: 'Catarata de Tonos', badge: 'MIDI & Cascada', Icon: Waves },
            { id: 'circleSequence', label: 'Secuencias Ciclo de Quintas', badge: 'Metrónomo & Claves', Icon: RotateCw },
            { id: 'inversions', label: 'Tríadas e Inversiones', badge: 'Carrusel & Oído', Icon: Shuffle },
            { id: 'earTraining', label: 'Oído: Intervalos y Tríadas', badge: 'A Ciegas', Icon: Headphones },
            { id: 'chords', label: 'Desafío de Acordes', badge: 'Reflejos Rápidos', Icon: Zap },
            { id: 'sightReading', label: 'Lectura de Partituras', badge: 'Pentagrama en Vivo', Icon: BookOpen },
          ].map(tab => {
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.id}
                type="button"
                id={`gym-tab-${tab.id}`}
                onClick={() => setGymCategory(tab.id as GymCategory)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-mono transition-all",
                  gymCategory === tab.id
                    ? "bg-amber-400 text-black font-bold shadow-md"
                    : "text-ink-2 hover:text-ink hover:bg-surface-2"
                )}
              >
                <TabIcon size={15} />
                <span>{tab.label}</span>
                <span className={cn(
                  "hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-md",
                  gymCategory === tab.id
                    ? "bg-black/20 text-black font-bold"
                    : "bg-surface-3 text-ink-3"
                )}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Total Points & Maestro Ask Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-brand-2 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/30">
            <Trophy size={14} />
            <span>Puntos Gimnasio: <strong>{totalGymScore + score}</strong></span>
          </div>

          {/* Floating Chord Detector Toggle Button */}
          <button
            type="button"
            onClick={() => setShowFloatingChordPanel(prev => !prev)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-xl border transition-all",
              showFloatingChordPanel
                ? "bg-amber-400 text-black font-bold border-amber-400 shadow-md shadow-amber-400/20"
                : "text-ink-2 hover:text-ink bg-surface-2 hover:bg-surface-3 border-line"
            )}
            title="Mostrar u ocultar panel flotante de acordes acústicos en vivo"
          >
            <Radio size={13} className={showFloatingChordPanel ? "animate-pulse text-black" : "text-brand-2"} />
            <span>Panel Acordes Mic</span>
          </button>

          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-ink-2 hover:text-ink bg-surface-2 hover:bg-surface-3 px-3.5 py-1.5 rounded-xl border border-line transition-all"
          >
            <MessageSquare size={13} className="text-brand-2" />
            <span>Consultar Maestro</span>
          </button>
        </div>
      </div>

      {/* RENDER CATEGORY */}
      <AnimatePresence mode="wait">
        {gymCategory === 'classicalMethods' && (
          <motion.div
            key="classicalMethods"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ClassicalMethodsGym onScoreGain={handleScoreGain} />
          </motion.div>
        )}

        {gymCategory === 'scales' && (
          <motion.div
            key="scales"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ScalesGym 
              onScoreGain={handleScoreGain} 
              onSwitchToCircleSequence={() => setGymCategory('circleSequence')} 
            />
          </motion.div>
        )}

        {gymCategory === 'waterfall' && (
          <motion.div
            key="waterfall"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ToneWaterfallGym onScoreGain={handleScoreGain} />
          </motion.div>
        )}

        {gymCategory === 'circleSequence' && (
          <motion.div
            key="circleSequence"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <CircleScaleSequenceGym onScoreGain={handleScoreGain} />
          </motion.div>
        )}

        {gymCategory === 'inversions' && (
          <motion.div
            key="inversions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <InversionsGym onScoreGain={handleScoreGain} />
          </motion.div>
        )}

        {gymCategory === 'earTraining' && (
          <motion.div
            key="earTraining"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <EarTrainingGym onScoreGain={handleScoreGain} />
          </motion.div>
        )}

        {gymCategory === 'chords' && (
          <motion.div
            key="chords"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-8"
          >
            {/* Top Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-ink-3 uppercase tracking-wider">Dificultad:</span>
                {(['Principiante', 'Intermedio', 'Avanzado'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setDifficulty(lvl);
                      if (status === 'playing') startNewChordExercise();
                    }}
                    className={cn(
                      "px-3 py-1 rounded-xl text-xs font-mono transition-all",
                      difficulty === lvl
                        ? "bg-amber-400 text-black font-semibold shadow"
                        : "bg-surface-2 text-ink-3 hover:text-ink"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div className="text-xs font-mono text-ink-3 flex items-center gap-1">
                <span>Racha actual:</span>
                <strong className="text-ok flex items-center gap-1">
                  <span>{streak}</span>
                  <Flame size={13} className="text-danger inline" />
                </strong>
              </div>
            </div>

            {/* Real Acoustic Piano Microphone Analyzer */}
            <AcousticPianoListener
              currentTargetNotes={exercise?.keys}
              exerciseName={exercise?.title || 'Desafío de Acordes'}
            />

            {/* Main Exercise Arena */}
            <div className="glass p-8 md:p-12 rounded-3xl text-center space-y-8 relative overflow-hidden border border-line">
              <AnimatePresence mode="wait">
                {status === 'idle' ? (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6 max-w-lg mx-auto py-8"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/30 mx-auto flex items-center justify-center text-brand-2 shadow-md">
                      <PianoIcon size={32} />
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-ink">Desafío Rápido de Acordes</h3>
                    <p className="text-sm text-ink-2 font-light leading-relaxed">
                      El Maestro Aurelio te propondrá acordes al azar según tu nivel. Toca las notas en el teclado para acumular puntos y pulir tu oído.
                    </p>
                    <button
                      type="button"
                      onClick={startNewChordExercise}
                      className="px-10 py-4 bg-amber-400 hover:bg-amber-300 text-black rounded-2xl font-semibold text-xs uppercase tracking-wider shadow-xl hover:scale-105 transition-all"
                    >
                      Comenzar Desafío
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="space-y-2">
                      <div className="text-brand-2 text-xs font-mono uppercase tracking-[0.25em]">
                        Misión del Maestro • Nivel {difficulty}
                      </div>
                      <h3 className="text-4xl md:text-5xl font-serif font-bold text-ink">{exercise?.targetChord}</h3>
                    </div>

                    {/* Note detection boxes */}
                    <div className="flex flex-wrap justify-center gap-3">
                      {exercise?.keys.map((key, i) => {
                        const isHit = userNotes.includes(key);
                        return (
                          <div 
                            key={i}
                            className={cn(
                              "w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 font-mono",
                              isHit 
                                ? "bg-emerald-500/20 border-emerald-400 text-ok shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                                : "bg-surface-2 border-line text-ink-3"
                            )}
                          >
                            <span className="text-base font-bold">
                              {isHit ? key.replace(/\d/, '') : (hintVisible ? key.replace(/\d/, '') : '?')}
                            </span>
                            <span className="text-[9px] opacity-60">
                              {isHit || hintVisible ? key.slice(-1) : 'oct'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action buttons: Demo Audio, Demo Catarata & Hint */}
                    <div className="flex flex-wrap justify-center items-center gap-3">
                      <button
                        type="button"
                        onClick={playChordDemoSound}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink text-xs font-mono border border-line transition-colors"
                      >
                        <Volume2 size={13} className="text-brand-2" />
                        <span>Escuchar Demostración</span>
                      </button>

                      {/* Tone Waterfall Demo Button */}
                      <button
                        type="button"
                        id="btn-chord-waterfall-demo"
                        onClick={() => setIsWaterfallModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-black text-xs font-mono font-bold transition-all shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95"
                        title="Demostración de notas del acorde cayendo en la catarata"
                      >
                        <Flame size={13} className="fill-black" />
                        <span>Demo Catarata</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHintVisible(prev => !prev)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-brand-2 text-xs font-mono border border-amber-400/30 transition-colors"
                      >
                        <Lightbulb size={13} />
                        <span>{hintVisible ? 'Ocultar Pista' : 'Ver Pista'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={startNewChordExercise}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink text-xs font-mono transition-colors"
                      >
                        <RefreshCw size={13} />
                        <span>Siguiente Acorde</span>
                      </button>
                    </div>

                    {/* Piano Keyboard */}
                    <div className="pt-4">
                      <Piano 
                        activeNotes={status === 'success' ? exercise?.keys : userNotes} 
                        correctNotes={userNotes.filter(n => exercise?.keys.includes(n))}
                        chordRoot={exercise?.targetRoot}
                        onNotePlay={handleChordNotePlay} 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Splash */}
              <AnimatePresence>
                {status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-none"
                  >
                    <div className="glass p-8 rounded-3xl border border-emerald-500/40 text-center space-y-2 shadow-2xl">
                      <div className="flex justify-center text-ok">
                        <Sparkles size={48} />
                      </div>
                      <div className="text-2xl font-serif font-bold text-ok">¡Acorde Perfecto!</div>
                      <div className="text-ok font-mono text-sm flex items-center justify-center gap-1">
                        <span>+100 PTS • Racha: {streak}</span>
                        <Flame size={14} className="text-danger inline" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {gymCategory === 'sightReading' && (
          <motion.div
            key="sightReading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-brand-2 text-xs font-mono uppercase tracking-widest">
                Entrenamiento Visual
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
                Gimnasio de Lectura a Primera Vista
              </h3>
              <p className="text-xs sm:text-sm text-ink-3 font-light">
                Descifra cómo se escriben los acordes en el Gran Pentagrama, entrena la asociación visual con los sonidos y prueba el 'Entrenador de Lectura' integrado.
              </p>
            </div>

            <StaffVisualizer
              notes={['C4', 'E4', 'G4']}
              chordName="Do Mayor (C Major)"
              root="C"
              chordType="Major"
              inversion={0}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <InstructorChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userLevel={difficulty}
      />

      {/* Real-time Floating Acoustic Chord Detector Panel */}
      {showFloatingChordPanel && (
        <FloatingChordPanel defaultExpanded={true} />
      )}

      {/* Tone Waterfall Demo Modal for Current Exercise */}
      {isWaterfallModalOpen && exercise && (
        <WaterfallDemoModal
          isOpen={isWaterfallModalOpen}
          onClose={() => setIsWaterfallModalOpen(false)}
          title={`Desafío: ${exercise.targetChord}`}
          subtitle={`Notas: ${exercise.keys.join(' - ')}`}
          composer="Gimnasio Práctico de Acordes"
          bpm={90}
          notes={buildWaterfallFromChord(
            exercise.targetChord,
            exercise.keys,
            90
          )}
        />
      )}
    </div>
  );
};
