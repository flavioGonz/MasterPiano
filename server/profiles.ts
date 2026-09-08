/**
 * Progreso por usuario.
 *
 * Antes el perfil era del dispositivo y se emparejaba con un código; ahora que
 * hay cuentas (`server/auth.ts`), el progreso cuelga del usuario y todas estas
 * rutas exigen sesión. Un archivo por usuario en `data/profiles/<userId>.json`.
 *
 * Resolución de conflictos: gana el que tiene más lecciones aprobadas y, a
 * igualdad, el más reciente. Es lo correcto para un progreso que solo crece —
 * sincronizar desde un dispositivo atrasado nunca borra una lección aprobada.
 */
import fs from "fs";
import path from "path";
import type { Express, Request, Response } from "express";
import { requireUser } from "./auth";

const DATA_DIR = process.env.PROFILE_DIR || path.join(process.cwd(), "data", "profiles");

export interface Profile {
  userId: string;
  updatedAt: number;
  progress: unknown;   // currículo
  routine: unknown;    // caja de Leitner de escalas
  library: unknown;    // favoritos y recientes de la biblioteca de piezas
  devices: { id: string; name: string; lastSeen: number }[];
}

const ensureDir = () => fs.mkdirSync(DATA_DIR, { recursive: true });
const profilePath = (id: string) => path.join(DATA_DIR, `${id}.json`);

function read(userId: string): Profile | null {
  try { return JSON.parse(fs.readFileSync(profilePath(userId), "utf8")) as Profile; } catch { return null; }
}

function write(p: Profile) {
  ensureDir();
  // Escritura atómica: un corte a mitad no deja un JSON truncado
  const tmp = profilePath(p.userId) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(p));
  fs.renameSync(tmp, profilePath(p.userId));
}

const blank = (userId: string): Profile => ({
  userId, updatedAt: 0, progress: null, routine: null, library: null, devices: [],
});

/** Lecciones aprobadas; -1 si el progreso no se puede leer. */
function passedCount(progress: any): number {
  const list = progress?.completedLessons;
  return Array.isArray(list) ? list.length : -1;
}

function merge(server: Profile, incoming: { progress: unknown; routine: unknown; library: unknown; updatedAt: number }) {
  if (server.updatedAt === 0) {
    // Perfil vacío: la primera sincronización sube lo que ya había en el dispositivo
    return { ...incoming, tookServer: false };
  }
  const a = passedCount(server.progress), b = passedCount(incoming.progress);
  const takeIncoming = b > a || (b === a && incoming.updatedAt >= server.updatedAt);
  return takeIncoming
    ? { progress: incoming.progress, routine: incoming.routine, library: incoming.library, tookServer: false }
    : { progress: server.progress, routine: server.routine, library: server.library, tookServer: true };
}

export function registerProfileRoutes(app: Express) {
  ensureDir();

  app.get("/api/profile", requireUser, (req: Request, res: Response) => {
    const p = read(req.user!.id) ?? blank(req.user!.id);
    res.json({ updatedAt: p.updatedAt, progress: p.progress, routine: p.routine, library: p.library, devices: p.devices });
  });

  app.put("/api/profile", requireUser, (req: Request, res: Response) => {
    const userId = req.user!.id;
    const server = read(userId) ?? blank(userId);
    const incoming = {
      progress: req.body?.progress ?? null,
      routine: req.body?.routine ?? null,
      library: req.body?.library ?? null,
      updatedAt: Number(req.body?.updatedAt) || Date.now(),
    };
    const { progress, routine, library, tookServer } = merge(server, incoming);

    const deviceId = String(req.body?.deviceId || "");
    const devices = server.devices.filter(d => d.id !== deviceId);
    if (deviceId) devices.push({ id: deviceId, name: String(req.body?.deviceName || "Dispositivo"), lastSeen: Date.now() });

    const next: Profile = { userId, updatedAt: Date.now(), progress, routine, library, devices };
    write(next);
    res.json({ updatedAt: next.updatedAt, progress, routine, library, tookServer, devices });
  });

  app.delete("/api/profile/devices/:deviceId", requireUser, (req: Request, res: Response) => {
    const userId = req.user!.id;
    const p = read(userId) ?? blank(userId);
    p.devices = p.devices.filter(d => d.id !== req.params.deviceId);
    write(p);
    res.json({ devices: p.devices });
  });
}
