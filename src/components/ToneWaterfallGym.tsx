import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, Square, Upload, Repeat, Settings2, HelpCircle, Volume2, VolumeX,
  Maximize2, Minimize2, AlignJustify, LayoutPanelTop, Triangle, RotateCcw,
  Hand, EyeOff, ChevronDown, X, Cable, Flame, Mic, MicOff, Search, Layers, FileMusic, Loader2, Undo2, Redo2, Trash2, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, MoveLeft, MoveRight, Scissors, StretchHorizontal, ArrowRightLeft, Download, Wand2, Music2,
} from 'lucide-react';
import * as Tone from 'tone';
import {
  WaterfallSong, WaterfallNote, WaterfallTrack, PRELOADED_WATERFALL_SONGS,
  parseMidiFile, midiToNoteName, songTracks, noteTrackId,
} from '../lib/midiWaterfall';
import { soundEngine, SoundPreset, SOUND_PRESETS, getSavedSoundPreset, saveSoundPreset } from '../lib/soundPresets';
import { cn } from '../lib/utils';
import { IconBtn, Popover, Row, Toggle } from './ui/StageControls';
import { midi } from '../lib/midi';
import { useMidi } from '../lib/useMidi';
import { PieceLibraryModal } from './PieceLibraryModal';
import { MidiImportDialog } from './MidiImportDialog';
import { resolvePiece, loadLibraryState, pushRecent } from '../lib/pieceLibrary';
import { lockLandscape, unlockOrientation, isTouchDevice } from '../lib/standMode';
import { readMidiFiles, saveImports, filesFromDrop, dragHasFiles, type ImportResult, type PendingImport } from '../lib/midiImport';
import { listSongs, getSong, deleteSong, saveSong } from '../lib/songStore';
import { downloadSongAsMidi } from '../lib/midiExport';
import { detectKey, keyLabel, spellingForKey } from '../lib/keyDetect';
import { fullSpellingMap, SCALES_DATABASE, prettyAccidentals } from '../lib/musicGymTheory';
import { maestroVoice } from '../lib/speech';
import { pianoPitchDetector, noteNameToMidiSafe } from '../lib/pitchDetector';

/* ------------------------------------------------------------------ */
/*  Tipos y constantes                                                 */
/* ------------------------------------------------------------------ */

/**
 * Modo demostración: la misma catarata, pero mostrando una pieza suelta que
 * viene de afuera (un ejercicio de método, una escala, la lección abierta).
 * No toca la biblioteca ni el localStorage: se abre, se mira y se cierra.
 */
export interface WaterfallDemo {
  song: WaterfallSong;
  /** Arranca sola al abrir. */
  autoPlay?: boolean;
  /** Qué mano se muestra al entrar. */
  hand?: 'both' | 'right' | 'left';
}

interface ToneWaterfallGymProps {
  onScoreGain?: (points: number) => void;
  /** Piezas externas (p. ej. transcriptas desde Bases .WAV) que se suman a la biblioteca. */
  extraSongs?: WaterfallSong[];
  /** Id de la pieza que debe quedar seleccionada al montar / al cambiar. */
  requestedSongId?: string | null;
  /** Ver <WaterfallDemo>. Cuando viene, la catarata se acota a esa pieza. */
  demo?: WaterfallDemo;
  /** Alto del contenedor. Por defecto ocupa la ventana menos el encabezado. */
  fillParent?: boolean;
}

type ViewMode = 'vertical' | 'roll';
type PracticeMode = 'wait' | 'flow';
type KeyboardRange = 'auto' | '49' | '61' | '88';

interface TrackState extends WaterfallTrack {
  visible: boolean;   // se dibuja
  practice: boolean;  // el alumno la toca (modo espera la espera; no suena sola)
  muted: boolean;     // no suena automáticamente
}

/** Variantes de color por pista, derivadas del hex base (cacheadas). */
interface ColorSet { base: string; light: string; dark: string; glow: string; }
const colorCache = new Map<string, ColorSet>();
function mix(hex: string, target: [number, number, number], amount: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const m = (a: number, t: number) => Math.round(a + (t - a) * amount);
  return `#${[m(r, target[0]), m(g, target[1]), m(b, target[2])].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
function colorSet(hex: string): ColorSet {
  let c = colorCache.get(hex);
  if (!c) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    c = { base: hex, light: mix(hex, [255, 255, 255], 0.42), dark: mix(hex, [0, 0, 0], 0.32), glow: `rgba(${r}, ${g}, ${b}, 0.55)` };
    colorCache.set(hex, c);
  }
  return c;
}

/** Pistas iniciales para una pieza: manos → ambas se practican; instrumentos → solo el piano. */
function initialTracks(song: WaterfallSong): TrackState[] {
  return songTracks(song).map(t => ({ ...t, visible: true, practice: !song.tracks || t.id === 'piano', muted: false }));
}

const CUSTOM_SONGS_KEY = 'pianomaster_custom_songs_v1';
const ACTIVE_SONG_KEY = 'pianomaster_active_song_v1';
function loadCustomSongs(): WaterfallSong[] {
  try { const raw = localStorage.getItem(CUSTOM_SONGS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveCustomSongs(songs: WaterfallSong[]) {
  try {
    const custom = songs.filter(s => s.isCustom);
    // Límite defensivo (~4 MB): se conservan las más nuevas
    let json = JSON.stringify(custom);
    let list = custom;
    while (json.length > 4_000_000 && list.length > 1) { list = list.slice(0, -1); json = JSON.stringify(list); }
    localStorage.setItem(CUSTOM_SONGS_KEY, json);
  } catch { /* sin espacio */ }
}

const HIT_WINDOW = 0.45;           // s de tolerancia para acertar
const LOOKAHEAD_SECONDS = 4.0;     // cuánto futuro se ve en pantalla
const PX_PER_SECOND = 170;

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${sec.toFixed(1).padStart(4, '0')}`;
};

/* ------------------------------------------------------------------ */
/*  Componente                                                         */
/* ------------------------------------------------------------------ */

export const ToneWaterfallGym: React.FC<ToneWaterfallGymProps> = ({ onScoreGain, extraSongs, requestedSongId, demo, fillParent }) => {
  const isDemo = !!demo;
  // ---- Biblioteca ----
  const [songList, setSongList] = useState<WaterfallSong[]>(() => {
    if (demo) return [demo.song];
    const custom = loadCustomSongs();
    const ids = new Set(custom.map(s => s.id));
    return [...custom, ...PRELOADED_WATERFALL_SONGS.filter(s => !ids.has(s.id))];
  });
  // Se recuerda la última pieza abierta: al volver a la Catarata seguís donde estabas.
  const [activeSongId, setActiveSongIdRaw] = useState<string>(() => {
    if (demo) return demo.song.id;
    try {
      const saved = localStorage.getItem(ACTIVE_SONG_KEY);
      if (saved && [...loadCustomSongs(), ...PRELOADED_WATERFALL_SONGS].some(s => s.id === saved)) return saved;
    } catch { /* sin storage */ }
    return PRELOADED_WATERFALL_SONGS[0].id;
  });
  const setActiveSongId = useCallback((id: string) => {
    setActiveSongIdRaw(id);
    if (isDemo) return;   // una demo no cambia la pieza que estabas estudiando
    try { localStorage.setItem(ACTIVE_SONG_KEY, id); } catch { /* sin storage */ }
  }, [isDemo]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSong = useMemo(
    () => songList.find(s => s.id === activeSongId) || songList[0],
    [songList, activeSongId]
  );

  // Piezas que llegan desde otras secciones (Bases .WAV → "Importar a Catarata")
  useEffect(() => {
    if (!extraSongs || extraSongs.length === 0) return;
    setSongList(prev => {
      const known = new Set(prev.map(s => s.id));
      const fresh = extraSongs.filter(s => !known.has(s.id));
      // Una re-importación con el mismo id reemplaza la versión anterior (p. ej. re-transcripción)
      const replaced = prev.map(s => extraSongs.find(e => e.id === s.id && e !== s) ?? s);
      const next = fresh.length || replaced.some((s, i) => s !== prev[i]) ? [...fresh, ...replaced] : prev;
      if (next !== prev) saveCustomSongs(next);
      return next;
    });
  }, [extraSongs]);
  useEffect(() => {
    if (requestedSongId && songList.some(s => s.id === requestedSongId) && requestedSongId !== activeSongId) {
      setActiveSongId(requestedSongId);
      timeRef.current = 0; setCurrentTime(0); setIsPlaying(false); playingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedSongId, songList]);

  // ---- Pistas ----
  const [tracks, setTracks] = useState<TrackState[]>(() => initialTracks(activeSong));
  const [selectedTrackId, setSelectedTrackId] = useState<string>(() => songTracks(activeSong)[0].id);
  // Al cambiar de pieza se recalculan las pistas (manos o instrumentos)
  const tracksSongRef = useRef(activeSong.id + '|' + (activeSong.tracks?.map(t => t.id).join(',') ?? ''));
  useEffect(() => {
    const key = activeSong.id + '|' + (activeSong.tracks?.map(t => t.id).join(',') ?? '');
    if (tracksSongRef.current === key) return;
    tracksSongRef.current = key;
    const next = initialTracks(activeSong);
    setTracks(next); setSelectedTrackId(next[0].id);
    selectOne(null); setHistory({ past: [], future: [] });
  }, [activeSong]);
  const trackOf = (id: string): TrackState => tracks.find(t => t.id === id) ?? tracks[0];
  const updateTrack = (id: string, patch: Partial<TrackState>) =>
    setTracks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  const soloTrack = (id: string) => {
    const isSoloed = trackOf(id).visible && tracks.every(t => t.id === id || !t.visible);
    if (isSoloed) setTracks(prev => prev.map(t => ({ ...t, visible: true })));
    else setTracks(prev => prev.map(t => (t.id === id ? { ...t, visible: true, practice: true } : { ...t, visible: false })));
  };

  /* ---------------- Edición de notas (menú contextual, undo/redo) ---------------- */
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  /* Selección múltiple: el set manda, y `selectedNoteId` es la nota "primaria"
     (la última tocada) que usan el chip de acciones y el menú contextual. */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef<Set<string>>(selectedIds);
  selectedIdsRef.current = selectedIds;
  const selectOne = useCallback((id: string | null) => {
    setSelectedNoteId(id);
    setSelectedIds(id ? new Set([id]) : new Set());
  }, []);
  const toggleInSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
    setSelectedNoteId(id);
  }, []);
  const [history, setHistory] = useState<{ past: WaterfallNote[][]; future: WaterfallNote[][] }>({ past: [], future: [] });
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const selectedNoteRef = useRef<string | null>(null);
  selectedNoteRef.current = selectedNoteId;

  const replaceNotes = useCallback((notes: WaterfallNote[], recordHistory = true) => {
    setSongList(prev => {
      const cur = prev.find(s => s.id === activeSongId); if (!cur) return prev;
      if (recordHistory) setHistory(h => ({ past: [...h.past.slice(-49), cur.notes], future: [] }));
      const next = prev.map(s => (s.id === activeSongId ? { ...s, notes, notesCount: notes.length, isCustom: true } : s));
      saveCustomSongs(next);
      queueServerSave(next.find(s => s.id === activeSongId));
      return next;
    });
  }, [activeSongId]);

  /* Lo editado también sube a la cuenta, no sólo al localStorage de este
     navegador: si no, la pieza que arreglaste en la compu aparecía sin
     arreglar en el celular. Con retardo, porque un arrastre son decenas de
     cambios por segundo. */
  const saveTimer = useRef<number | null>(null);
  const queueServerSave = useCallback((song?: WaterfallSong) => {
    if (!song || !song.isCustom) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { void saveSong(song); }, 1200);
  }, []);
  const persistActiveSong = useCallback(() => {
    setSongList(prev => { saveCustomSongs(prev); queueServerSave(prev.find(s => s.id === activeSongId)); return prev; });
  }, [activeSongId, queueServerSave]);

  const editNote = useCallback((id: string, fn: (n: WaterfallNote) => WaterfallNote | null) => {
    const cur = songList.find(s => s.id === activeSongId); if (!cur) return;
    const notes = cur.notes.flatMap(n => (n.id === id ? (fn(n) ? [fn(n)!] : []) : [n]));
    replaceNotes(notes);
  }, [songList, activeSongId, replaceNotes]);

  const undo = useCallback(() => {
    setHistory(h => {
      if (!h.past.length) return h;
      const cur = songList.find(s => s.id === activeSongId); if (!cur) return h;
      const prevNotes = h.past[h.past.length - 1];
      setSongList(list => { const next = list.map(s => (s.id === activeSongId ? { ...s, notes: prevNotes, notesCount: prevNotes.length } : s)); saveCustomSongs(next); return next; });
      return { past: h.past.slice(0, -1), future: [cur.notes, ...h.future].slice(0, 50) };
    });
  }, [songList, activeSongId]);
  const redo = useCallback(() => {
    setHistory(h => {
      if (!h.future.length) return h;
      const cur = songList.find(s => s.id === activeSongId); if (!cur) return h;
      const nextNotes = h.future[0];
      setSongList(list => { const next = list.map(s => (s.id === activeSongId ? { ...s, notes: nextNotes, notesCount: nextNotes.length } : s)); saveCustomSongs(next); return next; });
      return { past: [...h.past, cur.notes].slice(-50), future: h.future.slice(1) };
    });
  }, [songList, activeSongId]);

  const shiftNote = (n: WaterfallNote, semis: number): WaterfallNote => {
    const midi = Math.max(21, Math.min(108, n.midi + semis));
    return { ...n, midi, name: midiToNoteName(midi) };
  };
  const NOTE_ACTIONS: { id: string; label: string; icon: React.ReactNode; apply: (n: WaterfallNote) => WaterfallNote | null }[] = [
    { id: 'delete', label: 'Eliminar nota', icon: <Trash2 size={13} />, apply: () => null },
    { id: 'up', label: 'Subir un semitono', icon: <ArrowUp size={13} />, apply: n => shiftNote(n, 1) },
    { id: 'down', label: 'Bajar un semitono', icon: <ArrowDown size={13} />, apply: n => shiftNote(n, -1) },
    { id: 'oct-up', label: 'Subir una octava', icon: <ChevronsUp size={13} />, apply: n => shiftNote(n, 12) },
    { id: 'oct-down', label: 'Bajar una octava', icon: <ChevronsDown size={13} />, apply: n => shiftNote(n, -12) },
    { id: 'earlier', label: 'Adelantar 50 ms', icon: <MoveLeft size={13} />, apply: n => ({ ...n, time: +Math.max(0, n.time - 0.05).toFixed(3) }) },
    { id: 'later', label: 'Atrasar 50 ms', icon: <MoveRight size={13} />, apply: n => ({ ...n, time: +(n.time + 0.05).toFixed(3) }) },
    { id: 'shorter', label: 'Más corta (−25 %)', icon: <Scissors size={13} />, apply: n => ({ ...n, duration: +Math.max(0.05, n.duration * 0.75).toFixed(3) }) },
    { id: 'longer', label: 'Más larga (+25 %)', icon: <StretchHorizontal size={13} />, apply: n => ({ ...n, duration: +(n.duration * 1.25).toFixed(3) }) },
  ];
  const moveNoteToTrack = (n: WaterfallNote, trackId: string): WaterfallNote =>
    activeSong.tracks ? { ...n, track: trackId } : { ...n, hand: trackId as 'right' | 'left' };

  // ---- Reproducción ----
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);       // para la UI (throttled)
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  /* Una demostración se mira: va de corrido, no espera a que toques. */
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(demo ? 'flow' : 'wait');
  const [viewMode, setViewMode] = useState<ViewMode>('vertical');
  const [keyboardRange, setKeyboardRange] = useState<KeyboardRange>('auto');
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [minimalFx, setMinimalFx] = useState(false);
  const [showNoteLabels, setShowNoteLabels] = useState(true);
  /* Un MIDI no dice en qué tonalidad está, así que la catarata escribía todo
     con nombres de tecla y en Fa# mayor mostraba "F4" donde va Mi#. La
     tonalidad se deduce de la música (Krumhansl-Schmuckler) y se puede forzar
     a sostenidos o bemoles desde Ajustes. */
  const [spellingMode, setSpellingMode] = useState<'auto' | 'sharp' | 'flat'>('auto');
  const [soundPreset, setSoundPreset] = useState<SoundPreset>(() => getSavedSoundPreset());
  const [waitingForKeys, setWaitingForKeys] = useState(false);

  // ---- Entrada ----
  const [micOn, setMicOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [pressedNotes, setPressedNotes] = useState<Set<number>>(new Set());
  const [hitNotes, setHitNotes] = useState<Set<number>>(new Set()); // notas sobre la línea (para iluminar teclas)

  // ---- Puntaje ----
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hitFeedback, setHitFeedback] = useState<{ text: string; id: number } | null>(null);

  // ---- UI ----
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tracksOpen, setTracksOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Geometría del último cuadro dibujado (para hit-test del menú contextual). */
  const layoutRef = useRef<{ viewMode: ViewMode; W: number; H: number; time: number; pxPerSec: number; laneW: number; hitY: number; rowH: number; hitX: number } | null>(null);

  // ---- Refs para el loop de animación (evitan re-crear el RAF por cada frame) ----
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const lastTsRef = useRef(0);
  const lastUiTimeRef = useRef(0);
  const lastBeatRef = useRef(-1);
  const pressedRef = useRef<Set<number>>(new Set());
  const hitKeyRef = useRef('');
  /* Golpes en la línea: cada nota que la cruza deja uno, se dibuja mientras se
     apaga y se descarta. Vive en un ref porque el lienzo se dibuja en un RAF
     que no ve el estado de React. */
  const impactsRef = useRef<{ midi: number; t0: number; rgb: [number, number, number]; velocity: number }[]>([]);
  const stateRef = useRef({
    activeSong, tracks, playbackSpeed, practiceMode, viewMode, loopEnabled,
    metronomeOn, isMuted, minimalFx, showNoteLabels,
  });
  stateRef.current = {
    activeSong, tracks, playbackSpeed, practiceMode, viewMode, loopEnabled,
    metronomeOn, isMuted, minimalFx, showNoteLabels,
  };
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const clickRef = useRef<Tone.Synth | null>(null);

  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { pressedRef.current = pressedNotes; }, [pressedNotes]);

  const seekTo = useCallback((t: number) => {
    timeRef.current = Math.max(0, t);
    lastBeatRef.current = -1;
    setCurrentTime(timeRef.current);
  }, []);

  /* ---------------- Audio ---------------- */
  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
      oscillator: { type: 'triangle' },
    }).toDestination();
    synthRef.current.volume.value = -6;
    clickRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
    }).toDestination();
    clickRef.current.volume.value = -10;
    return () => {
      synthRef.current?.dispose(); synthRef.current = null;
      clickRef.current?.dispose(); clickRef.current = null;
    };
  }, []);

  /* ---------------- Rango del teclado ---------------- */
  const { minMidi, maxMidi } = useMemo(() => {
    if (keyboardRange === '88') return { minMidi: 21, maxMidi: 108 };
    if (keyboardRange === '61') return { minMidi: 36, maxMidi: 96 };
    if (keyboardRange === '49') return { minMidi: 48, maxMidi: 84 };
    if (!activeSong || activeSong.notes.length === 0) return { minMidi: 48, maxMidi: 84 };
    let min = 127, max = 0;
    activeSong.notes.forEach(n => { if (n.midi < min) min = n.midi; if (n.midi > max) max = n.midi; });
    min = Math.max(21, min - 3); max = Math.min(108, max + 3);
    const snappedMin = Math.max(21, min - (min % 12));
    const snappedMax = Math.min(108, max + (12 - (max % 12)) - 1);
    // Mínimo 2 octavas para que no quede un teclado minúsculo
    return { minMidi: snappedMin, maxMidi: Math.max(snappedMax, snappedMin + 24) };
  }, [keyboardRange, activeSong]);

  const pianoKeys = useMemo(() => {
    const keys: { midi: number; name: string; isBlack: boolean; whiteIndex: number }[] = [];
    let whiteIndex = 0;
    for (let m = minMidi; m <= maxMidi; m++) {
      const name = midiToNoteName(m);
      const isBlack = name.includes('#');
      keys.push({ midi: m, name, isBlack, whiteIndex });
      if (!isBlack) whiteIndex++;
    }
    return keys;
  }, [minMidi, maxMidi]);
  const whiteKeys = useMemo(() => pianoKeys.filter(k => !k.isBlack), [pianoKeys]);
  const keyByMidi = useMemo(() => new Map(pianoKeys.map(k => [k.midi, k])), [pianoKeys]);

  /* ---------------- Ortografía de la pieza ---------------- */
  const detectedKey = useMemo(() => detectKey(activeSong.notes), [activeSong]);
  const FLAT_MAP = useMemo(
    () => fullSpellingMap('F', SCALES_DATABASE.find(s => s.id === 'major')!),
    []
  );
  const spellMap = useMemo(
    () => (spellingMode === 'sharp' ? {} : spellingMode === 'flat' ? FLAT_MAP : spellingForKey(detectedKey)),
    [spellingMode, detectedKey, FLAT_MAP]
  );
  /** "F4" → "E#4" en la tonalidad que corresponda. */
  const spellName = useCallback((name: string) => {
    const base = name.replace(/-?\d+$/, '');
    return (spellMap[base] ?? base) + name.slice(base.length);
  }, [spellMap]);
  /* El lienzo se dibuja en un RAF que lee refs, no props. */
  const spellRef = useRef<Record<string, string>>({});
  spellRef.current = spellMap;

  /* ---------------- Notas por pista ---------------- */
  const visibleNotes = useMemo(
    () => activeSong.notes.filter(n => trackOf(noteTrackId(n)).visible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSong, tracks]
  );
  const visibleNotesRef = useRef(visibleNotes);
  visibleNotesRef.current = visibleNotes;

  /* ---------------- Entrada del alumno ---------------- */
  const handleUserNotePress = useCallback((midiNote: number, velocity = 0.8) => {
    setPressedNotes(prev => { const n = new Set(prev); n.add(midiNote); return n; });
    pressedRef.current = new Set(pressedRef.current).add(midiNote);
    /* Si el instrumento suena por sí mismo, el navegador no dobla la nota. */
    if (midi.canPlayOut()) midi.playNote(midiNote, velocity, 0.8);
    else soundEngine.playNote(midiToNoteName(midiNote), soundPreset, '0.8s');
    /* Tu propio toque también golpea la línea, con la fuerza con que lo
       tocaste: así se ve la diferencia entre acariciar la tecla y clavarla. */
    impactsRef.current.push({ midi: midiNote, t0: performance.now(), rgb: [125, 211, 252], velocity });
    const midiPitch = midiNote;

    const { tracks: tr, practiceMode: pm } = stateRef.current;
    const t = timeRef.current;
    const target = visibleNotesRef.current.find(n =>
      n.midi === midiPitch && (tr.find(x => x.id === noteTrackId(n))?.practice ?? true) && Math.abs(n.time - t) < HIT_WINDOW
    );
    if (target) {
      setStreak(prev => {
        const next = prev + 1;
        setScore(s => s + 50 + prev * 5);
        return next;
      });
      setHitFeedback({ text: '¡Perfecto!', id: Date.now() });
      onScoreGain?.(25);
      if (pm === 'wait' && !playingRef.current) {
        // Reanuda la catarata al acertar la nota que la retenía
        playingRef.current = true;
        setIsPlaying(true);
        setWaitingForKeys(false);
      }
    } else {
      setStreak(0);
    }
  }, [soundPreset, onScoreGain]);

  const handleUserNoteRelease = useCallback((midiNote: number) => {
    setPressedNotes(prev => { const n = new Set(prev); n.delete(midiNote); return n; });
    pressedRef.current = new Set([...pressedRef.current].filter(m => m !== midiNote));
  }, []);

  useEffect(() => {
    if (!hitFeedback) return;
    const id = window.setTimeout(() => setHitFeedback(null), 700);
    return () => window.clearTimeout(id);
  }, [hitFeedback]);

  /* ---------------- Web MIDI ---------------- */
  const pressRef = useRef(handleUserNotePress);
  const releaseRef = useRef(handleUserNoteRelease);
  pressRef.current = handleUserNotePress;
  releaseRef.current = handleUserNoteRelease;

  /* El MIDI lo maneja `lib/midi.ts` para toda la app: acá sólo se escucha.
     Llega también la velocidad —con cuánta fuerza tocaste— y el pedal de
     sustain ya traducido a notas que siguen sonando. */
  const midiState = useMidi();
  const midiDeviceName = midiState.inputId ? midi.deviceName() : null;
  useEffect(() => {
    const stopOn = midi.onNoteOn(({ midi: m, velocity }) => pressRef.current(m, velocity));
    const stopOff = midi.onNoteEnd(m => releaseRef.current(m));
    // El switch o el pedal asignable del instrumento: play/pausa sin manos
    const stopFoot = midi.onFootSwitch(() => { void togglePlayRef.current(); });
    return () => { stopOn(); stopOff(); stopFoot(); };
  }, []);

  /* ---------------- Micrófono (piano acústico) ---------------- */
  useEffect(() => {
    if (!micOn) { pianoPitchDetector.stop(); return; }
    let unsub: (() => void) | null = null;
    let cancelled = false;
    pianoPitchDetector.start().then(res => {
      if (cancelled) return;
      if (!res.success) { setMicError(res.error || 'No se pudo abrir el micrófono'); setMicOn(false); return; }
      setMicError(null);
      unsub = pianoPitchDetector.subscribeNoteOnset(info => {
        const midi = noteNameToMidiSafe(info.note);
        if (midi == null) return;
        pressRef.current(midi);
        window.setTimeout(() => releaseRef.current(midi), 250);
      });
    });
    return () => { cancelled = true; unsub?.(); pianoPitchDetector.stop(); };
  }, [micOn]);

  /* ---------------- Teclado de la computadora (fila ASDF) ---------------- */
  useEffect(() => {
    const map: Record<string, number> = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15 };
    const base = Math.max(minMidi, 60 - ((60 - minMidi) % 12)); // C más cercano dentro del rango
    const down = new Set<string>();
    const onDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlayRef.current(); return; }
      const k = e.key.toLowerCase();
      if (k in map && !down.has(k)) { down.add(k); pressRef.current(base + map[k]); }
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in map) { down.delete(k); releaseRef.current(base + map[k]); }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [minMidi]);

  /* ---------------- Transporte ---------------- */
  const handleTogglePlay = useCallback(async () => {
    await Tone.start();
    const next = !playingRef.current;
    playingRef.current = next;
    setIsPlaying(next);
    if (!next) setWaitingForKeys(false);
    /* El reloj MIDI sale con el play: el arpegiador y las baterías del
       instrumento arrancan al tempo de la pieza sin tener que ponérselo a
       mano. Al parar, además, se corta todo lo que quedó sonando. */
    if (next) midi.startClock(activeSongRef.current?.bpm ?? 100);
    else { midi.stopClock(); midi.panic(); }
  }, []);
  const togglePlayRef = useRef(handleTogglePlay);
  togglePlayRef.current = handleTogglePlay;
  const activeSongRef = useRef(activeSong);
  activeSongRef.current = activeSong;
  /* Salir de la catarata con notas sonando en el instrumento es la forma más
     rápida de quedarse con un nota pegado. */
  useEffect(() => () => { midi.stopClock(); midi.panic(); }, []);

  /* Una demo se abre andando: el sentido de mirarla es ver el movimiento. El
     autoplay necesita el gesto previo del usuario (el clic que abrió el
     modal), así que Tone arranca sin problema. */
  useEffect(() => {
    if (!demo?.autoPlay) return;
    let cancel = false;
    const t = window.setTimeout(() => { if (!cancel) void togglePlayRef.current(); }, 260);
    return () => { cancel = true; window.clearTimeout(t); };
  }, [demo?.autoPlay, demo?.song.id]);

  /* Mano pedida por quien abrió la demo: se apagan las pistas de la otra. */
  useEffect(() => {
    const h = demo?.hand;
    if (!h || h === 'both') return;
    setTracks(prev => prev.map(t => ({ ...t, visible: t.id === h || prev.length === 1, muted: t.id !== h && prev.length > 1 })));
  }, [demo?.hand, demo?.song.id]);

  const handleStop = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setWaitingForKeys(false);
    seekTo(0);
    midi.stopClock();
    midi.panic();
  }, [seekTo]);

  /**
   * Pantalla completa. En el celular, además, se fija el horizontal: la
   * catarata es ancha y en vertical entran tres octavas contadas. El bloqueo
   * de orientación solo existe estando en pantalla completa, así que se pide
   * después, y si el navegador no lo permite (iOS) no pasa nada.
   */
  const handleToggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen()
        .then(() => { setIsFullscreen(true); if (isTouchDevice()) void lockLandscape(); })
        .catch(() => {});
    } else {
      unlockOrientation();
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* ---------------- Importar MIDI (input y arrastrar-soltar) --------- */
  const [dropActive, setDropActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  /* Lo leído y todavía sin guardar, mientras se confirma el nombre. */
  const [pendingImport, setPendingImport] = useState<{ pending: PendingImport[]; failed: { name: string; reason: string }[] } | null>(null);
  const dragDepth = useRef(0);   // dragenter/leave se disparan por cada hijo

  /**
   * Guarda las piezas y abre la primera. Habla el Maestro solo cuando entra
   * una sola: con doce archivos, doce frases serían insoportables.
   */
  const finishImport = useCallback((r: ImportResult) => {
    if (r.saved.length) {
      setSongList(prev => {
        const ids = new Set(r.saved.map(s => s.id));
        return [...r.saved, ...prev.filter(s => !ids.has(s.id))];
      });
      setActiveSongId(r.saved[0].id);
      handleStop();
      setScore(0); setStreak(0);
    }

    const partes: string[] = [];
    if (r.saved.length === 1) partes.push(`"${r.saved[0].title}" · ${r.saved[0].notesCount} notas`);
    else if (r.saved.length > 1) partes.push(`${r.saved.length} piezas guardadas`);
    if (r.failed.length) partes.push(`${r.failed.length} sin importar (${r.failed[0].reason})`);
    if (r.offline) partes.push('sin conexión: quedaron en este dispositivo y se suben solas');

    setImportMsg(partes.length
      ? { text: partes.join(' · '), ok: r.saved.length > 0 }
      : { text: 'No se pudo importar ningún archivo.', ok: false });
    setTimeout(() => setImportMsg(null), 6000);

    if (r.saved.length === 1) {
      maestroVoice.speak(`¡Excelente! Subiste "${r.saved[0].title}". Analicé ${r.saved[0].notesCount} notas listas para entrenar en la catarata.`);
    } else if (!r.saved.length) {
      maestroVoice.speak('Che, no pude leer ese archivo. Asegurate de que sea un .mid estándar.');
    }
  }, [handleStop]);

  /**
   * Leer primero, guardar después: entre las dos cosas se pregunta con qué
   * nombre y con qué autor queda cada pieza. Si no se pudo leer ninguno no se
   * abre el diálogo — no hay nada que confirmar.
   */
  const ingestFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const read = await readMidiFiles(files);
      if (!read.pending.length) {
        finishImport({ saved: [], failed: read.failed, offline: false });
        return;
      }
      setPendingImport(read);
    } finally {
      setImporting(false);
    }
  }, [finishImport]);

  const confirmImport = useCallback(async (songs: WaterfallSong[]) => {
    const failed = pendingImport?.failed ?? [];
    setImporting(true);
    try {
      const r = await saveImports(songs);
      setPendingImport(null);
      finishImport({ ...r, failed: [...failed, ...r.failed] });
    } finally {
      setImporting(false);
    }
  }, [pendingImport, finishImport]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    await ingestFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* Arrastrar y soltar sobre la catarata. El contador de profundidad evita que
     el resaltado parpadee al pasar por encima de los hijos. */
  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!dragHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragDepth.current++;
    setDropActive(true);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!dragHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!dragHasFiles(e.dataTransfer)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDropActive(false);
  }, []);
  const onDrop = useCallback(async (e: React.DragEvent) => {
    if (!dragHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDropActive(false);
    await ingestFiles(await filesFromDrop(e.dataTransfer));
  }, [ingestFiles]);

  /* Las piezas importadas viven en el servidor: se traen al abrir la catarata
     y se suman a la lista sin sus notas (se piden al elegirlas). */
  useEffect(() => {
    if (isDemo) return;            // la demo muestra una sola pieza y nada más
    let alive = true;
    void listSongs().then(list => {
      if (!alive || !list.length) return;
      setSongList(prev => {
        const known = new Set(prev.map(s => s.id));
        const extras = list.filter(s => !known.has(s.id)).map(s => ({ ...s, notes: [] } as WaterfallSong));
        return extras.length ? [...prev, ...extras] : prev;
      });
    });
    return () => { alive = false; };
  }, [isDemo]);

  const [libraryOpen, setLibraryOpen] = useState(false);
  // "/" abre la biblioteca, como en cualquier buscador
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setLibraryOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /**
   * Elegir una pieza. Las de la biblioteca generada (escalas, ejercicios de
   * método) no viven en `songList`: se construyen al vuelo la primera vez y
   * recién ahí se suman, para no tener cientos de piezas con todas sus notas
   * en memoria desde el arranque.
   */
  const selectSong = (id: string) => {
    const known = songList.find(s => s.id === id);
    if (!known) {
      const built = resolvePiece(id);
      if (built) setSongList(prev => [built, ...prev]);
      else {
        // Pieza importada que todavía no tiene sus notas acá: se piden y se abre
        void getSong(id).then(song => {
          if (!song) return;
          setSongList(prev => [song, ...prev.filter(s => s.id !== id)]);
          setActiveSongId(id);
        });
      }
    } else if (!known.notes.length) {
      void getSong(id).then(song => {
        if (song) setSongList(prev => prev.map(s => (s.id === id ? song : s)));
      });
    }
    setActiveSongId(id);
    pushRecent(loadLibraryState(), id);
    handleStop(); setScore(0); setStreak(0);
  };

  /* ------------------------------------------------------------------ */
  /*  Loop de animación: tiempo, modo espera, audio automático, dibujo   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const render = (ts: number) => {
      const S = stateRef.current;
      const spellCanvas = (name: string) => {
        const base = name.replace(/-?\d+$/, '');
        return (spellRef.current[base] ?? base) + name.slice(base.length);
      };
      const song = S.activeSong;
      const notes = visibleNotesRef.current;
      const trackById = new Map(S.tracks.map(t => [t.id, t]));
      const practiceOf = (n: WaterfallNote) => trackById.get(noteTrackId(n))?.practice ?? true;
      const mutedOf = (n: WaterfallNote) => trackById.get(noteTrackId(n))?.muted ?? false;
      const colorOf = (n: WaterfallNote) => colorSet(trackById.get(noteTrackId(n))?.color ?? '#f97316');
      const selectedId = selectedNoteRef.current;
      const selSet = selectedIdsRef.current;

      if (!lastTsRef.current) lastTsRef.current = ts;
      const delta = Math.min(0.1, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      const prevTime = timeRef.current;
      if (playingRef.current) {
        // Modo espera: si hay una nota de práctica en la línea y no está presionada, frenar.
        let hold = false;
        if (S.practiceMode === 'wait') {
          const due = notes.filter(n => practiceOf(n) && n.time <= prevTime + 0.03 && n.time >= prevTime - 0.2);
          if (due.length > 0 && !due.some(n => pressedRef.current.has(n.midi))) hold = true;
        }
        if (hold) {
          setWaitingForKeys(w => (w ? w : true));
        } else {
          setWaitingForKeys(w => (w ? false : w));
          let t = prevTime + delta * S.playbackSpeed;
          if (t >= song.duration + 1.5) {
            if (S.loopEnabled) { t = 0; lastBeatRef.current = -1; }
            else { t = song.duration + 1.5; playingRef.current = false; setIsPlaying(false); }
          }
          timeRef.current = t;

          /* Notas que cruzan la línea en este cuadro: el golpe se registra acá
             y no al dibujar, porque el dibujo puede saltearse cuadros y un
             acorde rápido perdería alguno. */
          notes.forEach(n => {
            if (n.time > prevTime && n.time <= t) {
              const hex = trackById.get(noteTrackId(n))?.color ?? '#f97316';
              impactsRef.current.push({
                midi: n.midi,
                t0: ts,
                rgb: [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)],
                velocity: Math.max(0.35, Math.min(1, n.velocity || 0.8)),
              });
            }
          });
          if (impactsRef.current.length > 48) impactsRef.current.splice(0, impactsRef.current.length - 48);

          // Audio automático de las pistas que no practica el alumno
          if (!S.isMuted) {
            const porElInstrumento = midi.canPlayOut();
            notes.forEach(n => {
              if (practiceOf(n) || mutedOf(n)) return;
              if (n.time > prevTime && n.time <= t) {
                // El acompañamiento suena por el instrumento si así se pidió
                if (porElInstrumento) midi.playNote(n.midi, n.velocity, Math.max(0.1, n.duration));
                else if (synthRef.current) {
                  try { synthRef.current.triggerAttackRelease(n.name, Math.max(0.1, n.duration), undefined, n.velocity); } catch { /* noop */ }
                }
              }
            });
          }
          // Metrónomo
          if (S.metronomeOn && clickRef.current) {
            const beatLen = 60 / (song.bpm || 90);
            const beat = Math.floor(t / beatLen);
            if (beat !== lastBeatRef.current) {
              lastBeatRef.current = beat;
              try { clickRef.current.triggerAttackRelease(beat % 4 === 0 ? 'C6' : 'G5', '32n'); } catch { /* noop */ }
            }
          }
        }
      }
      const time = timeRef.current;

      // Actualizar UI de tiempo ~10 veces por segundo
      if (Math.abs(time - lastUiTimeRef.current) > 0.1 || (!playingRef.current && time !== lastUiTimeRef.current)) {
        lastUiTimeRef.current = time;
        setCurrentTime(time);
      }

      // Notas sobre la línea → teclas iluminadas
      const hits = notes.filter(n => time >= n.time - 0.02 && time <= n.time + n.duration).map(n => n.midi);
      const key = hits.join(',');
      if (key !== hitKeyRef.current) { hitKeyRef.current = key; setHitNotes(new Set(hits)); }

      /* ---------- Dibujo ---------- */
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) { raf = requestAnimationFrame(render); return; }
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      ctx.fillStyle = '#0c1220';
      ctx.fillRect(0, 0, W, H);

      const totalWhites = whiteKeys.length;
      const beatLen = 60 / (song.bpm || 90);
      const pxPerSec = PX_PER_SECOND * S.playbackSpeed;


      /**
       * La línea de impacto, con los golpes que la están atravesando.
       *
       * `slot` traduce una nota a su posición y ancho sobre la línea, que es
       * lo único que cambia entre la vista vertical y la roll: en una la
       * línea es horizontal y las notas caen sobre ella, en la otra es
       * vertical y llegan de costado. El resto del dibujo es el mismo.
       */
      function drawHitLine(
        ctx: CanvasRenderingContext2D,
        now: number,
        minimal: boolean,
        geo: {
          axis: 'horizontal' | 'vertical';
          at: number;
          from: number;
          to: number;
          /** Hacia dónde salta la luz: siempre en contra del teclado. */
          spray: 1 | -1;
          slot: (midi: number) => { center: number; size: number } | null;
        },
      ) {
        const LIFE = 420;                         // ms que dura un golpe
        const live = impactsRef.current.filter(i => now - i.t0 < LIFE && now - i.t0 > -500);
        impactsRef.current = live;

        // Cuánto late la línea entera: el golpe más fresco manda
        let pulse = 0;
        for (const i of live) pulse = Math.max(pulse, Math.min(1, Math.max(0, 1 - (now - i.t0) / LIFE)) * i.velocity);

        const along = (v: number, off: number): [number, number] =>
          geo.axis === 'horizontal' ? [v, geo.at + off] : [geo.at + off, v];

        ctx.save();

        // Halo de fondo: crece con el latido
        if (!minimal && pulse > 0.02) {
          const g = geo.axis === 'horizontal'
            ? ctx.createLinearGradient(0, geo.at - 26 * pulse, 0, geo.at + 6)
            : ctx.createLinearGradient(geo.at + 6, 0, geo.at - 26 * pulse, 0);
          g.addColorStop(0, 'rgba(244,63,94,0)');
          g.addColorStop(1, `rgba(244,63,94,${0.22 * pulse})`);
          ctx.fillStyle = g;
          if (geo.axis === 'horizontal') ctx.fillRect(geo.from, geo.at - 26 * pulse, geo.to - geo.from, 26 * pulse + 6);
          else ctx.fillRect(geo.at - 26 * pulse, geo.from, 26 * pulse + 6, geo.to - geo.from);
        }

        // La línea
        if (!minimal) { ctx.shadowColor = '#f43f5e'; ctx.shadowBlur = 14 + 26 * pulse; }
        ctx.strokeStyle = pulse > 0.02 ? `rgb(${255}, ${Math.round(63 + 120 * pulse)}, ${Math.round(94 + 90 * pulse)})` : '#f43f5e';
        ctx.lineWidth = 3 + 1.6 * pulse;
        ctx.beginPath();
        ctx.moveTo(...along(geo.from, 0));
        ctx.lineTo(...along(geo.to, 0));
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (const imp of live) {
          const pos = geo.slot(imp.midi);
          if (!pos) continue;
          /* Se acota a 0–1: el golpe del alumno se marca con el reloj del
             evento y el dibujo con el del cuadro, que puede venir atrasado, y
             un age negativo daba un radio negativo (y una excepción). */
          const age = Math.min(1, Math.max(0, (now - imp.t0) / LIFE));
          const fade = (1 - age) * (1 - age);         // se apaga rápido al final
          const [r, g, b] = imp.rgb;

          // 1. El tramo de la línea que le toca a esa nota, encendido en blanco
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const seg = pos.size * (0.55 + 0.9 * age);
          const grad = geo.axis === 'horizontal'
            ? ctx.createLinearGradient(pos.center - seg / 2, 0, pos.center + seg / 2, 0)
            : ctx.createLinearGradient(0, pos.center - seg / 2, 0, pos.center + seg / 2);
          grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
          grad.addColorStop(0.5, `rgba(255,255,255,${0.9 * fade * imp.velocity})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grad;
          const thick = 3 + 9 * fade;
          if (geo.axis === 'horizontal') ctx.fillRect(pos.center - seg / 2, geo.at - thick / 2, seg, thick);
          else ctx.fillRect(geo.at - thick / 2, pos.center - seg / 2, thick, seg);

          if (!minimal) {
            // 2. La columna de luz que sube por el carril de la nota
            const colLen = 54 * (0.45 + 0.55 * (1 - age));
            const colW = pos.size * 0.85;
            const col = geo.axis === 'horizontal'
              ? ctx.createLinearGradient(0, geo.at, 0, geo.at + geo.spray * colLen)
              : ctx.createLinearGradient(geo.at, 0, geo.at + geo.spray * colLen, 0);
            col.addColorStop(0, `rgba(255,255,255,${0.34 * fade * imp.velocity})`);
            col.addColorStop(0.35, `rgba(${r},${g},${b},${0.20 * fade})`);
            col.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx.fillStyle = col;
            if (geo.axis === 'horizontal') {
              ctx.fillRect(pos.center - colW / 2, geo.spray < 0 ? geo.at - colLen : geo.at, colW, colLen);
            } else {
              ctx.fillRect(geo.spray < 0 ? geo.at - colLen : geo.at, pos.center - colW / 2, colLen, colW);
            }

            // 3. La onda que se abre desde el punto de impacto
            const rad = 6 + 52 * age;
            const [cx, cy] = along(pos.center, 0);
            const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
            halo.addColorStop(0, `rgba(255,255,255,${0.30 * fade})`);
            halo.addColorStop(0.55, `rgba(${r},${g},${b},${0.22 * fade})`);
            halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();

            // 4. Chispas: salen hacia donde vino la nota y frenan
            const n = 5;
            for (let i = 0; i < n; i++) {
              // Ángulos fijos por nota: el mismo golpe se ve siempre igual
              const seed = (imp.midi * 37 + i * 61) % 100 / 100;
              const spread = (seed - 0.5) * 1.5;
              const dist = (14 + 46 * seed) * (1 - (1 - age) * (1 - age));  // desacelera
              const off = geo.spray * dist * Math.cos(spread * 0.6);
              const side = dist * Math.sin(spread) * 0.7;
              const [px, py] = along(pos.center + side, off);
              ctx.fillStyle = `rgba(255,${Math.round(200 + 55 * seed)},${Math.round(160 + 60 * seed)},${0.75 * fade})`;
              ctx.beginPath(); ctx.arc(px, py, 1.6 + 1.4 * fade, 0, Math.PI * 2); ctx.fill();
            }
          }
          ctx.restore();
        }
        ctx.restore();
      }

      const noteBox = (n: WaterfallNote) => {
        const k = keyByMidi.get(n.midi);
        if (!k) return null;
        return { whiteIndex: k.whiteIndex, isBlack: k.isBlack };
      };

      if (S.viewMode === 'vertical') {
        const laneW = W / totalWhites;
        /* La línea deja de estar pegada al borde: abajo queda una franja
           —el paño, como el fieltro del piano— donde el golpe se derrama
           antes de llegar a la tecla. Sin ella el destello se cortaba al
           medio contra el borde del lienzo. */
        const FELT = 11;
        const hitY = H - FELT;
        layoutRef.current = { viewMode: 'vertical', W, H, time, pxPerSec, laneW, hitY, rowH: 0, hitX: 0 };
        // Guías de carriles (cada C un poco más marcada)
        for (let i = 0; i < whiteKeys.length; i++) {
          const x = i * laneW;
          ctx.strokeStyle = whiteKeys[i].name.startsWith('C') ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.035)';
          ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, hitY); ctx.stroke();
        }
        // Líneas de compás / pulso con número de compás
        const firstBeat = Math.floor(time / beatLen);
        for (let b = firstBeat; b * beatLen < time + LOOKAHEAD_SECONDS + 1; b++) {
          const y = hitY - (b * beatLen - time) * pxPerSec;
          if (y < 0 || y > hitY) continue;
          const isBar = b % 4 === 0;
          ctx.strokeStyle = isBar ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); ctx.stroke();
          if (isBar) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
            ctx.fillText(String(b / 4 + 1), 8, y - 3);
          }
        }
        // Notas
        const drawNote = (n: WaterfallNote) => {
          const box = noteBox(n); if (!box) return;
          const tth = n.time - time;
          if (tth > LOOKAHEAD_SECONDS + 0.5 || tth + n.duration < -0.3) return;
          const w = box.isBlack ? laneW * 0.62 : laneW - 6;
          const x = box.isBlack ? box.whiteIndex * laneW - w / 2 : box.whiteIndex * laneW + 3;
          const bottom = hitY - tth * pxPerSec;
          const h = Math.max(14, n.duration * pxPerSec - 3);
          const top = bottom - h;
          const c = colorOf(n);
          const onLine = tth <= 0.02 && tth + n.duration > 0;
          const pressed = pressedRef.current.has(n.midi) && Math.abs(tth) < HIT_WINDOW;
          const isSel = n.id === selectedId || selSet.has(n.id);
          const r = Math.min(7, w / 3);
          ctx.save();
          ctx.beginPath(); ctx.roundRect(x, top, w, h, r);
          const g = ctx.createLinearGradient(0, top, 0, bottom);
          if (onLine || pressed) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, c.light); g.addColorStop(1, c.base); }
          else { g.addColorStop(0, c.light); g.addColorStop(1, c.dark); }
          ctx.fillStyle = g;
          if (!S.minimalFx && (onLine || pressed || isSel)) { ctx.shadowColor = isSel ? '#ffffff' : c.glow; ctx.shadowBlur = 22; }
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = isSel ? '#ffffff' : 'rgba(255,255,255,0.14)'; ctx.lineWidth = isSel ? 2 : 1; ctx.stroke();
          if (S.showNoteLabels && h >= 22 && w >= 18) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.font = `600 ${Math.max(9, Math.min(12, w * 0.4))}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(spellCanvas(n.name), x + w / 2, bottom - 5);
          }
          ctx.restore();
        };
        notes.filter(n => !keyByMidi.get(n.midi)?.isBlack).forEach(drawNote);
        notes.filter(n => keyByMidi.get(n.midi)?.isBlack).forEach(drawNote);
        // El paño, debajo de la línea
        {
          const felt = ctx.createLinearGradient(0, hitY, 0, H);
          felt.addColorStop(0, 'rgba(9,13,24,0.95)');
          felt.addColorStop(1, 'rgba(5,8,16,1)');
          ctx.fillStyle = felt;
          ctx.fillRect(0, hitY, W, FELT);
        }

        /* ---------- Línea de impacto ---------- */
        /* La línea no es un adorno: es donde la nota "toca". Cuando una la
           cruza, ese tramo se enciende, larga una onda que se abre y unas
           chispas cortas, y la línea entera late un poco. Se apaga en 420 ms;
           en modo rendimiento queda sólo el encendido del tramo. */
        drawHitLine(ctx, ts, S.minimalFx, {
          axis: 'horizontal', at: hitY, from: 0, to: W, spray: -1,
          slot: k => {
            const kk = keyByMidi.get(k);
            if (!kk) return null;
            const w = kk.isBlack ? laneW * 0.62 : laneW;
            return { center: kk.isBlack ? kk.whiteIndex * laneW : kk.whiteIndex * laneW + laneW / 2, size: w };
          },
        });
      } else {
        /* ---------- Vista Roll (horizontal) ---------- */
        const KB_W = 74;                         // ancho del teclado a la izquierda
        const rowH = H / totalWhites;            // alto por tecla blanca
        const hitX = KB_W;
        const yOfWhite = (wi: number) => H - (wi + 1) * rowH; // top de la fila
        layoutRef.current = { viewMode: 'roll', W, H, time, pxPerSec, laneW: 0, hitY: 0, rowH, hitX };
        // Fondo de filas (teclas negras más oscuras)
        pianoKeys.forEach(k => {
          if (k.isBlack) {
            const y = yOfWhite(k.whiteIndex) - rowH * 0.3;
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(hitX, y, W - hitX, rowH * 0.6);
          }
        });
        whiteKeys.forEach(k => {
          if (k.name.startsWith('C')) {
            const y = yOfWhite(k.whiteIndex) + rowH;
            ctx.strokeStyle = 'rgba(255,255,255,0.09)';
            ctx.beginPath(); ctx.moveTo(hitX, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); ctx.stroke();
          }
        });
        // Compases
        const firstBeat = Math.floor(time / beatLen);
        for (let b = firstBeat; b * beatLen < time + LOOKAHEAD_SECONDS * 2; b++) {
          const x = hitX + (b * beatLen - time) * pxPerSec;
          if (x < hitX || x > W) continue;
          const isBar = b % 4 === 0;
          ctx.strokeStyle = isBar ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)';
          ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); ctx.stroke();
          if (isBar) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText(String(b / 4 + 1), x + 4, 4);
          }
        }
        // Notas
        notes.forEach(n => {
          const box = noteBox(n); if (!box) return;
          const tth = n.time - time;
          if (tth > LOOKAHEAD_SECONDS * 2 || tth + n.duration < -0.3) return;
          const h = box.isBlack ? rowH * 0.6 : rowH - 3;
          const y = box.isBlack ? yOfWhite(box.whiteIndex) - rowH * 0.3 : yOfWhite(box.whiteIndex) + 1.5;
          const x = hitX + tth * pxPerSec;
          const w = Math.max(12, n.duration * pxPerSec - 2);
          const c = colorOf(n);
          const onLine = tth <= 0.02 && tth + n.duration > 0;
          const isSel = n.id === selectedId || selSet.has(n.id);
          ctx.save();
          ctx.beginPath(); ctx.roundRect(Math.max(x, hitX - 0.5), y, w - Math.max(0, hitX - x), h, 4);
          const g = ctx.createLinearGradient(x, 0, x + w, 0);
          if (onLine) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c.light); g.addColorStop(1, c.base); }
          else { g.addColorStop(0, c.light); g.addColorStop(1, c.dark); }
          ctx.fillStyle = g;
          if (!S.minimalFx && (onLine || isSel)) { ctx.shadowColor = isSel ? '#ffffff' : c.glow; ctx.shadowBlur = 18; }
          ctx.fill(); ctx.shadowBlur = 0;
          ctx.strokeStyle = isSel ? '#ffffff' : 'rgba(255,255,255,0.14)'; ctx.lineWidth = isSel ? 2 : 1; ctx.stroke();
          if (S.showNoteLabels && w >= 30 && h >= 11) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.font = `600 ${Math.max(8, Math.min(11, h * 0.7))}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(spellCanvas(n.name), Math.max(x, hitX) + 6, y + h / 2);
          }
          ctx.restore();
        });
        // Teclado vertical a la izquierda
        whiteKeys.forEach(k => {
          const y = yOfWhite(k.whiteIndex);
          const lit = hits.includes(k.midi) || pressedRef.current.has(k.midi);
          ctx.fillStyle = lit ? '#f97316' : '#2a3a58';
          ctx.fillRect(0, y + 0.5, KB_W, rowH - 1);
          ctx.strokeStyle = '#131c2e'; ctx.strokeRect(0.5, y + 0.5, KB_W - 1, rowH - 1);
          if (k.name.startsWith('C') || lit) {
            ctx.fillStyle = lit ? '#1a1405' : 'rgba(255,255,255,0.35)';
            ctx.font = `${lit ? '700 ' : ''}10px "JetBrains Mono", monospace`;
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(k.name, KB_W - 6, y + rowH / 2);
          }
        });
        pianoKeys.filter(k => k.isBlack).forEach(k => {
          const y = yOfWhite(k.whiteIndex) - rowH * 0.3;
          const lit = hits.includes(k.midi) || pressedRef.current.has(k.midi);
          ctx.fillStyle = lit ? '#f97316' : '#0b1020';
          ctx.fillRect(0, y, KB_W * 0.62, rowH * 0.6);
        });
        /* ---------- Línea de impacto ---------- */
        drawHitLine(ctx, ts, S.minimalFx, {
          axis: 'vertical', at: hitX, from: 0, to: H, spray: 1,
          slot: k => {
            const kk = keyByMidi.get(k);
            if (!kk) return null;
            const h = kk.isBlack ? rowH * 0.6 : rowH;
            const top = kk.isBlack ? yOfWhite(kk.whiteIndex) - rowH * 0.3 : yOfWhite(kk.whiteIndex);
            return { center: top + h / 2, size: h };
          },
        });
      }
      ctx.restore();
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [whiteKeys, pianoKeys, keyByMidi]);

  /** Rect de una nota en píxeles del canvas según la geometría del último cuadro. */
  const noteRect = (n: WaterfallNote): { x: number; y: number; w: number; h: number } | null => {
    const L = layoutRef.current; const k = keyByMidi.get(n.midi);
    if (!L || !k) return null;
    const tth = n.time - L.time;
    if (L.viewMode === 'vertical') {
      const w = k.isBlack ? L.laneW * 0.62 : L.laneW - 6;
      const x = k.isBlack ? k.whiteIndex * L.laneW - w / 2 : k.whiteIndex * L.laneW + 3;
      const bottom = L.hitY - tth * L.pxPerSec;
      const h = Math.max(14, n.duration * L.pxPerSec - 3);
      return { x, y: bottom - h, w, h };
    }
    const yOfWhite = (wi: number) => L.H - (wi + 1) * L.rowH;
    const h = k.isBlack ? L.rowH * 0.6 : L.rowH - 3;
    const y = k.isBlack ? yOfWhite(k.whiteIndex) - L.rowH * 0.3 : yOfWhite(k.whiteIndex) + 1.5;
    const x = L.hitX + tth * L.pxPerSec;
    const w = Math.max(12, n.duration * L.pxPerSec - 2);
    return { x, y, w, h };
  };
  const noteAt = (px: number, py: number): WaterfallNote | null => {
    // Las negras se dibujan encima: se prueban primero
    const ordered = [...visibleNotes].sort((a, b) => Number(keyByMidi.get(b.midi)?.isBlack ?? false) - Number(keyByMidi.get(a.midi)?.isBlack ?? false));
    for (const n of ordered) {
      const r = noteRect(n); if (!r) continue;
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return n;
    }
    return null;
  };

  /* ---------------- Volver al original de la transcripción ---------------- */
  /* Una pieza que salió de separar instrumentos se puede haber editado hasta
     dejarla peor. `sourceJobId` es el job de audio del que salió, así que el
     original se puede pedir de nuevo en vez de perderlo. */
  const [reverting, setReverting] = useState(false);
  const [revertMsg, setRevertMsg] = useState<string | null>(null);
  const revertTranscription = async () => {
    const job = activeSong.sourceJobId;
    if (!job) return;
    setReverting(true); setRevertMsg(null);
    try {
      const stems = songTracks(activeSong).map(t => t.id).join(',');
      const r = await fetch(`/api/audio/jobs/${encodeURIComponent(job)}/notes?stems=${encodeURIComponent(stems)}&sensitivity=0.5`);
      const fresh: WaterfallSong = await r.json();
      if (!r.ok || !fresh.notes?.length) throw new Error((fresh as any)?.error || 'no se pudo volver a transcribir');
      replaceNotes(fresh.notes);          // queda en el historial: Ctrl+Z lo devuelve
      setSelectedNoteId(null);
      setRevertMsg(`Se restablecieron ${fresh.notes.length} notas del original.`);
    } catch (e: any) {
      setRevertMsg(e?.message || 'No se pudo restablecer.');
    } finally {
      setReverting(false);
      setTimeout(() => setRevertMsg(null), 6000);
    }
  };

  /* ---------------- Edición con el mouse ---------------- */
  /* Hasta acá una nota mal transcripta se corregía a golpes de menú
     contextual: subir un semitono, atrasar 50 ms, repetir. Arrastrarla es lo
     que uno espera de un editor, así que el canvas ahora la mueve, la estira y
     deja agregar notas nuevas. Todo cae en la grilla de semicorcheas salvo que
     se mantenga Alt, y un arrastre entero es un solo paso de deshacer. */
  const dragRef = useRef<{
    id: string; kind: 'move' | 'resize'; x0: number; y0: number;
    orig: WaterfallNote; moved: boolean;
    /** Las otras notas seleccionadas, como estaban al empezar el arrastre. */
    others: Map<string, WaterfallNote>;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  /* Marquesina: arrastrar sobre el vacío encierra notas. Un clic sin
     movimiento sigue siendo play/pausa, así que la caja recién nace a los
     4 px de recorrido. */
  const marqueeRef = useRef<{ x0: number; y0: number; x: number; y: number; add: boolean; live: boolean } | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const gridStep = () => 60 / (activeSong.bpm || 100) / 4;   // semicorchea
  const snap = (t: number, free: boolean) => {
    if (free) return +t.toFixed(3);
    const g = gridStep();
    return +(Math.round(t / g) * g).toFixed(3);
  };

  /** Tecla bajo una coordenada (las negras se dibujan encima, van primero). */
  const keyAt = (px: number, py: number) => {
    const L = layoutRef.current;
    if (!L) return null;
    if (L.viewMode === 'vertical') {
      for (const k of pianoKeys) {
        if (!k.isBlack) continue;
        const w = L.laneW * 0.62, x = k.whiteIndex * L.laneW - w / 2;
        if (px >= x && px <= x + w) return k;
      }
      const wi = Math.max(0, Math.min(whiteKeys.length - 1, Math.floor(px / L.laneW)));
      return whiteKeys[wi] ?? null;
    }
    const yOfWhite = (wi: number) => L.H - (wi + 1) * L.rowH;
    for (const k of pianoKeys) {
      if (!k.isBlack) continue;
      const h = L.rowH * 0.6, y = yOfWhite(k.whiteIndex) - L.rowH * 0.3;
      if (py >= y && py <= y + h) return k;
    }
    const wi = Math.max(0, Math.min(whiteKeys.length - 1, Math.floor((L.H - py) / L.rowH)));
    return whiteKeys[wi] ?? null;
  };

  /** Segundo al que corresponde un punto del escenario. */
  const timeAt = (px: number, py: number): number => {
    const L = layoutRef.current;
    if (!L) return 0;
    return L.viewMode === 'vertical'
      ? L.time + (L.hitY - py) / L.pxPerSec
      : L.time + (px - L.hitX) / L.pxPerSec;
  };

  /** ¿El puntero está sobre el borde por el que se estira la nota? */
  const onResizeEdge = (n: WaterfallNote, px: number, py: number): boolean => {
    const r = noteRect(n);
    if (!r) return false;
    const L = layoutRef.current!;
    return L.viewMode === 'vertical' ? py <= r.y + 7 : px >= r.x + r.w - 7;
  };

  const applyDrag = (e: PointerEvent | React.PointerEvent, rect: DOMRect) => {
    const d = dragRef.current;
    if (!d) return;
    const L = layoutRef.current;
    if (!L) return;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const free = e.altKey;
    let next: WaterfallNote;
    if (d.kind === 'resize') {
      const dSec = L.viewMode === 'vertical' ? (d.y0 - y) / L.pxPerSec : (x - d.x0) / L.pxPerSec;
      const dur = Math.max(0.05, d.orig.duration + dSec);
      next = { ...d.orig, duration: free ? +dur.toFixed(3) : Math.max(gridStep(), snap(dur, false)) };
    } else {
      const dSec = L.viewMode === 'vertical' ? (d.y0 - y) / L.pxPerSec : (x - d.x0) / L.pxPerSec;
      const k = keyAt(x, y);
      const midi = k ? k.midi : d.orig.midi;
      next = {
        ...d.orig,
        midi,
        name: midiToNoteName(midi),
        time: Math.max(0, snap(d.orig.time + dSec, free)),
      };
    }
    if (!d.moved) {
      const same = next.midi === d.orig.midi && next.time === d.orig.time && next.duration === d.orig.duration;
      if (same) return;
      d.moved = true;
      setDragging(true);
      // Un arrastre entero = un paso de deshacer: se guarda el antes, una vez
      const cur = songList.find(s => s.id === activeSongId);
      if (cur) setHistory(h => ({ past: [...h.past.slice(-49), cur.notes], future: [] }));
    }

    /* Si la nota arrastrada es parte de una selección, se mueve el bloque
       entero con el mismo desplazamiento. La nota bajo el puntero manda: las
       demás la siguen, así que sólo una cae exactamente en la grilla. */
    const dMidi = next.midi - d.orig.midi;
    const dTime = next.time - d.orig.time;
    const dDur = next.duration - d.orig.duration;
    const bloque = d.others;

    setSongList(prev => prev.map(s => {
      if (s.id !== activeSongId) return s;
      const notes = s.notes.map(n => {
        if (n.id === d.id) return next;
        const o = bloque.get(n.id);
        if (!o) return n;
        if (d.kind === 'resize') return { ...o, duration: Math.max(0.05, +(o.duration + dDur).toFixed(3)) };
        const midi = Math.max(21, Math.min(108, o.midi + dMidi));
        return { ...o, midi, name: midiToNoteName(midi), time: Math.max(0, +(o.time + dTime).toFixed(3)) };
      });
      return { ...s, notes, isCustom: true };
    }));
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (d?.moved) persistActiveSong();      // recién acá se escribe a disco
  };

  /** Nota nueva donde se hizo doble clic, en la pista seleccionada. */
  const addNoteAt = (px: number, py: number, altKey: boolean) => {
    const k = keyAt(px, py);
    if (!k) return;
    const t = Math.max(0, snap(timeAt(px, py), altKey));
    const trackId = selectedTrackId || tracks[0]?.id || 'right';
    const note: WaterfallNote = {
      id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: midiToNoteName(k.midi),
      midi: k.midi,
      time: t,
      duration: +(gridStep() * 4).toFixed(3),      // una negra
      velocity: 0.8,
      hand: activeSong.tracks ? 'right' : (trackId as 'right' | 'left'),
      ...(activeSong.tracks ? { track: trackId } : {}),
    };
    const cur = songList.find(s => s.id === activeSongId);
    if (!cur) return;
    replaceNotes([...cur.notes, note].sort((a, b) => a.time - b.time));
    selectOne(note.id);
    soundEngine.playNote(midiToNoteName(k.midi), soundPreset, '0.6s');
  };

  /* ---------------- Acciones sobre varias notas ---------------- */
  /* Rejillas de cuantización. La de semicorcheas es la que sirve casi siempre;
     las otras están para transcripciones de audio, que llegan con todo corrido
     unos milisegundos. */
  const GRIDS: { id: string; label: string; beats: number }[] = [
    { id: '4n', label: '1/4', beats: 1 },
    { id: '8n', label: '1/8', beats: 0.5 },
    { id: '16n', label: '1/16', beats: 0.25 },
    { id: '8t', label: '1/8 T', beats: 1 / 3 },
  ];
  const [quantGrid, setQuantGrid] = useState('16n');
  const [quantDur, setQuantDur] = useState(false);
  const [quantMsg, setQuantMsg] = useState<string | null>(null);

  const gridSeconds = useCallback((id: string) => {
    const g = GRIDS.find(x => x.id === id) ?? GRIDS[2];
    return (60 / (activeSong.bpm || 100)) * g.beats;
  }, [activeSong.bpm]);

  /** Alinea a la grilla las notas que cumplan el filtro. */
  const quantizeNotes = useCallback((filtro: (n: WaterfallNote) => boolean, gridId: string, tambienDuracion: boolean) => {
    const cur = songList.find(s => s.id === activeSongId);
    if (!cur) return 0;
    const g = gridSeconds(gridId);
    let movidas = 0;
    const notes = cur.notes.map(n => {
      if (!filtro(n)) return n;
      const time = Math.max(0, +(Math.round(n.time / g) * g).toFixed(4));
      const duration = tambienDuracion
        ? Math.max(g, +(Math.round(n.duration / g) * g).toFixed(4))
        : n.duration;
      if (time === n.time && duration === n.duration) return n;
      movidas++;
      return { ...n, time, duration };
    });
    if (movidas) replaceNotes(notes.sort((a, b) => a.time - b.time));
    return movidas;
  }, [songList, activeSongId, gridSeconds, replaceNotes]);

  const quantizeSelection = useCallback(() => {
    const sel = selectedIdsRef.current;
    const n = quantizeNotes(x => sel.has(x.id), quantGrid, quantDur);
    setQuantMsg(n ? `${n} ${n === 1 ? 'nota alineada' : 'notas alineadas'}` : 'ya estaban en la grilla');
    window.setTimeout(() => setQuantMsg(null), 2500);
  }, [quantizeNotes, quantGrid, quantDur]);

  const quantizeTrack = useCallback((trackId: string) => {
    const n = quantizeNotes(x => noteTrackId(x) === trackId, quantGrid, quantDur);
    setQuantMsg(n ? `${n} ${n === 1 ? 'nota alineada' : 'notas alineadas'}` : 'ya estaban en la grilla');
    window.setTimeout(() => setQuantMsg(null), 2500);
  }, [quantizeNotes, quantGrid, quantDur]);

  const deleteSelection = useCallback(() => {
    const sel = selectedIdsRef.current;
    const cur = songList.find(s => s.id === activeSongId);
    if (!cur || !sel.size) return;
    replaceNotes(cur.notes.filter(n => !sel.has(n.id)));
    selectOne(null);
  }, [songList, activeSongId, replaceNotes, selectOne]);

  const selectTrackNotes = useCallback((trackId: string) => {
    const ids = activeSong.notes.filter(n => noteTrackId(n) === trackId).map(n => n.id);
    setSelectedIds(new Set(ids));
    setSelectedNoteId(ids[ids.length - 1] ?? null);
  }, [activeSong]);

  /* Click en el escenario: nota → seleccionar; teclado del roll → tocar; vacío → play/pausa */
  const rollPointer = (e: React.PointerEvent<HTMLCanvasElement>, down: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (down && e.button === 2) return; // lo maneja onContextMenu
    if (down) {
      setCtxMenu(null);
      const hit = noteAt(x, y);
      if (hit) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) toggleInSelection(hit.id);
        else if (!selectedIdsRef.current.has(hit.id)) selectOne(hit.id);
        else setSelectedNoteId(hit.id);
        // Arrastrar mueve; el borde de salida estira
        const sel = selectedIdsRef.current;
        const others = new Map<string, WaterfallNote>();
        if (sel.has(hit.id) && sel.size > 1) {
          for (const n of activeSong.notes) if (n.id !== hit.id && sel.has(n.id)) others.set(n.id, n);
        }
        dragRef.current = { id: hit.id, kind: onResizeEdge(hit, x, y) ? 'resize' : 'move', x0: x, y0: y, orig: hit, moved: false, others };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      if (viewMode === 'roll' && x <= 74) {
        const rowH = rect.height / whiteKeys.length;
        const wi = Math.min(whiteKeys.length - 1, Math.max(0, Math.floor((rect.height - y) / rowH)));
        handleUserNotePress(whiteKeys[wi].midi); return;
      }
      marqueeRef.current = { x0: x, y0: y, x, y, add: e.shiftKey || e.ctrlKey || e.metaKey, live: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      if (dragRef.current) { endDrag(); return; }
      const m = marqueeRef.current;
      if (m) {
        marqueeRef.current = null;
        setMarquee(null);
        if (m.live) { commitMarquee(m); return; }
        if (viewMode !== 'roll' || x > 74) {
          selectOne(null);
          // El doble clic agrega una nota: que no dispare además play/pausa
          if ((e as unknown as MouseEvent).detail < 2) handleTogglePlay();
        }
        return;
      }
      if (viewMode === 'roll' && x <= 74) {
        const rowH = rect.height / whiteKeys.length;
        const wi = Math.min(whiteKeys.length - 1, Math.max(0, Math.floor((rect.height - y) / rowH)));
        handleUserNoteRelease(whiteKeys[wi].midi);
      }
    }
  };

  /** Al soltar: se seleccionan las notas encerradas por la caja. */
  const commitMarquee = (m: { x0: number; y0: number; x: number; y: number; add: boolean }) => {
    const x1 = Math.min(m.x0, m.x), x2 = Math.max(m.x0, m.x);
    const y1 = Math.min(m.y0, m.y), y2 = Math.max(m.y0, m.y);
    const dentro = activeSong.notes.filter(n => {
      const r = noteRect(n);
      if (!r) return false;
      return r.x < x2 && r.x + r.w > x1 && r.y < y2 && r.y + r.h > y1;
    });
    setSelectedIds(prev => {
      const next = m.add ? new Set(prev) : new Set<string>();
      for (const n of dentro) next.add(n.id);
      return next;
    });
    setSelectedNoteId(dentro.length ? dentro[dentro.length - 1].id : null);
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (dragRef.current) { applyDrag(e, rect); return; }
    const m = marqueeRef.current;
    if (m) {
      m.x = e.clientX - rect.left; m.y = e.clientY - rect.top;
      if (!m.live && (Math.abs(m.x - m.x0) > 4 || Math.abs(m.y - m.y0) > 4)) m.live = true;
      if (m.live) {
        setMarquee({
          x: Math.min(m.x0, m.x), y: Math.min(m.y0, m.y),
          w: Math.abs(m.x - m.x0), h: Math.abs(m.y - m.y0),
        });
      }
      return;
    }
    // El cursor cuenta lo que se puede hacer sin tener que probar
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const hit = noteAt(x, y);
    const canvas = e.currentTarget;
    canvas.style.cursor = !hit ? 'pointer'
      : onResizeEdge(hit, x, y) ? (viewMode === 'vertical' ? 'ns-resize' : 'ew-resize')
      : 'grab';
  };

  const onCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (noteAt(x, y)) return;                       // sobre una nota no se agrega otra
    if (viewMode === 'roll' && x <= 74) return;     // eso es el teclado
    addNoteAt(x, y, e.altKey);
  };
  const onCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const hit = noteAt(x, y);
    if (!hit) { setCtxMenu(null); return; }
    if (!selectedIdsRef.current.has(hit.id)) selectOne(hit.id); else setSelectedNoteId(hit.id);
    setCtxMenu({ x: Math.min(x, rect.width - 230), y: Math.min(y, rect.height - 330), noteId: hit.id });
  };

  /* Atajos de edición */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (e.key === 'Escape') { setCtxMenu(null); setSelectedNoteId(null); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const ids = activeSongRef.current?.notes.map(n => n.id) ?? [];
        setSelectedIds(new Set(ids));
        setSelectedNoteId(ids[ids.length - 1] ?? null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdsRef.current.size > 1) {
        e.preventDefault(); deleteSelection(); return;
      }
      const id = selectedNoteRef.current; if (!id) return;
      const act = (k: string) => { const a = NOTE_ACTIONS.find(x => x.id === k); if (a) editNote(id, a.apply); };
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('delete'); setSelectedNoteId(null); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); act(e.shiftKey ? 'oct-up' : 'up'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); act(e.shiftKey ? 'oct-down' : 'down'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); act(e.altKey ? 'shorter' : 'earlier'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); act(e.altKey ? 'longer' : 'later'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, editNote]);

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  const trackNoteCount = (id: string) => activeSong.notes.filter(n => noteTrackId(n) === id).length;
  const selectedNote = selectedNoteId ? activeSong.notes.find(n => n.id === selectedNoteId) ?? null : null;
  const duration = activeSong.duration || 30;
  const progressPct = Math.min(100, (currentTime / duration) * 100);
  const bothPracticing = tracks.every(t => t.practice && t.visible);

  return (
    <div
      ref={containerRef}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'stage-dark relative flex flex-col bg-[#0a0f1a] overflow-hidden select-none text-ink',
        isFullscreen
          ? 'fixed inset-0 z-50'
          : fillParent
            ? 'h-full min-h-0'
            : 'h-[calc(100dvh-64px-60px)] lg:h-[calc(100dvh-64px)] min-h-[480px]'
      )}
    >
      {/* ============ Barra superior ============ */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 py-1.5 sm:py-0 sm:h-14 sm:flex-nowrap md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] px-3 border-b border-white/8 bg-[#0d1322]">
        {/* Pieza y pistas: eran una barra lateral fija de 190 px que le comía
            ancho al lienzo. Ahora viven acá arriba, plegados, y el escenario
            se queda con toda la pantalla. */}
        <div className="flex items-center gap-1.5 min-w-0 w-full sm:w-auto sm:flex-1 md:flex-none">
          {isDemo ? (
            <div className="min-w-0 flex-1 md:flex-none md:max-w-[420px] h-9 flex items-center gap-2 px-1">
              <Music2 size={14} className="text-brand shrink-0" />
              <span className="min-w-0 text-left">
                <span className="block text-[12.5px] font-medium text-ink truncate leading-tight">{activeSong.title}</span>
                <span className="hidden sm:block text-[10px] text-ink-3 truncate leading-tight">
                  {activeSong.composer} · {activeSong.bpm} bpm
                </span>
              </span>
            </div>
          ) : (
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            title="Buscar en la biblioteca (tecla /)"
            className="min-w-0 flex-1 md:flex-none md:max-w-[300px] h-9 flex items-center gap-2 rounded-lg border border-white/8 bg-[#141b2b] px-2.5 hover:border-white/15 transition-colors"
          >
            <Search size={14} className="text-ink-3 shrink-0" />
            <span className="min-w-0 text-left">
              <span className="block text-[12.5px] font-medium text-ink truncate leading-tight">{activeSong.title}</span>
              <span className="hidden sm:block text-[10px] text-ink-3 truncate leading-tight">
                {activeSong.composer} · {activeSong.bpm} bpm
              </span>
            </span>
            <kbd className="hidden lg:block shrink-0 font-mono text-[10px] text-ink-3 border border-white/10 rounded px-1">/</kbd>
          </button>
          )}

          <div className="relative shrink-0">
            <IconBtn
              label="Pistas de la pieza"
              active={tracksOpen}
              onClick={() => { setTracksOpen(v => !v); setSettingsOpen(false); setHelpOpen(false); }}
            >
              <Layers size={15} />
              <span className="font-mono text-[11px]">{tracks.length}</span>
              <ChevronDown size={12} className={cn('transition-transform', tracksOpen && 'rotate-180')} />
            </IconBtn>
            <AnimatePresence>
              {tracksOpen && (
                <Popover title="Pistas" align="left" width="w-[320px]" onClose={() => setTracksOpen(false)}>
                  <div className="space-y-1 max-h-[46vh] overflow-y-auto no-scrollbar -mx-1 px-1">
                    {tracks.map(t => {
                      const isSolo = t.visible && tracks.length > 1 && tracks.every(x => x.id === t.id || !x.visible);
                      const isSelected = selectedTrackId === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTrackId(t.id)}
                          className={cn(
                            'rounded-lg px-2 py-1.5 border transition-colors cursor-pointer',
                            isSelected ? 'border-white/12 bg-white/4' : 'border-transparent hover:bg-white/3'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', !t.visible && 'opacity-30')} style={{ background: t.color }} />
                            <span className={cn('text-[12.5px] font-medium truncate min-w-0 flex-1', t.visible ? 'text-ink' : 'text-ink-3')}>{t.name}</span>
                            <span className="text-[10px] font-mono text-ink-3 shrink-0">{trackNoteCount(t.id)}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <TrackBtn label={t.visible ? 'Ocultar pista' : 'Mostrar pista'} active={t.visible} activeClass="text-ok" onClick={() => updateTrack(t.id, { visible: !t.visible })}>
                                {t.visible ? '✓' : <EyeOff size={12} />}
                              </TrackBtn>
                              <TrackBtn label={t.practice ? 'La toca el alumno' : 'Acompañamiento automático'} active={t.practice} activeClass="text-brand-2" onClick={() => updateTrack(t.id, { practice: !t.practice })}>
                                <Hand size={12} />
                              </TrackBtn>
                              <TrackBtn label="Solo" active={isSolo} activeClass="text-brand-2" onClick={() => soloTrack(t.id)}>S</TrackBtn>
                              <TrackBtn label={t.muted ? 'Activar sonido' : 'Silenciar'} active={!t.muted} activeClass="text-ink-2" onClick={() => updateTrack(t.id, { muted: !t.muted })}>
                                {t.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                              </TrackBtn>
                            </div>
                          </div>
                          {isSelected && (
                            <>
                              <div className="mt-1 pl-4.5 text-[10.5px] text-ink-3">
                                {t.practice ? 'la tocás vos' : 'suena sola'}
                                {!t.visible && ' · oculta'}
                                {t.muted && ' · silenciada'}
                              </div>
                              <div className="mt-1.5 pl-4.5 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); selectTrackNotes(t.id); }}
                                  className="h-6 px-2 rounded-md border border-white/10 text-[10.5px] text-ink-2 hover:bg-white/8"
                                  data-tip="Seleccionar todas las notas de esta pista"
                                >
                                  Seleccionar
                                </button>
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); quantizeTrack(t.id); }}
                                  className="h-6 px-2 rounded-md border border-white/10 text-[10.5px] text-ink-2 hover:bg-white/8 flex items-center gap-1"
                                  data-tip={`Alinear la pista entera a la grilla de ${GRIDS.find(g => g.id === quantGrid)?.label}`}
                                >
                                  <Wand2 size={11} /> Cuantizar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-1.5 mt-1 border-t border-white/8 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-3 shrink-0">Grilla</span>
                      <div className="seg bg-[#141b2b] border-white/8 flex-1">
                        {GRIDS.map(g => (
                          <button key={g.id} type="button" data-active={quantGrid === g.id} onClick={() => setQuantGrid(g.id)} className="seg-item flex-1 text-[11px]">
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-ink-2 cursor-pointer">
                      <input type="checkbox" checked={quantDur} onChange={e => setQuantDur(e.target.checked)} className="accent-[var(--color-brand)]" />
                      Alinear también las duraciones
                    </label>
                    {quantMsg && <p className="text-[11px] text-ok">{quantMsg}</p>}
                  </div>

                  {!isDemo && (
                    <div className="pt-1 border-t border-white/8 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-ok">Pistas listas ✓</span>
                      <input ref={fileInputRef} id="file-upload-midi" type="file" accept=".mid,.midi,audio/midi" multiple onChange={handleFileUpload} className="hidden" />
                      <label htmlFor="file-upload-midi" className="btn btn-secondary btn-sm cursor-pointer bg-[#141b2b]" title="Subir un archivo .mid">
                        <Upload size={12} /> Añadir MIDI
                      </label>
                    </div>
                  )}
                </Popover>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Vista */}
        <div className="seg bg-[#141b2b] border-white/8 shrink-0">
          <button type="button" data-active={viewMode === 'roll'} onClick={() => setViewMode('roll')} className="seg-item flex items-center gap-1.5" aria-label="Vista Roll" data-tip="Vista Roll">
            <AlignJustify size={14} /> <span className="hidden sm:inline">Roll</span>
          </button>
          <button type="button" data-active={viewMode === 'vertical'} onClick={() => setViewMode('vertical')} className="seg-item flex items-center gap-1.5" aria-label="Vista Vertical" data-tip="Vista Vertical">
            <LayoutPanelTop size={14} /> <span className="hidden sm:inline">Vertical</span>
          </button>
        </div>

        {/* Herramientas */}
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          <IconBtn label="Deshacer (Ctrl+Z)" onClick={undo} className={cn('hidden sm:inline-flex', !history.past.length && 'opacity-40 pointer-events-none')}><Undo2 size={15} /></IconBtn>
          <IconBtn label="Rehacer (Ctrl+Y)" onClick={redo} className={cn('hidden sm:inline-flex', !history.future.length && 'opacity-40 pointer-events-none')}><Redo2 size={15} /></IconBtn>
          <IconBtn label="Volver al inicio" onClick={handleStop} className="hidden md:inline-flex"><RotateCcw size={15} /></IconBtn>
          <IconBtn label="Descargar la pieza como .mid" onClick={() => downloadSongAsMidi(activeSong)} className="hidden md:inline-flex"><Download size={15} /></IconBtn>
          <IconBtn label="Repetir la pieza al terminar" active={loopEnabled} onClick={() => setLoopEnabled(v => !v)}>
            <Repeat size={15} /><span className="hidden md:inline">Bucle</span>
          </IconBtn>
          <IconBtn label="Metrónomo" active={metronomeOn} onClick={() => setMetronomeOn(v => !v)} className="hidden sm:inline-flex"><Triangle size={15} /></IconBtn>
          <IconBtn label={micOn ? 'Micrófono activo: tocá tu piano acústico' : 'Escuchar el piano acústico por micrófono'} active={micOn} onClick={() => setMicOn(v => !v)}>
            {micOn ? <Mic size={15} /> : <MicOff size={15} />}
          </IconBtn>
          <div className="relative">
            <IconBtn label="Ajustes de la catarata" active={settingsOpen} onClick={() => { setSettingsOpen(v => !v); setHelpOpen(false); }}><Settings2 size={15} /></IconBtn>
            <AnimatePresence>
              {settingsOpen && (
                <Popover onClose={() => setSettingsOpen(false)} title="Ajustes">
                  <Row label="Modo de práctica">
                    <div className="seg w-full">
                      <button type="button" className="seg-item flex-1" data-active={practiceMode === 'wait'} onClick={() => setPracticeMode('wait')}>Espera</button>
                      <button type="button" className="seg-item flex-1" data-active={practiceMode === 'flow'} onClick={() => setPracticeMode('flow')}>Flujo</button>
                    </div>
                    <p className="text-[11px] text-ink-3 mt-1.5">
                      {practiceMode === 'wait' ? 'La catarata se detiene en la línea hasta que toques la nota correcta.' : 'Ritmo continuo al tempo real, con puntaje.'}
                    </p>
                  </Row>
                  <Row label="Velocidad">
                    <div className="seg w-full">
                      {[0.5, 0.75, 1, 1.25].map(s => (
                        <button key={s} type="button" className="seg-item flex-1 font-mono" data-active={playbackSpeed === s} onClick={() => setPlaybackSpeed(s)}>{s}×</button>
                      ))}
                    </div>
                  </Row>
                  <Row label="Teclado">
                    <div className="seg w-full">
                      {(['auto', '49', '61', '88'] as KeyboardRange[]).map(r => (
                        <button key={r} type="button" className="seg-item flex-1 font-mono" data-active={keyboardRange === r} onClick={() => setKeyboardRange(r)}>{r === 'auto' ? 'Auto' : `${r}T`}</button>
                      ))}
                    </div>
                  </Row>
                  <Row label="Timbre del alumno">
                    <div className="seg w-full">
                      {SOUND_PRESETS.map(p => (
                        <button key={p.id} type="button" className="seg-item flex-1" data-active={soundPreset === p.id} onClick={() => { setSoundPreset(p.id); saveSoundPreset(p.id); }}>{p.shortLabel}</button>
                      ))}
                    </div>
                  </Row>
                  <Toggle label="Nombres de nota en las teclas y notas" checked={showNoteLabels} onChange={setShowNoteLabels} />
                  <Row label="Escritura de las notas">
                    <div className="seg w-full">
                      <button type="button" className="seg-item flex-1" data-active={spellingMode === 'auto'} onClick={() => setSpellingMode('auto')}>Auto</button>
                      <button type="button" className="seg-item flex-1" data-active={spellingMode === 'sharp'} onClick={() => setSpellingMode('sharp')}>♯</button>
                      <button type="button" className="seg-item flex-1" data-active={spellingMode === 'flat'} onClick={() => setSpellingMode('flat')}>♭</button>
                    </div>
                    <p className="text-[11px] text-ink-3 mt-1.5">
                      {spellingMode === 'auto'
                        ? detectedKey
                          ? `Tonalidad deducida de la pieza: ${prettyAccidentals(keyLabel(detectedKey))}.`
                          : 'La pieza tiene pocas notas para deducir la tonalidad.'
                        : 'Todas las alteraciones con el mismo signo.'}
                    </p>
                  </Row>
                  <Toggle label="Modo rendimiento (efectos mínimos)" checked={minimalFx} onChange={setMinimalFx} />
                  <Row label="Pieza">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => downloadSongAsMidi(activeSong)} className="btn btn-secondary btn-sm bg-[#141b2b]">
                        <Download size={13} /> Descargar .mid
                      </button>
                      {activeSong.sourceJobId && (
                        <button type="button" onClick={revertTranscription} disabled={reverting} className="btn btn-ghost btn-sm">
                          {reverting ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Restablecer transcripción
                        </button>
                      )}
                    </div>
                    {revertMsg && <p className="text-[11px] text-ink-3 mt-1.5">{revertMsg}</p>}
                    {activeSong.sourceJobId && !revertMsg && (
                      <p className="text-[11px] text-ink-3 mt-1.5">Vuelve a pedir las notas del audio original; lo editado se puede recuperar con Ctrl+Z.</p>
                    )}
                  </Row>
                </Popover>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <IconBtn label="Ayuda" active={helpOpen} onClick={() => { setHelpOpen(v => !v); setSettingsOpen(false); }}><HelpCircle size={15} /></IconBtn>
            <AnimatePresence>
              {helpOpen && (
                <Popover onClose={() => setHelpOpen(false)} title="Cómo usar la catarata">
                  <ul className="text-[12.5px] text-ink-2 space-y-2 leading-relaxed">
                    <li><strong className="text-ink">Las notas caen hacia la línea roja.</strong> Tocá la tecla justo cuando la nota la toca.</li>
                    <li><strong className="text-ink">Pistas:</strong> ✓ muestra u oculta la mano, la manito marca la que practicás vos (en <em>Espera</em> la catarata frena hasta que la toques), <strong>S</strong> la deja sola, el parlante la silencia.</li>
                    <li><strong className="text-ink">Entrada:</strong> teclado USB MIDI, el teclado de pantalla o las teclas <span className="font-mono">A S D F G H J K</span> (blancas) y <span className="font-mono">W E T Y U</span> (negras). <span className="font-mono">Espacio</span> reproduce/pausa.</li>
                    <li><strong className="text-ink">Editar:</strong> arrastrá una nota para moverla, tirá del borde de salida para estirarla, y hacé doble clic en un lugar vacío para agregar una. Todo cae en la grilla; con <span className="font-mono">Alt</span> queda libre. Clic derecho abre el resto de las acciones.</li>
                    <li><strong className="text-ink">Varias notas:</strong> arrastrá sobre el vacío para encerrarlas, o <span className="font-mono">Shift</span>+clic para sumarlas de a una. <span className="font-mono">Ctrl+A</span> las selecciona todas. Después se mueven juntas, se borran juntas o se alinean a la grilla de una.</li>
                    <li><strong className="text-ink">Cuantizar:</strong> en el panel de Pistas elegís la grilla y alineás una pista entera. Es lo que arregla una transcripción de audio, que llega toda corrida unos milisegundos.</li>
                  </ul>
                  <div className={cn('mt-3 flex items-center gap-2 text-[11px]', midiDeviceName ? 'text-ok' : 'text-ink-3')}>
                    <Cable size={13} /> {midiDeviceName ? `MIDI conectado: ${midiDeviceName}` : 'Sin teclado MIDI conectado'}
                  </div>
                </Popover>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============ Cuerpo: pistas + escenario ============ */}
      <div className="flex-1 min-h-0 flex">
        {/* ---- Escenario ---- */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          <div className="relative flex-1 min-h-0">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full block cursor-pointer touch-none"
              onPointerDown={e => rollPointer(e, true)}
              onPointerUp={e => rollPointer(e, false)}
              onPointerLeave={e => rollPointer(e, false)}
              onPointerMove={onCanvasPointerMove}
              onPointerCancel={() => { endDrag(); marqueeRef.current = null; setMarquee(null); }}
              onDoubleClick={onCanvasDoubleClick}
              onContextMenu={onCanvasContextMenu}
            />

            {/* Marquesina */}
            {marquee && (
              <div
                className="absolute pointer-events-none rounded-[3px] border border-white/60 bg-white/10"
                style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
              />
            )}

            {/* Varias notas seleccionadas: acciones en bloque */}
            {selectedIds.size > 1 && !ctxMenu && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-white/12 bg-[#0d1322]/95 backdrop-blur px-2 py-1 text-xs">
                <span className="font-mono font-semibold text-ink px-1">{selectedIds.size} notas</span>
                <span className="text-ink-3 hidden sm:inline">arrastrá cualquiera para moverlas juntas</span>
                <span className="w-px h-4 bg-white/10 mx-1" />
                <button type="button" onClick={quantizeSelection} className="h-7 px-2 rounded-md flex items-center gap-1 text-ink-2 hover:bg-white/8" data-tip={`Alinear a la grilla de ${GRIDS.find(g => g.id === quantGrid)?.label}`}>
                  <Wand2 size={13} /> Cuantizar
                </button>
                {quantMsg && <span className="text-[11px] text-ok px-1">{quantMsg}</span>}
                <button type="button" onClick={deleteSelection} className="w-7 h-7 rounded-md flex items-center justify-center text-danger hover:bg-white/8" data-tip="Borrar las seleccionadas" aria-label="Borrar las seleccionadas">
                  <Trash2 size={13} />
                </button>
                <button type="button" onClick={() => selectOne(null)} className="w-7 h-7 rounded-md flex items-center justify-center text-ink-3 hover:bg-white/8" data-tip="Deseleccionar" aria-label="Deseleccionar">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Nota seleccionada: chip con acciones rápidas */}
            {selectedNote && selectedIds.size <= 1 && !ctxMenu && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-white/12 bg-[#0d1322]/95 backdrop-blur px-2 py-1 text-xs">
                <span className="font-mono font-semibold text-ink px-1">{prettyAccidentals(spellName(selectedNote.name))}</span>
                <span className="text-ink-3 font-mono">{selectedNote.time.toFixed(2)}s · {selectedNote.duration.toFixed(2)}s</span>
                <span className="w-px h-4 bg-white/10 mx-1" />
                {NOTE_ACTIONS.filter(a => ['up', 'down', 'earlier', 'later', 'shorter', 'longer', 'delete'].includes(a.id)).map(a => (
                  <button key={a.id} type="button" onClick={() => { editNote(selectedNote.id, a.apply); if (a.id === 'delete') setSelectedNoteId(null); }} className={cn('w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/8', a.id === 'delete' ? 'text-danger' : 'text-ink-2')} data-tip={a.label} aria-label={a.label}>
                    {a.icon}
                  </button>
                ))}
                <span className="text-[10.5px] text-ink-3 hidden md:inline pl-1">clic derecho: más opciones</span>
              </div>
            )}

            {/* Menú contextual de la nota */}
            <AnimatePresence>
              {ctxMenu && (() => {
                const n = activeSong.notes.find(x => x.id === ctxMenu.noteId);
                if (!n) return null;
                const close = () => setCtxMenu(null);
                return (
                  <motion.div
                    key={ctxMenu.noteId}
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}
                    style={{ left: ctxMenu.x, top: ctxMenu.y }}
                    className="absolute z-40 w-[224px] rounded-xl border border-white/12 bg-[#111828] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] p-1.5 text-[12.5px]"
                    role="menu"
                    onContextMenu={e => e.preventDefault()}
                  >
                    <div className="px-2 py-1.5 flex items-center justify-between">
                      <span className="font-mono font-semibold text-ink">{n.name}</span>
                      <span className="text-[11px] text-ink-3">{trackOf(noteTrackId(n)).name}</span>
                    </div>
                    {NOTE_ACTIONS.map(a => (
                      <button key={a.id} type="button" role="menuitem" onClick={() => { editNote(n.id, a.apply); if (a.id === 'delete') setSelectedNoteId(null); close(); }}
                        className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/8', a.id === 'delete' ? 'text-danger' : 'text-ink-2 hover:text-ink')}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                    {tracks.length > 1 && (
                      <>
                        <div className="my-1 border-t border-white/8" />
                        <div className="px-2 pt-1 pb-0.5 text-[10.5px] uppercase tracking-wider text-ink-3 flex items-center gap-1"><ArrowRightLeft size={11} /> Mover a pista</div>
                        {tracks.filter(t => t.id !== noteTrackId(n)).map(t => (
                          <button key={t.id} type="button" role="menuitem" onClick={() => { editNote(n.id, x => moveNoteToTrack(x, t.id)); close(); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-ink-2 hover:text-ink hover:bg-white/8">
                            <span className="w-2 h-2 rounded-full" style={{ background: t.color }} /> {t.name}
                          </button>
                        ))}
                      </>
                    )}
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Badges superpuestos */}
            <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
              {midiDeviceName && (
                <span className="badge badge-ok bg-[#0d1322]/80"><Cable size={11} /> {midiDeviceName}</span>
              )}
              <span className="badge badge-neutral bg-[#0d1322]/80 font-mono">
                {score} pts · {streak}<Flame size={10} className="text-orange-400" />
              </span>
              <AnimatePresence>
                {hitFeedback && (
                  <motion.span key={hitFeedback.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="badge badge-brand">
                    {hitFeedback.text}
                  </motion.span>
                )}
              </AnimatePresence>
              {micOn && <span className="badge badge-ok bg-[#0d1322]/80"><Mic size={11} /> Escuchando el piano</span>}
              {micError && <span className="badge badge-danger bg-[#0d1322]/80">{micError}</span>}
              {minimalFx && <span className="badge badge-brand bg-[#0d1322]/80">Modo rendimiento: efectos mínimos</span>}
              {!bothPracticing && (
                <span className="badge badge-neutral bg-[#0d1322]/80">
                  {tracks.filter(t => t.visible && t.practice).map(t => t.name).join(' + ') || 'Solo escucha'}
                </span>
              )}
            </div>

            {/* Overlay de inicio (no bloquea el lienzo: se puede editar con la pieza detenida) */}
            <AnimatePresence>
              {!isPlaying && currentTime === 0 && !selectedNote && !marquee && !ctxMenu && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none"
                >
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="pointer-events-auto w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.5)]"
                    aria-label="Reproducir"
                  >
                    <Play size={26} className="fill-current ml-1" />
                  </button>
                  <span className="text-center rounded-xl bg-[#0a0f1a]/70 backdrop-blur-[2px] px-4 py-2">
                    <span className="block font-serif font-semibold text-xl text-ink">{activeSong.title}</span>
                    <span className="block text-xs text-ink-2 mt-1">
                      {activeSong.composer} · {practiceMode === 'wait' ? 'Modo espera' : 'Modo flujo'} · {playbackSpeed}×
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Aviso modo espera */}
            <AnimatePresence>
              {waitingForKeys && practiceMode === 'wait' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 badge badge-brand bg-[#0d1322]/90 px-3 py-1 pointer-events-none">
                  Tocá la nota iluminada para seguir
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ---- Teclado (solo en vista vertical) ---- */}
          {viewMode === 'vertical' && (
            <div className="relative h-[150px] shrink-0 bg-[#0a0f1a] border-t-[3px] border-[#f43f5e]">
              <div className="relative flex h-full">
                {whiteKeys.map(k => {
                  const lit = hitNotes.has(k.midi) || pressedNotes.has(k.midi);
                  const isC = k.name.startsWith('C');
                  return (
                    <div
                      key={k.midi}
                      onPointerDown={e => { e.preventDefault(); handleUserNotePress(k.midi); }}
                      onPointerUp={() => handleUserNoteRelease(k.midi)}
                      onPointerLeave={() => handleUserNoteRelease(k.midi)}
                      className={cn(
                        'wf-key relative flex-1 min-w-0 border-r border-[#0a0f1a] rounded-b-[5px] flex flex-col justify-end items-center pb-2 cursor-pointer',
                        lit
                          ? 'wf-key--hit bg-orange-500 shadow-[inset_0_6px_10px_-4px_rgba(255,255,255,0.75),0_0_26px_rgba(249,115,22,0.8)] z-[1]'
                          : 'bg-[#2a3a58] hover:bg-[#33466a]',
                        lit && !minimalFx && 'wf-key--bloom'
                      )}
                    >
                      {lit && showNoteLabels && <span className="text-[10px] font-mono font-bold text-[#1a1405] mb-4">{prettyAccidentals(spellName(k.name))}</span>}
                      {isC && !lit && <span className="text-[13px] font-mono text-white/35">{k.name}</span>}
                    </div>
                  );
                })}
                {pianoKeys.filter(k => k.isBlack).map(k => {
                  const lit = hitNotes.has(k.midi) || pressedNotes.has(k.midi);
                  const total = whiteKeys.length;
                  const leftPct = (k.whiteIndex / total) * 100;
                  const wPct = (0.62 / total) * 100;
                  return (
                    <div
                      key={k.midi}
                      style={{ left: `calc(${leftPct}% - ${wPct / 2}%)`, width: `${wPct}%`, height: '60%' }}
                      onPointerDown={e => { e.preventDefault(); handleUserNotePress(k.midi); }}
                      onPointerUp={() => handleUserNoteRelease(k.midi)}
                      onPointerLeave={() => handleUserNoteRelease(k.midi)}
                      className={cn(
                        'wf-key absolute top-0 rounded-b-[4px] z-10 cursor-pointer flex items-end justify-center pb-1.5',
                        lit
                          ? 'wf-key--hit bg-orange-500 shadow-[inset_0_5px_9px_-4px_rgba(255,255,255,0.7),0_0_26px_rgba(249,115,22,0.9)]'
                          : 'bg-[#0b1020] hover:bg-[#121a2e] shadow-[0_4px_8px_rgba(0,0,0,0.6)]',
                        lit && !minimalFx && 'wf-key--bloom'
                      )}
                    >
                      {lit && showNoteLabels && <span className="text-[9px] font-mono font-bold text-[#1a1405]">{prettyAccidentals(spellName(k.name))}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ Transporte ============ */}
      <div className="h-[68px] shrink-0 flex items-center gap-3 px-3 border-t border-white/8 bg-[#0d1322]">
        <button
          type="button"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-[0_0_24px_rgba(249,115,22,0.45)] transition-colors shrink-0"
        >
          {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
        </button>
        <button type="button" onClick={handleStop} aria-label="Detener" className="w-10 h-10 rounded-full bg-[#141b2b] border border-white/10 text-ink-2 hover:text-ink flex items-center justify-center shrink-0">
          <Square size={13} className="fill-current" />
        </button>
        <span className="font-mono text-[13px] text-ink tabular-nums whitespace-nowrap">
          {fmtTime(Math.min(currentTime, duration))} <span className="text-ink-3">/ {fmtTime(duration)}</span>
        </span>
        <div className="flex-1 relative h-10 flex items-center">
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          <input
            type="range" min={0} max={duration} step={0.1} value={Math.min(currentTime, duration)}
            onChange={e => seekTo(parseFloat(e.target.value))}
            aria-label="Posición"
            className="absolute inset-x-0 w-full h-10 opacity-0 cursor-pointer"
          />
          <div className="absolute w-4 h-4 rounded-full bg-white shadow -translate-x-1/2 pointer-events-none" style={{ left: `${progressPct}%` }} />
        </div>
        <IconBtn label={isMuted ? 'Activar acompañamiento' : 'Silenciar acompañamiento'} active={false} onClick={() => setIsMuted(v => !v)}>
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </IconBtn>
        <IconBtn label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={handleToggleFullscreen}>
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </IconBtn>
      </div>

      {/* Soltar archivos: la capa cubre toda la catarata, no un rectángulo
          chico, porque uno suelta donde está mirando. */}
      <AnimatePresence>
        {dropActive && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-[#0a0f1a]/85 backdrop-blur-sm pointer-events-none"
          >
            <div className="m-4 flex-1 max-w-lg rounded-3xl border-2 border-dashed border-brand-line bg-brand-soft px-8 py-10 text-center space-y-2">
              <FileMusic size={34} className="mx-auto text-brand" />
              <div className="font-serif font-semibold text-lg text-ink">Soltá tus archivos MIDI</div>
              <div className="text-[13px] text-ink-2">
                Podés soltar varios a la vez, o una carpeta entera. Se guardan en tu cuenta y se abren acá.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aviso del resultado de la importación */}
      <AnimatePresence>
        {(importing || importMsg) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className={cn(
              'absolute left-1/2 -translate-x-1/2 bottom-20 z-[60] rounded-xl border px-3.5 py-2 text-[12.5px] flex items-center gap-2 shadow-lg max-w-[92%]',
              importing ? 'border-line bg-[#111828] text-ink-2'
                : importMsg?.ok ? 'border-ok/40 bg-[#111828] text-ok'
                : 'border-danger/40 bg-[#111828] text-danger'
            )}
            role="status"
          >
            {importing
              ? <><Loader2 size={14} className="animate-spin" /> Leyendo los MIDI…</>
              : <><FileMusic size={14} className="shrink-0" /> <span className="min-w-0">{importMsg?.text}</span></>}
          </motion.div>
        )}
      </AnimatePresence>

      <PieceLibraryModal
        open={libraryOpen}
        activeId={activeSongId}
        onClose={() => setLibraryOpen(false)}
        onSelect={selectSong}
        onUpload={() => { setLibraryOpen(false); fileInputRef.current?.click(); }}
        onDropFiles={ingestFiles}
        onRenamed={(id, patch) => setSongList(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))}
      />

      {pendingImport && (
        <MidiImportDialog
          pending={pendingImport.pending}
          failed={pendingImport.failed}
          busy={importing}
          onCancel={() => setPendingImport(null)}
          onConfirm={songs => { void confirmImport(songs); }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Piezas pequeñas de UI                                              */
/* ------------------------------------------------------------------ */

const TrackBtn: React.FC<{ label: string; active: boolean; activeClass: string; onClick: () => void; children: React.ReactNode }> =
  ({ label, active, activeClass, onClick, children }) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={cn(
        'w-7 h-7 rounded-md border border-white/10 bg-[#141b2b] text-[11px] font-mono font-bold flex items-center justify-center transition-colors',
        active ? activeClass : 'text-ink-3/60 hover:text-ink-2'
      )}
    >
      {children}
    </button>
  );



