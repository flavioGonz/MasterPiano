/**
 * Jobs de audio: YouTube (o archivo subido) → WAV → separación de
 * instrumentos con Demucs → stems WAV (16-bit 44,1 kHz, aptos para la SD
 * del Korg Kross 2) + MP3 livianos para escuchar en el navegador + mezclas
 * a pedido ("base sin piano").
 *
 * Todo corre en el servidor con herramientas locales:
 *   - yt-dlp  (descarga del audio)          → AUDIO_YTDLP  (default: venv/bin/yt-dlp)
 *   - ffmpeg  (conversiones y mezclas)      → en PATH
 *   - demucs  (separación, PyTorch en CPU)  → AUDIO_PYTHON (default: venv/bin/python)
 *
 * Los jobs se persisten en AUDIO_DIR/<id>/job.json para sobrevivir reinicios.
 * Se procesa de a UNO por vez (cola en memoria): Demucs en CPU usa todos los
 * núcleos y correr dos a la vez solo los hace más lentos.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";
import type { Express, Request, Response } from "express";
import express from "express";
import { transcribeSamples, mergeTracks } from "../src/lib/audioTranscriber";
import { INSTRUMENT_TRACKS } from "../src/lib/midiWaterfall";

export type JobStatus = "queued" | "downloading" | "separating" | "encoding" | "done" | "error";

export interface AudioJob {
  id: string;
  source: { type: "youtube"; url: string } | { type: "upload"; fileName: string };
  title: string;
  duration: number;          // segundos
  status: JobStatus;
  progress: number;          // 0..1 dentro del paso actual
  step: string;              // texto para la UI
  stems: string[];           // nombres disponibles (drums, bass, vocals, guitar, piano, other)
  model: string;
  quality: "fast" | "high";  // high = además htdemucs_ft para voz/bajo/batería (≈4× más lento)
  createdAt: number;
  finishedAt?: number;
  error?: string;
  thumbnail?: string;
}

const AUDIO_DIR = process.env.AUDIO_DIR || path.join(process.cwd(), "data", "audio");
const VENV = process.env.AUDIO_VENV || "/opt/masterpiano-audio/venv";
const PYTHON = process.env.AUDIO_PYTHON || path.join(VENV, "bin", "python");
const YTDLP = process.env.AUDIO_YTDLP || path.join(VENV, "bin", "yt-dlp");
const MODEL = process.env.DEMUCS_MODEL || "htdemucs_6s";
const HQ_MODEL = process.env.DEMUCS_HQ_MODEL || "htdemucs_ft";
const MAX_DURATION = Number(process.env.AUDIO_MAX_DURATION || 600); // 10 min
const STEM_ORDER = ["piano", "guitar", "bass", "drums", "vocals", "other"];

const jobs = new Map<string, AudioJob>();
const queue: string[] = [];
let running = false;

/* ---------------- utilidades ---------------- */
const jobDir = (id: string) => path.join(AUDIO_DIR, id);
const saveJob = (j: AudioJob) => {
  fs.mkdirSync(jobDir(j.id), { recursive: true });
  fs.writeFileSync(path.join(jobDir(j.id), "job.json"), JSON.stringify(j, null, 2));
};
const publicJob = (j: AudioJob) => ({
  ...j,
  stems: j.stems.map(name => ({
    name,
    wav: `/api/audio/jobs/${j.id}/stems/${name}.wav`,
    mp3: `/api/audio/jobs/${j.id}/stems/${name}.mp3`,
  })),
});

function run(cmd: string, args: string[], opts: { cwd?: string; onLine?: (line: string) => void; env?: NodeJS.ProcessEnv; binary?: boolean } = {}): Promise<{ code: number; out: string; err: string; buf?: Buffer }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, env: { ...process.env, ...(opts.env || {}) } });
    let out = "", err = "";
    const chunks: Buffer[] = [];
    const feed = (chunk: Buffer, isErr: boolean) => {
      if (!isErr && opts.binary) { chunks.push(chunk); return; }
      const s = chunk.toString();
      if (isErr) err += s; else out += s;
      if (opts.onLine) s.split(/\r?\n|\r/).forEach(l => l.trim() && opts.onLine!(l));
    };
    p.stdout.on("data", c => feed(c, false));
    p.stderr.on("data", c => feed(c, true));
    p.on("error", reject);
    p.on("close", code => resolve({ code: code ?? -1, out, err, buf: opts.binary ? Buffer.concat(chunks) : undefined }));
  });
}

function loadJobsFromDisk() {
  if (!fs.existsSync(AUDIO_DIR)) return;
  for (const id of fs.readdirSync(AUDIO_DIR)) {
    const f = path.join(AUDIO_DIR, id, "job.json");
    if (!fs.existsSync(f)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(f, "utf8")) as AudioJob;
      // Un job que quedó a medias en un reinicio se marca como error
      if (j.status !== "done" && j.status !== "error") { j.status = "error"; j.error = "Interrumpido por reinicio del servidor"; }
      jobs.set(id, j);
    } catch { /* ignore */ }
  }
}

/* ---------------- pipeline ---------------- */
async function processJob(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  const dir = jobDir(id);
  const update = (patch: Partial<AudioJob>) => { Object.assign(job, patch); saveJob(job); };
  const input = path.join(dir, "input.wav");

  try {
    // 1) Obtener el audio
    if (job.source.type === "youtube") {
      update({ status: "downloading", progress: 0, step: "Descargando audio de YouTube" });
      // metadatos primero (título, duración) para validar el largo
      const meta = await run(YTDLP, ["--dump-single-json", "--no-playlist", "--no-warnings", job.source.url]);
      if (meta.code !== 0) throw new Error(`yt-dlp: ${meta.err.split("\n").filter(Boolean).pop() || "no se pudo leer el video"}`);
      const info = JSON.parse(meta.out);
      const duration = Number(info.duration || 0);
      if (duration > MAX_DURATION) throw new Error(`El video dura ${Math.round(duration / 60)} min; el máximo es ${Math.round(MAX_DURATION / 60)} min.`);
      update({ title: info.title || job.title, duration, thumbnail: info.thumbnail });
      const dl = await run(YTDLP, [
        "--no-playlist", "--no-warnings", "-f", "bestaudio/best",
        "-x", "--audio-format", "wav", "--audio-quality", "0",
        "--postprocessor-args", "ffmpeg:-ar 44100 -ac 2",
        "-o", path.join(dir, "input.%(ext)s"), job.source.url,
      ], {
        onLine: l => { const m = /\[download\]\s+([\d.]+)%/.exec(l); if (m) update({ progress: parseFloat(m[1]) / 100 }); },
      });
      if (dl.code !== 0 || !fs.existsSync(input)) throw new Error(`Descarga fallida: ${dl.err.split("\n").filter(Boolean).pop() || "sin detalle"}`);
    } else {
      update({ status: "downloading", progress: 0.5, step: "Convirtiendo el archivo" });
      const raw = fs.readdirSync(dir).find(f => f.startsWith("upload."));
      if (!raw) throw new Error("No se encontró el archivo subido");
      const conv = await run("ffmpeg", ["-y", "-i", path.join(dir, raw), "-ar", "44100", "-ac", "2", input]);
      if (conv.code !== 0) throw new Error("ffmpeg no pudo leer el archivo");
      const probe = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input]);
      update({ duration: parseFloat(probe.out) || 0 });
      if (job.duration > MAX_DURATION) throw new Error(`El audio dura ${Math.round(job.duration / 60)} min; el máximo es ${Math.round(MAX_DURATION / 60)} min.`);
    }

    // 2) Separar con Demucs
    update({ status: "separating", progress: 0, step: `Separando instrumentos (${MODEL}, CPU)` });
    const sep = await run(PYTHON, ["-m", "demucs.separate", "-n", MODEL, "-d", "cpu", "--segment", "7", "-o", path.join(dir, "sep"), input], {
      env: { OMP_NUM_THREADS: String(Math.max(1, os.cpus().length)) },
      onLine: l => { const m = /(\d{1,3})%\|/.exec(l) || /(\d{1,3})%/.exec(l); if (m) update({ progress: Math.min(1, parseInt(m[1], 10) / 100) }); },
    });
    if (sep.code !== 0) throw new Error(`Demucs falló: ${sep.err.split("\n").filter(Boolean).slice(-2).join(" · ")}`);
    const sepDir = path.join(dir, "sep", MODEL, "input");
    if (!fs.existsSync(sepDir)) throw new Error("Demucs no generó los stems");

    // 2b) Calidad alta: htdemucs_ft (bag de 4 modelos) para voz, bajo y batería
    if (job.quality === "high") {
      update({ status: "separating", progress: 0, step: `Refinando voz, bajo y batería (${HQ_MODEL}, CPU)` });
      const hq = await run(PYTHON, ["-m", "demucs.separate", "-n", HQ_MODEL, "-d", "cpu", "--segment", "7", "-o", path.join(dir, "sep"), input], {
        env: { OMP_NUM_THREADS: String(Math.max(1, os.cpus().length)) },
        onLine: l => { const m = /(\d{1,3})%\|/.exec(l) || /(\d{1,3})%/.exec(l); if (m) update({ progress: Math.min(1, parseInt(m[1], 10) / 100) }); },
      });
      const hqDir = path.join(dir, "sep", HQ_MODEL, "input");
      if (hq.code === 0 && fs.existsSync(hqDir)) {
        for (const stem of ["vocals", "bass", "drums"]) {
          const src = path.join(hqDir, `${stem}.wav`);
          if (fs.existsSync(src)) fs.copyFileSync(src, path.join(sepDir, `${stem}.wav`));
        }
      }
    }

    // 3) Normalizar: WAV 16-bit 44.1k estéreo (Kross 2) + MP3 para el navegador
    update({ status: "encoding", progress: 0, step: "Preparando stems (WAV para Kross 2 + MP3 para escuchar)" });
    const stemsDir = path.join(dir, "stems");
    fs.mkdirSync(stemsDir, { recursive: true });
    const found = fs.readdirSync(sepDir).filter(f => f.endsWith(".wav")).map(f => f.replace(/\.wav$/, ""));
    const ordered = [...STEM_ORDER.filter(s => found.includes(s)), ...found.filter(s => !STEM_ORDER.includes(s))];
    for (let i = 0; i < ordered.length; i++) {
      const name = ordered[i];
      const src = path.join(sepDir, `${name}.wav`);
      await run("ffmpeg", ["-y", "-i", src, "-ar", "44100", "-ac", "2", "-sample_fmt", "s16", path.join(stemsDir, `${name}.wav`)]);
      await run("ffmpeg", ["-y", "-i", src, "-ar", "44100", "-ac", "2", "-b:a", "160k", path.join(stemsDir, `${name}.mp3`)]);
      update({ progress: (i + 1) / ordered.length });
    }
    fs.rmSync(path.join(dir, "sep"), { recursive: true, force: true });
    update({ status: "done", progress: 1, step: "Listo", stems: ordered, finishedAt: Date.now() });
  } catch (e: any) {
    update({ status: "error", error: String(e?.message || e), step: "Error" });
  }
}

async function pump() {
  if (running) return;
  const next = queue.shift();
  if (!next) return;
  running = true;
  try { await processJob(next); } finally { running = false; pump(); }
}

/* ---------------- rutas ---------------- */
export function registerAudioRoutes(app: Express) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  loadJobsFromDisk();

  const toolsReady = () => fs.existsSync(PYTHON) && fs.existsSync(YTDLP);

  app.get("/api/audio/status", async (_req, res) => {
    res.json({ ready: toolsReady(), model: MODEL, hqModel: HQ_MODEL, maxDurationSec: MAX_DURATION, queue: queue.length, running });
  });

  app.get("/api/audio/jobs", (_req, res) => {
    // La limpieza automática borra carpetas viejas; un job cuya carpeta ya no
    // está sólo sirve para que la biblioteca muestre algo que no se puede abrir.
    for (const [id] of jobs) if (!fs.existsSync(jobDir(id))) jobs.delete(id);
    const list = Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt).map(publicJob);
    res.json(list);
  });

  app.get("/api/audio/jobs/:id", (req, res) => {
    const j = jobs.get(req.params.id);
    if (!j) return res.status(404).json({ error: "Job no encontrado" });
    res.json(publicJob(j));
  });

  // Crear desde un link de YouTube
  app.post("/api/audio/jobs", (req: Request, res: Response) => {
    if (!toolsReady()) return res.status(503).json({ error: "Las herramientas de audio (yt-dlp / Demucs) no están instaladas en el servidor." });
    const url = String(req.body?.url || "").trim();
    if (!/^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
      return res.status(400).json({ error: "Pegá un link de YouTube válido (youtube.com o youtu.be)." });
    }
    const id = crypto.randomBytes(6).toString("hex");
    const quality = req.body?.quality === "high" ? "high" : "fast";
    const job: AudioJob = {
      id, source: { type: "youtube", url }, title: url, duration: 0, status: "queued", progress: 0,
      step: "En cola", stems: [], model: MODEL, quality, createdAt: Date.now(),
    };
    jobs.set(id, job); saveJob(job); queue.push(id); pump();
    res.status(202).json(publicJob(job));
  });

  // Crear desde un archivo (body crudo; nombre en X-Filename)
  app.post("/api/audio/jobs/upload", express.raw({ type: () => true, limit: "120mb" }), (req: Request, res: Response) => {
    if (!toolsReady()) return res.status(503).json({ error: "Las herramientas de audio (yt-dlp / Demucs) no están instaladas en el servidor." });
    const fileName = decodeURIComponent(String(req.header("x-filename") || "audio.wav"));
    const ext = (path.extname(fileName) || ".wav").toLowerCase().replace(/[^a-z0-9.]/g, "");
    if (!Buffer.isBuffer(req.body) || req.body.length < 1000) return res.status(400).json({ error: "Archivo vacío" });
    const id = crypto.randomBytes(6).toString("hex");
    fs.mkdirSync(jobDir(id), { recursive: true });
    fs.writeFileSync(path.join(jobDir(id), `upload${ext}`), req.body);
    const quality = String(req.query.quality || "") === "high" ? "high" : "fast";
    const job: AudioJob = {
      id, source: { type: "upload", fileName }, title: fileName.replace(/\.[^.]+$/, ""), duration: 0, status: "queued",
      progress: 0, step: "En cola", stems: [], model: MODEL, quality, createdAt: Date.now(),
    };
    jobs.set(id, job); saveJob(job); queue.push(id); pump();
    res.status(202).json(publicJob(job));
  });

  app.delete("/api/audio/jobs/:id", (req, res) => {
    const j = jobs.get(req.params.id);
    if (!j) return res.status(404).json({ error: "Job no encontrado" });
    if (j.status !== "done" && j.status !== "error") return res.status(409).json({ error: "El job todavía se está procesando" });
    jobs.delete(j.id);
    fs.rmSync(jobDir(j.id), { recursive: true, force: true });
    res.json({ ok: true });
  });

  // Stems individuales
  app.get("/api/audio/jobs/:id/stems/:file", (req, res) => {
    const j = jobs.get(req.params.id);
    const file = req.params.file;
    if (!j || !/^[a-z0-9_-]+\.(wav|mp3)$/i.test(file)) return res.status(404).end();
    const p = path.join(jobDir(j.id), "stems", file);
    if (!fs.existsSync(p)) return res.status(404).end();
    res.setHeader("Content-Disposition", `inline; filename="${sanitize(j.title)} - ${file}"`);
    res.sendFile(p);
  });

  // Transcripción por instrumento → pieza multipista para la Catarata.
  //   /notes?stems=piano,guitar,bass,vocals,other&sensitivity=0.5
  // Voz y bajo se transcriben en modo monofónico (pitch tracking); el resto polifónico.
  app.get("/api/audio/jobs/:id/notes", async (req, res) => {
    const j = jobs.get(req.params.id);
    if (!j || j.status !== "done") return res.status(404).json({ error: "Job no listo" });
    const wanted = String(req.query.stems || "piano,guitar,bass,vocals,other").split(",").map(s => s.trim()).filter(s => j.stems.includes(s) && s !== "drums");
    if (wanted.length === 0) return res.status(400).json({ error: "Sin stems válidos (la batería no tiene notas)" });
    const sensitivity = Math.max(0, Math.min(1, parseFloat(String(req.query.sensitivity ?? "0.5")) || 0.5));
    const key = crypto.createHash("md5").update(JSON.stringify({ wanted, sensitivity, v: 3 })).digest("hex").slice(0, 10);
    const cache = path.join(jobDir(j.id), `notes-${key}.json`);
    if (fs.existsSync(cache)) return res.sendFile(cache);
    try {
      const parts: { track: any; song: any }[] = [];
      for (const stem of wanted) {
        const wav = path.join(jobDir(j.id), "stems", `${stem}.wav`);
        const dec = await run("ffmpeg", ["-v", "error", "-i", wav, "-ac", "1", "-ar", "44100", "-f", "f32le", "-"], { binary: true });
        if (dec.code !== 0 || !dec.buf) throw new Error(`ffmpeg no pudo decodificar ${stem}`);
        const data = new Float32Array(dec.buf.buffer, dec.buf.byteOffset, Math.floor(dec.buf.byteLength / 4));
        const mode = stem === "vocals" || stem === "bass" ? "mono" : "poly";
        const r = await transcribeSamples(data, 44100, data.length / 44100, `${j.title} - ${stem}.wav`, {
          sensitivity, mode, track: stem,
          minMidi: stem === "bass" ? 24 : stem === "vocals" ? 40 : 36,
          maxMidi: stem === "bass" ? 64 : stem === "vocals" ? 88 : 96,
        });
        parts.push({ track: INSTRUMENT_TRACKS[stem] ?? { id: stem, name: stem, color: "#7c7a74" }, song: r.song });
      }
      const song = mergeTracks(parts, j.title, j.duration, j.id);
      fs.writeFileSync(cache, JSON.stringify(song));
      res.json(song);
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  // Mezcla a pedido: /mix.wav?exclude=piano,vocals&gain=piano:0.5  (WAV 16-bit 44.1k → SD del Kross 2)
  app.get("/api/audio/jobs/:id/mix.wav", async (req, res) => {
    const j = jobs.get(req.params.id);
    if (!j || j.status !== "done") return res.status(404).json({ error: "Job no listo" });
    const exclude = String(req.query.exclude || "").split(",").map(s => s.trim()).filter(Boolean);
    const gains: Record<string, number> = {};
    String(req.query.gain || "").split(",").forEach(pair => {
      const [k, v] = pair.split(":"); const g = parseFloat(v);
      if (k && Number.isFinite(g)) gains[k.trim()] = Math.max(0, Math.min(2, g));
    });
    const use = j.stems.filter(s => !exclude.includes(s));
    if (use.length === 0) return res.status(400).json({ error: "No quedó ningún stem para mezclar" });
    const key = crypto.createHash("md5").update(JSON.stringify({ use, gains })).digest("hex").slice(0, 10);
    const out = path.join(jobDir(j.id), `mix-${key}.wav`);
    if (!fs.existsSync(out)) {
      const args: string[] = ["-y"];
      use.forEach(s => args.push("-i", path.join(jobDir(j.id), "stems", `${s}.wav`)));
      const chain = use.map((s, i) => `[${i}:a]volume=${gains[s] ?? 1}[a${i}]`).join(";");
      const inputs = use.map((_, i) => `[a${i}]`).join("");
      args.push("-filter_complex", `${chain};${inputs}amix=inputs=${use.length}:normalize=0[out]`, "-map", "[out]", "-ar", "44100", "-ac", "2", "-sample_fmt", "s16", out);
      const r = await run("ffmpeg", args);
      if (r.code !== 0) return res.status(500).json({ error: "ffmpeg no pudo mezclar" });
    }
    const label = exclude.length ? `sin ${exclude.join("-")}` : "completa";
    res.setHeader("Content-Disposition", `attachment; filename="${sanitize(j.title)} (base ${label}).wav"`);
    res.sendFile(out);
  });
}

const sanitize = (s: string) => s.replace(/[^\w\s().-]/g, "").trim().slice(0, 80) || "pista";
