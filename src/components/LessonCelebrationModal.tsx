import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, PartyPopper, ArrowRight, Sparkles, Award, CheckCircle2, X } from 'lucide-react';
import { Lesson, LESSONS, UserProgress } from '../types';
import { triggerCurriculumConfetti } from '../lib/celebration';
import { CurriculumProgressBar } from './CurriculumProgressBar';

interface LessonCelebrationModalProps {
  lesson: Lesson | null;
  isOpen: boolean;
  onClose: () => void;
  onGoToNextLesson?: (nextLessonId: string) => void;
  userProgress: UserProgress;
  score?: number;
}

export const LessonCelebrationModal: React.FC<LessonCelebrationModalProps> = ({
  lesson,
  isOpen,
  onClose,
  onGoToNextLesson,
  userProgress,
  score = 100,
}) => {
  useEffect(() => {
    if (isOpen) {
      triggerCurriculumConfetti('grand');
    }
  }, [isOpen]);

  if (!isOpen || !lesson) return null;

  const currentIndex = LESSONS.findIndex(l => l.id === lesson.id);
  const nextLesson = currentIndex < LESSONS.length - 1 ? LESSONS[currentIndex + 1] : null;
  const completedCount = userProgress.completedLessons.length;
  const progressPercent = Math.round((completedCount / LESSONS.length) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#0d111d] border border-amber-400/40 p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center space-y-6"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* Top celebratory icon */}
          <div className="relative mx-auto w-20 h-20">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-400/30 text-black font-extrabold"
            >
              <Trophy size={40} className="stroke-[2.2]" />
            </motion.div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute -top-1 -right-1 text-amber-300"
            >
              <Sparkles size={20} />
            </motion.div>
          </div>

          {/* Title & Congratulations */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 inline-block">
              ¡Lección Aprobada!
            </span>
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-white">
              {lesson.title}
            </h3>
            <p className="text-xs text-white/60 font-light">
              Módulo {lesson.moduleNumber}: {lesson.description}
            </p>
          </div>

          {/* Gamification Stats: XP & Score */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] font-mono text-white/40 uppercase">Puntuación</div>
              <div className="text-xl font-mono font-bold text-emerald-400">{score} / 100 PTS</div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20">
              <div className="text-[10px] font-mono text-amber-300/60 uppercase">Recompensa</div>
              <div className="text-xl font-mono font-bold text-amber-300">+150 XP</div>
            </div>
          </div>

          {/* Visual Curriculum Progress Bar */}
          <CurriculumProgressBar
            userProgress={userProgress}
            variant="celebration"
            highlightNewCompletion={true}
          />

          {/* Next Lesson Unlocked Pill */}
          {nextLesson && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-left text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                    Desbloqueo Siguiente
                  </div>
                  <div className="font-bold text-white truncate max-w-[240px]">
                    Lección {nextLesson.number}: {nextLesson.title}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Lista
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => triggerCurriculumConfetti('grand')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-white/10"
              title="Lanzar más confeti de celebración"
            >
              <PartyPopper size={15} className="text-amber-400" />
              <span>Lanzar Confeti</span>
            </button>

            {nextLesson && onGoToNextLesson ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToNextLesson(nextLesson.id);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-400/20 hover:scale-105"
              >
                <span>Siguiente Lección</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <span>Continuar</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
