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
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 20%)',
    progressPercent: 7,
    title: '1. El Mapa del Piano y el Secreto del DO',
    level: 'Principiante',
    description: 'Aprende a ubicar todas las notas sin memorizar a ciegas usando los grupos de teclas negras.',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
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
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 20%)',
    progressPercent: 14,
    title: '2. Postura Biomecánica y Numeración de Dedos',
    level: 'Principiante',
    description: 'Protege tus tendones, adopta la postura del concertista y domina la numeración 1 al 5.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
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
    moduleTitle: 'Módulo 1: Fundamentos Absolutos (0% - 20%)',
    progressPercent: 20,
    title: '3. Pulso, Ritmo y Compás de 4/4',
    level: 'Principiante',
    description: 'El latido del corazón de la música. Domina las figuras rítmicas y el metrónomo.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
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
    moduleTitle: 'Módulo 2: Escalas e Intervalos (20% - 40%)',
    progressPercent: 27,
    title: '4. Tonos y Semitonos: El ADN de las Escalas',
    level: 'Principiante',
    description: 'Aprende a medir distancias en el piano y descubre la fórmula secreta de las escalas mayores.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
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
    moduleTitle: 'Módulo 2: Escalas e Intervalos (20% - 40%)',
    progressPercent: 34,
    title: '5. La Escala de Do Mayor y el Paso del Pulgar',
    level: 'Principiante',
    description: 'Domina la técnica legendaria del cruce del pulgar para tocar líneas melódicas continuas.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
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
    id: '6',
    number: 6,
    moduleNumber: 2,
    moduleTitle: 'Módulo 2: Escalas e Intervalos (20% - 40%)',
    progressPercent: 40,
    title: '6. Lectura Musical: El Gran Pentagrama y Claves',
    level: 'Principiante',
    description: 'Decodifica la notación clásica sin estrés: Clave de Sol para la derecha y Clave de Fa para la izquierda.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
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
    number: 7,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (40% - 60%)',
    progressPercent: 47,
    title: '7. Anatomía de la Tríada: Mayor vs Menor',
    level: 'Principiante',
    description: 'Comprende la emoción armónica: por qué un acorde suena radiante o melancólico.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
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
    number: 8,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (40% - 60%)',
    progressPercent: 54,
    title: '8. Los 7 Acordes Diatónicos de la Tonalidad',
    level: 'Intermedio',
    description: 'Descubre la familia completa de acordes que nacen de las teclas blancas.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
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
    number: 9,
    moduleNumber: 3,
    moduleTitle: 'Módulo 3: El Poder de los Acordes (40% - 60%)',
    progressPercent: 60,
    title: '9. La Progresión de Oro: I - V - vi - IV',
    level: 'Intermedio',
    description: 'La fórmula armónica detrás de cientos de éxitos mundiales desde los Beatles hasta el pop actual.',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
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
    number: 10,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (60% - 80%)',
    progressPercent: 67,
    title: '10. Inversiones y el Arte del Voice Leading',
    level: 'Intermedio',
    description: 'Elimina los saltos bruscos de la mano y conecta acordes con la elegancia de un profesional.',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
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
    id: '11',
    number: 11,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (60% - 80%)',
    progressPercent: 74,
    title: '11. Independencia de Manos: Bajo + Armonía',
    level: 'Intermedio',
    description: 'El mayor desafío psicológico del principiante: disociar la mano izquierda de la derecha.',
    image: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?auto=format&fit=crop&q=80&w=800',
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
    number: 12,
    moduleNumber: 4,
    moduleTitle: 'Módulo 4: Inversiones y Conducción (60% - 80%)',
    progressPercent: 80,
    title: '12. Acordes de Séptima: El Color del Jazz y Soul',
    level: 'Intermedio',
    description: 'Añade una cuarta nota a tus tríadas y descubre la sofisticación del sonido contemporáneo.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
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
    number: 13,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 87,
    title: '13. El Círculo de Quintas: La Brújula Universal',
    level: 'Avanzado',
    description: 'El mapa definitivo de la armonía tonal: cómo navegar entre todas las 12 tonalidades del mundo.',
    image: 'https://images.unsplash.com/photo-1507838596018-bd9451c3a39f?auto=format&fit=crop&q=80&w=800',
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
    number: 14,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 94,
    title: '14. Extensiones y Tensiones (9nas, Sus4, Sus2)',
    level: 'Avanzado',
    description: 'Enriquece tus acordes suspendiendo la tercera o añadiendo la novena para sonar a estudio profesional.',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800',
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
    id: '15',
    number: 15,
    moduleNumber: 5,
    moduleTitle: 'Módulo 5: Armonía Maestra (80% - 100%)',
    progressPercent: 100,
    title: '15. Gran Graduación: Improvisación Pentatónica y Maestría',
    level: 'Avanzado',
    description: 'La cima del viaje: libera tu creatividad con la escala pentatónica y recibe tu certificación virtual.',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&q=80&w=800',
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
