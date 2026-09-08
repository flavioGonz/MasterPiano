import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, RotateCcw, Hand, Flame, Lightbulb, Target, CheckCircle2,
  ChevronRight, GraduationCap, AlertCircle, Layers, Music2, Waves, Trophy,
} from 'lucide-react';
import * as Tone from 'tone';
import {
  ARPEGGIO_TYPES, ARPEGGIO_DRILLS, buildArpeggio, type Drill,
} from '../lib/practiceLibrary';
import {
  ALL_SCALE_ROOTS, preferredRootName, keyName, spellChordNotes, ENHARMONIC_MAP,
} from '../lib/musicGymTheory';
import { Piano } from './Piano';
import { AcousticPianoListener } from './AcousticPianoListener';
import { WaterfallDemoModal } from './WaterfallDemoModal';
import { buildWaterfallFromNotesList } from '../lib/midiWaterfall';
import { pianoPitchDetector } from '../lib/pitchDetector';
import { maestroVoice } from '../lib/speech';
import { cn } from '../lib/utils';

interface ArpeggiosGymProps {
  onScoreGain?: (points: number) => void;
}

const LEVEL_STYLE: Record<Drill['level'], string> = {
  Base: 'text-ok',
  Intermedio: 'text-brand-2',
  Avanzado: 'text-warn',
};

/**
 * Gimnasio de arpegios.
 *
 * Faltaba entero: la app enseñaba escalas, tríadas e inversiones, pero el
 * arpegio —que es la tríada desplegada y lo que aparece en el 90 % de los
 * acompañamientos— no estaba por ningún lado.
 *
 * Lo importante acá no es tocar las notas: es que la mano se arme UNA vez y
 * después viaje. Por eso el primer ejercicio es en bloque y recién después
 * quebrado, y por eso la digitación es por tonalidad y no una sola para las
 * doce (el pulgar no pisa teclas negras).
 */
export const ArpeggiosGym: React.FC<ArpeggiosGymProps> = ({ onScoreGain }) => {
  const [rootPc, setRootPc] = useState(0);
  const [typeId, setTypeId] = useState('major');
  const [octaves, setOctaves] = useState(2);
  const [hand, setHand] = useState<'right' | 'left'>('right');
  const [inversion, setInversion] = useState(0);
  const [showFingers, setShowFingers] = useState(true);
  const [waterfallOpen, setWaterfallOpen] = useState(false);
  const [micOpen, setMicOpen] = useState(false);
  const [openDrill, setOpenDrill] = useState<string | null>(ARPEGGIO_DRILLS[0].id);

  const type = ARPEGGIO_TYPES.find(t => t.id === typeId) ?? ARPEGGIO_TYPES[0];
  const rootName = useMemo(
    () => preferredRootName(rootPc, typeId === 'minor' ? 'minor_natural' : 'major'),
    [rootPc, typeId]
  );

  const plan = useMemo(
    () => buildArpeggio(keyName(rootPc), typeId, octaves, hand === 'left' ? 2 : 3),
    [rootPc, typeId, octaves, hand]
  );

  /* Rotar la posición: la misma forma empezando por la tercera o la quinta.
     Es lo que pasa en la música real, donde el arpegio casi nunca empieza en
     la fundamental. */
  const rotated = useMemo(() => {
    if (inversion === 0) return plan;
    const per = type.intervals.length;
    const notes = plan.notes.slice(inversion);
    const right = plan.right.slice(inversion);
    const left = plan.left.slice(inversion);
    // Se completa arriba con las notas que faltan para cerrar la octava
    for (let i = 0; i < inversion; i++) {
      const src = plan.notes[per * octaves - inversion + i + 1] ?? plan.notes[plan.notes.length - 1];
      const m = /^([A-G]#?)(-?\d+)$/.exec(src);
      notes.push(m ? `${m[1]}${Number(m[2]) + 1}` : src);
      right.push(right[right.length - 1]);
      left.push(left[left.length - 1]);
    }
    return { ...plan, notes, right, left };
  }, [plan, inversion, type, octaves]);

  /** Nombres escritos como corresponde (Mi♭ y no Re♯). */
  const spelled = useMemo(() => {
    const base = spellChordNotes(rootName, rotated.notes.map(n => n.replace(/\d/g, '')));
    return rotated.notes.map((n, i) => base[i] ?? n.replace(/\d/g, ''));
  }, [rootName, rotated]);

  const fingers = hand === 'right' ? rotated.right : rotated.left;
  const fingerGuide = useMemo(() => {
    const g: Record<string, number> = {};
    rotated.notes.forEach((n, i) => { if (fingers[i] !== undefined && g[n] === undefined) g[n] = fingers[i]; });
    return g;
  }, [rotated, fingers]);

  /* ---------------- Camino: tocar el arpegio nota por nota ---------------- */
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => { setStep(0); setDone([]); setComplete(false); setError(false); }, [rootPc, typeId, octaves, hand, inversion]);

  const restart = () => { setStep(0); setDone([]); setComplete(false); setError(false); };

  const onNotePlay = useCallback((note: string) => {
    if (complete) return;
    const target = rotated.notes[step];
    if (!target) return;
    const a = note.replace(/\d/g, ''), b = target.replace(/\d/g, '');
    const hit = a === b || ENHARMONIC_MAP[a] === b || ENHARMONIC_MAP[b] === a;
    if (hit) {
      setError(false);
      setDone(prev => [...prev, step]);
      if (step + 1 >= rotated.notes.length) {
        setComplete(true);
        setScore(s => s + 120);
        onScoreGain?.(120);
        maestroVoice.speak(`Muy bien. Arpegio de ${rootName} ${type.name} completo. Ahora hacelo otra vez mirando el codo, no la mano.`);
      } else setStep(s => s + 1);
    } else {
      setError(true);
      window.setTimeout(() => setError(false), 700);
    }
  }, [complete, rotated, step, rootName, type, onScoreGain]);

  useEffect(() => pianoPitchDetector.subscribeNoteOnset(info => onNotePlay(info.note)), [onNotePlay]);

  /* ---------------- Demo ---------------- */
  const [playing, setPlaying] = useState(false);
  const [blockMode, setBlockMode] = useState(false);
  const timer = useRef<number | null>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);

  const stopDemo = useCallback(() => {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    synthRef.current?.dispose();
    synthRef.current = null;
    setPlaying(false);
  }, []);
  useEffect(() => () => stopDemo(), [stopDemo]);
  useEffect(() => { stopDemo(); }, [rootPc, typeId, octaves, inversion, stopDemo]);

  const playDemo = async () => {
    if (playing) { stopDemo(); return; }
    await Tone.start();
    setPlaying(true);
    const synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.35, release: 0.7 },
    }).toDestination();
    synth.volume.value = -6;
    synthRef.current = synth;

    if (blockMode) {
      // En bloque: el acorde entero, para que la mano se arme antes de desplegar
      const per = type.intervals.length;
      synth.triggerAttackRelease(rotated.notes.slice(0, per), '1n');
      window.setTimeout(() => stopDemo(), 1600);
      return;
    }
    let i = 0;
    timer.current = window.setInterval(() => {
      if (i >= rotated.notes.length) { stopDemo(); return; }
      synth.triggerAttackRelease(rotated.notes[i], '8n');
      setStep(i);
      i++;
    }, 360);
  };

  const waterfallNotes = useMemo(
    () => buildWaterfallFromNotesList(rotated.notes, fingerGuide, 84),
    [rotated, fingerGuide]
  );

  const posLabel = inversion === 0 ? 'Posición fundamental' : inversion === 1 ? '1ª inversión' : inversion === 2 ? '2ª inversión' : '3ª inversión';
  const maxInv = type.intervals.length - 1;

  return (
    <div className="space-y-5">
      {/* ---------- Encabezado ---------- */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="eyebrow">Gimnasio de arpegios</div>
          <h2 className="font-serif font-semibold text-2xl text-ink leading-tight">
            La tríada, desplegada
          </h2>
          <p className="text-[13px] text-ink-2 max-w-2xl leading-relaxed">
            Un arpegio no es una escala rara: es un acorde tocado nota por nota. Lo que se entrena acá no son los
            dedos, es que la mano se arme <strong className="text-ink">una vez</strong> y después viaje con el brazo.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-mono text-brand-2 bg-brand-soft px-3 py-1.5 rounded-xl border border-brand-line">
            <Trophy size={13} /> {score} pts
          </div>
        </div>
      </header>

      {/* ---------- Configuración ---------- */}
      <section className="card p-4 md:p-5 space-y-4">
        {/* Tónica */}
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Tónica</div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SCALE_ROOTS.map(r => {
              const name = preferredRootName(r.pc, typeId === 'minor' ? 'minor_natural' : 'major');
              const active = rootPc === r.pc;
              return (
                <button
                  key={r.pc}
                  type="button"
                  onClick={() => setRootPc(r.pc)}
                  aria-pressed={active}
                  className={cn(
                    'min-w-[46px] rounded-lg border px-2 py-1.5 font-mono text-[12.5px] transition-colors',
                    active
                      ? 'bg-brand border-brand text-brand-ink font-semibold'
                      : r.isBlack
                        ? 'bg-surface-3 border-line text-ink-2 hover:text-ink'
                        : 'bg-surface-2 border-line text-ink-2 hover:text-ink'
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calidad */}
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Calidad</div>
          <div className="flex flex-wrap gap-1.5">
            {ARPEGGIO_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTypeId(t.id); setInversion(0); }}
                aria-pressed={typeId === t.id}
                data-tip={t.sound}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                  typeId === t.id
                    ? 'bg-brand-soft border-brand-line text-brand-2'
                    : 'bg-surface-2 border-line text-ink-2 hover:text-ink hover:border-line-strong'
                )}
              >
                {t.name}
                <span className="ml-1.5 font-mono text-[10px] text-ink-3">{t.family === 'Tríada' ? '3' : '4'} notas</span>
              </button>
            ))}
          </div>
        </div>

        {/* Octavas · posición · mano */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-3">Octavas</span>
            <div className="seg">
              {[1, 2, 3].map(o => (
                <button key={o} type="button" data-active={octaves === o} onClick={() => setOctaves(o)} className="seg-item w-9">{o}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-3">Posición</span>
            <div className="seg">
              {Array.from({ length: maxInv + 1 }, (_, i) => (
                <button
                  key={i} type="button" data-active={inversion === i} onClick={() => setInversion(i)}
                  className="seg-item px-2.5"
                  data-tip={i === 0 ? 'Empieza en la fundamental' : `Empieza en la ${i === 1 ? 'tercera' : i === 2 ? 'quinta' : 'séptima'}`}
                >
                  {i === 0 ? 'Fund.' : `${i}ª`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-3">Mano</span>
            <div className="seg">
              {(['right', 'left'] as const).map(h => (
                <button key={h} type="button" data-active={hand === h} onClick={() => { setHand(h); restart(); }} className="seg-item flex items-center gap-1.5">
                  <Hand size={12} className={h === 'left' ? 'scale-x-[-1]' : ''} /> {h === 'right' ? 'Derecha' : 'Izquierda'}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-2 cursor-pointer">
            <input type="checkbox" checked={showFingers} onChange={e => setShowFingers(e.target.checked)} className="accent-[var(--color-brand)]" />
            Números de dedo
          </label>
        </div>

        {/* Identidad + acciones */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-line">
          <div className="min-w-0 space-y-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h3 className="font-serif font-semibold text-lg text-ink">
                {rootName}{type.symbol} · {type.name}
              </h3>
              <span className="badge badge-brand font-mono">{posLabel}</span>
              <span className="text-[12px] text-ink-3">{octaves} {octaves === 1 ? 'octava' : 'octavas'}</span>
            </div>
            <p className="text-[12.5px] text-ink-2 leading-relaxed">{type.sound}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="seg">
              <button type="button" data-active={!blockMode} onClick={() => setBlockMode(false)} className="seg-item" data-tip="Nota por nota">Quebrado</button>
              <button type="button" data-active={blockMode} onClick={() => setBlockMode(true)} className="seg-item" data-tip="Las notas juntas, como acorde">Bloque</button>
            </div>
            <button type="button" onClick={playDemo} className={cn('btn btn-sm', playing ? 'btn-primary' : 'btn-secondary')}>
              {playing ? <Pause size={14} /> : <Play size={14} className="fill-current" />} Oír
            </button>
            <button type="button" id="btn-arpeggios-waterfall" onClick={() => { stopDemo(); setWaterfallOpen(true); }} className="btn btn-secondary btn-sm">
              <Flame size={14} className="text-orange-400" /> Catarata
            </button>
            <button
              type="button"
              onClick={() => maestroVoice.speak(`Arpegio de ${rootName} ${type.name}. ${type.tip} Se usa en: ${type.where}`)}
              className="btn btn-ghost btn-sm" data-tip="Escuchar el consejo del Maestro"
            >
              <GraduationCap size={14} /> <span className="hidden sm:inline">Maestro</span>
            </button>
          </div>
        </div>
      </section>

      {/* ---------- El arpegio nota por nota ---------- */}
      <section className="card p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Target size={15} className="text-brand" />
            <h3 className="font-serif font-semibold text-[15px] text-ink">Tocá el arpegio</h3>
            <span className="text-[11.5px] text-ink-3">
              {complete ? '¡Completo!' : `nota ${Math.min(step + 1, rotated.notes.length)} de ${rotated.notes.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={restart} className="btn btn-ghost btn-sm"><RotateCcw size={13} /> Reiniciar</button>
            <button type="button" onClick={() => setMicOpen(v => !v)} className={cn('btn btn-sm', micOpen ? 'btn-primary' : 'btn-ghost')} data-tip="Tocá en tu piano acústico y la app escucha">
              <Waves size={13} /> Micrófono
            </button>
          </div>
        </div>

        {/* Fichas de nota */}
        <div className="flex flex-wrap gap-2">
          {rotated.notes.map((n, i) => {
            const state = complete || done.includes(i) ? 'done' : i === step ? 'current' : 'todo';
            return (
              <motion.div
                key={`${n}-${i}`}
                animate={state === 'current' ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={state === 'current' ? { repeat: Infinity, duration: 1.5 } : { duration: 0.2 }}
                className={cn(
                  'min-w-[62px] rounded-xl border px-2.5 py-2 text-center transition-colors',
                  state === 'done' ? 'border-ok/40 bg-ok-soft'
                    : state === 'current' ? (error ? 'border-danger bg-danger-soft' : 'border-brand bg-brand-soft')
                      : 'border-line bg-surface-2'
                )}
              >
                <div className={cn('font-mono text-[15px] leading-tight', state === 'todo' ? 'text-ink-2' : 'text-ink')}>
                  {spelled[i]}
                </div>
                {showFingers && (
                  <div className={cn('text-[10.5px] leading-tight mt-0.5', state === 'current' ? 'text-brand-2' : 'text-ink-3')}>
                    dedo {fingers[i]}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Aclaración de digitación */}
        <div className="flex items-start gap-2 text-[11.5px] text-ink-3 leading-snug">
          <AlertCircle size={12} className={cn('shrink-0 mt-0.5', rotated.suggested && 'text-warn')} />
          <span>{rotated.note}</span>
        </div>

        {complete && (
          <div className="flex items-center gap-2 rounded-xl border border-ok/40 bg-ok-soft px-3 py-2.5 text-[12.5px] text-ink-2">
            <CheckCircle2 size={15} className="text-ok shrink-0" />
            <span>
              Salió. Ahora repetilo mirando el codo en vez de la mano: si el codo no se mueve, estás estirando los dedos
              y el arpegio se va a trabar en cuanto subas la velocidad.
            </span>
          </div>
        )}

        <Piano
          activeNotes={complete ? rotated.notes : [rotated.notes[step]].filter(Boolean)}
          correctNotes={done.map(i => rotated.notes[i])}
          fingerGuide={fingerGuide}
          showFingerGuide={showFingers}
          showFingerGuideToggle={false}
          showIntervalColorToggle={false}
          showSoundSelector={false}
          showSplitToggle={false}
          onNotePlay={onNotePlay}
          compact
        />

        {micOpen && <AcousticPianoListener />}
      </section>

      {/* ---------- Dónde se usa ---------- */}
      <section className="card-2 p-4 flex flex-col md:flex-row md:items-center gap-3">
        <Music2 size={16} className="text-brand shrink-0" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-[12.5px] text-ink"><strong>Dónde aparece:</strong> {type.where}</div>
          <div className="text-[12.5px] text-ink-2 flex items-start gap-1.5">
            <Lightbulb size={12} className="text-brand shrink-0 mt-0.5" />
            <span>{type.tip}</span>
          </div>
        </div>
      </section>

      {/* ---------- Ejercicios ---------- */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-brand" />
          <h3 className="font-serif font-semibold text-[15px] text-ink">Ejercicios</h3>
          <span className="text-[11.5px] text-ink-3">de menos a más; no pases al siguiente hasta que el anterior salga cómodo</span>
        </div>

        {ARPEGGIO_DRILLS.map(d => {
          const open = openDrill === d.id;
          return (
            <div key={d.id} className={cn('card overflow-hidden transition-colors', open && 'border-brand-line')}>
              <button
                type="button"
                onClick={() => setOpenDrill(open ? null : d.id)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors"
              >
                <ChevronRight size={14} className={cn('text-ink-3 shrink-0 transition-transform', open && 'rotate-90')} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-ink">{d.title}</div>
                  <div className="text-[11.5px] text-ink-3 truncate">{d.goal}</div>
                </div>
                <span className={cn('text-[10.5px] font-mono shrink-0', LEVEL_STYLE[d.level])}>{d.level}</span>
                <span className="hidden sm:inline text-[10.5px] font-mono text-ink-3 shrink-0">{d.dose}</span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <ol className="px-4 pb-4 pt-1 space-y-1.5 list-decimal list-inside text-[12.5px] text-ink-2 leading-relaxed marker:text-brand marker:font-mono">
                      {d.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </section>

      {waterfallOpen && (
        <WaterfallDemoModal
          isOpen={waterfallOpen}
          onClose={() => setWaterfallOpen(false)}
          title={`Arpegio de ${rootName}${type.symbol} — ${posLabel}`}
          subtitle={`${type.name} · ${octaves} ${octaves === 1 ? 'octava' : 'octavas'} · digitación de mano ${hand === 'right' ? 'derecha' : 'izquierda'}`}
          composer="Gimnasio de arpegios"
          bpm={84}
          notes={waterfallNotes}
          initialHand={hand}
        />
      )}
    </div>
  );
};
