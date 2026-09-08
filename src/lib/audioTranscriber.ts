/**
 * Transcripción de audio a notas para la Catarata de Tonos.
 * Corre igual en el navegador (Web Audio decodifica) y en el servidor
 * (ffmpeg decodifica → `transcribeSamples`). No usa APIs del DOM al importar.
 *
 * Dos modos:
 *  - 'poly' (piano, guitarra, otros): STFT (Hann 4096, salto 512 ≈ 11,6 ms) →
 *    picos espectrales con interpolación parabólica → umbral LOCAL (el pico
 *    debe superar la envolvente espectral de su entorno, no solo el máximo
 *    del cuadro: así los punteos suaves sobreviven a un acorde fuerte) →
 *    supresión de armónicos → seguimiento de notas con detección de
 *    RE-ATAQUE (si la energía de un tono sube de golpe mientras la nota está
 *    activa, se corta y nace otra: notas repetidas en arpegios/punteos).
 *  - 'mono' (voz, bajo): pitch tracking por autocorrelación normalizada
 *    (tipo YIN) cuadro a cuadro, filtro de mediana para quitar saltos de
 *    octava, y agrupación en notas con histéresis de medio semitono.
 *
 * Sigue siendo aproximado: no es un separador de fuentes ni un modelo
 * entrenado. La UI deja corregir (borrar / mover / recortar) en la Catarata.
 */

import { WaterfallNote, WaterfallSong, WaterfallTrack, midiToNoteName } from './midiWaterfall';

export type TranscribeMode = 'poly' | 'mono';

export interface TranscribeOptions {
  /** 0..1 — más alto = detecta más notas (y más ruido). Default 0.5 */
  sensitivity?: number;
  mode?: TranscribeMode;
  minMidi?: number;
  maxMidi?: number;
  /** Nota más grave que va a la mano derecha. Default 60 (C4) */
  splitMidi?: number;
  /** Duración mínima de una nota en segundos. Default 0.06 */
  minNoteSeconds?: number;
  /** Id de pista para todas las notas (instrumento). */
  track?: string;
  onProgress?: (p: number) => void;
}

export interface TranscriptionResult {
  song: WaterfallSong;
  energy: Float32Array;
  frameSeconds: number;
  sampleRate: number;
}

const FFT_SIZE = 4096;
const HOP = 512;

/* ---------- FFT radix-2 (in place) ---------- */
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = i + j + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

let hannCache: Float32Array | null = null;
const hann = () => {
  if (!hannCache) {
    hannCache = new Float32Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i++) hannCache[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
  }
  return hannCache;
};

const freqToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);
const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Navegador: decodifica un File a mono. */
export async function decodeToMono(file: File | ArrayBuffer): Promise<{ data: Float32Array; sampleRate: number; duration: number }> {
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const g: any = globalThis as any;
  const Ctx = (g.AudioContext || g.webkitAudioContext) as typeof AudioContext;
  const ctx = new Ctx();
  try {
    const audio = await ctx.decodeAudioData(buf.slice(0));
    const n = audio.length;
    const mono = new Float32Array(n);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const ch = audio.getChannelData(c);
      for (let i = 0; i < n; i++) mono[i] += ch[i] / audio.numberOfChannels;
    }
    return { data: mono, sampleRate: audio.sampleRate, duration: audio.duration };
  } finally {
    ctx.close().catch(() => {});
  }
}

export async function transcribeAudio(file: File, opts: TranscribeOptions = {}): Promise<TranscriptionResult> {
  const { data, sampleRate, duration } = await decodeToMono(file);
  return transcribeSamples(data, sampleRate, duration, file.name, opts);
}

interface RawNote { midi: number; start: number; end: number; peakMag: number; }

/** Núcleo sobre muestras mono (usable en Node). */
export async function transcribeSamples(
  data: Float32Array, sampleRate: number, duration: number, fileName: string, opts: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  const mode = opts.mode ?? 'poly';
  const r = mode === 'mono'
    ? await transcribeMono(data, sampleRate, opts)
    : await transcribePoly(data, sampleRate, opts);
  return { song: buildSong(r.notes, r.energy, r.frameSeconds, duration, fileName, opts), energy: r.energy, frameSeconds: r.frameSeconds, sampleRate };
}

/* ================================================================== */
/*  Polifónico                                                         */
/* ================================================================== */
async function transcribePoly(data: Float32Array, sampleRate: number, opts: TranscribeOptions) {
  const sensitivity = Math.min(1, Math.max(0, opts.sensitivity ?? 0.5));
  const minMidi = opts.minMidi ?? 36, maxMidi = opts.maxMidi ?? 96;
  const minNoteSeconds = opts.minNoteSeconds ?? 0.06;
  const frameSeconds = HOP / sampleRate;
  const nFrames = Math.max(1, Math.floor((data.length - FFT_SIZE) / HOP));
  const binHz = sampleRate / FFT_SIZE;
  const w = hann();
  const re = new Float32Array(FFT_SIZE), im = new Float32Array(FFT_SIZE);
  const mag = new Float32Array(FFT_SIZE / 2);
  const energy = new Float32Array(nFrames);

  // Umbrales
  const localFactor = 9 - sensitivity * 5;            // pico ≥ x × envolvente local geométrica (4 .. 9)
  const globalFactor = 0.12 - sensitivity * 0.10;     // pico ≥ x × máximo del cuadro (0.02 .. 0.12)
  const absThreshold = 0.0012 * (1.3 - sensitivity);  // piso absoluto
  const minFrames = Math.max(2, Math.round(minNoteSeconds / frameSeconds));
  const releaseFrames = 3;
  const reattackRatio = 2.2;                           // subida de energía que cuenta como nuevo ataque

  const minBin = Math.max(2, Math.floor(midiToFreq(minMidi) / binHz));
  const maxBin = Math.min(FFT_SIZE / 2 - 2, Math.ceil(midiToFreq(maxMidi) / binHz));
  const envWin = 20; // bins a cada lado para la envolvente local

  const active = new Map<number, { start: number; frames: number; peakMag: number; lastSeen: number; lastMag: number; prevMag: number }>();
  const finished: RawNote[] = [];
  const prefix = new Float32Array(FFT_SIZE / 2 + 1);
  const prevMagByMidi = new Map<number, number>();

  for (let f = 0; f < nFrames; f++) {
    const off = f * HOP;
    for (let i = 0; i < FFT_SIZE; i++) { re[i] = data[off + i] * w[i]; im[i] = 0; }
    fft(re, im);
    let maxMag = 0, sum = 0;
    prefix[0] = 0;
    for (let k = 0; k < FFT_SIZE / 2; k++) {
      const m = Math.hypot(re[k], im[k]) / FFT_SIZE;
      mag[k] = m; prefix[k + 1] = prefix[k] + Math.log(m + 1e-7);
      if (k >= minBin && k <= maxBin) { if (m > maxMag) maxMag = m; sum += m; }
    }
    energy[f] = sum;

    const peaks: { midi: number; m: number; freq: number }[] = [];
    if (maxMag > absThreshold) {
      const gth = maxMag * globalFactor;
      for (let k = minBin; k <= maxBin; k++) {
        const m = mag[k];
        if (m < absThreshold || m < gth || m <= mag[k - 1] || m < mag[k + 1]) continue;
        const a = Math.max(0, k - envWin), b = Math.min(FFT_SIZE / 2, k + envWin + 1);
        // envolvente local = media geométrica (robusta a picos vecinos)
        const localEnv = Math.exp((prefix[b] - prefix[a] - Math.log(m + 1e-7)) / (b - a - 1));
        if (m < localEnv * localFactor) continue;
        const pa = mag[k - 1], pb = m, pc = mag[k + 1];
        const denom = pa - 2 * pb + pc;
        const delta = denom !== 0 ? 0.5 * (pa - pc) / denom : 0;
        const freq = (k + delta) * binHz;
        const midi = Math.round(freqToMidi(freq));
        if (midi < minMidi || midi > maxMidi) continue;
        peaks.push({ midi, m, freq });
      }
    }
    // Supresión de armónicos: un pico en 2f..5f de una fundamental más fuerte se
    // considera parte de ella… salvo que su energía haya SALTADO respecto del
    // cuadro anterior (un ataque nuevo en la posición de un armónico = nota real,
    // típico de melodías/punteos una octava arriba del acorde).
    peaks.sort((x, y) => x.freq - y.freq);
    const kept: { midi: number; m: number; freq: number }[] = [];
    const seen = new Set<number>();
    for (const p of peaks) {
      const prevM = prevMagByMidi.get(p.midi) ?? 0;
      const onset = p.m > prevM * reattackRatio && p.m > absThreshold * 3;
      let harmonic = false;
      if (!onset) {
        for (const q of kept) {
          for (let h = 2; h <= 5; h++) {
            if (Math.abs(p.freq / q.freq - h) < 0.03 * h && q.m >= p.m * (h === 2 ? 0.8 : 0.55)) { harmonic = true; break; }
          }
          if (harmonic) break;
        }
      }
      if (harmonic || seen.has(p.midi)) continue;
      seen.add(p.midi); kept.push(p);
    }
    // magnitudes por tono para el cuadro siguiente (incluye los suprimidos, para medir saltos reales)
    prevMagByMidi.clear();
    for (const p of peaks) prevMagByMidi.set(p.midi, Math.max(prevMagByMidi.get(p.midi) ?? 0, p.m));

    // Seguimiento con re-ataques
    const present = new Set<number>();
    for (const p of kept) {
      present.add(p.midi);
      const a = active.get(p.midi);
      if (a) {
        const reattack = a.frames >= minFrames && p.m > a.prevMag * reattackRatio && p.m > a.lastMag * 1.6;
        if (reattack) {
          finished.push({ midi: p.midi, start: a.start, end: f, peakMag: a.peakMag });
          active.set(p.midi, { start: f, frames: 1, peakMag: p.m, lastSeen: f, lastMag: p.m, prevMag: p.m });
        } else {
          a.frames++; a.lastSeen = f; a.prevMag = a.lastMag; a.lastMag = p.m; if (p.m > a.peakMag) a.peakMag = p.m;
        }
      } else {
        active.set(p.midi, { start: f, frames: 1, peakMag: p.m, lastSeen: f, lastMag: p.m, prevMag: p.m });
      }
    }
    for (const [midi, a] of active) {
      if (present.has(midi)) continue;
      if (f - a.lastSeen > releaseFrames) {
        if (a.frames >= minFrames) finished.push({ midi, start: a.start, end: a.lastSeen + 1, peakMag: a.peakMag });
        active.delete(midi);
      }
    }
    if (f % 128 === 0) { opts.onProgress?.(f / nFrames); await yieldThread(); }
  }
  for (const [midi, a] of active) if (a.frames >= minFrames) finished.push({ midi, start: a.start, end: a.lastSeen + 1, peakMag: a.peakMag });
  opts.onProgress?.(1);
  return { notes: finished, energy, frameSeconds };
}

/* ================================================================== */
/*  Monofónico (voz, bajo): autocorrelación normalizada                 */
/* ================================================================== */
async function transcribeMono(data: Float32Array, sampleRate: number, opts: TranscribeOptions) {
  const sensitivity = Math.min(1, Math.max(0, opts.sensitivity ?? 0.5));
  const minMidi = opts.minMidi ?? 28, maxMidi = opts.maxMidi ?? 88;
  const minNoteSeconds = opts.minNoteSeconds ?? 0.08;
  const N = 2048, H = 512;
  const frameSeconds = H / sampleRate;
  const nFrames = Math.max(1, Math.floor((data.length - N) / H));
  const energy = new Float32Array(nFrames);
  const pitch = new Float32Array(nFrames); // midi (fraccional) o 0 si no hay voz
  const minLag = Math.floor(sampleRate / midiToFreq(maxMidi));
  const maxLag = Math.ceil(sampleRate / midiToFreq(minMidi));
  const rmsThreshold = 0.012 * (1.4 - sensitivity);
  const clarityThreshold = 0.78 - sensitivity * 0.18;
  // Autocorrelación vía FFT (O(N log N) por cuadro): r = IFFT(|FFT(x)|²)
  const M = N * 2;
  const re = new Float32Array(M), im = new Float32Array(M);

  for (let f = 0; f < nFrames; f++) {
    const off = f * H;
    let rms = 0;
    for (let i = 0; i < M; i++) { re[i] = i < N ? data[off + i] : 0; im[i] = 0; }
    for (let i = 0; i < N; i++) rms += re[i] * re[i];
    rms = Math.sqrt(rms / N); energy[f] = rms;
    if (rms < rmsThreshold) { pitch[f] = 0; if (f % 256 === 0) { opts.onProgress?.(f / nFrames); await yieldThread(); } continue; }
    fft(re, im);
    for (let i = 0; i < M; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; }
    fft(re, im); // la FFT de un espectro de potencia real y simétrico es la autocorrelación (salvo escala)
    const r0 = re[0] || 1e-12;
    // Mejor pico entre minLag y maxLag; preferir el lag más corto que llegue al 90 % del mejor (evita sub-octavas)
    let bestLag = -1, bestVal = 0;
    const norm = (lag: number) => (re[lag] / r0) * (N / Math.max(1, N - lag)); // compensa el solapamiento menor en lags largos
    for (let lag = minLag; lag <= maxLag; lag++) {
      const v = norm(lag);
      if (v > bestVal && re[lag] >= re[lag - 1] && re[lag] >= re[lag + 1]) { bestVal = v; bestLag = lag; }
    }
    if (bestLag > 0 && bestVal >= clarityThreshold) {
      let chosen = bestLag;
      for (let lag = minLag; lag < bestLag; lag++) {
        const v = norm(lag);
        if (v >= bestVal * 0.9 && re[lag] >= re[lag - 1] && re[lag] >= re[lag + 1]) { chosen = lag; break; }
      }
      const a = re[chosen - 1], b = re[chosen], c = re[chosen + 1];
      const denom = a - 2 * b + c;
      const delta = denom !== 0 ? 0.5 * (a - c) / denom : 0;
      pitch[f] = freqToMidi(sampleRate / (chosen + delta));
    } else pitch[f] = 0;
    if (f % 256 === 0) { opts.onProgress?.(f / nFrames); await yieldThread(); }
  }
  // Filtro de mediana (5) para saltos de octava
  const med = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    const win: number[] = [];
    for (let k = -2; k <= 2; k++) { const v = pitch[Math.min(nFrames - 1, Math.max(0, f + k))]; if (v > 0) win.push(v); }
    if (win.length < 3) { med[f] = 0; continue; }
    win.sort((x, y) => x - y); med[f] = win[Math.floor(win.length / 2)];
  }
  // Agrupar en notas con histéresis
  const minFrames = Math.max(2, Math.round(minNoteSeconds / frameSeconds));
  const notes: RawNote[] = [];
  let cur: { midi: number; start: number; peak: number } | null = null;
  for (let f = 0; f < nFrames; f++) {
    const p = med[f];
    if (p === 0) { if (cur && f - cur.start >= minFrames) notes.push({ midi: cur.midi, start: cur.start, end: f, peakMag: cur.peak }); cur = null; continue; }
    if (!cur) { cur = { midi: Math.round(p), start: f, peak: energy[f] }; continue; }
    if (Math.abs(p - cur.midi) > 0.6) {
      if (f - cur.start >= minFrames) notes.push({ midi: cur.midi, start: cur.start, end: f, peakMag: cur.peak });
      cur = { midi: Math.round(p), start: f, peak: energy[f] };
    } else if (energy[f] > cur.peak) cur.peak = energy[f];
  }
  if (cur && nFrames - cur.start >= minFrames) notes.push({ midi: cur.midi, start: cur.start, end: nFrames, peakMag: cur.peak });
  opts.onProgress?.(1);
  return { notes, energy, frameSeconds };
}

/* ================================================================== */
/*  Ensamblado                                                         */
/* ================================================================== */
function buildSong(rawIn: RawNote[], energy: Float32Array, frameSeconds: number, duration: number, fileName: string, opts: TranscribeOptions): WaterfallSong {
  let raw = rawIn;
  const splitMidi = opts.splitMidi ?? 60;
  const minNoteSeconds = opts.minNoteSeconds ?? 0.06;
  const maxPeak = raw.reduce((m, n) => Math.max(m, n.peakMag), 1e-9);
  // Descartar restos muy débiles (re-disparos de colas que decaen)
  const floor = 0.16 + (1 - (opts.sensitivity ?? 0.5)) * 0.1;
  raw = raw.filter(n => Math.sqrt(n.peakMag / maxPeak) >= floor);
  raw.sort((a, b) => a.start - b.start || a.midi - b.midi);
  const notes: WaterfallNote[] = raw.map((n, i) => ({
    id: `${opts.track ?? 'wav'}-${i}`,
    name: midiToNoteName(n.midi),
    midi: n.midi,
    time: +(n.start * frameSeconds).toFixed(3),
    duration: +Math.max(minNoteSeconds, (n.end - n.start) * frameSeconds).toFixed(3),
    velocity: +Math.min(1, Math.max(0.35, Math.sqrt(n.peakMag / maxPeak))).toFixed(2),
    hand: opts.track === 'bass' ? 'left' : n.midi < splitMidi ? 'left' : 'right',
    ...(opts.track ? { track: opts.track } : {}),
  }));
  const bpm = estimateBpm(energy, frameSeconds);
  const name = fileName.replace(/\.[^.]+$/, '');
  const density = notes.length / Math.max(1, duration);
  return {
    id: `wav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: name,
    composer: 'Transcripción de audio',
    difficulty: density > 4 ? 'Avanzado' : density > 2 ? 'Intermedio' : 'Fácil',
    bpm,
    duration: +duration.toFixed(2),
    notesCount: notes.length,
    description: `Notas extraídas automáticamente de ${fileName} (${notes.length} notas, ${bpm} bpm estimados).`,
    notes,
    isCustom: true,
  };
}

/** Une varias transcripciones (una por instrumento) en una pieza multipista. */
export function mergeTracks(parts: { track: WaterfallTrack; song: WaterfallSong }[], title: string, duration: number, sourceJobId?: string): WaterfallSong {
  const notes = parts.flatMap(p => p.song.notes.map(n => ({ ...n, track: p.track.id })));
  notes.sort((a, b) => a.time - b.time || a.midi - b.midi);
  const bpm = parts.find(p => p.track.id === 'drums')?.song.bpm ?? parts[0]?.song.bpm ?? 90;
  const density = notes.length / Math.max(1, duration);
  return {
    id: `stems-${sourceJobId ?? Date.now()}`,
    title,
    composer: 'Separación de instrumentos',
    difficulty: density > 6 ? 'Avanzado' : density > 3 ? 'Intermedio' : 'Fácil',
    bpm,
    duration: +duration.toFixed(2),
    notesCount: notes.length,
    description: `${parts.map(p => `${p.track.name}: ${p.song.notesCount}`).join(' · ')}`,
    notes,
    isCustom: true,
    tracks: parts.map(p => p.track),
    sourceJobId,
  };
}

export function estimateBpm(energy: Float32Array, frameSeconds: number): number {
  const n = energy.length;
  if (n < 64) return 90;
  const flux = new Float32Array(n);
  for (let i = 1; i < n; i++) flux[i] = Math.max(0, energy[i] - energy[i - 1]);
  const mean = flux.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < n; i++) flux[i] -= mean;
  const minLag = Math.floor(60 / 200 / frameSeconds);
  const maxLag = Math.ceil(60 / 60 / frameSeconds);
  let bestLag = minLag, best = -Infinity;
  // Muestreo cada 2 lags para acelerar en cuadros chicos
  for (let lag = minLag; lag <= maxLag && lag < n / 2; lag += 2) {
    let s = 0;
    for (let i = 0; i + lag < n; i += 2) s += flux[i] * flux[i + lag];
    const bpm = 60 / (lag * frameSeconds);
    s *= 1 - Math.abs(Math.log2(bpm / 100)) * 0.15;
    if (s > best) { best = s; bestLag = lag; }
  }
  return Math.round(60 / (bestLag * frameSeconds));
}

const yieldThread = () => new Promise<void>(r => setTimeout(r, 0));
