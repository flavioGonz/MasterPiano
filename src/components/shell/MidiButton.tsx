import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Piano as PianoIcon, X } from 'lucide-react';
import { midi } from '../../lib/midi';
import { useMidi } from '../../lib/useMidi';
import { MidiPanel } from './MidiPanel';
import { cn } from '../../lib/utils';

/**
 * El instrumento, en la barra de arriba.
 *
 * Estaba enterrado adentro de Ajustes, abajo de la cuenta y de la lista de
 * dispositivos: había que scrollear un panel entero para ver si el teclado
 * estaba conectado. Es la única cosa de la app que se enchufa y se
 * desenchufa, así que su estado tiene que verse de un vistazo: el icono se
 * enciende cuando hay un instrumento y parpadea con cada nota que llega.
 *
 * Si el navegador no habla MIDI, el botón no existe: no tiene sentido ocupar
 * lugar con algo que no va a andar nunca.
 */
export const MidiButton: React.FC<{ className?: string }> = ({ className }) => {
  const state = useMidi();
  const [open, setOpen] = useState(false);
  const [activo, setActivo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* La luz de actividad se escucha directo al hub: si cada nota disparara un
     cambio de estado, se volvería a dibujar media app en cada tecla. */
  useEffect(() => {
    let t = 0;
    const blink = () => {
      setActivo(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setActivo(false), 150);
    };
    const a = midi.onNoteOn(blink);
    const b = midi.onCc(blink);
    return () => { a(); b(); window.clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!state.supported) return null;

  const conectado = state.ready && state.inputs.length > 0;
  const nombre = midi.deviceName();
  const corto = midi.shortDeviceName();

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={conectado ? `Instrumento MIDI: ${nombre}` : 'Conectar un teclado MIDI'}
        data-tip={conectado ? `${nombre} — tocá en el instrumento` : 'Conectar un teclado MIDI'}
        className={cn('btn btn-sm gap-1.5 relative',
          conectado ? 'btn-secondary border-ok/40 text-ink' : 'btn-ghost text-ink-3 hover:text-ink-2',
          open && 'border-brand-line text-brand-2')}
      >
        <PianoIcon size={15} className={conectado ? 'text-ok' : undefined} />
        {conectado && (
          <>
            <span className="hidden 2xl:inline max-w-[110px] truncate text-[12px]">{corto}</span>
            {/* Late con cada mensaje que llega del instrumento */}
            <span className={cn('w-1.5 h-1.5 rounded-full transition-colors duration-100',
              activo ? 'bg-ok' : 'bg-ok/25')} />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Teclado MIDI"
            className="absolute right-0 top-[calc(100%+8px)] w-[318px] max-w-[calc(100vw-24px)] card p-4 space-y-3 z-50"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink">Teclado MIDI</div>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" aria-label="Cerrar">
                <X size={15} />
              </button>
            </div>
            <MidiPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
