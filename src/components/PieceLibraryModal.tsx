import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Star, Clock, Music2, Upload, BookOpen, Youtube, Waves, ListMusic, Loader2, FileMusic, Trash2,
  Pencil, Check,
} from 'lucide-react';
import {
  catalog, search, SOURCE_LABEL, loadLibraryState, toggleFavorite,
  type LibraryPiece, type PieceSource, type Difficulty, type LibraryState,
} from '../lib/pieceLibrary';
import { deleteSong, renameSong } from '../lib/songStore';
import { dragHasFiles, filesFromDrop } from '../lib/midiImport';
import { cn } from '../lib/utils';

const SOURCE_ICON: Record<PieceSource, typeof Music2> = {
  midi: Music2, imported: Upload, stems: Youtube, method: BookOpen, scale: Waves,
};
const DIFF_STYLE: Record<Difficulty, string> = {
  'Fácil': 'text-ok',
  'Intermedio': 'text-brand-2',
  'Avanzado': 'text-warn',
};
const SOURCES: PieceSource[] = ['midi', 'imported', 'stems', 'method', 'scale'];

const fmtDur = (s: number) => s > 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '—';

interface Props {
  open: boolean;
  activeId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onUpload?: () => void;
  /** Archivos soltados sobre la biblioteca: los importa la catarata. */
  onDropFiles?: (files: File[]) => Promise<void> | void;
  /** Avisa que una pieza cambió de nombre, para refrescarla afuera. */
  onRenamed?: (id: string, patch: { title: string; composer: string }) => void;
}

/**
 * Biblioteca de piezas.
 *
 * Reemplaza el `<select>` nativo, que con seis piezas alcanzaba y con
 * doscientas es inusable. Se abre con la tecla / o desde el botón de la pieza,
 * el foco cae en el buscador y se navega con las flechas: la idea es escribir
 * dos letras y apretar Enter sin sacar las manos del teclado.
 *
 * El catálogo se arma una sola vez al abrir. Las piezas generadas (escalas,
 * ejercicios de método) no traen sus notas hasta que se eligen.
 */
export const PieceLibraryModal: React.FC<Props> = ({ open, activeId, onClose, onSelect, onUpload, onDropFiles, onRenamed }) => {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<PieceSource | 'all' | 'fav' | 'recent'>('all');
  const [diff, setDiff] = useState<Difficulty | 'all'>('all');
  const [lib, setLib] = useState<LibraryState>(() => loadLibraryState());
  const [cursor, setCursor] = useState(0);
  const [pieces, setPieces] = useState<LibraryPiece[] | null>(null);
  const [dropActive, setDropActive] = useState(false);
  /* Renombrar en el lugar: la fila se convierte en dos campos. */
  const [editing, setEditing] = useState<{ id: string; title: string; composer: string } | null>(null);
  const [savingName, setSavingName] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // El catálogo se arma al abrir, no en cada tecla
  useEffect(() => {
    if (!open) { setPieces(null); setEditing(null); return; }
    setQuery(''); setCursor(0); setEditing(null);
    setLib(loadLibraryState());
    const t = setTimeout(() => setPieces(catalog()), 0);
    setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const results = useMemo(() => {
    if (!pieces) return [];
    let base = pieces;
    if (source === 'fav') base = base.filter(p => lib.favorites.includes(p.id));
    else if (source === 'recent') base = lib.recent.map(id => pieces.find(p => p.id === id)).filter((p): p is LibraryPiece => !!p);
    else if (source !== 'all') base = base.filter(p => p.source === source);
    if (diff !== 'all') base = base.filter(p => p.difficulty === diff);
    const found = search(base, query);
    // Sin búsqueda, los favoritos primero: es lo que uno quiere ver al abrir
    if (!query && source !== 'recent') {
      const fav = new Set(lib.favorites);
      return [...found].sort((a, b) => Number(fav.has(b.id)) - Number(fav.has(a.id)));
    }
    return found;
  }, [pieces, query, source, diff, lib]);

  useEffect(() => { setCursor(0); }, [query, source, diff]);

  // Teclado: flechas para moverse, Enter para abrir, Escape para salir
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (editing) {
        if (e.key === 'Escape') { e.preventDefault(); setEditing(null); }
        return;   // mientras se renombra, el teclado es del formulario
      }
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(results.length - 1, c + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
      else if (e.key === 'Enter' && results[cursor]) { e.preventDefault(); onSelect(results[cursor].id); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, cursor, onSelect, onClose, editing]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const commitRename = async () => {
    if (!editing) return;
    const { id, title, composer } = editing;
    setSavingName(true);
    await renameSong(id, { title, composer }).catch(() => {});
    setSavingName(false);
    const clean = { title: title.trim() || 'Sin título', composer: composer.trim() || 'MIDI importado' };
    setPieces(list => (list ? list.map(x => (x.id === id ? { ...x, ...clean } : x)) : list));
    onRenamed?.(id, clean);
    setEditing(null);
  };

  const removePiece = async (p: LibraryPiece) => {
    await deleteSong(p.id);
    setPieces(list => (list ? list.filter(x => x.id !== p.id) : list));
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: pieces?.length ?? 0, fav: lib.favorites.length, recent: lib.recent.length };
    for (const s of SOURCES) c[s] = pieces?.filter(p => p.source === s).length ?? 0;
    return c;
  }, [pieces, lib]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.16 }}
          onClick={e => e.stopPropagation()}
          onDragEnter={e => { if (!dragHasFiles(e.dataTransfer)) return; e.preventDefault(); dragDepth.current++; setDropActive(true); }}
          onDragOver={e => { if (!dragHasFiles(e.dataTransfer)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDragLeave={e => { if (!dragHasFiles(e.dataTransfer)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDropActive(false); }}
          onDrop={async e => {
            if (!dragHasFiles(e.dataTransfer) || !onDropFiles) return;
            e.preventDefault();
            dragDepth.current = 0; setDropActive(false);
            const files = await filesFromDrop(e.dataTransfer);
            onClose();
            await onDropFiles(files);
          }}
          role="dialog" aria-label="Biblioteca de piezas"
          className="relative w-full max-w-3xl card overflow-hidden flex flex-col max-h-[86vh] mt-[4vh]"
        >
          {dropActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-brand-line bg-brand-soft/90 backdrop-blur-sm pointer-events-none">
              <div className="text-center space-y-1.5">
                <FileMusic size={30} className="mx-auto text-brand" />
                <div className="font-serif font-semibold text-ink">Soltá acá tus MIDI</div>
                <div className="text-[12.5px] text-ink-2">Varios archivos o una carpeta entera</div>
              </div>
            </div>
          )}
          {/* Buscador */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <Search size={16} className="text-ink-3 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por título, compositor, tonalidad, libro…"
              className="flex-1 min-w-0 bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
            />
            {onUpload && (
              <button type="button" onClick={onUpload} className="btn btn-secondary btn-sm shrink-0" data-tip="Subir un archivo .mid">
                <Upload size={13} /> <span className="hidden sm:inline">Subir MIDI</span>
              </button>
            )}
            <button type="button" onClick={onClose} className="btn btn-ghost btn-icon shrink-0" aria-label="Cerrar">
              <X size={15} />
            </button>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line overflow-x-auto no-scrollbar">
            {([['all', 'Todas', ListMusic], ['fav', 'Favoritas', Star], ['recent', 'Recientes', Clock]] as const).map(([id, label, Icon]) => (
              <button
                key={id} type="button" onClick={() => setSource(id)}
                className={cn('shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                  source === id ? 'bg-brand-soft border-brand-line text-brand-2' : 'bg-surface-2 border-line text-ink-2 hover:text-ink')}
              >
                <Icon size={12} /> {label}
                <span className="font-mono text-[10px] text-ink-3">{counts[id]}</span>
              </button>
            ))}
            <span className="w-px h-4 bg-line shrink-0 mx-0.5" />
            {SOURCES.map(s => {
              const Icon = SOURCE_ICON[s];
              return (
                <button
                  key={s} type="button" onClick={() => setSource(s)}
                  className={cn('shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                    source === s ? 'bg-brand-soft border-brand-line text-brand-2' : 'bg-surface-2 border-line text-ink-2 hover:text-ink')}
                >
                  <Icon size={12} /> {SOURCE_LABEL[s]}
                  <span className="font-mono text-[10px] text-ink-3">{counts[s]}</span>
                </button>
              );
            })}
            <span className="w-px h-4 bg-line shrink-0 mx-0.5" />
            {(['all', 'Fácil', 'Intermedio', 'Avanzado'] as const).map(d => (
              <button
                key={d} type="button" onClick={() => setDiff(d)}
                className={cn('shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                  diff === d ? 'bg-brand-soft border-brand-line text-brand-2' : 'bg-surface-2 border-line text-ink-2 hover:text-ink')}
              >
                {d === 'all' ? 'Todo nivel' : d}
              </button>
            ))}
          </div>

          {/* Resultados */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-2">
            {!pieces ? (
              <div className="flex items-center justify-center gap-2 py-14 text-ink-3 text-sm">
                <Loader2 size={15} className="animate-spin" /> Armando la biblioteca…
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-14 space-y-1.5">
                <div className="text-sm text-ink-2">No hay piezas que coincidan.</div>
                <div className="text-[12.5px] text-ink-3">
                  Probá con menos palabras, soltá archivos .mid acá mismo, o pegá un link de YouTube en Bases .WAV.
                </div>
              </div>
            ) : (
              results.map((p, i) => {
                const Icon = SOURCE_ICON[p.source];
                const fav = lib.favorites.includes(p.id);
                const propia = p.source === 'imported' || p.source === 'stems';

                if (editing?.id === p.id) {
                  return (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-2 border border-brand-line">
                      <Icon size={15} className="shrink-0 text-brand-2" />
                      <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          autoFocus
                          value={editing.title}
                          onChange={e => setEditing({ ...editing, title: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void commitRename(); } }}
                          className="input w-full"
                          placeholder="Título"
                          aria-label="Título de la pieza"
                        />
                        <input
                          value={editing.composer}
                          onChange={e => setEditing({ ...editing, composer: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void commitRename(); } }}
                          className="input w-full"
                          placeholder="Autor"
                          aria-label="Autor de la pieza"
                        />
                      </div>
                      <button type="button" onClick={() => void commitRename()} disabled={savingName}
                        className="btn btn-primary btn-icon shrink-0" aria-label="Guardar el nombre">
                        {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button type="button" onClick={() => setEditing(null)} disabled={savingName}
                        className="btn btn-ghost btn-icon shrink-0" aria-label="Cancelar">
                        <X size={14} />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={p.id} data-i={i}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => { onSelect(p.id); onClose(); }}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                      i === cursor ? 'bg-brand-soft' : 'hover:bg-surface-2',
                      p.id === activeId && 'ring-1 ring-brand-line'
                    )}
                  >
                    <Icon size={15} className={cn('shrink-0', i === cursor ? 'text-brand-2' : 'text-ink-3')} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-ink truncate">{p.title}</div>
                      <div className="text-[11.5px] text-ink-3 truncate">
                        {p.composer}
                        {p.description && <> · {p.description}</>}
                        {p.trackNames?.length ? <> · {p.trackNames.length} pistas</> : null}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2.5 shrink-0 text-[11px] font-mono text-ink-3">
                      <span className={DIFF_STYLE[p.difficulty]}>{p.difficulty}</span>
                      <span>{p.bpm} bpm</span>
                      <span className="w-9 text-right">{fmtDur(p.duration)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setLib(toggleFavorite(lib, p.id)); }}
                      className="shrink-0 p-1 rounded-lg hover:bg-surface-3"
                      aria-label={fav ? 'Sacar de favoritas' : 'Marcar como favorita'}
                    >
                      <Star size={14} className={cn(fav ? 'text-brand fill-current' : 'text-ink-3 opacity-0 group-hover:opacity-100')} />
                    </button>
                    {propia && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setEditing({ id: p.id, title: p.title, composer: p.composer }); }}
                        className="shrink-0 p-1 rounded-lg text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-surface-3 hover:text-ink"
                        aria-label={`Renombrar ${p.title}`}
                        data-tip="Cambiar el nombre y el autor"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {propia && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); void removePiece(p); }}
                        className="shrink-0 p-1 rounded-lg text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-danger-soft hover:text-danger"
                        aria-label={`Borrar ${p.title}`}
                        data-tip="Borrar esta pieza"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-line flex items-center justify-between text-[11px] text-ink-3">
            <span>{results.length} {results.length === 1 ? 'pieza' : 'piezas'}</span>
            <span className="hidden sm:flex items-center gap-2.5 font-mono">
              <span>↑↓ moverse</span><span>↵ abrir</span><span>esc cerrar</span>
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
