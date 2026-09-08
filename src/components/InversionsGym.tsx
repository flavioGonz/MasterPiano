import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, Sparkles, CheckCircle2, 
  HelpCircle, Trophy, Lightbulb, ArrowRight, RefreshCw, Eye, Music,
  RotateCw, Target, ArrowRightLeft, Hand, GraduationCap, AlertCircle,
  ChevronRight, Layers, Dumbbell
} from 'lucide-react';
import { 
  CHROMATIC_NOTES, INVERSIONS_GUIDE, TRIAD_QUALITIES, 
  calculateTriadInversion, validateTriadInversionSubmission 
} from '../lib/musicGymTheory';
import { Piano } from './Piano';
import { AcousticPianoListener } from './AcousticPianoListener';
import { pianoPitchDetector } from '../lib/pitchDetector';
import { maestroVoice } from '../lib/speech';
import { TRIAD_DRILLS, INVERSION_DRILLS, type Drill } from '../lib/practiceLibrary';
import { cn } from '../lib/utils';
import * as Tone from 'tone';

type InversionGameMode = 'carousel' | 'identify' | 'mission' | 'voiceLeading';

const COMMON_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

interface InversionsGymProps {
  onScoreGain?: (points: number) => void;
}

export const InversionsGym: React.FC<InversionsGymProps> = ({ onScoreGain }) => {
  // Config
  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedQuality, setSelectedQuality] = useState<'Major' | 'Minor'>('Major');
  const [gameMode, setGameMode] = useState<InversionGameMode>('carousel');

  // Carousel mode state (0 = Fundamental, 1 = 1st Inv, 2 = 2nd Inv)
  const [carouselStep, setCarouselStep] = useState<0 | 1 | 2>(0);
  const [carouselCompleted, setCarouselCompleted] = useState(false);

  // Identify / Trivia mode state
  const [quizQuestion, setQuizQuestion] = useState<{
    root: string;
    quality: 'Major' | 'Minor';
    inversion: 0 | 1 | 2;
    keys: string[];
    bassNote: string;
  }>({
    root: 'C',
    quality: 'Major',
    inversion: 1,
    keys: ['E4', 'G4', 'C5'],
    bassNote: 'E4'
  });
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);

  // Mission mode state
  const [missionTarget, setMissionTarget] = useState<{
    root: string;
    quality: 'Major' | 'Minor';
    inversion: 0 | 1 | 2;
    requiredBass: string;
    keys: string[];
  }>({
    root: 'G',
    quality: 'Major',
    inversion: 1,
    requiredBass: 'B',
    keys: ['B3', 'D4', 'G4']
  });
  const [userPlayedNotes, setUserPlayedNotes] = useState<string[]>([]);
  const [missionFeedback, setMissionFeedback] = useState<string | null>(null);
  const [missionSuccess, setMissionSuccess] = useState(false);

  // Voice Leading mode state
  const [voiceLeadingChord, setVoiceLeadingChord] = useState<'C' | 'F' | 'G'>('C');

  // Audio Playback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Calculate current triad info for active root
  const currentTriad = calculateTriadInversion(selectedRoot, selectedQuality, carouselStep);
  const currentGuide = INVERSIONS_GUIDE[carouselStep];

  // Helper to generate a new quiz question
  const generateNewQuizQuestion = useCallback(() => {
    const r = COMMON_ROOTS[Math.floor(Math.random() * COMMON_ROOTS.length)];
    const q = (Math.random() > 0.5 ? 'Major' : 'Minor') as 'Major' | 'Minor';
    const inv = (Math.floor(Math.random() * 3)) as 0 | 1 | 2;
    const computed = calculateTriadInversion(r, q, inv);

    setQuizQuestion({
      root: r,
      quality: q,
      inversion: inv,
      keys: computed.keys,
      bassNote: computed.bassNote
    });
    setQuizAnswered(null);
  }, []);

  // Helper to generate a new mission
  const generateNewMission = useCallback(() => {
    const r = COMMON_ROOTS[Math.floor(Math.random() * COMMON_ROOTS.length)];
    const q = (Math.random() > 0.4 ? 'Major' : 'Minor') as 'Major' | 'Minor';
    const inv = (Math.floor(Math.random() * 3)) as 0 | 1 | 2;
    const computed = calculateTriadInversion(r, q, inv);

    setMissionTarget({
      root: r,
      quality: q,
      inversion: inv,
      requiredBass: computed.bassNote.replace(/\d/, ''),
      keys: computed.keys
    });
    setUserPlayedNotes([]);
    setMissionFeedback(null);
    setMissionSuccess(false);
  }, []);

  useEffect(() => {
    if (gameMode === 'identify') {
      generateNewQuizQuestion();
    } else if (gameMode === 'mission') {
      generateNewMission();
    }
  }, [gameMode, generateNewQuizQuestion, generateNewMission]);

  // Handle note play
  const handleNotePlay = useCallback((note: string) => {
    if (gameMode === 'carousel') {
      // In carousel mode, clicking notes adds them
      const newNotes = [...userPlayedNotes, note].slice(-3);
      setUserPlayedNotes(newNotes);

      const targetNames = currentTriad.keys.map(k => k.replace(/\d/, ''));
      const playedNames = newNotes.map(n => n.replace(/\d/, ''));
      const allPresent = targetNames.every(name => playedNames.includes(name));

      if (allPresent && newNotes.length === 3) {
        // Auto advance carousel
        if (carouselStep < 2) {
          setCarouselStep(prev => (prev + 1) as 0 | 1 | 2);
          setUserPlayedNotes([]);
        } else {
          setCarouselCompleted(true);
          if (onScoreGain) onScoreGain(150);
          maestroVoice.speak(`¡Excelente che! Recorriste el carrusel completo de ${selectedRoot} ${selectedQuality}.`);
        }
      }
    } else if (gameMode === 'mission') {
      const newNotes = [...userPlayedNotes, note].slice(-3);
      setUserPlayedNotes(newNotes);

      if (newNotes.length === 3) {
        const validation = validateTriadInversionSubmission(
          newNotes,
          missionTarget.keys,
          missionTarget.requiredBass
        );

        setMissionFeedback(validation.feedbackMessage);

        if (validation.isExactMatch) {
          setMissionSuccess(true);
          if (onScoreGain) onScoreGain(120);
          setTimeout(() => {
            generateNewMission();
          }, 1800);
        }
      }
    }
  }, [gameMode, userPlayedNotes, currentTriad, carouselStep, selectedRoot, selectedQuality, onScoreGain, missionTarget, generateNewMission]);

  // Subscribe to real-time acoustic microphone pitch detector
  useEffect(() => {
    const unsub = pianoPitchDetector.subscribeNoteOnset((info) => {
      handleNotePlay(info.note);
    });
    return unsub;
  }, [handleNotePlay]);

  // Play current chord audio
  const playCurrentChordSound = async (notesToPlay: string[]) => {
    await Tone.start();
    setIsPlayingAudio(true);
    const synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.02, decay: 0.5, sustain: 0.3, release: 1.2 }
    }).toDestination();

    synth.triggerAttackRelease(notesToPlay, '2n');
    setTimeout(() => {
      setIsPlayingAudio(false);
      synth.dispose();
    }, 1500);
  };

  const speakInversionTip = () => {
    const text = `${currentGuide.name} de ${selectedRoot} ${selectedQuality}. ${currentGuide.explanation} Acordate del truco visual: ${currentGuide.visualTrick}`;
    maestroVoice.speak(text);
  };

  return (
    <div className="space-y-8">
      {/* Header & Modes */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest text-ok">
              Gimnasio Lúdico de Tríadas e Inversiones
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mt-1">
            Inversiones y Conexión de Acordes
          </h2>
          <p className="text-xs text-ink-3 font-light max-w-xl mt-0.5">
            Domina las 3 caras de cada acorde para eliminar los saltos de mano y tocar con soltura profesional.
          </p>
        </div>

        {/* Game Mode Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-surface-2 p-1.5 rounded-2xl border border-line">
          {[
            { id: 'carousel', label: 'Carrusel 1-2-3', Icon: RotateCw },
            { id: 'identify', label: '¿Qué Inversión es?', Icon: Eye },
            { id: 'mission', label: 'Misión del Bajo', Icon: Target },
            { id: 'voiceLeading', label: 'Voice Leading', Icon: ArrowRightLeft },
          ].map(tab => {
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGameMode(tab.id as InversionGameMode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                  gameMode === tab.id
                    ? "bg-amber-400 text-black font-semibold shadow"
                    : "text-ink-2 hover:text-ink hover:bg-surface-2"
                )}
              >
                <TabIcon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real Acoustic Piano Microphone Analyzer */}
      <AcousticPianoListener
        currentTargetNotes={gameMode === 'carousel' ? currentTriad.keys : missionTarget.keys}
        exerciseName={gameMode === 'carousel' ? `Tríada ${selectedRoot} ${selectedQuality} (${currentTriad.chordName})` : `Misión del Bajo: ${missionTarget.root} ${missionTarget.quality}`}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODE 1: CARRUSEL DE INVERSIONES (LOOP CONSECUTIVO) */}
      {/* ------------------------------------------------------------- */}
      {gameMode === 'carousel' && (
        <div className="space-y-6">
          {/* Root & Quality Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass p-4 rounded-2xl border border-line space-y-2">
              <span className="text-xs font-mono text-ink-3">Acorde Raíz:</span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ROOTS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRoot(r);
                      setCarouselCompleted(false);
                      setUserPlayedNotes([]);
                    }}
                    className={cn(
                      "flex-1 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border",
                      selectedRoot === r
                        ? "bg-amber-400 text-black border-amber-300 shadow"
                        : "bg-surface-2 text-ink-2 border-line hover:bg-surface-3"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass p-4 rounded-2xl border border-line space-y-2">
              <span className="text-xs font-mono text-ink-3">Cualidad:</span>
              <div className="flex gap-2">
                {(['Major', 'Minor'] as const).map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setSelectedQuality(q);
                      setCarouselCompleted(false);
                      setUserPlayedNotes([]);
                    }}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all border",
                      selectedQuality === q
                        ? "bg-emerald-500 text-black border-emerald-400 shadow"
                        : "bg-surface-2 text-ink-2 border-line hover:bg-surface-3"
                    )}
                  >
                    {q === 'Major' ? 'Mayor (Alegre)' : 'Menor (Melancólico)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Carousel Step Selector Cards (3 Inversions side-by-side) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((stepIdx) => {
              const invInfo = INVERSIONS_GUIDE[stepIdx as 0 | 1 | 2];
              const triadData = calculateTriadInversion(selectedRoot, selectedQuality, stepIdx as 0 | 1 | 2);
              const isActive = carouselStep === stepIdx;

              return (
                <motion.div
                  key={stepIdx}
                  onClick={() => {
                    setCarouselStep(stepIdx as 0 | 1 | 2);
                    setUserPlayedNotes([]);
                  }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "cursor-pointer rounded-2xl p-5 border-2 transition-all space-y-3 font-mono relative overflow-hidden",
                    isActive
                      ? "bg-amber-400/15 border-amber-400 text-ink shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                      : "bg-surface-2 border-line text-ink-2 hover:border-line-strong"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold",
                      isActive ? "bg-amber-400 text-black" : "bg-surface-3 text-ink-3"
                    )}>
                      {stepIdx === 0 ? 'Fundamental' : `${stepIdx}ª Inversión`}
                    </span>
                    <span className="text-xs text-ink-3">{invInfo.figuredBassSymbol}</span>
                  </div>

                  <div className="text-xl font-bold font-serif text-ink">
                    {triadData.chordName}
                  </div>

                  {/* Notes display */}
                  <div className="flex items-center gap-1.5">
                    {triadData.keys.map((k, i) => (
                      <span 
                        key={i} 
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border",
                          i === 0 
                            ? "bg-emerald-500/20 text-ok border-emerald-500/40" 
                            : "bg-surface-3 text-ink border-line"
                        )}
                        title={i === 0 ? 'Bajo (Nota más grave)' : 'Voz superior'}
                      >
                        {k.replace(/\d/, '')}
                      </span>
                    ))}
                  </div>

                  <div className="text-[11px] text-ink-2 font-light leading-relaxed pt-1">
                    Bajo en: <strong className="text-ok">{invInfo.bassRole}</strong>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-ink-3 pt-1 border-t border-line">
                    <Hand size={11} className="text-brand-2" />
                    <span>Digitación: {invInfo.fingeringRightHand}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Dynamic Pedagogical Explanation & Visual Trick */}
          <div className="glass p-5 rounded-2xl border border-line bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-brand-2 uppercase px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/30">
                  {currentGuide.popularName}
                </span>
                <span className="text-xs text-ink-2">
                  Bajo: <strong className="text-ok">{currentTriad.bassNote.replace(/\d/, '')}</strong> ({currentGuide.bassRole})
                </span>
              </div>
              <p className="text-xs text-ink-2 font-light">
                {currentGuide.explanation}
              </p>
              <p className="text-xs text-brand-2/90 font-light italic flex items-center gap-1.5">
                <Eye size={13} className="text-brand-2 shrink-0" />
                <span><strong>Truco visual del Maestro:</strong> {currentGuide.visualTrick}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playCurrentChordSound(currentTriad.keys)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-surface-2 hover:bg-surface-3 text-ink-2 border border-line transition-all"
              >
                <Volume2 size={13} className="text-brand-2" />
                <span>Oír Acorde</span>
              </button>

              <button
                type="button"
                onClick={speakInversionTip}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-amber-400/10 hover:bg-amber-400/20 text-brand-2 border border-amber-400/30 transition-all"
              >
                <GraduationCap size={14} className="text-brand-2" />
                <span>Maestro Aurelio</span>
              </button>
            </div>
          </div>

          {/* Piano display */}
          <div className="glass p-6 rounded-3xl border border-line space-y-4">
            <div className="flex justify-between items-center text-xs font-mono text-ink-3">
              <span>Notas activas: {currentTriad.keys.join(' - ')}</span>
              <span>Bajo en Verde Esmeralda: {currentTriad.bassNote}</span>
            </div>

            <Piano
              activeNotes={currentTriad.keys}
              correctNotes={[currentTriad.bassNote]}
              onNotePlay={handleNotePlay}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 2: IDENTIFICAR LA INVERSIÓN (TRIVIA AUDITIVA & VISUAL) */}
      {/* ------------------------------------------------------------- */}
      {gameMode === 'identify' && (
        <div className="glass p-6 md:p-8 rounded-3xl border border-line space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-brand-2">
                Oído y Agudeza Visual
              </span>
              <h3 className="text-xl font-serif font-bold text-ink">
                ¿En qué inversión está este acorde de {quizQuestion.root} {quizQuestion.quality === 'Major' ? 'Mayor' : 'menor'}?
              </h3>
            </div>
            <div className="text-sm font-mono font-bold text-brand-2 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/30">
              Puntaje: {quizScore} PTS
            </div>
          </div>

          {/* Notes display */}
          <div className="flex justify-center items-center gap-3 py-4">
            {quizQuestion.keys.map((k, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-mono border-2 shadow-lg",
                  i === 0 
                    ? "bg-emerald-500/20 border-emerald-400 text-ok" 
                    : "bg-surface-3 border-line-strong text-ink"
                )}
              >
                <span className="text-2xl font-bold">{k.replace(/\d/, '')}</span>
                <span className="text-[9px] opacity-60">{i === 0 ? 'Bajo' : `oct ${k.slice(-1)}`}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => playCurrentChordSound(quizQuestion.keys)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs uppercase tracking-wider shadow"
            >
              <Volume2 size={15} />
              <span>Escuchar Acorde</span>
            </button>
          </div>

          {/* 3 Inversion Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[0, 1, 2].map(invIndex => {
              const isSelected = quizAnswered === invIndex;
              const isCorrect = quizQuestion.inversion === invIndex;

              return (
                <button
                  key={invIndex}
                  type="button"
                  disabled={quizAnswered !== null}
                  onClick={() => {
                    setQuizAnswered(invIndex);
                    if (invIndex === quizQuestion.inversion) {
                      setQuizScore(prev => prev + 100);
                      if (onScoreGain) onScoreGain(100);
                      maestroVoice.speak('¡Impecable che! Diste en el clavo con la inversión.');
                    } else {
                      maestroVoice.speak(`Casi che, fijate que el bajo es ${quizQuestion.bassNote.replace(/\d/, '')}.`);
                    }
                  }}
                  className={cn(
                    "p-4 rounded-2xl border-2 font-mono text-center transition-all",
                    quizAnswered !== null && isCorrect
                      ? "bg-emerald-500/20 border-emerald-400 text-ok shadow-md"
                      : isSelected && !isCorrect
                      ? "bg-red-500/20 border-red-400 text-red-300"
                      : "bg-surface-2 border-line text-ink hover:bg-surface-3"
                  )}
                >
                  <div className="text-sm font-bold">
                    {invIndex === 0 ? 'Posición Fundamental' : `${invIndex}ª Inversión`}
                  </div>
                  <div className="text-[10px] opacity-60 mt-1">
                    {invIndex === 0 ? 'Bajo = Raíz' : invIndex === 1 ? 'Bajo = 3ª (6)' : 'Bajo = 5ª (6/4)'}
                  </div>
                </button>
              );
            })}
          </div>

          {quizAnswered !== null && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-line">
              <div className="text-xs text-ink-2 flex items-center gap-1.5">
                <Lightbulb size={14} className="text-brand-2 shrink-0" />
                <span><strong>Explicación:</strong> {INVERSIONS_GUIDE[quizQuestion.inversion].visualTrick}</span>
              </div>
              <button
                type="button"
                onClick={generateNewQuizQuestion}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs uppercase tracking-wider"
              >
                Siguiente Acorde
              </button>
            </div>
          )}

          <div className="pt-2">
            <Piano activeNotes={quizQuestion.keys} correctNotes={[quizQuestion.bassNote]} />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 3: MISIÓN DEL BAJO (TOCAR LA INVERSIÓN SOLICITADA) */}
      {/* ------------------------------------------------------------- */}
      {gameMode === 'mission' && (
        <div className="glass p-6 md:p-8 rounded-3xl border border-line space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-brand-2">
                Misión Práctica en el Piano
              </span>
              <h3 className="text-2xl font-serif font-bold text-ink">
                Toca: {missionTarget.root} {missionTarget.quality === 'Major' ? 'Mayor' : 'menor'} en {missionTarget.inversion === 0 ? 'Posición Fundamental' : `${missionTarget.inversion}ª Inversión`}
              </h3>
            </div>
            <button
              type="button"
              onClick={generateNewMission}
              className="flex items-center gap-1.5 text-xs font-mono text-ink-3 hover:text-ink bg-surface-2 px-3 py-1.5 rounded-xl border border-line"
            >
              <RefreshCw size={12} />
              <span>Cambiar Misión</span>
            </button>
          </div>

          {/* Mission Requirement Card */}
          <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-brand-2 font-bold flex items-center gap-1.5">
                <AlertCircle size={14} className="text-brand-2 shrink-0" />
                <span>Requisito estricto del Maestro:</span>
              </div>
              <p className="text-xs text-ink-2 font-light">
                La nota más grave (el bajo) DEBE ser <strong>{missionTarget.requiredBass}</strong>.
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-black font-bold flex items-center justify-center font-mono">
              {missionTarget.requiredBass}
            </div>
          </div>

          {/* User Played Notes Status */}
          <div className="flex justify-center items-center gap-3 py-2">
            {Array.from({ length: 3 }).map((_, i) => {
              const note = userPlayedNotes[i];
              return (
                <div
                  key={i}
                  className={cn(
                    "w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-mono border-2 transition-all",
                    note
                      ? "bg-amber-400/20 border-amber-400 text-brand-2"
                      : "bg-surface-2 border-line text-ink/20"
                  )}
                >
                  <span className="text-xl font-bold">{note ? note.replace(/\d/, '') : '?'}</span>
                  <span className="text-[9px] opacity-60">{note ? `oct ${note.slice(-1)}` : `nota ${i + 1}`}</span>
                </div>
              );
            })}
          </div>

          {/* Feedback */}
          {missionFeedback && (
            <div className={cn(
              "p-3 rounded-2xl text-xs font-mono text-center border",
              missionSuccess
                ? "bg-emerald-500/20 border-emerald-400 text-ok"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            )}>
              {missionFeedback}
            </div>
          )}

          <div className="pt-2">
            <Piano
              activeNotes={userPlayedNotes}
              onNotePlay={handleNotePlay}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 4: VOICE LEADING (CONEXIÓN FLUIDA ENTRE ACORDES) */}
      {/* ------------------------------------------------------------- */}
      {gameMode === 'voiceLeading' && (
        <div className="glass p-6 md:p-8 rounded-3xl border border-line space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-ok">
              Conexión Armónica y Ergonomía
            </span>
            <h3 className="text-2xl font-serif font-bold text-ink">
              Voice Leading: ¿Por qué usamos inversiones?
            </h3>
            <p className="text-xs text-ink-2 font-light max-w-2xl">
              Si tocas Do Mayor (C4-E4-G4) y luego saltas toda la mano para tocar Fa Mayor (F4-A4-C5), suena brusco. En cambio, si tocas Fa Mayor en <strong>2ª inversión (C4-F4-A4)</strong>, ¡el Do queda inmóvil y los otros dos dedos apenas se mueven una tecla!
            </p>
          </div>

          {/* Voice Leading comparison buttons */}
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'C', name: 'Do Mayor (Fundamental)', notes: ['C4', 'E4', 'G4'] },
              { id: 'F', name: 'Fa Mayor (2ª Inversión - Suave)', notes: ['C4', 'F4', 'A4'] },
              { id: 'G', name: 'Sol Mayor (1ª Inversión - Suave)', notes: ['B3', 'D4', 'G4'] },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setVoiceLeadingChord(item.id as any);
                  playCurrentChordSound(item.notes);
                }}
                className={cn(
                  "flex-1 min-w-[200px] p-4 rounded-2xl border-2 font-mono text-left transition-all",
                  voiceLeadingChord === item.id
                    ? "bg-emerald-500/20 border-emerald-400 text-ok shadow-lg"
                    : "bg-surface-2 border-line text-ink-2 hover:bg-surface-3 hover:text-ink"
                )}
              >
                <div className="text-sm font-bold">{item.name}</div>
                <div className="text-xs text-ink-3 mt-1">Notas: {item.notes.join(' - ')}</div>
              </button>
            ))}
          </div>

          <div className="pt-2">
            <Piano
              activeNotes={
                voiceLeadingChord === 'C'
                  ? ['C4', 'E4', 'G4']
                  : voiceLeadingChord === 'F'
                  ? ['C4', 'F4', 'A4']
                  : ['B3', 'D4', 'G4']
              }
              onNotePlay={handleNotePlay}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TALLER: los ejercicios de fondo, siempre visibles              */}
      {/* ------------------------------------------------------------- */}
      <DrillWorkshop />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Taller de tríadas e inversiones                                    */
/* ------------------------------------------------------------------ */

const LEVEL_STYLE: Record<Drill['level'], string> = {
  Base: 'text-ok', Intermedio: 'text-brand-2', Avanzado: 'text-warn',
};

/** Cómo se siente cada calidad bajo la mano. Es lo que se usa al tocar. */
const TOUCH_TABLE: { name: string; shape: string; feel: string }[] = [
  { name: 'Mayor', shape: '4 + 3', feel: 'abierta abajo' },
  { name: 'Menor', shape: '3 + 4', feel: 'abierta arriba' },
  { name: 'Disminuida', shape: '3 + 3', feel: 'la más cerrada' },
  { name: 'Aumentada', shape: '4 + 4', feel: 'la más abierta y pareja' },
];

const DrillWorkshop: React.FC = () => {
  const [side, setSide] = useState<'triadas' | 'inversiones'>('triadas');
  const [open, setOpen] = useState<string | null>(TRIAD_DRILLS[0].id);
  const list = side === 'triadas' ? TRIAD_DRILLS : INVERSION_DRILLS;

  return (
    <section className="space-y-3 pt-2 border-t border-line">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell size={16} className="text-brand" />
          <h3 className="font-serif font-semibold text-[16px] text-ink">Taller</h3>
          <span className="text-[11.5px] text-ink-3">los ejercicios de fondo, en orden</span>
        </div>
        <div className="seg">
          <button type="button" data-active={side === 'triadas'} onClick={() => { setSide('triadas'); setOpen(TRIAD_DRILLS[0].id); }} className="seg-item">Tríadas</button>
          <button type="button" data-active={side === 'inversiones'} onClick={() => { setSide('inversiones'); setOpen(INVERSION_DRILLS[0].id); }} className="seg-item">Inversiones</button>
        </div>
      </div>

      {side === 'triadas' && (
        <div className="card p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <Hand size={14} className="text-brand" />
            <h4 className="text-[13.5px] font-medium text-ink">Reconocerlas al tacto</h4>
            <span className="text-[11.5px] text-ink-3">semitonos entre las notas, de abajo hacia arriba</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TOUCH_TABLE.map(t => (
              <div key={t.name} className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <div className="text-[12.5px] font-medium text-ink">{t.name}</div>
                <div className="font-mono text-[15px] text-brand-2 leading-tight">{t.shape}</div>
                <div className="text-[11px] text-ink-3 leading-snug">{t.feel}</div>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-ink-3 leading-snug">
            Las dos únicas tríadas con las dos terceras iguales son la disminuida y la aumentada. Si la mano se siente
            simétrica, es una de esas dos: ya descartaste la mitad sin contar nada.
          </p>
        </div>
      )}

      {list.map(d => {
        const isOpen = open === d.id;
        return (
          <div key={d.id} className={cn('card overflow-hidden transition-colors', isOpen && 'border-brand-line')}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : d.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors"
            >
              <ChevronRight size={14} className={cn('text-ink-3 shrink-0 transition-transform', isOpen && 'rotate-90')} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-ink">{d.title}</div>
                <div className="text-[11.5px] text-ink-3 truncate">{d.goal}</div>
              </div>
              <span className={cn('text-[10.5px] font-mono shrink-0', LEVEL_STYLE[d.level])}>{d.level}</span>
              <span className="hidden sm:inline text-[10.5px] font-mono text-ink-3 shrink-0">{d.dose}</span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <ol className="px-4 pb-4 pt-1 space-y-1.5 list-decimal list-inside text-[12.5px] text-ink-2 leading-relaxed marker:text-brand marker:font-mono">
                    {d.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="flex items-start gap-2 text-[11.5px] text-ink-3 leading-snug px-1">
        <Layers size={12} className="shrink-0 mt-0.5" />
        <span>
          El arpegio es la misma tríada desplegada: cuando estos ejercicios salgan cómodos, seguí en el Gimnasio de
          Arpegios con las mismas tónicas.
        </span>
      </div>
    </section>
  );
};
