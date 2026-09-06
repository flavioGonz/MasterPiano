import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { cn } from '../lib/utils';
import { Volume2, Keyboard, Music2, Sparkles, Sliders, Layers, ChevronRight } from 'lucide-react';
import { FINGER_NAMES } from '../lib/musicGymTheory';
import { 
  SoundPreset, 
  SOUND_PRESETS, 
  getSavedSoundPreset, 
  saveSoundPreset, 
  soundEngine,
  SplitKeyboardConfig,
  getSavedSplitConfig,
  saveSplitConfig,
  isNoteInLeftHand,
  SPLIT_POINT_OPTIONS,
  SPLIT_PRESET_COMBINATIONS,
  SplitPresetCombination
} from '../lib/soundPresets';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [3, 4, 5];

const KEYBOARD_MAP: Record<string, string> = {
  // Lower octave (C3 - B3)
  'z': 'C3', 's': 'C#3', 'x': 'D3', 'd': 'D#3', 'c': 'E3', 'v': 'F3', 'g': 'F#3', 'b': 'G3', 'h': 'G#3', 'n': 'A3', 'j': 'A#3', 'm': 'B3',
  // Middle octave (C4 - B4)
  'q': 'C4', '2': 'C#4', 'w': 'D4', '3': 'D#4', 'e': 'E4', 'r': 'F4', '5': 'F#4', 't': 'G4', '6': 'G#4', 'y': 'A4', '7': 'A#4', 'u': 'B4',
  // Higher octave (C5 - G5)
  'i': 'C5', '9': 'C#5', 'o': 'D5', '0': 'D#5', 'p': 'E5', '[': 'F5', '=': 'F#5', ']': 'G5',
};

export type { SoundPreset };

interface PianoProps {
  activeNotes?: string[];
  correctNotes?: string[];
  errorNotes?: string[];
  fingerGuide?: Record<string, number>;
  showFingerGuide?: boolean;
  onToggleFingerGuide?: (show: boolean) => void;
  showFingerGuideToggle?: boolean;
  onNotePlay?: (note: string) => void;
  compact?: boolean;
  soundPreset?: SoundPreset;
  onSoundPresetChange?: (preset: SoundPreset) => void;
  showSoundSelector?: boolean;
  splitConfig?: SplitKeyboardConfig;
  onSplitConfigChange?: (config: SplitKeyboardConfig) => void;
  showSplitToggle?: boolean;
}

export const Piano: React.FC<PianoProps> = ({
  activeNotes = [],
  correctNotes = [],
  errorNotes = [],
  fingerGuide,
  showFingerGuide: controlledShowFingerGuide,
  onToggleFingerGuide,
  showFingerGuideToggle = true,
  onNotePlay,
  compact = false,
  soundPreset: controlledPreset,
  onSoundPresetChange,
  showSoundSelector = true,
  splitConfig: controlledSplitConfig,
  onSplitConfigChange,
  showSplitToggle = true,
}) => {
  const [pressedNotes, setPressedNotes] = useState<Set<string>>(new Set());
  const [showKeyboardLabels, setShowKeyboardLabels] = useState(true);
  const [showNoteNames, setShowNoteNames] = useState(true);
  const [internalShowFingerGuide, setInternalShowFingerGuide] = useState(true);
  const isFingerGuideActive = controlledShowFingerGuide !== undefined ? controlledShowFingerGuide : internalShowFingerGuide;
  const [soundReady, setSoundReady] = useState(false);
  const [activePreset, setActivePreset] = useState<SoundPreset>(() => 
    controlledPreset || getSavedSoundPreset()
  );
  const [splitConfig, setSplitConfig] = useState<SplitKeyboardConfig>(() => 
    controlledSplitConfig || getSavedSplitConfig()
  );

  // Sync with controlled preset prop if provided
  useEffect(() => {
    if (controlledPreset && controlledPreset !== activePreset) {
      setActivePreset(controlledPreset);
    }
  }, [controlledPreset]);

  // Sync with controlled split prop if provided
  useEffect(() => {
    if (controlledSplitConfig) {
      setSplitConfig(controlledSplitConfig);
    }
  }, [controlledSplitConfig]);

  // Sync preset across tabs/instances via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<SoundPreset>;
      if (custom.detail && custom.detail !== activePreset) {
        setActivePreset(custom.detail);
      }
    };
    window.addEventListener('piano-preset-changed', handler);
    return () => window.removeEventListener('piano-preset-changed', handler);
  }, [activePreset]);

  // Sync split config across tabs/instances via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<SplitKeyboardConfig>;
      if (custom.detail) {
        setSplitConfig(custom.detail);
      }
    };
    window.addEventListener('piano-split-changed', handler);
    return () => window.removeEventListener('piano-split-changed', handler);
  }, []);

  // Initialize global multi-instrument sound engine
  useEffect(() => {
    soundEngine.init();
    setSoundReady(true);
  }, []);

  const handlePresetChange = (newPreset: SoundPreset) => {
    setActivePreset(newPreset);
    saveSoundPreset(newPreset);
    onSoundPresetChange?.(newPreset);
    soundEngine.playNote('C4', newPreset, '0.4n');
  };

  const handleToggleSplit = () => {
    const updated: SplitKeyboardConfig = {
      ...splitConfig,
      enabled: !splitConfig.enabled,
    };
    setSplitConfig(updated);
    saveSplitConfig(updated);
    onSplitConfigChange?.(updated);

    if (updated.enabled) {
      soundEngine.playNote('C3', updated.leftPreset, '0.4n');
      setTimeout(() => {
        soundEngine.playNote('G4', updated.rightPreset, '0.5n');
      }, 200);
    }
  };

  const handleSplitNoteChange = (newSplitNote: string) => {
    const updated: SplitKeyboardConfig = {
      ...splitConfig,
      splitNote: newSplitNote,
    };
    setSplitConfig(updated);
    saveSplitConfig(updated);
    onSplitConfigChange?.(updated);
  };

  const handleLeftPresetChange = (preset: SoundPreset) => {
    const updated: SplitKeyboardConfig = {
      ...splitConfig,
      leftPreset: preset,
    };
    setSplitConfig(updated);
    saveSplitConfig(updated);
    onSplitConfigChange?.(updated);
    soundEngine.playNote('C3', preset, '0.4n');
  };

  const handleRightPresetChange = (preset: SoundPreset) => {
    const updated: SplitKeyboardConfig = {
      ...splitConfig,
      rightPreset: preset,
    };
    setSplitConfig(updated);
    saveSplitConfig(updated);
    onSplitConfigChange?.(updated);
    soundEngine.playNote('G4', preset, '0.4n');
  };

  const applyPresetCombination = (comb: SplitPresetCombination) => {
    const updated: SplitKeyboardConfig = {
      ...splitConfig,
      enabled: true,
      leftPreset: comb.left,
      rightPreset: comb.right,
    };
    setSplitConfig(updated);
    saveSplitConfig(updated);
    onSplitConfigChange?.(updated);
    soundEngine.playNote('C3', comb.left, '0.4n');
    setTimeout(() => {
      soundEngine.playNote('G4', comb.right, '0.5n');
    }, 200);
  };

  const playNoteAudio = useCallback((note: string) => {
    if (splitConfig.enabled) {
      const isLeft = isNoteInLeftHand(note, splitConfig.splitNote);
      const targetPreset = isLeft ? splitConfig.leftPreset : splitConfig.rightPreset;
      soundEngine.playNote(note, targetPreset, "1.5n");
    } else {
      soundEngine.playNote(note, activePreset, "1.5n");
    }
  }, [splitConfig, activePreset]);

  const handleNoteTrigger = useCallback((note: string) => {
    playNoteAudio(note);
    setPressedNotes(prev => {
      const next = new Set(prev);
      next.add(note);
      return next;
    });

    onNotePlay?.(note);

    setTimeout(() => {
      setPressedNotes(prev => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    }, 250);
  }, [playNoteAudio, onNotePlay]);

  // Physical computer keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note) {
        e.preventDefault();
        handleNoteTrigger(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNoteTrigger]);

  // Calculate keyboard layout keys
  const allKeys = OCTAVES.flatMap(octave => 
    NOTES.map(note => `${note}${octave}`)
  );

  const handleToggleFingerGuide = () => {
    const nextVal = !isFingerGuideActive;
    setInternalShowFingerGuide(nextVal);
    if (onToggleFingerGuide) {
      onToggleFingerGuide(nextVal);
    }
  };

  const hasFingerGuide = !!(fingerGuide && Object.keys(fingerGuide).length > 0);

  // Helper to reverse lookup PC key shortcut for display
  const getPcKeyForNote = (note: string): string | null => {
    const entry = Object.entries(KEYBOARD_MAP).find(([_, n]) => n === note);
    return entry ? entry[0].toUpperCase() : null;
  };

  const currentPresetInfo = SOUND_PRESETS.find(p => p.id === activePreset) || SOUND_PRESETS[0];
  const leftPresetInfo = SOUND_PRESETS.find(p => p.id === splitConfig.leftPreset) || SOUND_PRESETS[0];
  const rightPresetInfo = SOUND_PRESETS.find(p => p.id === splitConfig.rightPreset) || SOUND_PRESETS[1];
  const selectedSplitOption = SPLIT_POINT_OPTIONS.find(p => p.note === splitConfig.splitNote) || SPLIT_POINT_OPTIONS[0];

  return (
    <div className="w-full space-y-3">
      {/* Piano Control Bar with Sound Selector & Split Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-2 text-xs text-white/50">
        
        {/* Left: Info & Audio Status */}
        <div className="flex items-center gap-2 font-mono">
          <Music2 size={14} className="text-amber-400" />
          <span className="font-semibold text-white/80">Teclado Virtual</span>
          <span className="text-white/40 hidden sm:inline">(3 Octavas: C3 - B5)</span>
          {soundReady && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Audio Listo
            </span>
          )}
          {splitConfig.enabled && (
            <span className="flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/40 font-mono font-bold animate-fadeIn">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              Split Activo
            </span>
          )}
          {isFingerGuideActive && hasFingerGuide && (
            <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30 font-mono font-semibold animate-fadeIn">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Digitación 1-5
            </span>
          )}
        </div>

        {/* Right: Sound Preset Selector, Split Mode Toggle & View Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Split Mode Toggle Button */}
          {showSplitToggle && (
            <button
              type="button"
              id="btn-toggle-split-keyboard"
              onClick={handleToggleSplit}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-all select-none",
                splitConfig.enabled
                  ? "bg-indigo-600 border-indigo-400 text-white font-bold shadow-md shadow-indigo-500/30 scale-[1.02]"
                  : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
              )}
              title="Dividir el piano en dos mitades con timbres independientes para mano izquierda y derecha"
            >
              <Sliders size={13} className={splitConfig.enabled ? "text-indigo-200" : "text-amber-400"} />
              <span>Teclado Dividido</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded text-[9px] font-extrabold",
                splitConfig.enabled ? "bg-white/20 text-white" : "bg-black/30 text-white/50"
              )}>
                {splitConfig.enabled ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

          {/* Standard Sound Presets Selector (when Split is OFF) */}
          {showSoundSelector && !splitConfig.enabled && (
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-2xl border border-white/10 shadow-inner">
              <span className="text-[10px] uppercase font-mono text-white/40 px-2 hidden lg:inline">
                Sonido:
              </span>
              {SOUND_PRESETS.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all select-none",
                      isSelected
                        ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20 scale-[1.02]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                    title={preset.description}
                  >
                    <span>{preset.icon}</span>
                    <span className="hidden sm:inline">{preset.label}</span>
                    <span className="sm:hidden">{preset.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Controls: Hotkeys, Note Names & Fingering Numbers */}
          <div className="flex items-center gap-1.5">
            {/* Recommended Fingering Numbers (1-5) Toggle */}
            {showFingerGuideToggle && (
              <button
                type="button"
                id="btn-toggle-finger-guide"
                onClick={handleToggleFingerGuide}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono transition-all",
                  isFingerGuideActive && hasFingerGuide
                    ? "bg-amber-400/20 border-amber-400/60 text-amber-300 font-bold shadow-sm shadow-amber-400/20 scale-[1.02]"
                    : isFingerGuideActive
                    ? "bg-white/10 border-white/20 text-white/80"
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                )}
                title={
                  hasFingerGuide
                    ? `Digitación recomendada (1-5): ${isFingerGuideActive ? 'ACTIVADA' : 'DESACTIVADA'}. (1=Pulgar, 2=Índice, 3=Medio, 4=Anular, 5=Meñique)`
                    : "Digitación recomendada (1-5): activa la guía de números sobre las teclas durante escalas y ejercicios de técnica"
                }
              >
                <span>🖐️</span>
                <span className="hidden sm:inline">Digitación 1-5</span>
                <span className="sm:hidden">1-5</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[9px] font-extrabold font-mono",
                  isFingerGuideActive && hasFingerGuide
                    ? "bg-amber-400 text-black"
                    : isFingerGuideActive
                    ? "bg-white/20 text-white"
                    : "bg-black/30 text-white/40"
                )}>
                  {isFingerGuideActive ? 'ON' : 'OFF'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowKeyboardLabels(prev => !prev)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono transition-all",
                showKeyboardLabels
                  ? "bg-amber-400/10 border-amber-400/40 text-amber-300"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
              )}
              title="Mostrar u ocultar teclas de atajo de tu computadora"
            >
              <Keyboard size={13} />
              <span className="hidden sm:inline">Atajos PC ({showKeyboardLabels ? 'ON' : 'OFF'})</span>
              <span className="sm:hidden">PC</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNoteNames(prev => !prev)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono transition-all",
                showNoteNames
                  ? "bg-amber-400/10 border-amber-400/40 text-amber-300"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
              )}
              title="Mostrar u ocultar nombres de notas (Do, Re, Mi...)"
            >
              <span>Notas ({showNoteNames ? 'ON' : 'OFF'})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Fingering Legend Strip (Active when fingerGuide is available and ON) */}
      {isFingerGuideActive && hasFingerGuide && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-black/40 border border-amber-500/30 text-[11px] font-mono text-amber-200/90 shadow-sm animate-fadeIn">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold flex items-center gap-1 text-amber-400">
              <span>🖐️</span>
              <span>Digitación Recomendada:</span>
            </span>
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.5 rounded">
                <span className="w-4 h-4 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-[9px]">1</span> 
                <span>Pulgar</span>
              </span>
              <span className="flex items-center gap-1 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.5 rounded">
                <span className="w-4 h-4 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-[9px]">2</span> 
                <span>Índice</span>
              </span>
              <span className="flex items-center gap-1 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.5 rounded">
                <span className="w-4 h-4 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-[9px]">3</span> 
                <span>Medio</span>
              </span>
              <span className="flex items-center gap-1 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.5 rounded">
                <span className="w-4 h-4 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-[9px]">4</span> 
                <span>Anular</span>
              </span>
              <span className="flex items-center gap-1 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.5 rounded">
                <span className="w-4 h-4 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-[9px]">5</span> 
                <span>Meñique</span>
              </span>
            </div>
          </div>
          <span className="text-[10px] text-amber-300/80 italic hidden lg:inline">
            💡 Técnica: dedos curvados y peso fluido de brazo en el pasaje de pulgar
          </span>
        </div>
      )}

      {/* SPLIT KEYBOARD CONTROL PANEL (Active when Split Mode is ON) */}
      {splitConfig.enabled && (
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900/60 to-amber-950/50 border border-indigo-500/30 space-y-3 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Left Hand Zone: Acompañamiento / Bajos */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex-1">
              <span className="text-xl">👈</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-indigo-300">Mano Izquierda (Acompañamiento)</span>
                    <span className="text-[10px] text-indigo-400 bg-indigo-900/70 px-1.5 py-0.5 rounded font-mono">
                      {selectedSplitOption.leftRange}
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-300/60 font-mono hidden sm:inline">
                    {leftPresetInfo.character}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {SOUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleLeftPresetChange(preset.id)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all",
                        splitConfig.leftPreset === preset.id
                          ? "bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/30 scale-[1.02]"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                      title={`Asignar ${preset.label} a la mano izquierda`}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Split Point Selector */}
            <div className="flex flex-col items-center justify-center px-2 py-1 bg-black/40 rounded-xl border border-white/10 shrink-0">
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Sliders size={11} className="text-amber-400" />
                Punto de Corte:
              </span>
              <select
                value={splitConfig.splitNote}
                onChange={(e) => handleSplitNoteChange(e.target.value)}
                className="bg-slate-900 border border-white/20 text-white text-xs font-mono rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {SPLIT_POINT_OPTIONS.map((opt) => (
                  <option key={opt.note} value={opt.note} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Right Hand Zone: Melodía / Solos */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 flex-1">
              <span className="text-xl">👉</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-amber-300">Mano Derecha (Melodía)</span>
                    <span className="text-[10px] text-amber-400 bg-amber-900/70 px-1.5 py-0.5 rounded font-mono">
                      {selectedSplitOption.rightRange}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300/60 font-mono hidden sm:inline">
                    {rightPresetInfo.character}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {SOUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleRightPresetChange(preset.id)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all",
                        splitConfig.rightPreset === preset.id
                          ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20 scale-[1.02]"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                      title={`Asignar ${preset.label} a la mano derecha`}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Preset Combinations & Ergonomic Tip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-white/50">Combinaciones sugeridas:</span>
              {SPLIT_PRESET_COMBINATIONS.map((comb) => (
                <button
                  key={comb.name}
                  type="button"
                  onClick={() => applyPresetCombination(comb)}
                  className={cn(
                    "px-2 py-0.5 rounded-lg border text-[10px] transition-all",
                    splitConfig.leftPreset === comb.left && splitConfig.rightPreset === comb.right
                      ? "bg-white/20 border-white/40 text-white font-bold"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                  )}
                  title={comb.description}
                >
                  {comb.name}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-indigo-300/80 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
              💡 <span className="font-semibold text-white">Atajo PC:</span> Fila <kbd className="text-indigo-300 font-bold bg-indigo-950/80 px-1 py-0.5 rounded">Z - M</kbd> Mano Izquierda • Fila <kbd className="text-amber-300 font-bold bg-amber-950/80 px-1 py-0.5 rounded">Q - P</kbd> Mano Derecha
            </div>
          </div>
        </div>
      )}

      {/* Active Instrument Characteristic Bar (when Split is OFF) */}
      {showSoundSelector && !splitConfig.enabled && (
        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-mono text-white/50 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>{currentPresetInfo.icon}</span>
              <span>{currentPresetInfo.label}</span>
            </span>
            <span className="text-white/30">•</span>
            <span className="text-white/60">{currentPresetInfo.character}</span>
          </div>
          <span className="text-[10px] text-white/40 hidden md:inline">
            {currentPresetInfo.description}
          </span>
        </div>
      )}

      {/* Piano Keys Stage */}
      <div className="relative p-4 md:p-6 bg-gradient-to-b from-[#141721] to-[#0a0c12] rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-x-auto select-none">
        <div className="flex justify-center min-w-max mx-auto relative pt-4 pb-2">
          {allKeys.map((noteKey) => {
            const isBlack = noteKey.includes('#');
            const isPressed = pressedNotes.has(noteKey);
            const isActive = activeNotes.includes(noteKey);
            const isCorrect = correctNotes.includes(noteKey);
            const isError = errorNotes.includes(noteKey);
            const displayedFinger = isFingerGuideActive ? fingerGuide?.[noteKey] : undefined;
            const pcKey = getPcKeyForNote(noteKey);

            // Split Mode state for this specific note
            const isLeftHand = splitConfig.enabled && isNoteInLeftHand(noteKey, splitConfig.splitNote);
            const isSplitBoundary = splitConfig.enabled && noteKey === splitConfig.splitNote;

            // Pitch note base name (e.g. C, D, C#)
            const noteBase = noteKey.replace(/\d/, '');
            const octave = noteKey.slice(-1);

            const fingerInfo = displayedFinger ? FINGER_NAMES[displayedFinger] : null;
            const fingerTooltip = displayedFinger ? ` • Dedo ${displayedFinger} (${fingerInfo?.name || 'Digitación'})` : '';

            if (isBlack) {
              return (
                <button
                  key={noteKey}
                  type="button"
                  onMouseDown={() => handleNoteTrigger(noteKey)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleNoteTrigger(noteKey);
                  }}
                  className={cn(
                    "piano-key-black flex flex-col justify-between items-center py-2 relative",
                    compact && "h-24 w-5 -mx-2.5",
                    // Pressed visual states
                    isPressed && (
                      splitConfig.enabled
                        ? (isLeftHand 
                            ? "!bg-indigo-400 !translate-y-1 shadow-[0_0_20px_rgba(99,102,241,0.9)] border-indigo-200" 
                            : "!bg-amber-300 !translate-y-1 shadow-[0_0_20px_rgba(245,158,11,0.9)] border-amber-200")
                        : "!bg-amber-300 !translate-y-1 shadow-[0_0_20px_rgba(245,158,11,0.8)]"
                    ),
                    isActive && !isPressed && "!bg-gradient-to-b !from-amber-500 !to-amber-600 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
                    isCorrect && "!bg-emerald-500 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.8)]",
                    isError && "!bg-rose-600 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.8)]",
                    // Split mode resting accent
                    splitConfig.enabled && isLeftHand && "border-b-2 border-indigo-400/60"
                  )}
                  title={`${noteKey}${fingerTooltip} (${pcKey ? `Tecla PC: ${pcKey}` : ''})${splitConfig.enabled ? ` - ${isLeftHand ? 'Mano Izquierda' : 'Mano Derecha'}` : ''}`}
                >
                  {/* Finger number badge if provided */}
                  {displayedFinger ? (
                    <div className={cn(
                      "flex flex-col items-center gap-0.5 transition-transform",
                      isActive && "scale-110"
                    )}>
                      <span className={cn(
                        "w-5 h-5 rounded-full font-bold text-[11px] flex items-center justify-center shadow transition-all font-mono",
                        isActive
                          ? "bg-amber-400 text-black ring-2 ring-amber-300 ring-offset-1 ring-offset-slate-900 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.9)]"
                          : isCorrect
                          ? "bg-emerald-400 text-black shadow-emerald-400/50"
                          : "bg-amber-400 text-black shadow"
                      )}>
                        {displayedFinger}
                      </span>
                    </div>
                  ) : <span />}

                  {/* Hotkey label */}
                  {showKeyboardLabels && pcKey && (
                    <span className={cn(
                      "text-[9px] font-mono px-1 rounded",
                      splitConfig.enabled && isLeftHand
                        ? "text-indigo-300 bg-indigo-950/80 border border-indigo-500/30"
                        : "text-amber-300/80 bg-black/60"
                    )}>
                      {pcKey}
                    </span>
                  )}
                </button>
              );
            }

            // White Key
            return (
              <button
                key={noteKey}
                type="button"
                onMouseDown={() => handleNoteTrigger(noteKey)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleNoteTrigger(noteKey);
                }}
                className={cn(
                  "piano-key-white flex flex-col justify-between items-center py-3 relative group",
                  compact && "h-36 w-8",
                  // Split boundary visual marker
                  isSplitBoundary && "border-l-4 border-l-indigo-400 shadow-[-3px_0_12px_rgba(99,102,241,0.5)]",
                  // Split zone resting border accents
                  splitConfig.enabled
                    ? (isLeftHand 
                        ? "border-b-4 border-b-indigo-500 bg-slate-50/95" 
                        : "border-b-4 border-b-amber-500")
                    : (noteKey === 'C4' && "border-b-4 border-b-amber-400"),
                  // Pressed states
                  isPressed && (
                    splitConfig.enabled
                      ? (isLeftHand 
                          ? "!bg-indigo-200 !text-indigo-950 !translate-y-1 shadow-inner ring-2 ring-indigo-400" 
                          : "!bg-amber-200 !translate-y-1 shadow-inner ring-2 ring-amber-400")
                      : "!bg-amber-200 !translate-y-1 shadow-inner"
                  ),
                  isActive && !isPressed && "!bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
                  isCorrect && "!bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)]",
                  isError && "!bg-rose-100 border-rose-500 ring-2 ring-rose-500/50"
                )}
                title={`${noteKey}${fingerTooltip} (${pcKey ? `Tecla PC: ${pcKey}` : ''})${splitConfig.enabled ? ` - ${isLeftHand ? 'Mano Izquierda' : 'Mano Derecha'}` : ''}`}
              >
                {/* Finger guide pill or Split boundary marker badge */}
                {displayedFinger ? (
                  <div className={cn(
                    "flex flex-col items-center gap-0.5 transition-transform",
                    isActive && "scale-110"
                  )}>
                    <span className={cn(
                      "w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shadow-md transition-all font-mono",
                      isActive
                        ? "bg-amber-400 text-black ring-2 ring-amber-300 ring-offset-1 ring-offset-black animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                        : isCorrect
                        ? "bg-emerald-500 text-white shadow-emerald-500/50"
                        : isPressed
                        ? "bg-amber-300 text-black scale-95"
                        : "bg-gradient-to-b from-amber-400 to-amber-500 text-black"
                    )}>
                      {displayedFinger}
                    </span>
                    {isActive && (
                      <span className="text-[8px] font-mono font-extrabold text-amber-800 bg-amber-200/90 px-1 rounded uppercase tracking-tighter shadow-sm">
                        D{displayedFinger}
                      </span>
                    )}
                  </div>
                ) : isSplitBoundary ? (
                  <span className="text-[8px] font-mono font-bold text-indigo-700 bg-indigo-100 px-1 py-0.5 rounded shadow-sm border border-indigo-300">
                    ⫿ Split
                  </span>
                ) : noteKey === 'C4' ? (
                  <span className="text-[9px] font-mono font-bold text-amber-600 bg-amber-400/20 px-1 rounded">
                    Do Central
                  </span>
                ) : (
                  <span />
                )}

                {/* Bottom indicators: Hand Zone Pill, Note Name & PC Hotkey */}
                <div className="flex flex-col items-center gap-0.5 pointer-events-none">
                  {splitConfig.enabled && (
                    <span className={cn(
                      "text-[8px] font-mono font-bold px-1 rounded-sm leading-tight",
                      isLeftHand 
                        ? "text-indigo-700 bg-indigo-100 border border-indigo-200" 
                        : "text-amber-800 bg-amber-100 border border-amber-200"
                    )}>
                      {isLeftHand ? 'Izq' : 'Der'}
                    </span>
                  )}
                  {showKeyboardLabels && pcKey && (
                    <span className={cn(
                      "text-[10px] font-mono px-1 rounded border",
                      splitConfig.enabled && isLeftHand
                        ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                        : "text-gray-500 bg-gray-200/80 border-gray-300"
                    )}>
                      {pcKey}
                    </span>
                  )}
                  {showNoteNames && (
                    <span className="text-[11px] font-mono font-semibold text-gray-700">
                      {noteBase}<span className="text-[9px] text-gray-400">{octave}</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
