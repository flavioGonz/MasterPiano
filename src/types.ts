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
  gym: 'scales' | 'classicalMethods' | 'circleSequence' | 'waterfall' | 'inversions' | 'earTraining' | 'chords' | 'sightReading';
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
  dictationScript: string;
  content: string;
  demonstrationNotes: string[];
  fingerGuide?: Record<string, number>;
  targetKeys: string[];
  image: string;
  /** Qué buscar en YouTube para esta lección. La elección concreta la hace el
   *  servidor y queda cacheada: cablear ids acá los deja podrir en silencio. */
  videoQuery?: string;
  /** Lleva al gimnasio donde se entrena lo que enseña la lección. */
  practice?: LessonPractice;
  evaluation: LessonEvaluation;
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
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 14%)',
    progressPercent: 5,
    title: '1. El Mapa del Piano y el Secreto del DO',
    level: 'Principiante',
    description: 'Aprende a ubicar todas las notas sin memorizar a ciegas usando los grupos de teclas negras.',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'tutorial piano como ubicar las notas grupos de dos y tres teclas negras principiantes',
    dictationScript: '¡Buenas! ¿Cómo andás? Soy Aurelio, tu maestro de piano. Mirá, a primera vista el teclado parece infinito con sus 88 teclas, pero en realidad es un patrón de apenas doce notas que se repite una y otra vez. Fijate en las teclas negras: vienen en grupitos de dos y de tres. Para encontrar el Do, buscá cualquier grupito de dos teclas negras: la tecla blanca que tenés pegadita a la izquierda es siempre un Do. Tocá los Do que encuentres para que tu oído y tu vista se vayan acostumbrando. ¡Vamos arriba!',
    demonstrationNotes: ['C3', 'C4', 'C5'],
    targetKeys: ['C3', 'C4', 'C5'],
    content: `
### Tu Primera Conexión con el Instrumento 

El piano no es un instrumento caótico: es pura **geometría acústica**.

#### 1. La Arquitectura de las 88 Teclas
- **52 teclas blancas** (notas naturales).
- **36 teclas negras** (sostenidos y bemoles).
- Las teclas negras están divididas en un patrón constante: **grupo de 2** seguido de **grupo de 3**.

#### 2. La Regla de Oro del DO (C)
1. Observa el teclado y localiza cualquier grupo de **dos teclas negras**.
2. Desliza tu dedo a la tecla blanca que está a su **izquierda directa**: ¡Ese es el **DO**!
3. El **Do Central (C4)** se encuentra justo en el centro del piano, enfrente de tu ombligo.

#### 3. Las Siete Hermanas
A partir de Do, las notas ascienden en orden alfabético:
**DO (C) → RE (D) → MI (E) → FA (F) → SOL (G) → LA (A) → SI (B) → DO (C)**

---
**Consejo del Maestro:**
No mires el teclado como 88 teclas individuales. Míralo como una escalera circular de 7 notas blancas y 5 negras que se repite en registros graves, medios y agudos.
    `,
    practice: { gym: 'waterfall', label: 'Ubicar el Do en la Catarata', hint: 'Las notas caen y las buscás en el teclado: es el mapa del piano en movimiento' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Dónde se encuentra ubicada la nota DO (C) en el teclado?',
          options: [
            'A la derecha del grupo de tres teclas negras',
            'Inmediatamente a la izquierda del grupo de dos teclas negras',
            'En el medio de las tres teclas negras',
            'En cualquier tecla negra'
          ],
          correctIndex: 1,
          explanation: 'Correcto. La nota Do siempre es la tecla blanca inmediatamente a la izquierda del grupo de dos teclas negras.'
        },
        {
          question: '¿Cuántas notas naturales diferentes forman la escala básica antes de repetirse en la siguiente octava?',
          options: ['12 notas', '8 notas', '7 notas (Do, Re, Mi, Fa, Sol, La, Si)', '5 notas'],
          correctIndex: 2,
          explanation: 'Son 7 notas blancas naturales (Do, Re, Mi, Fa, Sol, La, Si). La octava nota es el Do repetido más agudo.'
        }
      ],
      practicalTask: {
        instruction: 'Toca en el teclado virtual los tres DOs señalados: C3 (grave), C4 (central) y C5 (agudo).',
        requiredSequence: ['C3', 'C4', 'C5'],
        mode: 'sequence',
        hint: 'Busca las teclas blancas a la izquierda de cada grupo de dos teclas negras.'
      }
    }
  },
  {
    id: '2',
    number: 2,
    moduleNumber: 1,
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 14%)',
    progressPercent: 10,
    title: '2. Postura Biomecánica y Numeración de Dedos',
    level: 'Principiante',
    description: 'Protege tus tendones, adopta la postura del concertista y domina la numeración 1 al 5.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'postura correcta al piano y numeracion de los dedos del 1 al 5 tutorial',
    dictationScript: 'Mirá, che, la técnica no es para hacerse el virtuoso, es para tocar con libertad y no lastimarse los tendones. En el piano nos manejamos con números de dedos: el pulgar es el uno, el índice es el dos, el mayor es el tres, el anular es el cuatro y el meñique es el cinco. Poné la mano curva, como si estuvieras sosteniendo una mandarina o una pelota de tenis, y dejá que el peso del brazo caiga flojito sobre la tecla sin empujar. Sentate derecho y relajá los hombros.',
    demonstrationNotes: ['C4', 'D4', 'E4', 'F4', 'G4'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'E4': 3, 'F4': 4, 'G4': 5 },
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4'],
    content: `
### Biomecánica: El Secreto del Sonido Cantable 

Un sonido bello nace de la relajación corporal, no de la fuerza bruta.

#### 1. El Código Internacional de Dedos
Tanto para mano derecha como izquierda:
- **1:** Pulgar 
- **2:** Índice 
- **3:** Mayor / Medio 
- **4:** Anular 
- **5:** Meñique 

#### 2. La Forma de "Manzana" en la Mano
- Curva tus dedos suavemente. La última falange debe caer casi perpendicular a la tecla.
- El pulgar toca con su borde lateral exterior.
- La muñeca debe permanecer flexible como un amortiguador, a la misma altura del antebrazo.

#### 3. Posición de 5 Dedos (Do a Sol)
Coloca tu mano derecha:
- Dedo 1 en **C4 (Do)**
- Dedo 2 en **D4 (Re)**
- Dedo 3 en **E4 (Mi)**
- Dedo 4 en **F4 (Fa)**
- Dedo 5 en **G4 (Sol)**
    `,
    practice: { gym: 'classicalMethods', label: 'Hanon nº 1 en Métodos Clásicos', hint: 'Cinco dedos, mano quieta y peso de brazo: para eso se escribió' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la nomenclatura pianística universal, ¿a qué dedo corresponde el número 4?',
          options: ['Pulgar', 'Índice', 'Anular', 'Meñique'],
          correctIndex: 2,
          explanation: 'El dedo 4 es el anular. Es el dedo con menor independencia anatómica natural.'
        },
        {
          question: '¿Cómo debe ser la forma de los dedos sobre el teclado?',
          options: [
            'Totalmente estirados y planos',
            'Curvados naturalmente como sosteniendo una pelota o fruta pequeña',
            'Rígidos y tensionados hacia arriba',
            'Apoyando toda la palma en las teclas'
          ],
          correctIndex: 1,
          explanation: 'La curvatura natural protege los tendones y permite un ataque ágil con la yema del dedo.'
        }
      ],
      practicalTask: {
        instruction: 'Ejecuta el patrón de 5 dedos en orden ascendente: C4 (dedo 1), D4 (dedo 2), E4 (dedo 3), F4 (dedo 4) y G4 (dedo 5).',
        requiredSequence: ['C4', 'D4', 'E4', 'F4', 'G4'],
        mode: 'sequence',
        hint: 'Toca cada nota consecutivamente con articulación limpia.'
      }
    }
  },
  {
    id: '3',
    number: 3,
    moduleNumber: 1,
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 14%)',
    progressPercent: 14,
    title: '3. Pulso, Ritmo y Compás de 4/4',
    level: 'Principiante',
    description: 'El latido del corazón de la música. Domina las figuras rítmicas y el metrónomo.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'ritmo y compas de 4/4 para piano principiantes con metronomo clase',
    dictationScript: 'Mirá que las notas sin ritmo no dicen nada, che. El pulso es el corazón de la música, ese latido constante que te hace mover el pie sin darte cuenta. En un compás de cuatro cuartos contamos parejito: uno, dos, tres, cuatro. Una redonda dura cuatro tiempos enteros. Una blanca dura dos. Y una negra dura un pulso. Vamos a tocar sintiendo el ritmo en el cuerpo, bien acompasado. Dale, metéle ganas.',
    demonstrationNotes: ['C4', 'E4', 'G4', 'C5'],
    targetKeys: ['C4', 'E4', 'G4', 'C5'],
    content: `
### El Ritmo: La Fuerza Vital 

La música existe en el tiempo. Si dominas el tiempo, dominas la atención del oyente.

#### 1. El Compás de 4/4 (Cuatro Cuartos)
Es el compás más utilizado en la música moderna y clásica. Cada compás contiene **4 pulsos de negra**:
**| 1 - 2 - 3 - 4 | 1 - 2 - 3 - 4 |**

#### 2. Jerarquía de Figuras Rítmicas
- **Redonda:** Vale **4 pulsos**. La tocas en el 1 y la sostienes hasta el 4.
- **Blanca:** Vale **2 pulsos**. En un compás caben dos blancas (pulsos 1 y 3).
- **Negra:** Vale **1 pulso**. Tocas una nota en cada golpe del metrónomo.
- **Corcheas:** Dos notas por pulso ("y-un, y-dos, y-tres, y-cua").

#### 3. El Metrónomo es tu Mejor Amigo
Empieza siempre lento: a **60 BPM** (un golpe por segundo). No aumentes la velocidad hasta que no tengas precisión milimétrica.
    `,
    practice: { gym: 'waterfall', label: 'Tocar a tiempo en la Catarata', hint: 'Prendé el metrónomo y usá el modo Flujo para no perder el pulso' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'En un compás estándar de 4/4, ¿cuántos tiempos dura una figura Blanca?',
          options: ['1 tiempo', '2 tiempos', '4 tiempos', 'Medio tiempo'],
          correctIndex: 1,
          explanation: 'La blanca equivale a 2 tiempos (pulsos). Dos blancas completan un compás de 4/4.'
        },
        {
          question: 'Si una canción está a 60 BPM (beats por minuto), ¿cuánto dura cada pulso de negra?',
          options: ['Exactamente 1 segundo', '2 segundos', 'Medio segundo', '10 segundos'],
          correctIndex: 0,
          explanation: '60 pulsos en 60 segundos equivale a 1 pulso por segundo.'
        }
      ],
      practicalTask: {
        instruction: 'Toca la secuencia de notas Do-Mi-Sol-Do agudo (C4, E4, G4, C5) manteniendo un pulso constante y regular.',
        requiredSequence: ['C4', 'E4', 'G4', 'C5'],
        mode: 'sequence',
        hint: 'Toca cada nota con espacio regular entre ellas.'
      }
    }
  },

  // MÓDULO 2: Escalas, Intervalos y Lectura (20% - 40%)
  {
    id: '4',
    number: 4,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (14% - 43%)',
    progressPercent: 19,
    title: '4. Tonos y Semitonos: El ADN de las Escalas',
    level: 'Principiante',
    description: 'Aprende a medir distancias en el piano y descubre la fórmula secreta de las escalas mayores.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'tonos y semitonos en el piano explicacion facil teoria musical',
    dictationScript: 'Fijate que toda la música se construye sobre dos distancias básicas: el semitono y el tono. El semitono es la distancia más cortita entre dos teclas pegadas del piano, sean blancas o negras. Por ejemplo, de Mi a Fa tenés un semitono natural porque no hay tecla negra en el medio. Un tono entero son dos semitonos. Con la fórmula mágica: tono, tono, semitono, tono, tono, tono, semitono, armás la escala mayor de cualquier nota que se te ocurra. Mirá qué belleza.',
    demonstrationNotes: ['C4', 'D4', 'E4', 'F4'],
    targetKeys: ['C4', 'D4', 'E4', 'F4'],
    content: `
### La Geometría de los Intervalos 

Los intervalos son los ladrillos con los que se construye cualquier melodía o acorde.

#### 1. El Semitono (Medio Tono)
Es la distancia más pequeña entre dos teclas vecinas inmediatas:
- De **Do a Do#**: 1 semitono.
- De **Mi a Fa**: ¡1 semitono natural! (porque no hay tecla negra en medio).
- De **Si a Do**: ¡1 semitono natural!

#### 2. El Tono Entero (T)
Un Tono equivale a **2 semitonos** (saltando una tecla intermedia):
- De **Do a Re**: 1 Tono (salta la tecla negra C#).
- De **Fa a Sol**: 1 Tono.

#### 3. La Fórmula Mágica de la Escala Mayor
Desde cualquier nota raíz, aplica esta fórmula:
**TONO – TONO – SEMITONO – TONO – TONO – TONO – SEMITONO**
*(T - T - S - T - T - T - S)*
    `,
    practice: { gym: 'scales', label: 'Fórmula T–S en el Gimnasio de Escalas', hint: 'El modo que muestra la cadena de tonos y semitonos grado por grado' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Entre qué par de teclas blancas consecutivas existe una distancia natural de 1 SEMITONO?',
          options: ['Do y Re', 'Fa y Sol', 'Mi y Fa', 'Sol y La'],
          correctIndex: 2,
          explanation: 'Entre Mi y Fa (y entre Si y Do) no hay tecla negra intermedia, por lo que la distancia es de un semitono directo.'
        },
        {
          question: '¿Cuál es la fórmula interválica para construir cualquier Escala Mayor?',
          options: [
            'Tono - Semitono - Tono - Tono - Semitono - Tono - Tono',
            'Tono - Tono - Semitono - Tono - Tono - Tono - Semitono',
            'Semitono - Tono - Tono - Semitono - Tono - Tono - Tono',
            'Tono - Tono - Tono - Tono - Tono - Tono - Semitono'
          ],
          correctIndex: 1,
          explanation: 'T-T-S-T-T-T-S es la fórmula de la escala mayor diatónica.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el primer tetracordio de Do Mayor comprobando los intervalos (T-T-S): C4 (Tono) D4 (Tono) E4 (Semitono) F4.',
        requiredSequence: ['C4', 'D4', 'E4', 'F4'],
        mode: 'sequence',
        hint: 'Escucha cómo la distancia entre E4 y F4 suena más estrecha que las anteriores.'
      }
    }
  },
  {
    id: '5',
    number: 5,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (14% - 43%)',
    progressPercent: 24,
    title: '5. La Escala de Do Mayor y el Paso del Pulgar',
    level: 'Principiante',
    description: 'Domina la técnica legendaria del cruce del pulgar para tocar líneas melódicas continuas.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'escala de do mayor en piano digitacion y paso del pulgar tutorial',
    dictationScript: 'Mirá qué detalle curioso: tenemos solo cinco dedos en la mano, pero las escalas tienen siete notas y el teclado sigue de largo. ¿Cómo hacemos? Con el paso del pulgar, che. Tocás con la derecha los dedos uno, dos, tres, y apenas el tres toca el Mi, pasás el pulgar suavecito por abajo de la palma para tocar el Fa con el uno. Es el movimiento madre del piano clásico. Relajá la muñeca y practicalo con paciencia.',
    demonstrationNotes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    fingerGuide: { 'C4': 1, 'D4': 2, 'E4': 3, 'F4': 1, 'G4': 2, 'A4': 3, 'B4': 4, 'C5': 5 },
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    content: `
### La Escala Madre: Do Mayor 

La escala de Do Mayor no contiene ninguna tecla negra, lo que la convierte en el laboratorio perfecto para entrenar la articulación.

#### 1. Las 8 Notas de la Escala
**C (Do) - D (Re) - E (Mi) - F (Fa) - G (Sol) - A (La) - B (Si) - C (Do)**

#### 2. La Digitación Estándar (Mano Derecha)
- **C4:** Dedo 1 (Pulgar)
- **D4:** Dedo 2 (Índice)
- **E4:** Dedo 3 (Medio)
- **→ ¡PASO DEL PULGAR POR DEBAJO! ←**
- **F4:** Dedo 1 (Pulgar pasa por debajo de la mano)
- **G4:** Dedo 2
- **A4:** Dedo 3
- **B4:** Dedo 4
- **C5:** Dedo 5 (Meñique final)

#### 3. Regla de Oro del Paso del Pulgar
No levantes el codo de golpe. El pulgar debe comenzar a deslizarse hacia adentro mientras el dedo 2 y 3 están tocando, con un movimiento fluido y silencioso.
    `,
    practice: { gym: 'scales', label: 'Do mayor en el Gimnasio de Escalas', hint: 'Camino de notas con los números de dedo sobre las teclas' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la escala ascendente de Do Mayor con mano derecha, ¿después de qué nota pasa el pulgar por debajo?',
          options: ['Después de Sol (G)', 'Después de Mi (E)', 'Después de Do (C)', 'Al llegar a Si (B)'],
          correctIndex: 1,
          explanation: 'El pulgar pasa por debajo después de tocar Mi con el dedo 3, colocándose directamente sobre el Fa.'
        },
        {
          question: '¿Qué digitación completa se utiliza para tocar una octava de la escala de Do Mayor con mano derecha?',
          options: ['1-2-3-4-5-1-2-3', '1-2-3-1-2-3-4-5', '1-1-2-2-3-3-4-5', '5-4-3-2-1-3-2-1'],
          correctIndex: 1,
          explanation: '1-2-3-1-2-3-4-5 es la digitación clásica universal para la escala mayor con mano derecha.'
        }
      ],
      practicalTask: {
        instruction: 'Toca la escala completa de Do Mayor (C4 a C5) en orden ascendente.',
        requiredSequence: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
        mode: 'sequence',
        hint: 'Visualiza el cruce de pulgar entre E4 y F4.'
      }
    }
  },
  {
    id: '5b',
    number: 6,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (14% - 43%)',
    progressPercent: 29,
    title: '6. Las 5 familias de digitación: 12 escalas, 5 formas de mano',
    level: 'Principiante',
    description: 'Dejá de memorizar doce escalas sueltas: son cinco formas de mano que se repiten.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'digitacion de las escalas mayores en piano truco para memorizar',
    practice: { gym: 'scales', label: 'Practicar en el Gimnasio de Escalas', hint: 'Elegí Si mayor y seguí los números de dedo sobre las teclas' },
    dictationScript: 'Escuchame bien porque esto te ahorra meses. Nadie memoriza doce escalas nota por nota; los pianistas memorizan formas de mano. Y hay solo cinco. Dos leyes valen para las doce: el pulgar nunca pisa una tecla negra, y los dedos largos, el dos, el tres y el cuatro, prefieren las negras. Después está el faro: el cuarto dedo aparece una sola vez por octava. Si sabés dónde cae el cuatro, sabés la escala entera. Y una perla: Chopin no empezaba por Do mayor, empezaba por Si mayor. Do mayor es todo blanco, todo igual, no tiene relieve. Si mayor acomoda sola la mano.',
    demonstrationNotes: ['B4', 'C#5', 'D#5', 'E5', 'F#5', 'G#5', 'A#5', 'B5'],
    fingerGuide: { 'B4': 1, 'C#5': 2, 'D#5': 3, 'E5': 1, 'F#5': 2, 'G#5': 3, 'A#5': 4, 'B5': 5 },
    targetKeys: ['B4', 'C#5', 'D#5', 'E5', 'F#5', 'G#5', 'A#5', 'B5'],
    content: `
### Doce escalas, cinco formas de mano

Memorizar las doce escalas nota por nota es un mal negocio: son 84 notas sueltas. La memoria motora no guarda notas, guarda **grupos**. Y agrupadas, las doce escalas mayores se reducen a **cinco digitaciones**.

#### 1. Las dos leyes que valen para las doce

- **El pulgar nunca pisa una tecla negra.** Es corto: si sube a una negra, la mano se tuerce y el paso del pulgar se traba. Esta única ley explica casi todas las digitaciones "raras".
- **Los dedos largos prefieren las negras.** El 2, el 3 y el 4 llegan cómodos al fondo del teclado; el pulgar y el meñique se quedan adelante, en las blancas.

#### 2. El faro: el 4º dedo

El **4º dedo aparece una sola vez por octava** en cada mano. Es el punto de anclaje: si sabés dónde cae el 4, la digitación entera se reconstruye sola.

| Mano derecha | Dónde cae el 4º dedo |
|---|---|
| Do, Sol, Re, La, Mi, Si | Sobre la **sensible** (el 7º grado): Si, Fa#, Do#, Sol#, Re#, La# |
| Fa, Sib, Mib, Lab, Reb, Solb | Siempre sobre **Si♭**. Las seis. Sin excepción. |

Ese segundo renglón es de las cosas más útiles del piano: en todo el lado de los bemoles, tu 4º dedo derecho vive en Si♭.

#### 3. Las cinco familias

| Familia | Escalas | Mano derecha | Mano izquierda |
|---|---|---|---|
| **1. Do** | Do, Sol, Re, La, Mi | 1 2 3 1 2 3 4 5 | 5 4 3 2 1 3 2 1 |
| **2. Fa** | Fa | 1 2 3 4 1 2 3 4 | 5 4 3 2 1 3 2 1 |
| **3. Si** | Si | 1 2 3 1 2 3 4 5 | 4 3 2 1 4 3 2 1 |
| **4. Negras** | Reb, Mib, Lab, Sib | el 4 en Si♭ | 3 2 1 4 3 2 1 |
| **5. Solb** | Solb / Fa# | 2 3 4 1 2 3 1 | 4 3 2 1 3 2 1 |

Cinco escalas comparten una sola forma en las dos manos (familia Do). Cuatro más comparten la mano izquierda (familia Negras). No son doce problemas: son cinco.

#### 4. Por qué Chopin empezaba por Si mayor

Chopin hacía arrancar a sus alumnos por **Si mayor** con la derecha y **Reb mayor** con la izquierda, no por Do. Su razón sigue siendo válida:

- Las negras acomodan solos los dedos largos: la mano cae en su forma natural, con la muñeca en línea.
- **El pulgar pasa más fácil por debajo de una tecla negra** que entre dos blancas.
- Do mayor es todo blanco y todo parejo: no tiene relieve para orientar la mano. Sonar *parejo* en Do mayor es de lo más difícil que hay, no de lo más fácil.

Do mayor es la escala más fácil de **entender** y una de las más difíciles de **tocar bien**. Aprendela igual, pero no la uses de vara.
    `,
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la mano derecha, ¿sobre qué nota cae el 4º dedo en TODAS las escalas mayores del lado de los bemoles (Fa, Sib, Mib, Lab, Reb, Solb)?',
          options: ['Sobre la tónica', 'Sobre Si bemol, en las seis', 'Sobre la sensible', 'Cambia en cada escala'],
          correctIndex: 1,
          explanation: 'Las seis escalas con bemoles ponen el 4º dedo derecho en Si♭. Es un solo dato que resuelve media docena de digitaciones.'
        },
        {
          question: '¿Por qué Chopin hacía empezar por Si mayor y no por Do mayor?',
          options: [
            'Porque Si mayor tiene menos notas',
            'Porque las teclas negras acomodan los dedos largos y el pulgar pasa mejor por debajo de una negra',
            'Porque Do mayor no se usa en el repertorio',
            'Porque Si mayor se toca solo con la mano derecha'
          ],
          correctIndex: 1,
          explanation: 'Si mayor pone los dedos largos sobre las negras y deja pulgar y meñique en las blancas: la mano cae en su forma natural. Do mayor, todo blanco y parejo, no tiene relieve que oriente la mano.'
        },
        {
          question: '¿Cuál es la ley que explica casi todas las digitaciones de escalas?',
          options: ['El meñique nunca toca dos veces', 'El pulgar nunca pisa una tecla negra', 'Siempre se empieza con el 3', 'Las manos usan siempre el mismo dedo'],
          correctIndex: 1,
          explanation: 'El pulgar es corto: apoyarlo en una negra tuerce la mano y traba el pasaje. De ahí salen las digitaciones "raras" de las escalas con muchas alteraciones.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá las primeras cinco notas de Si mayor con la mano derecha: Si, Do#, Re#, Mi, Fa# (dedos 1-2-3-1-2).',
        requiredSequence: ['B4', 'C#5', 'D#5', 'E5', 'F#5'],
        mode: 'sequence',
        hint: 'Pulgar en Si, y el pulgar vuelve a pasar en Mi. Los dedos largos se quedan arriba, sobre las negras.'
      }
    }
  },
  {
    id: '5c',
    number: 7,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (14% - 43%)',
    progressPercent: 33,
    title: '7. El sistema de las 3 escalas del día',
    level: 'Principiante',
    description: 'Repetición espaciada e intercalada: por qué practicar peor hoy te hace tocar mejor el mes que viene.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'como practicar escalas de piano rutina diaria eficiente',
    practice: { gym: 'scales', label: 'Armar la ronda en el Gimnasio', hint: 'Tres modos distintos para recuperar la misma escala' },
    dictationScript: 'Te pasó, seguro: practicaste una escala treinta veces seguidas, te salió redonda, y al otro día no te acordabas. No es tu culpa ni tu memoria. Es que repetir en bloque se siente bárbaro y no deja nada. La práctica intercalada, mezclar tres escalas y rotar, se siente peor mientras la hacés y rinde más del doble a los dos días. Robert Bjork le puso nombre: dificultades deseables. Y una cosa más: antes de poner las manos, decí en voz alta las siete notas. Ese esfuerzo de acordarte es lo que fija, no la repetición.',
    demonstrationNotes: ['A5', 'G#5', 'F#5', 'E5', 'D5', 'C#5', 'B4', 'A4'],
    fingerGuide: { 'A4': 1, 'B4': 2, 'C#5': 3, 'D5': 1, 'E5': 2, 'F#5': 3, 'G#5': 4, 'A5': 5 },
    targetKeys: ['A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5'],
    content: `
### Por qué se te borra lo que ayer te salía

La curva del olvido de Ebbinghaus tiene 140 años y sigue vigente: lo que entra de golpe se va de golpe. Treinta repeticiones seguidas de la misma escala producen una ejecución excelente **hoy** y un recuerdo pobre **mañana**. Eso tiene nombre: la brecha entre la sala de estudio y el escenario.

#### 1. Práctica intercalada: se siente peor, rinde el doble

En el estudio clásico con bateadores, la práctica **en bloque** (mismo lanzamiento treinta veces) dio 25 % de mejora en dos días. La práctica **intercalada** (lanzamientos mezclados al azar) dio 57 %: más del doble. Lo mismo se replicó con pianistas aprendiendo piezas.

El detalle importante: **durante** la práctica intercalada te sentís peor. Fallás más, dudás más. Robert Bjork lo llamó *dificultades deseables*: el esfuerzo extra es exactamente el que construye memoria duradera. Si tu práctica se siente cómoda, probablemente no estés aprendiendo.

#### 2. Recuperar antes de tocar

Antes de apoyar las manos, **decí en voz alta** las siete notas de la escala y dónde cae el 4º dedo. Sin mirar. El esfuerzo de sacarla de la memoria es lo que la fija; leerla o repetirla no.

Es la diferencia entre **reconocer** y **recordar**. En el escenario solo sirve lo segundo.

#### 3. El sistema de las 3 escalas del día

Tres cajones, como una caja de Leitner:

| Cajón | Qué hay | Cada cuánto |
|---|---|---|
| **1 · Nuevas** | Las que todavía se traban | Todos los días |
| **2 · En proceso** | Salen, pero pensando | Día por medio |
| **3 · Firmes** | Salen solas | Una vez por semana |

**La sesión:** elegí **una escala de cada cajón**. Rondas de 2 minutos rotando A → B → C, A → B → C, A → B → C. Nunca veinte minutos seguidos de la misma.

**El ascenso:** si sale limpia dos días seguidos, sube de cajón. Un solo tropiezo y vuelve al cajón 1. Sin negociar.

#### 4. Práctica variable: cambiá algo en cada ronda

Repetir idéntico entrena una sola versión del movimiento. Cambiá **una** cosa por ronda:

- **Ritmo:** galope largo-corto, después corto-largo.
- **Articulación:** todo ligado, después todo picado.
- **Dinámica:** creciendo hacia la cima, decreciendo a la vuelta.
- **Dirección:** empezá desde arriba.
- **Manos:** separadas, juntas, y en movimiento contrario.

#### 5. Dormí sobre eso

La consolidación motora ocurre mientras dormís. **20 minutos por día durante 5 días rinden mucho más que 100 minutos en un día.** No hay técnica de estudio que le gane a distribuir las horas.

> Los tres modos del Gimnasio de Escalas —Camino de notas, Nota faltante y Fórmula T–S— son tres formas distintas de recuperar la misma escala. Rotá entre ellos: eso ya es práctica intercalada.
    `,
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'Comparando práctica en bloque contra práctica intercalada, ¿qué encontró la investigación?',
          options: [
            'La práctica en bloque rinde más porque se siente mejor',
            'La intercalada se siente peor mientras se practica, pero da más del doble de mejora a los dos días',
            'Son equivalentes',
            'La intercalada solo sirve para deportistas'
          ],
          correctIndex: 1,
          explanation: 'Mezclar tareas produce más errores durante la práctica y mucha más retención después. La sensación de fluidez del bloque es un espejismo.'
        },
        {
          question: '¿Qué conviene hacer ANTES de apoyar las manos sobre la escala del día?',
          options: [
            'Mirar la digitación en el papel',
            'Recordarla en voz alta —las notas y dónde cae el 4º dedo— sin mirar',
            'Tocarla diez veces rápido para entrar en calor',
            'Poner el metrónomo al doble de velocidad'
          ],
          correctIndex: 1,
          explanation: 'La recuperación activa desde la memoria es lo que fija. Leer o repetir sin esfuerzo de recordar deja mucho menos.'
        },
        {
          question: 'Tenés 100 minutos por semana para escalas. ¿Cómo los repartís?',
          options: ['Todo junto un día', '50 y 50 en dos días', '20 minutos por día durante 5 días', 'Da lo mismo'],
          correctIndex: 2,
          explanation: 'La consolidación ocurre entre sesiones, sobre todo durmiendo. Distribuir siempre le gana a acumular.'
        }
      ],
      practicalTask: {
        instruction: 'Ronda de práctica variable: tocá La mayor DESCENDENTE, desde arriba: La, Sol#, Fa#, Mi, Re.',
        requiredSequence: ['A5', 'G#5', 'F#5', 'E5', 'D5'],
        mode: 'sequence',
        hint: 'Empezar desde arriba obliga a recuperar la escala en vez de dejarla correr de memoria motora.'
      }
    }
  },
  {
    id: '5d',
    number: 8,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (14% - 43%)',
    progressPercent: 38,
    title: '8. Práctica mental y audiación',
    level: 'Intermedio',
    description: 'Memorizar la escala sin tocarla: dónde poner la atención y cómo ensayar con la cabeza.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'practica mental sin instrumento y audiacion para musicos',
    dictationScript: 'Los pianistas de concierto estudian en el avión, sin piano. No es pose. Cuando imaginás un movimiento con detalle, con el tacto y el sonido, se activan casi las mismas áreas del cerebro que cuando lo hacés. Ahora, la clave está en dónde ponés la atención. Si pensás en tus dedos, tocás peor. Si pensás en el sonido que sale y en el fondo de la tecla, tocás mejor. Es de los resultados más repetidos del aprendizaje motor y casi nadie se lo dice a un pianista.',
    demonstrationNotes: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
    fingerGuide: { 'G4': 1, 'A4': 2, 'B4': 3, 'C5': 1, 'D5': 2, 'E5': 3, 'F#5': 4, 'G5': 5 },
    targetKeys: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
    content: `
### Estudiar sin piano

Imaginar un movimiento con suficiente detalle activa casi las mismas áreas motoras que ejecutarlo. Por eso los concertistas estudian en el avión y en la sala de espera. No reemplaza al teclado; lo multiplica.

#### 1. Las tres capas de la memoria de una escala

Una escala bien memorizada está guardada de tres formas distintas. Si una falla, las otras dos te sostienen:

1. **Verbal** — podés *nombrar* las siete notas y sus alteraciones sin tocar.
2. **Auditiva (audiación)** — podés *escucharla por dentro* antes de que suene.
3. **Motora** — la mano *sabe la forma*: la distancia, el peso, dónde pasa el pulgar.

La mayoría de los estudiantes guardan solo la tercera. Por eso, cuando la mano se traba, no queda nada abajo.

#### 2. El protocolo de 90 segundos

Sin piano, con los ojos cerrados:

- **30 s — nombrar.** Decí las siete notas y dónde cae el 4º dedo.
- **30 s — cantar.** Cantá la escala con los grados: 1-2-3-4-5-6-7-8. Con la voz, aunque desafines.
- **30 s — sentir.** Imaginá la mano tocándola **en primera persona**: el tacto de la tecla, el fondo, el sonido. No te veas de afuera como en un video; sentilo desde adentro.

#### 3. Dónde poner la atención (esto cambia todo)

Uno de los hallazgos más replicados del aprendizaje motor: el **foco externo** —el sonido que sale, el fondo de la tecla, la línea que dibuja la frase— produce mejor ejecución y mejor retención que el **foco interno** —mis dedos, mi muñeca, mi pulgar—.

Traducido: en vez de *"que el pulgar pase limpio"*, pensá *"que el Fa suene igual de parejo que el Mi"*. Sale mejor, y encima se aprende mejor.

#### 4. La escala fantasma

Tocá la escala completa **sobre la tapa cerrada del piano**, con la digitación exacta y el tempo real. Sin sonido no hay nada que te tape los errores de movimiento: los sentís. Después tocala de verdad. La diferencia se nota en la primera pasada.
    `,
    practice: { gym: 'earTraining', label: 'Oído: Intervalos y Tríadas', hint: 'Audiar es oír antes de tocar; acá se comprueba si lo que oíste era lo que era' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'Mientras tocás una escala, ¿dónde conviene poner la atención?',
          options: [
            'En los dedos y la muñeca (foco interno)',
            'En el sonido que sale y el fondo de la tecla (foco externo)',
            'En la partitura, siempre',
            'En contar las repeticiones'
          ],
          correctIndex: 1,
          explanation: 'El foco externo —el resultado sonoro— da mejor ejecución y mejor retención que el foco interno en los propios movimientos. Es uno de los resultados más replicados del aprendizaje motor.'
        },
        {
          question: '¿Cómo conviene imaginar el movimiento en la práctica mental?',
          options: [
            'Viéndote de afuera, como en un video',
            'En primera persona, con el tacto de la tecla y el sonido',
            'Solo leyendo las notas mentalmente',
            'Contando el ritmo en voz alta'
          ],
          correctIndex: 1,
          explanation: 'La imagen motora en primera persona, con sensación táctil y sonido, es la que activa el sistema motor. Verse desde afuera es una imagen visual, no motora.'
        }
      ],
      practicalTask: {
        instruction: 'Sin mirar el teclado, recordá Sol mayor completa. Después tocá una sola nota: aquella donde cae el 4º dedo de la mano derecha.',
        requiredSequence: ['F#5'],
        mode: 'sequence',
        hint: 'En el lado de los sostenidos, el 4º dedo derecho cae en la sensible: el 7º grado de la escala.'
      }
    }
  },
  {
    id: '6',
    number: 9,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (14% - 43%)',
    progressPercent: 43,
    title: '9. Lectura Musical: El Gran Pentagrama y Claves',
    level: 'Principiante',
    description: 'Decodifica la notación clásica sin estrés: Clave de Sol para la derecha y Clave de Fa para la izquierda.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'leer partitura de piano clave de sol y clave de fa pentagrama principiantes',
    dictationScript: 'Che, leer partituras no es ningún cuco, pensalo como un mapa de la ciudad. El gran pentagrama junta dos sistemas de cinco líneas: arriba la Clave de Sol para la mano derecha y los agudos, y abajo la Clave de Fa para la mano izquierda y los graves. Y justo en el medio, como un puente uniendo los dos mundos, está el Do Central con su propia rayita. Miralo con calma, que el ojo se acostumbra enseguida.',
    demonstrationNotes: ['C4', 'G4', 'C3'],
    targetKeys: ['C3', 'C4', 'G4'],
    content: `
### El Lenguaje Escrito de la Música 

No le temas a la partitura: es simplemente un gráfico de coordenadas. El eje vertical indica la altura (agudo o grave) y el eje horizontal el tiempo.

#### 1. La Clave de Sol (Mano Derecha / Registro Agudo)
- Nace en la **segunda línea** del pentagrama, indicando que esa línea es la nota **Sol (G4)**.
- Se utiliza para melodías y acordes medios y agudos.

#### 2. La Clave de Fa (Mano Izquierda / Registro Grave)
- Los dos puntos encierran la **cuarta línea**, indicando que es la nota **Fa (F3)**.
- Se utiliza para los bajos y el soporte armónico.

#### 3. El Do Central (C4)
El Do central se dibuja con una **línea adicional** flotante entre ambos pentagramas. Es el centro neurálgico que conecta ambas manos.
    `,
    practice: { gym: 'sightReading', label: 'Lectura de Partituras', hint: 'Reconocer la nota en el pentagrama y tocarla, en las dos claves' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué nota musical define la segunda línea del pentagrama en la Clave de Sol?',
          options: ['Do', 'Mi', 'Sol', 'La'],
          correctIndex: 2,
          explanation: 'La Clave de Sol se dibuja alrededor de la segunda línea y fija esa posición para la nota Sol (G4).'
        },
        {
          question: '¿En qué registro y con qué mano se toca comúnmente la Clave de Fa?',
          options: [
            'Registro agudo con mano derecha',
            'Registro grave con mano izquierda',
            'Solo con los pies en los pedales',
            'Únicamente teclas negras'
          ],
          correctIndex: 1,
          explanation: 'La Clave de Fa representa las frecuencias graves y se asigna habitualmente a la mano izquierda.'
        }
      ],
      practicalTask: {
        instruction: 'Toca los 3 pilares del Gran Pentagrama: F3 (referencia clave de Fa), C4 (Do central) y G4 (referencia clave de Sol).',
        requiredSequence: ['F3', 'C4', 'G4'],
        mode: 'sequence',
        hint: 'Toca F3 en el registro grave, C4 en el centro y G4 en el agudo.'
      }
    }
  },

  // MÓDULO 3: Acordes y Tríadas (40% - 60%)
  {
    id: '7',
    number: 10,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (43% - 57%)',
    progressPercent: 48,
    title: '10. Anatomía de la Tríada: Mayor vs Menor',
    level: 'Principiante',
    description: 'Comprende la emoción armónica: por qué un acorde suena radiante o melancólico.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'acordes mayores y menores en piano diferencia triadas tutorial',
    dictationScript: 'Un acorde es un coro de notas sonando al mismo tiempo, che. La tríada básica tiene tres notas: la fundamental que le da el nombre, la tercera que define el sentimiento, y la quinta que le da estabilidad. En Do Mayor tocamos Do, Mi y Sol. Si a ese Mi lo bajás apenas un semitono a Mi bemol, el acorde se transforma en Do menor, melancólico e íntimo. Mirá cómo un milímetro de diferencia cambia toda la emoción del alma.',
    demonstrationNotes: ['C4', 'E4', 'G4'],
    fingerGuide: { 'C4': 1, 'E4': 3, 'G4': 5 },
    targetKeys: ['C4', 'D#4', 'E4', 'G4'],
    content: `
### El Nacimiento de la Armonía 

La armonía ocurre cuando dos o más notas suenan al mismo tiempo creando consonancia o disonancia.

#### 1. Cómo se Construye una Tríada Básica
Se apilan terceras sobre una nota raíz:
- **Raíz (1):** Da nombre al acorde (ej. Do).
- **Tercera (3):** Define la emoción (Mayor = luminosa, Menor = introspectiva).
- **Quinta (5):** Da peso y resonancia (Quinta Justa = 7 semitonos).

#### 2. Do Mayor (C)
- **Do (C4) + Mi (E4) + Sol (G4)**
- Distancias: 4 semitonos (Tercera Mayor) + 3 semitonos (Tercera Menor).

#### 3. Do Menor (Cm)
- **Do (C4) + Mi♭ (D#4) + Sol (G4)**
- Distancias: 3 semitonos (Tercera Menor) + 4 semitonos (Tercera Mayor).
- Digitación recomendada: **1 - 3 - 5**.
    `,
    practice: { gym: 'earTraining', label: 'Oído: Intervalos y Tríadas', hint: 'Distinguir mayor de menor a ciegas es la prueba de que entendiste la tercera' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué nota distingue a un acorde de Do Mayor de uno de Do Menor?',
          options: [
            'La quinta (Sol se mueve a Fa)',
            'La tercera (Mi baja medio tono a Mi bemol / D#)',
            'La raíz (Do sube a Re)',
            'Ninguna, suenan idénticos'
          ],
          correctIndex: 1,
          explanation: 'La tercera es la nota modal que define el carácter mayor (Mi) o menor (Mi bemol).'
        },
        {
          question: '¿Qué dedos se recomiendan para tocar una tríada en posición fundamental con la mano derecha?',
          options: ['1 - 2 - 3', '1 - 3 - 5', '2 - 3 - 4', '3 - 4 - 5'],
          correctIndex: 1,
          explanation: 'El pulgar (1), medio (3) y meñique (5) dejan un dedo libre entre medias para una posición relajada.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el acorde de Do Mayor simultáneamente: C4, E4 y G4 con dedos 1-3-5.',
        requiredSequence: ['C4', 'E4', 'G4'],
        mode: 'chord',
        hint: 'Presiona las tres teclas juntas buscando que suenen niveladas.'
      }
    }
  },
  {
    id: '8',
    number: 11,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (43% - 57%)',
    progressPercent: 52,
    title: '11. Los 7 Acordes Diatónicos de la Tonalidad',
    level: 'Intermedio',
    description: 'Descubre la familia completa de acordes que nacen de las teclas blancas.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'acordes diatonicos y campo armonico en piano tutorial',
    dictationScript: 'Mirá qué maravilla: cada una de las siete notas de la escala de Do puede ser la raíz de su propio acorde usando solo las teclas blancas. Si subís por el teclado manteniendo la posición fija de dedos uno, tres y cinco, vas a sacar los siete acordes de la tonalidad: Do Mayor, Re menor, Mi menor, Fa Mayor, Sol Mayor, La menor y Si disminuido. Acordate de los grados romanos, que con eso sacás cualquier tema de oído.',
    demonstrationNotes: ['C4', 'E4', 'G4', 'D4', 'F4', 'A4', 'E4', 'G4', 'B4'],
    targetKeys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'],
    content: `
### La Familia Armónica Diatónica 

En cualquier tonalidad mayor, los acordes formados sobre cada grado tienen una cualidad inmutable:

| Grado | Nombre Romano | Acorde en Do | Cualidad | Emoción / Rol |
|---|---|---|---|---|
| **I** | Tónica | **C (Do Mayor)** | Mayor | Hogar, reposo absoluto |
| **ii** | Supertónica | **Dm (Re menor)** | Menor | Movimiento suave |
| **iii** | Mediante | **Em (Mi menor)** | Menor | Nostálgico, transición |
| **IV** | Subdominante | **F (Fa Mayor)** | Mayor | Apertura, impulso |
| **V** | Dominante | **G (Sol Mayor)** | Mayor | Tensión máxima, pide resolver a I |
| **vi** | Relativo Menor | **Am (La menor)** | Menor | Melancolía reflexiva |
| **vii°** | Sensible | **Bdim (Si disminuido)** | Disminuido | Alta inestabilidad |
    `,
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Los siete grados de la tonalidad, uno atrás de otro y contra reloj' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la tonalidad de Do Mayor, ¿cuáles son los tres acordes MAYORES principales?',
          options: ['Dm, Em, Am', 'C, F, G (Grados I, IV y V)', 'C, Dm, Em', 'Am, Bdim, C'],
          correctIndex: 1,
          explanation: 'Los grados I (C), IV (F) y V (G) son los tres pilares mayores de la tonalidad.'
        },
        {
          question: '¿Cuál es el acorde relativo menor (grado vi) de Do Mayor?',
          options: ['Re menor (Dm)', 'Mi menor (Em)', 'La menor (Am)', 'Fa menor (Fm)'],
          correctIndex: 2,
          explanation: 'La menor (Am) es el grado vi y comparte dos notas idénticas con Do Mayor (Do y Mi).'
        }
      ],
      practicalTask: {
        instruction: 'Toca los tres acordes mayores pilares en sucesión: C (C4, E4, G4), luego F (F4, A4, C5), y finalmente G (G4, B4, D5).',
        requiredSequence: ['C4', 'E4', 'G4', 'F4', 'A4', 'C5', 'G4', 'B4', 'D5'],
        mode: 'sequence',
        hint: 'I (Do Mayor) - IV (Fa Mayor) - V (Sol Mayor).'
      }
    }
  },
  {
    id: '9',
    number: 12,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (43% - 57%)',
    progressPercent: 57,
    title: '12. La Progresión de Oro: I - V - vi - IV',
    level: 'Intermedio',
    description: 'La fórmula armónica detrás de cientos de éxitos mundiales desde los Beatles hasta el pop actual.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'progresion de acordes 1 5 6 4 en piano tutorial cancion',
    dictationScript: 'Che, si te aprendés esta progresión te juro que podés acompañar más de cien temas famosos de corrido. Es la progresión uno, cinco, seis menor, cuatro. En Do Mayor tocamos: Do Mayor, Sol Mayor, La menor y Fa Mayor. Escuchá cómo viaja la energía: de la paz del Do al brillo del Sol, a la nostalgia del La menor y al despegue del Fa. Una fórmula redonda que nunca falla.',
    demonstrationNotes: ['C4', 'E4', 'G4', 'G3', 'B3', 'D4', 'A3', 'C4', 'E4', 'F3', 'A3', 'C4'],
    targetKeys: ['C4', 'E4', 'G4', 'A4', 'F4', 'B4', 'D4'],
    content: `
### El Santo Grial de las Canciones 

La progresión **I - V - vi - IV** es el ciclo armónico más exitoso en la historia de la música comercial:
- *Let It Be* (The Beatles)
- *Someone Like You* (Adele)
- *Don't Stop Believin'* (Journey)
- *Despacito* (Luis Fonsi)

#### Los 4 Pasos del Viaje
1. **I (Do Mayor):** Casa, seguridad.
2. **V (Sol Mayor):** La aventura, energía elevada.
3. **vi (La menor):** El obstáculo, emoción introspectiva.
4. **IV (Fa Mayor):** La resolución esperanzadora que nos impulsa de vuelta a casa.
    `,
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'I–V–vi–IV: la progresión sale cuando los cuatro acordes salen sin pensar' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué acordes componen la progresión I - V - vi - IV en tonalidad de Do Mayor?',
          options: [
            'C - Dm - Em - F',
            'C - G - Am - F',
            'C - F - G - C',
            'Am - F - C - G'
          ],
          correctIndex: 1,
          explanation: 'I es Do (C), V es Sol (G), vi es La menor (Am), y IV es Fa (F).'
        },
        {
          question: '¿Por qué esta progresión resulta tan magnética para el cerebro humano?',
          options: [
            'Porque solo usa dos notas',
            'Porque equilibra acordes mayores luminosos con el relativo menor melancólico en un ciclo continuo',
            'Porque se toca únicamente con una mano',
            'Porque es disonante'
          ],
          correctIndex: 1,
          explanation: 'La alternancia entre el reposo de la tónica, la fuerza del dominante y la profundidad del relativo menor crea un balance perfecto.'
        }
      ],
      practicalTask: {
        instruction: 'Ejecuta las notas raíces de la progresión de oro en orden: C4, G4, A4 y F4.',
        requiredSequence: ['C4', 'G4', 'A4', 'F4'],
        mode: 'sequence',
        hint: 'I (Do) → V (Sol) → vi (La) → IV (Fa).'
      }
    }
  },

  // MÓDULO 4: Inversiones y Conducción de Voces (60% - 80%)
  {
    id: '10',
    number: 13,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (57% - 81%)',
    progressPercent: 62,
    title: '13. Inversiones y el Arte del Voice Leading',
    level: 'Intermedio',
    description: 'Elimina los saltos bruscos de la mano y conecta acordes con la elegancia de un profesional.',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'inversiones de acordes en piano y conduccion de voces tutorial',
    dictationScript: 'Mirá, un pianista principiante pega saltos bruscos con toda la mano para cambiar de acorde. En cambio, un maestro apenas mueve los dedos unos milímetros. Eso se logra con las inversiones, che. En vez de tocar siempre la raíz abajo, damos vuelta las notas del acorde. En Do Mayor tenés: posición fundamental Do-Mi-Sol, primera inversión Mi-Sol-Do, y segunda inversión Sol-Do-Mi. Son las mismas notas pero con una suavidad hermosa.',
    demonstrationNotes: ['C4', 'E4', 'G4', 'E4', 'G4', 'C5', 'G4', 'C5', 'E5'],
    targetKeys: ['C4', 'E4', 'G4', 'C5', 'E5'],
    content: `
### ¿Qué es una Inversión? 

Invertir un acorde consiste en cambiar el orden vertical de sus notas, colocando como bajo una nota distinta a la raíz.

#### 1. Las Tres Posiciones de una Tríada
Para el acorde de **Do Mayor (C)**:
- **Posición Fundamental (5/3):** **C - E - G** (El Do es la nota más grave).
- **1ª Inversión (6/3):** **E - G - C** (El Mi es la nota más grave; Do se desplazó una octava arriba).
- **2ª Inversión (6/4):** **G - C - E** (El Sol es la nota más grave).

#### 2. El Principio del Camino Más Corto (Voice Leading)
Al pasar de **Do Mayor** a **Fa Mayor**:
- *Forma novata:* C (C-E-G) y saltar a F (F-A-C). ¡La mano vuela 4 teclas!
- *Forma maestra:* C (C-E-G) pasa a F en 2ª inversión (**C-F-A**). ¡El pulgar se queda quieto en Do y los otros dedos solo se abren un semitono y un tono!
    `,
    practice: { gym: 'inversions', label: 'Tríadas e Inversiones', hint: 'Las tres posiciones del mismo acorde, que es de lo que vive el voice leading' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cuáles son las notas de Do Mayor en su PRIMERA INVERSIÓN?',
          options: ['C - E - G', 'E - G - C', 'G - C - E', 'E - C - G'],
          correctIndex: 1,
          explanation: 'La 1ª inversión coloca la tercera (Mi) en el bajo, quedando Mi - Sol - Do.'
        },
        {
          question: '¿Cuál es la principal ventaja técnica y musical de utilizar inversiones?',
          options: [
            'Hacer que el piano suene desafinado',
            'Permitir transiciones suaves con mínimo movimiento de la mano (Voice Leading)',
            'Tocar únicamente con la mano izquierda',
            'Eliminar notas del acorde'
          ],
          correctIndex: 1,
          explanation: 'Las inversiones optimizan la ergonomía de la mano y producen una textura armónica refinada y conectada.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el acorde de Do Mayor en 1ª Inversión: E4, G4 y C5 de forma simultánea.',
        requiredSequence: ['E4', 'G4', 'C5'],
        mode: 'chord',
        hint: 'Mi en el bajo, Sol en el medio y Do agudo en la cima.'
      }
    }
  },
  {
    id: '10b',
    number: 14,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (57% - 81%)',
    progressPercent: 67,
    title: '14. La regla de la cuarta',
    level: 'Intermedio',
    description: 'Reconocer cualquier inversión en un segundo, en el papel y bajo los dedos.',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'como identificar inversiones de acordes truco teoria musical',
    practice: { gym: 'inversions', label: 'Practicar en Tríadas e Inversiones', hint: 'Carrusel de posiciones y reconocimiento de oído' },
    dictationScript: 'Te muestro un truco que vale por un semestre. Mirás Mi, Sol, Do y tardás en darte cuenta de que es Do mayor. Bueno: buscá el único intervalo de cuarta que hay en el acorde. La nota de arriba de esa cuarta es la fundamental. Sol a Do es cuarta, arriba está Do, entonces es Do mayor. Siempre. Y si no hay ninguna cuarta, si son dos terceras, estás en posición fundamental. Con eso resolvés cualquier tríada mayor, menor o disminuida en un segundo.',
    demonstrationNotes: ['C4', 'E4', 'G4', 'E4', 'G4', 'C5', 'G4', 'C5', 'E5'],
    targetKeys: ['C4', 'E4', 'G4', 'C5', 'E5'],
    content: `
### El único intervalo que hay que buscar

Reconocer que **Mi-Sol-Do** es Do mayor no debería costar tres segundos. Con una sola regla cuesta uno.

#### 1. La regla de la cuarta

En una tríada, buscá el **único intervalo de cuarta**. La nota que está **arriba** de esa cuarta es la **fundamental**.

| Acorde | ¿Hay cuarta? | Fundamental | Posición |
|---|---|---|---|
| **Do - Mi - Sol** | No: 3ª + 3ª | Do (la de abajo) | Fundamental |
| **Mi - Sol - Do** | Sí: Sol → Do | **Do** | 1ª inversión |
| **Sol - Do - Mi** | Sí: Sol → Do | **Do** | 2ª inversión |

Si **no hay cuarta** —son dos terceras apiladas— estás en posición fundamental y la raíz es la nota más grave. Listo: no hay un cuarto caso.

Funciona igual en tríadas **mayores, menores y disminuidas**.

> **La excepción honesta:** la tríada **aumentada** (Do-Mi-Sol#) está hecha solo de terceras mayores en todas sus posiciones. Ahí la regla no aplica —y esa es justamente la razón de que la aumentada suene flotante y sin centro: no hay nada en su estructura que señale una fundamental.

#### 2. La misma regla para las séptimas

En un acorde de séptima, buscá el **intervalo de segunda**. La nota de arriba de la segunda es la fundamental.

- **Mi - Sol - Si♭ - Do** → Si♭ y Do son segunda; arriba está **Do** → es Do7 en 1ª inversión.

#### 3. Las tres formas al tacto

La mano no lee: siente distancias. Aprendé las tres formas como tres aperturas distintas:

| Posición | Estructura | Sensación en la mano |
|---|---|---|
| **Fundamental** | 3ª + 3ª | pareja, cerrada |
| **1ª inversión** | 3ª + 4ª | el hueco está **arriba** |
| **2ª inversión** | 4ª + 3ª | el hueco está **abajo** |

Con esas tres aperturas y la ubicación de la fundamental, tocás cualquier tríada en cualquier posición sin deletrear las notas.

#### 4. En el pentagrama: el muñeco de nieve

En posición fundamental las tres notas quedan **las tres en línea o las tres en espacio**: un muñeco de nieve prolijo. Si el patrón se rompe, hay inversión, y la regla de la cuarta te dice cuál.
    `,
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'En el acorde Sol - Do - Mi, ¿cuál es la fundamental y en qué posición está?',
          options: [
            'Sol, en posición fundamental',
            'Do, en 2ª inversión',
            'Mi, en 1ª inversión',
            'Do, en 1ª inversión'
          ],
          correctIndex: 1,
          explanation: 'Sol → Do es el intervalo de cuarta; arriba está Do, así que la fundamental es Do. Con la quinta (Sol) en el bajo, es Do mayor en 2ª inversión.'
        },
        {
          question: '¿En qué tríada NO funciona la regla de la cuarta?',
          options: ['En la menor', 'En la disminuida', 'En la aumentada', 'En la mayor con séptima'],
          correctIndex: 2,
          explanation: 'La tríada aumentada está formada solo por terceras mayores en todas sus inversiones: no contiene ninguna cuarta que señale la fundamental. Por eso suena sin centro tonal.'
        },
        {
          question: 'En un acorde de séptima invertido, ¿qué intervalo buscás?',
          options: ['La cuarta', 'La segunda: la nota de arriba es la fundamental', 'La quinta', 'La séptima mayor'],
          correctIndex: 1,
          explanation: 'En las séptimas el "hueco" cambia de tamaño: el intervalo de segunda es el que delata la fundamental, que es su nota superior.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá simultáneamente Sol - Do - Mi (Do mayor en 2ª inversión): G4, C5 y E5.',
        requiredSequence: ['G4', 'C5', 'E5'],
        mode: 'chord',
        hint: 'La cuarta está abajo (Sol → Do) y la tercera arriba: es la forma "hueco abajo".'
      }
    }
  },
  {
    id: '10c',
    number: 15,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (57% - 81%)',
    progressPercent: 71,
    title: '15. El carrusel de las 12 tonalidades',
    level: 'Intermedio',
    description: 'Un drill de una octava que fija I-IV-V con inversiones en las doce, sin saltos de mano.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'practicar acordes en las 12 tonalidades ejercicio de piano',
    practice: { gym: 'inversions', label: 'Correr el carrusel', hint: 'Tríadas e Inversiones: las tres posiciones en las doce tonalidades' },
    dictationScript: 'Este es el ejercicio que más rinde por minuto en todo el piano popular. Do mayor, Fa mayor, Sol mayor, los tres acordes de casi cualquier canción, tocados en una sola posición de mano, sin moverte. Do fundamental: Do Mi Sol. Fa en segunda inversión: Do Fa La. Sol en primera: Si Re Sol. Y volvés a Do. Todo en la misma octava, moviendo apenas los dedos. Cuando eso te sale en las doce tonalidades y sorteadas, no ordenadas, ya podés acompañar cualquier cosa.',
    demonstrationNotes: ['C4', 'E4', 'G4', 'C4', 'F4', 'A4', 'B3', 'D4', 'G4', 'C4', 'E4', 'G4'],
    targetKeys: ['B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'],
    content: `
### El drill de una octava

Objetivo: que las tres posiciones de cualquier tríada salgan sin pensar, en las doce tonalidades.

#### 1. El carrusel I - IV - V

Los tres acordes que sostienen casi toda la música popular, tocados **dentro de una sola octava**, sin que la mano salte:

| Grado | Acorde en Do | Posición | Notas |
|---|---|---|---|
| **I** | Do mayor | fundamental | Do - Mi - Sol |
| **IV** | Fa mayor | **2ª inversión** | Do - Fa - La |
| **V** | Sol mayor | **1ª inversión** | Si - Re - Sol |
| **I** | Do mayor | fundamental | Do - Mi - Sol |

Toda la progresión vive entre Si3 y La4. La mano no viaja: los dedos se acomodan.

#### 2. La nota común manda

La regla que ordena todo el voice leading: **si una nota está en los dos acordes, dejala quieta; el resto se mueve lo mínimo.**

- De **Do** (Do-Mi-Sol) a **Fa** (Do-Fa-La): el **Do** se queda. Mi sube a Fa (un semitono), Sol sube a La (un tono).
- De **Do** a **Sol** (Si-Re-Sol): el **Sol** se queda. Mi baja a Re, Do baja a Si.

Un dedo quieto y dos que se corren un escalón. Eso es todo el "sonido de pianista".

#### 3. Sorteá las tonalidades, no las ordenes

Recorrer el círculo de quintas en orden tiene una trampa: podés **deducir** la siguiente en vez de **recuperarla** de memoria. Y lo que fija es recuperar.

Escribí las doce en papelitos y sacá tres por sesión. Sorteadas, el ejercicio se siente más difícil —y esa dificultad es la que deja memoria.

#### 4. La escalera del metrónomo

- Arrancá al tempo **donde no fallás**, no al que quisieras.
- **8 repeticiones limpias seguidas → +4 BPM.**
- **Un solo error → -8 BPM** y volvés a contar desde cero.

La velocidad es una consecuencia de la limpieza, nunca un objetivo. Practicar rápido con errores es practicar los errores.

#### 5. Las tres capas

1. **Manos separadas**, mirando.
2. **Manos juntas**, mirando.
3. **Manos juntas, ojos cerrados.** Esta última capa es la que convierte la forma en propiocepción: la mano encuentra el acorde sin la vista. Es la diferencia entre tocar mirando el teclado y tocar mirando al cantante.
    `,
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la progresión I-IV-V en Do con mínimo movimiento, ¿cómo se toca el Fa mayor?',
          options: [
            'En posición fundamental: Fa - La - Do',
            'En 2ª inversión: Do - Fa - La, para que el Do quede quieto',
            'En 1ª inversión: La - Do - Fa',
            'Con la mano izquierda solamente'
          ],
          correctIndex: 1,
          explanation: 'Do es la nota común entre Do mayor y Fa mayor. Tocando Fa en 2ª inversión (Do-Fa-La) el Do no se mueve y las otras dos voces suben un escalón.'
        },
        {
          question: '¿Por qué conviene sortear las tonalidades en lugar de recorrer el círculo de quintas en orden?',
          options: [
            'Porque el círculo de quintas está mal',
            'Porque el orden te deja deducir la siguiente en vez de recuperarla de memoria',
            'Porque sortear es más rápido',
            'Porque así se practican menos tonalidades'
          ],
          correctIndex: 1,
          explanation: 'En orden, la secuencia misma te da la respuesta. Sorteadas, tenés que recuperarla —y la recuperación con esfuerzo es lo que construye memoria duradera.'
        },
        {
          question: 'Con la escalera del metrónomo, ¿qué hacés después de un solo error?',
          options: ['Seguís igual', 'Subís 4 BPM para exigirte', 'Bajás 8 BPM y volvés a contar desde cero', 'Cambiás de ejercicio'],
          correctIndex: 2,
          explanation: 'Repetir con errores consolida los errores. Bajar y reconstruir limpio es lo que después permite subir de verdad.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el Fa mayor del carrusel: la 2ª inversión Do - Fa - La (C4, F4, A4), la que deja el Do quieto.',
        requiredSequence: ['C4', 'F4', 'A4'],
        mode: 'chord',
        hint: 'Misma zona que Do-Mi-Sol: el pulgar no se mueve del Do.'
      }
    }
  },
  {
    id: '11',
    number: 16,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (57% - 81%)',
    progressPercent: 76,
    title: '16. Independencia de Manos: Bajo + Armonía',
    level: 'Intermedio',
    description: 'El mayor desafío psicológico del principiante: disociar la mano izquierda de la derecha.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'independencia de manos en piano ejercicios mano izquierda y derecha',
    dictationScript: 'La independencia de manos no se logra a los tirones, sino con paciencia y automatismo. La mano izquierda hace de bajista, marcando las notas graves bien firmes, mientras la derecha se encarga de los acordes o la melodía. El secreto acá es tocar ridículamente despacio. Si el cerebro se te traba, bajá la velocidad a la mitad y respirá hondo. Tranqui, que con constancia sale seguro.',
    demonstrationNotes: ['C3', 'C4', 'E4', 'G4', 'G3', 'G4', 'B4', 'D5'],
    targetKeys: ['C3', 'G3', 'C4', 'E4', 'G4'],
    content: `
### Desbloqueando los Dos Hemisferios Cerebrales 

Al tocar con dos manos no estás haciendo dos cosas a la vez: estás creando una **única coreografía unificada**.

#### 1. El Método Paso a Paso
1. **Paso 1:** Practica solo la mano izquierda hasta que puedas tocarla mirando hacia el techo.
2. **Paso 2:** Practica solo la mano derecha hasta que sea 100% automática.
3. **Paso 3:** Une ambas manos nota por nota, asegurándote de saber qué notas caen *juntas* y cuáles caen *entre los pulsos*.

#### 2. El Patrón "Bajo + Acorde"
- **Mano Izquierda:** Toca C3 en el pulso 1 (grave).
- **Mano Derecha:** Toca la tríada C4-E4-G4 en los pulsos 2, 3 y 4.
    `,
    practice: { gym: 'waterfall', label: 'Las dos manos en la Catarata', hint: 'Poné la izquierda en acompañamiento automático y sumala cuando la derecha ande sola' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cuál es la estrategia pedagógica más efectiva cuando ambas manos se descoordinan en un ejercicio?',
          options: [
            'Tocar más rápido para que los dedos no piensen',
            'Tocar a velocidad sumamente lenta y practicar cada mano por separado primero',
            'Dejar de usar la mano izquierda',
            'Presionar los pedales con fuerza'
          ],
          correctIndex: 1,
          explanation: 'Practicar manos separadas y luego unir a velocidad hiperlenta permite consolidar la memoria motriz.'
        },
        {
          question: 'En un arreglo pianístico típico, ¿qué función cumple primordialmente la mano izquierda?',
          options: [
            'Tocar solos virtuosos en el registro sobreagudo',
            'Proveer la línea de bajo y los cimientos rítmico-armónicos',
            'Sostener el banco del piano',
            'Afinar las cuerdas'
          ],
          correctIndex: 1,
          explanation: 'La mano izquierda es el ancla armónica y rítmica del piano.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el bajo C3 y a continuación el acorde C4-E4-G4 de Do Mayor.',
        requiredSequence: ['C3', 'C4', 'E4', 'G4'],
        mode: 'sequence',
        hint: 'Bajo en la izquierda (C3) seguido del acorde en el centro (C4-E4-G4).'
      }
    }
  },
  {
    id: '12',
    number: 17,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (57% - 81%)',
    progressPercent: 81,
    title: '17. Acordes de Séptima: El Color del Jazz y Soul',
    level: 'Intermedio',
    description: 'Añade una cuarta nota a tus tríadas y descubre la sofisticación del sonido contemporáneo.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'acordes de septima en piano tutorial jazz para principiantes',
    dictationScript: 'Las tríadas son sólidas y directas, pero los acordes de séptima tienen perfume y elegancia pura, che. Agregarle una cuarta nota a la tríada te abre la puerta al Jazz, a la Bossa Nova y al Soul. Tenés la séptima mayor o Maj7, que suena soñadora y cinematográfica; la séptima dominante, con esa tensión del Blues; y la séptima menor, suave como una seda. Escuchá la riqueza que tienen.',
    demonstrationNotes: ['C4', 'E4', 'G4', 'B4', 'C4', 'E4', 'G4', 'A#4'],
    targetKeys: ['C4', 'E4', 'G4', 'A#4', 'B4'],
    content: `
### La Cuarta Dimensión Armónica: Séptimas 

Un acorde de 7ma se forma añadiendo una tercera más sobre la quinta de una tríada (cuatro notas en total).

#### 1. Do Séptima Mayor (Cmaj7)
- **Do - Mi - Sol - Si (C-E-G-B)**
- Tiene una 7ma mayor (11 semitonos desde la raíz).
- Sonido: Soñador, cinematográfico, relajante.

#### 2. Do Séptima Dominante (C7)
- **Do - Mi - Sol - Si♭ (C-E-G-Bb)**
- Tiene una 7ma menor (10 semitonos).
- Sonido: Bluesero, tenso, pide resolver a Fa Mayor.

#### 3. Do Menor Séptima (Cm7)
- **Do - Mi♭ - Sol - Si♭ (C-Eb-G-Bb)**
- Sonido: Neo-Soul, íntimo, reflexivo.
    `,
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Séptimas: el reflejo de armar el acorde de cuatro notas' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué notas integran el acorde de Do Séptima Mayor (Cmaj7)?',
          options: [
            'C - E - G - A',
            'C - E - G - B (Do, Mi, Sol, Si)',
            'C - E - G - D',
            'C - D# - G - B'
          ],
          correctIndex: 1,
          explanation: 'Cmaj7 añade la séptima natural (Si) a la tríada mayor de Do.'
        },
        {
          question: '¿Qué sensación auditiva evoca típicamente el acorde Maj7?',
          options: [
            'Agresiva y chirriante',
            'Soñadora, cálida y cinematográfica',
            'Fúnebre y oscura',
            'Cómica y circense'
          ],
          correctIndex: 1,
          explanation: 'El intervalo de séptima mayor aporta una suave tensión luminosa muy usada en bandas sonoras y Lo-Fi.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el acorde completo de Cmaj7 simultáneamente: C4, E4, G4 y B4.',
        requiredSequence: ['C4', 'E4', 'G4', 'B4'],
        mode: 'chord',
        hint: 'Tríada de Do Mayor más el Si natural con el dedo 5.'
      }
    }
  },

  // MÓDULO 5: Armonía Maestra y Círculo de Quintas (80% - 100%)
  {
    id: '13',
    number: 18,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (81% - 100%)',
    progressPercent: 86,
    title: '18. El Círculo de Quintas: La Brújula Universal',
    level: 'Avanzado',
    description: 'El mapa definitivo de la armonía tonal: cómo navegar entre todas las 12 tonalidades del mundo.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'circulo de quintas explicado facil para piano teoria musical',
    dictationScript: 'El Círculo de Quintas es la brújula sagrada de los músicos. Si te movés en sentido horario, cada parada está a una distancia de quinta justa y le suma un sostenido a la armadura. Do Mayor no tiene alteraciones, Sol tiene un Fa sostenido, Re tiene dos. Y adentro tenés las tonalidades relativas menores. Con esta brújula en la cabeza podés transportar cualquier canción al tono que te pida un cantante.',
    demonstrationNotes: ['C4', 'G4', 'D5', 'A5'],
    targetKeys: ['C4', 'G4', 'D4', 'A4'],
    content: `
### La Brújula del Compositor 

El Círculo de Quintas organiza visualmente las 12 notas de la escala cromática por afinidad armónica.

#### 1. El Sentido Horario (Las Quintas y Sostenidos #)
Avanzando 7 semitonos (una 5ta justa):
- **C:** 0 sostenidos.
- **G:** 1 sostenido (**F#**).
- **D:** 2 sostenidos (**F#, C#**).
- **A:** 3 sostenidos (**F#, C#, G#**).
- **E:** 4 sostenidos (**F#, C#, G#, D#**).

#### 2. El Sentido Antihorario (Las Cuartas y Bemoles ♭)
- **F:** 1 bemol (**B♭**).
- **B♭:** 2 bemoles (**B♭, E♭**).
- **E♭:** 3 bemoles (**B♭, E♭, A♭**).

#### 3. Proximidad Armónica
Los acordes que están juntos en el círculo comparten casi todas sus notas. Si compones una canción en Do, los acordes vecinos (Fa y Sol, junto con sus relativos Dm, Am, Em) son tu paleta segura de colores.
    `,
    practice: { gym: 'circleSequence', label: 'Secuencias del Ciclo de Quintas', hint: 'Recorrer el círculo con metrónomo es lo que lo vuelve una brújula y no un dibujo' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cuántos sostenidos (#) tiene la armadura de la tonalidad de Sol Mayor (G)?',
          options: ['0 sostenidos', '1 sostenido (F#)', '3 sostenidos', '7 sostenidos'],
          correctIndex: 1,
          explanation: 'Sol Mayor es la primera parada horaria desde Do en el círculo y añade un único sostenido: Fa sostenido (F#).'
        },
        {
          question: '¿Qué tonalidad se encuentra a una quinta justa ascendente de Sol (G)?',
          options: ['Fa (F)', 'Re (D)', 'Mi (E)', 'Do (C)'],
          correctIndex: 1,
          explanation: 'Avanzando 7 semitonos desde Sol llegamos a Re (D).'
        }
      ],
      practicalTask: {
        instruction: 'Toca la secuencia de quintas iniciales del círculo: C4 → G4 → D5.',
        requiredSequence: ['C4', 'G4', 'D5'],
        mode: 'sequence',
        hint: 'Do (0 #) → Sol (1 #) → Re (2 #).'
      }
    }
  },
  {
    id: '14',
    number: 19,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (81% - 100%)',
    progressPercent: 90,
    title: '19. Extensiones y Tensiones (9nas, Sus4, Sus2)',
    level: 'Avanzado',
    description: 'Enriquece tus acordes suspendiendo la tercera o añadiendo la novena para sonar a estudio profesional.',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'acordes con novena sus2 y sus4 en piano tutorial',
    dictationScript: 'Fijate qué interesante: a veces queremos generar suspenso sin definir si el acorde es alegre o triste. Para eso usamos los acordes suspendidos: Sus4 y Sus2. Al cambiar la tercera por la cuarta o por la segunda, queda flotando en el aire como si contuviera la respiración. Y si le sumás la novena, lográs ese brillo cristalino moderno que queda bárbaro. Escuchá cómo respira la armonía.',
    demonstrationNotes: ['C4', 'F4', 'G4', 'C4', 'D4', 'G4', 'C4', 'E4', 'G4', 'D5'],
    targetKeys: ['C4', 'D4', 'F4', 'G4', 'D5'],
    content: `
### Pintando con Colores Armónicos Avanzados 

Los acordes básicos son blanco y negro; las extensiones son toda la gama cromática.

#### 1. Acorde Suspendido 4 (Csus4)
- **Do - Fa - Sol (C-F-G)**
- La tercera (Mi) es reemplazada por la cuarta (Fa).
- Produce una tensión maravillosa que pide resolver al Mi natural de Do Mayor.

#### 2. Acorde Suspendido 2 (Csus2)
- **Do - Re - Sol (C-D-G)**
- Espacioso, moderno, utilizado en baladas épicas.

#### 3. Acorde con Novena Añadida (Cadd9)
- **Do - Mi - Sol - Re agudo (C-E-G-D5)**
- Es el acorde estrella de la música acústica y pop.
    `,
    practice: { gym: 'chords', label: 'Desafío de Acordes', hint: 'Novenas y suspendidos sobre la tríada que ya conocés' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: 'En un acorde suspendido como Csus4, ¿qué nota de la tríada original es sustituida?',
          options: [
            'La raíz (Do)',
            'La tercera (Mi se reemplaza por Fa)',
            'La quinta (Sol se elimina)',
            'El bajo'
          ],
          correctIndex: 1,
          explanation: 'La suspensión consiste exactamente en postergar la tercera usando la cuarta (Fa) en su lugar.'
        },
        {
          question: '¿Qué notas forman el acorde Csus2 en Do?',
          options: [
            'C - E - G',
            'C - D - G (Do, Re, Sol)',
            'C - F - G',
            'C - D# - G'
          ],
          correctIndex: 1,
          explanation: 'Csus2 contiene la fundamental (Do), la segunda mayor (Re) y la quinta justa (Sol).'
        }
      ],
      practicalTask: {
        instruction: 'Toca la resolución clásica: primero Csus4 (C4, F4, G4) y luego resuelve a C Mayor (C4, E4, G4).',
        requiredSequence: ['C4', 'F4', 'G4', 'C4', 'E4', 'G4'],
        mode: 'sequence',
        hint: 'Escucha cómo la tensión de F4 descansa plácidamente en E4.'
      }
    }
  },
  {
    id: '14b',
    number: 20,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (81% - 100%)',
    progressPercent: 95,
    title: '20. Guide tones y shell voicings',
    level: 'Avanzado',
    description: 'Tres notas por acorde, dos que se mueven un semitono: la inversión que suena a disco.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'shell voicings de jazz en piano tercera y septima tutorial',
    practice: { gym: 'circleSequence', label: 'Llevarlo a las 12 tonalidades', hint: 'Secuencias por ciclo de quintas con metrónomo' },
    dictationScript: 'Última pieza del rompecabezas. En un acorde de séptima, la quinta no dice nada: se puede sacar sin que nadie la extrañe. Lo que define el color son la tercera y la séptima, los guide tones. Tocá solo raíz, tercera y séptima: eso es un shell voicing, y es lo que tocaban Bud Powell y Red Garland con la izquierda. Y ahora el secreto: en un dos-cinco-uno, la séptima de cada acorde baja medio tono y se convierte en la tercera del siguiente. Ese medio tono es el sonido del jazz. Todo lo demás es decoración.',
    demonstrationNotes: ['D3', 'C4', 'F4', 'G3', 'B3', 'F4', 'C3', 'B3', 'E4'],
    targetKeys: ['C3', 'D3', 'G3', 'B3', 'E4', 'F4', 'C4'],
    content: `
### La quinta sobra

En un acorde de séptima, la **quinta** es la nota más prescindible: sacala y el acorde sigue siendo el mismo. Lo que define el color son la **3ª** y la **7ª**. Se llaman **guide tones** —notas guía— porque son las que conducen la armonía de un acorde al siguiente.

- La **3ª** dice si es mayor o menor.
- La **7ª** dice si es de dominante, mayor o menor.

Con esas dos ya está dicho todo lo esencial.

#### 1. El shell voicing: tres notas

**Fundamental + 3ª + 7ª.** Nada más. Es el voicing con el que Bud Powell y Red Garland sostenían la izquierda mientras la derecha improvisaba.

| Forma | Estructura | Mano izquierda | Mano derecha |
|---|---|---|---|
| **A** | 1 - 7 - 3 | raíz + 7ª | 3ª |
| **B** | 1 - 3 - 7 | raíz + 3ª | 7ª |

**Alternar A y B es lo que te mantiene en el centro del teclado**: si usás siempre la misma forma, la progresión te empuja hacia arriba o hacia abajo hasta salirte del registro útil.

#### 2. El movimiento que sostiene todo el jazz

**La 7ª de cada acorde baja un semitono y se convierte en la 3ª del siguiente.** Un ii-V-I en Do, con shells:

| Acorde | Forma | Notas | Guide tones (voces de arriba) |
|---|---|---|---|
| **Dm7** | A (1-7-3) | Re · **Do** · **Fa** | Do (7ª) y Fa (3ª) |
| **G7** | B (1-3-7) | Sol · **Si** · **Fa** | Si (3ª) y Fa (7ª) |
| **Cmaj7** | A (1-7-3) | Do · **Si** · **Mi** | Si (7ª) y Mi (3ª) |

Seguí las dos voces de arriba: **Do-Fa → Si-Fa → Si-Mi**.

- El **Do** de Dm7 (su 7ª) baja medio tono al **Si** de G7 (su 3ª).
- El **Fa** se queda quieto: era la 3ª de Dm7 y pasa a ser la 7ª de G7.
- El **Fa** de G7 (su 7ª) baja medio tono al **Mi** de Cmaj7 (su 3ª), y el **Si** se queda.

**En cada cambio se mueve una sola voz, y se mueve un semitono.** Eso es todo. Ese medio tono es el sonido del jazz; el resto es decoración.

#### 3. El paso siguiente: voicings sin raíz

Cuando hay bajista, la raíz sobra: la deja él. Ahí aparecen los **rootless voicings** de Bill Evans —3-5-7-9 y 7-9-3-5—, que son literalmente inversiones de un acorde de cuatro notas sin la fundamental. Todo lo que aprendiste sobre inversiones se aplica igual; solo cambió cuál es la nota de abajo.

#### 4. El ejercicio de mayor rendimiento por minuto

**Solo los guide tones, dos notas por acorde, mano derecha sola, sin raíz, ii-V-I por las doce tonalidades.**

- Bajando por quintas: Do, Fa, Si♭, Mi♭, La♭, Re♭, Sol♭, Si, Mi, La, Re, Sol.
- Dos notas por acorde. Escuchá el semitono que baja en cada cambio.
- Después agregá la raíz en la izquierda: ahí ya estás tocando jazz.

Nada más rinde tanto por minuto invertido: es armonía, oído, voice leading y las doce tonalidades en un solo ejercicio.
    `,
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué nota se puede quitar de un acorde de séptima sin perder su identidad?',
          options: ['La fundamental', 'La tercera', 'La quinta', 'La séptima'],
          correctIndex: 2,
          explanation: 'La quinta no aporta color: no distingue mayor de menor ni de dominante. La 3ª y la 7ª —los guide tones— son las que definen el acorde.'
        },
        {
          question: 'En un ii-V-I, ¿qué le pasa a la 7ª de cada acorde?',
          options: [
            'Se queda quieta',
            'Baja un semitono y se convierte en la 3ª del acorde siguiente',
            'Sube una octava',
            'Se reemplaza por la quinta'
          ],
          correctIndex: 1,
          explanation: 'La 7ª resuelve bajando medio tono a la 3ª del acorde siguiente: Do de Dm7 → Si de G7, y Fa de G7 → Mi de Cmaj7. Ese semitono es el motor del voice leading en el jazz.'
        },
        {
          question: '¿Por qué conviene alternar la forma A (1-7-3) con la forma B (1-3-7)?',
          options: [
            'Porque suenan distinto',
            'Para que la progresión no te empuje fuera del registro útil del teclado',
            'Porque la forma A es solo para acordes menores',
            'Para poder tocar más rápido'
          ],
          correctIndex: 1,
          explanation: 'Usando siempre la misma forma, cada acorde te desplaza en la misma dirección. Alternando A y B las manos se quedan en el centro del teclado.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el shell voicing de Dm7 en forma A (1-7-3): Re grave, Do y Fa (D3, C4, F4).',
        requiredSequence: ['D3', 'C4', 'F4'],
        mode: 'chord',
        hint: 'Sin quinta: raíz abajo, la séptima (Do) y la tercera (Fa) arriba. Escuchá cómo el Do pide bajar al Si.'
      }
    }
  },
  {
    id: '15',
    number: 21,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (81% - 100%)',
    progressPercent: 100,
    title: '21. Gran Graduación: Improvisación Pentatónica y Maestría',
    level: 'Avanzado',
    description: 'La cima del viaje: libera tu creatividad con la escala pentatónica y recibe tu certificación virtual.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
    videoQuery: 'improvisar en piano con la escala pentatonica tutorial',
    dictationScript: '¡Qué momento, che! Llegaste a la lección final de tu instructor virtual. Arrancamos de cero ubicando el Do Central y mirá todo lo que caminaste: inversiones, acordes de séptima y el círculo de quintas. Ahora el teclado es tuyo. La escala pentatónica mayor tiene cinco notas sagradas: Do, Re, Mi, Sol y La. Con esas cinco notas podés improvisar libremente sobre cualquier bajo sin errarle a ninguna nota. Tocá con el corazón, que la música ya vive en vos. ¡Un abrazo enorme y vamos arriba!',
    demonstrationNotes: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
    targetKeys: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
    content: `
### La Libertad del Pianista: Improvisar 

Tocar piano no es solo reproducir lo que otros escribieron; es **expresar lo que tú sientes**.

#### 1. La Escala Pentatónica Mayor de Do
Contiene solo 5 notas:
**Do (C) - Re (D) - Mi (E) - Sol (G) - La (A)**
- Se eliminan el Fa y el Si (los semitonos que generan disonancias).
- ¡Es imposible tocar una nota "equivocada" con la pentatónica!

#### 2. Cómo Crear tus Primeros Solos
1. Con la mano izquierda, mantén un bajo firme en **C3** o **Am**.
2. Con la mano derecha, juega libremente con las 5 notas de la pentatónica.
3. Haz pausas: el silencio es la nota más expresiva de la música.
4. Repite pequeños motivos rítmicos.

---
** Evaluación Final de Certificación:**
Rinde la prueba final teórica y práctica para graduarte oficialmente del Conservatorio Virtual de PianoMaster.
    `,
    practice: { gym: 'scales', label: 'Pentatónica en el Gimnasio de Escalas', hint: 'Las cinco notas en las doce tonalidades: el material de la improvisación' },
    evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué notas de la escala diatónica de Do Mayor se omiten para formar la escala Pentatónica Mayor?',
          options: [
            'Do y Sol',
            'Fa y Si (grados 4 y 7)',
            'Re y Mi',
            'No se omite ninguna'
          ],
          correctIndex: 1,
          explanation: 'Se eliminan el 4º y 7º grado (Fa y Si), eliminando los semitonos disonantes y permitiendo improvisación consonante pura.'
        },
        {
          question: '¿Cuál es el secreto supremo para ser un gran pianista de por vida?',
          options: [
            'Tocar únicamente cuando hay exámenes',
            'La práctica consciente diaria, escuchar con atención y disfrutar el sonido',
            'Presionar las teclas con la mayor fuerza física posible',
            'Memorizar sin entender la armonía'
          ],
          correctIndex: 1,
          explanation: 'La constancia, la audición atenta y la pasión por el sonido son los verdaderos pilares del maestro.'
        }
      ],
      practicalTask: {
        instruction: 'Ejecuta la escala Pentatónica Mayor completa: C4, D4, E4, G4, A4 y culmina en C5.',
        requiredSequence: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
        mode: 'sequence',
        hint: 'Do, Re, Mi, Sol, La, Do.'
      }
    }
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
