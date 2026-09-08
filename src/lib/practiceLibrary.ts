/**
 * Biblioteca de práctica: arpegios, digitaciones por tonalidad, memotecnia,
 * escaleras de velocidad y técnica.
 *
 * Hasta acá la app tenía UNA digitación por tipo de escala (la de Do) y la
 * mostraba en las doce tonalidades, que es justo lo que no se puede hacer: el
 * pulgar no pisa teclas negras, así que Si♭ mayor no se digita como Do mayor.
 * Este módulo trae la tabla real por tonalidad, y con ella los tres datos que
 * hacen memorizable una escala: dónde cae el 4º dedo, qué teclas negras usa y
 * cuál es la trampa.
 *
 * Fuentes de las digitaciones (ver `curriculo/tecnica.md` en el proyecto):
 * la tabla de escalas y arpegios de la Universidad de Evansville y el cuadro
 * de arpegios de Robert Kelley. Donde las ediciones difieren se dice.
 */
import { CHROMATIC_NOTES, ENHARMONIC_MAP, SCALES_DATABASE, spellScaleNotes } from './musicGymTheory';

/* ================================================================== */
/*  1. Digitación de escalas, tonalidad por tonalidad                  */
/* ================================================================== */

export interface ScaleFingering {
  /** Nombre de la tónica tal como se escribe en esa tonalidad (Bb, F#…). */
  root: string;
  right: number[];   // 8 dedos, una octava ascendente
  left: number[];
}

/** Mayores. Una octava ascendente; bajando es el mismo camino al revés. */
export const MAJOR_FINGERINGS: Record<string, ScaleFingering> = {
  C:  { root: 'C',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  G:  { root: 'G',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  D:  { root: 'D',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  A:  { root: 'A',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  E:  { root: 'E',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  B:  { root: 'B',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [4, 3, 2, 1, 4, 3, 2, 1] },
  F:  { root: 'F',  right: [1, 2, 3, 4, 1, 2, 3, 4], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  Bb: { root: 'Bb', right: [4, 1, 2, 3, 1, 2, 3, 4], left: [3, 2, 1, 4, 3, 2, 1, 3] },
  Eb: { root: 'Eb', right: [3, 1, 2, 3, 4, 1, 2, 3], left: [3, 2, 1, 4, 3, 2, 1, 3] },
  Ab: { root: 'Ab', right: [3, 4, 1, 2, 3, 1, 2, 3], left: [3, 2, 1, 4, 3, 2, 1, 3] },
  Db: { root: 'Db', right: [2, 3, 1, 2, 3, 4, 1, 2], left: [3, 2, 1, 4, 3, 2, 1, 3] },
  'F#': { root: 'F#', right: [2, 3, 4, 1, 2, 3, 1, 2], left: [4, 3, 2, 1, 3, 2, 1, 4] },
};

/** Menores naturales. */
export const MINOR_FINGERINGS: Record<string, ScaleFingering> = {
  A:  { root: 'A',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  E:  { root: 'E',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  B:  { root: 'B',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [4, 3, 2, 1, 4, 3, 2, 1] },
  D:  { root: 'D',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  G:  { root: 'G',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  C:  { root: 'C',  right: [1, 2, 3, 1, 2, 3, 4, 5], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  F:  { root: 'F',  right: [1, 2, 3, 4, 1, 2, 3, 4], left: [5, 4, 3, 2, 1, 3, 2, 1] },
  Eb: { root: 'Eb', right: [3, 1, 2, 3, 4, 1, 2, 3], left: [2, 1, 4, 3, 2, 1, 3, 2] },
  Bb: { root: 'Bb', right: [4, 1, 2, 3, 1, 2, 3, 4], left: [2, 1, 3, 2, 1, 4, 3, 2] },
  'F#': { root: 'F#', right: [3, 4, 1, 2, 3, 1, 2, 3], left: [4, 3, 2, 1, 3, 2, 1, 4] },
  'C#': { root: 'C#', right: [3, 4, 1, 2, 3, 1, 2, 3], left: [3, 2, 1, 4, 3, 2, 1, 3] },
  'G#': { root: 'G#', right: [3, 4, 1, 2, 3, 1, 2, 3], left: [3, 2, 1, 4, 3, 2, 1, 3] },
};

/* ================================================================== */
/*  2. Cómo memorizar cada tonalidad                                   */
/* ================================================================== */

export interface KeyMemory {
  /** Cómo se escribe la tónica en esa tonalidad. */
  root: string;
  es: string;                 // nombre en español
  accidentals: string;        // "2 sostenidos (Fa♯, Do♯)"
  /** Familia de digitación de la derecha (ver lección "Las 5 familias"). */
  family: string;
  /** La frase que la fija. */
  hook: string;
  /** El error que casi todos cometen en esta tonalidad. */
  trap: string;
  /** Orden sugerido de estudio (1 = primera). */
  order: number;
}

export const MAJOR_KEY_MEMORY: Record<string, KeyMemory> = {
  C: {
    root: 'C', es: 'Do mayor', accidentals: 'sin alteraciones', family: 'Familia Do (1-2-3 1-2-3-4-5)', order: 1,
    hook: 'Todas blancas. Es la única escala donde no hay nada que recordar… y por eso es la más difícil de sentir: no tiene relieve bajo los dedos.',
    trap: 'Estudiarla primero y creer que las demás se parecen. Chopin hacía empezar por Si mayor justamente porque Do no le enseña nada a la mano.',
  },
  G: {
    root: 'G', es: 'Sol mayor', accidentals: '1 sostenido (Fa♯)', family: 'Familia Do (1-2-3 1-2-3-4-5)', order: 2,
    hook: 'Una sola negra, y cae bajo el 4º dedo derecho: el Fa♯ es la anteúltima nota.',
    trap: 'Tocar Fa natural al bajar, cuando la mano ya no mira el teclado.',
  },
  D: {
    root: 'D', es: 'Re mayor', accidentals: '2 sostenidos (Fa♯, Do♯)', family: 'Familia Do (1-2-3 1-2-3-4-5)', order: 4,
    hook: 'Las dos negras son las dos que faltan para completar el grupo de tres: Fa♯ y Do♯. El 4º derecho cae en Do♯.',
    trap: 'El pulgar izquierdo en Sol: si lo ponés tarde, la mano se tuerce en la vuelta.',
  },
  A: {
    root: 'A', es: 'La mayor', accidentals: '3 sostenidos (Fa♯, Do♯, Sol♯)', family: 'Familia Do (1-2-3 1-2-3-4-5)', order: 6,
    hook: 'Tres negras seguidas del grupo de tres, salteando la del medio del grupo de dos. El 4º derecho cae en Sol♯.',
    trap: 'Confundirla con La menor por el nombre: acá el Do y el Fa van sostenidos.',
  },
  E: {
    root: 'E', es: 'Mi mayor', accidentals: '4 sostenidos (Fa♯, Do♯, Sol♯, Re♯)', family: 'Familia Do (1-2-3 1-2-3-4-5)', order: 8,
    hook: 'Cuatro negras: sólo quedan blancas Mi, La y Si. El 4º derecho cae en Re♯.',
    trap: 'El 3-1 entre Sol♯ y La: es el único paso de negra a blanca vecina y se traba si el pulgar no viaja antes.',
  },
  B: {
    root: 'B', es: 'Si mayor', accidentals: '5 sostenidos (Fa♯, Do♯, Sol♯, Re♯, La♯)', family: 'Familia Do en la derecha · 4-3-2-1 en la izquierda', order: 10,
    hook: 'La escala que Chopin daba primero: cinco negras acomodan solas la mano, los dedos largos caen donde tienen que caer. Blancas: sólo Si y Mi.',
    trap: 'La izquierda NO es 5-4-3-2-1: arranca con el 4, y el pulgar cae en Mi y en Si.',
  },
  F: {
    root: 'F', es: 'Fa mayor', accidentals: '1 bemol (Si♭)', family: 'Familia Fa (1-2-3-4 1-2-3-4)', order: 3,
    hook: 'La única mayor con una negra bemol, y el 4º dedo derecho cae justo ahí: en Si♭. El cambio de posición es después de la CUARTA nota, no de la tercera.',
    trap: 'Digitarla como Do mayor. Si pasás el pulgar después de la tercera nota, el pulgar termina en Si♭ y la mano se traba.',
  },
  Bb: {
    root: 'Bb', es: 'Si♭ mayor', accidentals: '2 bemoles (Si♭, Mi♭)', family: 'Familia Negras (empieza con el 4)', order: 5,
    hook: 'Empieza con el 4º dedo derecho sobre la propia tónica: el 4 está en Si♭ desde la primera nota. En la izquierda, los pulgares caen en Re y en La.',
    trap: 'Arrancar con el pulgar. Si el 1 pisa Si♭, no hay forma de terminar la octava.',
  },
  Eb: {
    root: 'Eb', es: 'Mi♭ mayor', accidentals: '3 bemoles (Si♭, Mi♭, La♭)', family: 'Familia Negras (empieza con el 3)', order: 7,
    hook: 'Arranca con el 3 y el 4º dedo derecho cae, como siempre en los bemoles, en Si♭ (el 5º grado).',
    trap: 'Olvidarse del La♭ al bajar: es el que aparece recién en el tercer bemol.',
  },
  Ab: {
    root: 'Ab', es: 'La♭ mayor', accidentals: '4 bemoles (Si♭, Mi♭, La♭, Re♭)', family: 'Familia Negras (3-4 al empezar)', order: 9,
    hook: 'Empieza 3-4 sobre las dos negras del principio, y el 4 de la derecha vuelve a estar en Si♭ (acá, el 2º grado).',
    trap: 'El salto 4→1 de Si♭ a Do: el pulgar tiene que estar viajando mientras el 4 todavía suena.',
  },
  Db: {
    root: 'Db', es: 'Re♭ mayor', accidentals: '5 bemoles (Si♭, Mi♭, La♭, Re♭, Sol♭)', family: 'Familia Re♭ (2-3 al empezar)', order: 11,
    hook: 'Cinco negras: las blancas son sólo Fa y Do, y ahí caen los dos pulgares — de las dos manos. Es la escala más cómoda del teclado una vez que la sabés.',
    trap: 'Buscar el pulgar en la tónica. Acá el pulgar nunca toca Re♭.',
  },
  'F#': {
    root: 'F#', es: 'Fa♯ mayor', accidentals: '6 sostenidos (Fa♯, Do♯, Sol♯, Re♯, La♯, Mi♯)', family: 'Familia Re♭ (2-3-4 al empezar)', order: 12,
    hook: 'Seis negras de siete: las únicas blancas son Si y Mi♯ (que se toca donde el Fa). La mano se acomoda sola, como en Re♭. Escrita como Sol♭ mayor es la misma escala con seis bemoles.',
    trap: 'El Mi♯ parece un error de escritura y no lo es: cada grado lleva su propia letra, así que el séptimo tiene que llamarse Mi de alguna forma.',
  },
};

export const MINOR_KEY_MEMORY: Record<string, KeyMemory> = {
  A: {
    root: 'A', es: 'La menor', accidentals: 'sin alteraciones (natural)', family: 'Familia Do', order: 1,
    hook: 'La relativa de Do: las mismas teclas blancas empezando en La. Si sabés Do mayor, ya la sabés.',
    trap: 'En la armónica sube el Sol♯; en la melódica suben Fa♯ y Sol♯ al subir y vuelven al bajar.',
  },
  E: {
    root: 'E', es: 'Mi menor', accidentals: '1 sostenido (Fa♯)', family: 'Familia Do', order: 2,
    hook: 'Relativa de Sol. Una negra: Fa♯. Armónica: además Re♯.',
    trap: 'En la armónica quedan Re♯ y Fa♯ juntas: el salto de segunda aumentada entre Do y Re♯ hay que oírlo, no evitarlo.',
  },
  D: {
    root: 'D', es: 'Re menor', accidentals: '1 bemol (Si♭)', family: 'Familia Do', order: 3,
    hook: 'Relativa de Fa. Una negra: Si♭. Armónica: además Do♯.',
    trap: 'Digitarla como Fa mayor. Empezando en Re el cambio vuelve a ser después de la tercera nota.',
  },
  G: {
    root: 'G', es: 'Sol menor', accidentals: '2 bemoles (Si♭, Mi♭)', family: 'Familia Do', order: 4,
    hook: 'Relativa de Si♭. Armónica: sube el Fa♯.',
    trap: 'Mezclar el Mi♭ de la natural con el Mi♮ de la melódica ascendente.',
  },
  B: {
    root: 'B', es: 'Si menor', accidentals: '2 sostenidos (Fa♯, Do♯)', family: 'Familia Do en la derecha · 4-3-2-1 en la izquierda', order: 5,
    hook: 'Relativa de Re. Armónica: sube el La♯.',
    trap: 'La izquierda arranca con el 4, igual que en Si mayor.',
  },
  C: {
    root: 'C', es: 'Do menor', accidentals: '3 bemoles (Si♭, Mi♭, La♭)', family: 'Familia Do', order: 6,
    hook: 'Relativa de Mi♭. La derecha se digita como Do mayor aunque haya tres negras: el pulgar sigue cayendo en Do y en Fa.',
    trap: 'Creer que por tener bemoles cambia la digitación. No: acá las negras no le tocan al pulgar.',
  },
  F: {
    root: 'F', es: 'Fa menor', accidentals: '4 bemoles (Si♭, Mi♭, La♭, Re♭)', family: 'Familia Fa (1-2-3-4)', order: 7,
    hook: 'Como Fa mayor, el cambio de la derecha es después de la cuarta nota.',
    trap: 'El Re♭ y el La♭ seguidos al bajar: son dos negras vecinas y el 3 tiene que estirarse.',
  },
  'C#': {
    root: 'C#', es: 'Do♯ menor', accidentals: '4 sostenidos (Fa♯, Do♯, Sol♯, Re♯)', family: 'Familia Negras (3-4 al empezar)', order: 8,
    hook: 'Relativa de Mi. La derecha arranca 3-4 sobre Do♯ y Re♯.',
    trap: 'Empezar con el pulgar. El pulgar entra recién en el Mi.',
  },
  Eb: {
    root: 'Eb', es: 'Mi♭ menor', accidentals: '6 bemoles (Si♭, Mi♭, La♭, Re♭, Sol♭, Do♭)', family: 'Familia Negras (empieza con el 3)', order: 9,
    hook: 'Seis bemoles y casi todo negro: la mano se acomoda sola, como en Re♭ mayor.',
    trap: 'Do♭ es Si. Escribirlo mal desordena toda la armadura.',
  },
  'F#': {
    root: 'F#', es: 'Fa♯ menor', accidentals: '3 sostenidos (Fa♯, Do♯, Sol♯)', family: 'Familia Negras (3-4 al empezar)', order: 10,
    hook: 'Relativa de La. Arranca 3-4 y el pulgar cae en La y en Mi.',
    trap: 'En la armónica el Mi sube a Mi♯, que se toca donde el Fa: parece un error de escritura y no lo es.',
  },
  'G#': {
    root: 'G#', es: 'Sol♯ menor', accidentals: '5 sostenidos (Fa♯, Do♯, Sol♯, Re♯, La♯)', family: 'Familia Negras (3-4 al empezar)', order: 11,
    hook: 'Relativa de Si. Misma forma de mano que Do♯ y Fa♯ menor: las tres arrancan 3-4.',
    trap: 'La armónica pide Fa doble sostenido. Se toca en la tecla del Sol.',
  },
  Bb: {
    root: 'Bb', es: 'Si♭ menor', accidentals: '5 bemoles (Si♭, Mi♭, La♭, Re♭, Sol♭)', family: 'Familia Negras (empieza con el 4)', order: 12,
    hook: 'Como Si♭ mayor, la derecha arranca con el 4 sobre la tónica.',
    trap: 'La izquierda no se parece a ninguna otra: 2-1-3-2-1-4-3-2. Vale mirarla escrita las primeras veces.',
  },
};

/* ================================================================== */
/*  3. Arpegios                                                        */
/* ================================================================== */

export interface ArpeggioType {
  id: string;
  name: string;
  symbol: string;
  /** Semitonos de una octava del arpegio (sin repetir la tónica de arriba). */
  intervals: number[];
  family: 'Tríada' | 'Séptima';
  sound: string;
  where: string;
  tip: string;
}

export const ARPEGGIO_TYPES: ArpeggioType[] = [
  {
    id: 'major', name: 'Mayor', symbol: '', intervals: [0, 4, 7], family: 'Tríada',
    sound: 'Abierto y firme. Es el arpegio que suena a "resuelto".',
    where: 'Acompañamientos de balada, preludios, el bajo de casi toda canción en tonalidad mayor.',
    tip: 'La mano se abre una vez y ya no cambia de forma: lo que viaja es el brazo, no los dedos.',
  },
  {
    id: 'minor', name: 'Menor', symbol: 'm', intervals: [0, 3, 7], family: 'Tríada',
    sound: 'La misma forma con la tercera un semitono más abajo: se cierra y se oscurece.',
    where: 'Todo lo melancólico, y el vi de cualquier progresión pop.',
    tip: 'Practicalo pegado al mayor sobre la misma tónica: el oído aprende el semitono mejor que la teoría.',
  },
  {
    id: 'diminished', name: 'Disminuido', symbol: 'dim', intervals: [0, 3, 6], family: 'Tríada',
    sound: 'Apretado e inestable: dos terceras menores apiladas.',
    where: 'Acorde de paso entre dos grados vecinos, y el vii de la tonalidad.',
    tip: 'La mano queda más cerrada que en el mayor. Si te duele, estás estirando de más: el disminuido es chico.',
  },
  {
    id: 'augmented', name: 'Aumentado', symbol: 'aug', intervals: [0, 4, 8], family: 'Tríada',
    sound: 'Flotante, sin suelo. Es simétrico: invertido vuelve a ser aumentado.',
    where: 'Empuje entre dos acordes (C → Caug → C6) y bandas de sonido de suspenso.',
    tip: 'Como es simétrico, la misma forma sirve empezando en cualquiera de sus tres notas. Aprovechalo.',
  },
  {
    id: 'dom7', name: 'Séptima de dominante', symbol: '7', intervals: [0, 4, 7, 10], family: 'Séptima',
    sound: 'Cuatro notas: pide resolver. El tritono adentro es lo que empuja.',
    where: 'El V de cualquier cadencia y el acorde base del blues.',
    tip: 'Con cuatro notas la digitación pasa a ser 1-2-3-4 y el pulgar entra en cada tónica. El brazo hace un arco continuo, no cuatro escalones.',
  },
  {
    id: 'maj7', name: 'Séptima mayor', symbol: 'maj7', intervals: [0, 4, 7, 11], family: 'Séptima',
    sound: 'Suave y suspendido, sin tensión de resolución.',
    where: 'El I y el IV del jazz y del bossa.',
    tip: 'La séptima está a un semitono de la tónica: si suena "sucio", tocalas separadas por más de una octava.',
  },
  {
    id: 'min7', name: 'Séptima menor', symbol: 'm7', intervals: [0, 3, 7, 10], family: 'Séptima',
    sound: 'Redondo y neutro. El acorde más "cómodo" de los de cuatro notas.',
    where: 'El ii del ii-V-I, y medio funk.',
    tip: 'Es el arpegio ideal para empezar con los de cuatro notas: la mano no se estira en ningún lado.',
  },
  {
    id: 'dim7', name: 'Séptima disminuida', symbol: 'dim7', intervals: [0, 3, 6, 9], family: 'Séptima',
    sound: 'Cuatro terceras menores iguales: perfectamente simétrico.',
    where: 'Modulaciones y momentos dramáticos del romanticismo.',
    tip: 'Por simétrico, sólo existen tres arpegios disminuidos distintos en todo el piano. Aprendiendo tres los tenés los doce.',
  },
];

/**
 * Digitación de arpegios en posición fundamental.
 *
 * El patrón se repite cada octava, así que alcanza con la unidad. Sale del
 * cuadro de Robert Kelley, que agrupa las doce tonalidades en cuatro patrones
 * por mano; algunas ediciones cambian un 3 por un 4 en la izquierda de Re, Mi,
 * La y Si mayor.
 */
type ArpPattern = { start: number[]; unit: number[] };

const RH_1231: ArpPattern = { start: [], unit: [1, 2, 3] };
const RH_2124: ArpPattern = { start: [2], unit: [1, 2, 4] };
const RH_2312: ArpPattern = { start: [], unit: [2, 3, 1] };
const LH_1421: ArpPattern = { start: [5], unit: [4, 2, 1] };
const LH_1321: ArpPattern = { start: [5], unit: [3, 2, 1] };
const LH_2142: ArpPattern = { start: [], unit: [2, 1, 4] };
const LH_3213: ArpPattern = { start: [], unit: [3, 2, 1] };

/** pc de la tónica → patrón, para tríadas mayores. */
const RH_MAJOR: Record<number, ArpPattern> = {
  0: RH_1231, 2: RH_1231, 4: RH_1231, 5: RH_1231, 7: RH_1231, 9: RH_1231, 11: RH_1231, 6: RH_1231,
  1: RH_2124, 3: RH_2124, 8: RH_2124, 10: RH_2124,
};
const RH_MINOR: Record<number, ArpPattern> = {
  0: RH_1231, 2: RH_1231, 3: RH_1231, 4: RH_1231, 5: RH_1231, 7: RH_1231, 9: RH_1231, 11: RH_1231,
  1: RH_2124, 6: RH_2124, 8: RH_2124,
  10: RH_2312,
};
const LH_MAJOR: Record<number, ArpPattern> = {
  0: LH_1421, 5: LH_1421, 7: LH_1421,
  2: LH_1321, 4: LH_1321, 9: LH_1321, 11: LH_1321, 6: LH_1321,
  1: LH_2142, 3: LH_2142, 8: LH_2142,
  10: LH_3213,
};
const LH_MINOR: Record<number, ArpPattern> = {
  0: LH_1421, 2: LH_1421, 3: LH_1421, 4: LH_1421, 5: LH_1421, 7: LH_1421, 9: LH_1421, 11: LH_1421,
  1: LH_2142, 6: LH_2142, 8: LH_2142,
  10: LH_3213,
};

function expand(p: ArpPattern, length: number): number[] {
  const out = [...p.start];
  let i = 0;
  while (out.length < length) { out.push(p.unit[i % p.unit.length]); i++; }
  return out.slice(0, length);
}

export interface ArpeggioPlan {
  /** Notas con octava, ascendentes, incluida la tónica de arriba. */
  notes: string[];
  right: number[];
  left: number[];
  /** true cuando la digitación es la regla general y no una tabla verificada. */
  suggested: boolean;
  /** Aclaración para mostrar debajo. */
  note?: string;
}

const pcOf = (name: string): number => {
  const n = CHROMATIC_NOTES.includes(name) ? name : (ENHARMONIC_MAP[name] || name);
  return Math.max(0, CHROMATIC_NOTES.indexOf(n));
};

/**
 * Arma un arpegio: notas, digitación de las dos manos y de cuántas octavas.
 * `octaves` va de 1 a 3.
 */
export function buildArpeggio(
  rootName: string, typeId: string, octaves = 2, baseOctave = 3,
): ArpeggioPlan {
  const type = ARPEGGIO_TYPES.find(t => t.id === typeId) ?? ARPEGGIO_TYPES[0];
  const pc = pcOf(rootName);
  const per = type.intervals.length;
  const count = per * octaves + 1;

  const notes: string[] = [];
  for (let i = 0; i < count; i++) {
    const oct = Math.floor(i / per);
    const semis = type.intervals[i % per] + 12 * oct;
    const total = pc + semis;
    notes.push(`${CHROMATIC_NOTES[total % 12]}${baseOctave + Math.floor(total / 12)}`);
  }

  const conocido = typeId === 'major' || typeId === 'minor';
  if (!conocido) {
    /* Sin tabla publicada (séptimas, disminuido, aumentado) se aplica la ley:
       el ciclo de dedos se corre para que el pulgar caiga en tecla blanca. Si
       todas las notas del grupo son negras, el pulgar pisa negra y no hay
       vuelta — es la excepción conocida. */
    const { right, left, todasNegras } = thumbOnWhite(notes, per, count);
    return {
      notes, right, left, suggested: true,
      note: todasNegras
        ? 'Todas las notas del grupo son negras, así que acá el pulgar sí pisa negra: es la excepción.'
        : `Base ${Array.from({ length: per }, (_, i) => i + 1).join('-')}, corrida para que el pulgar caiga en tecla blanca. El pulgar es corto: apoyarlo en una negra tuerce la mano.`,
    };
  }

  const menor = typeId === 'minor';
  const rh = (menor ? RH_MINOR : RH_MAJOR)[pc] ?? RH_1231;
  const lh = (menor ? LH_MINOR : LH_MAJOR)[pc] ?? LH_1421;

  return {
    notes,
    right: expand(rh, count),
    left: expand(lh, count),
    suggested: false,
    note: 'El patrón se repite cada octava: una vez que la mano lo agarra, sirve para todas las octavas que quieras.',
  };
}

/** Corre el ciclo de dedos para que el pulgar caiga en una tecla blanca. */
function thumbOnWhite(notes: string[], per: number, count: number) {
  const negra = (n: string) => n.includes('#');
  const todasNegras = notes.slice(0, per).every(negra);
  let k = 0;
  if (!todasNegras) for (let i = 0; i < per; i++) if (!negra(notes[i])) { k = i; break; }

  const right: number[] = [];
  const left: number[] = [];
  for (let i = 0; i < count; i++) {
    right.push(((((i - k) % per) + per) % per) + 1);
    left.push(((((k - i) % per) + per) % per) + 1);
  }
  if (left[0] === 1) left[0] = 5;   // el meñique toma la nota de abajo
  return { right, left, todasNegras };
}

export interface Drill {
  id: string;
  title: string;
  goal: string;
  steps: string[];
  /** Cuánto tiempo dedicarle antes de pasar al siguiente. */
  dose: string;
  level: 'Base' | 'Intermedio' | 'Avanzado';
}

export const ARPEGGIO_DRILLS: Drill[] = [
  {
    id: 'bloque-quebrado', title: 'Bloque → quebrado', level: 'Base',
    goal: 'Que la mano llegue ya con la forma armada, en vez de buscar cada nota.',
    dose: '2 minutos por tonalidad',
    steps: [
      'Tocá las tres notas juntas, como acorde, y quedate ahí sintiendo la apertura.',
      'Soltá y volvé a armar el acorde en el aire, sin tocar, tres veces.',
      'Ahora desplegalo: las mismas notas una por una, con la misma forma de mano.',
      'Si al desplegar la mano cambia de forma, volvé al bloque. Ese es el error.',
    ],
  },
  {
    id: 'nota-de-giro', title: 'Subir y bajar con nota de giro', level: 'Base',
    goal: 'Que la vuelta suene igual de pareja que la ida.',
    dose: '4 pasadas lentas',
    steps: [
      'Subí una octava (1-3-5-8) y bajá sin parar (8-5-3-1), como una sola respiración.',
      'La nota de arriba no se acentúa: es el punto donde el brazo cambia de dirección, no un golpe.',
      'Escuchá sólo la vuelta. Casi siempre es más floja que la ida.',
    ],
  },
  {
    id: 'tres-inversiones', title: 'Las tres posiciones seguidas', level: 'Intermedio',
    goal: 'Reconocer el arpegio empiece donde empiece: es lo que pasa en la música real.',
    dose: '3 tonalidades por día',
    steps: [
      'Posición fundamental, una octava, ida y vuelta.',
      'Primera inversión (empezando por la tercera), lo mismo.',
      'Segunda inversión (empezando por la quinta), lo mismo.',
      'Después encadenalas sin parar: fundamental → 1ª → 2ª → fundamental una octava arriba.',
    ],
  },
  {
    id: 'brazo', title: 'El arco del brazo', level: 'Intermedio',
    goal: 'Sacar el trabajo de los dedos y pasarlo al brazo, que es lo que permite velocidad.',
    dose: '3 minutos',
    steps: [
      'Tocá el arpegio en dos octavas mirando el CODO, no la mano.',
      'El codo tiene que abrirse suavemente al subir y cerrarse al bajar, en un solo movimiento continuo.',
      'Si el codo se queda quieto y los dedos estiran, el arpegio se traba en cuanto subas el tempo.',
      'Prueba de control: tocalo con los ojos cerrados. Si te perdés de octava, todavía estás guiando con la vista.',
    ],
  },
  {
    id: 'alberti', title: 'Bajo de Alberti', level: 'Intermedio',
    goal: 'El arpegio como acompañamiento real, no como ejercicio.',
    dose: '2 minutos por mano',
    steps: [
      'Patrón: grave – agudo – medio – agudo (5-1-3-1 en la izquierda).',
      'El grave lleva un poco más de peso; las otras tres van casi susurradas.',
      'Cuando salga parejo, agregá la melodía con la derecha.',
      'Es el acompañamiento de media sonata de Mozart: practicarlo es repertorio, no gimnasia.',
    ],
  },
  {
    id: 'manos-cruzadas', title: 'Manos alternadas en cuatro octavas', level: 'Avanzado',
    goal: 'Cubrir el teclado entero sin cortar el sonido.',
    dose: '4 pasadas',
    steps: [
      'La izquierda hace la primera octava, la derecha sigue con la segunda, y así hasta arriba.',
      'La mano que espera ya tiene que estar sobre sus teclas antes de que la otra termine.',
      'Buscá que no se note dónde cambia de mano: eso es todo el ejercicio.',
    ],
  },
  {
    id: 'ritmos-arp', title: 'Los tres ritmos', level: 'Avanzado',
    goal: 'Romper el automatismo y volver a mapear el pasaje.',
    dose: '1 minuto cada uno',
    steps: [
      'Tresillos: con tres notas por octava, el acento cae en una nota distinta cada vez.',
      'Punteado largo-corto, y después corto-largo.',
      'Acentos cada cuatro sobre un arpegio de tríada: el acento se corre solo y te obliga a contar.',
    ],
  },
];

export const TRIAD_DRILLS: Drill[] = [
  {
    id: 'cuatro-calidades', title: 'Las cuatro calidades sobre la misma tónica', level: 'Base',
    goal: 'Oír que entre mayor y menor hay una sola nota, y que dim y aug son las esquinas.',
    dose: '1 minuto por tónica',
    steps: [
      'Armá la tríada mayor y sostenela.',
      'Bajá SÓLO la nota del medio un semitono: ya es menor.',
      'Ahora bajá también la de arriba: disminuida.',
      'Volvé a mayor y subí la de arriba: aumentada.',
      'Hacelo con los ojos cerrados y nombrá en voz alta qué estás oyendo.',
    ],
  },
  {
    id: 'diatonicas', title: 'Las siete de la tonalidad, con la mano fija', level: 'Base',
    goal: 'Que salgan solos los acordes de una tonalidad, sin pensar la fórmula.',
    dose: '2 tonalidades por día',
    steps: [
      'Poné 1-3-5 sobre la tónica y subí grado por grado sin cambiar la forma de la mano.',
      'Nombrá cada uno mientras lo tocás: I mayor, ii menor, iii menor, IV mayor, V mayor, vi menor, vii disminuido.',
      'Bajá haciendo lo mismo, y prestá atención a que el vii suena distinto: ahí está el disminuido.',
    ],
  },
  {
    id: 'tacto', title: 'Reconocer al tacto', level: 'Intermedio',
    goal: 'Identificar la calidad por cómo se siente la mano, sin mirar ni contar.',
    dose: '3 minutos',
    steps: [
      'Mayor: 4 semitonos abajo y 3 arriba. La mano se siente "abierta abajo".',
      'Menor: 3 y 4. Se siente "abierta arriba".',
      'Disminuida: 3 y 3, la más cerrada de todas.',
      'Aumentada: 4 y 4, la más abierta y perfectamente pareja.',
      'Cerrá los ojos, que alguien te diga una tónica y una calidad, y armala sin mirar.',
    ],
  },
  {
    id: 'ciclo-triadas', title: 'Las 12 por ciclo de quintas', level: 'Avanzado',
    goal: 'Cubrir las doce tonalidades en un orden que el oído reconoce.',
    dose: '1 vuelta completa',
    steps: [
      'Do → Sol → Re → La → Mi → Si → Fa♯ → Re♭ → La♭ → Mi♭ → Si♭ → Fa → Do.',
      'Cada una en las tres posiciones antes de pasar a la siguiente.',
      'Sin metrónomo la primera vuelta; con metrónomo la segunda.',
    ],
  },
];

export const INVERSION_DRILLS: Drill[] = [
  {
    id: 'carrusel', title: 'El carrusel', level: 'Base',
    goal: 'Que las tres posiciones sean la misma cosa vista desde otro lado.',
    dose: '2 minutos por mano',
    steps: [
      'Fundamental, primera, segunda, y otra vez fundamental una octava arriba.',
      'Fijate que en cada paso sube una sola nota: la de más abajo salta arriba de todo.',
      'Bajá haciendo el camino inverso.',
      'Después, las dos manos juntas, separadas por una octava.',
    ],
  },
  {
    id: 'mas-cerca', title: 'La inversión más cercana', level: 'Intermedio',
    goal: 'Dejar de saltar entre acordes: es lo que separa a un acompañamiento amateur de uno profesional.',
    dose: '4 progresiones',
    steps: [
      'Tocá Do en posición fundamental (Do-Mi-Sol).',
      'Para ir a Fa, no saltes: usá la inversión que tenga notas en común. Fa en 2ª inversión (Do-Fa-La) comparte el Do.',
      'Para volver a Sol, usá Sol en 1ª inversión (Si-Re-Sol).',
      'Regla: que ninguna voz se mueva más de un tono si se puede evitar.',
      'Hacé lo mismo con I-vi-IV-V y con ii-V-I.',
    ],
  },
  {
    id: 'cadena', title: 'Cadena de inversiones en dos octavas', level: 'Intermedio',
    goal: 'Cubrir el teclado con un solo acorde y no perder la referencia.',
    dose: '3 pasadas',
    steps: [
      'Subí fundamental → 1ª → 2ª → fundamental → 1ª → 2ª hasta el final del registro cómodo.',
      'Nombrá en voz alta qué nota está en el bajo en cada paso.',
      'Bajá igual. Al bajar casi siempre se pierde la cuenta: ahí está el trabajo.',
    ],
  },
  {
    id: 'bajo-dado', title: 'Te doy el bajo, armá el acorde', level: 'Avanzado',
    goal: 'Leer cifrados con barra (C/E, G/B) sin pensarlos.',
    dose: '10 consignas',
    steps: [
      'Alguien (o la app) te dice: "Do mayor con Mi en el bajo".',
      'Armalo sin pasar por la posición fundamental: la mano tiene que ir directo.',
      'Verificá: si el intervalo ancho quedó arriba, es primera inversión; si quedó abajo, segunda.',
      'Con séptimas hay una cuarta posición: la séptima en el bajo (tercera inversión).',
    ],
  },
  {
    id: 'quebradas', title: 'Inversiones quebradas', level: 'Avanzado',
    goal: 'Unir inversiones y arpegios, que en la música real van juntos.',
    dose: '2 minutos',
    steps: [
      'Arpegiá cada inversión en vez de tocarla en bloque.',
      'Encadenalas sin cortar el sonido: la última nota de una es la primera de la siguiente.',
      'Después hacelo con el pedal, cambiándolo justo en cada acorde nuevo.',
    ],
  },
];

/* ================================================================== */
/*  4. Velocidad                                                       */
/* ================================================================== */

export interface SpeedStep { bpm: number; note: string }

/**
 * La escalera: subir sólo cuando salió limpio, y bajar apenas se ensucia.
 * El número exacto importa menos que la regla; lo que hace efecto es que la
 * decisión no sea del ánimo del día.
 */
export const SPEED_LADDER = {
  rule: '8 pasadas limpias seguidas → +4 BPM. Un solo error → −8 BPM y volvés a contar desde cero.',
  why: 'Subir de a poco y bajar de golpe hace que casi siempre estés tocando a una velocidad donde no te equivocás. La técnica se construye repitiendo aciertos, no corrigiendo errores.',
  start: 'Arrancá al 60 % de tu máximo cómodo, no al máximo.',
  ceiling: 'Si te trabás tres veces en el mismo BPM, el problema no es la velocidad: es la digitación o el movimiento. Volvé a lento y arreglá eso.',
};

export interface RhythmVariant { id: string; name: string; pattern: string; why: string }

export const RHYTHM_VARIANTS: RhythmVariant[] = [
  { id: 'punteado', name: 'Punteado largo-corto', pattern: '♩. ♪ ♩. ♪', why: 'La nota corta obliga a que el dedo siguiente ya esté preparado. Es el ejercicio que más rápido limpia un pasaje.' },
  { id: 'punteado-inv', name: 'Punteado corto-largo', pattern: '♪ ♩. ♪ ♩.', why: 'Al revés del anterior: cambia qué par de dedos trabaja rápido. Hay que hacer los dos.' },
  { id: 'tresillos', name: 'Tresillos', pattern: '3 · 3 · 3', why: 'Con siete notas por octava el acento se corre solo y no podés tocar en piloto automático.' },
  { id: 'grupos', name: 'Grupos de 4 con parada', pattern: '4 + silencio', why: 'Tocás cuatro notas rápido y parás. La velocidad se practica en tandas cortas, no en pasadas largas.' },
  { id: 'acentos', name: 'Acentos cada 3', pattern: '> · · > · ·', why: 'Reagrupar obliga al cerebro a re-mapear el pasaje en vez de repetirlo.' },
];

export const SPEED_DRILLS: Drill[] = [
  {
    id: 'grupos-cortos', title: 'Grupos cortos a velocidad final', level: 'Base',
    goal: 'Tocar rápido de verdad desde el primer día, pero en tandas de cuatro notas.',
    dose: '5 minutos',
    steps: [
      'Elegí cuatro notas del pasaje.',
      'Tocalas a la velocidad final, de un saque, y pará.',
      'Respirá, y otra vez. Diez veces.',
      'Después corré la ventana una nota y repetí. Nunca practicás lento lo que después va rápido: practicás rápido pero poco.',
    ],
  },
  {
    id: 'escalera', title: 'La escalera del metrónomo', level: 'Intermedio',
    goal: 'Subir la velocidad sin acumular errores.',
    dose: '10 minutos',
    steps: [
      'Poné el metrónomo al 60 % de tu máximo cómodo.',
      'Ocho pasadas limpias seguidas → subí 4 BPM.',
      'Un error → bajá 8 BPM y empezá a contar de nuevo.',
      'Anotá dónde terminaste. Mañana arrancá 8 BPM abajo de eso.',
    ],
  },
  {
    id: 'sin-metronomo', title: 'La pasada sin red', level: 'Intermedio',
    goal: 'Comprobar si la velocidad es tuya o del metrónomo.',
    dose: '1 pasada',
    steps: [
      'Apagá el metrónomo y tocá el pasaje al tempo que venías.',
      'Grabate con el celular.',
      'Escuchá: casi siempre el tempo se va acelerando en las partes fáciles y frenando en las difíciles.',
      'Eso que se frena es lo único que hay que practicar mañana.',
    ],
  },
  {
    id: 'umbral', title: 'Buscar el umbral', level: 'Avanzado',
    goal: 'Saber cuál es tu velocidad real de hoy, que casi nunca es la que creés.',
    dose: '3 minutos',
    steps: [
      'Subí de a 10 BPM hasta que se rompa.',
      'Bajá 20 desde ahí: ese es tu tempo de trabajo de esta semana.',
      'No practiques arriba del umbral: repetir el error lo aprende igual de bien que el acierto.',
    ],
  },
];

/* ================================================================== */
/*  5. Técnica                                                         */
/* ================================================================== */

export interface TechniqueCheck {
  id: string;
  title: string;
  /** Qué tiene que pasar. */
  right: string;
  /** El error concreto y cómo se detecta. */
  wrong: string;
  /** Cómo comprobarlo vos solo. */
  test: string;
}

export const TECHNIQUE_CHECKS: TechniqueCheck[] = [
  {
    id: 'arco',
    title: 'La bóveda de la mano',
    right: 'Los nudillos altos y los dedos curvados, como si tuvieras una pelotita de tenis en la palma. La fuerza baja por el hueso, no por el músculo.',
    wrong: 'Los nudillos hundidos: el dedo se dobla al revés en la primera falange y toda la carga pasa al tendón.',
    test: 'Apoyá la mano sobre la tapa y empujá suave. Si los nudillos ceden, todavía no tenés la bóveda.',
  },
  {
    id: 'muneca',
    title: 'Muñeca al nivel del teclado',
    right: 'Antebrazo, muñeca y nudillos casi en línea recta. La muñeca respira: sube un poco al final de la frase y baja al empezar.',
    wrong: 'Muñeca caída (apoyada abajo) o quebrada para arriba. Las dos trancan el paso del pulgar y cansan en dos minutos.',
    test: 'Tocá cinco notas y fijate si podés pasar un lápiz por debajo de la muñeca sin tocarla.',
  },
  {
    id: 'pulgar',
    title: 'El paso del pulgar',
    right: 'El pulgar empieza a viajar por debajo de la palma MIENTRAS los otros dedos siguen tocando. Cuando le toca, ya está abajo de su tecla.',
    wrong: 'Esperar a terminar el 3 y recién ahí mover el pulgar: se oye un bache y la mano da un tirón.',
    test: 'Tocá 1-2-3 y quedate en el 3. Sin soltar, mirá dónde está el pulgar: tiene que estar debajo del 3, no al costado.',
  },
  {
    id: 'codo',
    title: 'El codo acompaña',
    right: 'El codo se abre suavemente al subir y se cierra al bajar. En arpegios grandes, el brazo entero viaja y los dedos casi no estiran.',
    wrong: 'El codo pegado al cuerpo y los dedos estirándose para llegar. Ahí aparecen las lesiones.',
    test: 'Tocá un arpegio de dos octavas mirando el codo. Si no se movió, estás estirando.',
  },
  {
    id: 'peso',
    title: 'Peso, no golpe',
    right: 'El sonido sale de dejar caer el peso del brazo hasta el fondo de la tecla, y soltar enseguida.',
    wrong: 'Percutir desde el dedo con el brazo rígido. Suena duro y no da matices.',
    test: 'Tocá una nota fuerte y, sin soltarla, aflojá todo el brazo. Si la nota se apaga, estabas apretando de más.',
  },
  {
    id: 'relajacion',
    title: 'Soltar entre nota y nota',
    right: 'Después de cada tecla hay una milésima de relajación. Tocar rápido es soltar rápido, no apretar rápido.',
    wrong: 'Mantener la tensión toda la escala. Se nota porque el antebrazo queda duro y a los 30 segundos arde.',
    test: 'Pará en el medio de una pasada y dejá caer el brazo al costado. Si no cae solo, estabas tenso.',
  },
  {
    id: 'sentado',
    title: 'La distancia y la altura',
    right: 'Sentado en el borde de la banqueta, codos apenas por encima del nivel de las teclas, pies apoyados. La distancia justa es la que te deja alcanzar los extremos sin estirar el tronco.',
    wrong: 'Muy cerca (los codos chocan con el cuerpo) o muy bajo (las muñecas quedan abajo del teclado).',
    test: 'Con las manos en el Do central, los codos tienen que quedar apenas adelante del torso, no a los costados.',
  },
  {
    id: 'mirada',
    title: 'Dónde poner la atención',
    right: 'En el sonido que sale y en el fondo de la tecla. El foco externo da mejor ejecución y mejor retención.',
    wrong: 'Mirar los dedos y pensar en ellos. Es el hallazgo más replicado del aprendizaje motor: el foco interno empeora la ejecución.',
    test: 'Tocá la escala pensando "que todas suenen igual de parejas" en vez de "que el pulgar pase limpio". Se nota en la primera pasada.',
  },
];

/* ================================================================== */
/*  6. Ayudas                                                          */
/* ================================================================== */

/** Notas escritas de una escala, en la ortografía correcta de esa tonalidad. */
export function scaleSpelled(rootName: string, mode: 'major' | 'minor'): string[] {
  const scale = SCALES_DATABASE.find(s => s.id === (mode === 'major' ? 'major' : 'minor_natural'));
  if (!scale) return [];
  return spellScaleNotes(rootName, scale);
}

/** En qué nota cae un dedo dado, para señalar el faro de la escala. */
export function fingerLandmark(spelled: string[], fingers: number[], finger: number): string[] {
  const out: string[] = [];
  fingers.forEach((f, i) => { if (f === finger && spelled[i] && !out.includes(spelled[i])) out.push(spelled[i]); });
  return out;
}
