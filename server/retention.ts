/**
 * Limpieza de lo que se acumula solo.
 *
 * Tres cosas crecen sin techo: los jobs de separación de audio (cada canción
 * deja seis stems en WAV y MP3, cientos de MB), los videos de lección que se
 * bajan para ver sin conexión (50 a 150 MB cada uno) y los dispositivos de
 * cada perfil, que suman uno por cada navegador que entra alguna vez.
 *
 * El criterio es el mismo para los tres: se borra lo viejo y lo que no se usó,
 * nunca lo de hoy. Los límites se pueden mover por entorno; los de fábrica son
 * generosos para el uso real de una persona practicando piano.
 *
 * Corre una vez al arrancar y después una vez por día. No hay endpoint para
 * dispararla: no hace falta y sería una forma fácil de borrarle los datos a
 * alguien.
 */
import fs from "fs";
import path from "path";

const DAY = 86_400_000;

const num = (name: string, def: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : def;
};

/** Días que sobrevive un job de audio terminado. */
const AUDIO_DAYS = num("RETAIN_AUDIO_DAYS", 30);
/** Tope de disco de los jobs; si se pasa, se borran los más viejos. */
const AUDIO_MAX_GB = num("RETAIN_AUDIO_GB", 8);
/** Días sin abrirse que sobrevive un video descargado. */
const VIDEO_DAYS = num("RETAIN_VIDEO_DAYS", 60);
/** Días sin aparecer que sobrevive un dispositivo en el perfil. */
const DEVICE_DAYS = num("RETAIN_DEVICE_DAYS", 120);

function dirSize(dir: string): number {
  let total = 0;
  const walk = (d: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { try { total += fs.statSync(p).size; } catch { /* desapareció */ } }
    }
  };
  walk(dir);
  return total;
}

const rm = (p: string) => { try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* ya no está */ } };

/** Jobs de audio: por antigüedad y, si aún así ocupan de más, por tamaño. */
function sweepAudio(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const hechos: string[] = [];
  const now = Date.now();

  const jobs = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => {
      const p = path.join(dir, e.name);
      let job: any = null;
      try { job = JSON.parse(fs.readFileSync(path.join(p, "job.json"), "utf8")); } catch { /* sin metadatos */ }
      const stat = (() => { try { return fs.statSync(p); } catch { return null; } })();
      return {
        id: e.name,
        path: p,
        // Un job sin metadatos se juzga por la fecha de la carpeta
        when: job?.finishedAt || job?.createdAt || stat?.mtimeMs || 0,
        running: job?.status === "running" || job?.status === "queued",
      };
    })
    .filter(j => !j.running);

  for (const j of jobs) {
    if (j.when && now - j.when > AUDIO_DAYS * DAY) { rm(j.path); hechos.push(`audio ${j.id} (más de ${AUDIO_DAYS} días)`); }
  }

  // Segunda pasada por tamaño: se van los más viejos hasta entrar en el tope
  let size = dirSize(dir);
  const max = AUDIO_MAX_GB * 1e9;
  if (size > max) {
    const vivos = jobs.filter(j => fs.existsSync(j.path)).sort((a, b) => a.when - b.when);
    for (const j of vivos) {
      if (size <= max) break;
      const s = dirSize(j.path);
      rm(j.path);
      size -= s;
      hechos.push(`audio ${j.id} (por espacio)`);
    }
  }
  return hechos;
}

/** Videos guardados para ver sin conexión que hace tiempo nadie abre. */
function sweepVideos(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const hechos: string[] = [];
  const now = Date.now();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".mp4")) continue;
    const p = path.join(dir, f);
    try {
      const st = fs.statSync(p);
      // atime se actualiza al reproducirlo; si el sistema lo desactivó, mtime
      const usado = Math.max(st.atimeMs || 0, st.mtimeMs || 0);
      if (now - usado > VIDEO_DAYS * DAY) { rm(p); hechos.push(`video ${f} (sin verse hace ${VIDEO_DAYS} días)`); }
    } catch { /* desapareció */ }
  }
  return hechos;
}

/** Dispositivos que no aparecen hace meses: la lista es de uso, no un registro. */
function sweepDevices(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const hechos: string[] = [];
  const now = Date.now();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const p = path.join(dir, f);
    try {
      const prof = JSON.parse(fs.readFileSync(p, "utf8"));
      if (!Array.isArray(prof.devices)) continue;
      const antes = prof.devices.length;
      prof.devices = prof.devices.filter((d: any) => now - (d?.lastSeen ?? 0) < DEVICE_DAYS * DAY);
      if (prof.devices.length !== antes) {
        fs.writeFileSync(p, JSON.stringify(prof, null, 2));
        hechos.push(`perfil ${f}: ${antes - prof.devices.length} dispositivos viejos`);
      }
    } catch { /* perfil ilegible: no se toca */ }
  }
  return hechos;
}

export function startRetention() {
  const audioDir = process.env.AUDIO_DIR || path.join(process.cwd(), "data", "audio");
  const videoDir = process.env.VIDEO_DIR || path.join(process.cwd(), "data", "videos");
  const profileDir = process.env.PROFILE_DIR || path.join(process.cwd(), "data", "profiles");

  const run = () => {
    try {
      const hechos = [...sweepAudio(audioDir), ...sweepVideos(videoDir), ...sweepDevices(profileDir)];
      if (hechos.length) console.log(`[limpieza] ${hechos.length} cosas borradas: ${hechos.slice(0, 8).join("; ")}`);
    } catch (e) {
      console.error("[limpieza] falló:", e);
    }
  };

  // Al arrancar, con unos segundos de gracia para no competir con el arranque
  setTimeout(run, 20_000).unref?.();
  setInterval(run, DAY).unref?.();
}

/** Expuesto para las pruebas. */
export const _internals = { sweepAudio, sweepVideos, sweepDevices };
