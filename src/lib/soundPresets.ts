/**
 * El motor de sonido (Tone.js).
 *
 * Se reexporta todo lo de `soundPresetsInfo` para que los módulos que ya
 * importaban de acá sigan andando; quien sólo necesita los datos —y no quiere
 * arrastrar Tone— importa de aquel.
 */
import * as Tone from 'tone';
import { SoundPreset } from './soundPresetsInfo';

export * from './soundPresetsInfo';

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
