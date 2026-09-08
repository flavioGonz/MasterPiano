import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Volume2, Play, Sparkles, Award, CheckCircle2, Lock,
  MessageSquare, Pause, Music2, Hand, Flame, Check, Loader2, PartyPopper, Bot, Dumbbell,
} from 'lucide-react';
import { Lesson, LessonPractice, LESSONS, UserProgress } from '../types';
import { Piano } from './Piano';
import { LessonEvaluationModal } from './LessonEvaluationModal';
import { LESSON_BODIES } from '../data/lessonContent';
import { InstructorChatModal } from './InstructorChatModal';
import { WaterfallDemoModal } from './WaterfallDemoModal';
import { LessonVideo } from './LessonVideo';
import { buildWaterfallFromNotesList } from '../lib/midiWaterfall';
import { cn } from '../lib/utils';
import { maestroVoice } from '../lib/speech';
import { triggerCurriculumConfetti } from '../lib/celebration';
import * as Tone from 'tone';

interface LessonViewerProps {
  lesson: Lesson;
  userProgress: UserProgress;
  onBack: () => void;
  onSelectLesson: (id: string) => void;
  onPassLesson: (lessonId: string, score: number) => void;
  /** Lleva al gimnasio donde se entrena lo que enseña la lección. */
  onGoToGym?: (gym: LessonPractice['gym']) => void;
}

const FINGER_NAMES: Record<number, string> = { 1: 'pulgar', 2: 'índice', 3: 'mayor', 4: 'anular', 5: 'meñique' };

/**
 * Vista de una lección: barra de contexto, encabezado con la acción principal
 * (rendir evaluación), tira del Maestro Aurelio, teoría a la izquierda y panel
 * lateral fijo (evaluación, notas de la lección, navegación), laboratorio de
 * teclado a lo ancho.
 */
export const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson, userProgress, onBack, onSelectLesson, onPassLesson, onGoToGym,
}) => {
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isWaterfallModalOpen, setIsWaterfallModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isDemonstrating, setIsDemonstrating] = useState(false);
  const [demonstrationActiveNote, setDemonstrationActiveNote] = useState<string | null>(null);
  const [imageOk, setImageOk] = useState(true);

  /* El texto, el dictado y la evaluación viajan aparte de la lista de
     lecciones: pesan y sólo hacen falta acá. Este componente ya es diferido,
     así que la importación estática los deja en su propio trozo. */
  const body = LESSON_BODIES[lesson.id];
  const dictationScript = body?.dictationScript ?? '';

  const currentIndex = LESSONS.findIndex(l => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? LESSONS[currentIndex - 1] : null;
  const nextLesson = currentIndex < LESSONS.length - 1 ? LESSONS[currentIndex + 1] : null;
  const isCurrentPassed = userProgress.completedLessons.includes(lesson.id);
  const currentScore = userProgress.lessonScores[lesson.id];
  const isNextUnlocked = nextLesson ? userProgress.unlockedLessons.includes(nextLesson.id) : false;
  const completedCount = userProgress.completedLessons.length;

  useEffect(() => {
    maestroVoice.stop();
    setIsSpeaking(false); setIsVoiceLoading(false);
    setIsDemonstrating(false); setDemonstrationActiveNote(null);
    setImageOk(true);
    window.scrollTo({ top: 0 });
  }, [lesson.id]);

  const toggleSpeech = async () => {
    if (isSpeaking || isVoiceLoading) {
      maestroVoice.stop(); setIsSpeaking(false); setIsVoiceLoading(false); return;
    }
    setIsVoiceLoading(true);
    await maestroVoice.speak(`${lesson.title}. ${dictationScript}`, {
      onStart: () => { setIsVoiceLoading(false); setIsSpeaking(true); },
      onEnd: () => { setIsSpeaking(false); setIsVoiceLoading(false); },
      onError: () => { setIsSpeaking(false); setIsVoiceLoading(false); },
    });
  };

  const playDemonstration = async () => {
    if (isDemonstrating) return;
    await Tone.start();
    setIsDemonstrating(true);
    const notes = lesson.demonstrationNotes.length > 0 ? lesson.demonstrationNotes : lesson.targetKeys;
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.01, decay: 1, sustain: 0.2, release: 1 },
    }).toDestination();
    for (const note of notes) {
      setDemonstrationActiveNote(note);
      synth.triggerAttackRelease(note, '4n');
      await new Promise(r => setTimeout(r, 650));
    }
    setDemonstrationActiveNote(null);
    setIsDemonstrating(false);
    synth.dispose();
  };

  const activeNotesForPiano = demonstrationActiveNote ? [demonstrationActiveNote] : (lesson.targetKeys || []);
  const hasKeys = lesson.targetKeys && lesson.targetKeys.length > 0;

  const goNext = () => {
    if (!nextLesson) return;
    if (isNextUnlocked) onSelectLesson(nextLesson.id);
    else setIsEvaluationOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      {/* ---- Barra de contexto ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={onBack} className="btn btn-ghost btn-sm -ml-2">
            <ChevronLeft size={15} /> Currículo
          </button>
          <span className="text-ink-3 text-xs hidden sm:inline">/</span>
          <span className="text-xs text-ink-2 truncate">
            <span className="font-mono">Módulo {lesson.moduleNumber}</span> · Lección {lesson.number} de {LESSONS.length}
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {isCurrentPassed ? (
            <>
              <span className="badge badge-ok shrink-0"><CheckCircle2 size={11} /> Aprobada · {currentScore ?? 100} pts</span>
              <button type="button" onClick={() => triggerCurriculumConfetti('grand')} className="btn btn-ghost btn-icon text-brand-2" data-tip="Celebrar" aria-label="Celebrar">
                <PartyPopper size={14} />
              </button>
            </>
          ) : (
            <span className="badge badge-neutral shrink-0"><Lock size={10} /> Evaluación pendiente</span>
          )}

          {/* Mapa rápido de lecciones. Con 45 no entra de una: scrollea. */}
          <div className="hidden lg:flex items-center gap-1 ml-2 pl-3 border-l border-line min-w-0 overflow-x-auto no-scrollbar">
            {LESSONS.map(l => {
              const isThis = l.id === lesson.id;
              const isDone = userProgress.completedLessons.includes(l.id);
              const isLock = !userProgress.unlockedLessons.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={isLock}
                  onClick={() => onSelectLesson(l.id)}
                  title={`Lección ${l.number}: ${l.title}`}
                  className={cn(
                    'w-6 h-6 shrink-0 rounded-md text-[10px] font-mono font-semibold flex items-center justify-center border transition-colors',
                    isThis ? 'bg-brand text-brand-ink border-brand'
                      : isDone ? 'bg-ok-soft border-ok/30 text-ok hover:border-ok/60'
                        : isLock ? 'border-line text-ink-3/50 cursor-not-allowed'
                          : 'bg-surface-2 border-line text-ink-2 hover:text-ink hover:border-line-strong'
                  )}
                >
                  {isDone && !isThis ? <Check size={11} className="stroke-[3]" /> : l.number}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Encabezado ---- */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="space-y-2 max-w-3xl">
          <div className="eyebrow">{lesson.moduleTitle} · Nivel {lesson.level}</div>
          <h1 className="font-serif font-semibold text-[28px] md:text-[34px] leading-[1.15] text-ink">{lesson.title}</h1>
          <p className="text-[15px] text-ink-2 leading-relaxed">{lesson.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onClick={() => setIsEvaluationOpen(true)} className={cn('btn', isCurrentPassed ? 'btn-secondary' : 'btn-primary')}>
            <Award size={16} /> {isCurrentPassed ? 'Rendir de nuevo' : 'Rendir evaluación'}
          </button>
          {nextLesson && (
            <button type="button" onClick={goNext} className={cn('btn', isNextUnlocked ? 'btn-primary' : 'btn-secondary')} data-tip={isNextUnlocked ? undefined : 'Aprobá la evaluación para desbloquearla'}>
              {isNextUnlocked ? 'Siguiente lección' : <><Lock size={13} /> Siguiente</>} <ChevronRight size={15} />
            </button>
          )}
        </div>
      </header>

      {/* ---- Maestro Aurelio ---- */}
      <section className="card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-brand text-brand-ink flex items-center justify-center">
              <Bot size={22} />
            </div>
            <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface', isSpeaking ? 'bg-brand animate-pulse' : 'bg-ok')} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink">Maestro Aurelio</span>
              <span className="text-[11px] text-ink-3">Voz rioplatense</span>
              {isSpeaking && <span className="badge badge-brand">Hablando…</span>}
            </div>
            <p className="text-[13px] text-ink-2 italic leading-relaxed mt-0.5 line-clamp-2">“{dictationScript}”</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onClick={toggleSpeech} disabled={isVoiceLoading} className={cn('btn btn-sm', isSpeaking ? 'btn-secondary text-danger' : 'btn-primary')}>
            {isVoiceLoading ? <Loader2 size={14} className="animate-spin" /> : isSpeaking ? <Pause size={14} /> : <Volume2 size={14} />}
            {isVoiceLoading ? 'Cargando voz…' : isSpeaking ? 'Pausar' : 'Escuchar al Maestro'}
          </button>
          <button type="button" onClick={playDemonstration} disabled={isDemonstrating} className="btn btn-secondary btn-sm">
            {isDemonstrating ? <Loader2 size={14} className="animate-spin text-brand" /> : <Play size={14} className="text-brand fill-current" />}
            {isDemonstrating ? 'Demostrando…' : 'Demostrar'}
          </button>
          {hasKeys && (
            <button type="button" id="btn-lesson-waterfall-demo" onClick={() => setIsWaterfallModalOpen(true)} className="btn btn-secondary btn-sm">
              <Flame size={14} className="text-orange-400" /> Catarata
            </button>
          )}
          <button type="button" onClick={() => setIsChatOpen(true)} className="btn btn-ghost btn-sm" data-tip="Preguntarle una duda al Maestro">
            <MessageSquare size={14} /> <span className="hidden sm:inline">Consultar</span>
          </button>
        </div>
      </section>

      {/* ---- Cuerpo ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Teoría */}
        <article className="lg:col-span-8 min-w-0 space-y-6">
          {/* Antes acá había una foto de archivo que no enseñaba nada. Ahora va
              un video de la lección; la foto queda solo de reserva. */}
          {lesson.videoQuery ? (
            <LessonVideo lessonId={lesson.id} query={lesson.videoQuery} title={lesson.title} pinnedId={lesson.videoId} />
          ) : lesson.image && imageOk ? (
            <div className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-line bg-surface-2">
              <img
                src={lesson.image}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImageOk(false)}
              />
            </div>
          ) : null}

          <div className="markdown-body">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Las tablas de digitaciones son anchas: que scrolleen ellas, no la página
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto -mx-1 px-1">
                    <table {...props} />
                  </div>
                ),
              }}
            >{body?.content ?? ''}</Markdown>
          </div>

          <aside className="card-2 p-4 flex gap-3 border-brand-line/60">
            <Sparkles size={16} className="text-brand shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-brand-2 mb-1">Regla de oro del Maestro</div>
              <p className="text-[13px] text-ink-2 italic leading-relaxed">
                “En la música, la lentitud consciente es la madre de la velocidad futura. Nunca toques con tensión muscular: si sentís molestia en el antebrazo, respirá, sacudí las manos y volvé a empezar a la mitad del tempo.”
              </p>
            </div>
          </aside>
        </article>

        {/* Panel lateral */}
        <aside className="lg:col-span-4 min-w-0 space-y-4 lg:sticky lg:top-20">
          {/* Entrenamiento: lleva al gimnasio donde se practica esta lección */}
          {lesson.practice && onGoToGym && (
            <div className="card p-5 space-y-3 border-brand-line/60">
              <div className="text-sm font-semibold text-ink flex items-center gap-2">
                <Dumbbell size={15} className="text-brand" /> Entrenar esta lección
              </div>
              <p className="text-[13px] text-ink-2 leading-relaxed">{lesson.practice.hint}.</p>
              <button
                type="button"
                onClick={() => onGoToGym(lesson.practice!.gym)}
                className="btn btn-secondary w-full"
              >
                {lesson.practice.label} <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Evaluación */}
          <div className={cn('card p-5 space-y-3', isCurrentPassed ? 'border-ok/30' : 'border-brand-line')}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                {isCurrentPassed ? <CheckCircle2 size={17} className="text-ok" /> : <Lock size={16} className="text-brand" />}
                {isCurrentPassed ? 'Lección aprobada' : 'Evaluación obligatoria'}
              </div>
              {isCurrentPassed && <span className="font-mono text-sm font-semibold text-ok tabular-nums">{currentScore ?? 100}/100</span>}
            </div>
            <p className="text-[13px] text-ink-2 leading-relaxed">
              {isCurrentPassed
                ? 'Superaste el examen teórico y la prueba técnica. Podés avanzar o rendirla de nuevo para mejorar el puntaje.'
                : 'Para desbloquear la siguiente lección tenés que aprobar el examen con el Maestro Aurelio (mínimo 80 %).'}
            </p>
            <button type="button" onClick={() => setIsEvaluationOpen(true)} className={cn('btn w-full', isCurrentPassed ? 'btn-secondary' : 'btn-primary')}>
              <Award size={15} /> {isCurrentPassed ? 'Rendir de nuevo' : 'Rendir evaluación'}
            </button>
            <div className="text-[11px] text-ink-3 text-center">
              {completedCount} de {LESSONS.length} lecciones aprobadas en tu trayectoria
            </div>
          </div>

          {/* Notas de la lección */}
          {hasKeys && (
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-ink flex items-center gap-2"><Music2 size={15} className="text-brand" /> Notas de la lección</div>
                {lesson.fingerGuide && <span className="badge badge-brand"><Hand size={10} /> Digitación</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lesson.targetKeys.map(k => {
                  const finger = lesson.fingerGuide?.[k];
                  return (
                    <span key={k} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 font-mono text-xs text-ink" title={finger ? `Dedo ${finger} (${FINGER_NAMES[finger] ?? ''})` : undefined}>
                      {k}
                      {finger && <span className="w-4 h-4 rounded-full bg-brand text-brand-ink text-[10px] font-bold flex items-center justify-center">{finger}</span>}
                    </span>
                  );
                })}
              </div>
              {lesson.fingerGuide && (
                <p className="text-[11px] text-ink-3">1 pulgar · 2 índice · 3 mayor · 4 anular · 5 meñique</p>
              )}
            </div>
          )}

          {/* Navegación */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!prevLesson} onClick={() => prevLesson && onSelectLesson(prevLesson.id)} className="btn btn-secondary btn-sm justify-start disabled:opacity-40">
              <ChevronLeft size={14} /> {prevLesson ? `Lección ${prevLesson.number}` : 'Primera'}
            </button>
            <button type="button" disabled={!nextLesson} onClick={goNext} className="btn btn-secondary btn-sm justify-end disabled:opacity-40">
              {nextLesson ? (isNextUnlocked ? `Lección ${nextLesson.number}` : <><Lock size={12} /> Lección {nextLesson.number}</>) : 'Última'} <ChevronRight size={14} />
            </button>
          </div>
        </aside>
      </div>

      {/* ---- Laboratorio de teclado ---- */}
      <section className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink flex items-center gap-2"><Music2 size={15} className="text-brand" /> Laboratorio de teclado</div>
            <p className="text-[12.5px] text-ink-2 mt-0.5">
              {hasKeys ? 'Las teclas doradas son las notas de esta lección, con la digitación sugerida.' : 'Tocá libremente para explorar la armonía y la técnica.'}
            </p>
          </div>
          {demonstrationActiveNote && <span className="badge badge-brand font-mono shrink-0">Sonando {demonstrationActiveNote}</span>}
        </div>
        <Piano activeNotes={activeNotesForPiano} fingerGuide={lesson.fingerGuide} compact={false} />
      </section>

      {/* ---- Pie: anterior / siguiente ---- */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-line">
        {prevLesson ? (
          <button type="button" onClick={() => onSelectLesson(prevLesson.id)} className="btn btn-ghost min-w-0 max-w-[48%]">
            <ChevronLeft size={15} className="shrink-0" />
            <span className="hidden sm:inline shrink-0">Anterior:</span>
            <span className="truncate">{prevLesson.title}</span>
          </button>
        ) : <div />}
        {nextLesson && (
          <button type="button" onClick={goNext} className={cn('btn text-right min-w-0 max-w-[48%]', isNextUnlocked ? 'btn-primary' : 'btn-secondary')}>
            {!isNextUnlocked && <Lock size={13} className="shrink-0" />}
            <span className="hidden sm:inline shrink-0">Siguiente:</span>
            <span className="truncate">{nextLesson.title}</span>
            <ChevronRight size={15} className="shrink-0" />
          </button>
        )}
      </div>

      {/* ---- Modales ---- */}
      <LessonEvaluationModal lesson={lesson} evaluation={body?.evaluation} isOpen={isEvaluationOpen} onClose={() => setIsEvaluationOpen(false)} onPassLesson={onPassLesson} userProgress={userProgress} />
      <InstructorChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} currentLesson={lesson} userLevel={userProgress.userLevel} />
      {isWaterfallModalOpen && hasKeys && (
        <WaterfallDemoModal
          isOpen={isWaterfallModalOpen}
          onClose={() => setIsWaterfallModalOpen(false)}
          title={`Lección ${lesson.number}: ${lesson.title}`}
          subtitle={`${lesson.moduleTitle} · Nivel ${lesson.level}`}
          composer="Método Pianístico Conservatorio"
          bpm={80}
          notes={buildWaterfallFromNotesList(lesson.targetKeys, lesson.fingerGuide, 80)}
        />
      )}
    </motion.div>
  );
};
