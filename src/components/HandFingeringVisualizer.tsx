import React from 'react';
import { motion } from 'motion/react';
import { Hand, Sparkles, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface HandFingeringVisualizerProps {
  activeFingering?: number; // 1 to 5
  activeHand?: 'right' | 'left' | 'both';
  activeNote?: string;
  className?: string;
}

interface FingerInfo {
  num: number;
  name: string;
  role: string;
  advice: string;
  xRight: number;
  yRight: number;
  xLeft: number;
  yLeft: number;
}

const FINGERS_DATA: FingerInfo[] = [
  {
    num: 1,
    name: 'Pulgar',
    role: 'Pivote & Soporte Lateral',
    advice: 'Toca sobre el borde lateral externo de la yema. Pásalo suavemente bajo la palma sin alzar la muñeca.',
    xRight: 24,
    yRight: 62,
    xLeft: 76,
    yLeft: 62,
  },
  {
    num: 2,
    name: 'Índice',
    role: 'Precisión & Dirección',
    advice: 'Curvatura natural constante. Evita que la primera falange se hunda hacia adentro.',
    xRight: 38,
    yRight: 28,
    xLeft: 62,
    yLeft: 28,
  },
  {
    num: 3,
    name: 'Medio',
    role: 'Eje de Balance',
    advice: 'El dedo más largo. Actúa como el centro de gravedad de la bóveda de la mano.',
    xRight: 50,
    yRight: 18,
    xLeft: 50,
    yLeft: 18,
  },
  {
    num: 4,
    name: 'Anular',
    role: 'Independencia & Fuerza',
    advice: 'Comparte tendón con el 3º. Articula levantando exclusivamente desde el nudillo metacarpiano.',
    xRight: 63,
    yRight: 25,
    xLeft: 37,
    yLeft: 25,
  },
  {
    num: 5,
    name: 'Meñique',
    role: 'Bajo & Melodía Externa',
    advice: 'Pilar fundamental de la mano. Mantén la articulación firme para un sonido brillante sin colapsar.',
    xRight: 76,
    yRight: 42,
    xLeft: 24,
    yLeft: 42,
  },
];

export const HandFingeringVisualizer: React.FC<HandFingeringVisualizerProps> = ({
  activeFingering,
  activeHand = 'right',
  activeNote,
  className,
}) => {
  const currentFingerInfo = FINGERS_DATA.find(f => f.num === activeFingering);

  return (
    <div className={cn("p-4 md:p-6 rounded-3xl bg-black/60 border border-white/10 space-y-4", className)}>
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
          <Activity size={15} />
          <span>Guía Anatómica de Digitación Técnica</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-white/50">
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            {activeHand === 'right' ? 'Mano Derecha (MD)' : activeHand === 'left' ? 'Mano Izquierda (MI)' : 'Ambas Manos'}
          </span>
          {activeNote && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
              {activeNote}
            </span>
          )}
        </div>
      </div>

      {/* Hands Schematic Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left Hand Diagram */}
        <div className={cn(
          "p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 relative",
          activeHand === 'left' || activeHand === 'both'
            ? "bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
            : "bg-white/[0.02] border-white/5 opacity-50"
        )}>
          <div className="flex items-center justify-between w-full text-xs font-mono">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Hand size={14} className="-scale-x-100" />
              <span>Mano Izquierda (MI)</span>
            </span>
            <span className="text-[10px] text-white/40">Clave de Fa / Bajos</span>
          </div>

          {/* SVG Hand Left */}
          <div className="relative w-48 h-44 flex items-center justify-center">
            <svg viewBox="0 0 100 90" className="w-full h-full drop-shadow-md">
              {/* Palm contour */}
              <path
                d="M 30 75 C 22 75 22 62 25 50 C 27 40 35 38 45 42 C 55 42 65 40 73 50 C 78 58 75 75 68 75 Z"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              {/* Wrist base */}
              <path
                d="M 35 80 L 63 80"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Fingers nodes for Left Hand: 5 is far left, 1 is far right (thumb) */}
              {FINGERS_DATA.map((finger) => {
                const isActive = (activeHand === 'left' || activeHand === 'both') && activeFingering === finger.num;
                return (
                  <g key={finger.num} className="transition-all">
                    {/* Connecting tendon line */}
                    <line
                      x1="49"
                      y1="64"
                      x2={finger.xLeft}
                      y2={finger.yLeft}
                      stroke={isActive ? "#10b981" : "rgba(255,255,255,0.15)"}
                      strokeWidth={isActive ? "2.5" : "1"}
                    />
                    {/* Finger node circle */}
                    <circle
                      cx={finger.xLeft}
                      cy={finger.yLeft}
                      r={isActive ? "8.5" : "6.5"}
                      className={cn(
                        "transition-all cursor-default",
                        isActive
                          ? "fill-emerald-400 stroke-emerald-200 stroke-2 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                          : "fill-[#141b24] stroke-white/30 stroke-1"
                      )}
                    />
                    {/* Number label */}
                    <text
                      x={finger.xLeft}
                      y={finger.yLeft + 3.5}
                      textAnchor="middle"
                      className={cn(
                        "text-[9px] font-mono font-bold select-none",
                        isActive ? "fill-black" : "fill-white/80"
                      )}
                    >
                      {finger.num}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Quick fingertips labels */}
          <div className="flex items-center justify-between w-full px-2 text-[10px] font-mono text-white/50">
            <span>5: Meñique</span>
            <span>4: Anular</span>
            <span>3: Medio</span>
            <span>2: Índice</span>
            <span>1: Pulgar</span>
          </div>
        </div>

        {/* Right Hand Diagram */}
        <div className={cn(
          "p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 relative",
          activeHand === 'right' || activeHand === 'both'
            ? "bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/10"
            : "bg-white/[0.02] border-white/5 opacity-50"
        )}>
          <div className="flex items-center justify-between w-full text-xs font-mono">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Hand size={14} />
              <span>Mano Derecha (MD)</span>
            </span>
            <span className="text-[10px] text-white/40">Clave de Sol / Melodía</span>
          </div>

          {/* SVG Hand Right */}
          <div className="relative w-48 h-44 flex items-center justify-center">
            <svg viewBox="0 0 100 90" className="w-full h-full drop-shadow-md">
              {/* Palm contour */}
              <path
                d="M 32 75 C 25 75 22 58 27 50 C 35 40 45 42 55 42 C 65 38 73 40 75 50 C 78 62 78 75 70 75 Z"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              {/* Wrist base */}
              <path
                d="M 37 80 L 65 80"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Fingers nodes for Right Hand: 1 is far left (thumb), 5 is far right */}
              {FINGERS_DATA.map((finger) => {
                const isActive = (activeHand === 'right' || activeHand === 'both') && activeFingering === finger.num;
                return (
                  <g key={finger.num} className="transition-all">
                    {/* Connecting tendon line */}
                    <line
                      x1="51"
                      y1="64"
                      x2={finger.xRight}
                      y2={finger.yRight}
                      stroke={isActive ? "#fbbf24" : "rgba(255,255,255,0.15)"}
                      strokeWidth={isActive ? "2.5" : "1"}
                    />
                    {/* Finger node circle */}
                    <circle
                      cx={finger.xRight}
                      cy={finger.yRight}
                      r={isActive ? "8.5" : "6.5"}
                      className={cn(
                        "transition-all cursor-default",
                        isActive
                          ? "fill-amber-400 stroke-amber-200 stroke-2 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                          : "fill-[#141b24] stroke-white/30 stroke-1"
                      )}
                    />
                    {/* Number label */}
                    <text
                      x={finger.xRight}
                      y={finger.yRight + 3.5}
                      textAnchor="middle"
                      className={cn(
                        "text-[9px] font-mono font-bold select-none",
                        isActive ? "fill-black" : "fill-white/80"
                      )}
                    >
                      {finger.num}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Quick fingertips labels */}
          <div className="flex items-center justify-between w-full px-2 text-[10px] font-mono text-white/50">
            <span>1: Pulgar</span>
            <span>2: Índice</span>
            <span>3: Medio</span>
            <span>4: Anular</span>
            <span>5: Meñique</span>
          </div>
        </div>
      </div>

      {/* Active Finger Pedagogical Card */}
      {currentFingerInfo ? (
        <motion.div
          key={currentFingerInfo.num}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0 font-serif font-bold text-lg">
            {currentFingerInfo.num}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-white uppercase">{currentFingerInfo.name}</span>
              <span className="text-white/40">•</span>
              <span className="text-amber-400 font-semibold">{currentFingerInfo.role}</span>
            </div>
            <p className="text-white/70 font-light leading-relaxed">
              {currentFingerInfo.advice}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs font-mono text-white/40">
          Inicia la reproducción de la partitura o selecciona una nota para ver el dedo técnico activo.
        </div>
      )}
    </div>
  );
};
