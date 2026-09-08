import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, Maximize2, Volume2, Sliders, X, Palette, Monitor } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { StandModeCard } from './StandModeCard';
import { AccountCard } from './AccountCard';
import type { AuthUser } from '../../lib/auth';
import { getPreference, setPreference } from '../../lib/theme';
import { SOUND_PRESETS, SoundPreset, SplitKeyboardConfig } from '../../lib/soundPresetsInfo';
import { cn } from '../../lib/utils';

export type LayoutWidth = 'ultra' | 'wide' | 'standard';

interface SettingsPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layoutWidth: LayoutWidth;
  onLayoutWidthChange: (w: LayoutWidth) => void;
  soundPreset: SoundPreset;
  onSoundPresetChange: (p: SoundPreset) => void;
  splitConfig: SplitKeyboardConfig;
  onSplitToggle: () => void;
  user?: AuthUser | null;
}

const WIDTHS: { id: LayoutWidth; label: string; desc: string }[] = [
  { id: 'ultra', label: 'Ultra', desc: '98% de la pantalla' },
  { id: 'wide', label: 'Panorámico', desc: 'hasta 1550 px' },
  { id: 'standard', label: 'Estándar', desc: 'hasta 1280 px' },
];

/**
 * Ajustes globales (ancho, timbre, teclado dividido) en un popover.
 * Antes ocupaban una fila entera del header; ahora viven detrás de un
 * solo botón y siguen siendo de un clic.
 */
export const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  open, onOpenChange, layoutWidth, onLayoutWidthChange,
  soundPreset, onSoundPresetChange, splitConfig, onSplitToggle, user,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn('btn btn-secondary btn-sm gap-1.5', open && 'border-brand-line text-brand-2')}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-tip="Ajustes: ancho, sonido, teclado dividido"
      >
        <Settings2 size={15} />
        <span className="hidden xl:inline">Ajustes</span>
        {splitConfig.enabled && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Ajustes"
            className="absolute right-0 top-[calc(100%+8px)] w-[320px] max-w-[calc(100vw-24px)] card p-4 space-y-4 z-50"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink">Ajustes</div>
              <button type="button" onClick={() => onOpenChange(false)} className="btn btn-ghost btn-icon" aria-label="Cerrar">
                <X size={15} />
              </button>
            </div>

            {user && <AccountCard user={user} />}

            <StandModeCard />

            {/* Tema */}
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                <Palette size={13} className="text-brand" /> Apariencia
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink">Tema claro / oscuro</div>
                  <div className="text-[11px] text-ink-3 leading-snug">
                    El teclado y la catarata siguen oscuros: se leen mejor así.
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => setPreference('system')}
                disabled={getPreference() === 'system'}
                className="btn btn-ghost btn-sm w-full justify-start disabled:opacity-45 disabled:cursor-default"
              >
                <Monitor size={13} />
                {getPreference() === 'system' ? 'Siguiendo al sistema' : 'Volver a seguir al sistema'}
              </button>
            </section>

            {/* Sonido */}
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                <Volume2 size={13} className="text-brand" /> Timbre del piano
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {SOUND_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSoundPresetChange(p.id)}
                    title={p.description}
                    className={cn(
                      'rounded-xl border px-2 py-2 text-xs font-medium transition-all',
                      soundPreset === p.id
                        ? 'bg-brand-soft border-brand-line text-brand-2'
                        : 'bg-surface-2 border-line text-ink-2 hover:text-ink hover:border-line-strong'
                    )}
                  >
                    {p.shortLabel}
                  </button>
                ))}
              </div>
            </section>

            {/* Teclado dividido */}
            <section className="flex items-center justify-between gap-3 card-2 p-3">
              <div className="flex items-start gap-2 min-w-0">
                <Sliders size={14} className="text-brand mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink">Teclado dividido</div>
                  <div className="text-[11px] text-ink-3 leading-snug">
                    Timbres distintos para mano izquierda y derecha.
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={splitConfig.enabled}
                onClick={onSplitToggle}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors shrink-0',
                  splitConfig.enabled ? 'bg-brand' : 'bg-white/10'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  splitConfig.enabled && 'translate-x-5'
                )} />
              </button>
            </section>

            {/* Ancho */}
            <section className="space-y-2 hidden lg:block">
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                <Maximize2 size={13} className="text-brand" /> Ancho del área de trabajo
              </div>
              <div className="seg w-full">
                {WIDTHS.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    data-active={layoutWidth === w.id}
                    onClick={() => onLayoutWidthChange(w.id)}
                    className="seg-item flex-1"
                    title={w.desc}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
