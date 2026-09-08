/**
 * La caja de Leitner de la lección 7, de verdad.
 *
 * Tres cajones y una regla simple: cada día salen tres escalas, una de cada
 * cajón, y se rotan en rondas cortas en vez de repetir una veinte veces. Si
 * una escala sale limpia dos días seguidos sube de cajón; un solo tropiezo y
 * vuelve al cajón 1.
 *
 * Los intervalos (1, 2 y 7 días) no son decorativos: son el espaciado que
 * hace que revises una escala justo antes de olvidarla, que es cuando el
 * repaso rinde. El estado viaja en el perfil sincronizado, así que la ronda
 * del día es la misma en la computadora y en el celular.
 */
import { ALL_SCALE_ROOTS, SCALES_DATABASE, preferredRootName } from './musicGymTheory';

export type Box = 1 | 2 | 3;

export interface RoutineItem {
  /** clave estable: pitch class + id de escala, p. ej. "6:major" */
  key: string;
  pc: number;
  scaleId: string;
  box: Box;
  /** días consecutivos que salió limpia (se reinicia al fallar) */
  streak: number;
  /** epoch ms del último repaso */
  lastSeen: number;
  /** epoch ms en que vuelve a tocar */
  dueAt: number;
}

export interface Routine {
  items: RoutineItem[];
  /** día (YYYY-MM-DD local) de la última ronda cerrada */
  lastRound: string | null;
  /** días seguidos con la ronda hecha */
  streak: number;
}

const KEY = 'pianomaster_routine_v1';
const DAY = 24 * 60 * 60 * 1000;
/** Cada cajón espera más que el anterior: 1 día, 2 días, 1 semana. */
const INTERVAL: Record<Box, number> = { 1: 1 * DAY, 2: 2 * DAY, 3: 7 * DAY };

export const itemKey = (pc: number, scaleId: string) => `${pc}:${scaleId}`;

export function today(d = new Date()): string {
  // Fecha local, no UTC: en Uruguay (UTC-3) el día cambia a medianoche de acá
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function scaleLabel(item: { pc: number; scaleId: string }): string {
  const scale = SCALES_DATABASE.find(s => s.id === item.scaleId);
  return `${preferredRootName(item.pc, item.scaleId)} ${scale?.name ?? ''}`.trim();
}

/**
 * Rutina inicial: las doce mayores, ordenadas por dificultad de digitación —
 * primero las que caen en la mano, no el orden alfabético.
 */
export function defaultRoutine(): Routine {
  const order: Record<string, number> = { 'Fácil': 0, 'Media': 1, 'Avanzada': 2 };
  const items = [...ALL_SCALE_ROOTS]
    .sort((a, b) => order[a.difficulty] - order[b.difficulty] || a.pc - b.pc)
    .map<RoutineItem>(r => ({
      key: itemKey(r.pc, 'major'),
      pc: r.pc,
      scaleId: 'major',
      box: 1,
      streak: 0,
      lastSeen: 0,
      dueAt: 0,
    }));
  return { items, lastRound: null, streak: 0 };
}

export function loadRoutine(): Routine {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const r = JSON.parse(raw) as Routine;
      if (Array.isArray(r.items) && r.items.length) return r;
    }
  } catch { /* corrupto: se arma de nuevo */ }
  return defaultRoutine();
}

export function saveRoutine(r: Routine) {
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* modo privado */ }
}

/**
 * La ronda del día.
 *
 * Los repasos van antes que las escalas nuevas: si no, las nueve que todavía
 * no tocaste empujan hacia atrás a las tres que empezaste y ninguna llega a
 * consolidarse. Pero siempre entra al menos una nueva por ronda mientras
 * queden, para que la rutina avance y no se estanque en las mismas tres.
 */
export function todayRound(r: Routine, now = Date.now(), size = 3): RoutineItem[] {
  const due = r.items.filter(i => i.dueAt <= now);
  const repasos = due.filter(i => i.lastSeen > 0).sort((a, b) => a.dueAt - b.dueAt || a.box - b.box);
  const nuevas = due.filter(i => i.lastSeen === 0);

  const picked: RoutineItem[] = [];
  // Dejar un lugar para una escala nueva mientras queden sin estrenar
  const cupoRepasos = nuevas.length ? size - 1 : size;
  for (const i of repasos) { if (picked.length >= cupoRepasos) break; picked.push(i); }
  for (const i of nuevas) { if (picked.length >= size) break; picked.push(i); }
  for (const i of repasos) { if (picked.length >= size) break; if (!picked.includes(i)) picked.push(i); }

  // Nada vencido: adelantar lo más próximo, para que nunca haya pantalla vacía
  if (!picked.length) {
    return [...r.items].sort((a, b) => a.dueAt - b.dueAt).slice(0, size);
  }
  return picked.slice(0, size);
}

/**
 * Registrar el resultado de una escala.
 * Limpia dos días seguidos → sube de cajón. Un error → al cajón 1.
 */
export function record(r: Routine, key: string, clean: boolean, now = Date.now()): Routine {
  const items = r.items.map(i => {
    if (i.key !== key) return i;
    if (!clean) {
      return { ...i, box: 1 as Box, streak: 0, lastSeen: now, dueAt: now + INTERVAL[1] };
    }
    const streak = i.streak + 1;
    const box: Box = streak >= 2 && i.box < 3 ? ((i.box + 1) as Box) : i.box;
    return { ...i, box, streak: box !== i.box ? 0 : streak, lastSeen: now, dueAt: now + INTERVAL[box] };
  });
  return { ...r, items };
}

/** Cerrar la ronda del día y llevar la cuenta de días seguidos. */
export function closeRound(r: Routine, now = Date.now()): Routine {
  const day = today(new Date(now));
  if (r.lastRound === day) return r;
  const yesterday = today(new Date(now - DAY));
  return { ...r, lastRound: day, streak: r.lastRound === yesterday ? r.streak + 1 : 1 };
}

export function roundDoneToday(r: Routine, now = Date.now()): boolean {
  return r.lastRound === today(new Date(now));
}

/** Agregar una escala a la rutina (por ejemplo desde el gimnasio). */
export function addToRoutine(r: Routine, pc: number, scaleId: string): Routine {
  const key = itemKey(pc, scaleId);
  if (r.items.some(i => i.key === key)) return r;
  return {
    ...r,
    items: [...r.items, { key, pc, scaleId, box: 1, streak: 0, lastSeen: 0, dueAt: 0 }],
  };
}

export function boxCounts(r: Routine): Record<Box, number> {
  return r.items.reduce((acc, i) => { acc[i.box]++; return acc; }, { 1: 0, 2: 0, 3: 0 } as Record<Box, number>);
}
