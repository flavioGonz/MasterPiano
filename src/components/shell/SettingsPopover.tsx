import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings2, Maximize2, Volume2, Sliders, X, Palette, Monitor, UserRound, Smartphone, Sun, Moon,
} from 'lucide-react';
import { StandModeCard } from './StandModeCard';
import { AccountCard } from './AccountCard';
import type { AuthUser } from '../../lib/auth';
import { getPreference, setPreference, getTheme, onThemeChange, type Theme } from '../../lib/theme';
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

type Tab = 'general' | 'cuenta' | 'celular';

/** Título chiquito de sección, con su icono. */
const Head: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-2">
    <Icon size={12} className="text-brand" /> {children}
  </div>
);

/** Elige claro / oscuro / sistema de una sola pasada. */
const ThemeChooser: React.FC = () => {
  const [theme, setLocal] = useState<Theme>(() => getTheme());
  const [pref, setPref] = useState(() => getPreference());
  useEffect(() => onThemeChange(setLocal), []);
  const pick = (t: Theme) => { setPreference(t); setPref(t); };
  const auto = pref === 'system';
  return (
    <div className="seg w-full">
      <button type="button" data-active={!auto && theme === 'light'} onClick={() => pick('light')} className="seg-item flex-1 gap-1">
        <Sun size={12} /> Claro
      </button>
      <button type="button" data-active={!auto && theme === 'dark'} onClick={() => pick('dark')} className="seg-item flex-1 gap-1">
        <Moon size={12} /> Oscuro
      </button>
      <button type="button" data-active={auto} onClick={() => { setPreference('system'); setPref('system'); }} className="seg-item flex-1 gap-1">
        <Monitor size={12} /> Sistema
      </button>
    </div>
  );
};

/**
 * Ajustes globales en un popover.
 *
 * Antes iba todo apilado en una sola columna — cuenta, dispositivos, celular,
 * apariencia, timbre, ancho — y en un portátil el panel medía más que la
 * ventana: lo último quedaba abajo del borde y no se llegaba. Ahora se reparte
 * en tres pestañas y el cuerpo tiene su propio scroll, así que el alto está
 * acotado siempre.
 */
export const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  open, onOpenChange, layoutWidth, onLayoutWidthChange,
  soundPreset, onSoundPresetChange, splitConfig, onSplitToggle, user,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('general');

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

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'General', icon: Sliders },
    ...(user ? [{ id: 'cuenta' as Tab, label: 'Cuenta', icon: UserRound }] : []),
    { id: 'celular', label: 'Celular', icon: Smartphone },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn('btn btn-secondary btn-sm gap-1.5', open && 'border-brand-line text-brand-2')}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-tip="Ajustes: apariencia, sonido, cuenta y celular"
        data-tip-pos="bottom"
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
            className="absolute right-0 top-[calc(100%+8px)] w-[330px] max-w-[calc(100vw-24px)] card z-50 flex flex-col overflow-hidden max-h-[calc(100dvh-88px)]"
          >
            {/* Cabecera + pestañas */}
            <div className="shrink-0 border-b border-line">
              <div className="flex items-center justify-between px-3 pt-2.5">
                <div className="text-[13px] font-semibold text-ink">Ajustes</div>
                <button type="button" onClick={() => onOpenChange(false)} className="btn btn-ghost btn-icon" aria-label="Cerrar">
                  <X size={15} />
                </button>
              </div>
              <div className="flex items-center gap-1 px-2 pb-2 pt-1.5">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-selected={tab === t.id}
                    className={cn(
                      'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition-colors',
                      tab === t.id
                        ? 'bg-brand-soft border-brand-line text-brand-2'
                        : 'bg-surface-2 border-line text-ink-2 hover:text-ink'
                    )}
                  >
                    <t.icon size={12} /> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuerpo con scroll propio */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3.5">
              {tab === 'general' && (
                <>
                  <section className="space-y-1.5">
                    <Head icon={Palette}>Apariencia</Head>
                    <ThemeChooser />
                    <p className="text-[10.5px] text-ink-3 leading-snug px-0.5">
                      El teclado y la catarata siguen oscuros: se leen mejor así.
                    </p>
                  </section>

                  <section className="space-y-1.5">
                    <Head icon={Volume2}>Timbre del piano</Head>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SOUND_PRESETS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onSoundPresetChange(p.id)}
                          data-tip={p.description}
                          data-tip-pos="bottom"
                          className={cn(
                            'rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition-all',
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

                  <section className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-medium text-ink">Teclado dividido</div>
                      <div className="text-[10.5px] text-ink-3 leading-snug">
                        Timbres distintos para cada mano.
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={splitConfig.enabled}
                      onClick={onSplitToggle}
                      aria-label="Teclado dividido"
                      className={cn(
                        'relative w-10 rounded-full transition-colors shrink-0',
                        splitConfig.enabled ? 'bg-brand' : 'bg-white/10'
                      )}
                      style={{ height: 22 }}
                    >
                      <span className={cn(
                        'absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform',
                        splitConfig.enabled && 'translate-x-[18px]'
                      )} />
                    </button>
                  </section>

                  <section className="space-y-1.5 hidden lg:block">
                    <Head icon={Maximize2}>Ancho del área de trabajo</Head>
                    <div className="seg w-full">
                      {WIDTHS.map(w => (
                        <button
                          key={w.id}
                          type="button"
                          data-active={layoutWidth === w.id}
                          onClick={() => onLayoutWidthChange(w.id)}
                          className="seg-item flex-1"
                          data-tip={w.desc}
                          data-tip-pos="bottom"
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {tab === 'cuenta' && user && <AccountCard user={user} />}
              {tab === 'celular' && <StandModeCard />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
