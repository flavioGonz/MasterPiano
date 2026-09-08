/**
 * Piezas importadas por el usuario.
 *
 * Antes vivían en el localStorage del navegador, con un tope defensivo de 4 MB
 * que a los pocos MIDI se llenaba y empezaba a descartar las más viejas en
 * silencio. Con la idea de tener cientos de piezas eso no sirve: ahora cada
 * pieza es un archivo del usuario en el servidor y el navegador solo guarda
 * una copia para poder abrirlas sin red.
 *
 * Un archivo por pieza (no un JSON gigante con todas): guardar la número 200
 * no obliga a reescribir las otras 199, y el listado se arma leyendo solo la
 * ficha de cada una.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import express from "express";
import type { Express, Request, Response } from "express";
import { requireUser } from "./auth";

const DATA_DIR = process.env.SONG_DIR || path.join(process.cwd(), "data", "songs");
/** Una pieza MIDI larga ronda los 300 KB de JSON; 8 MB es holgado y frena abusos. */
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_SONGS = 2000;

const userDir = (userId: string) => path.join(DATA_DIR, userId);
const songPath = (userId: string, id: string) => path.join(userDir(userId), `${id}.json`);

/** Los ids vienen del cliente: hay que impedir que se escapen del directorio. */
const safeId = (id: string) => /^[A-Za-z0-9._-]{1,80}$/.test(id) && !id.startsWith(".");

function readSong(userId: string, id: string): any | null {
  try { return JSON.parse(fs.readFileSync(songPath(userId, id), "utf8")); } catch { return null; }
}

function writeSong(userId: string, song: any) {
  fs.mkdirSync(userDir(userId), { recursive: true });
  const tmp = songPath(userId, song.id) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(song));
  fs.renameSync(tmp, songPath(userId, song.id));
}

/** Ficha sin las notas: el listado de cientos de piezas tiene que ser liviano. */
const summary = (s: any) => ({
  id: s.id, title: s.title, composer: s.composer, difficulty: s.difficulty,
  bpm: s.bpm, duration: s.duration, notesCount: s.notesCount,
  description: s.description, isCustom: true,
  tracks: s.tracks, sourceJobId: s.sourceJobId, importedAt: s.importedAt,
});

/** Valida lo que llega: no confiar en que el cliente mande una pieza sana. */
function sanitize(body: any, fallbackId: string): any | null {
  if (!body || typeof body !== "object") return null;
  const notes = Array.isArray(body.notes) ? body.notes : null;
  if (!notes || !notes.length) return null;
  const id = typeof body.id === "string" && safeId(body.id) ? body.id : fallbackId;
  return {
    id,
    title: String(body.title || "Pieza sin nombre").slice(0, 200),
    composer: String(body.composer || "Importada").slice(0, 200),
    difficulty: ["Fácil", "Intermedio", "Avanzado"].includes(body.difficulty) ? body.difficulty : "Intermedio",
    bpm: Number.isFinite(body.bpm) ? Math.min(400, Math.max(20, Math.round(body.bpm))) : 100,
    duration: Number.isFinite(body.duration) ? Math.max(0, body.duration) : 0,
    notesCount: notes.length,
    description: String(body.description || "").slice(0, 500),
    notes,
    isCustom: true,
    tracks: Array.isArray(body.tracks) ? body.tracks.slice(0, 32) : undefined,
    sourceJobId: typeof body.sourceJobId === "string" ? body.sourceJobId : undefined,
    importedAt: Number(body.importedAt) || Date.now(),
  };
}

export function registerSongRoutes(app: Express) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  /** Listado liviano: fichas, sin notas. */
  app.get("/api/songs", requireUser, (req: Request, res: Response) => {
    const dir = userDir(req.user!.id);
    let files: string[] = [];
    try { files = fs.readdirSync(dir).filter(f => f.endsWith(".json")); } catch { /* todavía no hay ninguna */ }
    const songs = files
      .map(f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { return null; } })
      .filter(Boolean)
      .map(summary)
      .sort((a, b) => (b.importedAt || 0) - (a.importedAt || 0));
    res.json({ songs });
  });

  /** Una pieza completa, con sus notas. */
  app.get("/api/songs/:id", requireUser, (req: Request, res: Response) => {
    if (!safeId(req.params.id)) return res.status(400).json({ error: "id inválido" });
    const song = readSong(req.user!.id, req.params.id);
    if (!song) return res.status(404).json({ error: "pieza no encontrada" });
    res.json({ song });
  });

  /** Guardar (crear o reemplazar). El cliente manda la pieza ya parseada. */
  app.put("/api/songs/:id", requireUser, express.json({ limit: MAX_BYTES }), (req: Request, res: Response) => {
    if (!safeId(req.params.id)) return res.status(400).json({ error: "id inválido" });
    const userId = req.user!.id;
    const song = sanitize(req.body, req.params.id);
    if (!song) return res.status(400).json({ error: "la pieza no tiene notas" });
    song.id = req.params.id;

    // Tope por usuario: evita que un script llene el disco del contenedor
    let count = 0;
    try { count = fs.readdirSync(userDir(userId)).filter(f => f.endsWith(".json")).length; } catch { /* directorio nuevo */ }
    if (count >= MAX_SONGS && !readSong(userId, song.id)) {
      return res.status(507).json({ error: `llegaste al límite de ${MAX_SONGS} piezas` });
    }

    writeSong(userId, song);
    res.json({ song: summary(song) });
  });

  app.delete("/api/songs/:id", requireUser, (req: Request, res: Response) => {
    if (!safeId(req.params.id)) return res.status(400).json({ error: "id inválido" });
    try { fs.unlinkSync(songPath(req.user!.id, req.params.id)); } catch { /* ya no estaba */ }
    res.json({ ok: true });
  });
}


/** Generar un id nuevo del lado del servidor si el cliente no trae uno usable. */
export const newSongId = () => crypto.randomBytes(9).toString("base64url");
