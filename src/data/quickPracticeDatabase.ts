import { ScaleInfo, SCALES_DATABASE, COMMON_SCALE_ROOTS, calculateScaleNotes } from '../lib/musicGymTheory';

export type QuickPracticeCategory = 'all' | 'scales' | 'inversions' | 'harmony' | 'ear';

export interface QuickExercise {
  id: string;
  category: 'scales' | 'inversions' | 'harmony' | 'ear' | 'fundamentals';
  subCategory?: string;
  lessonId: string;
  moduleTitle: string;
  lessonTitle: string;
  question: string;
  type: 'piano' | 'mcq' | 'ear';
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  targetKeys?: string[];
  mode?: 'sequence' | 'chord' | 'single';
  hint?: string;
  fingerGuide?: Record<string, number>;
  requiredBassNote?: string;
  audioKeys?: string[];
  audioStyle?: 'chord' | 'arpeggio';
  aurelioTip?: string;
}

// ----------------------------------------------------------------------
// 1. BANCO CURADO: ESCALAS Y DIGITACIONES
// ----------------------------------------------------------------------
export const SCALES_EXERCISES: QuickExercise[] = [
  // Fórmulas y teoría
  {
    id: 'scale-f-major',
    category: 'scales',
    subCategory: 'Fórmula de Escala',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Fórmula Escala Mayor',
    question: '¿Cuál es la fórmula interválica exacta de la Escala Mayor?',
    type: 'mcq',
    options: [
      'Tono - Tono - Semitono - Tono - Tono - Tono - Semitono',
      'Tono - Semitono - Tono - Tono - Semitono - Tono - Tono',
      'Semitono - Tono - Tono - Tono - Semitono - Tono - Tono',
      'Tono - Tono - Tono - Semitono - Tono - Tono - Semitono'
    ],
    correctIndex: 0,
    explanation: 'La fórmula dorada de toda escala mayor es 2 Tonos, 1 Semitono, 3 Tonos y 1 Semitono (T-T-S-T-T-T-S).',
    aurelioTip: '¡Fijate bien, che! Los semitonos siempre caen entre los grados 3-4 y 7-8.'
  },
  {
    id: 'scale-f-minor-nat',
    category: 'scales',
    subCategory: 'Fórmula de Escala',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Escala Menor Natural',
    question: '¿Dónde se encuentran los dos semitonos en la Escala Menor Natural (Eólica)?',
    type: 'mcq',
    options: [
      'Entre los grados 2-3 y 5-6',
      'Entre los grados 3-4 y 7-8',
      'Entre los grados 1-2 y 4-5',
      'Entre los grados 4-5 y 6-7'
    ],
    correctIndex: 0,
    explanation: 'En la escala menor natural, los semitonos están entre el 2º-3º y 5º-6º grado (fórmula: T-S-T-T-S-T-T).',
    aurelioTip: 'Pensá en La menor en teclas blancas: Si-Do (2-3) y Mi-Fa (5-6) son los dos semitonos naturales.'
  },
  {
    id: 'scale-f-minor-harm',
    category: 'scales',
    subCategory: 'Escala Menor Armónica',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Sensible en Menor Armónica',
    question: '¿Qué modificación hace única a la Escala Menor Armónica?',
    type: 'mcq',
    options: [
      'Eleva el 7º grado un semitono para crear la sensible resolutiva',
      'Baja el 3º grado un tono entero',
      'Omite el 4º y 7º grado por completo',
      'Eleva el 2º grado'
    ],
    correctIndex: 0,
    explanation: 'La escala menor armónica asciende el 7º grado (ej: Sol# en La menor) para crear atracción tonal hacia la tónica.',
    aurelioTip: 'Ese salto de un tono y medio entre el 6º y 7º grado da el clásico color bachiano y exótico.'
  },
  {
    id: 'scale-p-thumb-cross',
    category: 'scales',
    subCategory: 'Paso de Pulgar',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Técnica de Paso de Pulgar',
    question: 'En la escala de Do Mayor (Mano Derecha), ¿tras qué nota pasa el pulgar (1) por debajo?',
    type: 'mcq',
    options: [
      'Tras pulsar Mi (E4) con dedo 3, el pulgar pasa a tocar Fa (F4)',
      'Tras pulsar Sol (G4) con dedo 5',
      'Tras pulsar Re (D4) con dedo 2',
      'Tras pulsar Do (C4) con dedo 1'
    ],
    correctIndex: 0,
    explanation: 'La digitación estándar ascendente en mano derecha es 1-2-3 (Do-Re-Mi) y luego el pulgar 1 se desliza suavemente por debajo para tocar Fa.',
    aurelioTip: 'Mantené la muñeca flexible, che. No levantes el codo como ala de pollo; el pulgar entra suelto.'
  },
  {
    id: 'scale-p-fingering-lh',
    category: 'scales',
    subCategory: 'Digitación Mano Izquierda',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Mano Izquierda en Do Mayor',
    question: '¿Cuál es la digitación estándar de Mano Izquierda para subir una octava en Do Mayor?',
    type: 'mcq',
    options: [
      '5 - 4 - 3 - 2 - 1 - 3 - 2 - 1',
      '1 - 2 - 3 - 1 - 2 - 3 - 4 - 5',
      '5 - 3 - 2 - 1 - 4 - 3 - 2 - 1',
      '1 - 3 - 5 - 1 - 3 - 5 - 1 - 2'
    ],
    correctIndex: 0,
    explanation: 'La mano izquierda comienza con el meñique (5) en Do3, llega al pulgar (1) en Sol3 y cruza el dedo medio (3) a La3.',
    aurelioTip: 'Fijate que ambas manos nunca cambian de dedos al mismo tiempo: ¡por eso la coordinación requiere práctica!'
  },
  {
    id: 'scale-p-c-major-first4',
    category: 'scales',
    subCategory: 'Práctica de Teclado',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Primer Tramo con Paso de Pulgar',
    question: 'Toca las primeras 4 notas de Do Mayor: C4 → D4 → E4 → F4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['C4', 'D4', 'E4', 'F4'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'E4': 3, 'F4': 1 },
    hint: 'Dedos: 1 (Do) → 2 (Re) → 3 (Mi) → y pasa el pulgar (1) por debajo para pulsar Fa.',
    aurelioTip: 'Dedos curvaditos como acariciando una manzana redonda.'
  },
  {
    id: 'scale-p-c-major-octave',
    category: 'scales',
    subCategory: 'Práctica de Teclado',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Escala Completa de Do Mayor',
    question: 'Toca la escala completa de Do Mayor: C4 → D4 → E4 → F4 → G4 → A4 → B4 → C5',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'E4': 3, 'F4': 1, 'G4': 2, 'A4': 3, 'B4': 4, 'C5': 5 },
    hint: '1 - 2 - 3 (paso de pulgar) 1 - 2 - 3 - 4 - 5.',
    aurelioTip: '¡Una hermosura! Todas teclas blancas de Do a Do agudo.'
  },
  {
    id: 'scale-p-g-major-first5',
    category: 'scales',
    subCategory: 'Práctica de Teclado',
    lessonId: '13',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Escala de Sol Mayor (1 Sostenido)',
    question: 'Toca en secuencia: G4 → A4 → B4 → C5 → D5',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['G4', 'A4', 'B4', 'C5', 'D5'],
    fingerGuide: { 'G4': 1, 'A4': 2, 'B4': 3, 'C5': 1, 'D5': 2 },
    hint: 'Sol Mayor tiene Fa sostenido (F#). Toca Sol, La, Si, Do y Re.',
    aurelioTip: 'Sol Mayor es la primera quinta a la derecha en el círculo.'
  },
  {
    id: 'scale-p-g-major-leading',
    category: 'scales',
    subCategory: 'Práctica de Teclado',
    lessonId: '13',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Sensible de Sol Mayor',
    question: 'Toca la sensible y resolución de Sol Mayor: F#4 → G4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['F#4', 'G4'],
    fingerGuide: { 'F#4': 4, 'G4': 5 },
    hint: 'Tecla negra Fa# (F#4) que resuelve hacia arriba en Sol (G4).',
    aurelioTip: 'Sentí cómo la tecla negra F# empuja a descansar en la tónica Sol.'
  },
  {
    id: 'scale-p-f-major-bb',
    category: 'scales',
    subCategory: 'Práctica de Teclado',
    lessonId: '13',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Escala de Fa Mayor (1 Bemol)',
    question: 'Toca el tramo con la alteración Si bemol (A#4/Bb4): F4 → G4 → A4 → A#4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['F4', 'G4', 'A4', 'A#4'],
    fingerGuide: { 'F4': 1, 'G4': 2, 'A4': 3, 'A#4': 4 },
    hint: 'Fa, Sol, La y el 4º dedo en la tecla negra Si bemol (Bb4 / A#4).',
    aurelioTip: 'En Fa Mayor, el 4º dedo se acomoda perfecto sobre la tecla negra Bb.'
  },
  {
    id: 'scale-p-a-minor-nat',
    category: 'scales',
    subCategory: 'Práctica de Teclado',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'La Menor Natural',
    question: 'Toca en secuencia: A3 → B3 → C4 → D4 → E4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['A3', 'B3', 'C4', 'D4', 'E4'],
    fingerGuide: { 'A3': 1, 'B3': 2, 'C4': 3, 'D4': 1, 'E4': 2 },
    hint: 'Todas teclas blancas partiendo desde La (A3). Relativo menor de Do.',
    aurelioTip: 'El color melancólico por excelencia de la música popular.'
  },
  {
    id: 'scale-p-a-minor-harm',
    category: 'scales',
    subCategory: 'Práctica de Teclado',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Sensible de La Menor Armónica',
    question: 'Toca la sensible Sol# y resolución: G#4 → A4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['G#4', 'A4'],
    fingerGuide: { 'G#4': 4, 'A4': 5 },
    hint: 'Tecla negra Sol#4 (G#4) resolviendo a La4.',
    aurelioTip: 'Ese Sol sostenido transforma el acorde Em en un potente E7 dominante.'
  },
  {
    id: 'scale-p-c-pentatonic-maj',
    category: 'scales',
    subCategory: 'Pentatónicas',
    lessonId: '15',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Pentatónica Mayor de Do',
    question: 'Toca las 5 notas de la Pentatónica Mayor: C4 → D4 → E4 → G4 → A4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['C4', 'D4', 'E4', 'G4', 'A4'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'E4': 3, 'G4': 1, 'A4': 2 },
    hint: 'Do, Re, Mi, Sol, La (omite Fa y Si).',
    aurelioTip: 'Las 5 notas de oro para improvisar sin jamás errarle a una disonancia.'
  },
  {
    id: 'scale-p-a-pentatonic-min',
    category: 'scales',
    subCategory: 'Pentatónicas',
    lessonId: '15',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Pentatónica Menor de La',
    question: 'Toca la Pentatónica Menor de La: A3 → C4 → D4 → E4 → G4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['A3', 'C4', 'D4', 'E4', 'G4'],
    fingerGuide: { 'A3': 1, 'C4': 2, 'D4': 3, 'E4': 1, 'G4': 2 },
    hint: '1 - b3 - 4 - 5 - b7 (La, Do, Re, Mi, Sol).',
    aurelioTip: '¡El alma entera del blues y del rock n roll!'
  },
  {
    id: 'scale-p-blues-c',
    category: 'scales',
    subCategory: 'Blues & Modos',
    lessonId: '15',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Blue Note en Do',
    question: 'Toca la Blue Note (quinta disminuida F#4) rodeada de Fa y Sol: F4 → F#4 → G4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['F4', 'F#4', 'G4'],
    fingerGuide: { 'F4': 2, 'F#4': 3, 'G4': 4 },
    hint: 'La nota de paso desgarradora entre el 4º y 5º grado.',
    aurelioTip: 'Tocala con intención y ligadura, che, como un gemido del teclado.'
  },
  {
    id: 'scale-ear-major-minor',
    category: 'scales',
    subCategory: 'Oído de Escalas',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Identificación Auditiva',
    question: 'Escucha la escala: ¿Es Mayor o Menor?',
    type: 'ear',
    audioKeys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    audioStyle: 'arpeggio',
    options: ['Escala Mayor (Luminosa y Diatónica)', 'Escala Menor (Nostálgica y Profunda)'],
    correctIndex: 0,
    explanation: 'Sonó la escala de Do Mayor completa: su tercera mayor (Mi) le da ese brillo característico.',
    aurelioTip: 'Cerrá los ojos y fijate en la 3ª nota: si suena abierta y festiva, es Mayor.'
  },
  {
    id: 'scale-ear-penta',
    category: 'scales',
    subCategory: 'Oído de Escalas',
    lessonId: '15',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: 'Color Pentatónico',
    question: 'Escucha las notas: ¿Qué tipo de escala suena?',
    type: 'ear',
    audioKeys: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
    audioStyle: 'arpeggio',
    options: [
      'Escala Pentatónica Mayor (5 notas sin semitonos)',
      'Escala Cromática completa',
      'Escala Menor Armónica',
      'Escala Disminuida'
    ],
    correctIndex: 0,
    explanation: 'La escala pentatónica mayor consta de 5 notas que no contienen semitonos entre sí.',
    aurelioTip: 'Suena como música folclórica oriental o balada pop limpia.'
  }
];

// ----------------------------------------------------------------------
// 2. BANCO CURADO: INVERSIONES Y VOICE LEADING
// ----------------------------------------------------------------------
export const INVERSIONS_EXERCISES: QuickExercise[] = [
  // Teoría de Inversiones
  {
    id: 'inv-m-bass-1st',
    category: 'inversions',
    subCategory: 'Bajos en Inversiones',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'La Primera Inversión',
    question: 'En la 1ª Inversión de cualquier tríada, ¿qué nota está en el bajo (la más grave)?',
    type: 'mcq',
    options: [
      'La Tercera del acorde (3ª)',
      'La Quinta del acorde (5ª)',
      'La Raíz o Fundamental (1ª)',
      'La Séptima (7ª)'
    ],
    correctIndex: 0,
    explanation: 'En 1ª Inversión (cifrado 6), la 3ª pasa a ser el bajo. Ej: en Do Mayor (C-E-G), el bajo es Mi.',
    aurelioTip: '¡Acordate siempre! Fundamental = Raíz en el bajo. 1ª Inversión = Tercera en el bajo.'
  },
  {
    id: 'inv-m-bass-2nd',
    category: 'inversions',
    subCategory: 'Bajos en Inversiones',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'La Segunda Inversión',
    question: 'En la 2ª Inversión de cualquier tríada (cifrado 6/4), ¿qué nota está en el bajo?',
    type: 'mcq',
    options: [
      'La Quinta del acorde (5ª)',
      'La Tercera (3ª)',
      'La Fundamental (1ª)',
      'La Novena (9ª)'
    ],
    correctIndex: 0,
    explanation: 'En 2ª Inversión, la 5ª del acorde se sitúa en el bajo. Ej: en Do Mayor, Sol es la nota más grave (G - C - E).',
    aurelioTip: 'La 2ª inversión es muy inestable; se usa para bajos de paso o apoyaturas cadenciales.'
  },
  {
    id: 'inv-m-fingering-1st',
    category: 'inversions',
    subCategory: 'Digitación de Inversiones',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Digitación de 1ª Inversión (MD)',
    question: '¿Por qué en la 1ª Inversión (ej. E4 - G4 - C5) se usa la digitación 1 - 2 - 5 en lugar de 1 - 3 - 5?',
    type: 'mcq',
    options: [
      'Porque entre Sol y Do agudo hay un intervalo de 4ª más ancho, que el dedo 2 abre naturalmente',
      'Porque el dedo 3 está prohibido en inversiones',
      'Para tocar más fuerte el pulgar',
      'Es indistinto y da lo mismo'
    ],
    correctIndex: 0,
    explanation: 'La anatomía de la mano sitúa el espacio más amplio entre el índice (2) y el meñique (5), ideal para el intervalo de 4ª superior.',
    aurelioTip: 'Fijate en tu propia mano: abrir entre dedos 2 y 5 es comodísimo; entre 3 y 5 se tensiona.'
  },
  {
    id: 'inv-m-voice-leading',
    category: 'inversions',
    subCategory: 'Voice Leading',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Conducción Suave de Voces',
    question: '¿Cuál es el beneficio principal de usar inversiones al pasar de Do Mayor (C) a Fa Mayor (F)?',
    type: 'mcq',
    options: [
      'Mantiene la nota común Do quieta y mueve las demás por semitono o tono (C-E-G → C-F-A)',
      'Hace que el acorde suene el doble de fuerte',
      'Obliga a cruzar las dos manos',
      'Cambia el tempo de la canción'
    ],
    correctIndex: 0,
    explanation: 'En lugar de saltar toda la mano de C a F, usamos Fa en 2ª inversión (C-F-A): ¡el Do no se mueve y el enlace es perfecto!',
    aurelioTip: 'Eso es lo que separa a un aporreador de teclas de un verdadero pianista con tacto.'
  },

  // Práctica de Teclado: Tríadas e Inversiones
  {
    id: 'inv-p-c-root',
    category: 'inversions',
    subCategory: 'Práctica de Teclado',
    lessonId: '7',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Do Mayor Fundamental (5/3)',
    question: 'Toca la tríada de Do Mayor en Estado Fundamental (C4 - E4 - G4)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['C4', 'E4', 'G4'],
    fingerGuide: { 'C4': 1, 'E4': 3, 'G4': 5 },
    hint: 'Do en el bajo, Mi en el centro y Sol arriba. Dedos 1 - 3 - 5.',
    aurelioTip: 'Dejá caer el peso natural del brazo sobre las tres teclas al mismo tiempo.'
  },
  {
    id: 'inv-p-c-inv1',
    category: 'inversions',
    subCategory: 'Práctica de Teclado',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Do Mayor 1ª Inversión (6)',
    question: 'Toca Do Mayor en 1ª Inversión: Mi en el bajo (E4 - G4 - C5)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['E4', 'G4', 'C5'],
    fingerGuide: { 'E4': 1, 'G4': 2, 'C5': 5 },
    hint: 'Mi4, Sol4 y Do5 agudo. Dedos recomendados: 1 - 2 - 5.',
    aurelioTip: 'Mirá cómo el Do subió a la terraza. La tercera (Mi) sostiene el acorde.'
  },
  {
    id: 'inv-p-c-inv2',
    category: 'inversions',
    subCategory: 'Práctica de Teclado',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Do Mayor 2ª Inversión (6/4)',
    question: 'Toca Do Mayor en 2ª Inversión: Sol en el bajo (G4 - C5 - E5)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['G4', 'C5', 'E5'],
    fingerGuide: { 'G4': 1, 'C5': 3, 'E5': 5 },
    hint: 'Sol4 en el bajo, Do5 en medio y Mi5 agudo arriba.',
    aurelioTip: 'La 4ª justa queda abajo (G-C) y la 3ª mayor arriba (C-E).'
  },
  {
    id: 'inv-p-g-root',
    category: 'inversions',
    subCategory: 'Práctica de Teclado',
    lessonId: '8',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Sol Mayor Fundamental',
    question: 'Toca Sol Mayor en Estado Fundamental (G4 - B4 - D5)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['G4', 'B4', 'D5'],
    fingerGuide: { 'G4': 1, 'B4': 3, 'D5': 5 },
    hint: 'Sol, Si natural y Re agudo simultáneamente.',
    aurelioTip: 'El quinto grado de Do Mayor, lleno de energía dominante.'
  },
  {
    id: 'inv-p-g-inv1',
    category: 'inversions',
    subCategory: 'Práctica de Teclado',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Sol Mayor 1ª Inversión',
    question: 'Toca Sol Mayor en 1ª Inversión: Si en el bajo (B3 - D4 - G4)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['B3', 'D4', 'G4'],
    fingerGuide: { 'B3': 1, 'D4': 2, 'G4': 5 },
    hint: 'Si3 en el bajo, Re4 en el medio y Sol4 arriba.',
    aurelioTip: 'En 1ª inversión, la tercera Si guía suavemente el bajo hacia Do.'
  },
  {
    id: 'inv-p-f-inv2',
    category: 'inversions',
    subCategory: 'Práctica de Teclado',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Fa Mayor en 2ª Inversión',
    question: 'Toca Fa Mayor en 2ª Inversión: Do en el bajo (C4 - F4 - A4)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['C4', 'F4', 'A4'],
    fingerGuide: { 'C4': 1, 'F4': 3, 'A4': 5 },
    hint: 'Do4, Fa4 y La4. ¡Es la forma ideal de acompañar sin mover el Do de C!',
    aurelioTip: '¡Esta es la joya del voice leading! De Do Mayor (C-E-G) pasás acá moviendo solo 2 dedos.'
  },
  {
    id: 'inv-p-am-inv1',
    category: 'inversions',
    subCategory: 'Práctica de Teclado',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'La Menor en 1ª Inversión',
    question: 'Toca La Menor en 1ª Inversión: Do en el bajo (C4 - E4 - A4)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['C4', 'E4', 'A4'],
    fingerGuide: { 'C4': 1, 'E4': 2, 'A4': 5 },
    hint: 'Do4 en el bajo, Mi4 en el medio y La4 en el techo.',
    aurelioTip: 'Mismo bajo Do que Do Mayor, pero con un color nostálgico precioso.'
  },
  {
    id: 'inv-p-dm-inv1',
    category: 'inversions',
    subCategory: 'Práctica de Teclado',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Re Menor en 1ª Inversión',
    question: 'Toca Re Menor en 1ª Inversión: Fa en el bajo (F4 - A4 - D5)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['F4', 'A4', 'D5'],
    fingerGuide: { 'F4': 1, 'A4': 2, 'D5': 5 },
    hint: 'Fa4, La4 y Re5 agudo.',
    aurelioTip: 'El acorde ii de Do Mayor preparado con el bajo en Fa.'
  },
  {
    id: 'inv-ear-root-vs-inv',
    category: 'inversions',
    subCategory: 'Oído de Inversiones',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: 'Audición de Inversión',
    question: 'Escucha el acorde: ¿Está en Estado Fundamental o Invertido?',
    type: 'ear',
    audioKeys: ['E4', 'G4', 'C5'],
    audioStyle: 'chord',
    options: [
      'Primera Inversión (la 3ª Mi está en el bajo y la fundamental arriba)',
      'Estado Fundamental (la raíz Do está en el bajo)',
      'Segunda Inversión (la 5ª Sol está en el bajo)'
    ],
    correctIndex: 0,
    explanation: 'Sonó E4 - G4 - C5: la tercera (Mi) es la nota grave y el Do suena en la cima.',
    aurelioTip: 'Escuchá la nota más grave: si no suena tan pesada y arraigada como la tónica, está invertido.'
  }
];

// ----------------------------------------------------------------------
// 3. BANCO CURADO: ARMONÍA, FUNCIONES Y PROGRESIONES
// ----------------------------------------------------------------------
export const HARMONY_EXERCISES: QuickExercise[] = [
  // Funciones y Teoría Armónica
  {
    id: 'harm-m-family-diatonic',
    category: 'harmony',
    subCategory: 'Familia Diatónica',
    lessonId: '8',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Los 7 Acordes Diatónicos',
    question: 'En la escala de Do Mayor, ¿cuáles son los acordes Menores de la tonalidad?',
    type: 'mcq',
    options: [
      'ii (Dm), iii (Em) y vi (Am)',
      'I (C), IV (F) y V (G)',
      'Solo el vi (Am)',
      'vii° (Bdim) y IV (F)'
    ],
    correctIndex: 0,
    explanation: 'Los grados menores naturales en cualquier escala mayor son siempre ii, iii y vi.',
    aurelioTip: 'Grados mayores: I, IV, V. Grados menores: ii, iii, vi. Grado disminuido: vii°.'
  },
  {
    id: 'harm-m-dominant-role',
    category: 'harmony',
    subCategory: 'Funciones Armónicas',
    lessonId: '8',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Función del Grado V (Dominante)',
    question: '¿Por qué el acorde de V grado (Sol Mayor / G7) tiene tanta urgencia de resolver al grado I (Do)?',
    type: 'mcq',
    options: [
      'Porque contiene la sensible (Si) que quiere subir a Do, y en séptima el tritono Si-Fa',
      'Porque es el acorde más grave del piano',
      'Porque se toca solo con la mano izquierda',
      'Por pura costumbre moderna'
    ],
    correctIndex: 0,
    explanation: 'La atracción física de la sensible (Si a Do) y el tritono inestable hacen que el acorde dominante resuelva con máxima satisfacción a la tónica.',
    aurelioTip: 'Tensión y reposo, che: la respiración misma de toda la música occidental.'
  },
  {
    id: 'harm-m-prog-pop',
    category: 'harmony',
    subCategory: 'Progresiones de Oro',
    lessonId: '9',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'La Progresión I - V - vi - IV',
    question: '¿Qué acordes forman la progresión I - V - vi - IV en la tonalidad de Do Mayor?',
    type: 'mcq',
    options: [
      'C - G - Am - F',
      'C - F - G - C',
      'Dm - G - C - Am',
      'Am - F - C - G'
    ],
    correctIndex: 0,
    explanation: 'Do (I) → Sol (V) → La menor (vi) → Fa (IV). ¡Con esta progresión se compusieron miles de canciones legendarias!',
    aurelioTip: 'Desde los Beatles hasta Elton John y el pop actual, esta rueda nunca falla.'
  },
  {
    id: 'harm-m-prog-jazz',
    category: 'harmony',
    subCategory: 'Progresiones de Oro',
    lessonId: '12',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'La Progresión Madre: ii - V - I',
    question: '¿Qué acordes componen el ii - V - I fundamental en Do Mayor?',
    type: 'mcq',
    options: [
      'Dm7 → G7 → Cmaj7',
      'Em7 → Am7 → Dm7',
      'Cmaj7 → Fmaj7 → G7',
      'Am7 → Dm7 → G7'
    ],
    correctIndex: 0,
    explanation: 'Re menor 7 (ii) prepara la tensión, Sol 7 (V) la eleva y Do mayor 7 (I) resuelve con elegancia.',
    aurelioTip: 'Subdominante → Dominante → Tónica. Si dominás el ii-V-I, tocás jazz y bossa sin problemas.'
  },
  {
    id: 'harm-m-chords-7th',
    category: 'harmony',
    subCategory: 'Acordes de Séptima',
    lessonId: '12',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Diferencia entre Maj7 y 7',
    question: '¿Cuál es la diferencia fundamental entre Cmaj7 y C7?',
    type: 'mcq',
    options: [
      'Cmaj7 tiene 7ª mayor (Si natural, dulce); C7 tiene 7ª menor (Si bemol, dominante blues)',
      'Cmaj7 tiene 3 notas y C7 tiene 5',
      'C7 es un acorde menor',
      'Ninguna, se llaman igual'
    ],
    correctIndex: 0,
    explanation: 'Cmaj7 = C-E-G-B (séptima mayor natural, suave y ensoñadora). C7 = C-E-G-Bb (séptima menor, tensión dominante).',
    aurelioTip: 'Cmaj7 es un atardecer en la rambla; C7 es un blues eléctrico de Chicago.'
  },
  {
    id: 'harm-m-sus-chords',
    category: 'harmony',
    subCategory: 'Acordes Suspendidos',
    lessonId: '14',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Acordes Suspendidos (Sus4 y Sus2)',
    question: '¿Qué ocurre con la tercera en un acorde suspendido (como Csus4 o Csus2)?',
    type: 'mcq',
    options: [
      'La tercera se suprime y se sustituye por la 4ª (en Sus4) o la 2ª (en Sus2)',
      'Se toca la tercera doble',
      'Se desafina un semitono',
      'Se convierte en acorde disminuido'
    ],
    correctIndex: 0,
    explanation: 'Al no tener tercera, los acordes suspendidos no son ni mayores ni menores: flotan en el aire esperando resolver.',
    aurelioTip: 'Ese suspenso abierto que queda flotando es una belleza antes de volver a la tríada mayor.'
  },

  // Práctica de Teclado: Armonía y Acordes Ricos
  {
    id: 'harm-p-cmaj7',
    category: 'harmony',
    subCategory: 'Práctica de Teclado',
    lessonId: '12',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Acorde Cmaj7 (Do Séptima Mayor)',
    question: 'Toca el acorde de Cmaj7 (C4 - E4 - G4 - B4)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['C4', 'E4', 'G4', 'B4'],
    fingerGuide: { 'C4': 1, 'E4': 2, 'G4': 3, 'B4': 5 },
    hint: 'Do, Mi, Sol y Si natural simultáneamente. Dedos 1 - 2 - 3 - 5.',
    aurelioTip: 'Escuchá cómo el Si natural flota como una caricia sobre la tríada de Do.'
  },
  {
    id: 'harm-p-g7-dom',
    category: 'harmony',
    subCategory: 'Práctica de Teclado',
    lessonId: '12',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Acorde G7 (Sol Dominante)',
    question: 'Toca el acorde G7 (G4 - B4 - D5 - F5)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['G4', 'B4', 'D5', 'F5'],
    fingerGuide: { 'G4': 1, 'B4': 2, 'D5': 3, 'F5': 5 },
    hint: 'Sol, Si, Re y la 7ª menor Fa. Dedos 1 - 2 - 3 - 5.',
    aurelioTip: 'El intervalo entre Si y Fa es el famoso tritono: ¡máxima tensión dramática!'
  },
  {
    id: 'harm-p-am7',
    category: 'harmony',
    subCategory: 'Práctica de Teclado',
    lessonId: '12',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Acorde Am7 (La Menor 7)',
    question: 'Toca el acorde Am7 (A3 - C4 - E4 - G4)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['A3', 'C4', 'E4', 'G4'],
    fingerGuide: { 'A3': 1, 'C4': 2, 'E4': 3, 'G4': 5 },
    hint: 'La3 en el bajo, Do4, Mi4 y Sol4 en el agudo.',
    aurelioTip: 'Todas teclas blancas con un timbre aterciopelado.'
  },
  {
    id: 'harm-p-dm7',
    category: 'harmony',
    subCategory: 'Práctica de Teclado',
    lessonId: '12',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Acorde Dm7 (Re Menor 7)',
    question: 'Toca el acorde Dm7 (D4 - F4 - A4 - C5)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['D4', 'F4', 'A4', 'C5'],
    fingerGuide: { 'D4': 1, 'F4': 2, 'A4': 3, 'C5': 5 },
    hint: 'Re, Fa, La y Do agudo simultáneamente.',
    aurelioTip: 'El grado ii de Do Mayor en su versión de cuatro notas.'
  },
  {
    id: 'harm-p-csus4',
    category: 'harmony',
    subCategory: 'Práctica de Teclado',
    lessonId: '14',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Acorde Csus4 (Suspendido)',
    question: 'Toca el acorde Csus4 (C4 - F4 - G4)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['C4', 'F4', 'G4'],
    fingerGuide: { 'C4': 1, 'F4': 3, 'G4': 5 },
    hint: 'Do4, Fa4 (cuarta justa) y Sol4 (quinta).',
    aurelioTip: 'Sentí cómo el Fa empuja hacia abajo para convertirse en Mi.'
  },
  {
    id: 'harm-p-csus2',
    category: 'harmony',
    subCategory: 'Práctica de Teclado',
    lessonId: '14',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Acorde Csus2 (Suspendido de 2ª)',
    question: 'Toca el acorde Csus2 (C4 - D4 - G4)',
    type: 'piano',
    mode: 'chord',
    targetKeys: ['C4', 'D4', 'G4'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'G4': 5 },
    hint: 'Do4, Re4 y Sol4.',
    aurelioTip: 'Sonido cristalino, típico de baladas modernas y rock acústico.'
  },
  {
    id: 'harm-p-prog-basses',
    category: 'harmony',
    subCategory: 'Práctica de Teclado',
    lessonId: '9',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Bajos de la Progresión I - V - vi - IV',
    question: 'Toca en secuencia los 4 bajos: C4 → G4 → A4 → F4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['C4', 'G4', 'A4', 'F4'],
    fingerGuide: { 'C4': 1, 'G4': 4, 'A4': 5, 'F4': 3 },
    hint: 'Do (I) → Sol (V) → La (vi) → Fa (IV).',
    aurelioTip: '¡Con estos 4 bajos podés cantar más de 50 temas famosos seguidos!'
  },
  {
    id: 'harm-p-cadence-plagal',
    category: 'harmony',
    subCategory: 'Práctica de Teclado',
    lessonId: '8',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Cadencia Plagal (IV → I)',
    question: 'Toca los acordes de la Cadencia Plagal: primero F4-A4-C5, luego C4-E4-G4',
    type: 'piano',
    mode: 'sequence',
    targetKeys: ['F4', 'A4', 'C5'],
    fingerGuide: { 'F4': 1, 'A4': 3, 'C5': 5 },
    hint: 'Fa Mayor resolviendo a Do Mayor (el clásico "Amén").',
    aurelioTip: 'Una resolución suave y apacible, sin la urgencia punzante de la dominante.'
  },
  {
    id: 'harm-ear-7th-flavor',
    category: 'harmony',
    subCategory: 'Oído Armónico',
    lessonId: '12',
    moduleTitle: 'Armonía & Progresiones',
    lessonTitle: 'Reconocimiento de Séptimas',
    question: 'Escucha el acorde: ¿Es Maj7 (Séptima Mayor) o 7 (Dominante)?',
    type: 'ear',
    audioKeys: ['C4', 'E4', 'G4', 'B4'],
    audioStyle: 'chord',
    options: [
      'Acorde Maj7 (Dulce, suave, séptima mayor)',
      'Acorde 7 Dominante (Tensión de blues / tritono)'
    ],
    correctIndex: 0,
    explanation: 'Sonó C-E-G-B: la séptima mayor (Si) aporta esa textura etérea y cinematográfica.',
    aurelioTip: 'El Maj7 te hace suspirar; el Dominante 7 te pide resolver inmediatamente.'
  }
];

// ----------------------------------------------------------------------
// 4. GENERADOR PROCEDIMENTAL DINÁMICO
// Crea variaciones infinitas de ejercicios de escalas, acordes e inversiones
// ----------------------------------------------------------------------
const PROCEDURAL_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A'];

export function generateDynamicInversionExercise(unlockedLessonIds: Set<string>): QuickExercise {
  const root = PROCEDURAL_ROOTS[Math.floor(Math.random() * PROCEDURAL_ROOTS.length)];
  const isMinor = Math.random() > 0.6;
  const invType = Math.floor(Math.random() * 3) as 0 | 1 | 2;

  const notesChromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIdx = notesChromatic.indexOf(root);
  const thirdOffset = isMinor ? 3 : 4;
  const fifthOffset = 7;

  const rOctave = 4;
  const rNote = `${root}${rOctave}`;
  const thirdIdx = (rootIdx + thirdOffset) % 12;
  const thirdOctave = rootIdx + thirdOffset >= 12 ? rOctave + 1 : rOctave;
  const thirdNote = `${notesChromatic[thirdIdx]}${thirdOctave}`;

  const fifthIdx = (rootIdx + fifthOffset) % 12;
  const fifthOctave = rootIdx + fifthOffset >= 12 ? rOctave + 1 : rOctave;
  const fifthNote = `${notesChromatic[fifthIdx]}${fifthOctave}`;

  let keys: string[] = [];
  let bassNoteName = root;
  let invLabel = 'Estado Fundamental';
  let fingers: Record<string, number> = {};

  if (invType === 0) {
    keys = [rNote, thirdNote, fifthNote];
    bassNoteName = root;
    invLabel = 'Estado Fundamental (5/3)';
    fingers = { [rNote]: 1, [thirdNote]: 3, [fifthNote]: 5 };
  } else if (invType === 1) {
    const higherRoot = `${root}${rOctave + 1}`;
    keys = [thirdNote, fifthNote, higherRoot];
    bassNoteName = notesChromatic[thirdIdx];
    invLabel = '1ª Inversión (6)';
    fingers = { [thirdNote]: 1, [fifthNote]: 2, [higherRoot]: 5 };
  } else {
    const higherRoot = `${root}${rOctave + 1}`;
    const higherThird = `${notesChromatic[thirdIdx]}${thirdOctave + 1}`;
    keys = [fifthNote, higherRoot, higherThird];
    bassNoteName = notesChromatic[fifthIdx];
    invLabel = '2ª Inversión (6/4)';
    fingers = { [fifthNote]: 1, [higherRoot]: 3, [higherThird]: 5 };
  }

  const qualityStr = isMinor ? 'Menor' : 'Mayor';
  const chordFull = `${root} ${qualityStr}`;

  return {
    id: `dyn-inv-${root}-${qualityStr}-${invType}-${Date.now()}`,
    category: 'inversions',
    subCategory: 'Generador Infinito de Inversiones',
    lessonId: '10',
    moduleTitle: 'Inversiones & Voice Leading',
    lessonTitle: `${chordFull} en ${invLabel}`,
    question: `Toca ${chordFull} en ${invLabel} (Bajo: ${bassNoteName})`,
    type: 'piano',
    mode: 'chord',
    targetKeys: keys,
    fingerGuide: fingers,
    requiredBassNote: bassNoteName,
    hint: `Las 3 notas son: ${keys.map(k => k.replace(/\d/, '')).join(' - ')}. El bajo debe ser ${bassNoteName}.`,
    aurelioTip: `Para ${invLabel}, asegurate de que la nota más grave del acorde sea ${bassNoteName}.`
  };
}

export function generateDynamicScaleExercise(): QuickExercise {
  const rootObj = COMMON_SCALE_ROOTS[Math.floor(Math.random() * COMMON_SCALE_ROOTS.length)];
  const scale = SCALES_DATABASE[Math.floor(Math.random() * Math.min(SCALES_DATABASE.length, 4))];
  const allNotes = calculateScaleNotes(rootObj.note, scale);

  // Take first 5 notes of scale for dynamic rapid practice
  const segment = allNotes.slice(0, 5);
  const fingers: Record<string, number> = {};
  segment.forEach((n, idx) => {
    fingers[n] = scale.fingeringRightHand[idx] || (idx + 1);
  });

  return {
    id: `dyn-scale-${rootObj.note}-${scale.id}-${Date.now()}`,
    category: 'scales',
    subCategory: 'Generador Infinito de Escalas',
    lessonId: '5',
    moduleTitle: 'Escalas & Digitaciones',
    lessonTitle: `Escala de ${rootObj.label}`,
    question: `Toca las primeras 5 notas de la escala ${scale.name} en ${rootObj.note}: ${segment.map(n => n.replace(/\d/, '')).join(' → ')}`,
    type: 'piano',
    mode: 'sequence',
    targetKeys: segment,
    fingerGuide: fingers,
    hint: `Fórmula: ${scale.formula}. Seguí la digitación en cada tecla.`,
    aurelioTip: scale.mnemonic
  };
}
