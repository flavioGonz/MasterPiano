import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileMusic, X, Check, FileText, Tag, Loader2 } from 'lucide-react';
import type { PendingImport } from '../lib/midiImport';
import type { WaterfallSong } from '../lib/midiWaterfall';
import { cn } from '../lib/utils';

type Fuente = 'midi' | 'archivo';

interface Props {
  /** Archivos ya leídos, todavía sin guardar. */
  pending: PendingImport[];
  /** Los que no se pudieron leer, para decirlo acá mismo. */
  failed: { name: string; reason: string }[];
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (songs: WaterfallSong[]) => void;
}

const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/**
 * Antes de guardar: con qué nombre queda cada pieza.
 *
 * Muchos .mid traen adentro el nombre del secuenciador, del arreglador o un
 * "Piano" pelado, y el nombre del archivo suele ser el de la pieza de verdad.
 * Ninguna de las dos gana siempre, así que se elige — y se puede corregir a
 * mano, que es lo que uno termina queriendo hacer.
 */
export const MidiImportDialog: React.FC<Props> = ({ pending, failed, busy, onCancel, onConfirm }) => {
  const [fuente, setFuente] = useState<Fuente>('archivo');
  const [edits, setEdits] = useState<Record<string, { title: string; composer: string }>>({});

  /* Cambiar la fuente reescribe lo que no se tocó a mano. */
  const propuesta = useMemo(() => {
    const m: Record<string, { title: string; composer: string }> = {};
    for (const p of pending) {
      m[p.song.id] = {
        title: fuente === 'midi' ? (p.titleFromMidi || p.titleFromFile) : (p.titleFromFile || p.titleFromMidi),
        composer: fuente === 'midi' ? (p.composerFromMidi || 'MIDI importado') : 'MIDI importado',
      };
    }
    return m;
  }, [pending, fuente]);

  useEffect(() => { setEdits({}); }, [fuente]);

  const valueOf = (id: string) => edits[id] ?? propuesta[id] ?? { title: '', composer: '' };
  const patch = (id: string, k: 'title' | 'composer', v: string) =>
    setEdits(e => ({ ...e, [id]: { ...valueOf(id), [k]: v } }));

  const confirm = () => {
    onConfirm(pending.map(p => {
      const v = valueOf(p.song.id);
      return {
        ...p.song,
        title: v.title.trim() || p.titleFromFile || p.song.title,
        composer: v.composer.trim() || 'MIDI importado',
      };
    }));
  };

  /* ¿Vale la pena preguntar? Si ningún archivo trae datos propios, la
     pregunta sobra: se muestran igual los nombres, editables. */
  const algunoTraeDatos = pending.some(p => !p.meta.embeddedIsGeneric || p.composerFromMidi);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-start justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm" onClick={busy ? undefined : onCancel}>
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.16 }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-label="Guardar los MIDI importados"
          className="w-full max-w-xl card flex flex-col overflow-hidden max-h-[86vh] mt-[4vh]"
        >
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line shrink-0">
            <FileMusic size={17} className="text-brand shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-ink leading-tight">
                {pending.length === 1 ? 'Guardar la pieza' : `Guardar ${pending.length} piezas`}
              </div>
              <div className="text-[11.5px] text-ink-3 leading-tight">
                Revisá el nombre y el autor antes de que entren a la biblioteca.
              </div>
            </div>
            <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost btn-icon shrink-0" aria-label="Cancelar">
              <X size={15} />
            </button>
          </div>

          {algunoTraeDatos && (
            <div className="px-4 py-3 border-b border-line shrink-0 space-y-2">
              <div className="text-[12px] text-ink-2">¿Con qué datos los guardamos?</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFuente('archivo')}
                  aria-pressed={fuente === 'archivo'}
                  className={cn('rounded-xl border px-3 py-2 text-left transition-colors',
                    fuente === 'archivo' ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface-2 hover:border-line-strong')}
                >
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                    <FileText size={12} className={fuente === 'archivo' ? 'text-brand' : 'text-ink-3'} /> Nombre del archivo
                  </div>
                  <div className="text-[10.5px] text-ink-3 leading-snug mt-0.5">
                    Suele ser el título real de la pieza.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFuente('midi')}
                  aria-pressed={fuente === 'midi'}
                  className={cn('rounded-xl border px-3 py-2 text-left transition-colors',
                    fuente === 'midi' ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface-2 hover:border-line-strong')}
                >
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                    <Tag size={12} className={fuente === 'midi' ? 'text-brand' : 'text-ink-3'} /> Datos del MIDI
                  </div>
                  <div className="text-[10.5px] text-ink-3 leading-snug mt-0.5">
                    Título y autor que trae el archivo adentro.
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
            {pending.map(p => {
              const v = valueOf(p.song.id);
              return (
                <div key={p.song.id} className="rounded-xl border border-line bg-surface-2 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[10.5px] font-mono text-ink-3">
                    <span className="truncate">{p.fileName}</span>
                    <span className="ml-auto shrink-0">{p.song.notesCount} notas · {p.song.bpm} bpm · {fmtDur(p.song.duration)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="block">
                      <span className="block text-[10.5px] text-ink-3 mb-1">Título</span>
                      <input
                        value={v.title}
                        onChange={e => patch(p.song.id, 'title', e.target.value)}
                        className="input w-full"
                        placeholder="Nombre de la pieza"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[10.5px] text-ink-3 mb-1">Autor</span>
                      <input
                        value={v.composer}
                        onChange={e => patch(p.song.id, 'composer', e.target.value)}
                        className="input w-full"
                        placeholder="MIDI importado"
                      />
                    </label>
                  </div>
                  {p.meta.embeddedTitle && p.meta.embeddedTitle !== v.title && (
                    <div className="text-[10.5px] text-ink-3">
                      El archivo dice adentro: <span className="text-ink-2">{p.meta.embeddedTitle}</span>
                      {p.meta.trackNames.length > 0 && <> · pistas: {p.meta.trackNames.slice(0, 3).join(', ')}</>}
                    </div>
                  )}
                </div>
              );
            })}

            {failed.length > 0 && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-[11.5px] text-ink-2 space-y-0.5">
                <div className="font-medium text-danger">{failed.length} sin importar</div>
                {failed.slice(0, 4).map(f => (
                  <div key={f.name} className="truncate">{f.name} — {f.reason}</div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-line shrink-0">
            <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost btn-sm">Cancelar</button>
            <button type="button" onClick={confirm} disabled={busy || !pending.length} className="btn btn-primary btn-sm">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Guardar {pending.length === 1 ? 'la pieza' : `las ${pending.length}`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
