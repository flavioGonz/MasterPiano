export interface ChordInfo {
  name: string;
  root: string;
  type: string;
  keys: string[];
}

export const CHORD_TYPES = [
  'Major', 'Minor', 'Diminished', 'Augmented', 'Sus2', 'Sus4', 
  '7Sus2', '7Sus4', '6th', '7th', '9th', 'Major 7th', 
  'Major 9th', 'Major 11th', 'Minor 6th', 'Minor 7th', 
  'Minor 9th', 'Minor 11th'
];

export const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const getChordKeys = (root: string, type: string, inversion: number = 0): string[] => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIdx = notes.indexOf(root);
  
  const intervals: Record<string, number[]> = {
    'Major': [0, 4, 7],
    'Minor': [0, 3, 7],
    'Diminished': [0, 3, 6],
    'Augmented': [0, 4, 8],
    'Sus2': [0, 2, 7],
    'Sus4': [0, 5, 7],
    '7Sus2': [0, 2, 7, 10],
    '7Sus4': [0, 5, 7, 10],
    '6th': [0, 4, 7, 9],
    '7th': [0, 4, 7, 10],
    '9th': [0, 4, 7, 10, 14],
    'Major 7th': [0, 4, 7, 11],
    'Major 9th': [0, 4, 7, 11, 14],
    'Major 11th': [0, 4, 7, 11, 14, 17],
    'Minor 6th': [0, 3, 7, 9],
    'Minor 7th': [0, 3, 7, 10],
    'Minor 9th': [0, 3, 7, 10, 14],
    'Minor 11th': [0, 3, 7, 10, 14, 17],
  };

  const relIntervals = [...(intervals[type] || [0, 4, 7])];
  
  for (let i = 0; i < inversion; i++) {
    if (relIntervals.length > 0) {
      const first = relIntervals.shift()!;
      relIntervals.push(first + 12);
    }
  }

  return relIntervals.map(interval => {
    const idx = (rootIdx + interval) % 12;
    const octave = Math.floor((rootIdx + interval) / 12) + 4;
    return `${notes[idx]}${octave}`;
  });
};

export interface TheoryQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PracticalTask {
  instruction: string;
  requiredSequence: string[];
  mode: 'sequence' | 'chord';
  hint: string;
}

export interface LessonEvaluation {
  theoreticalQuestions: TheoryQuestion[];
  practicalTask: PracticalTask;
}

/** Enganche opcional de una lección con un gimnasio de práctica. */
export interface LessonPractice {
  gym: 'scales' | 'classicalMethods' | 'circleSequence' | 'waterfall' | 'inversions' | 'arpeggios' | 'speed' | 'earTraining' | 'chords' | 'sightReading';
  label: string;
  hint: string;
}

export interface Lesson {
  id: string;
  number: number;
  moduleNumber: number;
  moduleTitle: string;
  progressPercent: number;
  title: string;
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
  description: string;
  demonstrationNotes: string[];
  fingerGuide?: Record<string, number>;
  targetKeys: string[];
  image: string;
  /** Qué buscar en YouTube para esta lección. La elección concreta la hace el
   *  servidor y queda cacheada: cablear ids acá los deja podrir en silencio. */
  videoQuery?: string;
  /** Video elegido a mano, cuando hay uno que vale la pena fijar. No reemplaza
   *  a `videoQuery`: si el video desapareció, el servidor vuelve a buscar. */
  videoId?: string;
  /** Lleva al gimnasio donde se entrena lo que enseña la lección. */
  practice?: LessonPractice;
}

export interface UserProgress {
  completedLessons: string[];
  unlockedLessons: string[];
  lessonScores: Record<string, number>;
  userLevel: 'Principiante' | 'Intermedio' | 'Avanzado';
  xp: number;
  streak: number;
  notesPlayedCount: number;
}

export const DEFAULT_USER_PROGRESS: UserProgress = {
  completedLessons: [],
  unlockedLessons: ['1'],
  lessonScores: {},
  userLevel: 'Principiante',
  xp: 0,
  streak: 1,
  notesPlayedCount: 0,
};

export const LESSONS: Lesson[] = [
  // MÓDULO 1: Fundamentos Absolutos (0% - 20%)
  {
    id: '1',
    number: 1,
    moduleNumber: 1,
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 9%)',
    progressPercent: 2,
    title: '1. El Mapa del Piano y el Secreto del DO',
    level: 'Principiante',
    description: 'Aprende a ubicar todas las notas sin memorizar a ciegas usando los grupos de teclas negras.',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'tutorial piano como ubicar las notas grupos de dos y tres teclas negras principiantes',
    demonstrationNotes: ['C3', 'C4', 'C5'],
    targetKeys: ['C3', 'C4', 'C5'],
    practice: { gym: 'waterfall', label: 'Ubicar el Do en la Catarata', hint: 'Las notas caen y las buscás en el teclado: es el mapa del piano en movimiento' },
  },
  {
    id: '2',
    number: 2,
    moduleNumber: 1,
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 9%)',
    progressPercent: 4,
    title: '2. Postura Biomecánica y Numeración de Dedos',
    level: 'Principiante',
    description: 'Protege tus tendones, adopta la postura del concertista y domina la numeración 1 al 5.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'postura correcta al piano y numeracion de los dedos del 1 al 5 tutorial',
    demonstrationNotes: ['C4', 'D4', 'E4', 'F4', 'G4'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'E4': 3, 'F4': 4, 'G4': 5 },
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4'],
    practice: { gym: 'classicalMethods', label: 'Hanon nº 1 en Métodos Clásicos', hint: 'Cinco dedos, mano quieta y peso de brazo: para eso se escribió' },
  },
  {
    id: '2b',
    number: 3,
    moduleNumber: 1,
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 9%)',
    progressPercent: 7,
    title: '3. Independencia de dedos: que el 4 deje de arrastrar al 3',
    level: 'Principiante',
    description: 'Por qué el anular parece atado al del medio, y los tres ejercicios que lo sueltan.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'ejercicios de independencia de dedos piano dedos mas rapidos y agiles',
    videoId: '45XxLsmZjP4',
    demonstrationNotes: ['C4', 'D4', 'E4', 'F4', 'G4'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'E4': 3, 'F4': 4, 'G4': 5 },
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4'],
    practice: { gym: 'classicalMethods', label: 'Métodos Clásicos', hint: 'Los primeros Hanon son exactamente esto, con la mano en movimiento' },
  },
  {
    id: '3',
    number: 4,
    moduleNumber: 1,
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 9%)',
    progressPercent: 9,
    title: '4. Pulso, Ritmo y Compás de 4/4',
    level: 'Principiante',
    description: 'El latido del corazón de la música. Domina las figuras rítmicas y el metrónomo.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'ritmo y compas de 4/4 para piano principiantes con metronomo clase',
    demonstrationNotes: ['C4', 'E4', 'G4', 'C5'],
    targetKeys: ['C4', 'E4', 'G4', 'C5'],
    practice: { gym: 'waterfall', label: 'Tocar a tiempo en la Catarata', hint: 'Prendé el metrónomo y usá el modo Flujo para no perder el pulso' },
  },

  // MÓDULO 2: Escalas, Intervalos y Lectura (20% - 40%)
  {
    id: '4',
    number: 5,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 11,
    title: '5. Tonos y Semitonos: El ADN de las Escalas',
    level: 'Principiante',
    description: 'Aprende a medir distancias en el piano y descubre la fórmula secreta de las escalas mayores.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'tonos y semitonos en el piano explicacion facil teoria musical',
    demonstrationNotes: ['C4', 'D4', 'E4', 'F4'],
    targetKeys: ['C4', 'D4', 'E4', 'F4'],
    practice: { gym: 'scales', label: 'Fórmula T–S en el Gimnasio de Escalas', hint: 'El modo que muestra la cadena de tonos y semitonos grado por grado' },
  },
  {
    id: '4b',
    number: 6,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 13,
    title: '6. Intervalos: el número y la calidad',
    level: 'Principiante',
    description: 'Medir cualquier distancia entre dos notas y reconocerla de oído con canciones que ya conocés.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'intervalos musicales en piano numero y calidad ejemplos canciones',
    demonstrationNotes: ['C4', 'D4', 'C4', 'E4', 'C4', 'F4', 'C4', 'G4'],
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    practice: { gym: 'earTraining', label: 'Oído: Intervalos y Tríadas', hint: 'Primero adivinás el número, después la calidad: son dos preguntas distintas' },
  },
  {
    id: '5',
    number: 7,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 16,
    title: '7. La Escala de Do Mayor y el Paso del Pulgar',
    level: 'Principiante',
    description: 'Domina la técnica legendaria del cruce del pulgar para tocar líneas melódicas continuas.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'escala de do mayor en piano digitacion y paso del pulgar tutorial',
    demonstrationNotes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'E4': 3, 'F4': 1, 'G4': 2, 'A4': 3, 'B4': 4, 'C5': 5 },
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    practice: { gym: 'scales', label: 'Do mayor en el Gimnasio de Escalas', hint: 'Camino de notas con los números de dedo sobre las teclas' },
  },
  {
    id: '5b',
    number: 8,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 18,
    title: '8. Las 5 familias de digitación: 12 escalas, 5 formas de mano',
    level: 'Principiante',
    description: 'Dejá de memorizar doce escalas sueltas: son cinco formas de mano que se repiten.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'digitacion de las escalas mayores en piano truco para memorizar',
    practice: { gym: 'scales', label: 'Practicar en el Gimnasio de Escalas', hint: 'Elegí Si mayor y seguí los números de dedo sobre las teclas' },
    demonstrationNotes: ['B4', 'C#5', 'D#5', 'E5', 'F#5', 'G#5', 'A#5', 'B5'],
    fingerGuide: { 'B4': 1, 'C#5': 2, 'D#5': 3, 'E5': 1, 'F#5': 2, 'G#5': 3, 'A#5': 4, 'B5': 5 },
    targetKeys: ['B4', 'C#5', 'D#5', 'E5', 'F#5', 'G#5', 'A#5', 'B5'],
  },
  {
    id: '5e',
    number: 9,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 20,
    title: '9. Las tres escalas menores',
    level: 'Intermedio',
    description: 'Natural, armónica y melódica: qué cambia en cada una y cuándo se usa cada una.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'escala menor natural armonica y melodica en piano explicacion',
    demonstrationNotes: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G#4', 'A4'],
    fingerGuide: { 'A3': 1, 'B3': 2, 'C4': 3, 'D4': 1, 'E4': 2, 'F4': 3, 'G#4': 4, 'A4': 5 },
    targetKeys: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'G#4', 'A4'],
    practice: { gym: 'scales', label: 'Gimnasio de Escalas', hint: 'Elegí una menor y pasá por las tres versiones seguidas' },
  },
  {
    id: '5f',
    number: 10,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 22,
    title: '10. Armaduras de clave: el orden de sostenidos y bemoles',
    level: 'Intermedio',
    description: 'Leer la tonalidad de un vistazo en vez de descifrar alteración por alteración.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'armadura de clave orden de sostenidos y bemoles truco para reconocer tonalidad',
    demonstrationNotes: ['F4', 'C5', 'G4', 'D5', 'A4', 'E5', 'B4'],
    targetKeys: ['F4', 'C5', 'G4', 'D5', 'A4', 'E5', 'B4'],
    practice: { gym: 'circleSequence', label: 'Círculo de Quintas', hint: 'Girar el círculo es recorrer las armaduras en orden: una alteración por paso' },
  },
  {
    id: '5g',
    number: 11,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 24,
    title: '11. Los modos: siete colores de una misma escala',
    level: 'Intermedio',
    description: 'Dórico, mixolidio, lidio y compañía: las mismas teclas, siete climas distintos.',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'modos griegos en piano dorico mixolidio lidio explicados con ejemplos',
    demonstrationNotes: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'],
    fingerGuide: { 'D4': 1, 'E4': 2, 'F4': 3, 'G4': 1, 'A4': 2, 'B4': 3, 'C5': 4, 'D5': 5 },
    targetKeys: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'],
    practice: { gym: 'scales', label: 'Gimnasio de Escalas', hint: 'Tocá la escala y después sostené la tónica del modo con la izquierda: recién ahí se oye' },
  },
  {
    id: '5h',
    number: 12,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 27,
    title: '12. Pentatónicas y blues: la escala que no falla',
    level: 'Intermedio',
    description: 'Cinco notas para improvisar sin equivocarse, y la sexta que le pone el barro.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'escala pentatonica y de blues en piano como improvisar',
    demonstrationNotes: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'E4': 3, 'G4': 1, 'A4': 2, 'C5': 4 },
    targetKeys: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
    practice: { gym: 'scales', label: 'Gimnasio de Escalas', hint: 'Después de la escala, improvisá un minuto solo con esas cinco notas' },
  },
  {
    id: '5c',
    number: 13,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 29,
    title: '13. El sistema de las 3 escalas del día',
    level: 'Principiante',
    description: 'Repetición espaciada e intercalada: por qué practicar peor hoy te hace tocar mejor el mes que viene.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'como practicar escalas de piano rutina diaria eficiente',
    practice: { gym: 'scales', label: 'Armar la ronda en el Gimnasio', hint: 'Tres modos distintos para recuperar la misma escala' },
    demonstrationNotes: ['A5', 'G#5', 'F#5', 'E5', 'D5', 'C#5', 'B4', 'A4'],
    fingerGuide: { 'A4': 1, 'B4': 2, 'C#5': 3, 'D5': 1, 'E5': 2, 'F#5': 3, 'G#5': 4, 'A5': 5 },
    targetKeys: ['A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5'],
  },
  {
    id: '5d',
    number: 14,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 31,
    title: '14. Práctica mental y audiación',
    level: 'Intermedio',
    description: 'Memorizar la escala sin tocarla: dónde poner la atención y cómo ensayar con la cabeza.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'practica mental sin instrumento y audiacion para musicos',
    demonstrationNotes: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
    fingerGuide: { 'G4': 1, 'A4': 2, 'B4': 3, 'C5': 1, 'D5': 2, 'E5': 3, 'F#5': 4, 'G5': 5 },
    targetKeys: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
    practice: { gym: 'earTraining', label: 'Oído: Intervalos y Tríadas', hint: 'Audiar es oír antes de tocar; acá se comprueba si lo que oíste era lo que era' },
  },
  {
    id: '5i',
    number: 15,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 33,
    title: '15. Escalas en terceras, en sextas y en movimiento contrario',
    level: 'Avanzado',
    description: 'Las cuatro variantes que convierten una escala aburrida en técnica de verdad.',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'escalas en terceras y movimiento contrario piano tecnica',
    demonstrationNotes: ['C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'C4'],
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    practice: { gym: 'speed', label: 'Velocidad y Técnica', hint: 'Las variantes de ritmo y la escalera del metrónomo, sobre la escala que ya te sale' },
  },
  {
    id: '6',
    number: 16,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (9% - 36%)',
    progressPercent: 36,
    title: '16. Lectura Musical: El Gran Pentagrama y Claves',
    level: 'Principiante',
    description: 'Decodifica la notación clásica sin estrés: Clave de Sol para la derecha y Clave de Fa para la izquierda.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'leer partitura de piano clave de sol y clave de fa pentagrama principiantes',
    demonstrationNotes: ['C4', 'G4', 'C3'],
    targetKeys: ['C3', 'C4', 'G4'],
    practice: { gym: 'sightReading', label: 'Lectura de Partituras', hint: 'Reconocer la nota en el pentagrama y tocarla, en las dos claves' },
  },

  // MÓDULO 3: Acordes y Tríadas (40% - 60%)
  {
    id: '7',
    number: 17,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 38,
    title: '17. Anatomía de la Tríada: Mayor vs Menor',
    level: 'Principiante',
    description: 'Comprende la emoción armónica: por qué un acorde suena radiante o melancólico.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'acordes mayores y menores en piano diferencia triadas tutorial',
    demonstrationNotes: ['C4', 'E4', 'G4'],
    fingerGuide: { 'C4': 1, 'E4': 3, 'G4': 5 },
    targetKeys: ['C4', 'D#4', 'E4', 'G4'],
    practice: { gym: 'earTraining', label: 'Oído: Intervalos y Tríadas', hint: 'Distinguir mayor de menor a ciegas es la prueba de que entendiste la tercera' },
  },
  {
    id: '7b',
    number: 18,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 40,
    title: '18. Cifrado americano: leer C, Am, F7 y Csus4',
    level: 'Principiante',
    description: 'El idioma con el que están escritas casi todas las canciones que vas a querer tocar.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'cifrado americano acordes piano como leer C Am F7 sus',
    demonstrationNotes: ['C4', 'E4', 'G4'],
    targetKeys: ['C4', 'E4', 'G4', 'A4', 'B4', 'D5'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Leé el cifrado y armalo sin pensar la fórmula: esa es la meta' },
  },
  {
    id: '7c',
    number: 19,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 42,
    title: '19. Disminuidos y aumentados: las dos tríadas raras',
    level: 'Intermedio',
    description: 'Las dos que faltaban para completar la familia, y para qué sirve cada una.',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'acordes disminuidos y aumentados en piano para que sirven',
    demonstrationNotes: ['B4', 'D5', 'F5'],
    targetKeys: ['C4', 'E4', 'G4', 'B4', 'D5', 'F5', 'G#4'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Cuando aparezcan dim y aug, escuchá primero y contá después' },
  },
  {
    id: '8',
    number: 20,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 44,
    title: '20. Los 7 Acordes Diatónicos de la Tonalidad',
    level: 'Intermedio',
    description: 'Descubre la familia completa de acordes que nacen de las teclas blancas.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'acordes diatonicos y campo armonico en piano tutorial',
    demonstrationNotes: ['C4', 'E4', 'G4', 'D4', 'F4', 'A4', 'E4', 'G4', 'B4'],
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Los siete grados de la tonalidad, uno atrás de otro y contra reloj' },
  },
  {
    id: '8b',
    number: 21,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 47,
    title: '21. Funciones: tónica, subdominante y dominante',
    level: 'Intermedio',
    description: 'Por qué siete acordes hacen en realidad solo tres trabajos.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'funciones tonales tonica subdominante dominante explicacion piano',
    demonstrationNotes: ['C4', 'E4', 'G4'],
    targetKeys: ['C4', 'E4', 'G4', 'F4', 'A4', 'B4', 'D5'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Nombrá la función de cada acorde que te toque antes de tocarlo' },
  },
  {
    id: '8c',
    number: 22,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 49,
    title: '22. Cadencias: cómo se cierra una frase',
    level: 'Intermedio',
    description: 'Los cuatro finales posibles y qué siente el oyente en cada uno.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'cadencias musicales autentica plagal rota semicadencia piano ejemplos',
    demonstrationNotes: ['G4', 'B4', 'D5'],
    targetKeys: ['C4', 'E4', 'G4', 'F4', 'A4', 'B4', 'D5'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Después de cada ejercicio, cerrá vos con V–I y escuchá el punto final' },
  },
  {
    id: '9',
    number: 23,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 51,
    title: '23. La Progresión de Oro: I - V - vi - IV',
    level: 'Intermedio',
    description: 'La fórmula armónica detrás de cientos de éxitos mundiales desde los Beatles hasta el pop actual.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'progresion de acordes 1 5 6 4 en piano tutorial cancion',
    demonstrationNotes: ['C4', 'E4', 'G4', 'G3', 'B3', 'D4', 'A3', 'C4', 'E4', 'F3', 'A3', 'C4'],
    targetKeys: ['C4', 'E4', 'G4', 'A4', 'F4', 'B4', 'D4'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'I–V–vi–IV: la progresión sale cuando los cuatro acordes salen sin pensar' },
  },
  {
    id: '9b',
    number: 24,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 53,
    title: '24. Patrones de acompañamiento: bloque, arpegio, vals y balada',
    level: 'Intermedio',
    description: 'Los mismos cuatro acordes, cuatro maneras de tocarlos y cuatro canciones distintas.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'patrones de acompañamiento piano balada vals arpegio mano izquierda',
    demonstrationNotes: ['C3', 'G3', 'C4', 'E4', 'G4'],
    targetKeys: ['C3', 'G3', 'C4', 'E4', 'G4'],
    practice: { gym: 'arpeggios', label: 'Gimnasio de Arpegios', hint: 'El arpegio quebrado y el bajo de Alberti, que son dos de los cuatro patrones' },
  },
  {
    id: '9c',
    number: 25,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 56,
    title: '25. Las progresiones que sostienen mil canciones',
    level: 'Intermedio',
    description: 'ii–V–I, la de los cincuenta, el canon y el blues de doce compases.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'progresiones de acordes mas usadas piano ii V I blues 12 compases canon',
    demonstrationNotes: ['D4', 'F4', 'A4'],
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Practicá ii–V–I en tres tonalidades distintas: es el mismo molde' },
  },
  {
    id: '9d',
    number: 26,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (36% - 58%)',
    progressPercent: 58,
    title: '26. Transportar: la misma canción en cualquier tono',
    level: 'Intermedio',
    description: 'Pensar en números en vez de en letras, y bajarle el tono a un tema en treinta segundos.',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'como transportar una cancion de tono en piano numeros romanos',
    demonstrationNotes: ['G4', 'B4', 'D5'],
    targetKeys: ['G4', 'B4', 'D5', 'A4', 'C5', 'E5'],
    practice: { gym: 'circleSequence', label: 'Círculo de Quintas', hint: 'Tocá la misma progresión girando el círculo: eso es transportar' },
  },

  // MÓDULO 4: Inversiones y Conducción de Voces (60% - 80%)
  {
    id: '10',
    number: 27,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 60,
    title: '27. Inversiones y el Arte del Voice Leading',
    level: 'Intermedio',
    description: 'Elimina los saltos bruscos de la mano y conecta acordes con la elegancia de un profesional.',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'inversiones de acordes en piano y conduccion de voces tutorial',
    demonstrationNotes: ['C4', 'E4', 'G4', 'E4', 'G4', 'C5', 'G4', 'C5', 'E5'],
    targetKeys: ['C4', 'E4', 'G4', 'C5', 'E5'],
    practice: { gym: 'inversions', label: 'Tríadas e Inversiones', hint: 'Las tres posiciones del mismo acorde, que es de lo que vive el voice leading' },
  },
  {
    id: '10b',
    number: 28,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 62,
    title: '28. La regla de la cuarta',
    level: 'Intermedio',
    description: 'Reconocer cualquier inversión en un segundo, en el papel y bajo los dedos.',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'como identificar inversiones de acordes truco teoria musical',
    practice: { gym: 'inversions', label: 'Practicar en Tríadas e Inversiones', hint: 'Carrusel de posiciones y reconocimiento de oído' },
    demonstrationNotes: ['C4', 'E4', 'G4', 'E4', 'G4', 'C5', 'G4', 'C5', 'E5'],
    targetKeys: ['C4', 'E4', 'G4', 'C5', 'E5'],
  },
  {
    id: '10c',
    number: 29,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 64,
    title: '29. El carrusel de las 12 tonalidades',
    level: 'Intermedio',
    description: 'Un drill de una octava que fija I-IV-V con inversiones en las doce, sin saltos de mano.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'practicar acordes en las 12 tonalidades ejercicio de piano',
    practice: { gym: 'inversions', label: 'Correr el carrusel', hint: 'Tríadas e Inversiones: las tres posiciones en las doce tonalidades' },
    demonstrationNotes: ['C4', 'E4', 'G4', 'C4', 'F4', 'A4', 'B3', 'D4', 'G4', 'C4', 'E4', 'G4'],
    targetKeys: ['B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'],
  },
  {
    id: '11',
    number: 30,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 67,
    title: '30. Independencia de Manos: Bajo + Armonía',
    level: 'Intermedio',
    description: 'El mayor desafío psicológico del principiante: disociar la mano izquierda de la derecha.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'independencia de manos en piano ejercicios mano izquierda y derecha',
    demonstrationNotes: ['C3', 'C4', 'E4', 'G4', 'G3', 'G4', 'B4', 'D5'],
    targetKeys: ['C3', 'G3', 'C4', 'E4', 'G4'],
    practice: { gym: 'waterfall', label: 'Las dos manos en la Catarata', hint: 'Poné la izquierda en acompañamiento automático y sumala cuando la derecha ande sola' },
  },
  {
    id: '11b',
    number: 31,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 69,
    title: '31. Melodía y acompañamiento en la misma mano',
    level: 'Intermedio',
    description: 'Que el meñique cante mientras el pulgar acompaña, sin que se pisen.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'como destacar la melodia sobre el acompañamiento piano misma mano voicing',
    demonstrationNotes: ['C4', 'E4', 'G4'],
    fingerGuide: { 'C4': 1, 'E4': 3, 'G4': 5 },
    targetKeys: ['C4', 'E4', 'G4', 'C5'],
    practice: { gym: 'inversions', label: 'Tríadas e Inversiones', hint: 'En el carrusel, tocá cada inversión destacando siempre la nota de arriba' },
  },
  {
    id: '11c',
    number: 32,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 71,
    title: '32. El pedal de resonancia: cuándo se cambia',
    level: 'Intermedio',
    description: 'El pedal no se pisa al empezar el acorde: se cambia justo después. Ahí está todo.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'como usar el pedal de resonancia piano pedal sincopado cuando cambiarlo',
    demonstrationNotes: ['C4', 'E4', 'G4', 'F4', 'A4', 'C5'],
    targetKeys: ['C4', 'E4', 'G4', 'F4', 'A4', 'C5'],
    practice: { gym: 'waterfall', label: 'Catarata de Tonos', hint: 'Elegí una pieza con acordes tenidos y practicá el cambio de pedal en cada uno' },
  },
  {
    id: '12',
    number: 33,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 73,
    title: '33. Acordes de Séptima: El Color del Jazz y Soul',
    level: 'Intermedio',
    description: 'Añade una cuarta nota a tus tríadas y descubre la sofisticación del sonido contemporáneo.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'acordes de septima en piano tutorial jazz para principiantes',
    demonstrationNotes: ['C4', 'E4', 'G4', 'B4', 'C4', 'E4', 'G4', 'A#4'],
    targetKeys: ['C4', 'E4', 'G4', 'A#4', 'B4'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Séptimas: el reflejo de armar el acorde de cuatro notas' },
  },
  {
    id: '12b',
    number: 34,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 76,
    title: '34. Las cuatro posiciones de una séptima',
    level: 'Avanzado',
    description: 'Con cuatro notas hay una inversión más: la séptima en el bajo, y es la que más se usa.',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'inversiones de acordes de septima tercera inversion piano',
    demonstrationNotes: ['F4', 'G4', 'B4', 'D5'],
    targetKeys: ['G4', 'B4', 'D5', 'F5', 'F4'],
    practice: { gym: 'inversions', label: 'Tríadas e Inversiones', hint: 'Después del carrusel de tríadas, hacé lo mismo con G7 y sus cuatro posiciones' },
  },
  {
    id: '12c',
    number: 35,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 78,
    title: '35. Notas de paso, bordaduras y apoyaturas',
    level: 'Avanzado',
    description: 'Las notas que no pertenecen al acorde y son las que hacen que la melodía se mueva.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'notas de paso bordaduras y apoyaturas explicacion musical piano',
    demonstrationNotes: ['C4', 'D4', 'E4', 'F4', 'E4'],
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4'],
    practice: { gym: 'sightReading', label: 'Lectura de Partituras', hint: 'Al leer, separá las notas del acorde de las que sólo están de paso' },
  },
  {
    id: '12d',
    number: 36,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (58% - 80%)',
    progressPercent: 80,
    title: '36. Armonizar una melodía',
    level: 'Avanzado',
    description: 'Te dan una melodía sola y tenés que ponerle los acordes. El método, paso a paso.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'como armonizar una melodia en piano poner acordes a una cancion',
    demonstrationNotes: ['E4', 'D4', 'C4'],
    targetKeys: ['C4', 'E4', 'G4', 'F4', 'A4', 'D4', 'B4'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Armá rápido los siete acordes de una tonalidad: son tus candidatos' },
  },

  // MÓDULO 5: Armonía Maestra y Círculo de Quintas (80% - 100%)
  {
    id: '13',
    number: 37,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 82,
    title: '37. El Círculo de Quintas: La Brújula Universal',
    level: 'Avanzado',
    description: 'El mapa definitivo de la armonía tonal: cómo navegar entre todas las 12 tonalidades del mundo.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'circulo de quintas explicado facil para piano teoria musical',
    demonstrationNotes: ['C4', 'G4', 'D5', 'A5'],
    targetKeys: ['C4', 'G4', 'D4', 'A4'],
    practice: { gym: 'circleSequence', label: 'Secuencias del Ciclo de Quintas', hint: 'Recorrer el círculo con metrónomo es lo que lo vuelve una brújula y no un dibujo' },
  },
  {
    id: '13b',
    number: 38,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 84,
    title: '38. Dominantes secundarias: el V de otro grado',
    level: 'Avanzado',
    description: 'El acorde prestado que hace que cualquier grado suene como una llegada.',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'dominantes secundarias V de V explicacion piano armonia',
    demonstrationNotes: ['D4', 'F#4', 'A4', 'C5'],
    targetKeys: ['D4', 'F#4', 'A4', 'C5', 'G4', 'B4'],
    practice: { gym: 'circleSequence', label: 'Círculo de Quintas', hint: 'Una dominante secundaria es un salto de quinta prestado: el círculo lo muestra' },
  },
  {
    id: '14',
    number: 39,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 87,
    title: '39. Extensiones y Tensiones (9nas, Sus4, Sus2)',
    level: 'Avanzado',
    description: 'Enriquece tus acordes suspendiendo la tercera o añadiendo la novena para sonar a estudio profesional.',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'acordes con novena sus2 y sus4 en piano tutorial',
    demonstrationNotes: ['C4', 'F4', 'G4', 'C4', 'D4', 'G4', 'C4', 'E4', 'G4', 'D5'],
    targetKeys: ['C4', 'D4', 'F4', 'G4', 'D5'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Novenas y suspendidos sobre la tríada que ya conocés' },
  },
  {
    id: '14b',
    number: 40,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 89,
    title: '40. Guide tones y shell voicings',
    level: 'Avanzado',
    description: 'Tres notas por acorde, dos que se mueven un semitono: la inversión que suena a disco.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'shell voicings de jazz en piano tercera y septima tutorial',
    practice: { gym: 'circleSequence', label: 'Llevarlo a las 12 tonalidades', hint: 'Secuencias por ciclo de quintas con metrónomo' },
    demonstrationNotes: ['D3', 'C4', 'F4', 'G3', 'B3', 'F4', 'C3', 'B3', 'E4'],
    targetKeys: ['C3', 'D3', 'G3', 'B3', 'E4', 'F4', 'C4'],
  },
  {
    id: '14c',
    number: 41,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 91,
    title: '41. Voicings a dos manos y sin fundamental',
    level: 'Avanzado',
    description: 'Repartir el acorde entre las dos manos y dejar de tocar la nota que ya toca el bajo.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'rootless voicings piano jazz voicings a dos manos tutorial',
    demonstrationNotes: ['E4', 'A4', 'B4', 'D5'],
    targetKeys: ['E4', 'A4', 'B4', 'D5', 'F4', 'G4'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Armá séptimas sin la fundamental: 3-5-7-9 en vez de 1-3-5-7' },
  },
  {
    id: '14d',
    number: 42,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 93,
    title: '42. La sustitución tritonal',
    level: 'Avanzado',
    description: 'Cambiar un dominante por otro a distancia de tritono y que el bajo baje por semitonos.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'sustitucion tritonal jazz piano explicacion sub V',
    demonstrationNotes: ['C#4', 'F4', 'G#4', 'B4'],
    targetKeys: ['C#4', 'F4', 'G#4', 'B4', 'G4', 'D4'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Armá G7 y Db7 seguidos y escuchá que la tensión es la misma' },
  },
  {
    id: '14e',
    number: 43,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 96,
    title: '43. Modular: cambiar de tonalidad sin que se note',
    level: 'Avanzado',
    description: 'Las tres maneras de mudarse de tonalidad, de la más elegante a la más descarada.',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'como modular de tonalidad piano acorde pivote modulacion directa',
    demonstrationNotes: ['F4', 'A4', 'C5'],
    targetKeys: ['F4', 'A4', 'C5', 'D4', 'G4', 'B4'],
    practice: { gym: 'circleSequence', label: 'Círculo de Quintas', hint: 'Las tonalidades vecinas en el círculo son las que más acordes comparten' },
  },
  {
    id: '14f',
    number: 44,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 98,
    title: '44. Reharmonizar: la misma melodía, otra ropa',
    level: 'Avanzado',
    description: 'Cambiarle los acordes a un tema conocido sin tocarle una sola nota a la melodía.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'reharmonizacion piano jazz cambiar acordes de una cancion',
    demonstrationNotes: ['C4', 'E4', 'G4', 'A4'],
    targetKeys: ['C4', 'E4', 'G4', 'A4', 'B4', 'D5'],
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Practicá las sustituciones por función: I por vi, IV por ii, V por vii°' },
  },
  {
    id: '15',
    number: 45,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 100,
    title: '45. Gran Graduación: Improvisación Pentatónica y Maestría',
    level: 'Avanzado',
    description: 'La cima del viaje: libera tu creatividad con la escala pentatónica y recibe tu certificación virtual.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'improvisar en piano con la escala pentatonica tutorial',
    demonstrationNotes: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
    targetKeys: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
    practice: { gym: 'scales', label: 'Pentatónica en el Gimnasio de Escalas', hint: 'Las cinco notas en las doce tonalidades: el material de la improvisación' },
  }

];

export interface Exercise {
  id: string;
  title: string;
  targetChord: string;
  targetRoot: string;
  targetType: string;
  keys: string[];
}

export const getRandomChordExercise = (): Exercise => {
  const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
  const type = CHORD_TYPES[Math.floor(Math.random() * 5)];
  const inversion = Math.floor(Math.random() * 3);
  const keys = getChordKeys(root, type, inversion);
  
  const inversionText = inversion === 0 ? '' : inversion === 1 ? '(1ª Inversión)' : '(2ª Inversión)';

  return {
    id: Math.random().toString(36).substr(2, 9),
    title: `Toca el acorde de ${root} ${type} ${inversionText}`,
    targetChord: `${root} ${type} ${inversionText}`,
    targetRoot: root,
    targetType: type,
    keys
  };
};
