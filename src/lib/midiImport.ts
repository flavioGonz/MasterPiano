/**
 * Importación de archivos MIDI, compartida por el input de siempre y por el
 * arrastrar-y-soltar.
 *
 * Se aceptan varios archivos de una: soltar una carpeta entera de MIDI es el
 * caso normal cuando alguien arma su repertorio, y hacerlo de a uno sería
 * absurdo. Cada archivo se procesa por separado para que uno roto no tire
 * abajo la tanda.
 */
import { parseMidiFile, type WaterfallSong } from './midiWaterfall';
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

export async function importMidiFiles(files: File[]): Promise<ImportResult> {
  const out: ImportResult = { saved: [], failed: [], offline: false };

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
      const song = parseMidiFile(await file.arrayBuffer(), file.name);
      if (!song.notes.length) {
        out.failed.push({ name: file.name, reason: 'no tiene notas' });
        continue;
      }
      const r = await saveSong(song);
      if (r.offline) out.offline = true;
      out.saved.push(song);
    } catch {
      out.failed.push({ name: file.name, reason: 'no se pudo leer' });
    }
  }
  return out;
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
