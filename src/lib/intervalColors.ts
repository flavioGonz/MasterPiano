// -------------------------------------------------------------
// INTERVAL VISUAL COLOR CODING ENGINE FOR PIANO KEYBOARDS
// -------------------------------------------------------------
// Provides visual distinction for intervals within chords:
// - Fundamental (Root, 1P) -> Verde (Emerald/Green)
// - Tercera (3m / 3M)      -> Azul (Sky/Blue)
// - Quinta (5d / 5J / 5A)  -> Púrpura (Purple/Violet)
// - Séptima (7m / 7M)      -> Naranja / Ámbar (Orange/Amber)
// - Segunda (2m / 2M)      -> Cian (Cyan)
// - Cuarta (4J / 11)       -> Índigo (Indigo)
// - Sexta (6m / 6M)        -> Fucsia / Rosa (Pink)
// -------------------------------------------------------------

export interface IntervalInfo {
  semitones: number;
  role: 'root' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth' | 'seventh';
  shortLabel: string;
  pillLabel: string;
  fullName: string;
  colorName: string;
  hex: string;
  // Dark key (black piano keys) styling
  blackKeyBgClass: string;
  // White key (white piano keys) styling
  whiteKeyBgClass: string;
  // Badge styling
  badgeClass: string;
  textColor: string;
}

const NOTE_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const ENHARMONIC_MAP: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
  'E#': 'F',
  'B#': 'C',
  'Cb': 'B',
  'Fb': 'E'
};

export function normalizePitchClass(pitch: string): string {
  const clean = pitch.trim().replace(/\d+$/, '');
  return ENHARMONIC_MAP[clean] || clean;
}

export const INTERVAL_DEFINITIONS: Record<number, IntervalInfo> = {
  0: {
    semitones: 0,
    role: 'root',
    shortLabel: '1',
    pillLabel: '1 Fund',
    fullName: 'Fundamental (Tónica)',
    colorName: 'Verde Esmeralda',
    hex: '#10b981',
    blackKeyBgClass: '!bg-gradient-to-b !from-emerald-500 !to-emerald-700 !border-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.85)]',
    whiteKeyBgClass: '!bg-emerald-100/95 !border-emerald-500 !ring-2 !ring-emerald-500/70 shadow-[0_0_18px_rgba(16,185,129,0.5)]',
    badgeClass: 'bg-emerald-500 text-white font-extrabold shadow-sm',
    textColor: 'text-emerald-400'
  },
  1: {
    semitones: 1,
    role: 'second',
    shortLabel: '2m',
    pillLabel: '2ªm',
    fullName: 'Segunda Menor (b9)',
    colorName: 'Cian Profundo',
    hex: '#0891b2',
    blackKeyBgClass: '!bg-gradient-to-b !from-cyan-600 !to-cyan-800 !border-cyan-300 shadow-[0_0_16px_rgba(8,145,178,0.8)]',
    whiteKeyBgClass: '!bg-cyan-100/95 !border-cyan-500 !ring-2 !ring-cyan-500/60 shadow-[0_0_16px_rgba(8,145,178,0.45)]',
    badgeClass: 'bg-cyan-600 text-white font-bold shadow-sm',
    textColor: 'text-cyan-400'
  },
  2: {
    semitones: 2,
    role: 'second',
    shortLabel: '2M',
    pillLabel: '2ªM',
    fullName: 'Segunda Mayor (Sus2 / 9)',
    colorName: 'Cian Eléctrico',
    hex: '#06b6d4',
    blackKeyBgClass: '!bg-gradient-to-b !from-cyan-500 !to-cyan-700 !border-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.85)]',
    whiteKeyBgClass: '!bg-cyan-100/95 !border-cyan-500 !ring-2 !ring-cyan-500/60 shadow-[0_0_16px_rgba(6,182,212,0.45)]',
    badgeClass: 'bg-cyan-500 text-black font-extrabold shadow-sm',
    textColor: 'text-cyan-400'
  },
  3: {
    semitones: 3,
    role: 'third',
    shortLabel: '3m',
    pillLabel: '3ªm',
    fullName: 'Tercera Menor',
    colorName: 'Azul Zafiro',
    hex: '#0284c7',
    blackKeyBgClass: '!bg-gradient-to-b !from-sky-500 !to-blue-700 !border-sky-300 shadow-[0_0_18px_rgba(14,165,233,0.85)]',
    whiteKeyBgClass: '!bg-sky-100/95 !border-sky-500 !ring-2 !ring-sky-500/70 shadow-[0_0_18px_rgba(14,165,233,0.5)]',
    badgeClass: 'bg-sky-600 text-white font-extrabold shadow-sm',
    textColor: 'text-sky-400'
  },
  4: {
    semitones: 4,
    role: 'third',
    shortLabel: '3M',
    pillLabel: '3ªM',
    fullName: 'Tercera Mayor',
    colorName: 'Azul Real',
    hex: '#2563eb',
    blackKeyBgClass: '!bg-gradient-to-b !from-blue-500 !to-blue-700 !border-blue-300 shadow-[0_0_18px_rgba(37,99,235,0.85)]',
    whiteKeyBgClass: '!bg-blue-100/95 !border-blue-500 !ring-2 !ring-blue-500/70 shadow-[0_0_18px_rgba(37,99,235,0.5)]',
    badgeClass: 'bg-blue-600 text-white font-extrabold shadow-sm',
    textColor: 'text-blue-400'
  },
  5: {
    semitones: 5,
    role: 'fourth',
    shortLabel: '4J',
    pillLabel: '4ªJ',
    fullName: 'Cuarta Justa (Sus4 / 11)',
    colorName: 'Índigo',
    hex: '#6366f1',
    blackKeyBgClass: '!bg-gradient-to-b !from-indigo-500 !to-indigo-700 !border-indigo-300 shadow-[0_0_18px_rgba(99,102,241,0.85)]',
    whiteKeyBgClass: '!bg-indigo-100/95 !border-indigo-500 !ring-2 !ring-indigo-500/60 shadow-[0_0_16px_rgba(99,102,241,0.45)]',
    badgeClass: 'bg-indigo-500 text-white font-bold shadow-sm',
    textColor: 'text-indigo-400'
  },
  6: {
    semitones: 6,
    role: 'fifth',
    shortLabel: '5d',
    pillLabel: '5ªd',
    fullName: 'Quinta Disminuida (Tritono)',
    colorName: 'Púrpura Tritono',
    hex: '#a855f7',
    blackKeyBgClass: '!bg-gradient-to-b !from-purple-500 !to-violet-700 !border-purple-300 shadow-[0_0_18px_rgba(168,85,247,0.85)]',
    whiteKeyBgClass: '!bg-purple-100/95 !border-purple-500 !ring-2 !ring-purple-500/60 shadow-[0_0_16px_rgba(168,85,247,0.45)]',
    badgeClass: 'bg-purple-500 text-white font-bold shadow-sm',
    textColor: 'text-purple-400'
  },
  7: {
    semitones: 7,
    role: 'fifth',
    shortLabel: '5J',
    pillLabel: '5ªJ',
    fullName: 'Quinta Justa',
    colorName: 'Púrpura Real',
    hex: '#9333ea',
    blackKeyBgClass: '!bg-gradient-to-b !from-purple-600 !to-purple-800 !border-purple-300 shadow-[0_0_18px_rgba(147,51,234,0.9)]',
    whiteKeyBgClass: '!bg-purple-100/95 !border-purple-500 !ring-2 !ring-purple-500/70 shadow-[0_0_18px_rgba(147,51,234,0.5)]',
    badgeClass: 'bg-purple-600 text-white font-extrabold shadow-sm',
    textColor: 'text-purple-400'
  },
  8: {
    semitones: 8,
    role: 'sixth',
    shortLabel: '5A',
    pillLabel: '5ªA / 6ªm',
    fullName: 'Quinta Aumentada / Sexta Menor',
    colorName: 'Fucsia',
    hex: '#d946ef',
    blackKeyBgClass: '!bg-gradient-to-b !from-fuchsia-500 !to-fuchsia-700 !border-fuchsia-300 shadow-[0_0_18px_rgba(217,70,239,0.85)]',
    whiteKeyBgClass: '!bg-fuchsia-100/95 !border-fuchsia-500 !ring-2 !ring-fuchsia-500/60 shadow-[0_0_16px_rgba(217,70,239,0.45)]',
    badgeClass: 'bg-fuchsia-500 text-white font-bold shadow-sm',
    textColor: 'text-fuchsia-400'
  },
  9: {
    semitones: 9,
    role: 'sixth',
    shortLabel: '6M',
    pillLabel: '6ªM',
    fullName: 'Sexta Mayor (13 / dim7)',
    colorName: 'Rosa Magenta',
    hex: '#ec4899',
    blackKeyBgClass: '!bg-gradient-to-b !from-pink-500 !to-rose-600 !border-pink-300 shadow-[0_0_18px_rgba(236,72,153,0.85)]',
    whiteKeyBgClass: '!bg-pink-100/95 !border-pink-500 !ring-2 !ring-pink-500/60 shadow-[0_0_16px_rgba(236,72,153,0.45)]',
    badgeClass: 'bg-pink-500 text-white font-bold shadow-sm',
    textColor: 'text-pink-400'
  },
  10: {
    semitones: 10,
    role: 'seventh',
    shortLabel: '7m',
    pillLabel: '7ªm',
    fullName: 'Séptima Menor (Dominante)',
    colorName: 'Naranja Cítrico',
    hex: '#f97316',
    blackKeyBgClass: '!bg-gradient-to-b !from-orange-500 !to-orange-700 !border-orange-300 shadow-[0_0_18px_rgba(249,115,22,0.85)]',
    whiteKeyBgClass: '!bg-orange-100/95 !border-orange-500 !ring-2 !ring-orange-500/70 shadow-[0_0_18px_rgba(249,115,22,0.5)]',
    badgeClass: 'bg-orange-500 text-white font-extrabold shadow-sm',
    textColor: 'text-orange-400'
  },
  11: {
    semitones: 11,
    role: 'seventh',
    shortLabel: '7M',
    pillLabel: '7ªM',
    fullName: 'Séptima Mayor',
    colorName: 'Ámbar Brillante',
    hex: '#f59e0b',
    blackKeyBgClass: '!bg-gradient-to-b !from-amber-400 !to-amber-600 !border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.9)]',
    whiteKeyBgClass: '!bg-amber-100/95 !border-amber-500 !ring-2 !ring-amber-500/70 shadow-[0_0_18px_rgba(245,158,11,0.5)]',
    badgeClass: 'bg-amber-500 text-black font-extrabold shadow-sm',
    textColor: 'text-amber-400'
  }
};

/**
 * Calculates the interval information for a note given a chord root
 */
export function getIntervalForNote(rootName: string, noteName: string): IntervalInfo {
  const normRoot = normalizePitchClass(rootName);
  const normNote = normalizePitchClass(noteName);

  const rootIndex = NOTE_CLASSES.indexOf(normRoot);
  const noteIndex = NOTE_CLASSES.indexOf(normNote);

  if (rootIndex === -1 || noteIndex === -1) {
    return INTERVAL_DEFINITIONS[0];
  }

  const semitones = (noteIndex - rootIndex + 12) % 12;
  return INTERVAL_DEFINITIONS[semitones];
}

/**
 * Given an array of active notes, infers the chord root if not provided
 */
export function inferChordRoot(activeNotes: string[]): string {
  if (!activeNotes || activeNotes.length === 0) return 'C';
  // Sort by pitch (octave + semitone) to find bass note
  const sorted = [...activeNotes].sort((a, b) => {
    const octA = parseInt(a.slice(-1), 10) || 4;
    const octB = parseInt(b.slice(-1), 10) || 4;
    if (octA !== octB) return octA - octB;
    const pitchA = normalizePitchClass(a);
    const pitchB = normalizePitchClass(b);
    return NOTE_CLASSES.indexOf(pitchA) - NOTE_CLASSES.indexOf(pitchB);
  });
  return normalizePitchClass(sorted[0]);
}

/**
 * Main key interval colors for the Legend bar
 */
export const INTERVAL_LEGEND_ITEMS = [
  { label: 'Fundamental (1)', hex: '#10b981', bg: 'bg-emerald-500', text: 'text-white' },
  { label: '3ª Tercera (m/M)', hex: '#2563eb', bg: 'bg-blue-600', text: 'text-white' },
  { label: '5ª Quinta (J/d)', hex: '#9333ea', bg: 'bg-purple-600', text: 'text-white' },
  { label: '7ª Séptima (m/M)', hex: '#f97316', bg: 'bg-orange-500', text: 'text-white' },
];
