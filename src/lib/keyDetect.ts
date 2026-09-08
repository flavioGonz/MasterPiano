import { ScaleInfo, SCALES_DATABASE, preferredRootName, fullSpellingMap } from './musicGymTheory';

/**
 * Qué tonalidad tiene una pieza.
 *
 * Un archivo MIDI no dice en qué tonalidad está: trae alturas y nada más. Sin
 * esa información no se puede escribir bien ni una nota —la misma tecla es Mi#
 * en Fa# mayor y Fa en Do mayor—, así que se deduce de la música.
 *
 * El método es el clásico de Krumhansl y Schmuckler: se arma el histograma de
 * clases de altura pesado por duración (una nota larga define la tonalidad más
 * que un adorno) y se correlaciona con los perfiles de tonalidad mayor y menor
 * en las doce rotaciones. Gana la de correlación más alta.
 */

/** Perfiles de Krumhansl y Kessler (1982). */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export interface DetectedKey {
  pc: number;
  mode: 'major' | 'minor';
  /** 0 a 1: qué tan por encima quedó la ganadora de la segunda. */
  confidence: number;
}

function correlate(hist: number[], profile: number[], rotation: number): number {
  const n = 12;
  const x = hist;
  const y = Array.from({ length: n }, (_, i) => profile[(i - rotation + 12) % 12]);
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

export function detectKey(notes: { midi: number; duration: number }[]): DetectedKey | null {
  if (notes.length < 8) return null;
  const hist = new Array(12).fill(0);
  for (const n of notes) hist[((n.midi % 12) + 12) % 12] += Math.max(0.05, Math.min(4, n.duration));
  if (hist.every(v => v === 0)) return null;

  const scores: { pc: number; mode: 'major' | 'minor'; r: number }[] = [];
  for (let pc = 0; pc < 12; pc++) {
    scores.push({ pc, mode: 'major', r: correlate(hist, MAJOR_PROFILE, pc) });
    scores.push({ pc, mode: 'minor', r: correlate(hist, MINOR_PROFILE, pc) });
  }
  scores.sort((a, b) => b.r - a.r);
  const [best, second] = scores;
  return { pc: best.pc, mode: best.mode, confidence: Math.max(0, Math.min(1, best.r - second.r)) };
}

const MAJOR = SCALES_DATABASE.find(s => s.id === 'major') as ScaleInfo;
const MINOR = SCALES_DATABASE.find(s => s.id === 'minor_natural') as ScaleInfo;

/** Nombre legible de una tonalidad detectada: "Fa# mayor", "Do menor". */
export function keyLabel(k: DetectedKey): string {
  const scale = k.mode === 'major' ? MAJOR : MINOR;
  return `${preferredRootName(k.pc, scale.id)} ${k.mode === 'major' ? 'mayor' : 'menor'}`;
}

/** Cómo se escribe cada tecla en la tonalidad detectada. */
export function spellingForKey(k: DetectedKey | null): Record<string, string> {
  if (!k) return {};
  const scale = k.mode === 'major' ? MAJOR : MINOR;
  return fullSpellingMap(preferredRootName(k.pc, scale.id), scale);
}
