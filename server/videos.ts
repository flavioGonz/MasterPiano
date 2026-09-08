/**
 * Video de cada lección.
 *
 * La foto de Unsplash no enseñaba nada. En su lugar, cada lección tiene un
 * video de YouTube elegido por búsqueda, no cableado a mano: los ids cableados
 * se pudren —un video se borra, se hace privado, el canal cierra— y no hay
 * forma de enterarse hasta que alguien ve el cuadro negro. Acá la búsqueda se
 * rehace y la elección queda cacheada, así que el catálogo se repara solo.
 *
 * La búsqueda usa yt-dlp (ya instalado para separar instrumentos), que devuelve
 * id, título, canal, vistas y duración sin necesitar clave de API.
 *
 * La descarga para ver sin conexión es **opt-in por video**: nada se baja solo.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import express from "express";
import type { Express, Request, Response } from "express";
import { requireUser } from "./auth";

const VENV = process.env.AUDIO_VENV || "/opt/masterpiano-audio/venv";
const YTDLP = process.env.AUDIO_YTDLP || path.join(VENV, "bin", "yt-dlp");
const DATA_DIR = process.env.VIDEO_DIR || path.join(process.cwd(), "data", "videos");
const INDEX = path.join(DATA_DIR, "index.json");

/** Ni un clip de 40 s ni una clase de dos horas: una lección se ve entera. */
const MIN_SEC = 120, MAX_SEC = 1800;
const SEARCH_N = 12;

export interface VideoPick {
  id: string;
  title: string;
  channel: string;
  views: number;
  duration: number;
  /** Cuándo se eligió, para poder refrescar los viejos. */
  pickedAt: number;
}

type Index = Record<string, VideoPick>;   // lessonId -> elegido

const ensureDir = () => fs.mkdirSync(DATA_DIR, { recursive: true });
const filePath = (id: string) => path.join(DATA_DIR, `${id}.mp4`);
/** Los ids de YouTube son 11 caracteres de un alfabeto conocido. */
const safeVideoId = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id);

function readIndex(): Index {
  try { return JSON.parse(fs.readFileSync(INDEX, "utf8")); } catch { return {}; }
}
function writeIndex(idx: Index) {
  ensureDir();
  const tmp = INDEX + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(idx, null, 2));
  fs.renameSync(tmp, INDEX);
}

function run(cmd: string, args: string[], timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let out = "", err = "";
    const timer = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("tiempo agotado")); }, timeoutMs);
    p.stdout.on("data", d => { out += d; });
    p.stderr.on("data", d => { err += d; });
    p.on("error", e => { clearTimeout(timer); reject(e); });
    p.on("close", code => {
      clearTimeout(timer);
      code === 0 ? resolve(out) : reject(new Error(err.slice(-400) || `salió con ${code}`));
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Búsqueda y elección                                                */
/* ------------------------------------------------------------------ */
const SPANISH_HINT = /[áéíóúñ¿¡]|\b(el|la|los|las|de|del|para|con|como|tutorial|aprende|clase|lecci[oó]n|f[aá]cil|principiantes|espa[nñ]ol)\b/i;
const ENGLISH_HINT = /\b(the|how to|lesson|beginners?|easy|learn|tutorial for|piano lesson|chords for)\b/i;

/**
 * Puntaje del candidato.
 *
 * Las vistas se toman en logaritmo: la diferencia entre 10 mil y 100 mil
 * importa mucho más que entre 3 y 4 millones, y sin el log un video viral
 * en inglés le gana siempre a la mejor clase en español. Encima de eso pesa
 * el idioma, que es lo que pidió el usuario, y se castiga lo muy largo.
 */
function score(v: { title: string; views: number; duration: number; channel: string }): number {
  const text = `${v.title} ${v.channel}`;
  let s = Math.log10(Math.max(v.views, 1)) * 10;
  if (SPANISH_HINT.test(text)) s += 25;
  if (ENGLISH_HINT.test(v.title) && !SPANISH_HINT.test(v.title)) s -= 30;
  // La franja cómoda para una lección: entre 4 y 20 minutos
  if (v.duration >= 240 && v.duration <= 1200) s += 8;
  else if (v.duration > 1500) s -= 8;
  return s;
}

/**
 * Los datos de un video concreto, por id.
 *
 * Sirve para las lecciones que traen un video elegido a mano (`videoId`). El
 * módulo evita los ids cableados porque se pudren en silencio, así que esto
 * NO reemplaza a la búsqueda: si el video ya no está, quien llama se cae a
 * buscar y el catálogo se sigue reparando solo.
 */
export async function videoById(id: string): Promise<VideoPick | null> {
  if (!safeVideoId(id)) return null;
  try {
    const raw = await run(YTDLP, [
      `https://www.youtube.com/watch?v=${id}`,
      "--dump-single-json", "--no-warnings", "--skip-download",
      "--extractor-args", "youtube:player_client=web",
    ], 45_000);
    const d = JSON.parse(raw);
    if (!safeVideoId(String(d.id || ""))) return null;
    return {
      id: String(d.id),
      title: String(d.title || "").slice(0, 200),
      channel: String(d.uploader || d.channel || "").slice(0, 120),
      views: Number(d.view_count) || 0,
      duration: Number(d.duration) || 0,
      pickedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function searchVideos(query: string): Promise<VideoPick[]> {
  const raw = await run(YTDLP, [
    `ytsearch${SEARCH_N}:${query}`,
    "--flat-playlist", "--dump-json", "--no-warnings",
    "--extractor-args", "youtube:player_client=web",
  ]);
  const out: VideoPick[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line);
      const duration = Number(d.duration) || 0;
      if (!safeVideoId(String(d.id || ""))) continue;
      if (duration < MIN_SEC || duration > MAX_SEC) continue;
      // Los directos y estrenos no sirven de material de estudio
      if (d.live_status && d.live_status !== "not_live" && d.live_status !== "was_live") continue;
      out.push({
        id: d.id,
        title: String(d.title || "").slice(0, 200),
        channel: String(d.channel || d.uploader || "").slice(0, 120),
        views: Number(d.view_count) || 0,
        duration,
        pickedAt: Date.now(),
      });
    } catch { /* línea suelta: se saltea */ }
  }
  return out.sort((a, b) => score(b) - score(a));
}

/* ------------------------------------------------------------------ */
/*  Descargas (opt-in)                                                 */
/* ------------------------------------------------------------------ */
type DownloadState = { status: "downloading" | "done" | "error"; progress: number; error?: string; bytes?: number };
const downloads = new Map<string, DownloadState>();

function downloadedBytes(id: string): number | null {
  try { return fs.statSync(filePath(id)).size; } catch { return null; }
}

function startDownload(id: string) {
  if (downloads.get(id)?.status === "downloading") return;
  downloads.set(id, { status: "downloading", progress: 0 });
  const tmp = filePath(id) + ".part";
  ensureDir();

  const p = spawn(YTDLP, [
    `https://www.youtube.com/watch?v=${id}`,
    // 720p alcanza para una clase y pesa la mitad que 1080
    "-f", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best",
    "--merge-output-format", "mp4",
    "-o", tmp,
    "--newline", "--no-warnings", "--no-playlist",
  ]);
  p.stdout.on("data", d => {
    const m = /\[download\]\s+([\d.]+)%/.exec(String(d));
    if (m) downloads.set(id, { status: "downloading", progress: Number(m[1]) / 100 });
  });
  let err = "";
  p.stderr.on("data", d => { err += d; });
  p.on("close", code => {
    if (code === 0 && fs.existsSync(tmp)) {
      try { fs.renameSync(tmp, filePath(id)); } catch { /* ya estaba */ }
      downloads.set(id, { status: "done", progress: 1, bytes: downloadedBytes(id) ?? 0 });
    } else {
      try { fs.unlinkSync(tmp); } catch { /* no quedó nada */ }
      downloads.set(id, { status: "error", progress: 0, error: err.slice(-200) || "no se pudo descargar" });
    }
  });
  p.on("error", e => downloads.set(id, { status: "error", progress: 0, error: e.message }));
}

/* ------------------------------------------------------------------ */
/*  Rutas                                                              */
/* ------------------------------------------------------------------ */
export function registerVideoRoutes(app: Express) {
  ensureDir();

  /** El video de una lección. Busca y cachea la primera vez. */
  app.get("/api/videos/lesson/:lessonId", requireUser, async (req: Request, res: Response) => {
    const idx = readIndex();
    const cached = idx[req.params.lessonId];
    if (cached && req.query.refresh !== "1") {
      return res.json({ video: cached, offline: downloadedBytes(cached.id) !== null });
    }
    /* Video elegido a mano en la lección: se respeta la primera vez, y si ya
       no existe se cae a la búsqueda como cualquier otra lección. */
    const pin = String(req.query.pin || "");
    if (pin && !cached) {
      const v = await videoById(pin);
      if (v) {
        idx[req.params.lessonId] = v;
        writeIndex(idx);
        return res.json({ video: v, offline: downloadedBytes(v.id) !== null, pinned: true });
      }
    }

    const query = String(req.query.q || "").slice(0, 200);
    if (!query) return res.status(400).json({ error: "falta la búsqueda" });
    try {
      const results = await searchVideos(query);
      if (!results.length) return res.status(404).json({ error: "no se encontró ningún video" });
      idx[req.params.lessonId] = results[0];
      writeIndex(idx);
      res.json({ video: results[0], offline: downloadedBytes(results[0].id) !== null, alternatives: results.slice(1, 6) });
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "la búsqueda falló" });
    }
  });

  /** Candidatos, para elegir otro a mano. */
  app.get("/api/videos/search", requireUser, async (req: Request, res: Response) => {
    const query = String(req.query.q || "").slice(0, 200);
    if (!query) return res.status(400).json({ error: "falta la búsqueda" });
    try {
      const results = await searchVideos(query);
      res.json({ results: results.slice(0, 8).map(v => ({ ...v, offline: downloadedBytes(v.id) !== null })) });
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "la búsqueda falló" });
    }
  });

  /** Fijar a mano el video de una lección. */
  app.put("/api/videos/lesson/:lessonId", requireUser, express.json(), (req: Request, res: Response) => {
    const v = req.body?.video;
    if (!v || !safeVideoId(String(v.id))) return res.status(400).json({ error: "video inválido" });
    const idx = readIndex();
    idx[req.params.lessonId] = {
      id: v.id,
      title: String(v.title || "").slice(0, 200),
      channel: String(v.channel || "").slice(0, 120),
      views: Number(v.views) || 0,
      duration: Number(v.duration) || 0,
      pickedAt: Date.now(),
    };
    writeIndex(idx);
    res.json({ video: idx[req.params.lessonId] });
  });

  /** Empezar la descarga. Decisión del usuario, nunca automática. */
  app.post("/api/videos/:id/download", requireUser, (req: Request, res: Response) => {
    if (!safeVideoId(req.params.id)) return res.status(400).json({ error: "id inválido" });
    if (downloadedBytes(req.params.id) !== null) {
      return res.json({ status: "done", progress: 1, bytes: downloadedBytes(req.params.id) });
    }
    startDownload(req.params.id);
    res.json({ status: "downloading", progress: 0 });
  });

  app.get("/api/videos/:id/status", requireUser, (req: Request, res: Response) => {
    if (!safeVideoId(req.params.id)) return res.status(400).json({ error: "id inválido" });
    const bytes = downloadedBytes(req.params.id);
    if (bytes !== null) return res.json({ status: "done", progress: 1, bytes });
    res.json(downloads.get(req.params.id) ?? { status: "none", progress: 0 });
  });

  /** Qué hay guardado, para poder liberar espacio. */
  app.get("/api/videos/downloads", requireUser, (_req: Request, res: Response) => {
    const idx = readIndex();
    const byId = new Map(Object.values(idx).map(v => [v.id, v]));
    let files: string[] = [];
    try { files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".mp4")); } catch { /* vacío */ }
    const items = files.map(f => {
      const id = f.replace(/\.mp4$/, "");
      const meta = byId.get(id);
      return { id, bytes: downloadedBytes(id) ?? 0, title: meta?.title ?? id, channel: meta?.channel ?? "" };
    });
    res.json({ items, totalBytes: items.reduce((a, b) => a + b.bytes, 0) });
  });

  app.delete("/api/videos/:id/download", requireUser, (req: Request, res: Response) => {
    if (!safeVideoId(req.params.id)) return res.status(400).json({ error: "id inválido" });
    try { fs.unlinkSync(filePath(req.params.id)); } catch { /* ya no estaba */ }
    downloads.delete(req.params.id);
    res.json({ ok: true });
  });

  /**
   * Servir el archivo con soporte de rango: sin esto el navegador no puede
   * saltar a un minuto del video, solo reproducirlo desde el principio.
   */
  app.get("/api/videos/:id/file", requireUser, (req: Request, res: Response) => {
    if (!safeVideoId(req.params.id)) return res.status(400).json({ error: "id inválido" });
    const file = filePath(req.params.id);
    let size = 0;
    try { size = fs.statSync(file).size; } catch { return res.status(404).json({ error: "no está descargado" }); }

    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, { "Content-Length": size, "Content-Type": "video/mp4", "Accept-Ranges": "bytes" });
      return fs.createReadStream(file).pipe(res);
    }
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  });
}
