import React, { useEffect, useState } from 'react';
import { Sun, Moon, Star } from 'lucide-react';
import { getTheme, toggleTheme, onThemeChange, type Theme } from '../../lib/theme';
import { cn } from '../../lib/utils';

/**
 * Interruptor de tema. El movimiento importa: la perilla viaja con un rebote
 * corto mientras el sol gira hacia afuera y la luna entra en su lugar, y el
 * riel cambia de rayos a estrellas. Todo eso se apaga solo si el sistema pide
 * menos movimiento (ver .theme-tog en index.css).
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const [theme, setTheme] = useState<Theme>(() => getTheme());
  useEffect(() => onThemeChange(setTheme), []);
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn('theme-tog', className)}
      data-dark={dark}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      data-tip={dark ? 'Tema claro' : 'Tema oscuro'}
    >
      <span className="tt-rail">
        <Sun size={11} className="tt-day" strokeWidth={2.4} />
        <Star size={9} className="tt-night" fill="currentColor" strokeWidth={0} />
      </span>
      <span className="tt-knob">
        <Sun size={13} className="tt-ico tt-sun" strokeWidth={2.6} />
        <Moon size={13} className="tt-ico tt-moon" strokeWidth={2.6} />
      </span>
    </button>
  );
};
