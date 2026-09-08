import React from 'react';
import { Piano as PianoIcon, Bot, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { NAV_ITEMS, NAV_GROUPS, TabId } from './navConfig';
import { cn } from '../../lib/utils';

interface SidebarProps {
  active: TabId;
  onNavigate: (id: TabId) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMaestro: () => void;
  aiEnabled: boolean | null; // null = todavía no se consultó /api/health
}

/**
 * Navegación lateral de escritorio (≥ lg). En pantallas chicas no se
 * renderiza: la navegación pasa a <BottomNav/>.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  active, onNavigate, collapsed, onToggleCollapsed, onOpenMaestro, aiEnabled,
}) => {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 h-screen sticky top-0 border-r border-line bg-surface/60 backdrop-blur-sm transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[248px]'
      )}
    >
      {/* Marca */}
      <div className={cn('flex items-center gap-3 px-4 h-16 border-b border-line', collapsed && 'justify-center px-0')}>
        <div className="w-9 h-9 rounded-xl bg-brand text-brand-ink flex items-center justify-center shrink-0">
          <PianoIcon size={20} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-serif font-semibold text-[17px] leading-tight text-ink">PianoMaster</div>
            <div className="text-[11px] text-ink-3 leading-tight">Conservatorio · Tutor 0 a 100</div>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-2.5 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.id}>
            {!collapsed && (
              <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {NAV_ITEMS.filter(n => n.group === group.id).map(item => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`nav-tab-${item.id}`}
                    onClick={() => onNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    data-tip={collapsed ? item.label : undefined}
                    data-tip-pos="right"
                    className={cn(
                      'group w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-all duration-150',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-brand-soft text-brand-2 border border-brand-line'
                        : 'text-ink-2 hover:text-ink hover:bg-white/5 border border-transparent'
                    )}
                  >
                    <Icon size={18} className={cn('shrink-0', isActive ? 'text-brand' : 'text-ink-3 group-hover:text-ink-2')} />
                    {!collapsed && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Maestro Aurelio */}
      <div className={cn('p-2.5 border-t border-line', collapsed && 'flex justify-center')}>
        {collapsed ? (
          <button
            type="button"
            onClick={onOpenMaestro}
            data-tip="Consultar al Maestro Aurelio"
            data-tip-pos="right"
            className="btn btn-primary btn-icon w-10 h-10"
            aria-label="Consultar al Maestro"
          >
            <Bot size={18} />
          </button>
        ) : (
          <div className="card-2 p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-surface-3 border border-line flex items-center justify-center text-brand">
                <Bot size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink leading-tight">Maestro Aurelio</div>
                <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                  <span className={cn('w-1.5 h-1.5 rounded-full', aiEnabled ? 'bg-ok' : aiEnabled === false ? 'bg-warn' : 'bg-ink-3')} />
                  {aiEnabled ? 'En línea con IA' : aiEnabled === false ? 'Modo guía (sin IA)' : 'Conectando…'}
                </div>
              </div>
            </div>
            <button type="button" onClick={onOpenMaestro} className="btn btn-primary btn-sm w-full">
              Consultar al Maestro
            </button>
          </div>
        )}
      </div>

      {/* Colapsar */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        data-tip={collapsed ? 'Expandir menú' : undefined}
        data-tip-pos="right"
        className="h-10 border-t border-line text-ink-3 hover:text-ink hover:bg-white/5 flex items-center justify-center gap-2 text-xs"
        aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
      >
        {collapsed ? <ChevronsRight size={15} /> : <><ChevronsLeft size={15} /> Contraer</>}
      </button>
    </aside>
  );
};
