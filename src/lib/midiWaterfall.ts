import { Midi } from '@tonejs/midi';

export interface WaterfallNote {
  id: string;
  name: string;          // e.g. "C4", "F#4"
  midi: number;          // MIDI pitch 21 to 108
  time: number;          // Start time in seconds
  duration: number;      // Duration in seconds
  velocity: number;      // 0 to 1
  hand: 'right' | 'left'; // 'right' (cyan) or 'left' (red)
  track?: string;        // id de pista (instrumento). Si falta, la pista es la mano.
  finger?: number;       // 1, 2, 3, 4, 5 technical fingering
  played?: boolean;
  missed?: boolean;
}

/** Pista de una pieza: por defecto las dos manos; para piezas separadas por instrumento, una por stem. */
export interface WaterfallTrack {
  id: string;            // 'right' | 'left' | 'piano' | 'guitar' | ...
  name: string;
  color: string;         // color base (hex)
}

export const HAND_TRACKS: WaterfallTrack[] = [
  { id: 'right', name: 'Mano derecha', color: '#f97316' },
  { id: 'left',  name: 'Mano izquierda', color: '#a855f7' },
];

export const INSTRUMENT_TRACKS: Record<string, WaterfallTrack> = {
  piano:  { id: 'piano',  name: 'Piano',    color: '#f97316' },
  guitar: { id: 'guitar', name: 'Guitarra', color: '#fbbf24' },
  bass:   { id: 'bass',   name: 'Bajo',     color: '#d946ef' },
  vocals: { id: 'vocals', name: 'Voz',      color: '#fb7185' },
  other:  { id: 'other',  name: 'Otros',    color: '#34d399' },
  drums:  { id: 'drums',  name: 'Batería',  color: '#38bdf8' },
};

/** Pistas de una pieza (las declaradas o, si no, las dos manos). */
export function songTracks(song: { tracks?: WaterfallTrack[] }): WaterfallTrack[] {
  return song.tracks && song.tracks.length > 0 ? song.tracks : HAND_TRACKS;
}
/** Id de pista de una nota (instrumento si lo tiene; si no, la mano). */
export function noteTrackId(n: { track?: string; hand: 'right' | 'left' }): string {
  return n.track ?? n.hand;
}

export interface WaterfallSong {
  id: string;
  title: string;
  composer: string;
  difficulty: 'Fácil' | 'Intermedio' | 'Avanzado';
  bpm: number;
  duration: number;      // Total duration in seconds
  notesCount: number;
  description: string;
  notes: WaterfallNote[];
  isCustom?: boolean;
  tracks?: WaterfallTrack[];   // pistas por instrumento (opcional)
  sourceJobId?: string;        // job de audio del que salió (para re-transcribir)
  /** Negras por compás. 4 salvo que la pieza diga otra cosa; se usa para la grilla. */
  beatsPerBar?: number;
  /** La escribiste vos acá adentro, no vino de un MIDI ni de un audio. */
  composed?: boolean;
}

/**
 * Una pieza en blanco para empezar a componer.
 *
 * Arranca con cuatro compases: suficiente para escribir una idea sin que la
 * línea de tiempo se vea vacía, y se agrandan con el botón de "+4 compases".
 */
export function emptySong(title = 'Pieza nueva', bpm = 100, beatsPerBar = 4): WaterfallSong {
  const compases = 4;
  return {
    id: `comp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    composer: 'Vos',
    difficulty: 'Fácil',
    bpm,
    beatsPerBar,
    duration: (60 / bpm) * beatsPerBar * compases,
    notesCount: 0,
    description: 'Escrita en la catarata.',
    notes: [],
    isCustom: true,
    composed: true,
    tracks: HAND_TRACKS.map(t => ({ ...t })),
  };
}

// Convert MIDI pitch number (e.g. 60) to Note Name (e.g. "C4")
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 60;
  let [, pitch, octStr] = match;
  if (pitch === 'Db') pitch = 'C#';
  else if (pitch === 'Eb') pitch = 'D#';
  else if (pitch === 'Gb') pitch = 'F#';
  else if (pitch === 'Ab') pitch = 'G#';
  else if (pitch === 'Bb') pitch = 'A#';
  
  const pitchIndex = NOTE_NAMES.indexOf(pitch);
  const octave = parseInt(octStr, 10);
  return (octave + 1) * 12 + pitchIndex;
}

/**
 * Parse a raw MIDI ArrayBuffer into a WaterfallSong
 */
/** Lo que el archivo declara de sí mismo, antes de que nadie lo edite. */
export interface MidiMeta {
  /** Nombre del archivo, ya limpio de extensión y guiones bajos. */
  fileTitle: string;
  /** Título que trae el propio MIDI (evento de nombre de la secuencia). */
  embeddedTitle: string;
  /** Autor que se deduce del archivo (nombre interno o copyright), si hay. */
  embeddedComposer: string;
  trackNames: string[];
  bpm: number;
  notesCount: number;
  duration: number;
  /** ¿El título interno dice algo o es un "Piano" / "Untitled" del secuenciador? */
  embeddedIsGeneric: boolean;
}

/** Sobrescribe lo que el archivo trae: lo elige la persona al importar. */
export interface MidiNaming {
  title?: string;
  composer?: string;
}

export function parseMidiFile(arrayBuffer: ArrayBuffer, fileName: string, naming?: MidiNaming): WaterfallSong {
  return parseMidiFileDetailed(arrayBuffer, fileName, naming).song;
}

export function parseMidiFileDetailed(
  arrayBuffer: ArrayBuffer, fileName: string, naming?: MidiNaming,
): { song: WaterfallSong; meta: MidiMeta } {
  const midi = new Midi(arrayBuffer);
  const parsedNotes: WaterfallNote[] = [];
  let noteCounter = 0;

  // Determine split strategy between tracks
  // If track has name containing 'left' or 'bass' or is lower average pitch
  const tracksWithNotes = midi.tracks.filter(t => t.notes.length > 0);

  tracksWithNotes.forEach((track, trackIndex) => {
    // Calculate average pitch of track to infer hand if multiple tracks
    const avgPitch = track.notes.reduce((sum, n) => sum + n.midi, 0) / (track.notes.length || 1);
    const trackNameLower = (track.name || '').toLowerCase();
    
    let defaultHand: 'right' | 'left' = 'right';
    if (trackNameLower.includes('left') || trackNameLower.includes('bass') || trackNameLower.includes('izq') || trackNameLower.includes('lh')) {
      defaultHand = 'left';
    } else if (trackNameLower.includes('right') || trackNameLower.includes('treble') || trackNameLower.includes('der') || trackNameLower.includes('rh')) {
      defaultHand = 'right';
    } else if (tracksWithNotes.length > 1) {
      defaultHand = trackIndex === 0 ? 'right' : (avgPitch < 60 ? 'left' : 'right');
    }

    track.notes.forEach(note => {
      // In single-track files, split notes below Middle C (MIDI 60) to left hand
      let hand = defaultHand;
      if (tracksWithNotes.length === 1) {
        hand = note.midi < 60 ? 'left' : 'right';
      }

      parsedNotes.push({
        id: `note-${noteCounter++}`,
        name: note.name,
        midi: note.midi,
        time: note.time,
        duration: Math.max(0.15, note.duration),
        velocity: note.velocity || 0.8,
        hand
      });
    });
  });

  // Sort notes chronologically
  parsedNotes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  const duration = parsedNotes.length > 0 
    ? Math.max(...parsedNotes.map(n => n.time + n.duration))
    : midi.duration || 30;

  /* El nombre del archivo manda sobre el del MIDI. Casi todos los .mid traen
     algo genérico adentro ("Piano", "Untitled", el nombre del secuenciador),
     mientras que el archivo suele tener el nombre real de la pieza — que es,
     además, por lo que uno la va a buscar en la biblioteca. */
  const fromFile = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const fromMidi = (midi.name || '').trim();
  const GENERIC = /^(piano|untitled|new song|midi|track \d*|sin t[íi]tulo)$/i;
  const embeddedIsGeneric = !fromMidi || GENERIC.test(fromMidi);
  const trackNames = midi.tracks.map(t => (t.name || '').trim()).filter(Boolean);
  /* Casi ningún .mid trae un campo de autor. Lo más parecido es el nombre
     interno de la secuencia; los nombres de pista casi siempre son el
     instrumento ("Grand Piano", "Bass", "Melody") y como autor no sirven. */
  const INSTRUMENTO = /^(grand |acoustic |electric )?(piano|keyboard|organ|synth|bass|lead|pad|strings?|drums?|percussion|voice|vocals?|melod[íi]a|melody|harmony|acomp|accomp|left|right|izq|der|mano|hand|track|pista|clave|staff)\b/i;
  const embeddedComposer = !embeddedIsGeneric && fromMidi
    ? fromMidi
    : (trackNames.find(n => !GENERIC.test(n) && !INSTRUMENTO.test(n)) ?? '');
  const autoTitle = fromFile && embeddedIsGeneric ? fromFile : (fromMidi || fromFile || 'Pieza importada');
  const title = (naming?.title ?? '').trim() || autoTitle;

  const bpm = midi.header.tempos.length > 0 
    ? Math.round(midi.header.tempos[0].bpm) 
    : 120;

  const autoComposer = embeddedComposer && embeddedComposer !== title ? embeddedComposer : 'MIDI importado';

  const composer = (naming?.composer ?? '').trim() || autoComposer;

  const song: WaterfallSong = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    composer,
    difficulty: parsedNotes.length > 300 ? 'Avanzado' : parsedNotes.length > 100 ? 'Intermedio' : 'Fácil',
    bpm,
    duration,
    notesCount: parsedNotes.length,
    description: `Archivo MIDI importado con ${parsedNotes.length} notas analizadas en clave de sol y fa.`,
    notes: parsedNotes,
    isCustom: true
  };

  const meta: MidiMeta = {
    fileTitle: fromFile,
    embeddedTitle: fromMidi,
    embeddedComposer,
    trackNames,
    bpm,
    notesCount: parsedNotes.length,
    duration,
    embeddedIsGeneric,
  };

  return { song, meta };
}

/**
 * Pre-packaged demo songs with real musical notes
 */
export const PRELOADED_WATERFALL_SONGS: WaterfallSong[] = [
  // 1. BEETHOVEN - PARA ELISA (FÜR ELISE)
  {
    id: 'fur-elise',
    title: 'Para Elisa (Für Elise)',
    composer: 'Ludwig van Beethoven',
    difficulty: 'Intermedio',
    bpm: 130,
    duration: 32,
    notesCount: 78,
    description: 'La célebre melodía en La menor. Mano derecha en cascada cromática con arpegios de bajo en mano izquierda.',
    notes: [
      // Intro motif
      { id: 'fe-1', name: 'E5', midi: 76, time: 0.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'fe-2', name: 'D#5', midi: 75, time: 1.0, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'fe-3', name: 'E5', midi: 76, time: 1.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'fe-4', name: 'D#5', midi: 75, time: 2.0, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'fe-5', name: 'E5', midi: 76, time: 2.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'fe-6', name: 'B4', midi: 71, time: 3.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-7', name: 'D5', midi: 74, time: 3.5, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-8', name: 'C5', midi: 72, time: 4.0, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'fe-9', name: 'A4', midi: 69, time: 4.5, duration: 0.9, velocity: 0.9, hand: 'right' },
      // Bass Am accompaniment
      { id: 'fe-b1', name: 'A2', midi: 45, time: 4.5, duration: 1.2, velocity: 0.8, hand: 'left' },
      { id: 'fe-b2', name: 'E3', midi: 52, time: 5.0, duration: 0.8, velocity: 0.75, hand: 'left' },
      { id: 'fe-b3', name: 'A3', midi: 57, time: 5.5, duration: 0.8, velocity: 0.75, hand: 'left' },
      
      // Right hand continuation
      { id: 'fe-10', name: 'C4', midi: 60, time: 6.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-11', name: 'E4', midi: 64, time: 6.5, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-12', name: 'A4', midi: 69, time: 7.0, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'fe-13', name: 'B4', midi: 71, time: 7.5, duration: 0.9, velocity: 0.9, hand: 'right' },
      // Bass E accompaniment
      { id: 'fe-b4', name: 'E2', midi: 40, time: 7.5, duration: 1.2, velocity: 0.8, hand: 'left' },
      { id: 'fe-b5', name: 'E3', midi: 52, time: 8.0, duration: 0.8, velocity: 0.75, hand: 'left' },
      { id: 'fe-b6', name: 'G#3', midi: 56, time: 8.5, duration: 0.8, velocity: 0.75, hand: 'left' },

      { id: 'fe-14', name: 'E4', midi: 64, time: 9.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-15', name: 'G#4', midi: 68, time: 9.5, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-16', name: 'B4', midi: 71, time: 10.0, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'fe-17', name: 'C5', midi: 72, time: 10.5, duration: 0.9, velocity: 0.9, hand: 'right' },
      // Bass Am accompaniment
      { id: 'fe-b7', name: 'A2', midi: 45, time: 10.5, duration: 1.2, velocity: 0.8, hand: 'left' },
      { id: 'fe-b8', name: 'E3', midi: 52, time: 11.0, duration: 0.8, velocity: 0.75, hand: 'left' },
      { id: 'fe-b9', name: 'A3', midi: 57, time: 11.5, duration: 0.8, velocity: 0.75, hand: 'left' },

      // Second phrase
      { id: 'fe-18', name: 'E5', midi: 76, time: 12.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'fe-19', name: 'D#5', midi: 75, time: 13.0, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'fe-20', name: 'E5', midi: 76, time: 13.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'fe-21', name: 'D#5', midi: 75, time: 14.0, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'fe-22', name: 'E5', midi: 76, time: 14.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'fe-23', name: 'B4', midi: 71, time: 15.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-24', name: 'D5', midi: 74, time: 15.5, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-25', name: 'C5', midi: 72, time: 16.0, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'fe-26', name: 'A4', midi: 69, time: 16.5, duration: 0.9, velocity: 0.9, hand: 'right' },
      { id: 'fe-b10', name: 'A2', midi: 45, time: 16.5, duration: 1.2, velocity: 0.8, hand: 'left' },
      { id: 'fe-b11', name: 'E3', midi: 52, time: 17.0, duration: 0.8, velocity: 0.75, hand: 'left' },

      { id: 'fe-27', name: 'C4', midi: 60, time: 18.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-28', name: 'E4', midi: 64, time: 18.5, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-29', name: 'A4', midi: 69, time: 19.0, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'fe-30', name: 'B4', midi: 71, time: 19.5, duration: 0.9, velocity: 0.9, hand: 'right' },
      { id: 'fe-b12', name: 'E2', midi: 40, time: 19.5, duration: 1.2, velocity: 0.8, hand: 'left' },
      { id: 'fe-31', name: 'C5', midi: 72, time: 20.5, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-32', name: 'B4', midi: 71, time: 21.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'fe-33', name: 'A4', midi: 69, time: 21.5, duration: 1.5, velocity: 0.9, hand: 'right' },
      { id: 'fe-b13', name: 'A2', midi: 45, time: 21.5, duration: 2.0, velocity: 0.85, hand: 'left' },
      { id: 'fe-b14', name: 'E3', midi: 52, time: 21.5, duration: 2.0, velocity: 0.8, hand: 'left' },
      { id: 'fe-b15', name: 'A3', midi: 57, time: 21.5, duration: 2.0, velocity: 0.8, hand: 'left' }
    ]
  },

  // 2. BACH - PRELUDIO EN DO MAYOR (BWV 846)
  {
    id: 'bach-prelude',
    title: 'Preludio en Do Mayor (BWV 846)',
    composer: 'Johann Sebastian Bach',
    difficulty: 'Fácil',
    bpm: 80,
    duration: 30,
    notesCount: 64,
    description: 'La obra perfecta para cascada. Arpegios hipnóticos fluyendo nota por nota a través de las armonías de Bach.',
    notes: [
      // Bar 1: C - E - G - c - e - G - c - e (repeated)
      { id: 'bp-1', name: 'C3', midi: 48, time: 0.5, duration: 1.8, velocity: 0.9, hand: 'left' },
      { id: 'bp-2', name: 'E3', midi: 52, time: 0.75, duration: 1.6, velocity: 0.8, hand: 'left' },
      { id: 'bp-3', name: 'G3', midi: 55, time: 1.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'bp-4', name: 'C4', midi: 60, time: 1.25, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'bp-5', name: 'E4', midi: 64, time: 1.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'bp-6', name: 'G3', midi: 55, time: 1.75, duration: 0.4, velocity: 0.75, hand: 'right' },
      { id: 'bp-7', name: 'C4', midi: 60, time: 2.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'bp-8', name: 'E4', midi: 64, time: 2.25, duration: 0.4, velocity: 0.85, hand: 'right' },

      { id: 'bp-9', name: 'C3', midi: 48, time: 2.5, duration: 1.8, velocity: 0.9, hand: 'left' },
      { id: 'bp-10', name: 'E3', midi: 52, time: 2.75, duration: 1.6, velocity: 0.8, hand: 'left' },
      { id: 'bp-11', name: 'G3', midi: 55, time: 3.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'bp-12', name: 'C4', midi: 60, time: 3.25, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'bp-13', name: 'E4', midi: 64, time: 3.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'bp-14', name: 'G3', midi: 55, time: 3.75, duration: 0.4, velocity: 0.75, hand: 'right' },
      { id: 'bp-15', name: 'C4', midi: 60, time: 4.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'bp-16', name: 'E4', midi: 64, time: 4.25, duration: 0.4, velocity: 0.85, hand: 'right' },

      // Bar 2: D - d - a - d - f - a - d - f (Dm7/C)
      { id: 'bp-17', name: 'C3', midi: 48, time: 5.0, duration: 1.8, velocity: 0.9, hand: 'left' },
      { id: 'bp-18', name: 'D3', midi: 50, time: 5.25, duration: 1.6, velocity: 0.8, hand: 'left' },
      { id: 'bp-19', name: 'A3', midi: 57, time: 5.5, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'bp-20', name: 'D4', midi: 62, time: 5.75, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'bp-21', name: 'F4', midi: 65, time: 6.0, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'bp-22', name: 'A3', midi: 57, time: 6.25, duration: 0.4, velocity: 0.75, hand: 'right' },
      { id: 'bp-23', name: 'D4', midi: 62, time: 6.5, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'bp-24', name: 'F4', midi: 65, time: 6.75, duration: 0.4, velocity: 0.85, hand: 'right' },

      // Bar 3: B - d - g - d - f - g - d - f (G7/B)
      { id: 'bp-25', name: 'B2', midi: 47, time: 7.5, duration: 1.8, velocity: 0.9, hand: 'left' },
      { id: 'bp-26', name: 'D3', midi: 50, time: 7.75, duration: 1.6, velocity: 0.8, hand: 'left' },
      { id: 'bp-27', name: 'G3', midi: 55, time: 8.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'bp-28', name: 'D4', midi: 62, time: 8.25, duration: 0.4, velocity: 0.85, hand: 'right' },
      { id: 'bp-29', name: 'F4', midi: 65, time: 8.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'bp-30', name: 'G3', midi: 55, time: 8.75, duration: 0.4, velocity: 0.75, hand: 'right' },
      { id: 'bp-31', name: 'D4', midi: 62, time: 9.0, duration: 0.4, velocity: 0.8, hand: 'right' },
      { id: 'bp-32', name: 'F4', midi: 65, time: 9.25, duration: 0.4, velocity: 0.85, hand: 'right' },

      // Bar 4: C - e - g - c - e (Resolution)
      { id: 'bp-33', name: 'C3', midi: 48, time: 10.0, duration: 3.0, velocity: 0.9, hand: 'left' },
      { id: 'bp-34', name: 'E3', midi: 52, time: 10.25, duration: 2.8, velocity: 0.8, hand: 'left' },
      { id: 'bp-35', name: 'G3', midi: 55, time: 10.5, duration: 0.6, velocity: 0.85, hand: 'right' },
      { id: 'bp-36', name: 'C4', midi: 60, time: 11.0, duration: 0.6, velocity: 0.9, hand: 'right' },
      { id: 'bp-37', name: 'E4', midi: 64, time: 11.5, duration: 1.8, velocity: 0.95, hand: 'right' }
    ]
  },

  // 3. BEETHOVEN - MOONLIGHT SONATA (CLARO DE LUNA)
  {
    id: 'moonlight-sonata',
    title: 'Claro de Luna (Moonlight Sonata)',
    composer: 'Ludwig van Beethoven',
    difficulty: 'Intermedio',
    bpm: 56,
    duration: 36,
    notesCount: 52,
    description: 'Adagio sostenuto en Do# menor. Tresillos continuos en mano derecha sobre acordes oscuros y solemnes en mano izquierda.',
    notes: [
      // Bass C# octave
      { id: 'ms-b1', name: 'C#2', midi: 37, time: 0.5, duration: 3.5, velocity: 0.85, hand: 'left' },
      { id: 'ms-b2', name: 'C#3', midi: 49, time: 0.5, duration: 3.5, velocity: 0.85, hand: 'left' },
      // Triplet 1
      { id: 'ms-1', name: 'G#3', midi: 56, time: 0.5, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-2', name: 'C#4', midi: 61, time: 0.9, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-3', name: 'E4', midi: 64, time: 1.3, duration: 0.45, velocity: 0.7, hand: 'right' },
      // Triplet 2
      { id: 'ms-4', name: 'G#3', midi: 56, time: 1.7, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-5', name: 'C#4', midi: 61, time: 2.1, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-6', name: 'E4', midi: 64, time: 2.5, duration: 0.45, velocity: 0.7, hand: 'right' },
      // Triplet 3
      { id: 'ms-7', name: 'G#3', midi: 56, time: 2.9, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-8', name: 'C#4', midi: 61, time: 3.3, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-9', name: 'E4', midi: 64, time: 3.7, duration: 0.45, velocity: 0.7, hand: 'right' },

      // Bar 2: Bass B octave
      { id: 'ms-b3', name: 'B1', midi: 35, time: 4.5, duration: 3.5, velocity: 0.85, hand: 'left' },
      { id: 'ms-b4', name: 'B2', midi: 47, time: 4.5, duration: 3.5, velocity: 0.85, hand: 'left' },
      { id: 'ms-10', name: 'G#3', midi: 56, time: 4.5, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-11', name: 'D#4', midi: 63, time: 4.9, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-12', name: 'F#4', midi: 66, time: 5.3, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-13', name: 'G#3', midi: 56, time: 5.7, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-14', name: 'D#4', midi: 63, time: 6.1, duration: 0.45, velocity: 0.7, hand: 'right' },
      { id: 'ms-15', name: 'F#4', midi: 66, time: 6.5, duration: 0.45, velocity: 0.7, hand: 'right' },

      // Bar 3: Melody enters with G#4!
      { id: 'ms-b5', name: 'A1', midi: 33, time: 7.5, duration: 3.5, velocity: 0.85, hand: 'left' },
      { id: 'ms-b6', name: 'A2', midi: 45, time: 7.5, duration: 3.5, velocity: 0.85, hand: 'left' },
      { id: 'ms-m1', name: 'G#4', midi: 68, time: 7.5, duration: 2.5, velocity: 0.95, hand: 'right' },
      { id: 'ms-16', name: 'A3', midi: 57, time: 7.5, duration: 0.45, velocity: 0.65, hand: 'right' },
      { id: 'ms-17', name: 'C#4', midi: 61, time: 7.9, duration: 0.45, velocity: 0.65, hand: 'right' },
      { id: 'ms-18', name: 'E4', midi: 64, time: 8.3, duration: 0.45, velocity: 0.65, hand: 'right' },
      { id: 'ms-19', name: 'A3', midi: 57, time: 8.7, duration: 0.45, velocity: 0.65, hand: 'right' },
      { id: 'ms-20', name: 'C#4', midi: 61, time: 9.1, duration: 0.45, velocity: 0.65, hand: 'right' },
      { id: 'ms-21', name: 'E4', midi: 64, time: 9.5, duration: 0.45, velocity: 0.65, hand: 'right' }
    ]
  },

  // 4. PACHELBEL - CANON EN RE MAYOR
  {
    id: 'pachelbel-canon',
    title: 'Canon en Re Mayor',
    composer: 'Johann Pachelbel',
    difficulty: 'Fácil',
    bpm: 72,
    duration: 28,
    notesCount: 48,
    description: 'La famosa progresión de acordes barroca: D - A - Bm - F#m - G - D - G - A con notas descendentes.',
    notes: [
      // Bassline progression (Left Hand)
      { id: 'pc-b1', name: 'D3', midi: 50, time: 0.5, duration: 1.8, velocity: 0.85, hand: 'left' },
      { id: 'pc-b2', name: 'A2', midi: 45, time: 2.5, duration: 1.8, velocity: 0.85, hand: 'left' },
      { id: 'pc-b3', name: 'B2', midi: 47, time: 4.5, duration: 1.8, velocity: 0.85, hand: 'left' },
      { id: 'pc-b4', name: 'F#2', midi: 42, time: 6.5, duration: 1.8, velocity: 0.85, hand: 'left' },
      { id: 'pc-b5', name: 'G2', midi: 43, time: 8.5, duration: 1.8, velocity: 0.85, hand: 'left' },
      { id: 'pc-b6', name: 'D2', midi: 38, time: 10.5, duration: 1.8, velocity: 0.85, hand: 'left' },
      { id: 'pc-b7', name: 'G2', midi: 43, time: 12.5, duration: 1.8, velocity: 0.85, hand: 'left' },
      { id: 'pc-b8', name: 'A2', midi: 45, time: 14.5, duration: 1.8, velocity: 0.85, hand: 'left' },

      // Melody descending (Right Hand)
      { id: 'pc-m1', name: 'F#4', midi: 66, time: 0.5, duration: 1.8, velocity: 0.9, hand: 'right' },
      { id: 'pc-m2', name: 'E4', midi: 64, time: 2.5, duration: 1.8, velocity: 0.9, hand: 'right' },
      { id: 'pc-m3', name: 'D4', midi: 62, time: 4.5, duration: 1.8, velocity: 0.9, hand: 'right' },
      { id: 'pc-m4', name: 'C#4', midi: 61, time: 6.5, duration: 1.8, velocity: 0.9, hand: 'right' },
      { id: 'pc-m5', name: 'B3', midi: 59, time: 8.5, duration: 1.8, velocity: 0.9, hand: 'right' },
      { id: 'pc-m6', name: 'A3', midi: 57, time: 10.5, duration: 1.8, velocity: 0.9, hand: 'right' },
      { id: 'pc-m7', name: 'B3', midi: 59, time: 12.5, duration: 1.8, velocity: 0.9, hand: 'right' },
      { id: 'pc-m8', name: 'C#4', midi: 61, time: 14.5, duration: 1.8, velocity: 0.9, hand: 'right' },

      // Polyphony layer
      { id: 'pc-p1', name: 'D5', midi: 74, time: 16.5, duration: 0.9, velocity: 0.95, hand: 'right' },
      { id: 'pc-p2', name: 'C#5', midi: 73, time: 17.5, duration: 0.9, velocity: 0.95, hand: 'right' },
      { id: 'pc-p3', name: 'B4', midi: 71, time: 18.5, duration: 0.9, velocity: 0.95, hand: 'right' },
      { id: 'pc-p4', name: 'A4', midi: 69, time: 19.5, duration: 0.9, velocity: 0.95, hand: 'right' },
      { id: 'pc-p5', name: 'G4', midi: 67, time: 20.5, duration: 0.9, velocity: 0.95, hand: 'right' },
      { id: 'pc-p6', name: 'F#4', midi: 66, time: 21.5, duration: 0.9, velocity: 0.95, hand: 'right' },
      { id: 'pc-p7', name: 'G4', midi: 67, time: 22.5, duration: 0.9, velocity: 0.95, hand: 'right' },
      { id: 'pc-p8', name: 'E4', midi: 64, time: 23.5, duration: 0.9, velocity: 0.95, hand: 'right' }
    ]
  },

  // 5. LA CUMPARSITA - TANGO
  {
    id: 'la-cumparsita',
    title: 'La Cumparsita (Tango)',
    composer: 'Gerardo Matos Rodríguez',
    difficulty: 'Intermedio',
    bpm: 110,
    duration: 25,
    notesCount: 50,
    description: 'El himno universal de los tangos rioplatenses. Marcato enérgico en mano izquierda y melodía apasionada en mano derecha.',
    notes: [
      // Bass Marcato Tango (Left Hand)
      { id: 'lc-b1', name: 'G2', midi: 43, time: 0.5, duration: 0.35, velocity: 0.9, hand: 'left' },
      { id: 'lc-b2', name: 'G3', midi: 55, time: 1.0, duration: 0.35, velocity: 0.8, hand: 'left' },
      { id: 'lc-b3', name: 'D3', midi: 50, time: 1.5, duration: 0.35, velocity: 0.85, hand: 'left' },
      { id: 'lc-b4', name: 'G3', midi: 55, time: 2.0, duration: 0.35, velocity: 0.8, hand: 'left' },

      // Melody opening motif
      { id: 'lc-m1', name: 'G4', midi: 67, time: 0.5, duration: 0.35, velocity: 0.95, hand: 'right' },
      { id: 'lc-m2', name: 'Bb4', midi: 70, time: 1.0, duration: 0.35, velocity: 0.9, hand: 'right' },
      { id: 'lc-m3', name: 'D5', midi: 74, time: 1.5, duration: 0.6, velocity: 0.95, hand: 'right' },
      { id: 'lc-m4', name: 'C5', midi: 72, time: 2.3, duration: 0.35, velocity: 0.9, hand: 'right' },
      { id: 'lc-m5', name: 'Bb4', midi: 70, time: 2.8, duration: 0.35, velocity: 0.9, hand: 'right' },
      { id: 'lc-m6', name: 'A4', midi: 69, time: 3.3, duration: 0.7, velocity: 0.95, hand: 'right' },

      // Second bar
      { id: 'lc-b5', name: 'D2', midi: 38, time: 2.5, duration: 0.35, velocity: 0.9, hand: 'left' },
      { id: 'lc-b6', name: 'F#3', midi: 54, time: 3.0, duration: 0.35, velocity: 0.8, hand: 'left' },
      { id: 'lc-b7', name: 'A3', midi: 57, time: 3.5, duration: 0.35, velocity: 0.85, hand: 'left' },

      { id: 'lc-m7', name: 'F#4', midi: 66, time: 4.2, duration: 0.35, velocity: 0.9, hand: 'right' },
      { id: 'lc-m8', name: 'A4', midi: 69, time: 4.7, duration: 0.35, velocity: 0.9, hand: 'right' },
      { id: 'lc-m9', name: 'C5', midi: 72, time: 5.2, duration: 0.6, velocity: 0.95, hand: 'right' },
      { id: 'lc-m10', name: 'Bb4', midi: 70, time: 6.0, duration: 0.35, velocity: 0.9, hand: 'right' },
      { id: 'lc-m11', name: 'A4', midi: 69, time: 6.5, duration: 0.35, velocity: 0.9, hand: 'right' },
      { id: 'lc-m12', name: 'G4', midi: 67, time: 7.0, duration: 1.2, velocity: 1.0, hand: 'right' }
    ]
  },

  // 6. EJERCICIO TÉCNICO: CASCADA DE ESCALAS Y ARPEGIOS
  {
    id: 'technical-cascade',
    title: 'Cascada de Escalas & Arpegios',
    composer: 'Gimnasio Técnico Maestro Aurelio',
    difficulty: 'Fácil',
    bpm: 100,
    duration: 20,
    notesCount: 38,
    description: 'Ejercicio de sincronización y digitación. Escala de Do Mayor ascendente y descendente en ambas manos.',
    notes: [
      { id: 'tc-b1', name: 'C3', midi: 48, time: 0.5, duration: 0.4, velocity: 0.8, hand: 'left' },
      { id: 'tc-1', name: 'C4', midi: 60, time: 0.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'tc-b2', name: 'D3', midi: 50, time: 1.0, duration: 0.4, velocity: 0.8, hand: 'left' },
      { id: 'tc-2', name: 'D4', midi: 62, time: 1.0, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'tc-b3', name: 'E3', midi: 52, time: 1.5, duration: 0.4, velocity: 0.8, hand: 'left' },
      { id: 'tc-3', name: 'E4', midi: 64, time: 1.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'tc-b4', name: 'F3', midi: 53, time: 2.0, duration: 0.4, velocity: 0.8, hand: 'left' },
      { id: 'tc-4', name: 'F4', midi: 65, time: 2.0, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'tc-b5', name: 'G3', midi: 55, time: 2.5, duration: 0.4, velocity: 0.8, hand: 'left' },
      { id: 'tc-5', name: 'G4', midi: 67, time: 2.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'tc-b6', name: 'A3', midi: 57, time: 3.0, duration: 0.4, velocity: 0.8, hand: 'left' },
      { id: 'tc-6', name: 'A4', midi: 69, time: 3.0, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'tc-b7', name: 'B3', midi: 59, time: 3.5, duration: 0.4, velocity: 0.8, hand: 'left' },
      { id: 'tc-7', name: 'B4', midi: 71, time: 3.5, duration: 0.4, velocity: 0.9, hand: 'right' },
      { id: 'tc-b8', name: 'C4', midi: 60, time: 4.0, duration: 0.8, velocity: 0.85, hand: 'left' },
      { id: 'tc-8', name: 'C5', midi: 72, time: 4.0, duration: 0.8, velocity: 0.95, hand: 'right' }
    ]
  }
];

/**
 * Builds WaterfallNote[] from classical method notes (e.g. Hanon, Czerny, Suzuki)
 */
export function buildWaterfallFromMethodNotes(
  rightNotes: Array<{ note: string; finger?: number; fingering?: number; duration?: string }>,
  leftNotes: Array<{ note: string; finger?: number; fingering?: number; duration?: string }> = [],
  bpm: number = 80
): WaterfallNote[] {
  const result: WaterfallNote[] = [];
  const beatSec = 60 / bpm;
  // Default eighth notes: 0.5 beat
  const stepSec = beatSec * 0.5;

  const maxLen = Math.max(rightNotes.length, leftNotes.length);

  for (let i = 0; i < maxLen; i++) {
    const time = 0.8 + i * stepSec; // Initial padding of 0.8s so notes cascade down gracefully
    const duration = stepSec * 0.85;

    if (rightNotes[i]) {
      const rn = rightNotes[i];
      result.push({
        id: `rh-${i}-${rn.note}`,
        name: rn.note,
        midi: noteNameToMidi(rn.note),
        time,
        duration,
        velocity: 0.9,
        hand: 'right',
        finger: rn.finger ?? rn.fingering ?? 1
      });
    }

    if (leftNotes[i]) {
      const ln = leftNotes[i];
      result.push({
        id: `lh-${i}-${ln.note}`,
        name: ln.note,
        midi: noteNameToMidi(ln.note),
        time,
        duration,
        velocity: 0.85,
        hand: 'left',
        finger: ln.finger ?? ln.fingering ?? 1
      });
    }
  }

  return result.sort((a, b) => a.time - b.time || a.midi - b.midi);
}

/**
 * Builds WaterfallNote[] from a simple list of notes and optional fingering guide
 */
export function buildWaterfallFromNotesList(
  notes: string[],
  fingerGuide?: Record<string, number>,
  bpm: number = 75
): WaterfallNote[] {
  const result: WaterfallNote[] = [];
  const beatSec = 60 / bpm;
  const stepSec = beatSec * 0.75;

  notes.forEach((note, idx) => {
    const time = 0.8 + idx * stepSec;
    const midi = noteNameToMidi(note);
    const hand: 'right' | 'left' = midi < 60 ? 'left' : 'right';
    const finger = fingerGuide ? fingerGuide[note] : undefined;

    result.push({
      id: `list-${idx}-${note}`,
      name: note,
      midi,
      time,
      duration: stepSec * 0.8,
      velocity: 0.9,
      hand,
      finger
    });
  });

  return result;
}

/**
 * Builds WaterfallNote[] for an entire scale (ascending and descending).
 * Accepts either:
 *  - (scaleNotes, rightFingerings?, leftFingerings?, bpm?)
 *  - (root, scaleName, scaleNotes, fingerings?, bpm?)
 */
export function buildWaterfallFromScale(
  arg1: string | string[],
  arg2?: string | number[],
  arg3?: string[] | number[],
  arg4?: number[] | number,
  arg5?: number
): WaterfallNote[] {
  let scaleNotes: string[] = [];
  let rightFingerings: number[] = [1, 2, 3, 1, 2, 3, 4, 5];
  let leftFingerings: number[] = [5, 4, 3, 2, 1, 3, 2, 1];
  let bpm: number = 90;

  if (Array.isArray(arg1)) {
    // Call style 1: (scaleNotes, rightFingerings, leftFingerings, bpm)
    scaleNotes = arg1;
    if (Array.isArray(arg2)) rightFingerings = arg2;
    if (Array.isArray(arg3)) leftFingerings = arg3 as number[];
    if (typeof arg4 === 'number') bpm = arg4;
  } else {
    // Call style 2: (root, scaleName, scaleNotes, fingerings, bpm)
    if (Array.isArray(arg3)) {
      scaleNotes = arg3 as string[];
    }
    if (Array.isArray(arg4)) {
      rightFingerings = arg4;
      leftFingerings = [...arg4].reverse();
    }
    if (typeof arg5 === 'number') {
      bpm = arg5;
    }
  }

  const result: WaterfallNote[] = [];
  const beatSec = 60 / (bpm || 80);
  const stepSec = beatSec * 0.5;

  // Build ascending then descending
  const ascending = [...scaleNotes];
  const descending = [...scaleNotes].reverse().slice(1);
  const fullSeq = [...ascending, ...descending];

  fullSeq.forEach((note, idx) => {
    const time = 0.8 + idx * stepSec;
    const midi = noteNameToMidi(note);
    const rhFinger = rightFingerings[idx % rightFingerings.length] || 1;
    const lhFinger = leftFingerings[idx % leftFingerings.length] || 1;

    // Right hand
    result.push({
      id: `scale-rh-${idx}-${note}`,
      name: note,
      midi,
      time,
      duration: stepSec * 0.85,
      velocity: 0.9,
      hand: 'right',
      finger: rhFinger
    });

    // Left hand in lower octave (12 semitones lower)
    const lhMidi = Math.max(24, midi - 12);
    const lhName = midiToNoteName(lhMidi);
    result.push({
      id: `scale-lh-${idx}-${lhName}`,
      name: lhName,
      midi: lhMidi,
      time,
      duration: stepSec * 0.85,
      velocity: 0.85,
      hand: 'left',
      finger: lhFinger
    });
  });

  return result.sort((a, b) => a.time - b.time || a.midi - b.midi);
}

/**
 * Builds WaterfallNote[] for a chord demonstration (both arpeggio cascade and simultaneous strike).
 * Accepts either (chordKeys, bpm) or (chordName, chordKeys, bpm).
 */
export function buildWaterfallFromChord(
  arg1: string | string[],
  arg2?: string[] | number,
  arg3?: number
): WaterfallNote[] {
  let chordKeys: string[] = [];
  let bpm: number = 70;

  if (Array.isArray(arg1)) {
    chordKeys = arg1;
    if (typeof arg2 === 'number') bpm = arg2;
  } else if (Array.isArray(arg2)) {
    chordKeys = arg2;
    if (typeof arg3 === 'number') bpm = arg3;
  }

  const result: WaterfallNote[] = [];
  const beatSec = 60 / bpm;

  // 1. Arpeggiated cascade
  chordKeys.forEach((key, idx) => {
    const time = 0.8 + idx * (beatSec * 0.4);
    const midi = noteNameToMidi(key);
    result.push({
      id: `chord-arp-${idx}-${key}`,
      name: key,
      midi,
      time,
      duration: beatSec * 0.6,
      velocity: 0.85,
      hand: midi < 60 ? 'left' : 'right',
      finger: idx + 1
    });
  });

  // 2. Full chord strike together
  const chordStrikeTime = 0.8 + chordKeys.length * (beatSec * 0.4) + 0.6;
  chordKeys.forEach((key, idx) => {
    const midi = noteNameToMidi(key);
    result.push({
      id: `chord-full-${idx}-${key}`,
      name: key,
      midi,
      time: chordStrikeTime,
      duration: beatSec * 1.5,
      velocity: 0.95,
      hand: midi < 60 ? 'left' : 'right',
      finger: idx + 1
    });
  });

  return result.sort((a, b) => a.time - b.time || a.midi - b.midi);
}

