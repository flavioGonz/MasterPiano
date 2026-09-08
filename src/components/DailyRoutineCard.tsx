import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarCheck, Flame, Check, X, ChevronRight, Layers, Sparkles, RotateCcw,
} from 'lucide-react';
import {
  loadRoutine, saveRoutine, todayRound, record, closeRound, roundDoneToday,
  boxCounts, scaleLabel, type Routine, type RoutineItem,
} from '../lib/scaleRoutine';
import { cn } from '../lib/utils';

const BOX_LABEL: Record<number, string> = {
  1: 'Nueva · todos los días',
  2: 'En proceso · día por medio',
  3: 'Firme · una vez por semana',
};
const BOX_STYLE: Record<number, string> = {
  1: 'bg-brand-soft text-brand-2 border-brand-line',
  2: 'bg-info/10 text-info border-info/30',
  3: 'bg-ok-soft text-ok border-ok/30',
};

/**
 * La ronda de escalas del día: la caja de Leitner de la lección 7, funcionando.
 * Tres escalas, una de cada cajón cuando se puede, y el resultado de cada una
 * mueve su cajón. El estado viaja en el perfil, así que la ronda es la misma
 * en la computadora y en el celular.
 */
export const DailyRoutineCard: React.FC<{ onPractice?: (item: RoutineItem) => void }> = ({ onPractice }) => {
  const [routine, setRoutine] = useState<Routine>(() => loadRoutine());
  const [done, setDone] = useState<Record<string, boolean>>({});

  const round = useMemo(() => todayRound(routine), [routine]);
  const counts = boxCounts(routine);
  const alreadyDone = roundDoneToday(routine);
  const answered = round.filter(i => done[i.key] !== undefined).length;
  const complete = answered === round.length && round.length > 0;

  const persist = (r: Routine) => { saveRoutine(r); setRoutine(r); };

  const mark = (item: RoutineItem, clean: boolean) => {
    const next = record(routine, item.key, clean);
    setDone(d => ({ ...d, [item.key]: clean }));
    const all = { ...done, [item.key]: clean };
    persist(round.every(i => all[i.key] !== undefined) ? closeRound(next) : next);
  };

  const restart = () => { setDone({}); setRoutine(loadRoutine()); };

  return (
    <section className="card p-4 md:p-5 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-soft border border-brand-line flex items-center justify-center text-brand shrink-0">
            <CalendarCheck size={17} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-ink leading-tight">Tus 3 escalas de hoy</h3>
            <p className="text-[12.5px] text-ink-2">
              Rondas cortas rotando entre las tres. Nunca veinte minutos de la misma.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {routine.streak > 0 && (
            <span className="badge badge-brand" title={`${routine.streak} días seguidos con la ronda hecha`}>
              <Flame size={11} /> {routine.streak} {routine.streak === 1 ? 'día' : 'días'}
            </span>
          )}
          <span className="badge badge-neutral font-mono" title="Escalas por cajón">
            <Layers size={11} /> {counts[1]}·{counts[2]}·{counts[3]}
          </span>
        </div>
      </header>

      {alreadyDone && !complete && (
        <div className="rounded-xl border border-ok/30 bg-ok-soft px-3 py-2 text-[12.5px] text-ink-2 flex items-center gap-2">
          <Check size={14} className="text-ok shrink-0" /> La ronda de hoy ya está hecha. Lo que practiques ahora es yapa.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {round.map(item => {
          const result = done[item.key];
          return (
            <div
              key={item.key}
              className={cn(
                'rounded-xl border p-3 flex flex-col gap-2.5 transition-colors',
                result === true ? 'border-ok/40 bg-ok-soft'
                  : result === false ? 'border-danger/40 bg-danger-soft'
                  : 'border-line bg-surface-2'
              )}
            >
              <div className="min-w-0">
                <div className="font-serif font-semibold text-[15px] text-ink leading-tight truncate">
                  {scaleLabel(item)}
                </div>
                <span className={cn('mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border', BOX_STYLE[item.box])}>
                  {BOX_LABEL[item.box]}
                </span>
              </div>

              {result === undefined ? (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => mark(item, true)} className="btn btn-secondary btn-sm flex-1 border-ok/30 text-ok">
                    <Check size={13} /> Limpia
                  </button>
                  <button type="button" onClick={() => mark(item, false)} className="btn btn-secondary btn-sm flex-1 border-danger/30 text-danger">
                    <X size={13} /> Se trabó
                  </button>
                </div>
              ) : (
                <div className="text-[11.5px] text-ink-2">
                  {result
                    ? item.streak >= 1 ? 'Otra limpia y sube de cajón.' : 'Anotada. Vuelve mañana.'
                    : 'Vuelve al cajón 1: mañana otra vez.'}
                </div>
              )}

              {onPractice && (
                <button type="button" onClick={() => onPractice(item)} className="btn btn-ghost btn-sm justify-start -mx-1">
                  Practicar <ChevronRight size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {complete && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-brand-line bg-brand-soft px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles size={16} className="text-brand shrink-0" />
              <span className="text-[13px] text-ink">
                Ronda cerrada. Mañana te esperan las que vencen, más una nueva.
              </span>
            </div>
            <button type="button" onClick={restart} className="btn btn-ghost btn-sm shrink-0">
              <RotateCcw size={13} /> Otra vuelta
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
