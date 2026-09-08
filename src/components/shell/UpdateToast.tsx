import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Aviso de versión nueva. Aparece abajo, por encima de la barra móvil, y no
 * interrumpe: se puede seguir tocando y actualizar cuando convenga.
 */
export const UpdateToast: React.FC<{ onApply: () => void; onDismiss: () => void }> = ({ onApply, onDismiss }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="fixed left-1/2 -translate-x-1/2 bottom-[76px] lg:bottom-6 z-[60] card px-4 py-3 flex items-center gap-3 shadow-2xl max-w-[calc(100vw-24px)]"
      role="status"
    >
      <RefreshCw size={16} className="text-brand shrink-0" />
      <span className="text-[13px] text-ink-2">Hay una versión nueva de PianoMaster.</span>
      <button type="button" onClick={onApply} className="btn btn-primary btn-sm shrink-0">Actualizar</button>
      <button type="button" onClick={onDismiss} className="btn btn-ghost btn-icon shrink-0" aria-label="Ahora no">
        <X size={14} />
      </button>
    </motion.div>
  </AnimatePresence>
);
