import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Trophy, ArrowRight, RotateCcw, Award, Sparkles, BookOpen, Music } from 'lucide-react';
import { Lesson } from '../types';
import { Piano } from './Piano';
import { cn } from '../lib/utils';

interface LessonEvaluationModalProps {
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onPassLesson: (lessonId: string, score: number) => void;
}

export const LessonEvaluationModal: React.FC<LessonEvaluationModalProps> = ({
  lesson,
  isOpen,
  onClose,
  onPassLesson,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl bg-[#0e121a] border border-amber-500/30 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
              <Award size={22} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400">
                Evaluación Oficial para Desbloquear
              </div>
              <h3 className="font-serif text-xl font-bold text-white">{lesson.title}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white text-sm uppercase font-mono tracking-wider px-3 py-1 rounded-lg hover:bg-white/5"
          >
            Cerrar ✕
          </button>
        </div>

        {/* STAGE: INTRO */}
        {stage === 'intro' && (
          <div className="space-y-6 text-center py-4">
            <div className="w-20 h-20 rounded-full bg-amber-400/10 border border-amber-400/30 mx-auto flex items-center justify-center text-amber-400">
              <Trophy size={40} />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h4 className="text-2xl font-serif text-white font-bold">Examen con el Maestro Aurelio</h4>
              <p className="text-sm text-white/60 leading-relaxed font-light">
                Para avanzar en el currículo de 0 a 100, debes demostrar comprensión teórica y precisión técnica.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto text-left text-xs font-mono">
              <div className="glass p-4 rounded-2xl border border-white/10 space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <BookOpen size={14} /> Fase 1: Teoría (50%)
                </div>
                <div className="text-white/60">{questions.length} preguntas conceptuales con explicación.</div>
              </div>
              <div className="glass p-4 rounded-2xl border border-white/10 space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Music size={14} /> Fase 2: Piano en Vivo (50%)
                </div>
                <div className="text-white/60">Ejecución práctica en el teclado virtual.</div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => setStage('theory')}
                className="px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-2xl shadow-lg hover:scale-105 transition-all text-sm uppercase tracking-wider"
              >
                Comenzar Evaluación
              </button>
            </div>
          </div>
        )}

        {/* STAGE: THEORY QUESTIONS */}
        {stage === 'theory' && currentQ && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs font-mono text-white/40">
              <span>Fase Teórica: Pregunta {currentQuestionIdx + 1} de {questions.length}</span>
              <span className="text-amber-400 font-semibold">Examen Obligatorio</span>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10 space-y-3">
              <h4 className="text-lg font-medium text-white">{currentQ.question}</h4>
            </div>

            <div className="space-y-3">
              {currentQ.options.map((opt, i) => {
                const isSelected = selectedOption === i;
                const isCorrect = i === currentQ.correctIndex;
                let cardStyle = "bg-white/5 border-white/10 hover:border-amber-400/40 text-white/80";

                if (hasAnsweredCurrent) {
                  if (isCorrect) {
                    cardStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium";
                  } else if (isSelected) {
                    cardStyle = "bg-rose-500/20 border-rose-500 text-rose-300";
                  } else {
                    cardStyle = "bg-white/5 border-white/5 text-white/40 opacity-50";
                  }
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectOption(i)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all text-sm flex items-center justify-between",
                      cardStyle
                    )}
                  >
                    <span>{opt}</span>
                    {hasAnsweredCurrent && isCorrect && (
                      <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                    )}
                    {hasAnsweredCurrent && isSelected && !isCorrect && (
                      <XCircle size={18} className="text-rose-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {hasAnsweredCurrent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-200/90 leading-relaxed font-light"
              >
                <span className="font-semibold text-amber-300">Retroalimentación del Maestro: </span>
                {currentQ.explanation}
              </motion.div>
            )}

            {hasAnsweredCurrent && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-6 py-2.5 bg-amber-400 text-black font-semibold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-amber-300 transition-colors"
                >
                  <span>{currentQuestionIdx < questions.length - 1 ? 'Siguiente Pregunta' : 'Pasar a Prueba Práctica'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STAGE: PRACTICAL PIANO TASK */}
        {stage === 'practical' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs font-mono text-white/40">
              <span className="text-amber-400 font-semibold">Fase Práctica en el Teclado</span>
              <span>Modo: {practical.mode === 'sequence' ? 'Secuencia en Orden' : 'Acorde Simultáneo'}</span>
            </div>

            <div className="glass p-5 rounded-2xl border border-white/10 space-y-2">
              <div className="text-xs uppercase font-mono text-amber-300">Desafío del Maestro</div>
              <h4 className="text-base font-medium text-white">{practical.instruction}</h4>
              <p className="text-xs text-white/50 italic">{practical.hint}</p>
            </div>

            {/* Target notes visual representation */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Notas Requeridas:</div>
              <div className="flex flex-wrap gap-2">
                {practical.requiredSequence.map((reqNote, idx) => {
                  const wasPlayed = userPlayedNotes.includes(reqNote);
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all",
                        wasPlayed
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : "bg-white/5 border-white/10 text-white/40"
                      )}
                    >
                      {reqNote}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Practical Status message */}
            {practicalSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={18} />
                  <span>¡Prueba práctica superada con éxito!</span>
                </div>
                <button
                  type="button"
                  onClick={handleFinishEvaluation}
                  className="px-5 py-2 bg-emerald-400 text-black font-semibold rounded-xl text-xs uppercase tracking-wider hover:bg-emerald-300 transition-colors shadow"
                >
                  Ver Calificación Final
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-white/40 font-mono">
                <span>Toca las teclas requeridas en el piano abajo o con tu teclado de PC:</span>
                <button
                  type="button"
                  onClick={() => setUserPlayedNotes([])}
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
                >
                  <RotateCcw size={12} /> Reiniciar intento
                </button>
              </div>
            )}

            {/* Interactive Piano for Evaluation */}
            <div className="pt-2">
              <Piano
                activeNotes={practical.requiredSequence}
                correctNotes={userPlayedNotes.filter(n => practical.requiredSequence.includes(n))}
                onNotePlay={handlePracticalNotePlay}
              />
            </div>
          </div>
        )}

        {/* STAGE: RESULTS */}
        {stage === 'results' && (
          <div className="space-y-6 text-center py-4">
            <div
              className={cn(
                "w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl shadow-2xl transition-all",
                passed
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              )}
            >
              {passed ? '🎓' : '⏳'}
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase font-mono tracking-widest text-amber-400">
                Resultado de la Evaluación
              </div>
              <h3 className="text-3xl font-serif font-bold text-white">
                {passed ? '¡Lección Aprobada y Desbloqueada!' : 'Evaluación Incompleta'}
              </h3>
              <div className="text-4xl font-mono font-extrabold text-amber-400 pt-2">
                {finalScore} <span className="text-base text-white/40 font-normal">/ 100 PTS</span>
              </div>
              <p className="text-xs text-white/50">
                {passed
                  ? 'Has alcanzado el estándar técnico requerido (mínimo 80%).'
                  : 'Se requiere al menos 80% para desbloquear la siguiente lección.'}
              </p>
            </div>

            {/* Maestro Aurelio personalized message */}
            <div className="glass p-5 rounded-2xl border border-amber-500/30 max-w-md mx-auto text-left space-y-1.5">
              <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} /> Diagnóstico del Maestro Aurelio
              </div>
              <p className="text-xs text-white/80 leading-relaxed font-light">
                {isLoadingFeedback ? 'El Maestro está redactando tu informe...' : maestroFeedback}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-3 pt-4">
              {passed ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105 flex items-center gap-2"
                >
                  <span>Continuar mi Camino</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStage('intro');
                    setUserPlayedNotes([]);
                    setTheoryAnswers([]);
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={14} />
                  <span>Reintentar Evaluación</span>
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
