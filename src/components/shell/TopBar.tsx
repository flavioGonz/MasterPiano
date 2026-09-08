import React from 'react';
import { Zap, Bot, Piano as PianoIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Metronome } from '../Metronome';
import { CurriculumProgressBar } from '../CurriculumProgressBar';
import { SettingsPopover, LayoutWidth } from './SettingsPopover';
import { ThemeToggle } from './ThemeToggle';
import { MidiButton } from './MidiButton';
import type { AuthUser } from '../../lib/auth';
import { navItem, TabId } from './navConfig';
import { UserProgress } from '../../types';
import type { SoundPreset, SplitKeyboardConfig } from '../../lib/soundPresetsInfo';
import { cn } from '../../lib/utils';

interface TopBarProps {
  active: TabId;
  userProgress: UserProgress;
  onQuickPractice: () => void;
  onOpenMaestro: () => void;
  settings: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    layoutWidth: LayoutWidth;
    onLayoutWidthChange: (w: LayoutWidth) => void;
    soundPreset: SoundPreset;
    onSoundPresetChange: (p: SoundPreset) => void;
    splitConfig: SplitKeyboardConfig;
    onSplitToggle: () => void;
    user?: AuthUser | null;
  };
  containerClass: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

/**
 * Barra superior compacta (64px). Muestra dónde estás, el metrónomo y
 * las dos acciones globales (Práctica rápida, Maestro). Todo lo demás
 * vive en el popover de ajustes.
 */
export const TopBar: React.FC<TopBarProps> = ({
  active, userProgress, onQuickPractice, onOpenMaestro, settings, containerClass, sidebarCollapsed, onToggleSidebar,
}) => {
  const item = navItem(active);
  const Icon = item.icon;

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className={cn('h-full flex items-center justify-between gap-3 px-4 sm:px-6', containerClass)}>
        {/* Izquierda: marca (solo móvil) + sección actual */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="lg:hidden w-9 h-9 rounded-xl bg-brand text-brand-ink flex items-center justify-center shrink-0">
            <PianoIcon size={19} />
          </div>
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:inline-flex btn btn-ghost btn-icon text-ink-3 hover:text-ink -ml-2"
              aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
              data-tip={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
              data-tip-pos="bottom"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}
          <div className="min-w-0 max-w-[340px]">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-ink leading-tight truncate">
              <Icon size={16} className="text-brand hidden lg:block shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
            <div className="hidden sm:block text-[11px] text-ink-3 leading-tight truncate">
              {item.hint ?? 'PianoMaster · Conservatorio virtual'}
            </div>
          </div>
        </div>

        {/* Centro: metrónomo */}
        <div className="hidden md:flex items-center">
          <Metronome />
        </div>

        {/* Derecha: progreso, acciones, ajustes */}
        <div className="flex items-center gap-2 shrink-0">
          <CurriculumProgressBar userProgress={userProgress} variant="compact" className="hidden xl:flex" />

          <button
            type="button"
            id="btn-header-quick-practice"
            onClick={onQuickPractice}
            className="btn btn-primary btn-sm"
            data-tip="Práctica rápida de 60 segundos con tus habilidades desbloqueadas"
            data-tip-pos="bottom"
          >
            <Zap size={14} className="fill-current" />
            <span className="hidden sm:inline">Práctica rápida</span>
            <span className="font-mono text-[10px] opacity-70">60s</span>
          </button>

          <button
            type="button"
            onClick={onOpenMaestro}
            className="btn btn-secondary btn-sm lg:hidden"
            aria-label="Consultar al Maestro"
            data-tip="Consultar al Maestro"
            data-tip-pos="bottom"
          >
            <Bot size={15} className="text-brand" />
          </button>

          <MidiButton className="hidden sm:block" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <SettingsPopover {...settings} />
        </div>
      </div>
    </header>
  );
};
