export interface ScaleInfo {
  id: string;
  name: string;
  category: 'Mayor' | 'Menor' | 'Pentatónica' | 'Blues' | 'Moderna';
  formula: string; // e.g., "T - T - S - T - T - T - S"
  degreeNames: string[]; // e.g., ["Tónica", "2ª Mayor", "3ª Mayor", ...]
  intervals: number[]; // semitone offsets from root: e.g. [0, 2, 4, 5, 7, 9, 11, 12]
  description: string;
  mood: string;
  mnemonic: string;
  fingeringRightHand: number[]; // Standard fingering: 1=thumb, 2=index, 3=middle, 4=ring, 5=pinky
  fingeringLeftHand?: number[]; // Standard fingering left hand: 1=thumb to 5=pinky
  thumbPassStepIndex?: number; // Index after which thumb passes under (e.g., after 3rd note)
  thumbPassStepIndexLeftHand?: number; // Index after which middle finger crosses over thumb
}

export const FINGER_NAMES: Record<number, { name: string; en: string; description: string }> = {
  1: { name: 'Pulgar', en: 'Thumb', description: 'Pivote y soporte. Pasa con soltura por debajo de los dedos.' },
  2: { name: 'Índice', en: 'Index', description: 'Direccional y ágil, guía el movimiento.' },
  3: { name: 'Medio', en: 'Middle', description: 'Centro de gravedad y arco natural de la mano.' },
  4: { name: 'Anular', en: 'Ring', description: 'Comparte tendón extensor; tocar con peso de brazo sin tensión.' },
  5: { name: 'Meñique', en: 'Pinky', description: 'Borde externo, ancla la cúspide o el bajo de la escala.' }
};

export const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const ENHARMONIC_MAP: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#'
};

export const COMMON_SCALE_ROOTS = [
  { note: 'C', label: 'Do (C)', difficulty: 'Fácil (Teclas blancas)' },
  { note: 'G', label: 'Sol (G)', difficulty: '1 alteración (F#)' },
  { note: 'F', label: 'Fa (F)', difficulty: '1 alteración (Bb)' },
  { note: 'D', label: 'Re (D)', difficulty: '2 alteraciones (F#, C#)' },
  { note: 'A', label: 'La (A)', difficulty: '3 alteraciones (F#, C#, G#)' },
  { note: 'E', label: 'Mi (E)', difficulty: '4 alteraciones' },
];

export const SCALES_DATABASE: ScaleInfo[] = [
  {
    id: 'major',
    name: 'Mayor Diatónica',
    category: 'Mayor',
    formula: 'T - T - S - T - T - T - S',
    degreeNames: ['Tónica (I)', '2ª M (II)', '3ª M (III)', '4ª Justa (IV)', '5ª Justa (V)', '6ª M (VI)', '7ª M (VII)', 'Octava (VIII)'],
    intervals: [0, 2, 4, 5, 7, 9, 11, 12],
    description: 'La columna vertebral de la música occidental. Suena luminosa, abierta, alegre y afirmativa.',
    mood: 'Luminosa y Triunfal',
    mnemonic: 'Fórmula de oro: 2 Tonos, 1 Semitono, 3 Tonos, 1 Semitono.',
    fingeringRightHand: [1, 2, 3, 1, 2, 3, 4, 5],
    fingeringLeftHand: [5, 4, 3, 2, 1, 3, 2, 1],
    thumbPassStepIndex: 2, // After finger 3, thumb goes under to finger 1
    thumbPassStepIndexLeftHand: 4 // After thumb 1, finger 3 crosses over
  },
  {
    id: 'minor_natural',
    name: 'Menor Natural (Eólica)',
    category: 'Menor',
    formula: 'T - S - T - T - S - T - T',
    degreeNames: ['Tónica (I)', '2ª M (II)', '3ª m (III)', '4ª Justa (IV)', '5ª Justa (V)', '6ª m (VI)', '7ª m (VII)', 'Octava (VIII)'],
    intervals: [0, 2, 3, 5, 7, 8, 10, 12],
    description: 'La escala de la nostalgia, la melancolía y la introspección. Es la relativa menor de la escala mayor.',
    mood: 'Nostálgica y Profunda',
    mnemonic: 'La menor natural (A) usa exactamente las mismas teclas blancas que Do Mayor.',
    fingeringRightHand: [1, 2, 3, 1, 2, 3, 4, 5],
    fingeringLeftHand: [5, 4, 3, 2, 1, 3, 2, 1],
    thumbPassStepIndex: 2,
    thumbPassStepIndexLeftHand: 4
  },
  {
    id: 'major_pentatonic',
    name: 'Pentatónica Mayor',
    category: 'Pentatónica',
    formula: '1 - 2 - 3 - 5 - 6',
    degreeNames: ['Tónica (I)', '2ª M (II)', '3ª M (III)', '5ª Justa (V)', '6ª M (VI)', 'Octava (VIII)'],
    intervals: [0, 2, 4, 7, 9, 12],
    description: 'La reina de la improvisación. Al no tener semitonos (omite la 4ª y 7ª), ¡ninguna nota choca ni desafina jamás!',
    mood: 'Espontánea, Folclórica y Pura',
    mnemonic: 'Solo 5 notas mágicas. Tocá cualquier combinación sobre un acorde mayor y sonará impecable.',
    fingeringRightHand: [1, 2, 3, 1, 2, 3],
    fingeringLeftHand: [5, 4, 3, 2, 1, 1],
    thumbPassStepIndex: 2,
    thumbPassStepIndexLeftHand: 4
  },
  {
    id: 'minor_pentatonic',
    name: 'Pentatónica Menor',
    category: 'Pentatónica',
    formula: '1 - b3 - 4 - 5 - b7',
    degreeNames: ['Tónica (I)', '3ª m (bIII)', '4ª Justa (IV)', '5ª Justa (V)', '7ª m (bVII)', 'Octava (VIII)'],
    intervals: [0, 3, 5, 7, 10, 12],
    description: 'El ADN del Rock, Blues y R&B. Potente, directa y con una carga expresiva insustituible.',
    mood: 'Rockera, Firme y Expresiva',
    mnemonic: 'En La menor pentatónica: La, Do, Re, Mi, Sol, La. Los solos más legendarios de la historia nacieron acá.',
    fingeringRightHand: [1, 2, 3, 1, 2, 3],
    fingeringLeftHand: [5, 4, 3, 2, 1, 1],
    thumbPassStepIndex: 2,
    thumbPassStepIndexLeftHand: 4
  },
  {
    id: 'blues',
    name: 'Escala de Blues (Hexatónica)',
    category: 'Blues',
    formula: '1 - b3 - 4 - b5 - 5 - b7',
    degreeNames: ['Tónica (I)', '3ª m (bIII)', '4ª Justa (IV)', 'Blue Note (bV)', '5ª Justa (V)', '7ª m (bVII)', 'Octava (VIII)'],
    intervals: [0, 3, 5, 6, 7, 10, 12],
    description: 'Añade la "Blue Note" (la quinta disminuida) entre el 4º y 5º grado para un toque desgarrador e inconfundible.',
    mood: 'Bluesera, Desgarradora y Cálida',
    mnemonic: 'La Blue Note (ej. D# en La) es la sal y pimienta: tocala con gracia y deslice.',
    fingeringRightHand: [1, 2, 3, 4, 1, 2, 3],
    fingeringLeftHand: [5, 4, 3, 2, 1, 2, 1],
    thumbPassStepIndex: 3,
    thumbPassStepIndexLeftHand: 4
  },
  {
    id: 'minor_harmonic',
    name: 'Menor Armónica',
    category: 'Menor',
    formula: 'T - S - T - T - S - 1.5T - S',
    degreeNames: ['Tónica (I)', '2ª M (II)', '3ª m (III)', '4ª Justa (IV)', '5ª Justa (V)', '6ª m (VI)', 'Sensible (VII)', 'Octava (VIII)'],
    intervals: [0, 2, 3, 5, 7, 8, 11, 12],
    description: 'Eleva el 7º grado un semitono para crear tensión hacia la tónica. Tiene ese inconfundible sonido oriental y clásico.',
    mood: 'Dramática, Clásica y Exótica',
    mnemonic: 'El salto de 1.5 tonos entre el 6º y 7º grado le da el color árabe y barroco estilo Bach.',
    fingeringRightHand: [1, 2, 3, 1, 2, 3, 4, 5],
    fingeringLeftHand: [5, 4, 3, 2, 1, 3, 2, 1],
    thumbPassStepIndex: 2,
    thumbPassStepIndexLeftHand: 4
  },
  {
    id: 'minor_melodic',
    name: 'Menor Melódica (Bachiana)',
    category: 'Menor',
    formula: 'T - S - T - T - T - T - S',
    degreeNames: ['Tónica (I)', '2ª M (II)', '3ª m (III)', '4ª Justa (IV)', '5ª Justa (V)', '6ª M (VI)', 'Sensible (VII)', 'Octava (VIII)'],
    intervals: [0, 2, 3, 5, 7, 9, 11, 12],
    description: 'Eleva el 6º y 7º grado al ascender para suavizar el salto melódico de la menor armónica. Base esencial del repertorio clásico y del jazz moderno.',
    mood: 'Fluida, Jazzística y Sofisticada',
    mnemonic: 'Ascendente: 6º y 7º mayores para guiar la tensión hacia la tónica con máxima fluidez.',
    fingeringRightHand: [1, 2, 3, 1, 2, 3, 4, 5],
    fingeringLeftHand: [5, 4, 3, 2, 1, 3, 2, 1],
    thumbPassStepIndex: 2,
    thumbPassStepIndexLeftHand: 4
  }
];

/**
 * Calcula las notas absolutas (ej. ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'])
 * de una escala dada su raíz y definición.
 */
export function calculateScaleNotes(root: string, scale: ScaleInfo, baseOctave = 4): string[] {
  const normalizedRoot = CHROMATIC_NOTES.includes(root) ? root : (ENHARMONIC_MAP[root] || root);
  const rootIndex = CHROMATIC_NOTES.indexOf(normalizedRoot);
  if (rootIndex === -1) return [];

  // Adapt base octave if root is high to avoid clipping off piano range
  let startOctave = baseOctave;
  if (['G', 'G#', 'A', 'A#', 'B', 'Ab', 'Bb'].includes(root) && baseOctave >= 4) {
    startOctave = 3;
  }

  return scale.intervals.map(semitones => {
    const totalSemitones = rootIndex + semitones;
    const noteName = CHROMATIC_NOTES[totalSemitones % 12];
    const octave = startOctave + Math.floor(totalSemitones / 12);
    return `${noteName}${octave}`;
  });
}

// -------------------------------------------------------------
// TRÍADAS E INVERSIONES
// -------------------------------------------------------------

export interface InversionInfo {
  inversionIndex: 0 | 1 | 2;
  name: string;
  popularName: string;
  bassRole: 'Raíz / Fundamental' | '3ª del Acorde' | '5ª del Acorde';
  figuredBassSymbol: string; // e.g. "5/3", "6", "6/4"
  explanation: string;
  visualTrick: string;
  fingeringRightHand: string; // e.g. "1 - 3 - 5", "1 - 2 - 5", "1 - 3 - 5"
}

export const INVERSIONS_GUIDE: Record<0 | 1 | 2, InversionInfo> = {
  0: {
    inversionIndex: 0,
    name: 'Posición Fundamental',
    popularName: 'Estado Raíz',
    bassRole: 'Raíz / Fundamental',
    figuredBassSymbol: 'Fundamental (5/3)',
    explanation: 'El bajo es la nota que le da nombre al acorde. Las tres notas descansan sobre sus terceras naturales.',
    visualTrick: 'Las notas están equidistantes (a distancia de 3ª). Si están en el pentagrama, todas tocan líneas o todas tocan espacios.',
    fingeringRightHand: 'Pulgar (1) - Mayor (3) - Meñique (5)'
  },
  1: {
    inversionIndex: 1,
    name: 'Primera Inversión',
    popularName: 'Inversión de Sexta (6)',
    bassRole: '3ª del Acorde',
    figuredBassSymbol: 'Acorde de 6ª',
    explanation: 'La fundamental salta a la octava superior. Ahora la 3ª del acorde es la nota más grave (el bajo). Suena más fluida y menos estática.',
    visualTrick: 'El intervalo más ancho (la cuarta) queda ARRIBA. La nota del techo es la Fundamental.',
    fingeringRightHand: 'Pulgar (1) - Índice (2) - Meñique (5)'
  },
  2: {
    inversionIndex: 2,
    name: 'Segunda Inversión',
    popularName: 'Inversión de Cuarta y Sexta (6/4)',
    bassRole: '5ª del Acorde',
    figuredBassSymbol: 'Acorde de 6/4',
    explanation: 'Tanto la fundamental como la 3ª suben una octava. La 5ª del acorde se convierte en el bajo. Es la más inestable y necesita resolver.',
    visualTrick: 'El intervalo más ancho (la cuarta) queda ABAJO. La nota del medio es la Fundamental.',
    fingeringRightHand: 'Pulgar (1) - Mayor (3) - Meñique (5)'
  }
};

export interface TriadQuality {
  id: 'Major' | 'Minor' | 'Diminished' | 'Augmented';
  name: string;
  symbol: string;
  semitoneIntervals: [number, number, number]; // e.g. [0, 4, 7]
  description: string;
}

export const TRIAD_QUALITIES: TriadQuality[] = [
  {
    id: 'Major',
    name: 'Mayor',
    symbol: '',
    semitoneIntervals: [0, 4, 7],
    description: '3ª Mayor (4 semitonos) + 5ª Justa (7 semitonos). Radiante y sólida.'
  },
  {
    id: 'Minor',
    name: 'Menor',
    symbol: 'm',
    semitoneIntervals: [0, 3, 7],
    description: '3ª Menor (3 semitonos) + 5ª Justa (7 semitonos). Íntima y melancólica.'
  },
  {
    id: 'Diminished',
    name: 'Disminuida',
    symbol: 'dim',
    semitoneIntervals: [0, 3, 6],
    description: 'Dos terceras menores apiladas. Tensión dramática y suspenso.'
  },
  {
    id: 'Augmented',
    name: 'Aumentada',
    symbol: 'aug',
    semitoneIntervals: [0, 4, 8],
    description: 'Dos terceras mayores apiladas. Sensación de flotación y ensoñación.'
  }
];

/**
 * Calcula las 3 notas de una tríada en cualquiera de sus 3 inversiones
 */
export function calculateTriadInversion(
  root: string,
  qualityId: 'Major' | 'Minor' | 'Diminished' | 'Augmented' = 'Major',
  inversion: 0 | 1 | 2 = 0,
  baseOctave = 4
): {
  keys: string[];
  bassNote: string;
  rootNote: string;
  thirdNote: string;
  fifthNote: string;
  chordName: string;
} {
  const rootIndex = CHROMATIC_NOTES.indexOf(root);
  const quality = TRIAD_QUALITIES.find(q => q.id === qualityId) || TRIAD_QUALITIES[0];

  let startOctave = baseOctave;
  if (['G', 'G#', 'A', 'A#', 'B'].includes(root) && baseOctave >= 4) {
    startOctave = 3;
  }

  // Raw intervals from root: [0, 4, 7]
  const intervals = [...quality.semitoneIntervals];

  // Rotate intervals according to inversion
  const notesMetadata = [
    { role: 'root', originalInterval: intervals[0] },
    { role: 'third', originalInterval: intervals[1] },
    { role: 'fifth', originalInterval: intervals[2] },
  ];

  for (let i = 0; i < inversion; i++) {
    const moved = notesMetadata.shift()!;
    notesMetadata.push({
      role: moved.role,
      originalInterval: moved.originalInterval + 12
    });
  }

  const keys = notesMetadata.map(item => {
    const totalSemitones = rootIndex + item.originalInterval;
    const noteName = CHROMATIC_NOTES[totalSemitones % 12];
    const octave = startOctave + Math.floor(totalSemitones / 12);
    return `${noteName}${octave}`;
  });

  const bassNote = keys[0];
  const rootNote = keys[notesMetadata.findIndex(m => m.role === 'root')];
  const thirdNote = keys[notesMetadata.findIndex(m => m.role === 'third')];
  const fifthNote = keys[notesMetadata.findIndex(m => m.role === 'fifth')];

  const inversionSuffix = inversion === 0 ? '' : inversion === 1 ? ' (1ª Inv)' : ' (2ª Inv)';
  const chordName = `${root}${quality.symbol}${inversionSuffix}`;

  return {
    keys,
    bassNote,
    rootNote,
    thirdNote,
    fifthNote,
    chordName
  };
}

/**
 * Helper para verificar si las notas tocadas por el usuario
 * corresponden a una tríada y si el bajo (la nota más grave) coincide con la inversión pedida.
 */
export function validateTriadInversionSubmission(
  userPlayedNotes: string[],
  targetKeys: string[],
  requiredBassPitch: string
): {
  isExactMatch: boolean;
  notesMatch: boolean;
  bassMatches: boolean;
  userBass: string | null;
  feedbackMessage: string;
} {
  if (userPlayedNotes.length === 0) {
    return {
      isExactMatch: false,
      notesMatch: false,
      bassMatches: false,
      userBass: null,
      feedbackMessage: 'Tocá las 3 notas en el teclado para comprobar.'
    };
  }

  // Parse note frequencies / order to find lowest note
  const noteToPitchValue = (note: string) => {
    const name = note.slice(0, -1);
    const octave = parseInt(note.slice(-1), 10);
    return octave * 12 + CHROMATIC_NOTES.indexOf(name);
  };

  const sortedUserNotes = [...userPlayedNotes].sort((a, b) => noteToPitchValue(a) - noteToPitchValue(b));
  const userBass = sortedUserNotes[0];

  const userBaseNames = userPlayedNotes.map(n => n.slice(0, -1));
  const targetBaseNames = targetKeys.map(n => n.slice(0, -1));

  const notesMatch = targetBaseNames.every(name => userBaseNames.includes(name)) &&
                     userBaseNames.length >= 3;

  const bassPitchMatches = userBass.slice(0, -1) === requiredBassPitch.slice(0, -1);
  const isExactMatch = notesMatch && bassPitchMatches;

  let feedbackMessage = '';
  if (isExactMatch) {
    feedbackMessage = '¡Impecable che! Notas y bajo en perfecta armonía.';
  } else if (notesMatch && !bassPitchMatches) {
    feedbackMessage = `Pusiste las notas correctas pero con ${userBass.slice(0, -1)} en el bajo. Para esta inversión, la nota más grave debe ser ${requiredBassPitch.slice(0, -1)}.`;
  } else {
    feedbackMessage = 'Revisá las notas del acorde. Tocá despacio y escuchá la resonancia.';
  }

  return {
    isExactMatch,
    notesMatch,
    bassMatches: bassPitchMatches,
    userBass,
    feedbackMessage
  };
}

// -------------------------------------------------------------
// ENTRENAMIENTO AUDITIVO: INTERVALOS Y TRÍADAS
// -------------------------------------------------------------

export interface IntervalTheoryInfo {
  id: string;
  name: string;
  shortName: string;
  semitones: number;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzado';
  famousSong: string;
  moodDescription: string;
  ratioColor: string;
}

export const INTERVALS_DATABASE: IntervalTheoryInfo[] = [
  {
    id: 'm2',
    name: 'Segunda Menor',
    shortName: '2ª Menor',
    semitones: 1,
    difficulty: 'Intermedio',
    famousSong: 'Tiburón (Jaws) / Para Elisa',
    moodDescription: 'Disonancia punzante y suspenso máximo. Las dos teclas están pegaditas.',
    ratioColor: 'text-rose-400'
  },
  {
    id: 'M2',
    name: 'Segunda Mayor',
    shortName: '2ª Mayor',
    semitones: 2,
    difficulty: 'Principiante',
    famousSong: 'Cumpleaños Feliz / Frère Jacques',
    moodDescription: 'Paso melódico natural a distancia de 1 tono completo (2 teclas).',
    ratioColor: 'text-amber-400'
  },
  {
    id: 'm3',
    name: 'Tercera Menor',
    shortName: '3ª Menor',
    semitones: 3,
    difficulty: 'Principiante',
    famousSong: 'Greensleeves / Canción de Cuna (Brahms)',
    moodDescription: 'Sonido melancólico y dulce. El corazón de los acordes menores y del blues.',
    ratioColor: 'text-sky-400'
  },
  {
    id: 'M3',
    name: 'Tercera Mayor',
    shortName: '3ª Mayor',
    semitones: 4,
    difficulty: 'Principiante',
    famousSong: 'Oh When The Saints / Primavera (Vivaldi)',
    moodDescription: 'Luminosa, alegre y afirmativa. El pilar de las canciones festivas y acordes mayores.',
    ratioColor: 'text-emerald-400'
  },
  {
    id: 'P4',
    name: 'Cuarta Justa',
    shortName: '4ª Justa',
    semitones: 5,
    difficulty: 'Intermedio',
    famousSong: 'Himno Nacional / Marcha Nupcial',
    moodDescription: 'Carácter solemne, heráldico y ceremonial. Muy estable y abierta.',
    ratioColor: 'text-teal-400'
  },
  {
    id: 'TT',
    name: 'Tritono (4ª Aum / 5ª Dism)',
    shortName: 'Tritono (b5)',
    semitones: 6,
    difficulty: 'Avanzado',
    famousSong: 'Los Simpsons / Maria (West Side Story)',
    moodDescription: 'El "Diabolus in Musica" medieval. Divide la octava en dos mitades exactas con tensión extrema.',
    ratioColor: 'text-purple-400'
  },
  {
    id: 'P5',
    name: 'Quinta Justa',
    shortName: '5ª Justa',
    semitones: 7,
    difficulty: 'Principiante',
    famousSong: 'Star Wars (Tema principal) / Twinkle Twinkle',
    moodDescription: 'Pura consonancia acústica. Sonido heroico, majestuoso, firme y abierto.',
    ratioColor: 'text-blue-400'
  },
  {
    id: 'm6',
    name: 'Sexta Menor',
    shortName: '6ª Menor',
    semitones: 8,
    difficulty: 'Avanzado',
    famousSong: 'Love Story / The Entertainer (puente)',
    moodDescription: 'Romántica y profundamente nostálgica. Llena de anhelo expresivo.',
    ratioColor: 'text-pink-400'
  },
  {
    id: 'M6',
    name: 'Sexta Mayor',
    shortName: '6ª Mayor',
    semitones: 9,
    difficulty: 'Intermedio',
    famousSong: 'My Bonnie Lies Over The Ocean / Jingle Bells',
    moodDescription: 'Cálida, folclórica y cantable. Muy agradable y reconfortante al oído.',
    ratioColor: 'text-orange-400'
  },
  {
    id: 'm7',
    name: 'Séptima Menor',
    shortName: '7ª Menor',
    semitones: 10,
    difficulty: 'Intermedio',
    famousSong: 'Star Trek (Tema clásico) / The Winner Takes It All',
    moodDescription: 'Tensión flotante, base de los acordes dominantes y del Soul / R&B.',
    ratioColor: 'text-indigo-400'
  },
  {
    id: 'M7',
    name: 'Séptima Mayor',
    shortName: '7ª Mayor',
    semitones: 11,
    difficulty: 'Avanzado',
    famousSong: 'Take On Me (subida) / Pure Imagination',
    moodDescription: 'Disonancia etérea de ensueño; a un solo semitono de tocar la octava.',
    ratioColor: 'text-fuchsia-400'
  },
  {
    id: 'P8',
    name: 'Octava Justa',
    shortName: 'Octava (8ª)',
    semitones: 12,
    difficulty: 'Principiante',
    famousSong: 'Somewhere Over The Rainbow / Singin\' in the Rain',
    moodDescription: 'La misma nota en un registro más agudo. Sensación de vuelo y plenitud armónica.',
    ratioColor: 'text-cyan-400'
  }
];

export interface EarTrainingTriadChallenge {
  root: string;
  quality: 'Major' | 'Minor' | 'Diminished' | 'Augmented';
  notes: string[];
  qualityInfo: TriadQuality;
}

/**
 * Genera un intervalo aleatorio según el nivel de dificultad
 */
export function generateRandomIntervalChallenge(difficulty: 'Principiante' | 'Intermedio' | 'Avanzado'): {
  interval: IntervalTheoryInfo;
  rootNote: string;
  targetNote: string;
  semitones: number;
} {
  let pool = INTERVALS_DATABASE.filter(i => i.difficulty === 'Principiante');
  if (difficulty === 'Intermedio') {
    pool = INTERVALS_DATABASE.filter(i => i.difficulty === 'Principiante' || i.difficulty === 'Intermedio');
  } else if (difficulty === 'Avanzado') {
    pool = INTERVALS_DATABASE;
  }

  const chosenInterval = pool[Math.floor(Math.random() * pool.length)];

  // Pick root between C3 and F4 so target fits comfortably in standard piano
  const candidateRoots = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'];
  const rootNote = candidateRoots[Math.floor(Math.random() * candidateRoots.length)];

  const rootPitch = rootNote.slice(0, -1);
  const rootOctave = parseInt(rootNote.slice(-1), 10);
  const rootChromaticIndex = CHROMATIC_NOTES.indexOf(rootPitch);

  const totalSemitones = rootChromaticIndex + chosenInterval.semitones;
  const targetPitch = CHROMATIC_NOTES[totalSemitones % 12];
  const targetOctave = rootOctave + Math.floor(totalSemitones / 12);
  const targetNote = `${targetPitch}${targetOctave}`;

  return {
    interval: chosenInterval,
    rootNote,
    targetNote,
    semitones: chosenInterval.semitones
  };
}

/**
 * Genera un desafío de tríada aleatoria para entrenamiento auditivo
 */
export function generateRandomTriadChallenge(difficulty: 'Principiante' | 'Intermedio' | 'Avanzado'): EarTrainingTriadChallenge {
  let allowedQualities: Array<'Major' | 'Minor' | 'Diminished' | 'Augmented'> = ['Major', 'Minor'];
  if (difficulty === 'Intermedio') {
    allowedQualities = ['Major', 'Minor', 'Diminished'];
  } else if (difficulty === 'Avanzado') {
    allowedQualities = ['Major', 'Minor', 'Diminished', 'Augmented'];
  }

  const qualityId = allowedQualities[Math.floor(Math.random() * allowedQualities.length)];
  const qualityInfo = TRIAD_QUALITIES.find(q => q.id === qualityId) || TRIAD_QUALITIES[0];

  const candidateRoots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const root = candidateRoots[Math.floor(Math.random() * candidateRoots.length)];

  // Triad notes in root position around octave 4 (or 3 for high roots)
  const baseOctave = ['G', 'A', 'B'].includes(root) ? 3 : 4;
  const rootIndex = CHROMATIC_NOTES.indexOf(root);

  const notes = qualityInfo.semitoneIntervals.map(semi => {
    const total = rootIndex + semi;
    const p = CHROMATIC_NOTES[total % 12];
    const oct = baseOctave + Math.floor(total / 12);
    return `${p}${oct}`;
  });

  return {
    root,
    quality: qualityId,
    notes,
    qualityInfo
  };
}
