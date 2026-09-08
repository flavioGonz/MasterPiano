/**
 * Cuentas y sesiones.
 *
 * La app dejó de ser solo LAN: está publicada en piano.infratec.com.uy, así
 * que el progreso por dispositivo ya no alcanza y hace falta autenticación de
 * verdad. Decisiones y por qué:
 *
 *  - **scrypt** (el de `crypto`, sin dependencias) para las contraseñas, con
 *    sal por usuario y comparación en tiempo constante. Nada de SHA sin sal.
 *  - **Cookie httpOnly** con un token firmado (HMAC-SHA256), no un JWT: no hay
 *    terceros que lo tengan que leer, y así el secreto no sale del servidor.
 *    `SameSite=Lax` corta el CSRF de formularios cruzados sin romper el login.
 *  - **Registro cerrado** después de la primera cuenta. Estando en internet,
 *    dejarlo abierto sería regalar la app; se puede reabrir con `ALLOW_SIGNUP=1`
 *    o con un código en `SIGNUP_CODE`.
 *  - **QR de inicio de sesión**: la computadora emite un token de un solo uso
 *    que vive 2 minutos; el celular lo canjea y queda con sesión propia. Es el
 *    reemplazo del emparejamiento por dispositivo, ahora atado a la cuenta.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Express, Request, Response, NextFunction } from "express";

const DATA_DIR = process.env.USER_DIR || path.join(process.cwd(), "data", "users");
const SESSION_DAYS = 60;
const QR_TTL_MS = 2 * 60 * 1000;
const COOKIE = "pm_session";

export interface User {
  id: string;
  username: string;      // normalizado a minúsculas, es la clave de login
  displayName: string;
  password: string;      // scrypt$N$r$p$salt$hash
  createdAt: number;
  lastLogin: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: User }
  }
}

/* ------------------------------------------------------------------ */
/*  Almacenamiento                                                     */
/* ------------------------------------------------------------------ */
const userPath = (id: string) => path.join(DATA_DIR, `${id}.json`);
const ensureDir = () => fs.mkdirSync(DATA_DIR, { recursive: true });

function allUsers(): User[] {
  ensureDir();
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")) as User; } catch { return null; } })
    .filter((u): u is User => u !== null);
}
function findByName(username: string): User | null {
  const u = username.trim().toLowerCase();
  return allUsers().find(x => x.username === u) ?? null;
}
function getUser(id: string): User | null {
  try { return JSON.parse(fs.readFileSync(userPath(id), "utf8")) as User; } catch { return null; }
}
function saveUser(u: User) {
  ensureDir();
  const tmp = userPath(u.id) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(u), { mode: 0o600 });
  fs.renameSync(tmp, userPath(u.id));
}

/* ------------------------------------------------------------------ */
/*  Contraseñas                                                        */
/* ------------------------------------------------------------------ */
const N = 16384, r = 8, p = 1, KEYLEN = 64;

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, KEYLEN, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [alg, sN, sr, sp, salt, hash] = stored.split("$");
    if (alg !== "scrypt") return false;
    const expected = Buffer.from(hash, "base64");
    const got = crypto.scryptSync(plain, Buffer.from(salt, "base64"), expected.length,
      { N: Number(sN), r: Number(sr), p: Number(sp), maxmem: 64 * 1024 * 1024 });
    // timingSafeEqual exige mismo largo; el largo sale del hash guardado
    return crypto.timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Sesiones                                                           */
/* ------------------------------------------------------------------ */
let secret: Buffer | null = null;
function sessionSecret(): Buffer {
  if (secret) return secret;
  const file = path.join(path.dirname(DATA_DIR), ".session-secret");
  try {
    secret = Buffer.from(fs.readFileSync(file, "utf8"), "base64");
  } catch {
    secret = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret.toString("base64"), { mode: 0o600 });
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}
function makeToken(userId: string): string {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}
function readToken(token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i), mac = token.slice(i + 1);
  const expected = sign(payload);
  // Comparación en tiempo constante también acá: la firma es un secreto
  if (mac.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const [userId, exp] = payload.split(".");
  if (!userId || Number(exp) < Date.now()) return null;
  return userId;
}

function parseCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** Detrás del proxy la conexión al Express es http; el original lo dice el header. */
function isHttps(req: Request): boolean {
  return req.secure || String(req.headers["x-forwarded-proto"] || "").split(",")[0] === "https";
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const attrs = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/", "HttpOnly", "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 86400}`,
  ];
  if (isHttps(req)) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}
function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/** Deja `req.user` cuando hay sesión válida. No corta la petición. */
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = parseCookies(req)[COOKIE];
  if (token) {
    const id = readToken(token);
    if (id) req.user = getUser(id) ?? undefined;
  }
  next();
}

/** Exige sesión. Usarlo en todo lo que toque datos de una persona. */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "necesitás iniciar sesión" });
  next();
}

const publicUser = (u: User) => ({ id: u.id, username: u.username, displayName: u.displayName, createdAt: u.createdAt });

/* ------------------------------------------------------------------ */
/*  Rutas                                                              */
/* ------------------------------------------------------------------ */
const qrTokens = new Map<string, { userId: string; expires: number }>();
const sweep = () => { const now = Date.now(); for (const [k, v] of qrTokens) if (v.expires < now) qrTokens.delete(k); };

/** ¿Se puede crear cuenta? Abierto hasta la primera; después hay que habilitarlo. */
function signupOpen(): boolean {
  if (allUsers().length === 0) return true;
  return process.env.ALLOW_SIGNUP === "1" || Boolean(process.env.SIGNUP_CODE);
}

export function registerAuthRoutes(app: Express) {
  ensureDir();
  app.use(attachUser);

  app.get("/api/auth/me", (req: Request, res: Response) => {
    res.json({
      user: req.user ? publicUser(req.user) : null,
      signupOpen: signupOpen(),
      needsCode: Boolean(process.env.SIGNUP_CODE) && allUsers().length > 0,
      firstRun: allUsers().length === 0,
    });
  });

  app.post("/api/auth/register", (req: Request, res: Response) => {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim() || username;

    if (!signupOpen()) return res.status(403).json({ error: "el registro está cerrado" });
    if (process.env.SIGNUP_CODE && allUsers().length > 0 && String(req.body?.code || "") !== process.env.SIGNUP_CODE) {
      return res.status(403).json({ error: "código de invitación inválido" });
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({ error: "el usuario va entre 3 y 32 caracteres: letras, números, punto, guion o guion bajo" });
    }
    if (password.length < 8) return res.status(400).json({ error: "la contraseña necesita al menos 8 caracteres" });
    if (findByName(username)) return res.status(409).json({ error: "ese usuario ya existe" });

    const user: User = {
      id: crypto.randomBytes(12).toString("base64url"),
      username, displayName,
      password: hashPassword(password),
      createdAt: Date.now(), lastLogin: Date.now(),
    };
    saveUser(user);
    setSessionCookie(req, res, makeToken(user.id));
    res.json({ user: publicUser(user) });
  });

  app.post("/api/auth/login", (req: Request, res: Response) => {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = findByName(username);
    // Mismo mensaje para usuario inexistente y contraseña incorrecta: si no,
    // el formulario sirve para averiguar qué usuarios existen.
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: "usuario o contraseña incorrectos" });
    }
    user.lastLogin = Date.now();
    saveUser(user);
    setSessionCookie(req, res, makeToken(user.id));
    res.json({ user: publicUser(user) });
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post("/api/auth/password", requireUser, (req: Request, res: Response) => {
    const current = String(req.body?.current || ""), next = String(req.body?.next || "");
    const user = req.user!;
    if (!verifyPassword(current, user.password)) return res.status(401).json({ error: "la contraseña actual no coincide" });
    if (next.length < 8) return res.status(400).json({ error: "la contraseña nueva necesita al menos 8 caracteres" });
    user.password = hashPassword(next);
    saveUser(user);
    setSessionCookie(req, res, makeToken(user.id)); // renueva la sesión de este dispositivo
    res.json({ ok: true });
  });

  /** Token de un solo uso para entrar en el celular escaneando el QR. */
  app.post("/api/auth/qr", requireUser, (req: Request, res: Response) => {
    sweep();
    const token = crypto.randomBytes(16).toString("base64url");
    qrTokens.set(token, { userId: req.user!.id, expires: Date.now() + QR_TTL_MS });
    res.json({ token, expiresIn: Math.round(QR_TTL_MS / 1000) });
  });

  app.post("/api/auth/qr/claim", (req: Request, res: Response) => {
    sweep();
    const token = String(req.body?.token || "");
    const entry = qrTokens.get(token);
    if (!entry) return res.status(404).json({ error: "el código venció o ya se usó" });
    qrTokens.delete(token); // un solo uso
    const user = getUser(entry.userId);
    if (!user) return res.status(404).json({ error: "usuario no encontrado" });
    setSessionCookie(req, res, makeToken(user.id));
    res.json({ user: publicUser(user) });
  });
}
