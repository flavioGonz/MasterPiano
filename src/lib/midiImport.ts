/**
 * Importación de archivos MIDI, compartida por el input de siempre y por el
 * arrastrar-y-soltar.
 *
 * Se aceptan varios archivos de una: soltar una carpeta entera de MIDI es el
 * caso normal cuando alguien arma su repertorio, y hacerlo de a uno sería
 * absurdo. Cada archivo se procesa por separado para que uno roto no tire
 * abajo la tanda.
 */
import { parseMidiFileDetailed, type MidiMeta, type WaterfallSong } from './midiWaterfall';
import { saveSong } from './songStore';

const MAX_BYTES = 4 * 1024 * 1024;   // un .mid enorme son ~1 MB; 4 es techo de sobra

export interface ImportResult {
  saved: WaterfallSong[];
  /** Archivos que no se pudieron leer, con el motivo, para poder decirlo. */
  failed: { name: string; reason: string }[];
  /** Alguno quedó solo en este dispositivo porque no había servidor. */
  offline: boolean;
}

export function isMidiFile(file: { name: string; type?: string }): boolean {
  return /\.midi?$/i.test(file.name)
    || file.type === 'audio/midi'
    || file.type === 'audio/x-midi';
}

/** Un archivo ya leído, todavía sin guardar: falta decidir con qué nombre. */
export interface PendingImport {
  fileName: string;
  song: WaterfallSong;
  meta: MidiMeta;
  /** Nombre propuesto según de dónde se saque: del archivo o del propio MIDI. */
  titleFromFile: string;
  titleFromMidi: string;
  composerFromMidi: string;
}

export interface ReadResult {
  pending: PendingImport[];
  failed: { name: string; reason: string }[];
}

/**
 * Lee los archivos SIN guardarlos. Se separó de la escritura para poder
 * preguntar antes con qué datos se guarda cada pieza: muchos .mid traen
 * adentro el nombre del secuenciador o de quien hizo el arreglo, y eso no
 * siempre es lo que uno quiere ver después en la biblioteca.
 */
export async function readMidiFiles(files: File[]): Promise<ReadResult> {
  const out: ReadResult = { pending: [], failed: [] };

  for (const file of files) {
    if (!isMidiFile(file)) {
      out.failed.push({ name: file.name, reason: 'no es un archivo .mid' });
      continue;
    }
    if (file.size > MAX_BYTES) {
      out.failed.push({ name: file.name, reason: 'pesa más de 4 MB' });
      continue;
    }
    try {
      const { song, meta } = parseMidiFileDetailed(await file.arrayBuffer(), file.name);
      if (!song.notes.length) {
        out.failed.push({ name: file.name, reason: 'no tiene notas' });
        continue;
      }
      out.pending.push({
        fileName: file.name,
        song,
        meta,
        titleFromFile: meta.fileTitle || song.title,
        titleFromMidi: meta.embeddedTitle || meta.fileTitle || song.title,
        /* Si el "autor" que trae el archivo es el mismo texto que el título,
           no es un autor: es el título repetido. */
        composerFromMidi: meta.embeddedComposer && meta.embeddedComposer !== (meta.embeddedTitle || meta.fileTitle)
          ? meta.embeddedComposer
          : '',
      });
    } catch {
      out.failed.push({ name: file.name, reason: 'no se pudo leer' });
    }
  }
  return out;
}

/** Guarda las piezas ya confirmadas (con el título y el autor definitivos). */
export async function saveImports(songs: WaterfallSong[]): Promise<ImportResult> {
  const out: ImportResult = { saved: [], failed: [], offline: false };
  for (const song of songs) {
    try {
      const r = await saveSong(song);
      if (r.offline) out.offline = true;
      out.saved.push(song);
    } catch {
      out.failed.push({ name: song.title, reason: 'no se pudo guardar' });
    }
  }
  return out;
}

/** Atajo de siempre: leer y guardar sin preguntar nada. */
export async function importMidiFiles(files: File[]): Promise<ImportResult> {
  const read = await readMidiFiles(files);
  const saved = await saveImports(read.pending.map(p => p.song));
  return { ...saved, failed: [...read.failed, ...saved.failed] };
}

/**
 * Saca los archivos de un evento de soltar, incluidas las carpetas.
 * `webkitGetAsEntry` es lo único que permite recorrer un directorio soltado;
 * donde no exista, se cae a la lista plana de archivos.
 */
export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const items = Array.from(dt.items || []);
  const canWalk = items.length > 0 && typeof (items[0] as any).webkitGetAsEntry === 'function';
  if (!canWalk) return Array.from(dt.files || []);

  const files: File[] = [];
  const walk = async (entry: any, depth = 0): Promise<void> => {
    if (!entry || depth > 4) return;             // carpetas muy anidadas: no
    if (entry.isFile) {
      const f: File = await new Promise((res, rej) => entry.file(res, rej));
      files.push(f);
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      // readEntries devuelve de a tandas: hay que insistir hasta que venga vacío
      for (;;) {
        const batch: any[] = await new Promise((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const e of batch) await walk(e, depth + 1);
      }
    }
  };

  const entries = items.map(i => (i as any).webkitGetAsEntry?.()).filter(Boolean);
  for (const e of entries) { try { await walk(e); } catch { /* se saltea */ } }
  return files.length ? files : Array.from(dt.files || []);
}

/** ¿El arrastre trae archivos? (y no texto de la propia página) */
export function dragHasFiles(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  return Array.from(dt.types || []).includes('Files');
}
