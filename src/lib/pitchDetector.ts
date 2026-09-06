/**
 * Real-time Acoustic Piano Pitch Detector using Web Audio API and Autocorrelation.
 * Detects fundamental frequency (f0), musical notes (C1 to B7), cents tuning deviation,
 * and debounces acoustic piano keystroke onsets for automated exercise evaluation.
 */

export interface DetectedPitchInfo {
  frequency: number;
  note: string; // e.g. 'C4'
  noteBase: string; // e.g. 'C'
  octave: number; // e.g. 4
  solfege: string; // e.g. 'Do4'
  cents: number; // -50 to +50
  volume: number; // 0 to 100
  timestamp: number;
}

export interface PitchFrameState {
  isListening: boolean;
  hasPermission: boolean | null; // null = unrequested, true = granted, false = denied
  errorMessage: string | null;
  volume: number; // 0 to 100
  isPitchDetected: boolean;
  frequency: number;
  note: string;
  noteBase: string;
  octave: number;
  solfege: string;
  cents: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SOLFEGE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export class PianoPitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  private buffer: Float32Array = new Float32Array(2048);
  private isRunning: boolean = false;

  // Settings
  public noiseThreshold: number = 0.015; // RMS threshold (0.005 to 0.05)
  public a4Calibration: number = 440; // Reference pitch

  // Listeners
  private frameListeners: Set<(state: PitchFrameState) => void> = new Set();
  private noteOnsetListeners: Set<(info: DetectedPitchInfo) => void> = new Set();

  // Debouncing / stabilization
  private candidateNote: string | null = null;
  private candidateFramesCount: number = 0;
  private lastTriggeredNote: string | null = null;
  private lastTriggeredTime: number = 0;
  private readonly minOnsetCooldownMs: number = 180; // avoid multi-triggering for single piano strike

  public getState(): PitchFrameState {
    return {
      isListening: this.isRunning,
      hasPermission: this.mediaStream ? true : null,
      errorMessage: null,
      volume: 0,
      isPitchDetected: false,
      frequency: 0,
      note: '--',
      noteBase: '--',
      octave: 0,
      solfege: '--',
      cents: 0,
    };
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  public subscribeFrame(listener: (state: PitchFrameState) => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  public subscribeNoteOnset(listener: (info: DetectedPitchInfo) => void): () => void {
    this.noteOnsetListeners.add(listener);
    return () => this.noteOnsetListeners.delete(listener);
  }

  public async start(): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) {
      return { success: true };
    }

    try {
      // Audio stream with optimal constraints for instrument acoustic capture
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
      analyser.fftSize = 2048;

      source.connect(analyser);

      this.audioContext = ctx;
      this.mediaStream = stream;
      this.analyser = analyser;
      this.buffer = new Float32Array(analyser.fftSize);
      this.isRunning = true;

      this.processAudioLoop();
      return { success: true };
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Permiso de micrófono denegado. Permite el acceso al micrófono en el navegador para escuchar tu piano real.'
        : `Error al acceder al micrófono: ${err.message || err}`;
      
      this.broadcastState({
        isListening: false,
        hasPermission: false,
        errorMessage: msg,
        volume: 0,
        isPitchDetected: false,
        frequency: 0,
        note: '--',
        noteBase: '--',
        octave: 0,
        solfege: '--',
        cents: 0,
      });

      return { success: false, error: msg };
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.candidateNote = null;
    this.candidateFramesCount = 0;
    this.lastTriggeredNote = null;

    this.broadcastState({
      isListening: false,
      hasPermission: null,
      errorMessage: null,
      volume: 0,
      isPitchDetected: false,
      frequency: 0,
      note: '--',
      noteBase: '--',
      octave: 0,
      solfege: '--',
      cents: 0,
    });
  }

  private processAudioLoop = (): void => {
    if (!this.isRunning || !this.analyser || !this.audioContext) return;

    this.analyser.getFloatTimeDomainData(this.buffer);

    // 1. Calculate RMS volume (0 to 100)
    let sumSquares = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      sumSquares += this.buffer[i] * this.buffer[i];
    }
    const rms = Math.sqrt(sumSquares / this.buffer.length);
    const volumePercent = Math.min(100, Math.round(rms * 400));

    // 2. Silence / noise gate check
    if (rms < this.noiseThreshold) {
      this.candidateNote = null;
      this.candidateFramesCount = 0;

      this.broadcastState({
        isListening: true,
        hasPermission: true,
        errorMessage: null,
        volume: volumePercent,
        isPitchDetected: false,
        frequency: 0,
        note: '--',
        noteBase: '--',
        octave: 0,
        solfege: '--',
        cents: 0,
      });

      this.animationFrameId = requestAnimationFrame(this.processAudioLoop);
      return;
    }

    // 3. Autocorrelation Pitch Detection
    const sampleRate = this.audioContext.sampleRate;
    const frequency = this.autoCorrelate(this.buffer, sampleRate);

    if (frequency <= 0 || frequency < 50 || frequency > 2200) {
      // Out of piano fundamental range or unclear pitch
      this.broadcastState({
        isListening: true,
        hasPermission: true,
        errorMessage: null,
        volume: volumePercent,
        isPitchDetected: false,
        frequency: 0,
        note: '--',
        noteBase: '--',
        octave: 0,
        solfege: '--',
        cents: 0,
      });
      this.animationFrameId = requestAnimationFrame(this.processAudioLoop);
      return;
    }

    // 4. Convert frequency to note and cents
    const noteInfo = this.frequencyToNoteInfo(frequency, volumePercent);

    // 5. Note onset detection and stabilization
    this.handleNoteOnset(noteInfo);

    this.broadcastState({
      isListening: true,
      hasPermission: true,
      errorMessage: null,
      volume: volumePercent,
      isPitchDetected: true,
      frequency: Math.round(frequency * 10) / 10,
      note: noteInfo.note,
      noteBase: noteInfo.noteBase,
      octave: noteInfo.octave,
      solfege: noteInfo.solfege,
      cents: noteInfo.cents,
    });

    this.animationFrameId = requestAnimationFrame(this.processAudioLoop);
  };

  /**
   * Fast Autocorrelation with Parabolic Interpolation for Sub-Sample Accuracy
   */
  private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    const SIZE = buffer.length;
    let sum = 0;
    for (let i = 0; i < SIZE; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / SIZE);
    if (rms < this.noiseThreshold) return -1;

    // Trim noise boundaries
    let r1 = 0;
    let r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    const trimmedBuffer = buffer.subarray(r1, r2);
    const trimmedSize = trimmedBuffer.length;

    // Scan period range from ~50 Hz to ~1200 Hz
    const minPeriod = Math.floor(sampleRate / 1200);
    const maxPeriod = Math.floor(sampleRate / 50);

    const c = new Float32Array(maxPeriod);
    for (let i = 0; i < maxPeriod; i++) {
      for (let j = 0; j < trimmedSize - i; j++) {
        c[i] = c[i] + trimmedBuffer[j] * trimmedBuffer[j + i];
      }
    }

    // Find the first dip after lag 0
    let d = 0;
    while (d < maxPeriod - 1 && c[d] > c[d + 1]) {
      d++;
    }

    // Find maximum peak after dip
    let maxVal = -1;
    let maxPos = -1;
    for (let i = d; i < maxPeriod; i++) {
      if (c[i] > maxVal) {
        maxVal = c[i];
        maxPos = i;
      }
    }

    if (maxPos < minPeriod || maxVal < 0.01) {
      return -1;
    }

    // Parabolic interpolation around peak
    let T0 = maxPos;
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];

    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) {
      T0 = T0 - b / (2 * a);
    }

    return sampleRate / T0;
  }

  /**
   * Convert frequency to musical note, solfege and cents offset
   */
  public frequencyToNoteInfo(freq: number, volume: number): DetectedPitchInfo {
    // Standard formula: n = 12 * log2(f / 440) + 69
    const noteNum = 12 * (Math.log(freq / this.a4Calibration) / Math.log(2)) + 69;
    const midi = Math.round(noteNum);
    const noteIndex = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const noteBase = NOTE_NAMES[noteIndex];
    const solfegeBase = SOLFEGE_NAMES[noteIndex];
    const note = `${noteBase}${octave}`;
    const solfege = `${solfegeBase}${octave}`;

    // Calculate exact cents difference from target nominal pitch
    const nominalFreq = this.a4Calibration * Math.pow(2, (midi - 69) / 12);
    const cents = Math.round(1200 * (Math.log(freq / nominalFreq) / Math.log(2)));

    return {
      frequency: Math.round(freq * 10) / 10,
      note,
      noteBase,
      octave,
      solfege,
      cents: Math.max(-50, Math.min(50, cents)),
      volume,
      timestamp: Date.now(),
    };
  }

  /**
   * Filter and debounce piano strikes so a single key depression triggers exactly one clean event
   */
  private handleNoteOnset(info: DetectedPitchInfo): void {
    const now = Date.now();

    if (this.candidateNote === info.note) {
      this.candidateFramesCount++;
    } else {
      this.candidateNote = info.note;
      this.candidateFramesCount = 1;
    }

    // Require at least 2 consistent frames for confirmation
    if (this.candidateFramesCount >= 2) {
      const isNewNote = this.lastTriggeredNote !== info.note;
      const hasCooldownElapsed = now - this.lastTriggeredTime > this.minOnsetCooldownMs;

      if (isNewNote || hasCooldownElapsed) {
        this.lastTriggeredNote = info.note;
        this.lastTriggeredTime = now;

        // Fire onset event to all listeners
        this.noteOnsetListeners.forEach(listener => listener(info));
      }
    }
  }

  private broadcastState(state: PitchFrameState): void {
    this.frameListeners.forEach(listener => listener(state));
  }
}

// Singleton instance for cross-component listening
export const pianoPitchDetector = new PianoPitchDetector();
