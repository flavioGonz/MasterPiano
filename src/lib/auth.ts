/**
 * Sesión en el cliente.
 *
 * La cookie la maneja el navegador (httpOnly: el JS no la ve ni la necesita).
 * Acá solo se consulta quién está y se guarda una copia del usuario en
 * localStorage — no como credencial, sino para que **la app siga abriendo sin
 * red**. Si `/api/auth/me` no responde por falta de conexión, se usa esa copia
 * y se practica con el progreso local; cuando vuelve la red, se revalida.
 */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
}

export interface AuthState {
  user: AuthUser | null;
  signupOpen: boolean;
  needsCode: boolean;
  firstRun: boolean;
  /** No se pudo hablar con el servidor: se está usando la copia local. */
  offline: boolean;
}

const CACHE_KEY = 'pianomaster_user';

const readCache = (): AuthUser | null => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
};
const writeCache = (u: AuthUser | null) => {
  try { u ? localStorage.setItem(CACHE_KEY, JSON.stringify(u)) : localStorage.removeItem(CACHE_KEY); } catch { /* modo privado */ }
};

export const cachedUser = readCache;

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function me(): Promise<AuthState> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    writeCache(d.user);
    return { user: d.user, signupOpen: !!d.signupOpen, needsCode: !!d.needsCode, firstRun: !!d.firstRun, offline: false };
  } catch {
    // Sin red: se sigue con quien había, para que la PWA abra igual
    return { user: readCache(), signupOpen: false, needsCode: false, firstRun: false, offline: true };
  }
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const d = await post('/api/auth/login', { username, password });
  writeCache(d.user);
  return d.user;
}

export async function register(username: string, password: string, displayName: string, code?: string): Promise<AuthUser> {
  const d = await post('/api/auth/register', { username, password, displayName, code });
  writeCache(d.user);
  return d.user;
}

export async function logout(): Promise<void> {
  try { await post('/api/auth/logout', {}); } catch { /* igual se cierra local */ }
  writeCache(null);
  // El progreso local queda: es de este dispositivo y se vuelve a sincronizar al entrar
}

export async function changePassword(current: string, next: string): Promise<void> {
  await post('/api/auth/password', { current, next });
}

/** Token de un solo uso (2 minutos) para entrar en el celular con el QR. */
export async function issueQrToken(): Promise<{ token: string; expiresIn: number }> {
  return post('/api/auth/qr', {});
}

export async function claimQrToken(token: string): Promise<AuthUser> {
  const d = await post('/api/auth/qr/claim', { token });
  writeCache(d.user);
  return d.user;
}
