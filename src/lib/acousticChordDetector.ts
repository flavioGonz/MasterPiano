/**
 * Acoustic Real-Time Piano Chord Detector.
 * Analyzes audio input from microphone using Web Audio API FFT chromagram
 * and acoustic note onset accumulation to identify chords in real time:
 * - Root note, chord quality, cipher symbol, Spanish & English names.
 * - Inversion detection (Fundamental, 1ª, 2ª, 3ª inversión).
 * - Pitch class resonance vector (12 chromatic semitones).
 * - Confidence score and pedagogical harmonic insights.
 */

import { pianoPitchDetector, DetectedPitchInfo } from './pitchDetector';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SOLFEGE_MAP: Record<string, string> = {
  'C': 'Do',
  'C#': 'Do#',
  'D': 'Re',
  'D#': 'Re#',
  'E': 'Mi',
  'F': 'Fa',
  'F#': 'Fa#',
  'G': 'Sol',
  'G#': 'Sol#',
  'A': 'La',
  'A#': 'La#',
  'B': 'Si'
};

export interface ChordTemplate {
  qualityKey: string;
  nameEs: string;
  nameEn: string;
  symbol: string;
  intervals: number[]; // semitone offsets from root [0, 4, 7]
  description: string;
}

export const CHORD_TEMPLATES: ChordTemplate[] = [
  {
    qualityKey: 'Major',
    nameEs: 'Mayor',
    nameEn: 'Major',
    symbol: '',
    intervals: [0, 4, 7],
    description: 'Tríada mayor brillante y estable: tónica, 3ª mayor y 5ª justa. El fundamento armónico clásico.'
  },
  {
    qualityKey: 'Minor',
    nameEs: 'menor',
    nameEn: 'Minor',
    symbol: 'm',
    intervals: [0, 3, 7],
    description: 'Tríada menor nostálgica y profunda: tónica, 3ª menor y 5ª justa.'
  },
  {
    qualityKey: '7th',
    nameEs: '7ª de Dominante',
    nameEn: 'Dominant 7th',
    symbol: '7',
    intervals: [0, 4, 7, 10],
    description: 'Acorde de cuatro notas con tensión tensa e impulsiva hacia la resolución armónica.'
  },
  {
    qualityKey: 'Major 7th',
    nameEs: 'Mayor 7ª',
    nameEn: 'Major 7th',
    symbol: 'Maj7',
    intervals: [0, 4, 7, 11],
    description: 'Sonoridad etérea, luminosa y sofisticada; propia del jazz, neo-soul y repertorio romántico.'
  },
  {
    qualityKey: 'Minor 7th',
    nameEs: 'menor 7ª',
    nameEn: 'Minor 7th',
    symbol: 'm7',
    intervals: [0, 3, 7, 10],
    description: 'Cálido, suave y envolvente: la base armónica del soul, jazz y baladas clásicas.'
  },
  {
    qualityKey: 'Diminished',
    nameEs: 'Disminuido',
    nameEn: 'Diminished',
    symbol: 'dim',
    intervals: [0, 3, 6],
    description: 'Tensión simétrica oscura compuesta por dos terceras menores consecutivas.'
  },
  {
    qualityKey: 'Diminished 7th',
    nameEs: 'Disminuido 7ª',
    nameEn: 'Diminished 7th',
    symbol: 'dim7',
    intervals: [0, 3, 6, 9],
    description: 'Máxima tensión dramática en la música clásica; cuatro notas a distancia de tercera menor.'
  },
  {
    qualityKey: 'Half-Diminished',
    nameEs: 'Semidisminuido',
    nameEn: 'Half-Diminished (m7b5)',
    symbol: 'm7b5',
    intervals: [0, 3, 6, 10],
    description: 'El clásico acorde de segundo grado (iiø7) en tonalidades menores.'
  },
  {
    qualityKey: 'Augmented',
    nameEs: 'Aumentado',
    nameEn: 'Augmented',
    symbol: 'aug',
    intervals: [0, 4, 8],
    description: 'Inestable y misterioso, formado por dos terceras mayores consecutivas con quinta aumentada.'
  },
  {
    qualityKey: 'Sus4',
    nameEs: 'Suspendido 4ª',
    nameEn: 'Sus4',
    symbol: 'sus4',
    intervals: [0, 5, 7],
    description: 'La tercera es sustituida por la cuarta justa, creando una suspensión expectante.'
  },
  {
    qualityKey: 'Sus2',
    nameEs: 'Suspendido 2ª',
    nameEn: 'Sus2',
    symbol: 'sus2',
    intervals: [0, 2, 7],
    description: 'Aire moderno, abierto y espacioso; la tercera es sustituida por la segunda mayor.'
  },
  {
    qualityKey: '6th',
    nameEs: 'Sexta Mayor',
    nameEn: 'Major 6th',
    symbol: '6',
    intervals: [0, 4, 7, 9],
    description: 'Acorde dulce y pastoral característico del clasicismo y swing temprano.'
  },
  {
    qualityKey: 'Minor 6th',
    nameEs: 'menor Sexta',
    nameEn: 'Minor 6th',
    symbol: 'm6',
    intervals: [0, 3, 7, 9],
    description: 'Misterioso y agridulce, evoca ambientes de cine negro y romanticismo.'
  },
  {
    qualityKey: 'Add9',
    nameEs: 'con 9ª añadida',
    nameEn: 'Add9',
    symbol: 'add9',
    intervals: [0, 4, 7, 14], // 14 % 12 === 2
    description: 'Tríada mayor complementada con la novena pura, de gran amplitud acústica.'
  }
];

export interface DetectedChordResult {
  root: string; // e.g. "C"
  rootSolfege: string; // e.g. "Do"
  quality: string; // e.g. "Mayor"
  symbol: string; // e.g. "C" or "Cm"
  fullNameEs: string; // e.g. "Do Mayor"
  fullNameEn: string; // e.g. "C Major"
  inversionName: string; // e.g. "Posición Fundamental", "1ª Inversión (Bajo en Mi)"
  inversionIndex: number; // 0, 1, 2, 3
  bassNote: string; // e.g. "C" or "E"
  detectedNotes: string[]; // e.g. ["C", "E", "G"]
  suggestedKeys: string[]; // e.g. ["C4", "E4", "G4"]
  confidence: number; // 0 - 100
  harmonicDescription: string;
}

export interface AcousticChordState {
  isListening: boolean;
  hasPermission: boolean | null;
  volume: number; // 0 - 100
  errorMessage: string | null;
  detectedChord: DetectedChordResult | null;
  activePitchClasses: string[]; // ['C', 'E', 'G']
  chromaVector: number[]; // 12 numbers normalized (0 - 1)
  recentNotes: { note: string; timestamp: number }[];
  noiseGate: number; // 0 - 100
}

export class AcousticChordDetector {
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private ownStream: boolean = false;

  private freqData: Float32Array = new Float32Array(2048);
  private timeData: Float32Array = new Float32Array(2048);

  private recentNotesHistory: { note: string; timestamp: number }[] = [];
  private readonly NOTE_EXPIRY_MS = 2200; // Time window to accumulate rolled/arpeggiated chords or sustained notes

  private listeners: Set<(state: AcousticChordState) => void> = new Set();
  private lastDetectedChord: DetectedChordResult | null = null;
  private chordHoldCount: number = 0;
  private readonly CHORD_CONFIRMATION_FRAMES = 3;

  public noiseThreshold: number = 0.015; // RMS threshold
  public sensitivity: number = 65; // 0 - 100 user setting

  private currentState: AcousticChordState = {
    isListening: false,
    hasPermission: null,
    volume: 0,
    errorMessage: null,
    detectedChord: null,
    activePitchClasses: [],
    chromaVector: new Array(12).fill(0),
    recentNotes: [],
    noiseGate: 15,
  };

  constructor() {
    // Connect to pianoPitchDetector note onsets to capture acoustic keystrokes
    pianoPitchDetector.subscribeNoteOnset((info: DetectedPitchInfo) => {
      this.handleIncomingNoteOnset(info);
    });
  }

  public getState(): AcousticChordState {
    return { ...this.currentState };
  }

  public subscribe(listener: (state: AcousticChordState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  private broadcastState(): void {
    this.listeners.forEach(l => l({ ...this.currentState }));
  }

  public setSensitivity(value: number): void {
    this.sensitivity = Math.max(10, Math.min(100, value));
    // Scale noiseThreshold inversely: higher sensitivity = lower noise threshold
    this.noiseThreshold = 0.04 - (this.sensitivity / 100) * 0.035;
    this.currentState.noiseGate = Math.round(this.noiseThreshold * 1000);
    this.broadcastState();
  }

  public async start(): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) return { success: true };

    try {
      // 1. Try reusing existing mic from pianoPitchDetector first
      const existingAnalyser = pianoPitchDetector.getAnalyser();
      const existingCtx = pianoPitchDetector.getAudioContext();
      const existingStream = pianoPitchDetector.getMediaStream();

      if (existingAnalyser && existingCtx && existingStream && existingStream.active) {
        this.analyser = existingAnalyser;
        this.audioContext = existingCtx;
        this.mediaStream = existingStream;
        this.ownStream = false;
      } else {
        // Otherwise activate pianoPitchDetector or request own microphone stream
        const startResult = await pianoPitchDetector.start();
        if (startResult.success && pianoPitchDetector.getAnalyser()) {
          this.analyser = pianoPitchDetector.getAnalyser();
          this.audioContext = pianoPitchDetector.getAudioContext();
          this.mediaStream = pianoPitchDetector.getMediaStream();
          this.ownStream = false;
        } else {
          // Independent fallback stream
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              autoGainControl: false,
              noiseSuppression: false,
              channelCount: 1,
            },
          });

          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtxClass();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 4096;

          source.connect(analyser);

          this.audioContext = ctx;
          this.mediaStream = stream;
          this.analyser = analyser;
          this.ownStream = true;
        }
      }

      this.analyser!.fftSize = 4096;
      this.freqData = new Float32Array(this.analyser!.frequencyBinCount);
      this.timeData = new Float32Array(this.analyser!.fftSize);
      this.isRunning = true;

      this.currentState.isListening = true;
      this.currentState.hasPermission = true;
      this.currentState.errorMessage = null;
      this.broadcastState();

      this.processLoop();
      return { success: true };
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Permiso de micrófono denegado. Permite el acceso al micrófono para que el analizador escuche tu piano real.'
        : `Error al acceder al micrófono: ${err.message || err}`;

      this.currentState.isListening = false;
      this.currentState.hasPermission = false;
      this.currentState.errorMessage = msg;
      this.broadcastState();
      return { success: false, error: msg };
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.ownStream && this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.ownStream && this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.currentState.isListening = false;
    this.currentState.volume = 0;
    this.broadcastState();
  }

  public clearHistory(): void {
    this.recentNotesHistory = [];
    this.lastDetectedChord = null;
    this.currentState.detectedChord = null;
    this.currentState.activePitchClasses = [];
    this.currentState.recentNotes = [];
    this.currentState.chromaVector = new Array(12).fill(0);
    this.broadcastState();
  }

  private handleIncomingNoteOnset(info: DetectedPitchInfo): void {
    if (!this.isRunning) return;
    const now = Date.now();

    // Push note to rolling history
    this.recentNotesHistory = this.recentNotesHistory.filter(n => now - n.timestamp < this.NOTE_EXPIRY_MS);
    
    // Prevent duplicate adjacent triggers of the same note within 250ms
    const recentDuplicate = this.recentNotesHistory.find(
      n => n.note === info.note && now - n.timestamp < 280
    );

    if (!recentDuplicate) {
      this.recentNotesHistory.push({
        note: info.note,
        timestamp: now,
      });
      // Cap at last 8 notes
      if (this.recentNotesHistory.length > 8) {
        this.recentNotesHistory.shift();
      }
    }
  }

  private processLoop = (): void => {
    if (!this.isRunning || !this.analyser || !this.audioContext) return;

    this.analyser.getFloatTimeDomainData(this.timeData);
    this.analyser.getFloatFrequencyData(this.freqData);

    const now = Date.now();
    this.recentNotesHistory = this.recentNotesHistory.filter(n => now - n.timestamp < this.NOTE_EXPIRY_MS);

    // 1. Calculate RMS Volume
    let sumSquares = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      sumSquares += this.timeData[i] * this.timeData[i];
    }
    const rms = Math.sqrt(sumSquares / this.timeData.length);
    const volumePercent = Math.min(100, Math.round(rms * 450));
    this.currentState.volume = volumePercent;

    // 2. Check noise gate
    const isAboveNoise = rms >= this.noiseThreshold;

    if (!isAboveNoise && this.recentNotesHistory.length === 0) {
      // Fade out detection after hold count
      if (this.chordHoldCount > 0) {
        this.chordHoldCount--;
      } else {
        this.currentState.detectedChord = null;
        this.currentState.activePitchClasses = [];
      }
      this.currentState.chromaVector = new Array(12).fill(0);
      this.currentState.recentNotes = [];
      this.broadcastState();
      this.animationFrameId = requestAnimationFrame(this.processLoop);
      return;
    }

    // 3. Compute Real-time 12-semitone Chroma Vector (Pitch Class Profile) from FFT
    const sampleRate = this.audioContext.sampleRate;
    const fftSize = this.analyser.fftSize;
    const chroma = new Float32Array(12).fill(0);

    if (isAboveNoise) {
      // Scan piano fundamental frequencies: MIDI 36 (C2: ~65 Hz) to MIDI 84 (C6: ~1046 Hz)
      for (let midi = 36; midi <= 84; midi++) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const bin = Math.round((freq * fftSize) / sampleRate);

        if (bin > 1 && bin < this.freqData.length - 1) {
          // Average 3 bins around peak to capture tuning nuances
          const dbVal = Math.max(
            this.freqData[bin],
            this.freqData[bin - 1],
            this.freqData[bin + 1]
          );

          if (dbVal > -70) {
            // Convert dB to linear power above noise floor (-70 dB)
            const linearMag = Math.pow(10, (dbVal + 70) / 20);
            const pitchClass = midi % 12;
            chroma[pitchClass] += linearMag;
          }
        }
      }
    }

    // Also integrate recent acoustic onset notes into chroma vector
    this.recentNotesHistory.forEach(item => {
      const pitchBase = item.note.replace(/\d+/, '');
      const idx = NOTE_NAMES.indexOf(pitchBase);
      if (idx >= 0) {
        // Recency weight: newer notes have higher energy
        const age = now - item.timestamp;
        const weight = Math.max(0.2, 1 - age / this.NOTE_EXPIRY_MS);
        chroma[idx] += weight * 4.0;
      }
    });

    // Normalize Chroma Vector
    let maxChroma = 0;
    for (let i = 0; i < 12; i++) {
      if (chroma[i] > maxChroma) maxChroma = chroma[i];
    }

    const normalizedChroma: number[] = [];
    for (let i = 0; i < 12; i++) {
      normalizedChroma[i] = maxChroma > 0 ? chroma[i] / maxChroma : 0;
    }
    this.currentState.chromaVector = normalizedChroma;

    // Active pitch classes with substantial spectral resonance (> 32% of peak)
    const activePitchClasses: string[] = [];
    normalizedChroma.forEach((val, idx) => {
      if (val >= 0.32) {
        activePitchClasses.push(NOTE_NAMES[idx]);
      }
    });
    this.currentState.activePitchClasses = activePitchClasses;
    this.currentState.recentNotes = [...this.recentNotesHistory];

    // 4. Identify Best Matching Chord
    const chordCandidate = this.evaluateChordMatch(normalizedChroma, activePitchClasses);

    if (chordCandidate) {
      this.lastDetectedChord = chordCandidate;
      this.chordHoldCount = 20; // Keep display steady for ~20 frames (~350ms) to avoid flicker
      this.currentState.detectedChord = chordCandidate;
    } else {
      if (this.chordHoldCount > 0) {
        this.chordHoldCount--;
      } else {
        this.currentState.detectedChord = null;
      }
    }

    this.broadcastState();
    this.animationFrameId = requestAnimationFrame(this.processLoop);
  };

  /**
   * Evaluates all 12 roots against chord templates using weighted chroma correlation
   * and discrete pitch class set analysis.
   */
  private evaluateChordMatch(
    chroma: number[],
    activePitchClasses: string[]
  ): DetectedChordResult | null {
    if (activePitchClasses.length < 2) return null;

    let bestMatch: DetectedChordResult | null = null;
    let highestScore = -1;

    // Detect lowest note in recent history for accurate inversion calculation
    let lowestMidi = 999;
    let bassNoteName = activePitchClasses[0];

    this.recentNotesHistory.forEach(n => {
      const match = n.note.match(/([A-G]#?)(\d)/);
      if (match) {
        const base = match[1];
        const oct = parseInt(match[2], 10);
        const midi = (oct + 1) * 12 + NOTE_NAMES.indexOf(base);
        if (midi < lowestMidi) {
          lowestMidi = midi;
          bassNoteName = base;
        }
      }
    });

    for (let rootIdx = 0; rootIdx < 12; rootIdx++) {
      const rootName = NOTE_NAMES[rootIdx];

      for (const tmpl of CHORD_TEMPLATES) {
        // Target chroma indices for this chord
        const targetIndices = tmpl.intervals.map(offset => (rootIdx + offset) % 12);
        const targetPitchNames = targetIndices.map(idx => NOTE_NAMES[idx]);

        // 1. Positive energy in chord tones
        let positiveEnergy = 0;
        let matchedTonesCount = 0;

        targetIndices.forEach(idx => {
          positiveEnergy += chroma[idx];
          if (chroma[idx] >= 0.35) {
            matchedTonesCount++;
          }
        });

        // 2. Penalty for discordant non-chord tones
        let negativeEnergy = 0;
        for (let i = 0; i < 12; i++) {
          if (!targetIndices.includes(i)) {
            // Penalize strong resonance on tones outside the chord
            if (chroma[i] > 0.45) {
              negativeEnergy += chroma[i] * 0.75;
            }
          }
        }

        // Must match at least 2 chord tones (e.g. root + 3rd, or root + 5th) for triad, 3 for 7th chord
        const minRequiredTones = tmpl.intervals.length >= 4 ? 3 : 2;
        if (matchedTonesCount < minRequiredTones) continue;

        // Discrete set overlap
        const setMatches = activePitchClasses.filter(p => targetPitchNames.includes(p)).length;
        const setExtra = activePitchClasses.filter(p => !targetPitchNames.includes(p)).length;

        // Combined score: normalized positive energy minus penalty and extra notes
        const toneCoverage = matchedTonesCount / targetIndices.length;
        const rawScore = (positiveEnergy / targetIndices.length) * 60 +
                         (toneCoverage * 30) +
                         (setMatches * 5) -
                         (negativeEnergy * 20) -
                         (setExtra * 10);

        if (rawScore > highestScore && rawScore > 48) {
          highestScore = rawScore;

          // Inversion determination
          let inversionName = 'Posición Fundamental';
          let inversionIndex = 0;

          if (bassNoteName && targetPitchNames.includes(bassNoteName)) {
            const bassInterval = (NOTE_NAMES.indexOf(bassNoteName) - rootIdx + 12) % 12;
            if (bassInterval === 0) {
              inversionName = 'Posición Fundamental';
              inversionIndex = 0;
            } else if (bassInterval === tmpl.intervals[1]) {
              inversionName = `1ª Inversión (Bajo en ${SOLFEGE_MAP[bassNoteName] || bassNoteName})`;
              inversionIndex = 1;
            } else if (tmpl.intervals.length >= 3 && bassInterval === tmpl.intervals[2]) {
              inversionName = `2ª Inversión (Bajo en ${SOLFEGE_MAP[bassNoteName] || bassNoteName})`;
              inversionIndex = 2;
            } else if (tmpl.intervals.length >= 4 && bassInterval === tmpl.intervals[3]) {
              inversionName = `3ª Inversión (Bajo en ${SOLFEGE_MAP[bassNoteName] || bassNoteName})`;
              inversionIndex = 3;
            }
          }

          const rootSolfege = SOLFEGE_MAP[rootName] || rootName;
          const symbolStr = `${rootName}${tmpl.symbol}`;
          const fullNameEs = `${rootSolfege} ${tmpl.nameEs}`;
          const fullNameEn = `${rootName} ${tmpl.nameEn}`;

          const suggestedKeys = targetIndices.map(idx => `${NOTE_NAMES[idx]}4`);
          const confidence = Math.min(100, Math.max(50, Math.round(rawScore)));

          bestMatch = {
            root: rootName,
            rootSolfege,
            quality: tmpl.nameEs,
            symbol: symbolStr,
            fullNameEs,
            fullNameEn,
            inversionName,
            inversionIndex,
            bassNote: bassNoteName || rootName,
            detectedNotes: targetPitchNames,
            suggestedKeys,
            confidence,
            harmonicDescription: tmpl.description,
          };
        }
      }
    }

    return bestMatch;
  }
}

export const acousticChordDetector = new AcousticChordDetector();
