/**
 * Biblioteca de piezas: un solo lugar donde buscar TODO lo que se puede tocar
 * en la Catarata.
 *
 * El selector viejo era un `<select>` nativo con seis piezas. Con cientos de
 * piezas eso no escala: hace falta buscar, filtrar y tener a mano lo último y
 * lo favorito. Este módulo unifica cinco orígenes distintos en un catálogo con
 * la misma forma, y las piezas pesadas se construyen recién cuando se abren.
 *
 *  1. `midi`      — las piezas que vienen con la app
 *  2. `imported`  — .mid que subiste
 *  3. `stems`     — transcripciones de YouTube separadas por instrumento
 *  4. `method`    — los ejercicios de Hanon, Czerny y Suzuki
 *  5. `scale`     — escalas y arpegios generados en las 12 tonalidades
 *
 * Los orígenes 4 y 5 no ocupan lugar: se generan al vuelo. Solo con las
 * escalas ya son casi cien piezas de práctica sin descargar nada.
 */
import {
  PRELOADED_WATERFALL_SONGS, WaterfallSong, WaterfallNote,
  buildWaterfallFromScale,
} from './midiWaterfall';
import { CLASSICAL_BOOKS, type ClassicalExercise, type MethodNote } from '../data/classicalMethodsData';
import {
  ALL_SCALE_ROOTS, SCALES_DATABASE, calculateScaleNotes, preferredRootName, keyName,
} from './musicGymTheory';
import { localIndex } from './songStore';

export type PieceSource = 'midi' | 'imported' | 'stems' | 'method' | 'scale';
export type Difficulty = 'Fácil' | 'Intermedio' | 'Avanzado';

export interface LibraryPiece {
  id: string;
  title: string;
  composer: string;
  source: PieceSource;
  difficulty: Difficulty;
  bpm: number;
  /** Segundos; 0 si todavía no se calculó (piezas generadas). */
  duration: number;
  notesCount: number;
  description: string;
  /** Palabras sueltas para que el buscador encuentre por tonalidad, libro, etc. */
  tags: string[];
  /** Pistas por instrumento, si las tiene. */
  trackNames?: string[];
}

export const SOURCE_LABEL: Record<PieceSource, string> = {
  midi: 'Repertorio',
  imported: 'Importadas',
  stems: 'De YouTube',
  method: 'Métodos',
  scale: 'Escalas',
};

const LIB_KEY = 'pianomaster_library_v1';
const CUSTOM_KEY = 'pianomaster_custom_songs_v1';

/* ------------------------------------------------------------------ */
/*  Conversión de los métodos clásicos                                 */
/* ------------------------------------------------------------------ */
/** Duración de figura → negras. */
const BEATS: Record<string, number> = { '1n': 4, '2n': 2, '4n': 1, '8n': 0.5, '16n': 0.25, '4t': 2 / 3, '8t': 1 / 3 };

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function noteToMidi(name: string): number {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name.trim());
  if (!m) return 60;
  let pc = NOTE_NAMES.indexOf(m[1]);
  if (pc < 0) {
    // nombres con bemol: se pasan al equivalente en sostenidos
    const flat: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E' };
    pc = NOTE_NAMES.indexOf(flat[m[1]] ?? 'C');
  }
  return pc + (Number(m[2]) + 1) * 12;
}

/**
 * Un ejercicio de método pasa a pieza de catarata. Cada mano lleva su propio
 * reloj: en Hanon las dos manos van al unísono pero con figuras propias, así
 * que sumar las duraciones por separado es lo que las mantiene alineadas.
 */
export function exerciseToSong(ex: ClassicalExercise): WaterfallSong {
  const spb = 60 / ex.recommendedBpm;
  const notes: WaterfallNote[] = [];
  let i = 0;
  for (const [hand, list] of [['right', ex.rightHandNotes], ['left', ex.leftHandNotes]] as const) {
    let t = 0;
    for (const n of list as MethodNote[]) {
      const dur = (BEATS[n.duration] ?? 0.5) * spb;
      notes.push({
        id: `${ex.id}-${hand}-${i++}`,
        name: n.note,
        midi: noteToMidi(n.note),
        time: +t.toFixed(4),
        duration: +(dur * 0.92).toFixed(4), // aire entre notas para que se lean separadas
        velocity: n.articulation === 'accent' ? 1 : 0.8,
        hand,
        finger: n.fingering,
      });
      t += dur;
    }
  }
  notes.sort((a, b) => a.time - b.time);
  const duration = notes.length ? Math.max(...notes.map(n => n.time + n.duration)) : 0;
  return {
    id: `method:${ex.id}`,
    title: ex.title,
    composer: CLASSICAL_BOOKS.find(b => b.id === ex.bookId)?.author ?? 'Método clásico',
    difficulty: ex.difficulty === 'Principiante' ? 'Fácil' : ex.difficulty,
    bpm: ex.recommendedBpm,
    duration: +duration.toFixed(2),
    notesCount: notes.length,
    description: ex.subtitle,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/*  Escalas y arpegios generados                                       */
/* ------------------------------------------------------------------ */
const SCALE_BPM = 84;

export function scalePieceId(pc: number, scaleId: string) { return `scale:${pc}:${scaleId}`; }

export function scaleToSong(pc: number, scaleId: string): WaterfallSong {
  const scale = SCALES_DATABASE.find(s => s.id === scaleId) ?? SCALES_DATABASE[0];
  const rootName = preferredRootName(pc, scaleId);
  const keys = calculateScaleNotes(keyName(pc), scale);
  const fingering = scale.fingeringRightHand;
  const notes = buildWaterfallFromScale(rootName, scale.name, keys, fingering, SCALE_BPM);
  const duration = notes.length ? Math.max(...notes.map(n => n.time + n.duration)) : 0;
  return {
    id: scalePieceId(pc, scaleId),
    title: `${rootName} ${scale.name}`,
    composer: 'Gimnasio de escalas',
    difficulty: ALL_SCALE_ROOTS[pc].difficulty === 'Fácil' ? 'Fácil'
      : ALL_SCALE_ROOTS[pc].difficulty === 'Media' ? 'Intermedio' : 'Avanzado',
    bpm: SCALE_BPM,
    duration: +duration.toFixed(2),
    notesCount: notes.length,
    description: `${scale.formula} · ${scale.mood}`,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/*  Catálogo                                                           */
/* ------------------------------------------------------------------ */
const asPiece = (s: WaterfallSong, source: PieceSource, tags: string[]): LibraryPiece => ({
  id: s.id, title: s.title, composer: s.composer, source,
  difficulty: s.difficulty, bpm: s.bpm, duration: s.duration,
  notesCount: s.notesCount, description: s.description,
  tags: [...tags, s.composer, s.difficulty].filter(Boolean).map(t => t.toLowerCase()),
  trackNames: s.tracks?.map(t => t.name),
});

/**
 * Las piezas importadas viven en el servidor; acá alcanza con su ficha, que
 * `songStore` mantiene al día en el índice local. Sin notas: el catálogo tiene
 * que poder listar cientos sin cargar megas.
 */
function importedSummaries(): WaterfallSong[] {
  return localIndex().map(s => ({ ...s, notes: [] } as WaterfallSong));
}

/** Piezas viejas que todavía no migraron de la clave anterior. */
function legacySongs(): WaterfallSong[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; }
}

function customSongs(): WaterfallSong[] {
  const imported = importedSummaries();
  const ids = new Set(imported.map(s => s.id));
  return [...imported, ...legacySongs().filter(s => !ids.has(s.id))];
}

/** Todo lo tocable, sin construir las notas de lo que se genera al vuelo. */
export function catalog(): LibraryPiece[] {
  const out: LibraryPiece[] = [];

  for (const s of PRELOADED_WATERFALL_SONGS) out.push(asPiece(s, 'midi', ['repertorio', 'clásico']));

  for (const s of customSongs()) {
    const source: PieceSource = s.sourceJobId ? 'stems' : 'imported';
    out.push(asPiece(s, source, source === 'stems'
      ? ['youtube', 'separada', 'instrumentos', ...(s.tracks?.map(t => t.name) ?? [])]
      : ['midi', 'importada']));
  }

  for (const book of CLASSICAL_BOOKS) {
    for (const ex of book.exercises) {
      out.push({
        id: `method:${ex.id}`,
        title: ex.title,
        composer: book.author,
        source: 'method',
        difficulty: ex.difficulty === 'Principiante' ? 'Fácil' : ex.difficulty,
        bpm: ex.recommendedBpm,
        duration: 0,
        notesCount: ex.rightHandNotes.length + ex.leftHandNotes.length,
        description: ex.subtitle,
        tags: [book.id, book.title, book.author, ex.focusTechnique, ex.keySignature, `nº ${ex.exerciseNumber}`]
          .filter(Boolean).map(t => String(t).toLowerCase()),
      });
    }
  }

  for (const root of ALL_SCALE_ROOTS) {
    for (const scale of SCALES_DATABASE) {
      const rootName = preferredRootName(root.pc, scale.id);
      out.push({
        id: scalePieceId(root.pc, scale.id),
        title: `${rootName} ${scale.name}`,
        composer: 'Gimnasio de escalas',
        source: 'scale',
        difficulty: root.difficulty === 'Fácil' ? 'Fácil' : root.difficulty === 'Media' ? 'Intermedio' : 'Avanzado',
        bpm: SCALE_BPM,
        duration: 0,
        notesCount: scale.intervals.length * 2 - 1,
        description: `${scale.formula} · ${scale.mood}`,
        tags: [rootName, root.solfege, scale.name, scale.category, scale.id, 'escala', 'digitación']
          .map(t => String(t).toLowerCase()),
      });
    }
  }

  return out;
}

/** Construye la pieza completa. Solo acá se generan las notas. */
export function resolvePiece(id: string): WaterfallSong | null {
  if (id.startsWith('method:')) {
    const exId = id.slice(7);
    for (const b of CLASSICAL_BOOKS) {
      const ex = b.exercises.find(e => e.id === exId);
      if (ex) return exerciseToSong(ex);
    }
    return null;
  }
  if (id.startsWith('scale:')) {
    const [, pc, scaleId] = id.split(':');
    return scaleToSong(Number(pc), scaleId);
  }
  // Las importadas se resuelven de forma asíncrona en la catarata (songStore);
  // acá solo se devuelven las que ya tienen notas a mano.
  const local = legacySongs().find(s => s.id === id) ?? PRELOADED_WATERFALL_SONGS.find(s => s.id === id);
  return local && local.notes?.length ? local : null;
}

/* ------------------------------------------------------------------ */
/*  Búsqueda                                                           */
/* ------------------------------------------------------------------ */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Puntuación simple y predecible: el título pesa más que el compositor, y este
 * más que las etiquetas. Se exige que TODAS las palabras aparezcan en algún
 * lado, así "hanon 3" y "do mayor" filtran de verdad en vez de traer medio
 * catálogo. Sin fuzzy: con nombres de piezas, adivinar de más molesta.
 */
export function search(pieces: LibraryPiece[], query: string): LibraryPiece[] {
  /* Se corta también por guiones, guiones bajos y puntos: los nombres de
     archivo vienen como "escala-do.mid" y nadie va a escribir el espacio.
     El # se respeta, que distingue "fa#" de "fa". */
  const words = norm(query).split(/[\s_\-./]+/).filter(Boolean);
  if (!words.length) return pieces;
  const scored: { p: LibraryPiece; score: number }[] = [];
  for (const p of pieces) {
    const title = norm(p.title), composer = norm(p.composer);
    const tags = p.tags.map(norm).join(' ');
    const desc = norm(p.description || '');
    let score = 0, all = true;
    for (const w of words) {
      let s = 0;
      if (title.startsWith(w)) s = 100;
      else if (title.includes(w)) s = 60;
      else if (composer.includes(w)) s = 30;
      else if (tags.includes(w)) s = 18;
      else if (desc.includes(w)) s = 8;
      if (s === 0) { all = false; break; }
      score += s;
    }
    if (all) scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title)).map(x => x.p);
}

/* ------------------------------------------------------------------ */
/*  Favoritos y recientes (viajan en el perfil sincronizado)           */
/* ------------------------------------------------------------------ */
export interface LibraryState { favorites: string[]; recent: string[] }

export function loadLibraryState(): LibraryState {
  try {
    const s = JSON.parse(localStorage.getItem(LIB_KEY) || 'null');
    if (s && Array.isArray(s.favorites) && Array.isArray(s.recent)) return s;
  } catch { /* se arma de nuevo */ }
  return { favorites: [], recent: [] };
}

export function saveLibraryState(s: LibraryState) {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(s)); } catch { /* modo privado */ }
}

export function toggleFavorite(s: LibraryState, id: string): LibraryState {
  const favorites = s.favorites.includes(id) ? s.favorites.filter(f => f !== id) : [id, ...s.favorites];
  const next = { ...s, favorites };
  saveLibraryState(next);
  return next;
}

/** Las últimas 20 abiertas, sin repetir. */
export function pushRecent(s: LibraryState, id: string): LibraryState {
  const next = { ...s, recent: [id, ...s.recent.filter(r => r !== id)].slice(0, 20) };
  saveLibraryState(next);
  return next;
}
