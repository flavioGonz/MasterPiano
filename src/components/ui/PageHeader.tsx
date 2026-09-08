import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Encabezado de sección: eyebrow + título serif + descripción corta,
 * alineado a la izquierda, con acciones a la derecha. Reemplaza los
 * "hero" centrados de 4xl que tenía cada pestaña.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, actions, className }) => (
  <div className={cn('flex flex-col md:flex-row md:items-end justify-between gap-4', className)}>
    <div className="space-y-1.5 max-w-3xl">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1 className="font-serif font-semibold text-2xl md:text-[28px] text-ink leading-tight">{title}</h1>
      {description && <p className="text-sm text-ink-2 leading-relaxed">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
