import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Headphones, Volume2, Sparkles, Trophy, Flame, RefreshCw, 
  Lightbulb, CheckCircle2, XCircle, Play, Eye, EyeOff, 
  Music, Layers, ArrowUpRight, ArrowDownRight, Award, MessageSquare
} from 'lucide-react';
import * as Tone from 'tone';
import { cn } from '../lib/utils';
import { 
  INTERVALS_DATABASE, 
  IntervalTheoryInfo, 
  generateRandomIntervalChallenge, 
  generateRandomTriadChallenge,
  EarTrainingTriadChallenge,
  TRIAD_QUALITIES,
  TriadQuality
} from '../lib/musicGymTheory';
import { Piano } from './Piano';
import { maestroVoice } from '../lib/speech';

interface EarTrainingGymProps {
  onScoreGain?: (points: number) => void;
}

type EarMode = 'intervals' | 'triads';
type IntervalPlayStyle = 'ascending' | 'descending' | 'harmonic';
type TriadPlayStyle = 'arpeggioUp' | 'block' | 'arpeggioDown';
type DifficultyLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

export const EarTrainingGym: React.FC<EarTrainingGymProps> = ({ onScoreGain }) => {
  const [earMode, setEarMode] = useState<EarMode>('intervals');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Principiante');
  const [intervalPlayStyle, setIntervalPlayStyle] = useState<IntervalPlayStyle>('ascending');
  const [triadPlayStyle, setTriadPlayStyle] = useState<TriadPlayStyle>('arpeggioUp');
  
  // Game session stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [correctGuesses, setCorrectGuesses] = useState(0);

  // Interval challenge state
  const [intervalChallenge, setIntervalChallenge] = useState<ReturnType<typeof generateRandomIntervalChallenge> | null>(null);
  const [selectedIntervalId, setSelectedIntervalId] = useState<string | null>(null);
  const [intervalFeedback, setIntervalFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Triad challenge state
  const [triadChallenge, setTriadChallenge] = useState<EarTrainingTriadChallenge | null>(null);
  const [selectedTriadQuality, setSelectedTriadQuality] = useState<string | null>(null);
  const [triadFeedback, setTriadFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Audio & UX state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showPianoReveal, setShowPianoReveal] = useState(false);
  const [isSpeakingMaestro, setIsSpeakingMaestro] = useState(false);
  const [maestroComment, setMaestroComment] = useState<string>('');

  // Synth reference for consistent warm piano tone
  const synthRef = useRef<Tone.PolySynth | null>(null);

  useEffect(() => {
    // Warm polyphonic synth with piano-like decay
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: {
        attack: 0.005,
        decay: 1.2,
        sustain: 0.15,
        release: 1.2,
      },
    }).toDestination();
    synth.volume.value = -4;
    synthRef.current = synth;

    return () => {
      synth.dispose();
      maestroVoice.stop();
    };
  }, []);

  // Initialize first challenges
  const initNewIntervalChallenge = useCallback(() => {
    const challenge = generateRandomIntervalChallenge(difficulty);
    setIntervalChallenge(challenge);
    setSelectedIntervalId(null);
    setIntervalFeedback('idle');
    setShowHint(false);
    setShowPianoReveal(false);
    setMaestroComment('');
  }, [difficulty]);

  const initNewTriadChallenge = useCallback(() => {
    const challenge = generateRandomTriadChallenge(difficulty);
    setTriadChallenge(challenge);
    setSelectedTriadQuality(null);
    setTriadFeedback('idle');
    setShowHint(false);
    setShowPianoReveal(false);
    setMaestroComment('');
  }, [difficulty]);

  // Load new challenge on mount or difficulty/mode change
  useEffect(() => {
    if (earMode === 'intervals') {
      initNewIntervalChallenge();
    } else {
      initNewTriadChallenge();
    }
  }, [earMode, difficulty, initNewIntervalChallenge, initNewTriadChallenge]);

  // Play sound for intervals
  const playIntervalAudio = async (speed: 'normal' | 'slow' = 'normal', overrideStyle?: IntervalPlayStyle) => {
    if (!intervalChallenge) return;
    await Tone.start();
    setIsPlayingAudio(true);

    const style = overrideStyle || intervalPlayStyle;
    const synth = synthRef.current;
    if (!synth) return;

    const delayBetween = speed === 'slow' ? 0.9 : 0.55;
    const now = Tone.now();

    if (style === 'harmonic') {
      // Both notes together
      synth.triggerAttackRelease([intervalChallenge.rootNote, intervalChallenge.targetNote], '1.2n', now);
      setTimeout(() => setIsPlayingAudio(false), 1400);
    } else if (style === 'ascending') {
      // Root then Target
      synth.triggerAttackRelease(intervalChallenge.rootNote, '0.8n', now);
      synth.triggerAttackRelease(intervalChallenge.targetNote, '1.2n', now + delayBetween);
      setTimeout(() => setIsPlayingAudio(false), (delayBetween + 1.2) * 1000);
    } else {
      // Descending: Target then Root
      synth.triggerAttackRelease(intervalChallenge.targetNote, '0.8n', now);
      synth.triggerAttackRelease(intervalChallenge.rootNote, '1.2n', now + delayBetween);
      setTimeout(() => setIsPlayingAudio(false), (delayBetween + 1.2) * 1000);
    }
  };

  // Play sound for triads
  const playTriadAudio = async (speed: 'normal' | 'slow' = 'normal', overrideStyle?: TriadPlayStyle) => {
    if (!triadChallenge) return;
    await Tone.start();
    setIsPlayingAudio(true);

    const style = overrideStyle || triadPlayStyle;
    const synth = synthRef.current;
    if (!synth) return;

    const delay = speed === 'slow' ? 0.75 : 0.45;
    const now = Tone.now();

    if (style === 'block') {
      // All 3 notes simultaneously
      synth.triggerAttackRelease(triadChallenge.notes, '1.5n', now);
      setTimeout(() => setIsPlayingAudio(false), 1600);
    } else if (style === 'arpeggioUp') {
      // 1st, 2nd, 3rd note
      triadChallenge.notes.forEach((note, index) => {
        synth.triggerAttackRelease(note, '0.7n', now + index * delay);
      });
      setTimeout(() => setIsPlayingAudio(false), (triadChallenge.notes.length * delay + 1) * 1000);
    } else {
      // Arpeggio Down
      const reversedNotes = [...triadChallenge.notes].reverse();
      reversedNotes.forEach((note, index) => {
        synth.triggerAttackRelease(note, '0.7n', now + index * delay);
      });
      setTimeout(() => setIsPlayingAudio(false), (reversedNotes.length * delay + 1) * 1000);
    }
  };

  // Trigger audio automatically on first load of a new question
  useEffect(() => {
    const timer = setTimeout(() => {
      if (earMode === 'intervals' && intervalChallenge && intervalFeedback === 'idle') {
        playIntervalAudio();
      } else if (earMode === 'triads' && triadChallenge && triadFeedback === 'idle') {
        playTriadAudio();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [intervalChallenge?.interval.id, intervalChallenge?.rootNote, triadChallenge?.root, triadChallenge?.quality]);

  // Handle user guess for Interval
  const handleIntervalSelect = (interval: IntervalTheoryInfo) => {
    if (intervalFeedback !== 'idle' || !intervalChallenge) return;

    setSelectedIntervalId(interval.id);
    setTotalGuesses(prev => prev + 1);

    const isCorrect = interval.id === intervalChallenge.interval.id;

    if (isCorrect) {
      setIntervalFeedback('correct');
      const gained = intervalPlayStyle === 'harmonic' ? 150 : 100;
      setScore(prev => prev + gained);
      setStreak(prev => {
        const next = prev + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });
      setCorrectGuesses(prev => prev + 1);
      if (onScoreGain) onScoreGain(gained);

      const phrases = [
        `¡Impecable che! Diste en el clavo: era una ${interval.name}.`,
        `¡Qué buen oído tenés! Exacto, como en ${interval.famousSong}.`,
        `¡Excelente! Tu memoria auditiva está afiladísima.`
      ];
      const comment = phrases[Math.floor(Math.random() * phrases.length)];
      setMaestroComment(comment);
    } else {
      setIntervalFeedback('wrong');
      setStreak(0);
      const comment = `¡Casi che! Escogiste ${interval.shortName}, pero en realidad era una ${intervalChallenge.interval.shortName} (${intervalChallenge.interval.semitones} semitonos). Escuchá de nuevo para comparar el color.`;
      setMaestroComment(comment);
    }

    // Auto-reveal the piano so the user can verify physically
    setShowPianoReveal(true);
  };

  // Handle user guess for Triad
  const handleTriadSelect = (quality: TriadQuality) => {
    if (triadFeedback !== 'idle' || !triadChallenge) return;

    setSelectedTriadQuality(quality.id);
    setTotalGuesses(prev => prev + 1);

    const isCorrect = quality.id === triadChallenge.quality;

    if (isCorrect) {
      setTriadFeedback('correct');
      const gained = triadPlayStyle === 'block' ? 150 : 100;
      setScore(prev => prev + gained);
      setStreak(prev => {
        const next = prev + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });
      setCorrectGuesses(prev => prev + 1);
      if (onScoreGain) onScoreGain(gained);

      const phrases = [
        `¡Acertaste che! Esa es una sonoridad inconfundible de Tríada ${quality.name}.`,
        `¡Qué oído armónico! Supiste captar de inmediato el color ${quality.name}.`,
        `¡Impecable! Con este oído vas a sacar canciones de oreja en nada de tiempo.`
      ];
      const comment = phrases[Math.floor(Math.random() * phrases.length)];
      setMaestroComment(comment);
    } else {
      setTriadFeedback('wrong');
      setStreak(0);
      const comment = `Cerca che. Escogiste Tríada ${quality.name}, pero el acorde era ${triadChallenge.qualityInfo.name}. Sentí la diferencia en la 3ª y la 5ª.`;
      setMaestroComment(comment);
    }

    // Auto-reveal the piano
    setShowPianoReveal(true);
  };

  // Speak Maestro commentary
  const speakMaestro = (text: string) => {
    if (isSpeakingMaestro) {
      maestroVoice.stop();
      setIsSpeakingMaestro(false);
      return;
    }
    setIsSpeakingMaestro(true);
    maestroVoice.speak(text).finally(() => setIsSpeakingMaestro(false));
  };

  // Filter interval pool by difficulty for selection buttons
  const availableIntervalOptions = INTERVALS_DATABASE.filter(i => {
    if (difficulty === 'Principiante') return i.difficulty === 'Principiante';
    if (difficulty === 'Intermedio') return i.difficulty === 'Principiante' || i.difficulty === 'Intermedio';
    return true;
  });

  // Filter triad pool by difficulty
  const availableTriadOptions = TRIAD_QUALITIES.filter(q => {
    if (difficulty === 'Principiante') return q.id === 'Major' || q.id === 'Minor';
    if (difficulty === 'Intermedio') return q.id === 'Major' || q.id === 'Minor' || q.id === 'Diminished';
    return true;
  });

  const accuracy = totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 100;

  return (
    <div className="space-y-8" id="ear-training-gym-container">
      {/* Sub-header Navigation: Mode selector & Level */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="tab-ear-intervals"
            onClick={() => setEarMode('intervals')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono transition-all",
              earMode === 'intervals'
                ? "bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/20"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Music size={15} />
            <span>1. Reconocer Intervalos</span>
          </button>

          <button
            type="button"
            id="tab-ear-triads"
            onClick={() => setEarMode('triads')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono transition-all",
              earMode === 'triads'
                ? "bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/20"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Layers size={15} />
            <span>2. Reconocer Tríadas</span>
          </button>
        </div>

        {/* Difficulty buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider hidden md:inline">Nivel:</span>
          {(['Principiante', 'Intermedio', 'Avanzado'] as const).map(lvl => (
            <button
              key={lvl}
              type="button"
              id={`diff-${lvl.toLowerCase()}`}
              onClick={() => setDifficulty(lvl)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                difficulty === lvl
                  ? "bg-white/15 text-white font-semibold border border-white/30"
                  : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Gamification Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass p-3.5 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
            <Trophy size={18} />
          </div>
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">Puntos de Oído</div>
            <div className="text-lg font-mono font-bold text-white">+{score} <span className="text-xs text-amber-400 font-normal">PTS</span></div>
          </div>
        </div>

        <div className="glass p-3.5 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flame size={18} />
          </div>
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">Racha de Aciertos</div>
            <div className="text-lg font-mono font-bold text-rose-300">{streak} 🔥 <span className="text-xs text-white/30 font-normal">(Récord: {bestStreak})</span></div>
          </div>
        </div>

        <div className="glass p-3.5 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">Aciertos / Intentos</div>
            <div className="text-lg font-mono font-bold text-white">{correctGuesses} <span className="text-xs text-white/40">/ {totalGuesses}</span></div>
          </div>
        </div>

        <div className="glass p-3.5 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Award size={18} />
          </div>
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">Precisión Auditiva</div>
            <div className="text-lg font-mono font-bold text-purple-300">{accuracy}%</div>
          </div>
        </div>
      </div>

      {/* MAIN LISTENING ARENA */}
      <div className="glass p-6 md:p-10 rounded-3xl border border-white/10 text-center space-y-8 relative overflow-hidden bg-gradient-to-b from-white/[0.04] to-black/40 shadow-2xl">
        
        {/* Blind Training Curtain / Visualizer */}
        <div className="max-w-xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-mono">
            <Headphones size={13} />
            <span>Entrenamiento a Ciegas: El teclado está oculto hasta que respondas</span>
          </div>

          <h3 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
            {earMode === 'intervals' ? '¿Qué intervalo escuchás?' : '¿Qué color de tríada sonó?'}
          </h3>

          <p className="text-xs sm:text-sm text-white/60 font-light max-w-md mx-auto leading-relaxed">
            {earMode === 'intervals'
              ? 'Escuchá con atención el piano. Prestá atención a si el sonido genera tensión, consonancia o una melodía conocida.'
              : 'Distingue si el acorde suena alegre (Mayor), melancólico (Menor), tenso de suspenso (Disminuido) o flotante misterioso (Aumentado).'}
          </p>
        </div>

        {/* Audio Playback Controls Box with Sound Waves */}
        <div className="p-6 md:p-8 rounded-3xl bg-black/40 border border-white/10 max-w-lg mx-auto space-y-6 shadow-inner relative">
          
          {/* Audio Waveform Animation */}
          <div className="flex items-center justify-center gap-1.5 h-12">
            {[40, 75, 55, 90, 65, 100, 70, 85, 45, 95, 60, 80, 50].map((height, i) => (
              <motion.div
                key={i}
                animate={isPlayingAudio ? {
                  scaleY: [0.3, height / 100, 0.4],
                  opacity: [0.5, 1, 0.5]
                } : {
                  scaleY: 0.2,
                  opacity: 0.2
                }}
                transition={{
                  duration: 0.5,
                  repeat: isPlayingAudio ? Infinity : 0,
                  delay: i * 0.04,
                  ease: "easeInOut"
                }}
                className={cn(
                  "w-1.5 rounded-full origin-center transition-colors",
                  isPlayingAudio ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]" : "bg-white/20"
                )}
                style={{ height: '36px' }}
              />
            ))}
          </div>

          {/* Primary Listening Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              id="btn-play-primary"
              onClick={() => earMode === 'intervals' ? playIntervalAudio() : playTriadAudio()}
              disabled={isPlayingAudio}
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs sm:text-sm font-mono tracking-wide shadow-lg shadow-amber-400/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Volume2 size={18} className={isPlayingAudio ? "animate-bounce" : ""} />
              <span>{isPlayingAudio ? 'Reproduciendo...' : '▶️ Escuchar Piano'}</span>
            </button>

            <button
              type="button"
              id="btn-play-slow"
              onClick={() => earMode === 'intervals' ? playIntervalAudio('slow') : playTriadAudio('slow')}
              disabled={isPlayingAudio}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-mono transition-all disabled:opacity-50"
            >
              <span>🐢 Más Lento</span>
            </button>
          </div>

          {/* Style toggles (Melodic vs Harmonic) */}
          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-mono text-white/40">Modo de toque:</span>
            {earMode === 'intervals' ? (
              <>
                <button
                  type="button"
                  id="style-ascending"
                  onClick={() => {
                    setIntervalPlayStyle('ascending');
                    playIntervalAudio('normal', 'ascending');
                  }}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                    intervalPlayStyle === 'ascending' ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white/80"
                  )}
                >
                  <ArrowUpRight size={13} />
                  <span>Ascendente</span>
                </button>

                <button
                  type="button"
                  id="style-descending"
                  onClick={() => {
                    setIntervalPlayStyle('descending');
                    playIntervalAudio('normal', 'descending');
                  }}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                    intervalPlayStyle === 'descending' ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white/80"
                  )}
                >
                  <ArrowDownRight size={13} />
                  <span>Descendente</span>
                </button>

                <button
                  type="button"
                  id="style-harmonic"
                  onClick={() => {
                    setIntervalPlayStyle('harmonic');
                    playIntervalAudio('normal', 'harmonic');
                  }}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                    intervalPlayStyle === 'harmonic' ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white/80"
                  )}
                >
                  <Layers size={13} />
                  <span>Armónico (Juntas)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  id="style-triad-arpeggio-up"
                  onClick={() => {
                    setTriadPlayStyle('arpeggioUp');
                    playTriadAudio('normal', 'arpeggioUp');
                  }}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                    triadPlayStyle === 'arpeggioUp' ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white/80"
                  )}
                >
                  <ArrowUpRight size={13} />
                  <span>Arpegio Asc.</span>
                </button>

                <button
                  type="button"
                  id="style-triad-block"
                  onClick={() => {
                    setTriadPlayStyle('block');
                    playTriadAudio('normal', 'block');
                  }}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                    triadPlayStyle === 'block' ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white/80"
                  )}
                >
                  <Layers size={13} />
                  <span>Acorde en Bloque</span>
                </button>

                <button
                  type="button"
                  id="style-triad-arpeggio-down"
                  onClick={() => {
                    setTriadPlayStyle('arpeggioDown');
                    playTriadAudio('normal', 'arpeggioDown');
                  }}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                    triadPlayStyle === 'arpeggioDown' ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white/80"
                  )}
                >
                  <ArrowDownRight size={13} />
                  <span>Arpegio Desc.</span>
                </button>
              </>
            )}
          </div>

          {/* Hint button */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              id="btn-hint"
              onClick={() => setShowHint(prev => !prev)}
              className="flex items-center gap-1.5 text-xs font-mono text-amber-300 hover:text-amber-200 transition-colors"
            >
              <Lightbulb size={13} />
              <span>{showHint ? 'Ocultar Pista' : 'Pedir Pista Nemotécnica'}</span>
            </button>
          </div>

          {/* Hint content revealed */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200 text-left space-y-1 font-mono"
              >
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <Sparkles size={13} />
                  <span>Pista del Maestro:</span>
                </div>
                {earMode === 'intervals' && intervalChallenge ? (
                  <p className="text-white/80">
                    💡 <em>Canción guía:</em> Este intervalo suena exactamente en el inicio de <strong>"{intervalChallenge.interval.famousSong}"</strong>. {intervalChallenge.interval.moodDescription}
                  </p>
                ) : triadChallenge ? (
                  <p className="text-white/80">
                    💡 <em>Carácter acústico:</em> La tríada {triadChallenge.qualityInfo.name} transmite una emoción de <strong>{triadChallenge.qualityInfo.description}</strong>.
                  </p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* GUESS OPTIONS CARDS */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="text-xs font-mono text-white/40 uppercase tracking-wider text-left">
            Seleccioná tu respuesta:
          </div>

          {earMode === 'intervals' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableIntervalOptions.map(interval => {
                const isSelected = selectedIntervalId === interval.id;
                const isTarget = intervalChallenge?.interval.id === interval.id;
                const hasAnswered = intervalFeedback !== 'idle';

                let buttonStyle = "bg-white/5 border-white/10 hover:bg-white/10 text-white";
                if (hasAnswered) {
                  if (isTarget) {
                    buttonStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]";
                  } else if (isSelected && !isTarget) {
                    buttonStyle = "bg-rose-500/20 border-rose-400 text-rose-300 opacity-60";
                  } else {
                    buttonStyle = "opacity-30 bg-white/5 border-white/5";
                  }
                }

                return (
                  <button
                    key={interval.id}
                    type="button"
                    id={`option-interval-${interval.id}`}
                    onClick={() => handleIntervalSelect(interval)}
                    disabled={hasAnswered}
                    className={cn(
                      "p-4 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all group",
                      buttonStyle
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold font-serif">{interval.shortName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                        {interval.semitones} semitonos
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-white/50 group-hover:text-white/70 line-clamp-1">
                      {interval.famousSong}
                    </div>

                    {hasAnswered && isTarget && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold mt-1">
                        <CheckCircle2 size={12} />
                        <span>¡Respuesta correcta!</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableTriadOptions.map(quality => {
                const isSelected = selectedTriadQuality === quality.id;
                const isTarget = triadChallenge?.quality === quality.id;
                const hasAnswered = triadFeedback !== 'idle';

                let cardStyle = "bg-white/5 border-white/10 hover:bg-white/10 text-white";
                if (hasAnswered) {
                  if (isTarget) {
                    cardStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]";
                  } else if (isSelected && !isTarget) {
                    cardStyle = "bg-rose-500/20 border-rose-400 text-rose-300 opacity-60";
                  } else {
                    cardStyle = "opacity-30 bg-white/5 border-white/5";
                  }
                }

                return (
                  <button
                    key={quality.id}
                    type="button"
                    id={`option-triad-${quality.id}`}
                    onClick={() => handleTriadSelect(quality)}
                    disabled={hasAnswered}
                    className={cn(
                      "p-5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all group",
                      cardStyle
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-serif font-bold text-white group-hover:text-amber-300 transition-colors">
                          {quality.name}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/10 text-amber-300">
                          {quality.symbol || 'Triad'}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-white/50">
                        {quality.semitoneIntervals.join(' - ')} semitonos
                      </div>
                    </div>

                    <p className="text-xs text-white/60 font-light leading-relaxed">
                      {quality.description}
                    </p>

                    {hasAnswered && isTarget && (
                      <div className="flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold">
                        <CheckCircle2 size={13} />
                        <span>¡Tríada Identificada!</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FEEDBACK & REVEAL SECTION */}
        <AnimatePresence>
          {(intervalFeedback !== 'idle' || triadFeedback !== 'idle') && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-6 rounded-3xl bg-black/50 border border-white/10 max-w-2xl mx-auto space-y-6 text-left"
            >
              {/* Maestro Aurelio Voice Banner */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 font-serif text-lg">
                    🇺🇾
                  </div>
                  <div>
                    <div className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                      Maestro Aurelio (Montevideo)
                    </div>
                    <p className="text-sm text-white/90 font-light mt-0.5">
                      "{maestroComment}"
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-speak-maestro-feedback"
                  onClick={() => speakMaestro(maestroComment)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:bg-amber-300 transition-colors shrink-0 shadow"
                >
                  <Volume2 size={13} />
                  <span>{isSpeakingMaestro ? 'Pausar' : 'Escuchar Maestro'}</span>
                </button>
              </div>

              {/* Solution Analysis Card */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3 font-mono text-xs">
                <div className="text-white/40 uppercase tracking-wider text-[11px] font-bold">
                  Análisis Armónico de la Solución:
                </div>

                {earMode === 'intervals' && intervalChallenge ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-white/40 text-[10px]">Notas Tocadas:</div>
                      <div className="text-base font-bold text-amber-300">
                        {intervalChallenge.rootNote} → {intervalChallenge.targetNote}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-white/40 text-[10px]">Distancia:</div>
                      <div className="text-base font-bold text-emerald-400">
                        {intervalChallenge.semitones} Semitonos ({intervalChallenge.interval.shortName})
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-white/40 text-[10px]">Canción Guía:</div>
                      <div className="text-xs font-bold text-white/90">
                        {intervalChallenge.interval.famousSong}
                      </div>
                    </div>
                  </div>
                ) : triadChallenge ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-white/40 text-[10px]">Acorde Tocado:</div>
                      <div className="text-base font-bold text-amber-300">
                        {triadChallenge.root} {triadChallenge.qualityInfo.name}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-white/40 text-[10px]">Estructura de Notas:</div>
                      <div className="text-base font-bold text-emerald-400">
                        {triadChallenge.notes.join(' - ')}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-white/40 text-[10px]">Intervalos:</div>
                      <div className="text-xs font-bold text-white/90">
                        {triadChallenge.qualityInfo.semitoneIntervals.join(' / ')} semitonos
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Interactive Piano Reveal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-white/50">
                  <span>Visualización física en el teclado:</span>
                  <span className="text-emerald-400 font-bold">● Notas que sonaron</span>
                </div>
                <div className="pt-2">
                  <Piano
                    activeNotes={
                      earMode === 'intervals' && intervalChallenge
                        ? [intervalChallenge.rootNote, intervalChallenge.targetNote]
                        : triadChallenge ? triadChallenge.notes : []
                    }
                    correctNotes={
                      earMode === 'intervals' && intervalChallenge
                        ? [intervalChallenge.rootNote, intervalChallenge.targetNote]
                        : triadChallenge ? triadChallenge.notes : []
                    }
                  />
                </div>
              </div>

              {/* Next Challenge Action */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  id="btn-next-ear-challenge"
                  onClick={() => earMode === 'intervals' ? initNewIntervalChallenge() : initNewTriadChallenge()}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono uppercase tracking-wider shadow-xl hover:scale-105 transition-all"
                >
                  <RefreshCw size={14} />
                  <span>Siguiente Ejercicio</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
};
