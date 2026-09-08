import { Midi } from '@tonejs/midi';
import { ClassicalExercise, ClassicalBookId, MethodNote, CLASSICAL_BOOKS } from '../data/classicalMethodsData';

export interface ScoreMetadata {
  id: string;
  bookId: ClassicalBookId;
  exerciseNumber: string | number;
  title: string;
  subtitle: string;
  composer: string;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzado';
  recommendedBpm: number;
  timeSignature: string;
  keySignature: string;
  focusTechnique: string;
  maestroAdvice: string;
  historicalNote: string;
}

export interface ScoreJSONFile {
  format: 'ConservatoryClassicalScore';
  version: '1.0';
  metadata: ScoreMetadata;
  tempo: {
    recommendedBpm: number;
    timeSignature: string;
  };
  tracks: {
    rightHand: MethodNote[];
    leftHand: MethodNote[];
  };
}

// Convert note duration string to seconds given a BPM
export function durationStringToSeconds(duration: string, bpm: number): number {
  const beatSec = 60 / bpm; // quarter note (4n) duration in seconds
  switch (duration) {
    case '1n':
    case '1':
      return beatSec * 4; // Whole note: 4 beats
    case '2n':
    case '2':
      return beatSec * 2; // Half note: 2 beats
    case '4n':
    case '4':
      return beatSec; // Quarter note: 1 beat
    case '8n':
    case '8':
      return beatSec / 2; // 8th note: 0.5 beat
    case '16n':
    case '16':
      return beatSec / 4; // 16th note: 0.25 beat
    case '32n':
    case '32':
      return beatSec / 8;
    default:
      return beatSec / 2;
  }
}

// Convert note name (e.g. C4, F#3, Bb4) to MIDI number (60 = C4)
export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) return 60;
  
  const letter = match[1].toUpperCase();
  const accidental = match[2];
  const octave = parseInt(match[3], 10);
  
  const baseMap: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11
  };
  
  let semitone = baseMap[letter] || 0;
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;
  
  return (octave + 1) * 12 + semitone;
}

// Convert MIDI number to note name
export function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

// Export a ClassicalExercise to standard Score JSON
export function exportExerciseToScoreJSON(exercise: ClassicalExercise): string {
  const book = CLASSICAL_BOOKS.find(b => b.id === exercise.bookId);
  const scoreObj: ScoreJSONFile = {
    format: 'ConservatoryClassicalScore',
    version: '1.0',
    metadata: {
      id: exercise.id,
      bookId: exercise.bookId,
      exerciseNumber: exercise.exerciseNumber,
      title: exercise.title,
      subtitle: exercise.subtitle,
      composer: book?.author || 'Método Clásico',
      difficulty: exercise.difficulty,
      recommendedBpm: exercise.recommendedBpm,
      timeSignature: exercise.timeSignature,
      keySignature: exercise.keySignature,
      focusTechnique: exercise.focusTechnique,
      maestroAdvice: exercise.maestroAdvice,
      historicalNote: exercise.historicalNote,
    },
    tempo: {
      recommendedBpm: exercise.recommendedBpm,
      timeSignature: exercise.timeSignature,
    },
    tracks: {
      rightHand: exercise.rightHandNotes,
      leftHand: exercise.leftHandNotes,
    },
  };
  
  return JSON.stringify(scoreObj, null, 2);
}

// Export a ClassicalExercise to a binary standard MIDI file (.mid) using @tonejs/midi
export function exportExerciseToMIDI(exercise: ClassicalExercise, bpmOverride?: number): Uint8Array {
  const midi = new Midi();
  const bpm = bpmOverride || exercise.recommendedBpm || 80;
  
  midi.header.setTempo(bpm);
  midi.header.name = `${exercise.title} - ${exercise.bookId.toUpperCase()}`;

  // Time signature
  const timeSigParts = (exercise.timeSignature || '4/4').split('/').map(Number);
  if (timeSigParts.length === 2 && !isNaN(timeSigParts[0]) && !isNaN(timeSigParts[1])) {
    midi.header.timeSignatures.push({
      ticks: 0,
      timeSignature: [timeSigParts[0], timeSigParts[1]],
      measures: 0
    });
  }

  // Right Hand Track
  if (exercise.rightHandNotes && exercise.rightHandNotes.length > 0) {
    const rhTrack = midi.addTrack();
    rhTrack.name = 'Mano Derecha (MD) - Clave de Sol';
    rhTrack.channel = 0;
    
    let currentTime = 0;
    exercise.rightHandNotes.forEach((noteItem) => {
      const midiPitch = noteNameToMidi(noteItem.note);
      const durationSec = durationStringToSeconds(noteItem.duration || '8n', bpm);
      
      rhTrack.addNote({
        midi: midiPitch,
        time: currentTime,
        duration: durationSec * 0.95, // slight separation for crisp articulation
        velocity: 0.85,
      });
      
      currentTime += durationSec;
    });
  }

  // Left Hand Track
  if (exercise.leftHandNotes && exercise.leftHandNotes.length > 0) {
    const lhTrack = midi.addTrack();
    lhTrack.name = 'Mano Izquierda (MI) - Clave de Fa';
    lhTrack.channel = 1;
    
    let currentTime = 0;
    exercise.leftHandNotes.forEach((noteItem) => {
      const midiPitch = noteNameToMidi(noteItem.note);
      const durationSec = durationStringToSeconds(noteItem.duration || '8n', bpm);
      
      lhTrack.addNote({
        midi: midiPitch,
        time: currentTime,
        duration: durationSec * 0.95,
        velocity: 0.72,
      });
      
      currentTime += durationSec;
    });
  }

  return midi.toArray();
}

// Download blob helper
export function triggerFileDownload(filename: string, content: string | Uint8Array, mimeType: string) {
  const blob = typeof content === 'string' 
    ? new Blob([content], { type: mimeType })
    : new Blob([content.buffer as ArrayBuffer], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parse imported JSON score
export function parseScoreJSON(jsonStr: string): ClassicalExercise {
  const parsed = JSON.parse(jsonStr);
  
  if (parsed.format === 'ConservatoryClassicalScore' && parsed.tracks) {
    return {
      id: parsed.metadata?.id || `imported-${Date.now()}`,
      bookId: (parsed.metadata?.bookId as ClassicalBookId) || 'hanon',
      exerciseNumber: parsed.metadata?.exerciseNumber || 'Importado',
      title: parsed.metadata?.title || 'Partitura Personalizada',
      subtitle: parsed.metadata?.subtitle || 'Cargada desde archivo JSON',
      difficulty: parsed.metadata?.difficulty || 'Intermedio',
      recommendedBpm: parsed.tempo?.recommendedBpm || parsed.metadata?.recommendedBpm || 80,
      timeSignature: parsed.tempo?.timeSignature || parsed.metadata?.timeSignature || '4/4',
      keySignature: parsed.metadata?.keySignature || 'Do Mayor (C)',
      focusTechnique: parsed.metadata?.focusTechnique || 'Digitación y lectura de partitura personalizada',
      maestroAdvice: parsed.metadata?.maestroAdvice || 'Practica cada compás con regularidad y escucha atenta.',
      historicalNote: parsed.metadata?.historicalNote || 'Archivo de partitura integrado por el estudiante.',
      rightHandNotes: Array.isArray(parsed.tracks.rightHand) ? parsed.tracks.rightHand : [],
      leftHandNotes: Array.isArray(parsed.tracks.leftHand) ? parsed.tracks.leftHand : [],
    };
  }

  // Fallback if raw ClassicalExercise format
  if (parsed.rightHandNotes && Array.isArray(parsed.rightHandNotes)) {
    return {
      id: parsed.id || `imported-${Date.now()}`,
      bookId: parsed.bookId || 'hanon',
      exerciseNumber: parsed.exerciseNumber || 'Ext',
      title: parsed.title || 'Ejercicio Importado',
      subtitle: parsed.subtitle || 'Formato de ejercicio clásico',
      difficulty: parsed.difficulty || 'Intermedio',
      recommendedBpm: parsed.recommendedBpm || 80,
      timeSignature: parsed.timeSignature || '4/4',
      keySignature: parsed.keySignature || 'Do Mayor (C)',
      focusTechnique: parsed.focusTechnique || 'Técnica de partitura',
      maestroAdvice: parsed.maestroAdvice || 'Mantén las muñecas relajadas.',
      historicalNote: parsed.historicalNote || 'Partitura cargada.',
      rightHandNotes: parsed.rightHandNotes,
      leftHandNotes: parsed.leftHandNotes || [],
    };
  }

  throw new Error('El archivo no cumple con el esquema estándar de partituras (ConservatoryClassicalScore).');
}

// Parse imported MIDI file
export async function parseMIDIFile(arrayBuffer: ArrayBuffer): Promise<ClassicalExercise> {
  const midi = new Midi(arrayBuffer);
  
  const recommendedBpm = midi.header.tempos.length > 0 
    ? Math.round(midi.header.tempos[0].bpm) 
    : 80;

  const timeSig = midi.header.timeSignatures.length > 0 
    ? `${midi.header.timeSignatures[0].timeSignature[0]}/${midi.header.timeSignatures[0].timeSignature[1]}` 
    : '4/4';

  const rhNotes: MethodNote[] = [];
  const lhNotes: MethodNote[] = [];

  // Track 0 / Track 1 extraction
  const tracks = midi.tracks.filter(t => t.notes.length > 0);
  
  if (tracks.length > 0) {
    // Determine which track is treble / right hand and which is bass / left hand
    const track1Notes = tracks[0].notes;
    const avgPitch1 = track1Notes.reduce((acc, n) => acc + n.midi, 0) / (track1Notes.length || 1);
    
    let isTrack1Treble = true;
    if (tracks.length > 1) {
      const track2Notes = tracks[1].notes;
      const avgPitch2 = track2Notes.reduce((acc, n) => acc + n.midi, 0) / (track2Notes.length || 1);
      isTrack1Treble = avgPitch1 >= avgPitch2;
    } else {
      isTrack1Treble = avgPitch1 >= 55;
    }

    // Convert notes of primary track
    track1Notes.forEach((n, idx) => {
      const noteName = midiToNoteName(n.midi);
      // Determine approximate fingering 1-5 based on scalar progression
      const prevMidi = idx > 0 ? track1Notes[idx - 1].midi : n.midi;
      const stepDiff = n.midi - prevMidi;
      let fingering = ((idx % 5) + 1);
      if (stepDiff > 0) fingering = Math.min(5, (idx % 5) + 1);
      else if (stepDiff < 0) fingering = Math.max(1, 5 - (idx % 5));

      const durationStr = n.duration >= 1.5 ? '1n' : n.duration >= 0.8 ? '2n' : n.duration >= 0.4 ? '4n' : '8n';

      const methodNote: MethodNote = {
        note: noteName,
        duration: durationStr,
        fingering: isTrack1Treble ? Math.max(1, Math.min(5, fingering)) : Math.max(1, Math.min(5, 6 - fingering)),
        hand: isTrack1Treble ? 'right' : 'left',
        measure: Math.floor(n.time / (240 / recommendedBpm)) + 1,
      };

      if (isTrack1Treble) {
        rhNotes.push(methodNote);
      } else {
        lhNotes.push(methodNote);
      }
    });

    // If second track exists
    if (tracks.length > 1) {
      const track2Notes = tracks[1].notes;
      track2Notes.forEach((n, idx) => {
        const noteName = midiToNoteName(n.midi);
        const durationStr = n.duration >= 1.5 ? '1n' : n.duration >= 0.8 ? '2n' : n.duration >= 0.4 ? '4n' : '8n';
        const fingering = ((idx % 5) + 1);

        const methodNote: MethodNote = {
          note: noteName,
          duration: durationStr,
          fingering: !isTrack1Treble ? Math.max(1, Math.min(5, fingering)) : Math.max(1, Math.min(5, 6 - fingering)),
          hand: !isTrack1Treble ? 'right' : 'left',
          measure: Math.floor(n.time / (240 / recommendedBpm)) + 1,
        };

        if (!isTrack1Treble) {
          rhNotes.push(methodNote);
        } else {
          lhNotes.push(methodNote);
        }
      });
    }
  }

  const title = midi.header.name || 'Partitura MIDI Importada';

  return {
    id: `midi-${Date.now()}`,
    bookId: 'czerny',
    exerciseNumber: 'MIDI',
    title: title,
    subtitle: `${rhNotes.length} notas en MD, ${lhNotes.length} notas en MI`,
    difficulty: rhNotes.length > 20 ? 'Avanzado' : 'Intermedio',
    recommendedBpm: recommendedBpm,
    timeSignature: timeSig,
    keySignature: 'Do Mayor (C)',
    focusTechnique: 'Digitación adaptativa extraída del archivo MIDI polifónico',
    maestroAdvice: 'Ejecuta a tempo lento para memorizar la postura de los dedos en cada pasaje.',
    historicalNote: 'Archivo MIDI cargado desde el almacenamiento del usuario.',
    rightHandNotes: rhNotes.length > 0 ? rhNotes : [{ note: 'C4', duration: '4n', fingering: 1, hand: 'right', measure: 1 }],
    leftHandNotes: lhNotes,
  };
}
