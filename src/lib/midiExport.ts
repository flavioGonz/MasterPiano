import { Midi } from '@tonejs/midi';
import { WaterfallSong, songTracks, noteTrackId } from './midiWaterfall';

/**
 * La pieza de la catarata de vuelta a un archivo .mid.
 *
 * Sale una pista por cada pista de la pieza (las dos manos, o un instrumento
 * por stem), así lo que se editó acá se puede abrir en cualquier secuenciador
 * o cargar en el Kross 2 sin perder la separación.
 *
 * Se usa `@tonejs/midi`, que ya está en el proyecto para leer los MIDI que se
 * importan: escribir con la misma librería evita que ida y vuelta no coincidan.
 */
export function songToMidi(song: WaterfallSong): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(song.bpm || 100);
  midi.header.name = song.title;

  for (const t of songTracks(song)) {
    const notes = song.notes.filter(n => noteTrackId(n) === t.id);
    if (!notes.length) continue;
    const track = midi.addTrack();
    track.name = t.name;
    for (const n of [...notes].sort((a, b) => a.time - b.time)) {
      track.addNote({
        midi: n.midi,
        time: Math.max(0, n.time),
        duration: Math.max(0.02, n.duration),
        velocity: Math.min(1, Math.max(0.05, n.velocity || 0.8)),
      });
    }
  }
  // Una pieza sin pistas con notas igual tiene que dar un archivo válido
  if (!midi.tracks.length) midi.addTrack().name = song.title;
  return new Uint8Array(midi.toArray());
}

/** Nombre de archivo sin sorpresas para Windows ni para el navegador. */
export function midiFileName(song: WaterfallSong): string {
  const base = (song.title || 'pieza')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'pieza';
  return `${base}.mid`;
}

/** Dispara la descarga en el navegador. */
export function downloadSongAsMidi(song: WaterfallSong): void {
  const blob = new Blob([songToMidi(song)], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = midiFileName(song);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
