import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Lock, ArrowRight, Check, PartyPopper, Play, RotateCcw } from 'lucide-react';
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
  { number: 1, title: 'Fundamentos absolutos', range: '0–14%' },
  { number: 2, title: 'Escalas e intervalos', range: '14–43%' },
  { number: 3, title: 'El poder de los acordes', range: '43–57%' },
  { number: 4, title: 'Inversiones y conducción', range: '57–81%' },
  { number: 5, title: 'Armonía maestra', range: '81–100%' },
];

const LEVELS = ['Principiante', 'Intermedio', 'Avanzado'] as const;

export const CurriculumRoadmap: React.FC<CurriculumRoadmapProps> = ({
  userProgress,
  onSelectLesson,
  onSetLevel,
}) => {
  const completedCount = userProgress.completedLessons.length;
  const allDone = completedCount === LESSONS.length;

  // Siguiente lección: la primera desbloqueada que no esté aprobada.
  const nextLesson =
    LESSONS.find(l => userProgress.unlockedLessons.includes(l.id) && !userProgress.completedLessons.includes(l.id))
    ?? LESSONS[LESSONS.length - 1];
  const nextModule = MODULES.find(m => m.number === nextLesson.moduleNumber);

  return (
    <div className="space-y-10">
      {/* ---- Portada: siguiente lección + progreso ---- */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 card p-6 md:p-7 flex flex-col justify-between gap-6 relative overflow-hidden">
          {/* brillo dorado sutil */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brand/10 blur-3xl" />

          <div className="space-y-3 relative">
            <div className="flex items-center gap-2">
              <span className="eyebrow">{allDone ? 'Currículo completo' : completedCount === 0 ? 'Empezá por acá' : 'Continuar donde dejaste'}</span>
              <span className="badge badge-neutral font-mono">Módulo {nextLesson.moduleNumber} · Lección {nextLesson.number}</span>
            </div>
            <h1 className="font-serif font-semibold text-[26px] md:text-[32px] leading-[1.15] text-ink">
              {nextLesson.title}
            </h1>
            <p className="text-sm md:text-[15px] text-ink-2 leading-relaxed max-w-2xl">
              {nextLesson.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative">
            <button type="button" onClick={() => onSelectLesson(nextLesson)} className="btn btn-primary">
              {allDone ? <RotateCcw size={16} /> : <Play size={16} className="fill-current" />}
              {allDone ? 'Repasar la última lección' : completedCount === 0 ? 'Iniciar la primera lección' : 'Continuar lección'}
            </button>
            <div className="text-xs text-ink-3">
              Nivel {nextLesson.level} · {nextModule?.title}
            </div>
          </div>
        </div>

        <CurriculumProgressBar
          userProgress={userProgress}
          variant="full"
          className="lg:col-span-2"
          onSelectLesson={(lessonId) => {
            const l = LESSONS.find(x => x.id === lessonId);
            if (l) onSelectLesson(l);
          }}
        />
      </section>

      {/* ---- Nivel de partida ---- */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-ink-2">Nivel de partida</span>
          <div className="seg">
            {LEVELS.map(lvl => (
              <button
                key={lvl}
                type="button"
                data-active={userProgress.userLevel === lvl}
                onClick={() => onSetLevel(lvl)}
                className="seg-item"
              >
                {lvl}
              </button>
            ))}
          </div>
          <span className="text-xs text-ink-3 hidden md:inline">Desbloquea lecciones acordes a tu experiencia.</span>
        </div>

        {completedCount > 0 && (
          <button
            type="button"
            onClick={() => triggerCurriculumConfetti('grand')}
            className="btn btn-ghost btn-sm text-brand-2"
            title="Lanzar confeti por tu progreso"
          >
            <PartyPopper size={14} /> Celebrar
          </button>
        )}
      </section>

      {/* ---- Módulos ---- */}
      <div className="space-y-10">
        {MODULES.map(module => {
          const moduleLessons = LESSONS.filter(l => l.moduleNumber === module.number);
          const moduleCompleted = moduleLessons.filter(l => userProgress.completedLessons.includes(l.id)).length;
          const isModuleDone = moduleCompleted === moduleLessons.length;
          const isModuleOpen = moduleLessons.some(l => userProgress.unlockedLessons.includes(l.id));

          return (
            <section key={module.number} className="space-y-4">
              <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-semibold shrink-0',
                    isModuleDone ? 'bg-ok text-bg' : isModuleOpen ? 'bg-brand text-brand-ink' : 'bg-surface-2 border border-line text-ink-3'
                  )}>
                    {isModuleDone ? <Check size={15} className="stroke-[3]" /> : module.number}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-serif font-semibold text-lg md:text-xl text-ink leading-tight truncate">
                      {module.title}
                    </h2>
                    <div className="text-[11px] text-ink-3 font-mono">Módulo {module.number} · {module.range} del recorrido</div>
                  </div>
                </div>
                <div className="text-xs text-ink-3 font-mono tabular-nums shrink-0">
                  <span className={cn(moduleCompleted > 0 && 'text-ink')}>{moduleCompleted}</span>/{moduleLessons.length}
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {moduleLessons.map(lesson => {
                  const isUnlocked = userProgress.unlockedLessons.includes(lesson.id);
                  const isPassed = userProgress.completedLessons.includes(lesson.id);
                  const isNext = lesson.id === nextLesson.id && !allDone;
                  const score = userProgress.lessonScores[lesson.id];

                  return (
                    <motion.button
                      key={lesson.id}
                      type="button"
                      disabled={!isUnlocked}
                      whileHover={isUnlocked ? { y: -2 } : undefined}
                      onClick={() => isUnlocked && onSelectLesson(lesson)}
                      className={cn(
                        'text-left p-5 rounded-2xl border flex flex-col gap-4 transition-colors',
                        isUnlocked ? 'bg-surface hover:border-line-strong' : 'bg-transparent opacity-60 cursor-not-allowed',
                        isNext ? 'border-brand-line shadow-[var(--shadow-glow)]' : isPassed ? 'border-ok/25' : 'border-line'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-ink-3">Lección {lesson.number}</span>
                        {isPassed ? (
                          <span className="badge badge-ok"><CheckCircle2 size={11} /> {score ?? 100} pts</span>
                        ) : isNext ? (
                          <span className="badge badge-brand">Siguiente</span>
                        ) : isUnlocked ? (
                          <span className="badge badge-neutral">Disponible</span>
                        ) : (
                          <span className="badge badge-neutral"><Lock size={10} /> Bloqueada</span>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <h3 className="font-serif font-semibold text-[17px] leading-snug text-ink">
                          {lesson.title}
                        </h3>
                        <p className="text-[13px] text-ink-2 leading-relaxed line-clamp-2">
                          {lesson.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
                        <span className="text-ink-3">{lesson.level}</span>
                        {isUnlocked ? (
                          <span className="text-brand-2 font-medium inline-flex items-center gap-1">
                            {isPassed ? 'Repasar' : 'Iniciar'} <ArrowRight size={13} />
                          </span>
                        ) : (
                          <span className="text-ink-3">Requiere la anterior</span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
