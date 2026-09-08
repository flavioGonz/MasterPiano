import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, Bot, X } from 'lucide-react';
import { NAV_ITEMS, MOBILE_PRIMARY, TabId } from './navConfig';
import { cn } from '../../lib/utils';

interface BottomNavProps {
  active: TabId;
  onNavigate: (id: TabId) => void;
  onOpenMaestro: () => void;
}

/**
 * Barra inferior para móvil/tablet (< lg): 4 accesos directos + "Más",
 * que abre un sheet con el resto de secciones. El sheet se cierra tocando
 * afuera o con Escape (es una acción rápida, no un formulario).
 */
export const BottomNav: React.FC<BottomNavProps> = ({ active, onNavigate, onOpenMaestro }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = MOBILE_PRIMARY.map(id => NAV_ITEMS.find(n => n.id === id)!);
  const secondary = NAV_ITEMS.filter(n => !MOBILE_PRIMARY.includes(n.id));
  const moreIsActive = secondary.some(n => n.id === active);

  const go = (id: TabId) => { onNavigate(id); setMoreOpen(false); };

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegación principal"
      >
        <div className="grid grid-cols-5 h-[60px]">
          {primary.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors',
                  isActive ? 'text-brand' : 'text-ink-3 active:text-ink'
                )}
              >
                <span className={cn('px-3 py-0.5 rounded-full transition-colors', isActive && 'bg-brand-soft')}>
                  <Icon size={19} />
                </span>
                {item.short}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium',
              moreIsActive ? 'text-brand' : 'text-ink-3'
            )}
            aria-haspopup="dialog"
          >
            <span className={cn('px-3 py-0.5 rounded-full', moreIsActive && 'bg-brand-soft')}>
              <MoreHorizontal size={19} />
            </span>
            Más
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/60"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              role="dialog" aria-label="Más secciones"
              className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-line rounded-t-3xl p-4 space-y-3"
              style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
              onKeyDown={e => { if (e.key === 'Escape') setMoreOpen(false); }}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-ink">Más secciones</div>
                <button type="button" onClick={() => setMoreOpen(false)} className="btn btn-ghost btn-icon" aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {secondary.map(item => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                        isActive ? 'bg-brand-soft border-brand-line text-brand-2' : 'bg-surface-2 border-line text-ink'
                      )}
                    >
                      <Icon size={18} className={isActive ? 'text-brand' : 'text-ink-3'} />
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {item.hint && <span className="text-[10px] font-mono text-ink-3">{item.hint}</span>}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => { setMoreOpen(false); onOpenMaestro(); }}
                  className="btn btn-primary w-full mt-1"
                >
                  <Bot size={16} /> Consultar al Maestro Aurelio
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
