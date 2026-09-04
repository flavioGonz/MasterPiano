import React, { useState } from 'react';
import * as Tone from 'tone';
import { Music, Volume2, Sparkles, Compass } from 'lucide-react';
import { cn } from '../lib/utils';
import { getChordKeys } from '../types';

interface CircleKey {
  root: string;
  majorName: string;
  minorName: string;
  accidentals: string;
  sharpsCount: number;
  flatsCount: number;
  angle: number; // in degrees
}

const CIRCLE_KEYS: CircleKey[] = [
  { root: 'C', majorName: 'Do Mayor (C)', minorName: 'La menor (Am)', accidentals: '0 alteraciones', sharpsCount: 0, flatsCount: 0, angle: 0 },
  { root: 'G', majorName: 'Sol Mayor (G)', minorName: 'Mi menor (Em)', accidentals: '1 sostenido (F#)', sharpsCount: 1, flatsCount: 0, angle: 30 },
  { root: 'D', majorName: 'Re Mayor (D)', minorName: 'Si menor (Bm)', accidentals: '2 sostenidos (F#, C#)', sharpsCount: 2, flatsCount: 0, angle: 60 },
  { root: 'A', majorName: 'La Mayor (A)', minorName: 'Fa# menor (F#m)', accidentals: '3 sostenidos (F#, C#, G#)', sharpsCount: 3, flatsCount: 0, angle: 90 },
  { root: 'E', majorName: 'Mi Mayor (E)', minorName: 'Do# menor (C#m)', accidentals: '4 sostenidos (F#, C#, G#, D#)', sharpsCount: 4, flatsCount: 0, angle: 120 },
  { root: 'B', majorName: 'Si Mayor (B)', minorName: 'Sol# menor (G#m)', accidentals: '5 sostenidos (F#, C#, G#, D#, A#)', sharpsCount: 5, flatsCount: 0, angle: 150 },
  { root: 'F#', majorName: 'Fa# Mayor (F#)', minorName: 'Re# menor (D#m)', accidentals: '6 sostenidos (o 6 bemoles)', sharpsCount: 6, flatsCount: 0, angle: 180 },
  { root: 'C#', majorName: 'Re♭ Mayor (Db)', minorName: 'Si♭ menor (Bbm)', accidentals: '5 bemoles (Bb, Eb, Ab, Db, Gb)', sharpsCount: 0, flatsCount: 5, angle: 210 },
  { root: 'G#', majorName: 'La♭ Mayor (Ab)', minorName: 'Fa menor (Fm)', accidentals: '4 bemoles (Bb, Eb, Ab, Db)', sharpsCount: 0, flatsCount: 4, angle: 240 },
  { root: 'D#', majorName: 'Mi♭ Mayor (Eb)', minorName: 'Do menor (Cm)', accidentals: '3 bemoles (Bb, Eb, Ab)', sharpsCount: 0, flatsCount: 3, angle: 270 },
  { root: 'A#', majorName: 'Si♭ Mayor (Bb)', minorName: 'Sol menor (Gm)', accidentals: '2 bemoles (Bb, Eb)', sharpsCount: 0, flatsCount: 2, angle: 300 },
  { root: 'F', majorName: 'Fa Mayor (F)', minorName: 'Re menor (Dm)', accidentals: '1 bemol (Bb)', sharpsCount: 0, flatsCount: 1, angle: 330 },
];

interface CircleOfFifthsProps {
  onSelectChordKeys?: (keys: string[]) => void;
}

export const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({ onSelectChordKeys }) => {
  const [selectedKey, setSelectedKey] = useState<CircleKey>(CIRCLE_KEYS[0]);
  const [activeVoice, setActiveVoice] = useState<'major' | 'minor'>('major');

  const playKeyChord = async (key: CircleKey, voice: 'major' | 'minor') => {
    await Tone.start();
    const type = voice === 'major' ? 'Major' : 'Minor';
    const rootForKeys = voice === 'major' 
      ? key.root 
      : (key.minorName.split(' ')[0] === 'La' ? 'A' : key.minorName.includes('Mi') ? 'E' : key.minorName.includes('Si') ? 'B' : key.minorName.includes('Fa#') ? 'F#' : key.minorName.includes('Do#') ? 'C#' : key.minorName.includes('Sol#') ? 'G#' : key.minorName.includes('Re#') ? 'D#' : key.minorName.includes('Fa') ? 'F' : key.minorName.includes('Do') ? 'C' : key.minorName.includes('Sol') ? 'G' : 'D');
    
    const keys = getChordKeys(rootForKeys, type, 0);
    onSelectChordKeys?.(keys);

    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.triggerAttackRelease(keys, '1n');
    setTimeout(() => synth.dispose(), 1500);
  };

  const handleSelect = (key: CircleKey) => {
    setSelectedKey(key);
    playKeyChord(key, activeVoice);
  };

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-widest">
          <Compass size={16} />
          <span>Brújula Armónica Universal</span>
        </div>
        <h3 className="text-3xl md:text-4xl font-serif font-bold text-white">El Círculo de Quintas Interactivo</h3>
        <p className="text-xs md:text-sm text-white/60 font-light leading-relaxed">
          Haz clic en cualquier tonalidad para escuchar su acorde, descubrir su armadura de clave y su relativa menor correspondiente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Interactive Radial Wheel (7 cols) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative w-80 h-80 md:w-96 md:h-96 rounded-full glass border border-amber-500/30 p-4 shadow-2xl flex items-center justify-center">
            {/* Center Core Display */}
            <div className="w-32 h-32 rounded-full bg-[#0a0c12] border border-amber-400/30 flex flex-col items-center justify-center text-center p-2 z-10 shadow-inner">
              <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Tonalidad</div>
              <div className="text-2xl font-serif font-bold text-white">{selectedKey.root}</div>
              <div className="text-[10px] font-mono text-white/50">{selectedKey.accidentals}</div>
            </div>

            {/* 12 Outer Nodes */}
            {CIRCLE_KEYS.map((k) => {
              const isSelected = selectedKey.root === k.root;
              // Angle in radians adjusted so 0 deg is at top (12 o'clock)
              const rad = ((k.angle - 90) * Math.PI) / 180;
              const radius = 135; // px from center
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;

              return (
                <button
                  key={k.root}
                  type="button"
                  onClick={() => handleSelect(k)}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  className={cn(
                    "absolute w-12 h-12 md:w-14 md:h-14 rounded-2xl flex flex-col items-center justify-center font-mono transition-all duration-300 shadow-md",
                    isSelected
                      ? "bg-amber-400 text-black scale-110 font-bold ring-4 ring-amber-400/30 shadow-[0_0_20px_#f59e0b]"
                      : "bg-[#141824] text-white/80 hover:bg-white/10 hover:text-white border border-white/10"
                  )}
                  title={`${k.majorName} - Relativa: ${k.minorName}`}
                >
                  <span className="text-sm leading-none">{k.root}</span>
                  <span className={cn("text-[9px] mt-0.5", isSelected ? "text-black/70" : "text-amber-400/80")}>
                    {k.sharpsCount > 0 ? `${k.sharpsCount}#` : k.flatsCount > 0 ? `${k.flatsCount}♭` : '0'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Key Detail Card (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass p-6 rounded-3xl border border-white/10 space-y-6">
            <div className="space-y-1">
              <div className="text-xs uppercase font-mono tracking-widest text-amber-400">
                Detalles de Tonalidad
              </div>
              <h4 className="text-2xl font-serif font-bold text-white">{selectedKey.majorName}</h4>
              <p className="text-xs text-white/50">{selectedKey.accidentals}</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-mono text-white/40">Tonalidad Mayor (Tónica)</div>
                  <div className="text-base font-bold text-white">{selectedKey.majorName}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveVoice('major');
                    playKeyChord(selectedKey, 'major');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-black rounded-xl text-xs font-semibold hover:bg-amber-300 transition-colors shadow"
                >
                  <Volume2 size={13} />
                  <span>Escuchar</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-mono text-white/40">Relativa Menor (Grado vi)</div>
                  <div className="text-base font-bold text-white">{selectedKey.minorName}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveVoice('minor');
                    playKeyChord(selectedKey, 'minor');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white rounded-xl text-xs font-medium hover:bg-white/20 transition-colors"
                >
                  <Volume2 size={13} />
                  <span>Escuchar</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed font-light">
              <span className="font-semibold text-amber-300">Aplicación Práctica: </span>
              Cualquier canción en <strong className="text-white">{selectedKey.root} Mayor</strong> combinará de forma natural con los acordes vecinos directos a la izquierda y derecha en el círculo, más sus relativas menores.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
