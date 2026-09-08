import React, { useState } from 'react';
import { Cable, Music4, Play, Zap, AlertCircle, RotateCcw, Footprints, Bookmark, Plus, X, Pencil } from 'lucide-react';
import { midi, type KrossPreset } from '../../lib/midi';
import { useMidi } from '../../lib/useMidi';
import { cn } from '../../lib/utils';

/**
 * Las propiedades del instrumento conectado por USB.
 *
 * Un teclado como el Kross hace bastante más que mandar notas, y todo eso se
 * elige acá: por qué puerto entra, por cuál sale, si el instrumento tiene que
 * sonar por sus propios parlantes en vez del navegador, si tiene que seguir el
 * tempo de la app y qué pedal hace play/pausa.
 *
 * Vive detrás del icono de teclado de la barra superior (`MidiButton`), que es
 * donde se mira cuando el instrumento no responde y uno quiere saber por qué.
 */
export const MidiPanel: React.FC = () => {
  const state = useMidi();
  const [prefs, setPrefs] = useState(() => midi.getPrefs());
  const [aprendiendo, setAprendiendo] = useState(false);

  const set = (patch: Partial<typeof prefs>) => { midi.setPrefs(patch); setPrefs(midi.getPrefs()); };

  if (!state.supported) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[11.5px] text-ink-2 leading-snug">
        <AlertCircle size={13} className="shrink-0 mt-0.5 text-ink-3" />
        <span>Este navegador no puede hablar con instrumentos MIDI. En Chrome o Edge sí funciona.</span>
      </div>
    );
  }

  const entrada = state.inputs.find(d => d.id === state.inputId);

  return (
    <div className="space-y-2">

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

              <SonidosGuardados onChange={() => setPrefs(midi.getPrefs())} />

              <div className="flex items-center gap-2 flex-wrap">
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
    </div>
  );
};

/**
 * Los sonidos del Kross, guardados con nombre.
 *
 * El teclado se cambia de sonido con tres números (banco grueso, banco fino y
 * programa) que no le dicen nada a nadie. Acá se hace una vez el trabajo de
 * ponerles nombre: se gira el dial del Kross hasta el sonido que uno quiere,
 * se aprieta "Guardar el que está sonando" y queda como "Rhodes" o "Pad".
 * Después, en la catarata, cada pista se elige por ese nombre.
 *
 * Para quien tenga el banco y el programa anotados, está la carga a mano.
 */
const SonidosGuardados: React.FC<{ onChange: () => void }> = ({ onChange }) => {
  const [lista, setLista] = useState<KrossPreset[]>(() => midi.presets());
  const [nombre, setNombre] = useState('');
  const [aMano, setAMano] = useState(false);
  const [msb, setMsb] = useState(0);
  const [lsb, setLsb] = useState(0);
  const [prg, setPrg] = useState(0);

  const refrescar = () => { setLista([...midi.presets()]); onChange(); };
  const actual = midi.pendingCapture();

  const guardar = () => {
    const n = nombre.trim();
    if (!n) return;
    if (aMano) midi.addPreset(n, msb, lsb, prg);
    else if (!midi.capturePreset(n)) return;
    setNombre('');
    refrescar();
  };

  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 space-y-2">
      <div className="flex items-center gap-1.5">
        <Bookmark size={13} className="text-ink-3 shrink-0" />
        <span className="text-[12px] font-medium text-ink whitespace-nowrap">Sonidos guardados</span>
        <button type="button" onClick={() => setAMano(v => !v)}
                aria-label={aMano ? 'Tomar el sonido del teclado' : 'Cargar el banco y el programa a mano'}
                className="btn btn-ghost btn-sm ml-auto py-0.5 shrink-0 whitespace-nowrap"
                data-tip={aMano ? 'Tomar el sonido que tenga puesto el teclado' : 'Cargar el banco y el programa a mano'}>
          <Pencil size={11} /> {aMano ? 'Del teclado' : 'A mano'}
        </button>
      </div>

      {lista.length > 0 && (
        <ul className="space-y-1">
          {lista.map(p => (
            <li key={p.id} className="flex items-center gap-1.5">
              <button type="button" onClick={() => { midi.applyPreset(p.id); }}
                      className="btn btn-ghost btn-sm flex-1 justify-start min-w-0 py-0.5"
                      data-tip="Ponerlo en el instrumento">
                <span className="truncate">{p.name}</span>
              </button>
              <span className="text-[10px] font-mono text-ink-3 shrink-0 tabular-nums">
                {p.bankMsb}·{p.bankLsb}·{p.program}
              </span>
              <button type="button" aria-label={`Renombrar ${p.name}`}
                      onClick={() => {
                        const n = window.prompt('Nombre del sonido', p.name);
                        if (n) { midi.renamePreset(p.id, n); refrescar(); }
                      }}
                      className="btn btn-ghost btn-sm shrink-0 px-1 py-0.5"><Pencil size={10} /></button>
              <button type="button" aria-label={`Borrar ${p.name}`}
                      onClick={() => { midi.removePreset(p.id); refrescar(); }}
                      className="btn btn-ghost btn-sm shrink-0 px-1 py-0.5"><X size={11} /></button>
            </li>
          ))}
        </ul>
      )}

      {aMano ? (
        <div className="flex items-center gap-1.5">
          {([['MSB', msb, setMsb], ['LSB', lsb, setLsb], ['Prg', prg, setPrg]] as const).map(([et, val, set]) => (
            <label key={et} className="flex items-center gap-1 text-[10.5px] text-ink-3">
              {et}
              <input type="number" min={0} max={127} value={val} aria-label={`Banco ${et}`}
                     onChange={e => (set as (n: number) => void)(Number(e.target.value))}
                     className="w-12 bg-surface border border-line rounded-lg px-1 py-0.5 text-[11px] font-mono text-ink" />
            </label>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-ink-3 leading-snug">
          {actual
            ? <>El instrumento tiene puesto <span className="font-mono text-ink-2">{actual.bankMsb}·{actual.bankLsb}·{actual.program}</span>. Ponele nombre y queda guardado.</>
            : 'Girá el dial del Kross hasta el sonido que quieras y aparece acá.'}
        </p>
      )}

      <div className="flex items-center gap-1.5">
        <input value={nombre} onChange={e => setNombre(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardar(); } }}
               placeholder="Rhodes, Pad, Órgano…" aria-label="Nombre del sonido"
               className="flex-1 min-w-0 bg-surface border border-line rounded-lg px-2 py-1 text-[11.5px] text-ink" />
        <button type="button" onClick={guardar} disabled={!nombre.trim() || (!aMano && !actual)}
                className="btn btn-secondary btn-sm shrink-0 disabled:opacity-40">
          <Plus size={11} /> {aMano ? 'Agregar' : 'Guardar el que está sonando'}
        </button>
      </div>
    </div>
  );
};
