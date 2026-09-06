import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckCircle2, Lock, ArrowRight, Award, Sparkles, Trophy, Check, PartyPopper } from 'lucide-react';
import { Lesson, LESSONS, UserProgress } from '../types';
import { cn } from '../lib/utils';
import { CurriculumProgressBar } from './CurriculumProgressBar';
import { triggerCurriculumConfetti } from '../lib/celebration';

interface CurriculumRoadmapProps {
  userProgress: UserProgress;
  onSelectLesson: (lesson: Lesson) => void;
  onSetLevel: (level: 'Principiante' | 'Intermedio' | 'Avanzado') => void;
}

const MODULES = [
  { number: 1, title: 'Módulo 1: Fundamentos Absolutos (0% - 20%)', range: [1, 2, 3] },
  { number: 2, title: 'Módulo 2: Escalas e Intervalos (20% - 40%)', range: [4, 5, 6] },
  { number: 3, title: 'Módulo 3: El Poder de los Acordes (40% - 60%)', range: [7, 8, 9] },
  { number: 4, title: 'Módulo 4: Inversiones y Conducción (60% - 80%)', range: [10, 11, 12] },
  { number: 5, title: 'Módulo 5: Armonía Maestra (80% - 100%)', range: [13, 14, 15] },
];

export const CurriculumRoadmap: React.FC<CurriculumRoadmapProps> = ({
  userProgress,
  onSelectLesson,
  onSetLevel,
}) => {
  const completedCount = userProgress.completedLessons.length;
  const overallPercentage = Math.round((completedCount / LESSONS.length) * 100);

  return (
    <div className="space-y-12">
      {/* Top Level Diagnostic Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-white/40">Nivel de partida:</span>
          <div className="flex gap-1.5 p-1 bg-black/50 rounded-xl border border-white/10">
            {(['Principiante', 'Intermedio', 'Avanzado'] as const).map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => onSetLevel(lvl)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all text-xs",
                  userProgress.userLevel === lvl
                    ? "bg-amber-400 text-black font-bold shadow"
                    : "text-white/50 hover:text-white"
                )}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {completedCount > 0 && (
          <button
            type="button"
            onClick={() => triggerCurriculumConfetti('grand')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all hover:scale-105 active:scale-95"
            title="Lanzar confeti de celebración por tu progreso"
          >
            <PartyPopper size={14} className="text-amber-400" />
            <span>Celebrar Logro</span>
          </button>
        )}
      </div>

      {/* Visual Curriculum Progress Bar Dashboard Component */}
      <CurriculumProgressBar
        userProgress={userProgress}
        variant="full"
        onSelectLesson={(lessonId) => {
          const l = LESSONS.find(x => x.id === lessonId);
          if (l) onSelectLesson(l);
        }}
      />

      {/* Modules List */}
      <div className="space-y-12">
        {MODULES.map((module) => {
          const moduleLessons = LESSONS.filter(l => l.moduleNumber === module.number);
          const moduleCompleted = moduleLessons.filter(l => userProgress.completedLessons.includes(l.id)).length;
          const isModuleDone = moduleCompleted === moduleLessons.length;

          return (
            <div key={module.number} className="space-y-4">
              {/* Module Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shadow",
                    isModuleDone
                      ? "bg-emerald-500 text-black"
                      : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                  )}>
                    {isModuleDone ? <Check size={14} className="stroke-[3]" /> : `M${module.number}`}
                  </div>
                  <h4 className="text-lg md:text-xl font-serif font-bold text-white">
                    {module.title}
                  </h4>
                </div>
                <div className="text-xs font-mono text-white/40">
                  {moduleCompleted} / {moduleLessons.length} Aprobadas
                </div>
              </div>

              {/* Lessons Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {moduleLessons.map((lesson) => {
                  const isUnlocked = userProgress.unlockedLessons.includes(lesson.id);
                  const isPassed = userProgress.completedLessons.includes(lesson.id);
                  const score = userProgress.lessonScores[lesson.id];

                  return (
                    <motion.div
                      key={lesson.id}
                      whileHover={isUnlocked ? { y: -4 } : {}}
                      onClick={() => isUnlocked && onSelectLesson(lesson)}
                      className={cn(
                        "p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden",
                        isUnlocked ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                        isPassed
                          ? "glass border-emerald-500/30 hover:border-emerald-500/60"
                          : isUnlocked
                          ? "glass border-amber-500/30 hover:border-amber-400 shadow-lg"
                          : "bg-black/30 border-white/5"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
                            Lección {lesson.number}
                          </span>

                          {isPassed ? (
                            <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 size={12} /> {score || 100} PTS
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-[10px] font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                              Disponible
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-white/30">
                              <Lock size={12} /> Bloqueado
                            </span>
                          )}
                        </div>

                        <h5 className="font-serif font-bold text-lg text-white leading-snug">
                          {lesson.title}
                        </h5>
                        <p className="text-xs text-white/50 leading-relaxed font-light line-clamp-2">
                          {lesson.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                        <span className="text-white/40">Nivel: {lesson.level}</span>
                        {isUnlocked ? (
                          <span className="text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            {isPassed ? 'Repasar' : 'Iniciar'} <ArrowRight size={13} />
                          </span>
                        ) : (
                          <span className="text-white/20 flex items-center gap-1">
                            <Lock size={12} /> Requiere anterior
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
