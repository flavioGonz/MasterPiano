import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import * as Tone from 'tone';
import { cn } from '../lib/utils';
import {
  Keyboard, Music2, Sliders, Hand, Zap, Piano as PianoIcon, Palette,
  SplitSquareHorizontal, HelpCircle, Cable,
} from 'lucide-react';
import { IconBtn, Popover, Row } from './ui/StageControls';
import { FINGER_NAMES, prettyAccidentals } from '../lib/musicGymTheory';
import { midi } from '../lib/midi';
import { useMidi } from '../lib/useMidi';
import { midiToNoteName as midiToName, noteNameToMidi as nameToMidi } from '../lib/midiWaterfall';
import { 
  getIntervalForNote, 
  inferChordRoot, 
  INTERVAL_LEGEND_ITEMS, 
  IntervalInfo 
} from '../lib/intervalColors';
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
  chordRoot?: string;
  showIntervalColors?: boolean;
  onToggleIntervalColors?: (show: boolean) => void;
  showIntervalColorToggle?: boolean;
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
  /**
   * Cómo se escribe cada tecla en el contexto actual: `{'F': 'E#'}`.
   * El teclado no puede saberlo solo —la misma tecla es Mi# en Fa# mayor y Fa
   * en Do mayor—, así que lo trae quien conoce la tonalidad
   * (`scaleSpellingMap` en el gimnasio de escalas).
   */
  noteSpelling?: Record<string, string>;
}

export const Piano: React.FC<PianoProps> = ({
  activeNotes = [],
  correctNotes = [],
  errorNotes = [],
  chordRoot,
  showIntervalColors: controlledShowIntervalColors,
  onToggleIntervalColors,
  showIntervalColorToggle = true,
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
  noteSpelling,
}) => {
  const [pressedNotes, setPressedNotes] = useState<Set<string>>(new Set());
  const [showKeyboardLabels, setShowKeyboardLabels] = useState(false);
  const [showNoteNames, setShowNoteNames] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [internalShowFingerGuide, setInternalShowFingerGuide] = useState(true);
  const [internalShowIntervalColors, setInternalShowIntervalColors] = useState(true);

  const isFingerGuideActive = controlledShowFingerGuide !== undefined ? controlledShowFingerGuide : internalShowFingerGuide;
  const isIntervalColorsActive = controlledShowIntervalColors !== undefined ? controlledShowIntervalColors : internalShowIntervalColors;
  /* Los colores de intervalo se leen siempre respecto de una fundamental, así
     que dicen algo en un acorde y nada en una escala de ocho notas: ahí el
     teclado terminaba siendo un arcoíris sin significado. Se aplican sólo
     cuando lo que suena tiene forma de acorde. */
  const distinctPitches = new Set(activeNotes.map(n => n.replace(/\d+$/, ''))).size;
  const hasActiveChordNotes = activeNotes.length > 0 && distinctPitches <= 4;
  const effectiveChordRoot = chordRoot || (activeNotes[0] ? activeNotes[0].replace(/\d+$/, '') : 'C');

  const handleToggleIntervalColors = () => {
    const nextVal = !isIntervalColorsActive;
    setInternalShowIntervalColors(nextVal);
    if (onToggleIntervalColors) {
      onToggleIntervalColors(nextVal);
    }
  };

  const renderPresetIcon = (id: SoundPreset) => {
    switch (id) {
      case 'acoustic':
        return <PianoIcon size={13} className="shrink-0" />;
      case 'electric':
        return <Zap size={13} className="shrink-0" />;
      case 'synth':
        return <Sliders size={13} className="shrink-0" />;
      default:
        return <Music2 size={13} className="shrink-0" />;
    }
  };
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

  const playNoteAudio = useCallback((note: string, velocity = 0.8) => {
    /* Si el instrumento tiene que sonar por sus propios parlantes, el
       navegador se calla: dos motores sonando la misma nota con unos
       milisegundos de diferencia suena a error, no a piano. */
    if (midi.canPlayOut()) { midi.playNote(nameToMidi(note), velocity, 0.9); return; }
    if (splitConfig.enabled) {
      const isLeft = isNoteInLeftHand(note, splitConfig.splitNote);
      const targetPreset = isLeft ? splitConfig.leftPreset : splitConfig.rightPreset;
      soundEngine.playNote(note, targetPreset, "1.5n");
    } else {
      soundEngine.playNote(note, activePreset, "1.5n");
    }
  }, [splitConfig, activePreset]);
  /* Los handlers del MIDI se registran una vez; leen lo último por ref. */
  const playNoteAudioRef = useRef(playNoteAudio);
  playNoteAudioRef.current = playNoteAudio;
  const onNotePlayRef = useRef(onNotePlay);
  onNotePlayRef.current = onNotePlay;

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

  /* ---------------- Teclado MIDI ----------------
     El instrumento toca en cualquier pantalla que muestre este teclado: las
     lecciones, los gimnasios y la evaluación. Antes sólo andaba en la
     catarata, así que en el resto de la app había que tocar con el mouse
     teniendo el piano al lado. Las notas fuera del rango dibujado igual suenan
     y se avisan; simplemente no hay tecla que iluminar. */
  const midiState = useMidi();
  useEffect(() => {
    const stopOn = midi.onNoteOn(({ midi: m, velocity }) => {
      const note = midiToName(m);
      playNoteAudioRef.current(note, velocity);
      onNotePlayRef.current?.(note);
      setPressedNotes(prev => (prev.has(note) ? prev : new Set(prev).add(note)));
    });
    const stopOff = midi.onNoteEnd(m => {
      const note = midiToName(m);
      setPressedNotes(prev => {
        if (!prev.has(note)) return prev;
        const next = new Set(prev); next.delete(note); return next;
      });
    });
    return () => { stopOn(); stopOff(); };
  }, []);

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

  /* El teclado se estira para llenar el escenario, como el de la catarata, en
     vez de quedar chico en el medio con dos franjas negras a los costados.
     Abajo del mínimo vuelve el scroll horizontal. */
  const whiteKeyCount = allKeys.filter(k => !k.includes('#')).length;
  useEffect(() => {
    const el = stageRef.current;
    if (!el || compact) return;
    const apply = () => {
      const styles = getComputedStyle(el);
      const usable = el.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const w = Math.max(30, Math.min(56, Math.floor(usable / whiteKeyCount)));
      el.style.setProperty('--piano-key-w', `${w}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [whiteKeyCount, compact]);

  const currentPresetInfo = SOUND_PRESETS.find(p => p.id === activePreset) || SOUND_PRESETS[0];
  const leftPresetInfo = SOUND_PRESETS.find(p => p.id === splitConfig.leftPreset) || SOUND_PRESETS[0];
  const rightPresetInfo = SOUND_PRESETS.find(p => p.id === splitConfig.rightPreset) || SOUND_PRESETS[1];
  const selectedSplitOption = SPLIT_POINT_OPTIONS.find(p => p.note === splitConfig.splitNote) || SPLIT_POINT_OPTIONS[0];

  /* La barra desaparece del todo cuando quien nos usa apagó todos los
     controles: en los gimnasios el teclado es sólo el teclado. */
  const showTopBar = showSoundSelector || showSplitToggle || showFingerGuideToggle || showIntervalColorToggle || !compact;
  const showFingerLegend = isFingerGuideActive && hasFingerGuide && !compact;
  const showIntervalLegend = isIntervalColorsActive && hasActiveChordNotes && !compact;

  return (
    <div className={cn(
      'stage-dark w-full rounded-2xl border border-white/8 bg-[#0a0f1a] overflow-hidden select-none',
      compact && 'rounded-xl'
    )}>
      {/* ============ Barra superior ============
          Antes eran tres franjas apiladas —estado, sonido, y dos leyendas con
          degradés— que ocupaban más alto que el teclado mismo. Ahora es una
          sola barra como la de la catarata: lo que se usa está a la vista y lo
          que se consulta de vez en cuando vive en el panel de ayuda. */}
      {showTopBar && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2.5 py-1.5 sm:py-0 sm:h-12 sm:flex-nowrap border-b border-white/8 bg-[#0d1322]">
          {/* Identidad */}
          <div className="flex items-center gap-2 min-w-0 shrink">
            <Keyboard size={14} className="text-ink-3 shrink-0" />
            <span className="text-[12.5px] font-medium text-ink truncate">Teclado</span>
            <span className="hidden md:inline font-mono text-[10.5px] text-ink-3">C3–B5</span>
            <span
              className={cn('w-1.5 h-1.5 rounded-full shrink-0', soundReady ? 'bg-ok' : 'bg-white/20')}
              data-tip={soundReady ? 'Audio listo' : 'Tocá una tecla para activar el audio'}
            />
            {midiState.inputId && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10.5px] text-ok shrink-0"
                data-tip={`${midi.deviceName()} — tocá en el instrumento`}
              >
                <Cable size={11} /> MIDI
              </span>
            )}
            {midiState.sustain && (
              <span className="text-[10.5px] text-brand-2 shrink-0" data-tip="Pedal de sustain pisado">ped.</span>
            )}
          </div>

          {/* Timbre */}
          {showSoundSelector && !splitConfig.enabled && (
            <div className="seg bg-[#141b2b] border-white/8 shrink-0 mx-auto max-sm:hidden">
              {SOUND_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  data-active={activePreset === preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className="seg-item flex items-center gap-1.5"
                  data-tip={preset.description}
                >
                  {renderPresetIcon(preset.id)}
                  <span className="hidden lg:inline">{preset.label}</span>
                  <span className="lg:hidden">{preset.shortLabel}</span>
                </button>
              ))}
            </div>
          )}

          {/* Herramientas */}
          <div className="flex items-center justify-end gap-1.5 ml-auto shrink-0">
            {showFingerGuideToggle && (
              <IconBtn
                label={hasFingerGuide ? 'Números de digitación sobre las teclas' : 'Digitación (esta lección no trae)'}
                active={isFingerGuideActive && hasFingerGuide}
                onClick={handleToggleFingerGuide}
                className={cn(!hasFingerGuide && 'opacity-50')}
              >
                <Hand size={15} /><span className="hidden xl:inline">Dedos</span>
              </IconBtn>
            )}
            {showIntervalColorToggle && (
              <IconBtn
                label={
                  activeNotes.length && !hasActiveChordNotes
                    ? 'Los colores de intervalo son para acordes, no para escalas'
                    : 'Colorear las notas según el intervalo'
                }
                active={isIntervalColorsActive && hasActiveChordNotes}
                onClick={handleToggleIntervalColors}
                className={cn(!!activeNotes.length && !hasActiveChordNotes && 'opacity-50')}
              >
                <Palette size={15} /><span className="hidden xl:inline">Color</span>
              </IconBtn>
            )}
            <IconBtn label="Nombres de nota en las teclas" active={showNoteNames} onClick={() => setShowNoteNames(v => !v)}>
              <Music2 size={15} /><span className="hidden xl:inline">Notas</span>
            </IconBtn>
            {showSplitToggle && (
              <IconBtn label="Partir el teclado en dos timbres" active={splitConfig.enabled} onClick={handleToggleSplit}>
                <SplitSquareHorizontal size={15} /><span className="hidden xl:inline">Dividir</span>
              </IconBtn>
            )}
            <div className="relative">
              <IconBtn label="Referencia del teclado" active={helpOpen} onClick={() => setHelpOpen(v => !v)}>
                <HelpCircle size={15} />
              </IconBtn>
              <AnimatePresence>
                {helpOpen && (
                  <Popover title="Referencia" onClose={() => setHelpOpen(false)} width="w-[320px]">
                    <Row label="Digitación">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                            <span className="w-4.5 h-4.5 rounded-full bg-brand text-brand-ink font-mono text-[10px] font-bold flex items-center justify-center shrink-0">{n}</span>
                            {FINGER_NAMES[n].name}
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-ink-3 mt-2">Dedos curvados y peso de brazo al pasar el pulgar.</p>
                    </Row>
                    <Row label="Colores de intervalo">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {INTERVAL_LEGEND_ITEMS.map(item => (
                          <div key={item.label} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.hex }} />
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </Row>
                    {showSoundSelector && !splitConfig.enabled && (
                      <Row label="Timbre">
                        <div className="seg w-full">
                          {SOUND_PRESETS.map(preset => (
                            <button key={preset.id} type="button" data-active={activePreset === preset.id}
                                    onClick={() => handlePresetChange(preset.id)} className="seg-item flex-1">
                              {preset.shortLabel}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-ink-3 mt-1.5">{currentPresetInfo.character}</p>
                      </Row>
                    )}
                    <Row label="Desde la computadora">
                      <p className="text-[12px] text-ink-2 leading-relaxed">
                        <span className="font-mono">Z S X D C…</span> octava baja · <span className="font-mono">Q 2 W 3 E…</span> central · <span className="font-mono">I 9 O 0 P…</span> alta.
                      </p>
                    </Row>
                  </Popover>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ============ Leyenda contextual ============
          Una sola línea, y sólo cuando hay algo que leer. */}
      {(showFingerLegend || showIntervalLegend) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 border-b border-white/8 bg-[#0b1120] text-[11px] text-ink-3">
          {showFingerLegend && (
            <span className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <span key={n} className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-brand/85 text-brand-ink font-mono text-[9px] font-bold flex items-center justify-center">{n}</span>
                  <span className="hidden sm:inline">{FINGER_NAMES[n].name.toLowerCase()}</span>
                </span>
              ))}
            </span>
          )}
          {showFingerLegend && showIntervalLegend && <span className="hidden sm:inline text-ink-3/50">·</span>}
          {showIntervalLegend && (
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-ink-2">Intervalos desde {effectiveChordRoot}:</span>
              {INTERVAL_LEGEND_ITEMS.map(item => (
                <span key={item.label} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.hex }} />
                  {item.label.replace(/\s*\(.*\)$/, '')}
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      {/* ============ Teclado dividido ============
          Era un panel con tres degradés y seis bordes de color. Es la misma
          información en una línea, con los mismos controles. */}
      {splitConfig.enabled && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 border-b border-white/8 bg-[#0b1120]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-ink-3 shrink-0">
              Izquierda <span className="font-mono text-ink-2">{selectedSplitOption.leftRange}</span>
            </span>
            <div className="seg bg-[#141b2b] border-white/8">
              {SOUND_PRESETS.map(preset => (
                <button key={preset.id} type="button" data-active={splitConfig.leftPreset === preset.id}
                        onClick={() => handleLeftPresetChange(preset.id)} className="seg-item text-[11px]"
                        data-tip={`${preset.label} para la mano izquierda`}>
                  {preset.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-ink-3">
            Corte
            <select
              value={splitConfig.splitNote}
              onChange={e => handleSplitNoteChange(e.target.value)}
              className="h-8 rounded-lg border border-white/8 bg-[#141b2b] text-ink text-[11.5px] font-mono px-2 focus:outline-none focus:border-brand-line"
            >
              {SPLIT_POINT_OPTIONS.map(opt => (
                <option key={opt.note} value={opt.note}>{opt.label}</option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-ink-3 shrink-0">
              Derecha <span className="font-mono text-ink-2">{selectedSplitOption.rightRange}</span>
            </span>
            <div className="seg bg-[#141b2b] border-white/8">
              {SOUND_PRESETS.map(preset => (
                <button key={preset.id} type="button" data-active={splitConfig.rightPreset === preset.id}
                        onClick={() => handleRightPresetChange(preset.id)} className="seg-item text-[11px]"
                        data-tip={`${preset.label} para la mano derecha`}>
                  {preset.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 xl:ml-auto">
            {SPLIT_PRESET_COMBINATIONS.map(comb => (
              <button
                key={comb.name}
                type="button"
                onClick={() => applyPresetCombination(comb)}
                data-tip={comb.description}
                className={cn(
                  'h-7 px-2 rounded-lg border text-[11px] transition-colors',
                  splitConfig.leftPreset === comb.left && splitConfig.rightPreset === comb.right
                    ? 'bg-brand-soft border-brand-line text-brand-2'
                    : 'bg-[#141b2b] border-white/8 text-ink-3 hover:text-ink-2'
                )}
              >
                {comb.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============ Escenario de teclas ============ */}
      <div ref={stageRef} className="relative overflow-x-auto select-none px-3 sm:px-5 pt-4 pb-3 bg-gradient-to-b from-[#111827] to-[#0a0f1a]">
        <div className="flex justify-center min-w-max mx-auto relative pt-4 pb-2">
          {allKeys.map((noteKey) => {
            const isBlack = noteKey.includes('#');
            const isPressed = pressedNotes.has(noteKey);
            const isActive = activeNotes.includes(noteKey);
            const isCorrect = correctNotes.includes(noteKey);
            const isError = errorNotes.includes(noteKey);
            const displayedFinger = isFingerGuideActive ? fingerGuide?.[noteKey] : undefined;
            const pcKey = getPcKeyForNote(noteKey);

            // Interval Visual Color Coding
            const isIntervalActive = isIntervalColorsActive && hasActiveChordNotes && isActive && !isPressed;
            const intervalInfo = isIntervalActive ? getIntervalForNote(effectiveChordRoot, noteKey) : null;
            const intervalTooltip = intervalInfo ? ` • Intervalo: ${intervalInfo.fullName} (${intervalInfo.colorName})` : '';

            // Split Mode state for this specific note
            const isLeftHand = splitConfig.enabled && isNoteInLeftHand(noteKey, splitConfig.splitNote);
            const isSplitBoundary = splitConfig.enabled && noteKey === splitConfig.splitNote;

            // Pitch note base name (e.g. C, D, C#)
            const noteBase = noteKey.replace(/\d/, '');
            const octave = noteKey.slice(-1);
            /* En Fa# mayor la tecla F es Mi#: si quien nos usa sabe la
               tonalidad, la tecla lleva el nombre que le toca. */
            const spelled = noteSpelling?.[noteBase];

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
                    isActive && !isPressed && (
                      intervalInfo
                        ? intervalInfo.blackKeyBgClass
                        : "!bg-gradient-to-b !from-amber-500 !to-amber-600 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                    ),
                    isCorrect && "!bg-emerald-500 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.8)]",
                    isError && "!bg-rose-600 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.8)]",
                    // Split mode resting accent
                    splitConfig.enabled && isLeftHand && "border-b-2 border-indigo-400/60"
                  )}
                  title={`${spelled ? `${prettyAccidentals(spelled)}${octave} (tecla ${noteKey})` : noteKey}${intervalTooltip}${fingerTooltip}${splitConfig.enabled ? ` - ${isLeftHand ? 'Mano Izquierda' : 'Mano Derecha'}` : ''}`}
                >
                  {/* Finger number badge or Interval badge */}
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
                      {intervalInfo && (
                        <span className={cn("text-[8px] font-mono font-extrabold px-1 rounded shadow-sm leading-tight", intervalInfo.badgeClass)}>
                          {intervalInfo.shortLabel}
                        </span>
                      )}
                    </div>
                  ) : intervalInfo ? (
                    <div className="flex flex-col items-center gap-0.5 scale-105">
                      <span className={cn("text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded shadow-sm leading-tight", intervalInfo.badgeClass)}>
                        {intervalInfo.shortLabel}
                      </span>
                    </div>
                  ) : <span />}
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
                  isActive && !isPressed && (
                    intervalInfo
                      ? intervalInfo.whiteKeyBgClass
                      : "!bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  ),
                  isCorrect && "!bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)]",
                  isError && "!bg-rose-100 border-rose-500 ring-2 ring-rose-500/50"
                )}
                title={`${noteKey}${intervalTooltip}${fingerTooltip}${splitConfig.enabled ? ` - ${isLeftHand ? 'Mano Izquierda' : 'Mano Derecha'}` : ''}`}
              >
                {/* Finger guide pill or Interval badge or Split boundary marker badge */}
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
                    {intervalInfo ? (
                      <span className={cn("text-[8px] font-mono font-extrabold px-1 rounded uppercase tracking-tighter shadow-sm", intervalInfo.badgeClass)}>
                        {intervalInfo.shortLabel}
                      </span>
                    ) : null}
                  </div>
                ) : intervalInfo ? (
                  /* La etiqueta larga y el nombre del color no entraban en una
                     tecla: se cortaban. El grado alcanza, y la leyenda de
                     arriba dice qué significa cada color. */
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-extrabold font-mono shadow-sm', intervalInfo.badgeClass)}>
                    {intervalInfo.shortLabel}
                  </span>
                ) : isSplitBoundary ? (
                  <span className="text-[8px] font-mono font-bold text-indigo-700 bg-indigo-100 px-1 py-0.5 rounded shadow-sm border border-indigo-300">
                    ⫿ Split
                  </span>
                ) : noteKey === 'C4' ? (
                  <span className="text-[8px] font-mono font-bold text-amber-600 bg-amber-400/20 px-1 rounded whitespace-nowrap leading-none py-0.5">
                    Do central
                  </span>
                ) : (
                  <span />
                )}

                {/* Bottom indicators: Hand Zone Pill & Note Name */}
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
                  {showNoteNames && (
                    <span className={cn('text-[11px] font-mono font-semibold', spelled ? 'text-amber-700' : 'text-gray-700')}>
                      {spelled ? prettyAccidentals(spelled) : noteBase}
                      <span className={cn('text-[9px]', spelled ? 'text-amber-600/70' : 'text-gray-400')}>{octave}</span>
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
