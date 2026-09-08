import {
  GraduationCap, BookOpen, Flame, Disc, Music, Compass, Target,
  type LucideIcon,
} from 'lucide-react';

export type TabId =
  | 'curriculum' | 'classicalMethods' | 'waterfall' | 'wavStudio'
  | 'chords' | 'circle' | 'gym';

export interface NavItem {
  id: TabId;
  label: string;
  short: string;       // etiqueta corta para bottom-nav móvil
  icon: LucideIcon;
  hint?: string;       // tag secundario (MIDI, AUDIO…)
  group: 'aprender' | 'practicar' | 'explorar';
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'curriculum',      label: 'Currículo 0 a 100',     short: 'Currículo', icon: GraduationCap, group: 'aprender' },
  { id: 'classicalMethods',label: 'Métodos Clásicos',      short: 'Métodos',   icon: BookOpen, hint: '3 libros', group: 'aprender' },
  { id: 'waterfall',       label: 'Catarata de Tonos',     short: 'Catarata',  icon: Flame,    hint: 'MIDI',  group: 'practicar' },
  { id: 'wavStudio',       label: 'Bases .WAV Jam',        short: 'Jam',       icon: Disc,     hint: 'Audio', group: 'practicar' },
  { id: 'gym',             label: 'Gimnasio Práctico',     short: 'Gimnasio',  icon: Target,   group: 'practicar' },
  { id: 'chords',          label: 'Biblioteca de Acordes', short: 'Acordes',   icon: Music,    group: 'explorar' },
  { id: 'circle',          label: 'Círculo de Quintas',    short: 'Círculo',   icon: Compass,  group: 'explorar' },
];

export const NAV_GROUPS: { id: NavItem['group']; label: string }[] = [
  { id: 'aprender',  label: 'Aprender' },
  { id: 'practicar', label: 'Practicar' },
  { id: 'explorar',  label: 'Explorar' },
];

/** Los 4 accesos que van en la barra inferior móvil; el resto va en "Más". */
export const MOBILE_PRIMARY: TabId[] = ['curriculum', 'waterfall', 'gym', 'chords'];

export function navItem(id: TabId): NavItem {
  return NAV_ITEMS.find(n => n.id === id) ?? NAV_ITEMS[0];
}
