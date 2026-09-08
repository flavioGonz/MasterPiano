import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, XCircle, ArrowRight, RotateCcw, Award, Sparkles, BookOpen, Music,
  GraduationCap, Clock, X, PartyPopper, Hand, Target, Loader2, ChevronLeft,
} from 'lucide-react';
import { Lesson, UserProgress } from '../types';
import { Piano } from './Piano';
import { cn } from '../lib/utils';
import { triggerCurriculumConfetti } from '../lib/celebration';
import { CurriculumProgressBar } from './CurriculumProgressBar';

interface LessonEvaluationModalProps {
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onPassLesson: (lessonId: string, score: number) => void;
  userProgress?: UserProgress;
}

export const LessonEvaluationModal: React.FC<LessonEvaluationModalProps> = ({
  lesson,
  isOpen,
  onClose,
  onPassLesson,
  userProgress,
}) => {
  const [stage, setStage] = useState<'intro' | 'theory' | 'practical' | 'results'>('intro');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [theoryAnswers, setTheoryAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);

  // Practical stage states
  const [userPlayedNotes, setUserPlayedNotes] = useState<string[]>([]);
  const [practicalSuccess, setPracticalSuccess] = useState(false);
  const [practicalAttempts, setPracticalAttempts] = useState(0);

  // Result feedback from Maestro
  const [maestroFeedback, setMaestroFeedback] = useState<string>('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  const evaluation = lesson.evaluation;
  const questions = evaluation.theoreticalQuestions;
  const practical = evaluation.practicalTask;

  // Reset when opening a new lesson evaluation
  useEffect(() => {
    if (isOpen) {
      setStage('intro');
      setCurrentQuestionIdx(0);
      setTheoryAnswers([]);
      setSelectedOption(null);
      setHasAnsweredCurrent(false);
      setUserPlayedNotes([]);
      setPracticalSuccess(false);
      setPracticalAttempts(0);
      setMaestroFeedback('');
    }
  }, [isOpen, lesson.id]);

  const handleSelectOption = (index: number) => {
    if (hasAnsweredCurrent) return;
    setSelectedOption(index);
    setHasAnsweredCurrent(true);
    setTheoryAnswers(prev => [...prev, index]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setHasAnsweredCurrent(false);
    } else {
      // Proceed to practical exam
      setStage('practical');
      setUserPlayedNotes([]);
      setPracticalSuccess(false);
    }
  };

  const handlePracticalNotePlay = (note: string) => {
    if (practicalSuccess) return;

    const nextNotes = [...userPlayedNotes, note];
    setUserPlayedNotes(nextNotes);

    if (practical.mode === 'sequence') {
      // Check if user played sequence in order
      const targetSeq = practical.requiredSequence;
      // Compare the last N notes where N is target length
      const recentSegment = nextNotes.slice(-targetSeq.length);
      const isMatch = targetSeq.every((expected, i) => recentSegment[i] === expected);

      if (isMatch) {
        setPracticalSuccess(true);
      }
    } else {
      // Chord mode (needs all required notes in the recent notes)
      const targetKeys = practical.requiredSequence;
      const recentSegment = nextNotes.slice(-targetKeys.length * 2);
      const containsAll = targetKeys.every(k => recentSegment.includes(k));
      if (containsAll) {
        setPracticalSuccess(true);
      }
    }
  };

  const calculateFinalScore = (): number => {
    let score = 0;
    // Theory weight: 50%
    const correctTheoryCount = theoryAnswers.filter(
      (ans, i) => ans === questions[i]?.correctIndex
    ).length;
    const theoryScore = (correctTheoryCount / questions.length) * 50;

    // Practical weight: 50%
    const practicalScore = practicalSuccess ? 50 : 0;
    score = Math.round(theoryScore + practicalScore);
    return score;
  };

  const handleFinishEvaluation = async () => {
    const finalScore = calculateFinalScore();
    const passed = finalScore >= 80;

    setStage('results');
    setIsLoadingFeedback(true);

    if (passed) {
      onPassLesson(lesson.id, finalScore);
      triggerCurriculumConfetti('grand');
    }

    try {
      const res = await fetch('/api/instructor/evaluate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lesson.title,
          score: finalScore,
          passed,
          errors: theoryAnswers.map((ans, i) => ({
            question: questions[i].question,
            correct: ans === questions[i].correctIndex,
          })),
          userNotes: userPlayedNotes,
          expectedNotes: practical.requiredSequence,
        }),
      });
      const data = await res.json();
      setMaestroFeedback(data.feedback);
    } catch {
      setMaestroFeedback(
        passed
          ? '¡Excelente trabajo! Has demostrado comprensión y destreza en el teclado. Avanza con confianza.'
          : 'El camino del piano requiere paciencia y repetición consciente. Repasa la lección y vuelve a intentarlo.'
      );
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  if (!isOpen) return null;

  const currentQ = questions[currentQuestionIdx];
  const finalScore = calculateFinalScore();
  const passed = finalScore >= 80;
  const correctSoFar = theoryAnswers.filter((a, i) => a === questions[i]?.correctIndex).length;

  /* Progreso de la evaluación entera, para la barra del encabezado. La
     teoría vale la primera mitad y la práctica la segunda, igual que el
     puntaje: la barra y la nota cuentan la misma historia. */
  const stageProgress =
    stage === 'intro' ? 0
      : stage === 'theory' ? ((currentQuestionIdx + (hasAnsweredCurrent ? 1 : 0)) / questions.length) * 50
      : stage === 'practical' ? 50 + (practicalSuccess ? 50 : 0)
      : 100;

  const STEPS = [
    { id: 'theory', label: 'Teoría', Icon: BookOpen },
    { id: 'practical', label: 'Teclado', Icon: Music },
    { id: 'results', label: 'Resultado', Icon: Award },
  ] as const;
  const stepIndex = stage === 'intro' ? -1 : STEPS.findIndex(x => x.id === stage);
  /* Un paso se marca hecho solo si de verdad se completó: saltearse la prueba
     de teclado no puede aparecer como aprobada. */
  const stepDone = (i: number) => {
    if (i >= stepIndex) return false;
    if (STEPS[i].id === 'practical') return practicalSuccess;
    return true;
  };

  const playedTarget = (note: string) => userPlayedNotes.includes(note);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-bg text-ink flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Evaluación de ${lesson.title}`}
    >
      {/* Fondo: un halo dorado que respira. Da profundidad sin robar atención. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[130vw] h-[130vw] max-w-[1400px] max-h-[1400px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--color-brand-soft) 0%, transparent 62%)' }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.85, 0.6] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ============ Encabezado ============ */}
      <header className="relative shrink-0 border-b border-line bg-surface/70 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-brand-soft border border-brand-line flex items-center justify-center text-brand shrink-0">
            <Award size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="eyebrow">Evaluación oficial</div>
            <h2 className="font-serif font-semibold text-[15px] sm:text-[17px] text-ink leading-tight truncate">
              {lesson.title}
            </h2>
          </div>

          {/* Pasos: en pantalla ancha con nombre, en el teléfono solo los puntos */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            {STEPS.map((st, i) => (
              <div
                key={st.id}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-colors',
                  stepDone(i) ? 'border-ok/30 bg-ok-soft text-ok'
                    : i === stepIndex ? 'border-brand-line bg-brand-soft text-brand-2'
                    : 'border-line text-ink-3'
                )}
              >
                {stepDone(i) ? <CheckCircle2 size={12} /> : <st.Icon size={12} />} {st.label}
              </div>
            ))}
          </div>
          <div className="flex md:hidden items-center gap-1 shrink-0">
            {STEPS.map((st, i) => (
              <span key={st.id} className={cn('w-1.5 h-1.5 rounded-full transition-colors',
                stepDone(i) ? 'bg-ok' : i === stepIndex ? 'bg-brand' : 'bg-line-strong')} />
            ))}
          </div>

          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm shrink-0" aria-label="Cerrar la evaluación">
            <X size={15} /> <span className="hidden sm:inline">Cerrar</span>
          </button>
        </div>
        <div className="h-[3px] bg-surface-2">
          <motion.div
            className="h-full bg-brand"
            initial={false}
            animate={{ width: `${stageProgress}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </header>

      {/* ============ Cuerpo ============ */}
      <div className="relative flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ---------- Portada ---------- */}
          {stage === 'intro' && (
            <motion.section
              key="intro"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="min-h-full flex items-center justify-center px-5 py-10"
            >
              <div className="w-full max-w-2xl text-center space-y-8">
                {/* Medalla con anillos que laten */}
                <div className="relative w-28 h-28 mx-auto">
                  {[0, 1].map(i => (
                    <motion.span
                      key={i}
                      className="absolute inset-0 rounded-full border border-brand-line"
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 2.6, repeat: Infinity, delay: i * 1.3, ease: 'easeOut' }}
                    />
                  ))}
                  <motion.div
                    initial={{ scale: 0.7, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 160, damping: 12 }}
                    className="absolute inset-0 rounded-full bg-brand text-brand-ink flex items-center justify-center shadow-[var(--shadow-glow)]"
                  >
                    <Award size={46} />
                  </motion.div>
                </div>

                <div className="space-y-3">
                  <div className="eyebrow">Módulo {lesson.moduleNumber} · Lección {lesson.number}</div>
                  <h1 className="font-serif font-semibold text-[30px] sm:text-[38px] leading-[1.15] text-ink">
                    {lesson.title.replace(/^\d+\.\s*/, '')}
                  </h1>
                  <p className="text-[15px] text-ink-2 leading-relaxed max-w-xl mx-auto">
                    {lesson.description}
                  </p>
                </div>

                {/* Qué te espera */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {[
                    { Icon: BookOpen, t: `${questions.length} ${questions.length === 1 ? 'pregunta' : 'preguntas'}`, d: 'Teoría de la lección' },
                    { Icon: Hand, t: 'Prueba al teclado', d: practical.mode === 'chord' ? 'Un acorde completo' : 'Una secuencia en orden' },
                    { Icon: Target, t: '80 de 100', d: 'Para desbloquear la siguiente' },
                  ].map(({ Icon, t, d }, i) => (
                    <motion.div
                      key={t}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="card p-4 space-y-1"
                    >
                      <Icon size={16} className="text-brand" />
                      <div className="text-[13.5px] font-semibold text-ink">{t}</div>
                      <div className="text-[12px] text-ink-3 leading-snug">{d}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStage('theory')}
                    className="btn btn-primary text-[15px] px-8 py-3.5"
                  >
                    <Sparkles size={17} /> Comenzar la evaluación
                  </button>
                  <p className="text-[12px] text-ink-3">
                    La teoría y el teclado valen la mitad cada uno. Podés repetirla las veces que quieras.
                  </p>
                </div>
              </div>
            </motion.section>
          )}

          {/* ---------- Teoría ---------- */}
          {stage === 'theory' && (
            <motion.section
              key={`q-${currentQuestionIdx}`}
              initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.25 }}
              className="min-h-full flex items-center justify-center px-5 py-10"
            >
              <div className="w-full max-w-3xl space-y-7">
                <div className="flex items-center justify-between gap-4">
                  <div className="eyebrow">Pregunta {currentQuestionIdx + 1} de {questions.length}</div>
                  <div className="flex items-center gap-1.5">
                    {questions.map((_, i) => (
                      <span key={i} className={cn('h-1.5 rounded-full transition-all',
                        i < currentQuestionIdx ? 'w-6 bg-ok'
                          : i === currentQuestionIdx ? 'w-10 bg-brand'
                          : 'w-6 bg-line-strong')} />
                    ))}
                  </div>
                </div>

                <h2 className="font-serif font-semibold text-[24px] sm:text-[30px] leading-snug text-ink">
                  {currentQ.question}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentQ.options.map((opt, i) => {
                    const isCorrect = i === currentQ.correctIndex;
                    const isPicked = selectedOption === i;
                    return (
                      <motion.button
                        key={i}
                        type="button"
                        onClick={() => handleSelectOption(i)}
                        disabled={hasAnsweredCurrent}
                        whileHover={!hasAnsweredCurrent ? { y: -2 } : undefined}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          'group flex items-start gap-3 text-left rounded-2xl border p-4 transition-colors min-h-[70px]',
                          !hasAnsweredCurrent && 'bg-surface border-line hover:border-brand-line hover:bg-surface-2 cursor-pointer',
                          hasAnsweredCurrent && isCorrect && 'bg-ok-soft border-ok/50',
                          hasAnsweredCurrent && isPicked && !isCorrect && 'bg-danger-soft border-danger/50',
                          hasAnsweredCurrent && !isCorrect && !isPicked && 'bg-surface border-line opacity-45'
                        )}
                      >
                        <span className={cn(
                          'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-mono font-bold mt-0.5',
                          hasAnsweredCurrent && isCorrect ? 'bg-ok text-bg'
                            : hasAnsweredCurrent && isPicked ? 'bg-danger text-bg'
                            : 'bg-surface-2 border border-line text-ink-3 group-hover:border-brand-line group-hover:text-brand-2'
                        )}>
                          {hasAnsweredCurrent && isCorrect ? <CheckCircle2 size={15} />
                            : hasAnsweredCurrent && isPicked ? <XCircle size={15} />
                            : String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-[14.5px] leading-snug text-ink pt-0.5">{opt}</span>
                      </motion.button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {hasAnsweredCurrent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      className="overflow-hidden"
                    >
                      <div className={cn('rounded-2xl border p-5 space-y-3',
                        selectedOption === currentQ.correctIndex ? 'bg-ok-soft border-ok/40' : 'bg-danger-soft border-danger/40')}>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          {selectedOption === currentQ.correctIndex
                            ? <><CheckCircle2 size={17} className="text-ok" /> <span className="text-ok">Correcto</span></>
                            : <><XCircle size={17} className="text-danger" /> <span className="text-danger">No es esa</span></>}
                        </div>
                        <p className="text-[14px] text-ink-2 leading-relaxed">{currentQ.explanation}</p>
                        <button type="button" onClick={handleNextQuestion} className="btn btn-primary">
                          {currentQuestionIdx < questions.length - 1 ? 'Siguiente pregunta' : 'Ir a la prueba de teclado'}
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {/* ---------- Práctica ---------- */}
          {stage === 'practical' && (
            <motion.section
              key="practical"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="min-h-full flex flex-col px-4 sm:px-6 py-6 gap-5"
            >
              <div className="w-full max-w-3xl mx-auto space-y-5 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="eyebrow">Prueba al teclado</div>
                  <button
                    type="button"
                    onClick={() => { setUserPlayedNotes([]); setPracticalSuccess(false); setPracticalAttempts(a => a + 1); }}
                    className="btn btn-ghost btn-sm"
                  >
                    <RotateCcw size={13} /> Reiniciar intento
                  </button>
                </div>

                <div>
                  <h2 className="font-serif font-semibold text-[22px] sm:text-[27px] leading-snug text-ink">
                    {practical.instruction}
                  </h2>
                  <p className="text-[13.5px] text-ink-2 mt-2 flex items-start gap-2">
                    <Sparkles size={14} className="text-brand shrink-0 mt-0.5" /> {practical.hint}
                  </p>
                </div>

                {/* Notas pedidas: se encienden a medida que las tocás */}
                <div className="flex flex-wrap items-center gap-2">
                  {practical.requiredSequence.map((note, i) => {
                    const done = playedTarget(note);
                    return (
                      <motion.span
                        key={`${note}-${i}`}
                        animate={done ? { scale: [1, 1.12, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border font-mono text-[15px] font-semibold transition-colors',
                          done ? 'bg-ok-soft border-ok/50 text-ok' : 'bg-surface-2 border-line text-ink-2'
                        )}
                      >
                        {done && <CheckCircle2 size={14} />} {note}
                      </motion.span>
                    );
                  })}
                  <span className="text-[12px] text-ink-3 ml-1">
                    {practical.mode === 'chord' ? 'todas juntas' : 'en este orden'}
                  </span>
                </div>

                <AnimatePresence>
                  {practicalSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-ok/40 bg-ok-soft px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 size={20} className="text-ok shrink-0" />
                        <span className="text-[14.5px] font-medium text-ink">
                          ¡Eso es! Ejecutaste la prueba correctamente.
                        </span>
                      </div>
                      <button type="button" onClick={handleFinishEvaluation} className="btn btn-primary shrink-0">
                        Ver el resultado <ArrowRight size={15} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* El teclado a todo lo ancho: es el protagonista de esta etapa */}
              <div className="w-full max-w-6xl mx-auto min-w-0 overflow-hidden">
                {/* Sin selector de timbre ni leyenda de intervalos: en un examen
                    esos controles son ruido, y el teclado se queda con la pantalla. */}
                <Piano
                  activeNotes={practical.requiredSequence}
                  correctNotes={userPlayedNotes.filter(n => practical.requiredSequence.includes(n))}
                  onNotePlay={handlePracticalNotePlay}
                  showSoundSelector={false}
                  showSplitToggle={false}
                  showIntervalColorToggle={false}
                  showIntervalColors={false}
                  showFingerGuideToggle={false}
                />
              </div>

              {!practicalSuccess && (
                <div className="w-full max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <span className="text-[12.5px] text-ink-3">
                    Podés tocar con el mouse, tu teclado MIDI o las teclas A S D F G H J K.
                    {practicalAttempts > 0 && ` · ${practicalAttempts} ${practicalAttempts === 1 ? 'reintento' : 'reintentos'}`}
                  </span>
                  <button type="button" onClick={handleFinishEvaluation} className="btn btn-secondary btn-sm">
                    Terminar sin la práctica
                  </button>
                </div>
              )}
            </motion.section>
          )}

          {/* ---------- Resultado ---------- */}
          {stage === 'results' && (
            <motion.section
              key="results"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="min-h-full flex items-center justify-center px-5 py-10"
            >
              <div className="w-full max-w-2xl text-center space-y-7">
                {/* Anillo de puntaje que se dibuja */}
                <div className="relative w-36 h-36 mx-auto">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-line-strong)" strokeWidth="9" />
                    <motion.circle
                      cx="60" cy="60" r="52" fill="none" strokeWidth="9" strokeLinecap="round"
                      stroke={passed ? 'var(--color-ok)' : 'var(--color-danger)'}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: finalScore / 100 }}
                      transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                      style={{ pathLength: finalScore / 100 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35, type: 'spring', stiffness: 180, damping: 12 }}
                      className="font-mono text-[34px] font-bold text-ink leading-none tabular-nums"
                    >
                      {finalScore}
                    </motion.span>
                    <span className="text-[11px] text-ink-3 font-mono">de 100</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[12px] font-medium',
                    passed ? 'border-ok/40 bg-ok-soft text-ok' : 'border-danger/40 bg-danger-soft text-danger')}>
                    {passed ? <GraduationCap size={14} /> : <Clock size={14} />}
                    {passed ? 'Lección aprobada' : 'Todavía no'}
                  </div>
                  <h2 className="font-serif font-semibold text-[28px] sm:text-[34px] leading-tight text-ink">
                    {passed ? '¡Desbloqueaste la siguiente lección!' : 'Falta un poco'}
                  </h2>
                  <p className="text-[14px] text-ink-2">
                    {passed
                      ? 'Alcanzaste el estándar del conservatorio: 80 de 100.'
                      : 'Hacen falta 80 puntos. Repasá la lección y volvé a intentarla — no hay límite de intentos.'}
                  </p>
                </div>

                {/* Desglose: de dónde salió la nota */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-4 text-left space-y-1">
                    <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3"><BookOpen size={12} /> Teoría</div>
                    <div className="font-mono text-[19px] font-semibold text-ink">
                      {correctSoFar}/{questions.length}
                      <span className="text-[12px] text-ink-3 font-normal ml-1.5">
                        · {Math.round((correctSoFar / questions.length) * 50)} pts
                      </span>
                    </div>
                  </div>
                  <div className="card p-4 text-left space-y-1">
                    <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3"><Music size={12} /> Teclado</div>
                    <div className="font-mono text-[19px] font-semibold text-ink">
                      {practicalSuccess ? '✓' : '—'}
                      <span className="text-[12px] text-ink-3 font-normal ml-1.5">· {practicalSuccess ? 50 : 0} pts</span>
                    </div>
                  </div>
                </div>

                {passed && userProgress && (
                  <div className="max-w-md mx-auto">
                    <CurriculumProgressBar
                      userProgress={userProgress}
                      variant="celebration"
                      highlightNewCompletion={true}
                    />
                  </div>
                )}

                {/* Devolución del Maestro */}
                <div className="card-2 p-5 text-left space-y-2 border-brand-line/60">
                  <div className="eyebrow flex items-center gap-1.5">
                    <Sparkles size={13} /> Diagnóstico del Maestro Aurelio
                  </div>
                  <p className="text-[13.5px] text-ink-2 leading-relaxed">
                    {isLoadingFeedback
                      ? <span className="inline-flex items-center gap-2 text-ink-3"><Loader2 size={14} className="animate-spin" /> El Maestro está redactando tu informe…</span>
                      : maestroFeedback}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                  {passed ? (
                    <>
                      <button type="button" onClick={() => triggerCurriculumConfetti('grand')} className="btn btn-secondary">
                        <PartyPopper size={15} className="text-brand-2" /> Otra vez el confeti
                      </button>
                      <button type="button" onClick={onClose} className="btn btn-primary px-7">
                        Continuar mi camino <ArrowRight size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={onClose} className="btn btn-secondary">
                        <ChevronLeft size={15} /> Volver a la lección
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStage('intro');
                          setCurrentQuestionIdx(0);
                          setTheoryAnswers([]);
                          setSelectedOption(null);
                          setHasAnsweredCurrent(false);
                          setUserPlayedNotes([]);
                          setPracticalSuccess(false);
                          setMaestroFeedback('');
                        }}
                        className="btn btn-primary px-7"
                      >
                        <RotateCcw size={15} /> Reintentar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
