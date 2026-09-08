import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, Minus, Plus, RotateCcw, Check, X, TrendingUp, TrendingDown,
  Gauge, Hand, AlertTriangle, ChevronRight, Timer, Activity, Lightbulb, Info,
} from 'lucide-react';
import * as Tone from 'tone';
import {
  SPEED_LADDER, RHYTHM_VARIANTS, SPEED_DRILLS, TECHNIQUE_CHECKS, type Drill,
} from '../lib/practiceLibrary';
import { cn } from '../lib/utils';

interface Props { onScoreGain?: (points: number) => void }

const LEVEL_STYLE: Record<Drill['level'], string> = {
  Base: 'text-ok', Intermedio: 'text-brand-2', Avanzado: 'text-warn',
};

const LADDER_KEY = 'pianomaster_speed_ladder_v1';

interface LadderState { bpm: number; clean: number; best: number }

const loadLadder = (): LadderState => {
  try {
    const raw = localStorage.getItem(LADDER_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (typeof v?.bpm === 'number') return { bpm: v.bpm, clean: v.clean ?? 0, best: v.best ?? v.bpm };
    }
  } catch { /* sin storage */ }
  return { bpm: 72, clean: 0, best: 72 };
};

/**
 * Velocidad y técnica.
 *
 * Las dos cosas que ningún gimnasio de la app cubría, y son las que deciden si
 * lo demás sirve. La velocidad no se practica tocando rápido: se practica
 * subiendo de a poco desde una velocidad donde no te equivocás, y bajando
 * apenas aparece un error. Eso es lo que hace la escalera, y por eso la regla
 * está fuera del criterio del día: 8 limpias suben 4, un error baja 8.
 */
export const SpeedTechniqueGym: React.FC<Props> = ({ onScoreGain }) => {
  const [tab, setTab] = useState<'escalera' | 'ritmos' | 'tecnica'>('escalera');

  /* ---------------- Metrónomo ---------------- */
  const [ladder, setLadder] = useState<LadderState>(loadLadder);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const [accent, setAccent] = useState(4);
  const loopRef = useRef<Tone.Loop | null>(null);
  const synthRef = useRef<Tone.MembraneSynth | null>(null);

  const persist = useCallback((s: LadderState) => {
    setLadder(s);
    try { localStorage.setItem(LADDER_KEY, JSON.stringify(s)); } catch { /* sin storage */ }
  }, []);

  const stop = useCallback(() => {
    loopRef.current?.stop(0); loopRef.current?.dispose(); loopRef.current = null;
    synthRef.current?.dispose(); synthRef.current = null;
    Tone.getTransport().stop();
    setRunning(false); setBeat(0);
  }, []);
  useEffect(() => () => stop(), [stop]);

  const start = async () => {
    if (running) { stop(); return; }
    await Tone.start();
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.008, octaves: 4,
      envelope: { attack: 0.001, decay: 0.22, sustain: 0 },
    }).toDestination();
    synth.volume.value = -8;
    synthRef.current = synth;

    let i = 0;
    const loop = new Tone.Loop(time => {
      const fuerte = i % accent === 0;
      synth.triggerAttackRelease(fuerte ? 'C3' : 'G2', '32n', time);
      const b = i % accent;
      Tone.getDraw().schedule(() => setBeat(b), time);
      i++;
    }, '4n');
    loopRef.current = loop;
    Tone.getTransport().bpm.value = ladder.bpm;
    loop.start(0);
    Tone.getTransport().start();
    setRunning(true);
  };

  useEffect(() => { if (running) Tone.getTransport().bpm.value = ladder.bpm; }, [ladder.bpm, running]);

  const setBpm = (bpm: number) => persist({ ...ladder, bpm: Math.max(30, Math.min(240, bpm)) });

  /** Una pasada limpia: a las 8, sube 4 BPM. */
  const markClean = () => {
    const clean = ladder.clean + 1;
    if (clean >= 8) {
      const bpm = Math.min(240, ladder.bpm + 4);
      persist({ bpm, clean: 0, best: Math.max(ladder.best, bpm) });
      onScoreGain?.(60);
    } else {
      persist({ ...ladder, clean });
      onScoreGain?.(10);
    }
  };
  /** Un error: baja 8 BPM y el contador vuelve a cero. */
  const markError = () => persist({ ...ladder, bpm: Math.max(30, ladder.bpm - 8), clean: 0 });

  const [openDrill, setOpenDrill] = useState<string | null>(SPEED_DRILLS[0].id);
  const [openCheck, setOpenCheck] = useState<string | null>(TECHNIQUE_CHECKS[0].id);
  const [checked, setChecked] = useState<string[]>([]);

  const pct = useMemo(() => Math.round((ladder.clean / 8) * 100), [ladder.clean]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="eyebrow">Velocidad y técnica</div>
          <h2 className="font-serif font-semibold text-2xl text-ink leading-tight">Rápido se aprende despacio</h2>
          <p className="text-[13px] text-ink-2 max-w-2xl leading-relaxed">
            La velocidad no sale de tocar rápido: sale de repetir aciertos. Acá está la escalera que decide por vos
            cuándo subir, las variantes de ritmo que rompen el automatismo, y el chequeo de técnica que evita que
            practiques durante meses un movimiento que no escala.
          </p>
        </div>
      </header>

      <div className="seg w-full sm:w-auto sm:inline-flex min-w-0">
        {([
          ['escalera', 'Escalera', ' del metrónomo', Gauge],
          ['ritmos', 'Ritmos', ': variantes', Activity],
          ['tecnica', 'Técnica', ' correcta', Hand],
        ] as const).map(([id, corto, resto, Icon]) => (
          <button
            key={id} type="button" data-active={tab === id} onClick={() => setTab(id)}
            className="seg-item flex-1 min-w-0 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Icon size={13} className="shrink-0" />
            <span>{corto}<span className="hidden md:inline">{resto}</span></span>
          </button>
        ))}
      </div>

      {/* ============ Escalera ============ */}
      {tab === 'escalera' && (
        <div className="space-y-4">
          <section className="card p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
              {/* Metrónomo */}
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <button type="button" onClick={() => setBpm(ladder.bpm - 1)} className="btn btn-ghost btn-icon" aria-label="Bajar 1 BPM"><Minus size={16} /></button>
                  <div className="text-center">
                    <div className="font-mono font-bold text-[52px] leading-none text-ink tabular-nums">{ladder.bpm}</div>
                    <div className="text-[11px] uppercase tracking-wider text-ink-3">BPM</div>
                  </div>
                  <button type="button" onClick={() => setBpm(ladder.bpm + 1)} className="btn btn-ghost btn-icon" aria-label="Subir 1 BPM"><Plus size={16} /></button>
                </div>

                <input
                  type="range" min={30} max={208} value={ladder.bpm}
                  onChange={e => setBpm(Number(e.target.value))}
                  aria-label="Tempo"
                  className="w-full accent-[var(--color-brand)]"
                />

                <div className="flex items-center justify-center gap-2">
                  {Array.from({ length: accent }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'w-2.5 h-2.5 rounded-full transition-all duration-75',
                        running && beat === i ? (i === 0 ? 'bg-brand scale-150' : 'bg-ink-2 scale-125') : 'bg-white/12'
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button type="button" onClick={start} className={cn('btn', running ? 'btn-primary' : 'btn-secondary')}>
                    {running ? <Pause size={15} /> : <Play size={15} className="fill-current" />} {running ? 'Parar' : 'Arrancar'}
                  </button>
                  <div className="seg">
                    {[2, 3, 4, 6].map(a => (
                      <button key={a} type="button" data-active={accent === a} onClick={() => setAccent(a)} className="seg-item w-8" data-tip={`Acentuar cada ${a}`}>{a}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contador de la escalera */}
              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-surface-2 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Pasadas limpias</span>
                    <span className="font-mono text-[13px] text-ink">{ladder.clean} / 8</span>
                  </div>
                  <div className="progress"><div style={{ width: `${pct}%` }} /></div>
                  <div className="flex gap-2">
                    <button type="button" onClick={markClean} className="btn btn-primary btn-sm flex-1">
                      <Check size={14} /> Salió limpia
                    </button>
                    <button type="button" onClick={markError} className="btn btn-secondary btn-sm flex-1">
                      <X size={14} /> Me trabé
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                    <TrendingUp size={11} className="text-ok" /> 8 limpias → +4 BPM
                    <span className="mx-1">·</span>
                    <TrendingDown size={11} className="text-danger" /> 1 error → −8 BPM
                  </div>
                </div>

                <div className="rounded-xl border border-brand-line bg-brand-soft p-3 space-y-1">
                  <div className="text-[10.5px] uppercase tracking-wider text-brand-2 font-semibold">Tu récord</div>
                  <div className="font-mono text-[20px] text-ink leading-none">{ladder.best} BPM</div>
                  <div className="text-[11px] text-ink-3 leading-snug">
                    Mañana arrancá 8 BPM abajo de tu récord, no en el récord.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => persist({ bpm: 72, clean: 0, best: ladder.best })}
                  className="btn btn-ghost btn-sm w-full"
                >
                  <RotateCcw size={13} /> Reiniciar la sesión
                </button>
              </div>
            </div>
          </section>

          <section className="card-2 p-4 space-y-2.5">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-brand shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-[12.5px] text-ink-2 leading-relaxed">
                <p><strong className="text-ink">Por qué funciona.</strong> {SPEED_LADDER.why}</p>
                <p><strong className="text-ink">Dónde arrancar.</strong> {SPEED_LADDER.start}</p>
                <p className="flex items-start gap-1.5">
                  <AlertTriangle size={12} className="text-warn shrink-0 mt-0.5" />
                  <span>{SPEED_LADDER.ceiling}</span>
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Timer size={15} className="text-brand" />
              <h3 className="font-serif font-semibold text-[15px] text-ink">Ejercicios de velocidad</h3>
            </div>
            {SPEED_DRILLS.map(d => {
              const open = openDrill === d.id;
              return (
                <div key={d.id} className={cn('card overflow-hidden transition-colors', open && 'border-brand-line')}>
                  <button type="button" onClick={() => setOpenDrill(open ? null : d.id)} aria-expanded={open}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors">
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
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
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
        </div>
      )}

      {/* ============ Ritmos ============ */}
      {tab === 'ritmos' && (
        <div className="space-y-4">
          <section className="card-2 p-4 flex items-start gap-2 text-[12.5px] text-ink-2 leading-relaxed">
            <Lightbulb size={14} className="text-brand shrink-0 mt-0.5" />
            <span>
              Sobre el <strong className="text-ink">mismo</strong> pasaje que ya te sale. Cambiar el agrupamiento
              obliga al cerebro a reconstruir el movimiento en vez de repetirlo en automático: la mano cree que está
              aprendiendo otra cosa y en realidad está afinando la misma. Un minuto por variante alcanza.
            </span>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RHYTHM_VARIANTS.map(v => (
              <div key={v.id} className="card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[13.5px] font-medium text-ink">{v.name}</h4>
                  <span className="badge badge-neutral font-mono text-[11px]">{v.pattern}</span>
                </div>
                <p className="text-[12.5px] text-ink-2 leading-relaxed">{v.why}</p>
              </div>
            ))}
          </div>

          <section className="card p-4 space-y-2">
            <h4 className="text-[13.5px] font-medium text-ink">El orden que rinde</h4>
            <ol className="space-y-1.5 list-decimal list-inside text-[12.5px] text-ink-2 leading-relaxed marker:text-brand marker:font-mono">
              <li>Una pasada parejo, al tempo de trabajo, para ver dónde está el problema.</li>
              <li>Punteado largo-corto, dos pasadas.</li>
              <li>Punteado corto-largo, dos pasadas. Este es el que cuesta.</li>
              <li>Una pasada parejo otra vez. Ahí se nota la diferencia.</li>
              <li>Si sigue trabado en el mismo lugar, el problema es la digitación, no la velocidad.</li>
            </ol>
          </section>
        </div>
      )}

      {/* ============ Técnica ============ */}
      {tab === 'tecnica' && (
        <div className="space-y-3">
          <section className="card-2 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2 text-[12.5px] text-ink-2 leading-relaxed min-w-0">
              <Hand size={14} className="text-brand shrink-0 mt-0.5" />
              <span>
                Ocho puntos. Cada uno trae qué tiene que pasar, cuál es el error concreto y cómo comprobarlo solo,
                sin profesor al lado. Revisalos de a uno por semana, no todos juntos.
              </span>
            </div>
            <span className="font-mono text-[12px] text-brand-2 shrink-0">{checked.length} / {TECHNIQUE_CHECKS.length}</span>
          </section>

          {TECHNIQUE_CHECKS.map(c => {
            const open = openCheck === c.id;
            const ok = checked.includes(c.id);
            return (
              <div key={c.id} className={cn('card overflow-hidden transition-colors', open && 'border-brand-line')}>
                <div className="flex items-center gap-2 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setChecked(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                    aria-pressed={ok}
                    aria-label={`Marcar ${c.title}`}
                    className={cn('shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-colors',
                      ok ? 'bg-ok-soft border-ok/50 text-ok' : 'border-line text-ink-3 hover:border-line-strong')}
                  >
                    <Check size={13} />
                  </button>
                  <button type="button" onClick={() => setOpenCheck(open ? null : c.id)} aria-expanded={open}
                    className="min-w-0 flex-1 flex items-center gap-2 text-left">
                    <span className={cn('text-[13.5px] font-medium', ok ? 'text-ink-2' : 'text-ink')}>{c.title}</span>
                    <ChevronRight size={14} className={cn('ml-auto text-ink-3 shrink-0 transition-transform', open && 'rotate-90')} />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                      <div className="px-3 pb-4 grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div className="rounded-xl border border-ok/30 bg-ok-soft p-3 space-y-1">
                          <div className="text-[10.5px] uppercase tracking-wider text-ok font-semibold">Así va</div>
                          <p className="text-[12px] text-ink-2 leading-relaxed">{c.right}</p>
                        </div>
                        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 space-y-1">
                          <div className="text-[10.5px] uppercase tracking-wider text-danger font-semibold">El error</div>
                          <p className="text-[12px] text-ink-2 leading-relaxed">{c.wrong}</p>
                        </div>
                        <div className="rounded-xl border border-brand-line bg-brand-soft p-3 space-y-1">
                          <div className="text-[10.5px] uppercase tracking-wider text-brand-2 font-semibold">Cómo comprobarlo</div>
                          <p className="text-[12px] text-ink-2 leading-relaxed">{c.test}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
