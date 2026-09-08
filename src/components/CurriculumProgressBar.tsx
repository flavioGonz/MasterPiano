import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Sparkles, Award, Lock } from 'lucide-react';
import { LESSONS, UserProgress } from '../types';
import { cn } from '../lib/utils';

interface CurriculumProgressBarProps {
  userProgress: UserProgress;
  variant?: 'compact' | 'full' | 'celebration';
  highlightNewCompletion?: boolean;
  className?: string;
  onSelectLesson?: (lessonId: string) => void;
}

export const MILESTONES = [
  { percent: 20, module: 1, label: 'Fundamentos' },
  { percent: 40, module: 2, label: 'Escalas' },
  { percent: 60, module: 3, label: 'Acordes' },
  { percent: 80, module: 4, label: 'Inversiones' },
  { percent: 100, module: 5, label: 'Maestría' },
];

/**
 * Progreso del currículo (15 lecciones / 5 módulos).
 *  - compact:     píldora para la barra superior.
 *  - celebration: bloque animado para el modal de lección aprobada.
 *  - full:        tarjeta de la portada con XP, rango, barra por módulos
 *                 y mapa de las 15 lecciones.
 */
export const CurriculumProgressBar: React.FC<CurriculumProgressBarProps> = ({
  userProgress,
  variant = 'full',
  highlightNewCompletion = false,
  className,
  onSelectLesson,
}) => {
  const completedCount = userProgress.completedLessons.length;
  const totalLessons = LESSONS.length;
  const progressPercent = Math.round((completedCount / totalLessons) * 100);
  const done = progressPercent >= 100;

  if (variant === 'compact') {
    return (
      <div
        className={cn('items-center gap-2.5 h-9 px-3 rounded-xl bg-surface border border-line', className)}
        title={`${completedCount} de ${totalLessons} lecciones aprobadas`}
      >
        <span className="text-[11px] text-ink-3">Progreso</span>
        <div className="progress w-24">
          <motion.span
            initial={false}
            animate={{ width: `${Math.max(progressPercent, 3)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={cn('!block h-full rounded-full', done ? 'bg-ok' : 'bg-brand')}
          />
        </div>
        <span className="font-mono text-xs font-semibold text-ink tabular-nums">{progressPercent}%</span>
      </div>
    );
  }

  if (variant === 'celebration') {
    return (
      <div className={cn('card p-5 space-y-4 text-left border-brand-line', className)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand text-brand-ink flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="eyebrow">Avance del currículo</div>
              <div className="text-sm font-semibold text-ink">
                {completedCount} de {totalLessons} lecciones aprobadas
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-semibold text-brand tabular-nums">{progressPercent}%</div>
            <div className="text-[11px] text-ok flex items-center gap-1 justify-end">
              <CheckCircle2 size={11} /> Nivel actualizado
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="progress h-3 bg-white/8 relative">
            <motion.span
              initial={{ width: `${Math.max(progressPercent - 100 / totalLessons, 3)}%` }}
              animate={{ width: `${Math.max(progressPercent, 3)}%` }}
              transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
              className="!block h-full rounded-full bg-brand relative overflow-hidden"
            >
              {highlightNewCompletion && (
                <motion.span
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                  className="absolute inset-y-0 w-1/3 bg-white/40 skew-x-12"
                />
              )}
            </motion.span>
          </div>
          <div className="flex justify-between text-[10.5px] font-mono">
            {MILESTONES.map(m => (
              <span key={m.module} className={progressPercent >= m.percent ? 'text-brand font-semibold' : 'text-ink-3'}>
                M{m.module}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- full ----
  return (
    <div className={cn('card p-5 md:p-6 space-y-5', className)}>
      <div className="space-y-3">
        <div className="eyebrow">Trayectoria en el conservatorio</div>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold text-ink tabular-nums leading-none">{progressPercent}%</span>
            <span className="text-sm text-ink-2">{completedCount} de {totalLessons} lecciones</span>
          </div>
          <div className="flex items-center divide-x divide-line rounded-xl border border-line bg-surface-2">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Award size={15} className="text-brand" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-3">Experiencia</div>
                <div className="font-mono text-sm font-semibold text-ink tabular-nums leading-tight">{userProgress.xp} XP</div>
              </div>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-ink-3">Rango</div>
              <div className="text-sm font-semibold text-ink leading-tight">{userProgress.userLevel}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra segmentada por módulo */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-1.5">
          {MILESTONES.map(m => {
            const start = m.percent - 20;
            const fill = Math.max(0, Math.min(1, (progressPercent - start) / 20));
            const isDone = fill >= 1;
            const isCurrent = !isDone && fill > 0 || (!isDone && progressPercent === start);
            return (
              <div key={m.module} className="space-y-1.5">
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${fill * 100}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: m.module * 0.05 }}
                    className={cn('h-full rounded-full', isDone ? 'bg-ok' : 'bg-brand')}
                  />
                </div>
                <div
                  title={`Módulo ${m.module}: ${m.label}`}
                  className={cn(
                    'text-[11px] leading-tight truncate',
                    isDone ? 'text-ok' : isCurrent ? 'text-ink font-medium' : 'text-ink-3'
                  )}
                >
                  <span className="font-mono">M{m.module}</span>
                  <span className="hidden min-[1700px]:inline"> · {m.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mapa de lecciones */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {LESSONS.map(l => {
          const isCompleted = userProgress.completedLessons.includes(l.id);
          const isUnlocked = userProgress.unlockedLessons.includes(l.id);
          return (
            <button
              key={l.id}
              type="button"
              disabled={!isUnlocked}
              onClick={() => onSelectLesson?.(l.id)}
              title={`Lección ${l.number}: ${l.title}`}
              className={cn(
                'w-8 h-8 rounded-lg text-[11px] font-mono font-semibold flex items-center justify-center border transition-all',
                isCompleted
                  ? 'bg-ok-soft border-ok/30 text-ok hover:border-ok/60'
                  : isUnlocked
                    ? 'bg-brand-soft border-brand-line text-brand-2 hover:bg-brand hover:text-brand-ink'
                    : 'bg-transparent border-line text-ink-3/70 cursor-not-allowed'
              )}
            >
              {isCompleted ? <CheckCircle2 size={13} /> : isUnlocked ? l.number : <Lock size={11} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
