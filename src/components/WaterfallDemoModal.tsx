import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { WaterfallNote, WaterfallSong } from '../lib/midiWaterfall';
import { ToneWaterfallGym } from './ToneWaterfallGym';

interface WaterfallDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  composer?: string;
  notes: WaterfallNote[];
  bpm?: number;
  initialHand?: 'both' | 'right' | 'left';
}

/**
 * "Ver en la catarata", desde cualquier parte de la app.
 *
 * Antes esto era una catarata aparte: su propio lienzo, su propio sintetizador
 * y su propio teclado dibujado. Quedaron dos cataratas distintas conviviendo, y
 * la de acá se fue quedando atrás — sin el golpe animado en la línea, sin la
 * ortografía musical, sin pistas, sin MIDI. Ahora esta ventana es apenas el
 * marco: adentro corre **la** catarata, la misma que en su sección, en modo
 * demostración (una sola pieza, efímera, que no toca tu biblioteca).
 */
export const WaterfallDemoModal: React.FC<WaterfallDemoModalProps> = ({
  isOpen, onClose, title, subtitle, composer, notes, bpm = 80, initialHand = 'both',
}) => {
  /* La pieza efímera. El id depende del contenido para que abrir otro
     ejercicio remonte la pieza en vez de reusar la anterior. */
  const song: WaterfallSong = useMemo(() => {
    const duration = notes.length
      ? Math.max(...notes.map(n => n.time + n.duration)) + 1
      : 10;
    const firma = `${title}|${notes.length}|${Math.round(duration * 10)}|${bpm}`;
    return {
      id: `demo-${firma.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 60)}`,
      title,
      composer: composer || 'Demostración',
      difficulty: notes.length > 300 ? 'Avanzado' : notes.length > 100 ? 'Intermedio' : 'Fácil',
      bpm,
      duration,
      notesCount: notes.length,
      description: subtitle || 'Demostración de flujo y digitación en tiempo real',
      notes,
    };
  }, [notes, title, composer, subtitle, bpm]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.16 }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-label={title}
          className="stage-dark w-full max-w-[1280px] h-[min(88dvh,760px)] rounded-2xl overflow-hidden border border-white/10 bg-[#0a0f1a] shadow-2xl flex flex-col"
        >
          {/* El nombre de la pieza ya lo muestra la propia catarata, así que
              acá va sólo el contexto que ella no sabe: de dónde salió. */}
          <div className="shrink-0 flex items-center gap-3 px-4 h-10 border-b border-white/8 bg-[#0d1322]">
            <span className="badge badge-neutral font-mono text-[10px] shrink-0">DEMO CATARATA</span>
            <div className="min-w-0 flex-1 text-[11px] text-ink-3 truncate">{subtitle}</div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-lg border border-white/10 text-ink-3 hover:text-ink hover:border-white/20 flex items-center justify-center transition-colors"
              aria-label="Cerrar la demostración"
              data-tip="Cerrar (Esc)"
              data-tip-pos="bottom"
            >
              <X size={15} />
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <ToneWaterfallGym
              fillParent
              demo={{ song, autoPlay: true, hand: initialHand }}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
