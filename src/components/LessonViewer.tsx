import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, BookOpen, Volume2, Play, 
  Sparkles, Award, CheckCircle2, Lock, MessageSquare, Pause, Radio, Music2,
  Hand, Globe2, GraduationCap, PartyPopper, Check
} from 'lucide-react';
import { Lesson, LESSONS, UserProgress } from '../types';
import { Piano } from './Piano';
import { LessonEvaluationModal } from './LessonEvaluationModal';
import { InstructorChatModal } from './InstructorChatModal';
import { cn } from '../lib/utils';
import { maestroVoice } from '../lib/speech';
import { triggerCurriculumConfetti } from '../lib/celebration';
import { CurriculumProgressBar } from './CurriculumProgressBar';
import * as Tone from 'tone';

interface LessonViewerProps {
  lesson: Lesson;
  userProgress: UserProgress;
  onBack: () => void;
  onSelectLesson: (id: string) => void;
  onPassLesson: (lessonId: string, score: number) => void;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  userProgress,
  onBack,
  onSelectLesson,
  onPassLesson,
}) => {
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Natural Uruguayan Voice State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);

  // Auto-demonstration playback
  const [isDemonstrating, setIsDemonstrating] = useState(false);
  const [demonstrationActiveNote, setDemonstrationActiveNote] = useState<string | null>(null);

  const currentIndex = LESSONS.findIndex(l => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? LESSONS[currentIndex - 1] : null;
  const nextLesson = currentIndex < LESSONS.length - 1 ? LESSONS[currentIndex + 1] : null;

  const isCurrentPassed = userProgress.completedLessons.includes(lesson.id);
  const currentScore = userProgress.lessonScores[lesson.id];
  const isNextUnlocked = nextLesson ? userProgress.unlockedLessons.includes(nextLesson.id) : false;

  // Cleanup speech on unmount or lesson change
  useEffect(() => {
    maestroVoice.stop();
    setIsSpeaking(false);
    setIsVoiceLoading(false);
    setIsDemonstrating(false);
    setDemonstrationActiveNote(null);
  }, [lesson.id]);

  const toggleSpeech = async () => {
    if (isSpeaking || isVoiceLoading) {
      maestroVoice.stop();
      setIsSpeaking(false);
      setIsVoiceLoading(false);
      return;
    }

    setIsVoiceLoading(true);
    const speechText = `${lesson.title}. ${lesson.dictationScript}`;
    await maestroVoice.speak(speechText, {
      onStart: () => {
        setIsVoiceLoading(false);
        setIsSpeaking(true);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsVoiceLoading(false);
      },
      onError: () => {
        setIsSpeaking(false);
        setIsVoiceLoading(false);
      }
    });
  };

  // Demonstration playback: Virtual maestro plays the notes
  const playDemonstration = async () => {
    if (isDemonstrating) return;
    await Tone.start();
    setIsDemonstrating(true);

    const notes = lesson.demonstrationNotes.length > 0 ? lesson.demonstrationNotes : lesson.targetKeys;
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.01, decay: 1, sustain: 0.2, release: 1 }
    }).toDestination();

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      setDemonstrationActiveNote(note);
      synth.triggerAttackRelease(note, '4n');
      await new Promise(r => setTimeout(r, 650));
    }

    setDemonstrationActiveNote(null);
    setIsDemonstrating(false);
    synth.dispose();
  };

  const activeNotesForPiano = demonstrationActiveNote 
    ? [demonstrationActiveNote] 
    : (lesson.targetKeys || []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      {/* Top Breadcrumb Navigation & Visual Curriculum Progress Track */}
      <div className="space-y-3 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest"
          >
            <ChevronLeft size={16} /> Volver al Mapa Curricular
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {isCurrentPassed && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>Aprobada ({currentScore || 100} pts)</span>
                </span>
                <button
                  type="button"
                  onClick={() => triggerCurriculumConfetti('grand')}
                  className="px-2.5 py-1 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 text-[11px] font-mono font-bold flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                  title="Celebrar logro con lluvia de confeti"
                >
                  <PartyPopper size={12} className="text-amber-400" />
                  <span>Confeti</span>
                </button>
              </div>
            )}
            <span className="text-xs font-mono text-amber-400 font-semibold bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              {lesson.moduleTitle}
            </span>
            <span className="text-xs font-mono text-white/40">
              Lección {lesson.number} de {LESSONS.length}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar Track */}
        <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Tu Trayectoria:</span>
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
              <span>{userProgress.completedLessons.length} / {LESSONS.length} Aprobadas</span>
              <span className="text-white/40 text-[10px]">
                ({Math.round((userProgress.completedLessons.length / LESSONS.length) * 100)}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:max-w-md">
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10 relative">
              <motion.div
                initial={false}
                animate={{ width: `${Math.max((userProgress.completedLessons.length / LESSONS.length) * 100, 4)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              />
            </div>
          </div>

          {/* Quick jump pills */}
          <div className="hidden lg:flex items-center gap-1">
            {LESSONS.map((l) => {
              const isThis = l.id === lesson.id;
              const isDone = userProgress.completedLessons.includes(l.id);
              const isLock = !userProgress.unlockedLessons.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => !isLock && onSelectLesson(l.id)}
                  disabled={isLock}
                  title={`Lección ${l.number}: ${l.title}`}
                  className={cn(
                    "w-5 h-5 rounded-md text-[9px] font-mono font-bold flex items-center justify-center transition-all",
                    isThis
                      ? "bg-amber-400 text-black ring-2 ring-amber-400/50 scale-110"
                      : isDone
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/40"
                        : isLock
                          ? "bg-white/5 text-white/20 opacity-40 cursor-not-allowed"
                          : "bg-white/10 text-white/60 hover:text-white"
                  )}
                >
                  {isDone && !isThis ? <Check size={11} className="stroke-[3]" /> : l.number}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Virtual Instructor Classroom Command Center */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#12151f] to-[#0c0e14] border border-amber-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-lg">
                <GraduationCap size={28} className="text-black" />
              </div>
              <span className={cn(
                "absolute -bottom-1 -right-1 w-4 h-4 border-2 border-[#12151f] rounded-full",
                isSpeaking ? "bg-amber-400 animate-ping" : "bg-emerald-500 animate-pulse"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-white">Maestro Aurelio</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Globe2 size={11} className="text-amber-300" />
                  <span>Uruguay • Voz Rioplatense</span>
                </span>
                {isSpeaking && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                    Hablando...
                  </span>
                )}
              </div>
              <p className="text-xs text-white/70 font-light mt-0.5 max-w-md italic">
                "{lesson.dictationScript.slice(0, 115)}..."
              </p>
            </div>
          </div>

          {/* Instructor Interaction Tools */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={toggleSpeech}
              disabled={isVoiceLoading}
              className={cn(
                "flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow",
                isSpeaking
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : isVoiceLoading
                  ? "bg-amber-400/50 text-black cursor-wait"
                  : "bg-amber-400 hover:bg-amber-300 text-black"
              )}
            >
              {isSpeaking ? (
                <>
                  <Pause size={15} />
                  <span>Pausar Voz</span>
                </>
              ) : isVoiceLoading ? (
                <>
                  <Sparkles size={15} className="animate-spin text-black" />
                  <span>Cargando Voz...</span>
                </>
              ) : (
                <>
                  <Volume2 size={15} />
                  <span>Escuchar al Maestro</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={playDemonstration}
              disabled={isDemonstrating}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all disabled:opacity-50"
            >
              <Play size={14} className={isDemonstrating ? "text-amber-400 animate-spin" : "text-amber-400"} />
              <span>{isDemonstrating ? 'Demostrando...' : 'Demostrar en Piano'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-all"
              title="Preguntar una duda al Maestro IA"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">Consultar al Maestro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Classroom Layout: Theory (Left) & Mandatory Evaluation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Theory & Pedagogy (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {lesson.image && (
            <div className="relative aspect-video max-h-72 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <img 
                src={lesson.image} 
                alt={lesson.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-black/60 text-amber-300 border border-amber-400/30 backdrop-blur-md">
                  Nivel: {lesson.level}
                </span>
                <span className="text-xs font-mono text-white/70">
                  Progreso Global: {lesson.progressPercent}%
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
              {lesson.title}
            </h1>
            <p className="text-sm text-white/60 font-light leading-relaxed">
              {lesson.description}
            </p>
          </div>
          
          <div className="markdown-body prose prose-invert max-w-none text-white/80 leading-relaxed space-y-4">
            <Markdown>{lesson.content}</Markdown>
          </div>

          {/* Teacher Tip Card */}
          <div className="glass p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs font-mono uppercase tracking-wider">
              <Sparkles size={14} /> Regla de Oro del Maestro
            </div>
            <p className="text-xs text-white/70 font-light italic leading-relaxed">
              "En la música, la lentitud consciente es la madre de la velocidad futura. Nunca toques con tensión muscular: si sientes molestia en el antebrazo, respira, sacude las manos y vuelve a empezar a la mitad del tempo."
            </p>
          </div>
        </div>

        {/* Right Column: Mandatory Evaluation Gate (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Evaluation Status Card (Pass-Gate System) */}
          <div className={cn(
            "p-6 rounded-3xl border transition-all space-y-4 shadow-xl",
            isCurrentPassed
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-gradient-to-b from-amber-500/15 to-transparent border-amber-500/40"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isCurrentPassed ? (
                  <CheckCircle2 size={20} className="text-emerald-400" />
                ) : (
                  <Lock size={20} className="text-amber-400" />
                )}
                <span className="text-xs uppercase font-mono tracking-widest font-bold text-white">
                  {isCurrentPassed ? 'Lección Aprobada' : 'Evaluación Obligatoria'}
                </span>
              </div>

              {isCurrentPassed && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {currentScore || 100} / 100 PTS
                </span>
              )}
            </div>

            <p className="text-xs text-white/70 leading-relaxed font-light">
              {isCurrentPassed
                ? 'Has superado con éxito el examen teórico y la prueba técnica en el piano. ¡Puedes avanzar o rendirla de nuevo para perfeccionar tu puntuación!'
                : 'Para avanzar a la siguiente lección en el currículo de 0 a 100, debes rendir y aprobar el examen con el Maestro Aurelio (mínimo 80% requerido).'}
            </p>

            <button
              type="button"
              onClick={() => setIsEvaluationOpen(true)}
              className={cn(
                "w-full py-3.5 rounded-2xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all",
                isCurrentPassed
                  ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                  : "bg-amber-400 hover:bg-amber-300 text-black hover:scale-[1.02]"
              )}
            >
              <Award size={16} />
              <span>{isCurrentPassed ? 'Rendir Evaluación Nuevamente' : 'Rendir Evaluación Oficial'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Practical Laboratory Piano - Full Row Spanning Width */}
      <div className="w-full glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Music2 size={16} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-white/80 font-mono font-bold flex items-center gap-1.5">
                <span>Laboratorio de Práctica en Teclado</span>
              </div>
              <p className="text-[11px] text-white/50 font-light">
                {lesson.targetKeys && lesson.targetKeys.length > 0
                  ? "Las teclas doradas destacan las notas de esta lección con su digitación sugerida."
                  : "Toca libremente a lo largo de toda la fila para explorar la armonía y la técnica."}
              </p>
            </div>
          </div>
          {lesson.fingerGuide && (
            <span className="text-[10px] font-mono text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 self-start sm:self-auto flex items-center gap-1">
              <Hand size={12} className="text-amber-400" />
              <span>Digitación 1-5 Activa</span>
            </span>
          )}
        </div>

        <Piano
          activeNotes={activeNotesForPiano}
          fingerGuide={lesson.fingerGuide}
          compact={false}
        />
      </div>

          {/* Lesson Navigation Bottom Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {prevLesson ? (
              <button
                type="button"
                onClick={() => onSelectLesson(prevLesson.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass border border-white/10 text-xs font-mono text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft size={14} />
                <span>Lección {prevLesson.number}</span>
              </button>
            ) : <div />}

            {nextLesson && (
              <button
                type="button"
                onClick={() => {
                  if (isNextUnlocked) {
                    onSelectLesson(nextLesson.id);
                  } else {
                    setIsEvaluationOpen(true);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all",
                  isNextUnlocked
                    ? "bg-amber-400 hover:bg-amber-300 text-black shadow"
                    : "bg-white/5 border border-white/10 text-white/40 hover:text-white/70"
                )}
              >
                {!isNextUnlocked && <Lock size={12} />}
                <span>Siguiente: Lección {nextLesson.number}</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

      {/* Modals */}
      <LessonEvaluationModal
        lesson={lesson}
        isOpen={isEvaluationOpen}
        onClose={() => setIsEvaluationOpen(false)}
        onPassLesson={onPassLesson}
        userProgress={userProgress}
      />

      <InstructorChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentLesson={lesson}
        userLevel={userProgress.userLevel}
      />
    </motion.div>
  );
};
