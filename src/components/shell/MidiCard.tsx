import React, { useEffect, useState } from 'react';
import { Cable, Music4, Play, Zap, AlertCircle, RotateCcw, Footprints } from 'lucide-react';
import { midi } from '../../lib/midi';
import { useMidi } from '../../lib/useMidi';
import { cn } from '../../lib/utils';

/**
 * El instrumento conectado por USB.
 *
 * Antes esto era una línea de texto en la ayuda de la catarata que decía si
 * había algo enchufado. Un teclado como el Kross hace bastante más que mandar
 * notas, y todo eso se elige acá: por qué puerto entra, por cuál sale, si el
 * instrumento tiene que sonar por sus propios parlantes en vez del navegador,
 * y si tiene que seguir el tempo de la app.
 */
export const MidiCard: React.FC = () => {
  const state = useMidi();
  const [prefs, setPrefs] = useState(() => midi.getPrefs());
  const [activo, setActivo] = useState(false);
  const [aprendiendo, setAprendiendo] = useState(false);

  const set = (patch: Partial<typeof prefs>) => { midi.setPrefs(patch); setPrefs(midi.getPrefs()); };

  /* Lucecita de actividad. Se escucha directo al hub en vez de mirar el
     estado: si cada nota disparara un cambio de estado, se volvería a dibujar
     media app en cada tecla que tocás. */
  useEffect(() => {
    let t = 0;
    const blink = () => {
      setActivo(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setActivo(false), 160);
    };
    const a = midi.onNoteOn(blink);
    const b = midi.onCc(blink);
    return () => { a(); b(); window.clearTimeout(t); };
  }, []);

  if (!state.supported) {
    return (
      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
          <Cable size={13} className="text-brand" /> Teclado MIDI
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[11.5px] text-ink-2 leading-snug">
          <AlertCircle size={13} className="shrink-0 mt-0.5 text-ink-3" />
          <span>Este navegador no puede hablar con instrumentos MIDI. En Chrome o Edge sí funciona.</span>
        </div>
      </section>
    );
  }

  const entrada = state.inputs.find(d => d.id === state.inputId);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
          <Cable size={13} className="text-brand" /> Teclado MIDI
        </div>
        <span className={cn('w-1.5 h-1.5 rounded-full transition-colors', activo ? 'bg-ok' : 'bg-white/15')}
              data-tip={activo ? 'Recibiendo' : 'En silencio'} />
      </div>

      {!state.ready ? (
        <div className="space-y-1.5">
          <button type="button" onClick={() => void midi.init()} className="btn btn-secondary w-full">
            <Cable size={14} /> Conectar mi teclado
          </button>
          <p className="text-[11px] text-ink-3 leading-snug px-1">
            El navegador va a preguntarte si dejás que la app hable con tus instrumentos.
          </p>
        </div>
      ) : state.inputs.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[11.5px] text-ink-2 leading-snug">
          No hay ningún instrumento conectado. Enchufá el teclado por USB y prendelo; aparece solo.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl border border-ok/30 bg-ok-soft px-3 py-2 text-[12px] text-ink">
            <span className="font-medium">{entrada?.name ?? 'Instrumento'}</span>
            {entrada?.manufacturer && <span className="text-ink-3"> · {entrada.manufacturer}</span>}
            {state.sustain && <span className="text-brand-2"> · pedal pisado</span>}
            {state.program && (
              <span className="flex items-center gap-2 mt-0.5">
                <span className="text-[10.5px] text-ink-3 font-mono">
                  sonido {state.program.bankMsb}·{state.program.bankLsb}·{state.program.program}
                </span>
                {state.outputs.length > 0 && (
                  <button type="button" onClick={() => midi.recallProgram()} className="btn btn-ghost btn-sm py-0.5"
                          data-tip="Se lo vuelve a pedir al instrumento">
                    <RotateCcw size={11} /> Volver a él
                  </button>
                )}
              </span>
            )}
          </div>

          {state.inputs.length > 1 && (
            <label className="block">
              <span className="block text-[11px] text-ink-2 mb-1">Entra por</span>
              <select value={state.inputId ?? ''} onChange={e => set({ inputId: e.target.value })}
                      className="w-full bg-surface-2 border border-line rounded-lg px-2 py-1.5 text-[12px] text-ink">
                {state.inputs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          )}

          {state.outputs.length > 0 && (
            <>
              <label className="block">
                <span className="block text-[11px] text-ink-2 mb-1">Sale por</span>
                <select value={state.outputId ?? ''} onChange={e => set({ outputId: e.target.value })}
                        className="w-full bg-surface-2 border border-line rounded-lg px-2 py-1.5 text-[12px] text-ink">
                  {state.outputs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>

              <button
                type="button"
                onClick={() => set({ throughOut: !prefs.throughOut })}
                aria-pressed={prefs.throughOut}
                className={cn('w-full flex items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                  prefs.throughOut ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface-2 hover:border-line-strong')}
              >
                <Music4 size={13} className={cn('shrink-0 mt-0.5', prefs.throughOut ? 'text-brand-2' : 'text-ink-3')} />
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium text-ink">Que suene el instrumento</span>
                  <span className="block text-[11px] text-ink-3 leading-snug">
                    {prefs.throughOut
                      ? 'La app le manda las notas y suena con su propio motor.'
                      : 'Hoy suena el navegador. Tu teclado suena mucho mejor.'}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => set({ sendClock: !prefs.sendClock })}
                aria-pressed={prefs.sendClock}
                className={cn('w-full flex items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                  prefs.sendClock ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface-2 hover:border-line-strong')}
              >
                <Zap size={13} className={cn('shrink-0 mt-0.5', prefs.sendClock ? 'text-brand-2' : 'text-ink-3')} />
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium text-ink">Seguir el tempo de la app</span>
                  <span className="block text-[11px] text-ink-3 leading-snug">
                    Le manda el reloj: el arpegiador y las baterías van al tempo de la pieza.
                  </span>
                </span>
              </button>

              {/* Pedal o switch asignable → play/pausa */}
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
                <Footprints size={13} className={cn('shrink-0', prefs.footCc !== null ? 'text-brand-2' : 'text-ink-3')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-ink">Play/pausa con el pie</span>
                  <span className="block text-[11px] text-ink-3 leading-snug">
                    {aprendiendo
                      ? 'Pisá ahora el switch o el pedal asignable…'
                      : prefs.footCc !== null
                        ? `Asignado al control ${prefs.footCc}.`
                        : 'Con las dos manos ocupadas, parar con el pie.'}
                  </span>
                </span>
                {prefs.footCc !== null && !aprendiendo && (
                  <button type="button" onClick={() => set({ footCc: null })} className="btn btn-ghost btn-sm shrink-0">Quitar</button>
                )}
                <button
                  type="button"
                  disabled={aprendiendo}
                  onClick={async () => {
                    setAprendiendo(true);
                    await midi.learnFootSwitch();
                    setPrefs(midi.getPrefs());
                    setAprendiendo(false);
                  }}
                  className={cn('btn btn-sm shrink-0', aprendiendo ? 'btn-primary animate-pulse' : 'btn-secondary')}
                >
                  {aprendiendo ? 'Esperando…' : 'Aprender'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  Canal
                  <select value={prefs.channel} onChange={e => set({ channel: Number(e.target.value) })}
                          className="bg-surface-2 border border-line rounded-lg px-1.5 py-1 text-[11.5px] font-mono text-ink">
                    {Array.from({ length: 16 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-ink-2" data-tip="Si el instrumento llega tarde, adelantalo unos milisegundos">
                  Desfase
                  <input type="number" min={-100} max={100} step={5} value={prefs.latencyMs}
                         onChange={e => set({ latencyMs: Number(e.target.value) })}
                         className="w-14 bg-surface-2 border border-line rounded-lg px-1.5 py-1 text-[11.5px] font-mono text-ink" />
                  <span className="text-ink-3">ms</span>
                </label>
                <button type="button" onClick={() => midi.playNote(60, 0.85, 0.7)}
                        className="btn btn-ghost btn-sm ml-auto" data-tip="Manda un Do al instrumento">
                  <Play size={12} /> Probar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {state.error && <p className="text-[11px] text-danger">{state.error}</p>}
    </section>
  );
};
