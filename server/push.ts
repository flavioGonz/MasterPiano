/**
 * Recordatorio con la app cerrada (Web Push + VAPID).
 *
 * Hasta acá el recordatorio de la rutina sólo funcionaba con la app abierta:
 * un `setInterval` en la pestaña. Sirve para el celular en el atril y para
 * nada más — si cerrás la app, no hay aviso, que es justamente cuando hace
 * falta acordarse de practicar.
 *
 * Web Push lo resuelve del lado del servidor: el navegador entrega una
 * suscripción (una URL de su propio servicio de push), el servidor guarda a
 * qué hora quiere practicar cada uno y a esa hora manda el mensaje. El
 * navegador despierta al service worker y muestra la notificación aunque la
 * app no esté abierta.
 *
 * Las claves VAPID identifican a este servidor ante el servicio de push. Se
 * toman del entorno si están, y si no se generan una vez y quedan en disco:
 * regenerarlas invalidaría todas las suscripciones existentes.
 */
import fs from "fs";
import path from "path";
import express from "express";
import webpush from "web-push";
import type { Express, Request, Response } from "express";
import { requireUser } from "./auth";

const DATA_DIR = process.env.PUSH_DIR || path.join(process.cwd(), "data", "push");
const KEYS_FILE = path.join(DATA_DIR, "vapid.json");
const SUBS_FILE = path.join(DATA_DIR, "subscriptions.json");

interface StoredSub {
  userId: string;
  /** La suscripción tal cual la entrega el navegador. */
  sub: webpush.PushSubscription;
  /** Hora local de quien la creó. */
  hour: number;
  minute: number;
  /** Minutos que hay que sumarle a UTC para llegar a su hora local. */
  tzOffsetMinutes: number;
  createdAt: number;
  /** Última fecha (en su hora local) en la que ya se avisó. */
  lastSent?: string;
  /** Fallos seguidos: a los pocos se descarta la suscripción muerta. */
  failures?: number;
}

const ensureDir = () => fs.mkdirSync(DATA_DIR, { recursive: true });

function vapidKeys(): { publicKey: string; privateKey: string } {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  ensureDir();
  try {
    const saved = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
    if (saved.publicKey && saved.privateKey) return saved;
  } catch { /* todavía no existen */ }
  const fresh = webpush.generateVAPIDKeys();
  fs.writeFileSync(KEYS_FILE, JSON.stringify(fresh, null, 2), { mode: 0o600 });
  return fresh;
}

function readSubs(): StoredSub[] {
  try { return JSON.parse(fs.readFileSync(SUBS_FILE, "utf8")); } catch { return []; }
}
function writeSubs(list: StoredSub[]) {
  ensureDir();
  fs.writeFileSync(SUBS_FILE, JSON.stringify(list, null, 2));
}

/** Fecha local de esa suscripción, como "2026-09-07". */
function localDate(s: StoredSub, now: Date): string {
  const local = new Date(now.getTime() + s.tzOffsetMinutes * 60_000);
  return local.toISOString().slice(0, 10);
}
/** Minutos transcurridos del día en la hora local de esa suscripción. */
function localMinutes(s: StoredSub, now: Date): number {
  const local = new Date(now.getTime() + s.tzOffsetMinutes * 60_000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

/**
 * Se avisa desde la hora elegida hasta 90 minutos después: el temporizador
 * corre cada minuto, pero si el servidor estuvo caído o dormido justo a esa
 * hora, el aviso igual sale un rato más tarde en vez de perderse.
 */
const WINDOW_MINUTES = 90;

async function tick(now = new Date()) {
  const subs = readSubs();
  if (!subs.length) return;
  let changed = false;

  for (const s of subs) {
    const today = localDate(s, now);
    if (s.lastSent === today) continue;
    const due = s.hour * 60 + s.minute;
    const mins = localMinutes(s, now);
    if (mins < due || mins > due + WINDOW_MINUTES) continue;

    try {
      await webpush.sendNotification(s.sub, JSON.stringify({
        title: "Te esperan tus escalas de hoy",
        body: "Tres escalas, cinco minutos. Abrí PianoMaster y sacatelo de encima.",
        url: "/?rutina=1",
      }));
      s.lastSent = today;
      s.failures = 0;
    } catch (e: any) {
      // 404 y 410 = suscripción muerta (app desinstalada, permiso revocado)
      if (e?.statusCode === 404 || e?.statusCode === 410) s.failures = 99;
      else s.failures = (s.failures ?? 0) + 1;
    }
    changed = true;
  }

  if (changed) writeSubs(subs.filter(s => (s.failures ?? 0) < 5));
}

export function registerPushRoutes(app: Express) {
  ensureDir();
  const keys = vapidKeys();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:desarrollo@favaro.com.uy",
    keys.publicKey,
    keys.privateKey,
  );

  /** La clave pública, que el navegador necesita para suscribirse. */
  app.get("/api/push/key", (_req: Request, res: Response) => {
    res.json({ publicKey: keys.publicKey });
  });

  /** Alta o actualización de la suscripción de este dispositivo. */
  app.post("/api/push/subscribe", requireUser, express.json({ limit: "16kb" }), (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { subscription, hour, minute, tzOffsetMinutes } = req.body || {};
    if (!subscription?.endpoint || typeof subscription.endpoint !== "string") {
      return res.status(400).json({ error: "suscripción inválida" });
    }
    const h = Number.isInteger(hour) ? Math.max(0, Math.min(23, hour)) : 19;
    const m = Number.isInteger(minute) ? Math.max(0, Math.min(59, minute)) : 0;
    const tz = Number.isFinite(tzOffsetMinutes) ? Math.max(-840, Math.min(840, tzOffsetMinutes)) : 0;

    const subs = readSubs().filter(s => s.sub.endpoint !== subscription.endpoint);
    subs.push({ userId, sub: subscription, hour: h, minute: m, tzOffsetMinutes: tz, createdAt: Date.now() });
    writeSubs(subs);
    res.json({ ok: true, total: subs.filter(s => s.userId === userId).length });
  });

  /** Baja: se desactivó el recordatorio o se revocó el permiso. */
  app.delete("/api/push/subscribe", requireUser, express.json({ limit: "16kb" }), (req: Request, res: Response) => {
    const endpoint = String(req.body?.endpoint || "");
    if (!endpoint) return res.status(400).json({ error: "falta el endpoint" });
    writeSubs(readSubs().filter(s => s.sub.endpoint !== endpoint));
    res.json({ ok: true });
  });

  /** Mandar uno ahora, para comprobar que el camino completo funciona. */
  app.post("/api/push/test", requireUser, express.json({ limit: "16kb" }), async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mine = readSubs().filter(s => s.userId === userId);
    if (!mine.length) return res.status(404).json({ error: "no hay suscripciones de este usuario" });
    let ok = 0;
    const errores: string[] = [];
    for (const s of mine) {
      try {
        await webpush.sendNotification(s.sub, JSON.stringify({
          title: "Probando el recordatorio",
          body: "Si ves esto, el aviso te va a llegar aunque la app esté cerrada.",
          url: "/",
        }));
        ok++;
      } catch (e: any) {
        errores.push(String(e?.statusCode ?? '') + ' ' + String(e?.body || e?.message || e).slice(0, 120));
      }
    }
    res.json({ ok: true, enviados: ok, de: mine.length, ...(errores.length ? { errores } : {}) });
  });

  // Un tick por minuto alcanza: la ventana de aviso es de 90 minutos.
  setInterval(() => { void tick(); }, 60_000).unref?.();
  void tick();
}
