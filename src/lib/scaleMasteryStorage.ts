export type ScaleCategory = 'major' | 'minor_harmonic' | 'minor_melodic';
export type ScaleMasteryStatus = 'mastered' | 'in_progress' | 'pending';

export interface ScaleTonalityInfo {
  root: string;           // e.g. "C", "G", "D", "F#"
  rootEs: string;         // e.g. "Do", "Sol", "Re", "Fa#"
  accidentals: string;    // e.g. "0 alteraciones", "1 sostenido (Fa#)", "2 bemoles (Sib, Mib)"
  keySignatureCount: number; // e.g. 0, +1, +2, -1, -2
  keySignatureType: 'natural' | 'sharp' | 'flat';
  relativeMinor: string;  // e.g. "La menor (Am)"
  relativeMajor: string;  // e.g. "Do Mayor (C)"
  circleOrder: number;    // 0 to 11 in circle of fifths
}

export interface ScaleMasteryEntry {
  scaleId: string;        // e.g. "C_major", "A_minor_harmonic", "D_minor_melodic"
  root: string;           // "C"
  category: ScaleCategory;// "major" | "minor_harmonic" | "minor_melodic"
  status: ScaleMasteryStatus;
  bpm: number;            // Tempo achieved (e.g. 60, 80, 100, 120, 144 BPM)
  handsTogether: boolean; // Both hands mastered?
  accuracy: number;       // Accuracy % (0 - 100)
  masteredAt?: string;    // ISO date string
  lastPracticedAt?: string;
  notesCount: number;
}

export const SCALE_CATEGORIES_CONFIG: Record<ScaleCategory, {
  id: ScaleCategory;
  nameEs: string;
  shortName: string;
  formula: string;
  intervals: number[];
  description: string;
  color: string;
  badgeBg: string;
}> = {
  major: {
    id: 'major',
    nameEs: 'Escala Mayor Diatónica',
    shortName: 'Mayor',
    formula: 'T - T - S - T - T - T - S',
    intervals: [0, 2, 4, 5, 7, 9, 11, 12],
    description: 'La piedra angular de la armonía tonal. Claridad, brillantez y resolución afirmativa.',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
  },
  minor_harmonic: {
    id: 'minor_harmonic',
    nameEs: 'Escala Menor Armónica',
    shortName: 'Menor Armónica',
    formula: 'T - S - T - T - S - 1.5T - S',
    intervals: [0, 2, 3, 5, 7, 8, 11, 12],
    description: 'Con el 7º grado elevado (sensible) que genera tensión hacia la tónica y un color dramático exótico.',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-400/20 text-rose-300 border-rose-400/40',
  },
  minor_melodic: {
    id: 'minor_melodic',
    nameEs: 'Escala Menor Melódica (Bachiana)',
    shortName: 'Menor Melódica',
    formula: 'T - S - T - T - T - T - S',
    intervals: [0, 2, 3, 5, 7, 9, 11, 12],
    description: 'Eleva el 6º y 7º grado al ascender para suavizar el intervalo de 2ª aumentada. Imprescindible en Bach y Jazz.',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40',
  },
};

export const TONALITIES_DATABASE: ScaleTonalityInfo[] = [
  { root: 'C', rootEs: 'Do', accidentals: 'Sin alteraciones (Teclas blancas)', keySignatureCount: 0, keySignatureType: 'natural', relativeMinor: 'La menor (Am)', relativeMajor: 'Do Mayor', circleOrder: 0 },
  { root: 'G', rootEs: 'Sol', accidentals: '1 sostenido (Fa#)', keySignatureCount: 1, keySignatureType: 'sharp', relativeMinor: 'Mi menor (Em)', relativeMajor: 'Sol Mayor', circleOrder: 1 },
  { root: 'D', rootEs: 'Re', accidentals: '2 sostenidos (Fa#, Do#)', keySignatureCount: 2, keySignatureType: 'sharp', relativeMinor: 'Si menor (Bm)', relativeMajor: 'Re Mayor', circleOrder: 2 },
  { root: 'A', rootEs: 'La', accidentals: '3 sostenidos (Fa#, Do#, Sol#)', keySignatureCount: 3, keySignatureType: 'sharp', relativeMinor: 'Fa# menor (F#m)', relativeMajor: 'La Mayor', circleOrder: 3 },
  { root: 'E', rootEs: 'Mi', accidentals: '4 sostenidos (Fa#, Do#, Sol#, Re#)', keySignatureCount: 4, keySignatureType: 'sharp', relativeMinor: 'Do# menor (C#m)', relativeMajor: 'Mi Mayor', circleOrder: 4 },
  { root: 'B', rootEs: 'Si', accidentals: '5 sostenidos (Fa#, Do#, Sol#, Re#, La#)', keySignatureCount: 5, keySignatureType: 'sharp', relativeMinor: 'Sol# menor (G#m)', relativeMajor: 'Si Mayor', circleOrder: 5 },
  { root: 'F#', rootEs: 'Fa#', accidentals: '6 sostenidos (Fa#, Do#, Sol#, Re#, La#, Mi#)', keySignatureCount: 6, keySignatureType: 'sharp', relativeMinor: 'Re# menor (D#m)', relativeMajor: 'Fa# Mayor', circleOrder: 6 },
  { root: 'Db', rootEs: 'Reb', accidentals: '5 bemoles (Sib, Mib, Lab, Reb, Solb)', keySignatureCount: -5, keySignatureType: 'flat', relativeMinor: 'Sib menor (Bbm)', relativeMajor: 'Reb Mayor', circleOrder: 7 },
  { root: 'Ab', rootEs: 'Lab', accidentals: '4 bemoles (Sib, Mib, Lab, Reb)', keySignatureCount: -4, keySignatureType: 'flat', relativeMinor: 'Fa menor (Fm)', relativeMajor: 'Lab Mayor', circleOrder: 8 },
  { root: 'Eb', rootEs: 'Mib', accidentals: '3 bemoles (Sib, Mib, Lab)', keySignatureCount: -3, keySignatureType: 'flat', relativeMinor: 'Do menor (Cm)', relativeMajor: 'Mib Mayor', circleOrder: 9 },
  { root: 'Bb', rootEs: 'Sib', accidentals: '2 bemoles (Sib, Mib)', keySignatureCount: -2, keySignatureType: 'flat', relativeMinor: 'Sol menor (Gm)', relativeMajor: 'Sib Mayor', circleOrder: 10 },
  { root: 'F', rootEs: 'Fa', accidentals: '1 bemol (Sib)', keySignatureCount: -1, keySignatureType: 'flat', relativeMinor: 'Re menor (Dm)', relativeMajor: 'Fa Mayor', circleOrder: 11 },
];

const STORAGE_KEY = 'pianomaster_scale_mastery_v1';

// Initial default seed so the user sees some mastery progress initially (C Major, G Major, A Minor Harmonic)
const INITIAL_DEFAULT_ENTRIES: Record<string, Partial<ScaleMasteryEntry>> = {
  'C_major': { status: 'mastered', bpm: 120, accuracy: 100, handsTogether: true, masteredAt: '2026-08-15' },
  'G_major': { status: 'mastered', bpm: 108, accuracy: 98, handsTogether: true, masteredAt: '2026-08-20' },
  'F_major': { status: 'in_progress', bpm: 84, accuracy: 92, handsTogether: false },
  'D_major': { status: 'in_progress', bpm: 92, accuracy: 94, handsTogether: true },
  'A_minor_harmonic': { status: 'mastered', bpm: 100, accuracy: 96, handsTogether: true, masteredAt: '2026-08-28' },
  'E_minor_harmonic': { status: 'in_progress', bpm: 80, accuracy: 90, handsTogether: false },
  'D_minor_harmonic': { status: 'in_progress', bpm: 84, accuracy: 91, handsTogether: false },
  'A_minor_melodic': { status: 'mastered', bpm: 96, accuracy: 95, handsTogether: true, masteredAt: '2026-09-02' },
  'C_minor_melodic': { status: 'in_progress', bpm: 72, accuracy: 88, handsTogether: false },
};

export function getScaleMasteryKey(root: string, category: ScaleCategory): string {
  return `${root}_${category}`;
}

export function loadScaleMasteryData(): Record<string, ScaleMasteryEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not load scale mastery from localStorage', err);
  }

  // Generate full initial 36 scales mapping
  const initial: Record<string, ScaleMasteryEntry> = {};
  const categories: ScaleCategory[] = ['major', 'minor_harmonic', 'minor_melodic'];

  TONALITIES_DATABASE.forEach(tonality => {
    categories.forEach(category => {
      const scaleId = getScaleMasteryKey(tonality.root, category);
      const seed = INITIAL_DEFAULT_ENTRIES[scaleId];
      initial[scaleId] = {
        scaleId,
        root: tonality.root,
        category,
        status: seed?.status || 'pending',
        bpm: seed?.bpm || 60,
        handsTogether: seed?.handsTogether || false,
        accuracy: seed?.accuracy || 0,
        masteredAt: seed?.masteredAt,
        notesCount: 8,
      };
    });
  });

  saveScaleMasteryData(initial);
  return initial;
}

export function saveScaleMasteryData(data: Record<string, ScaleMasteryEntry>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Could not save scale mastery to localStorage', err);
  }
}

export function updateScaleMasteryStatus(
  scaleId: string,
  newStatus: ScaleMasteryStatus,
  options?: { bpm?: number; accuracy?: number; handsTogether?: boolean }
): Record<string, ScaleMasteryEntry> {
  const current = loadScaleMasteryData();
  const existing = current[scaleId];

  if (existing) {
    current[scaleId] = {
      ...existing,
      status: newStatus,
      bpm: options?.bpm ?? existing.bpm,
      accuracy: options?.accuracy ?? (newStatus === 'mastered' ? 100 : existing.accuracy),
      handsTogether: options?.handsTogether ?? existing.handsTogether,
      masteredAt: newStatus === 'mastered' ? (existing.masteredAt || new Date().toISOString().split('T')[0]) : undefined,
      lastPracticedAt: new Date().toISOString(),
    };
    saveScaleMasteryData(current);
  }

  return current;
}

export function resetAllScaleMastery(): Record<string, ScaleMasteryEntry> {
  const blank: Record<string, ScaleMasteryEntry> = {};
  const categories: ScaleCategory[] = ['major', 'minor_harmonic', 'minor_melodic'];

  TONALITIES_DATABASE.forEach(tonality => {
    categories.forEach(category => {
      const scaleId = getScaleMasteryKey(tonality.root, category);
      blank[scaleId] = {
        scaleId,
        root: tonality.root,
        category,
        status: 'pending',
        bpm: 60,
        handsTogether: false,
        accuracy: 0,
        notesCount: 8,
      };
    });
  });

  saveScaleMasteryData(blank);
  return blank;
}

export interface ScaleMasteryStats {
  totalCount: number;
  masteredCount: number;
  inProgressCount: number;
  pendingCount: number;
  masteredPercentage: number;
  byCategory: Record<ScaleCategory, {
    total: number;
    mastered: number;
    inProgress: number;
    pending: number;
    percentage: number;
  }>;
}

export function computeScaleMasteryStats(data: Record<string, ScaleMasteryEntry>): ScaleMasteryStats {
  const categories: ScaleCategory[] = ['major', 'minor_harmonic', 'minor_melodic'];
  
  const byCategory: ScaleMasteryStats['byCategory'] = {
    major: { total: 0, mastered: 0, inProgress: 0, pending: 0, percentage: 0 },
    minor_harmonic: { total: 0, mastered: 0, inProgress: 0, pending: 0, percentage: 0 },
    minor_melodic: { total: 0, mastered: 0, inProgress: 0, pending: 0, percentage: 0 },
  };

  let totalCount = 0;
  let masteredCount = 0;
  let inProgressCount = 0;
  let pendingCount = 0;

  Object.values(data).forEach(entry => {
    if (!byCategory[entry.category]) return;
    
    totalCount++;
    byCategory[entry.category].total++;

    if (entry.status === 'mastered') {
      masteredCount++;
      byCategory[entry.category].mastered++;
    } else if (entry.status === 'in_progress') {
      inProgressCount++;
      byCategory[entry.category].inProgress++;
    } else {
      pendingCount++;
      byCategory[entry.category].pending++;
    }
  });

  categories.forEach(cat => {
    const c = byCategory[cat];
    c.percentage = c.total > 0 ? Math.round((c.mastered / c.total) * 100) : 0;
  });

  const masteredPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  return {
    totalCount,
    masteredCount,
    inProgressCount,
    pendingCount,
    masteredPercentage,
    byCategory,
  };
}
