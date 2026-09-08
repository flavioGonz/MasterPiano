import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Los controles de un "escenario oscuro".
 *
 * Nacieron dentro de la catarata. Cuando el laboratorio de teclado de las
 * lecciones pasó al mismo lenguaje visual hubo que elegir entre copiarlos o
 * compartirlos: acá están compartidos, así los dos escenarios no se van
 * separando con cada retoque. `IconBtn` además estaba declarado adentro del
 * componente de la catarata, o sea que React lo desmontaba y lo volvía a
 * montar en cada render; al subirlo acá eso se arregla solo.
 */

export const IconBtn: React.FC<{
  onClick?: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ onClick, active, label, children, className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    data-tip={label}
    aria-pressed={active}
    className={cn(
      'h-9 min-w-9 px-2.5 rounded-lg border text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors',
      active ? 'bg-brand-soft border-brand-line text-brand-2' : 'bg-[#141b2b] border-white/8 text-ink-2 hover:text-ink hover:border-white/15',
      className
    )}
  >
    {children}
  </button>
);

export const Popover: React.FC<{
  title: string;
  onClose: () => void;
  align?: 'left' | 'right';
  width?: string;
  children: React.ReactNode;
}> = ({ title, onClose, align = 'right', width = 'w-[300px]', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node) && !el.parentElement?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      role="dialog" aria-label={title}
      className={cn(
        'absolute top-[calc(100%+8px)] max-w-[calc(100vw-24px)] rounded-2xl border border-white/10 bg-[#111828] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] p-4 space-y-3.5 z-50',
        align === 'right' ? 'right-0' : 'left-0 max-md:left-1/2 max-md:-translate-x-1/2',
        width
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Cerrar"><X size={14} /></button>
      </div>
      {children}
    </motion.div>
  );
};

export const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-medium text-ink-2 mb-1.5">{label}</div>
    {children}
  </div>
);

export const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; small?: boolean }> = ({ label, checked, onChange, small }) => (
  <label className={cn('flex items-center justify-between gap-3 cursor-pointer', small ? 'text-[11.5px]' : 'text-[12px]')}>
    <span className="text-ink-2">{label}</span>
    <button
      type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn('relative rounded-full transition-colors shrink-0', small ? 'w-8 h-[18px]' : 'w-10 h-[22px]', checked ? 'bg-brand' : 'bg-white/12')}
    >
      <span className={cn('absolute top-[2px] left-[2px] rounded-full bg-white shadow transition-transform', small ? 'w-[14px] h-[14px]' : 'w-[18px] h-[18px]', checked && (small ? 'translate-x-[14px]' : 'translate-x-[18px]'))} />
    </button>
  </label>
);
