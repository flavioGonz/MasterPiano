import React from 'react';
import { motion } from 'motion/react';
import { Trophy, CheckCircle2, Sparkles, Award } from 'lucide-react';
import { LESSONS, UserProgress } from '../types';
import { cn } from '../lib/utils';

interface CurriculumProgressBarProps {
  userProgress: UserProgress;
  variant?: 'compact' | 'full' | 'celebration';
  highlightNewCompletion?: boolean;
  className?: string;
  onSelectLesson?: (lessonId: string) => void;
}

const MILESTONES = [
  { percent: 20, label: 'M1: Fundamentos', module: 1 },
  { percent: 40, label: 'M2: Escalas', module: 2 },
  { percent: 60, label: 'M3: Acordes', module: 3 },
  { percent: 80, label: 'M4: Inversiones', module: 4 },
  { percent: 100, label: 'M5: Maestría', module: 5 },
];

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

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex flex-col items-end text-xs font-mono">
          <span className="text-white/40 text-[10px] tracking-wider uppercase">Progreso 0 a 100</span>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">{progressPercent}%</span>
            <span className="text-white/40 text-[10px]">({completedCount}/{totalLessons})</span>
          </div>
        </div>
        <div className="w-24 md:w-32 h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10 relative">
          <motion.div
            initial={false}
            animate={{ width: `${Math.max(progressPercent, 4)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              "h-full rounded-full transition-colors",
              progressPercent >= 100
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]"
                : "bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            )}
          />
        </div>
      </div>
    );
  }

  if (variant === 'celebration') {
    return (
      <div className={cn("space-y-4 p-5 rounded-2xl bg-gradient-to-b from-amber-400/15 via-black/40 to-black/60 border border-amber-400/40 text-left shadow-xl", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shadow-md">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                Avance del Currículo
              </div>
              <div className="text-sm font-serif font-bold text-white">
                {completedCount} de {totalLessons} Lecciones Completadas
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-amber-400">
              {progressPercent}%
            </div>
            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 justify-end">
              <CheckCircle2 size={11} />
              <span>Nivel Actualizado</span>
            </div>
          </div>
        </div>

        {/* Dynamic Animated Progress Bar */}
        <div className="space-y-1.5">
          <div className="relative h-4 w-full bg-black/60 rounded-full overflow-hidden p-0.5 border border-amber-400/30">
            <motion.div
              initial={{ width: `${Math.max(progressPercent - (100 / totalLessons), 4)}%` }}
              animate={{ width: `${Math.max(progressPercent, 4)}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
              className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)] relative"
            >
              {highlightNewCompletion && (
                <motion.div
                  initial={{ opacity: 0.8, x: '-100%' }}
                  animate={{ opacity: [0.3, 1, 0.3], x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-white/40 rounded-full"
                />
              )}
            </motion.div>
          </div>

          {/* Module tick marks */}
          <div className="flex justify-between px-1 text-[10px] font-mono text-white/40">
            {MILESTONES.map((m) => (
              <span
                key={m.module}
                className={cn(
                  "transition-colors",
                  progressPercent >= m.percent ? "text-amber-300 font-bold" : "text-white/30"
                )}
              >
                M{m.module} ({m.percent}%)
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Full Variant with interactive modules & step indicators
  return (
    <div className={cn("glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-6", className)}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-widest font-bold">
            <Trophy size={14} />
            <span>Currículo Progresivo de 0 a 100</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-white">
            Tu Trayectoria en el Conservatorio
          </h3>
          <p className="text-xs text-white/50 font-light">
            Has completado {completedCount} de {totalLessons} lecciones aprobadas con evaluación técnica.
          </p>
        </div>

        {/* Global XP & Level Badge */}
        <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-2xl border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <Award size={20} />
          </div>
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">Experiencia Total</div>
            <div className="text-base font-mono font-bold text-amber-300">{userProgress.xp} XP</div>
          </div>
          <div className="border-l border-white/10 pl-3">
            <div className="text-[10px] font-mono text-white/40 uppercase">Rango</div>
            <div className="text-xs font-bold text-emerald-400">{userProgress.userLevel}</div>
          </div>
        </div>
      </div>

      {/* Main Track Bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline text-xs font-mono">
          <span className="text-white/60">Dominio Técnico Acumulado</span>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-sm">{progressPercent}%</span>
            <span className="text-white/40 text-[11px]">({completedCount}/{totalLessons} lecciones)</span>
          </div>
        </div>

        {/* Bar container */}
        <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10 relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progressPercent, 3)}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className={cn(
              "h-full rounded-full relative transition-all",
              progressPercent >= 100
                ? "bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 shadow-[0_0_20px_rgba(16,185,129,0.8)]"
                : "bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
            )}
          />

          {/* Module divider lines */}
          <div className="absolute inset-0 flex justify-between pointer-events-none px-1">
            {[20, 40, 60, 80].map((tick) => (
              <div
                key={tick}
                className="w-px h-full bg-white/20"
                style={{ left: `${tick}%`, position: 'absolute' }}
              />
            ))}
          </div>
        </div>

        {/* Milestones grid */}
        <div className="grid grid-cols-5 gap-1 pt-1">
          {MILESTONES.map((m) => {
            const isCompleted = progressPercent >= m.percent;
            const isCurrent = progressPercent < m.percent && (m.percent === 20 || progressPercent >= m.percent - 20);
            return (
              <div
                key={m.module}
                className={cn(
                  "p-2 rounded-xl border text-center transition-all",
                  isCompleted
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : isCurrent
                      ? "bg-amber-400/10 border-amber-400/40 text-amber-300 font-semibold shadow-sm"
                      : "bg-white/5 border-white/5 text-white/30"
                )}
              >
                <div className="text-[10px] font-mono tracking-wider uppercase flex items-center justify-center gap-1">
                  {isCompleted && <CheckCircle2 size={10} className="text-emerald-400" />}
                  <span>{m.label.split(':')[0]}</span>
                </div>
                <div className="text-[11px] font-bold truncate">
                  {m.label.split(':')[1]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discrete 15 Lessons Mini-Strip */}
      <div className="pt-2 border-t border-white/5 space-y-2">
        <div className="text-[11px] font-mono text-white/40 flex justify-between">
          <span>Mapa de las 15 Lecciones:</span>
          <span className="text-amber-300 font-bold">{completedCount} Aprobadas</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-15 gap-1">
          {LESSONS.map((l) => {
            const isCompleted = userProgress.completedLessons.includes(l.id);
            const isUnlocked = userProgress.unlockedLessons.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onSelectLesson?.(l.id)}
                title={`Lección ${l.number}: ${l.title} (${isCompleted ? 'Aprobada' : isUnlocked ? 'Disponible' : 'Bloqueada'})`}
                className={cn(
                  "h-8 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center transition-all border",
                  isCompleted
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                    : isUnlocked
                      ? "bg-amber-400/20 border-amber-400/40 text-amber-300 hover:bg-amber-400/30"
                      : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed opacity-50"
                )}
              >
                {isCompleted ? <CheckCircle2 size={12} /> : l.number}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
