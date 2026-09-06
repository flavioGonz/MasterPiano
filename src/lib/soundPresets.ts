import * as Tone from 'tone';

export type SoundPreset = 'acoustic' | 'electric' | 'synth';

export interface SoundPresetInfo {
  id: SoundPreset;
  label: string;
  shortLabel: string;
  icon: string;
  badge: string;
  description: string;
  character: string;
}

export const SOUND_PRESETS: SoundPresetInfo[] = [
  {
    id: 'acoustic',
    label: 'Piano Acústico',
    shortLabel: 'Acústico',
    icon: '🎹',
    badge: 'Concert Grand',
    description: 'Piano de cola con muestras reales y resonancia orgánica de sala',
    character: 'Maderas nobles y armónicos naturales',
  },
  {
    id: 'electric',
    label: 'Piano Eléctrico',
    shortLabel: 'Eléctrico',
    icon: '⚡',
    badge: 'Rhodes / FM',
    description: 'Timbre clásico vintage con ataque de campana y chorus estéreo cálido',
    character: 'Campana cristalina y modulación suave',
  },
  {
    id: 'synth',
    label: 'Sintetizador',
    shortLabel: 'Sintetizador',
    icon: '🎛️',
    badge: 'Analog Poly',
    description: 'Sintetizador polifónico analógico con ondas diente de sierra y filtro cálido',
    character: 'Grosor analógico, pads envolventes',
  },
];

export interface SplitKeyboardConfig {
  enabled: boolean;
  splitNote: string; // e.g., 'C4'
  leftPreset: SoundPreset;
  rightPreset: SoundPreset;
}

export interface SplitPointOption {
  note: string;
  label: string;
  leftRange: string;
  rightRange: string;
}

export const SPLIT_POINT_OPTIONS: SplitPointOption[] = [
  {
    note: 'C4',
    label: 'Do Central (C4) - Clásico',
    leftRange: 'C3 – B3',
    rightRange: 'C4 – B5',
  },
  {
    note: 'F4',
    label: 'Fa 4 (F4) - Acordes Amplios',
    leftRange: 'C3 – E4',
    rightRange: 'F4 – B5',
  },
  {
    note: 'G3',
    label: 'Sol 3 (G3) - Bajos Profundos',
    leftRange: 'C3 – F#3',
    rightRange: 'G3 – B5',
  },
  {
    note: 'E4',
    label: 'Mi 4 (E4) - Balance Central',
    leftRange: 'C3 – D#4',
    rightRange: 'E4 – B5',
  },
];

export interface SplitPresetCombination {
  name: string;
  left: SoundPreset;
  right: SoundPreset;
  description: string;
}

export const SPLIT_PRESET_COMBINATIONS: SplitPresetCombination[] = [
  {
    name: 'Bajo Analógico + Acústico',
    left: 'synth',
    right: 'acoustic',
    description: 'Línea de bajo sintetizada y gran piano para la melodía',
  },
  {
    name: 'Acústico + Rhodes Vintage',
    left: 'acoustic',
    right: 'electric',
    description: 'Acordes de piano de cola con melodía de piano eléctrico',
  },
  {
    name: 'Rhodes + Lead Synth',
    left: 'electric',
    right: 'synth',
    description: 'Acompañamiento Rhodes y solo de sintetizador brillante',
  },
  {
    name: 'Synth Bass + Rhodes',
    left: 'synth',
    right: 'electric',
    description: 'Bajo analógico cálido y acordes eléctricos con chorus',
  },
];

const NOTE_BASE_VALUES: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

export function getNoteMidiValue(noteWithOctave: string): number {
  const match = noteWithOctave.match(/^([A-G]#?)(\d)$/);
  if (!match) return 60;
  const pitch = match[1];
  const octave = parseInt(match[2], 10);
  return (octave + 1) * 12 + (NOTE_BASE_VALUES[pitch] ?? 0);
}

export function isNoteInLeftHand(note: string, splitNote: string = 'C4'): boolean {
  return getNoteMidiValue(note) < getNoteMidiValue(splitNote);
}

const STORAGE_KEY = 'piano_sound_preset';
const SPLIT_STORAGE_KEY = 'piano_split_keyboard_config_v1';

export const DEFAULT_SPLIT_CONFIG: SplitKeyboardConfig = {
  enabled: false,
  splitNote: 'C4',
  leftPreset: 'synth',
  rightPreset: 'acoustic',
};

export function getSavedSplitConfig(): SplitKeyboardConfig {
  if (typeof window === 'undefined') return DEFAULT_SPLIT_CONFIG;
  try {
    const saved = localStorage.getItem(SPLIT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        enabled: Boolean(parsed.enabled),
        splitNote: parsed.splitNote || 'C4',
        leftPreset: parsed.leftPreset || 'synth',
        rightPreset: parsed.rightPreset || 'acoustic',
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SPLIT_CONFIG;
}

export function saveSplitConfig(config: SplitKeyboardConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('piano-split-changed', { detail: config }));
  } catch {
    // ignore
  }
}

export function getSavedSoundPreset(): SoundPreset {
  if (typeof window === 'undefined') return 'acoustic';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'acoustic' || saved === 'electric' || saved === 'synth') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'acoustic';
}

export function saveSoundPreset(preset: SoundPreset): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, preset);
    window.dispatchEvent(new CustomEvent('piano-preset-changed', { detail: preset }));
  } catch {
    // ignore
  }
}

// Global Audio Engine Instance for Zero-Latency Switching
class SoundEngine {
  private acousticSampler: Tone.Sampler | null = null;
  private acousticSynth: Tone.PolySynth | null = null;

  private electricSynth: Tone.PolySynth | null = null;
  private electricChorus: Tone.Chorus | null = null;

  private analogSynth: Tone.PolySynth | null = null;
  private analogFilter: Tone.Filter | null = null;

  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // 1. Acoustic Fallback Synth
      this.acousticSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle8' },
        envelope: {
          attack: 0.005,
          decay: 1.4,
          sustain: 0.15,
          release: 1.3,
        },
      }).toDestination();
      this.acousticSynth.volume.value = -6;

      // 1b. Acoustic Salamander Sampler
      this.acousticSampler = new Tone.Sampler({
        urls: {
          A1: 'A1.mp3',
          C2: 'C2.mp3',
          C3: 'C3.mp3',
          A3: 'A3.mp3',
          C4: 'C4.mp3',
          A4: 'A4.mp3',
          C5: 'C5.mp3',
          A5: 'A5.mp3',
          C6: 'C6.mp3',
        },
        release: 1.6,
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
      }).toDestination();

      // 2. Electric Piano (FM + Chorus)
      this.electricChorus = new Tone.Chorus({
        frequency: 1.5,
        delayTime: 3.5,
        depth: 0.6,
        spread: 180,
      }).toDestination().start();

      this.electricSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 2.8,
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.003,
          decay: 1.8,
          sustain: 0.12,
          release: 1.2,
        },
        modulation: { type: 'triangle' },
        modulationEnvelope: {
          attack: 0.004,
          decay: 0.7,
          sustain: 0.05,
          release: 0.4,
        },
      }).connect(this.electricChorus);
      this.electricSynth.volume.value = -8;

      // 3. Analog Synthesizer (Fat Sawtooth + Lowpass Resonant Filter)
      this.analogFilter = new Tone.Filter({
        frequency: 2200,
        type: 'lowpass',
        rolloff: -24,
        Q: 2,
      }).toDestination();

      this.analogSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'fatsawtooth',
          count: 3,
          spread: 24,
        },
        envelope: {
          attack: 0.02,
          decay: 1.4,
          sustain: 0.35,
          release: 1.6,
        },
      }).connect(this.analogFilter);
      this.analogSynth.volume.value = -11;

      this.isInitialized = true;
    } catch (err) {
      console.warn('SoundEngine init warning:', err);
    }
  }

  public playNote(note: string, preset: SoundPreset = 'acoustic', duration: string = '1.5n') {
    if (!this.isInitialized) {
      this.init();
    }
    Tone.start();

    try {
      if (preset === 'acoustic') {
        if (this.acousticSampler && this.acousticSampler.loaded) {
          this.acousticSampler.triggerAttackRelease(note, duration);
        } else if (this.acousticSynth) {
          this.acousticSynth.triggerAttackRelease(note, duration);
        }
      } else if (preset === 'electric') {
        if (this.electricSynth) {
          this.electricSynth.triggerAttackRelease(note, duration);
        }
      } else if (preset === 'synth') {
        if (this.analogSynth) {
          this.analogSynth.triggerAttackRelease(note, duration);
        }
      }
    } catch (err) {
      console.warn('Note play error:', err);
    }
  }

  public playChord(notes: string[], preset: SoundPreset = 'acoustic', duration: string = '1.2n') {
    if (!this.isInitialized) {
      this.init();
    }
    Tone.start();

    try {
      if (preset === 'acoustic') {
        if (this.acousticSampler && this.acousticSampler.loaded) {
          notes.forEach(note => this.acousticSampler?.triggerAttackRelease(note, duration));
        } else if (this.acousticSynth) {
          this.acousticSynth.triggerAttackRelease(notes, duration);
        }
      } else if (preset === 'electric') {
        if (this.electricSynth) {
          this.electricSynth.triggerAttackRelease(notes, duration);
        }
      } else if (preset === 'synth') {
        if (this.analogSynth) {
          this.analogSynth.triggerAttackRelease(notes, duration);
        }
      }
    } catch (err) {
      console.warn('Chord play error:', err);
    }
  }

  public isSamplerLoaded(): boolean {
    return !!(this.acousticSampler && this.acousticSampler.loaded);
  }

  public setMasterVolume(volumeLinear: number) {
    try {
      const vol = Math.max(0.0001, Math.min(1, volumeLinear));
      Tone.getDestination().volume.value = Tone.gainToDb(vol);
    } catch (err) {
      console.warn('Could not set master volume:', err);
    }
  }
}

export const soundEngine = new SoundEngine();
