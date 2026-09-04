import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Trophy, RefreshCw, Play, Volume2, Sparkles, MessageSquare, Lightbulb } from 'lucide-react';
import { Exercise, getRandomChordExercise, getChordKeys, ROOTS, CHORD_TYPES } from '../types';
import { Piano } from './Piano';
import { InstructorChatModal } from './InstructorChatModal';
import { cn } from '../lib/utils';
import * as Tone from 'tone';

export const ExerciseSystem: React.FC = () => {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [userNotes, setUserNotes] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'playing' | 'success' | 'fail'>('idle');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [difficulty, setDifficulty] = useState<'Principiante' | 'Intermedio' | 'Avanzado'>('Principiante');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const startNewExercise = useCallback(() => {
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

  const handleNotePlay = (note: string) => {
    if (status !== 'playing' || !exercise) return;

    const newNotes = [...userNotes, note];
    const trimmedNotes = newNotes.slice(-exercise.keys.length);
    setUserNotes(trimmedNotes);

    const isCorrect = exercise.keys.every(key => trimmedNotes.includes(key));

    if (isCorrect) {
      setStatus('success');
      setScore(prev => prev + 100);
      setStreak(prev => prev + 1);
      setTimeout(() => {
        startNewExercise();
      }, 1500);
    }
  };

  const playDemoSound = async () => {
    if (!exercise) return;
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.triggerAttackRelease(exercise.keys, '1n');
    setTimeout(() => synth.dispose(), 1500);
  };

  return (
    <div className="space-y-8">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Nivel de Dificultad:</span>
          {(['Principiante', 'Intermedio', 'Avanzado'] as const).map(lvl => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setDifficulty(lvl);
                if (status === 'playing') startNewExercise();
              }}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-mono transition-all",
                difficulty === lvl
                  ? "bg-amber-400 text-black font-semibold shadow"
                  : "bg-white/5 text-white/50 hover:text-white"
              )}
            >
              {lvl}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="flex items-center gap-1.5 text-xs font-mono text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 px-3.5 py-1.5 rounded-xl border border-amber-400/30 transition-all"
        >
          <MessageSquare size={13} />
          <span>Consultar al Maestro IA</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-5 rounded-2xl flex items-center justify-between border border-white/10">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Puntuación</div>
            <div className="text-2xl font-mono font-bold text-amber-400">{score} <span className="text-xs text-white/40 font-normal">PTS</span></div>
          </div>
          <Trophy className="text-amber-400/30" size={28} />
        </div>

        <div className="glass p-5 rounded-2xl flex items-center justify-between border border-white/10">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Racha Consecutiva</div>
            <div className="text-2xl font-mono font-bold text-emerald-400">{streak} 🔥</div>
          </div>
          <RefreshCw className="text-emerald-400/30" size={28} />
        </div>

        <div className="glass p-5 rounded-2xl flex items-center justify-between border border-white/10">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Estado Actual</div>
            <div className={cn(
              "text-xs font-mono uppercase tracking-wider font-semibold",
              status === 'success' ? "text-emerald-400" : "text-amber-400"
            )}>
              {status === 'idle' && 'Listo para Comenzar'}
              {status === 'playing' && 'Escuchando tu teclado...'}
              {status === 'success' && '¡Acorde Correcto!'}
            </div>
          </div>
          {status === 'success' ? (
            <CheckCircle2 className="text-emerald-400" size={28} />
          ) : (
            <Play className="text-amber-400/40" size={28} />
          )}
        </div>
      </div>

      {/* Main Exercise Arena */}
      <div className="glass p-8 md:p-12 rounded-3xl text-center space-y-8 relative overflow-hidden border border-white/10">
        <AnimatePresence mode="wait">
          {status === 'idle' ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 max-w-lg mx-auto py-8"
            >
              <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/30 mx-auto flex items-center justify-center text-amber-400 text-2xl font-serif">
                🎹
              </div>
              <h3 className="text-3xl font-serif font-bold text-white">Gimnasio Práctico del Maestro</h3>
              <p className="text-sm text-white/60 font-light leading-relaxed">
                El Maestro Aurelio te propondrá acordes al azar según tu nivel. Toca las notas en el teclado virtual o con tu teclado físico para acumular puntos y pulir tu oído.
              </p>
              <button
                type="button"
                onClick={startNewExercise}
                className="px-10 py-4 bg-amber-400 hover:bg-amber-300 text-black rounded-2xl font-semibold text-xs uppercase tracking-wider shadow-xl hover:scale-105 transition-all"
              >
                Comenzar Sesión Práctica
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
                <div className="text-amber-400 text-xs font-mono uppercase tracking-[0.25em]">
                  Misión del Maestro • Nivel {difficulty}
                </div>
                <h3 className="text-4xl md:text-5xl font-serif font-bold text-white">{exercise?.targetChord}</h3>
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
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                          : "bg-white/5 border-white/10 text-white/30"
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

              {/* Action buttons: Demo Audio & Hint */}
              <div className="flex justify-center items-center gap-3">
                <button
                  type="button"
                  onClick={playDemoSound}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono border border-white/10 transition-colors"
                >
                  <Volume2 size={13} className="text-amber-400" />
                  <span>Escuchar Demostración</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHintVisible(prev => !prev)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-xs font-mono border border-amber-400/30 transition-colors"
                >
                  <Lightbulb size={13} />
                  <span>{hintVisible ? 'Ocultar Pista' : 'Ver Pista'}</span>
                </button>

                <button
                  type="button"
                  onClick={startNewExercise}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-mono transition-colors"
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
                  onNotePlay={handleNotePlay} 
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
                <div className="text-5xl">✨</div>
                <div className="text-2xl font-serif font-bold text-emerald-400">¡Acorde Perfecto!</div>
                <div className="text-emerald-300 font-mono text-sm">+100 PTS • Racha: {streak} 🔥</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <InstructorChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userLevel={difficulty}
      />
    </div>
  );
};
