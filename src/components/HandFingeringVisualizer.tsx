import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

/**
 * La guía de digitación: qué dedo toca.
 *
 * Antes eran dos contornos punteados con cinco círculos colgando de unas
 * líneas — un diagrama de red, no una mano. Y no servía para lo único que
 * tiene que servir: mirar el número, mirarte la mano y saber cuál dedo es.
 *
 * Ahora las manos se dibujan de verdad. La geometría se calcula, no se
 * dibujó a ojo: cada dedo sale de su nudillo con la longitud, el ancho y la
 * inclinación que le corresponde (el medio es el más largo, el meñique nace
 * más abajo y más corto, el pulgar sale del monte tenar y no de la línea de
 * nudillos), lleva sus dos pliegues de articulación y su uña. La mano
 * izquierda es la derecha espejada, que es exactamente lo que es.
 *
 * Se ve el dorso, con los dedos hacia arriba: es como te mirás la mano
 * cuando estás sentado al piano.
 */

interface HandFingeringVisualizerProps {
  activeFingering?: number;          // 1 a 5
  activeHand?: 'right' | 'left' | 'both';
  activeNote?: string;
  className?: string;
}

interface FingerInfo {
  num: number;
  name: string;
  role: string;
  advice: string;
}

const FINGERS: FingerInfo[] = [
  {
    num: 1, name: 'Pulgar', role: 'pivote',
    advice: 'Toca con el borde externo de la yema, no con la parte plana. Pasa por debajo de la palma sin levantar la muñeca.',
  },
  {
    num: 2, name: 'Índice', role: 'dirección',
    advice: 'Curvatura pareja de punta a nudillo. Si la primera falange se hunde hacia adentro, el sonido se apaga.',
  },
  {
    num: 3, name: 'Medio', role: 'eje',
    advice: 'El más largo, y el centro de gravedad de la bóveda de la mano. Todo lo demás se equilibra alrededor de él.',
  },
  {
    num: 4, name: 'Anular', role: 'independencia',
    advice: 'Comparte tendón extensor con el medio: por eso cuesta. Levantalo desde el nudillo, sin ayudarlo con la muñeca.',
  },
  {
    num: 5, name: 'Meñique', role: 'apoyo externo',
    advice: 'Sostiene el borde de la mano. Si la articulación se dobla hacia adentro, la nota sale hueca.',
  },
];

/* ------------------------------------------------------------------ */
/*  Geometría de una mano derecha vista por el dorso                   */
/* ------------------------------------------------------------------ */

const W = 240, H = 288;

interface Digit {
  num: number;
  /** Nudillo del que sale. */
  kx: number; ky: number;
  /** Grados desde la vertical; positivo hacia el meñique. */
  angle: number;
  length: number;
  wBase: number;
  wTip: number;
  /** Cuánto se arquea hacia afuera (los dedos no son palitos rectos). */
  bow: number;
}

/* Medidas relativas de una mano: el medio es el más largo, el índice y el
   anular casi iguales, el meñique bastante más corto y con el nudillo más
   abajo. Los ángulos abren en abanico desde el índice hacia el meñique. */
const DIGITS: Digit[] = [
  /* Los nudillos casi se tocan: en una mano relajada los dedos no están
     abiertos en abanico, se separan recién hacia las puntas. */
  { num: 2, kx: 100, ky: 138, angle: -9, length: 88, wBase: 25, wTip: 17, bow: -2 },
  { num: 3, kx: 124, ky: 131, angle: 0,  length: 98, wBase: 26, wTip: 17.5, bow: 0 },
  { num: 4, kx: 147, ky: 136, angle: 9,  length: 90, wBase: 25, wTip: 17, bow: 2 },
  { num: 5, kx: 168, ky: 152, angle: 19, length: 68, wBase: 21, wTip: 15, bow: 3 },
];

/**
 * El pulgar sale del monte tenar —mucho más abajo que los otros nudillos— y
 * casi de costado. Es la diferencia entre una mano y una manopla.
 */
const THUMB = { num: 1, kx: 86, ky: 194, angle: -44, length: 84, wBase: 31, wTip: 22, bow: -5 };

const rad = (d: number) => (d * Math.PI) / 180;

/** Punto a `t` de recorrido del dedo y a `off` de su eje. */
function pointOn(d: Digit, t: number, off: number) {
  const a = rad(d.angle);
  const dx = Math.sin(a), dy = -Math.cos(a);      // hacia la punta
  const px = Math.cos(a), py = Math.sin(a);       // perpendicular
  // El arqueo desplaza el eje hacia afuera en el medio del dedo
  const bow = d.bow * Math.sin(Math.PI * t);
  const cx = d.kx + dx * d.length * t + px * bow;
  const cy = d.ky + dy * d.length * t + py * bow;
  return { x: cx + px * off, y: cy + py * off };
}

/** El contorno de un dedo: se afina hacia la punta y termina redondeado. */
function fingerPath(d: Digit): string {
  const half = (t: number) => (d.wBase + (d.wTip - d.wBase) * t) / 2;
  const izq: string[] = [], der: string[] = [];
  const pasos = 8;
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const l = pointOn(d, t, -half(t));
    const r = pointOn(d, t, half(t));
    izq.push(`${l.x.toFixed(1)},${l.y.toFixed(1)}`);
    der.push(`${r.x.toFixed(1)},${r.y.toFixed(1)}`);
  }
  const tip = pointOn(d, 1, 0);
  const rTip = half(1);
  // Baja por un lado, media vuelta en la punta, sube por el otro
  return [
    `M ${izq[0]}`,
    ...izq.slice(1).map(p => `L ${p}`),
    `A ${rTip} ${rTip} 0 0 1 ${der[der.length - 1]}`,
    ...der.slice(0, -1).reverse().map(p => `L ${p}`),
    'Z',
  ].join(' ') + ` M ${tip.x} ${tip.y}`;
}

/** Los dos pliegues de las articulaciones. */
function creases(d: Digit): string[] {
  return [0.42, 0.72].map(t => {
    const half = ((d.wBase + (d.wTip - d.wBase) * t) / 2) * 0.62;
    const a = pointOn(d, t, -half), b = pointOn(d, t, half);
    const m = pointOn(d, t + 0.03, 0);
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${m.x.toFixed(1)} ${m.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  });
}

/** La uña, sobre la punta y girada con el dedo. */
function nail(d: Digit) {
  const c = pointOn(d, 0.87, 0);
  const w = d.wTip * 0.6, h = d.wTip * 0.72;
  return { x: c.x, y: c.y, w, h, rot: d.angle };
}

/**
 * La silueta de la palma con el monte tenar (la almohadilla del pulgar).
 * Se cierra por arriba pasando por los nudillos, así los dedos nacen de
 * adentro de la mano en vez de estar pegados encima.
 */
/**
 * La palma. Es casi tan alta como ancha —una mano no es una manopla— y se
 * angosta hacia la muñeca; la parte más ancha es la línea de nudillos.
 */
const PALM =
  'M 96 240 ' +
  'C 74 234 64 214 68 192 ' +      // el monte tenar, la almohadilla del pulgar
  'C 72 168 82 148 96 138 ' +
  'C 99 134 100 132 104 134 ' +    // sube al nudillo del índice
  'L 122 128 L 145 133 ' +         // la línea de nudillos, en arco
  'C 156 136 164 143 169 153 ' +   // baja por el borde del meñique
  'C 177 170 180 194 176 212 ' +
  'C 173 228 166 238 154 240 ' +   // el borde de abajo es casi recto
  'L 108 240 C 102 240 98 240 96 240 Z';

/**
 * La membrana entre el pulgar y el índice. Sin ella el pulgar parece pegado
 * al costado de la palma en vez de salir de ella.
 */
const WEB = 'M 84 178 C 92 168 102 160 112 156 L 118 168 C 106 174 96 184 90 194 Z';

/** La muñeca: sin ella la mano parece cortada con tijera. */
const WRIST = 'M 106 232 L 146 232 L 150 284 L 102 284 Z';

const Hand: React.FC<{
  side: 'left' | 'right';
  active: number | null;
  dim: boolean;
  accent: string;
  onHover: (n: number | null) => void;
}> = ({ side, active, dim, accent, onHover }) => {
  const digits = [...DIGITS, THUMB as Digit];
  const uid = `hand-${side}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn('w-full h-auto transition-opacity duration-300', dim ? 'opacity-45' : 'opacity-100')}
      role="img"
      aria-label={side === 'right' ? 'Mano derecha' : 'Mano izquierda'}
    >
      <defs>
        {/* La luz viene de arriba: el dorso más claro, los bordes en sombra */}
        <linearGradient id={`${uid}-piel`} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="var(--hand-light)" />
          <stop offset="62%" stopColor="var(--hand-mid)" />
          <stop offset="100%" stopColor="var(--hand-mid)" />
        </linearGradient>
        <radialGradient id={`${uid}-dorso`} cx="0.42" cy="0.62" r="0.55">
          <stop offset="0%" stopColor="var(--hand-light)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--hand-light)" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* La izquierda es la derecha espejada: es lo que es */}
      <g transform={side === 'left' ? `translate(${W} 0) scale(-1 1)` : undefined}>
        {/* Sombra en el piso, para que la mano no flote */}
        <ellipse cx="126" cy="276" rx="56" ry="8" fill="var(--hand-shade)" opacity="0.16" />
        <path d={WRIST} fill={`url(#${uid}-piel)`} stroke="var(--hand-line)" strokeWidth="1.6" strokeLinejoin="round" />

        {/* Dedos primero: la palma los tapa en el nacimiento */}
        {digits.map(d => {
          const on = active === d.num;
          return (
            <g
              key={d.num}
              onMouseEnter={() => onHover(d.num)}
              onMouseLeave={() => onHover(null)}
              className="cursor-default"
              style={on ? { filter: `drop-shadow(0 0 6px ${accent}80)` } : undefined}
            >
              <path
                d={fingerPath(d)}
                fill={`url(#${uid}-piel)`}
                stroke={on ? accent : 'var(--hand-line)'}
                strokeWidth={on ? 2.6 : 1.6}
                strokeLinejoin="round"
                className="transition-all duration-200"
              />
              {/* El dedo señalado se tiñe: sigue siendo piel, no un guante */}
              {on && <path d={fingerPath(d)} fill={accent} opacity="0.42" />}
              {creases(d).map((c, i) => (
                <path key={i} d={c} fill="none" stroke="var(--hand-line)" strokeWidth="1" opacity="0.35" strokeLinecap="round" />
              ))}
              {(() => {
                const n = nail(d);
                return (
                  <rect
                    x={n.x - n.w / 2} y={n.y - n.h / 2} width={n.w} height={n.h}
                    rx={n.w * 0.42}
                    transform={`rotate(${n.rot} ${n.x} ${n.y})`}
                    fill="var(--hand-nail)" stroke="var(--hand-line)" strokeWidth="0.8" opacity={on ? 0.5 : 0.85}
                  />
                );
              })()}
            </g>
          );
        })}

        {/* Palma encima del nacimiento de los dedos */}
        <path d={WEB} fill={`url(#${uid}-piel)`} stroke="var(--hand-line)" strokeWidth="1.4" strokeLinejoin="round" />
        <path d={PALM} fill={`url(#${uid}-piel)`} stroke="var(--hand-line)" strokeWidth="1.8" strokeLinejoin="round" />
        <path d={PALM} fill={`url(#${uid}-dorso)`} />
        {/* Tendones del dorso: apenas insinuados */}
        {DIGITS.map((d, i) => (
          <path
            key={`t${d.num}`}
            d={`M ${d.kx} ${d.ky + 8} Q ${(d.kx + 124) / 2} ${d.ky + 52} ${112 + i * 8} ${222 - i * 4}`}
            fill="none" stroke="var(--hand-line)" strokeWidth="0.9" opacity="0.1"
          />
        ))}
        {/* Nudillos */}
        {DIGITS.map(d => (
          <ellipse key={`k${d.num}`} cx={d.kx} cy={d.ky + 6} rx={d.wBase * 0.32} ry="2.6" fill="var(--hand-shade)" opacity="0.22" />
        ))}
      </g>

      {/* Los números van sin espejar: 5 no se lee al revés */}
      {digits.map(d => {
        const tip = pointOn(d, 0.99, 0);
        const x = side === 'left' ? W - tip.x : tip.x;
        const on = active === d.num;
        return (
          <g
            key={`n${d.num}`}
            onMouseEnter={() => onHover(d.num)}
            onMouseLeave={() => onHover(null)}
            className="cursor-default"
            filter={on ? `url(#${uid}-glow)` : undefined}
          >
            <circle
              cx={x} cy={tip.y} r={on ? 15 : 12.5}
              fill={on ? accent : 'var(--color-surface-2)'}
              stroke={on ? accent : 'var(--color-line-strong)'}
              strokeWidth="1.5"
              className="transition-all duration-200"
            />
            <text
              x={x} y={tip.y + 5}
              textAnchor="middle"
              className={cn('font-mono font-bold select-none transition-all', on ? 'text-[15px]' : 'text-[13px]')}
              fill={on ? 'var(--color-brand-ink)' : 'var(--color-ink-2)'}
            >
              {d.num}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const HandFingeringVisualizer: React.FC<HandFingeringVisualizerProps> = ({
  activeFingering,
  activeHand = 'right',
  activeNote,
  className,
}) => {
  /* Se puede pasar el mouse por un dedo para leer su ficha sin esperar a que
     la partitura llegue a él. */
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? activeFingering ?? null;
  const info = FINGERS.find(f => f.num === shown);
  const rightOn = activeHand === 'right' || activeHand === 'both';
  const leftOn = activeHand === 'left' || activeHand === 'both';

  return (
    <div className={cn('card p-4 md:p-5 space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">Qué dedo va</div>
          <p className="text-[12px] text-ink-2 mt-0.5">
            Los números son los de siempre: 1 el pulgar, 5 el meñique, en las dos manos.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="badge badge-neutral">
            {activeHand === 'right' ? 'Mano derecha' : activeHand === 'left' ? 'Mano izquierda' : 'Las dos manos'}
          </span>
          {activeNote && <span className="badge badge-brand font-mono">{activeNote}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {([
          { side: 'left' as const, on: leftOn, titulo: 'Izquierda', pie: 'clave de fa · bajos', accent: 'var(--color-ok)' },
          { side: 'right' as const, on: rightOn, titulo: 'Derecha', pie: 'clave de sol · melodía', accent: 'var(--color-brand)' },
        ]).map(m => (
          <div
            key={m.side}
            className={cn('rounded-2xl border px-2 pt-2 pb-3 transition-colors',
              m.on ? 'border-brand-line bg-brand-soft/40' : 'border-line bg-surface-2')}
          >
            <div className="flex items-baseline justify-between gap-2 px-1.5 mb-1">
              <span className={cn('text-[12.5px] font-medium', m.on ? 'text-ink' : 'text-ink-3')}>{m.titulo}</span>
              <span className="text-[10.5px] text-ink-3 truncate">{m.pie}</span>
            </div>
            <div className="mx-auto max-w-[220px]">
              <Hand
                side={m.side}
                active={m.on ? shown : null}
                dim={!m.on}
                accent={m.accent}
                onHover={setHover}
              />
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {info ? (
          <motion.div
            key={info.num}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5"
          >
            <span className="w-8 h-8 rounded-lg bg-brand text-brand-ink font-mono font-bold text-[15px] flex items-center justify-center shrink-0">
              {info.num}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-ink">
                {info.name} <span className="text-ink-3 font-normal">· {info.role}</span>
              </div>
              <p className="text-[12.5px] text-ink-2 leading-relaxed mt-0.5">{info.advice}</p>
            </div>
          </motion.div>
        ) : (
          <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[12.5px] text-ink-3">
            Pasá el mouse por un dedo, o reproducí la partitura, para ver qué hace cada uno.
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
