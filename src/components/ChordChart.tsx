import React from 'react';
import { motion } from 'motion/react';
import * as Tone from 'tone';
import { Volume2, Award, Sparkles } from 'lucide-react';
import { ROOTS, CHORD_TYPES, getChordKeys } from '../types';
import { cn } from '../lib/utils';
import { soundEngine, getSavedSoundPreset } from '../lib/soundPresets';

export interface SelectedChordInfo {
  root: string;
  type: string;
  inversion: number;
  name: string;
}

interface ChordChartProps {
  onChordSelect: (keys: string[], info?: SelectedChordInfo) => void;
  onOpenScaleMap?: () => void;
}

export const ChordChart: React.FC<ChordChartProps> = ({ onChordSelect, onOpenScaleMap }) => {
  const [selectedRoot, setSelectedRoot] = React.useState('C');
  const [selectedInversion, setSelectedInversion] = React.useState(0);
  const [lastSelectedType, setLastSelectedType] = React.useState<string>('Major');

  const playChordAudio = async (keys: string[]) => {
    soundEngine.playChord(keys, getSavedSoundPreset(), '1.4n');
  };

  const handleChordClick = (type: string) => {
    setLastSelectedType(type);
    const keys = getChordKeys(selectedRoot, type, selectedInversion);
    const invLabel = selectedInversion === 0 ? '' : selectedInversion === 1 ? ' (1ª Inv)' : ' (2ª Inv)';
    onChordSelect(keys, {
      root: selectedRoot,
      type,
      inversion: selectedInversion,
      name: `${selectedRoot} ${type}${invLabel}`
    });
    playChordAudio(keys);
  };

  return (
    <div className="w-full space-y-8">
      {/* Root Selector & Inversion Selector */}
      <div className="flex flex-col gap-6 items-center">
        <div className="flex flex-wrap gap-2 justify-center">
          {ROOTS.map(root => (
            <button
              key={root}
              type="button"
              onClick={() => {
                setSelectedRoot(root);
                const keys = getChordKeys(root, lastSelectedType, selectedInversion);
                const invLabel = selectedInversion === 0 ? '' : selectedInversion === 1 ? ' (1ª Inv)' : ' (2ª Inv)';
                onChordSelect(keys, {
                  root,
                  type: lastSelectedType,
                  inversion: selectedInversion,
                  name: `${root} ${lastSelectedType}${invLabel}`
                });
                playChordAudio(keys);
              }}
              className={cn(
                "w-10 h-10 md:w-11 md:h-11 rounded-2xl text-xs md:text-sm font-mono font-bold transition-all shadow",
                selectedRoot === root 
                  ? "bg-amber-400 text-black scale-110 shadow-[0_0_20px_rgba(245,158,11,0.5)]" 
                  : "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
              )}
            >
              {root}
            </button>
          ))}
        </div>

        {/* Inversion Selector and Scale Map Shortcut */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex gap-2 p-1.5 glass rounded-2xl border border-white/10">
            {[0, 1, 2].map(inv => (
              <button
                key={inv}
                type="button"
                onClick={() => {
                  setSelectedInversion(inv);
                  const keys = getChordKeys(selectedRoot, lastSelectedType, inv);
                  const invLabel = inv === 0 ? '' : inv === 1 ? ' (1ª Inv)' : ' (2ª Inv)';
                  onChordSelect(keys, {
                    root: selectedRoot,
                    type: lastSelectedType,
                    inversion: inv,
                    name: `${selectedRoot} ${lastSelectedType}${invLabel}`
                  });
                  playChordAudio(keys);
                }}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-mono transition-all",
                  selectedInversion === inv 
                    ? "bg-amber-400 text-black font-bold shadow" 
                    : "text-white/40 hover:text-white/70"
                )}
              >
                {inv === 0 ? 'Posición Fundamental' : inv === 1 ? '1ª Inversión' : '2ª Inversión'}
              </button>
            ))}
          </div>

          {onOpenScaleMap && (
            <button
              type="button"
              onClick={onOpenScaleMap}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold transition-all shadow hover:scale-105"
              title="Abrir el panel Mapa de Escalas (Mayores, Menores Armónicas y Melódicas)"
            >
              <Award size={14} className="text-amber-400" />
              <span>Ver Mapa de Escalas</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Chord Types */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CHORD_TYPES.map(type => {
          const keys = getChordKeys(selectedRoot, type, selectedInversion);
          const isSelected = lastSelectedType === type;

          return (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              key={type}
              type="button"
              onClick={() => handleChordClick(type)}
              className={cn(
                "p-4 rounded-2xl text-left border transition-all group relative overflow-hidden",
                isSelected
                  ? "bg-amber-400/10 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  : "glass border-white/10 hover:border-amber-400/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider">
                  {selectedRoot} {selectedInversion > 0 && `(Inv ${selectedInversion})`}
                </span>
                <Volume2 size={12} className="text-white/30 group-hover:text-amber-300 transition-colors" />
              </div>

              <div className="text-base font-serif font-bold text-white group-hover:text-amber-300 transition-colors mt-1">
                {type}
              </div>

              <div className="mt-3 flex gap-1 flex-wrap">
                {keys.map(k => (
                  <span key={k} className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/60">
                    {k.replace(/\d/, '')}
                  </span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
