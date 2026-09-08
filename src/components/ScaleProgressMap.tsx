import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, CheckCircle2, Clock, Sparkles, Volume2, Play, Pause,
  Sliders, Filter, Search, RotateCcw, ArrowRight, Eye, ChevronRight,
  Music, BookOpen, Layers, Award, Check, X, Info, Flame, ShieldAlert,
  Compass, Grid, BarChart3, HelpCircle
} from 'lucide-react';
import { 
  ScaleCategory, ScaleMasteryStatus, ScaleMasteryEntry,
  TONALITIES_DATABASE, SCALE_CATEGORIES_CONFIG,
  loadScaleMasteryData, updateScaleMasteryStatus, resetAllScaleMastery,
  computeScaleMasteryStats, getScaleMasteryKey
} from '../lib/scaleMasteryStorage';
import { 
  SCALES_DATABASE, calculateScaleNotes, CHROMATIC_NOTES, ENHARMONIC_MAP 
} from '../lib/musicGymTheory';
import { WaterfallDemoModal } from './WaterfallDemoModal';
import { buildWaterfallFromScale } from '../lib/midiWaterfall';
import { soundEngine, getSavedSoundPreset } from '../lib/soundPresets';
import { cn } from '../lib/utils';

interface ScaleProgressMapProps {
  onSelectScaleForPiano?: (notes: string[], info: { name: string; root: string; type: string }) => void;
}

// Classical fingering standards by key
function getScaleFingeringByRoot(root: string, category: ScaleCategory): {
  rightHand: number[];
  leftHand: number[];
  thumbPassRight: number; // index after which thumb passes under
  thumbPassLeft: number;  // index after which finger crosses over
} {
  const norm = CHROMATIC_NOTES.includes(root) ? root : (ENHARMONIC_MAP[root] || root);

  // Default standard fingering
  let rh = [1, 2, 3, 1, 2, 3, 4, 5];
  let lh = [5, 4, 3, 2, 1, 3, 2, 1];
  let thumbR = 2; // after 3rd note
  let thumbL = 4; // after thumb (1st finger of hand)

  if (norm === 'F') {
    rh = [1, 2, 3, 4, 1, 2, 3, 4];
    lh = [5, 4, 3, 2, 1, 3, 2, 1];
    thumbR = 3;
  } else if (norm === 'B') {
    rh = [1, 2, 3, 1, 2, 3, 4, 5];
    lh = [4, 3, 2, 1, 4, 3, 2, 1];
    thumbL = 3;
  } else if (norm === 'F#') {
    rh = [2, 3, 4, 1, 2, 3, 1, 2];
    lh = [4, 3, 2, 1, 3, 2, 1, 4];
    thumbR = 2;
    thumbL = 3;
  } else if (norm === 'C#' || norm === 'Db') {
    rh = [2, 3, 1, 2, 3, 4, 1, 2];
    lh = [3, 2, 1, 4, 3, 2, 1, 3];
    thumbR = 1;
    thumbL = 2;
  } else if (norm === 'Ab' || norm === 'G#') {
    rh = [3, 4, 1, 2, 3, 1, 2, 3];
    lh = [3, 2, 1, 4, 3, 2, 1, 3];
    thumbR = 1;
    thumbL = 2;
  } else if (norm === 'Eb' || norm === 'D#') {
    rh = [3, 1, 2, 3, 4, 1, 2, 3];
    lh = [3, 2, 1, 4, 3, 2, 1, 3];
    thumbR = 0;
    thumbL = 2;
  } else if (norm === 'Bb' || norm === 'A#') {
    rh = [4, 1, 2, 3, 1, 2, 3, 4];
    lh = [3, 2, 1, 4, 3, 2, 1, 3];
    thumbR = 0;
    thumbL = 2;
  }

  return { rightHand: rh, leftHand: lh, thumbPassRight: thumbR, thumbPassLeft: thumbL };
}

export const ScaleProgressMap: React.FC<ScaleProgressMapProps> = ({
  onSelectScaleForPiano
}) => {
  // State for scale mastery data
  const [masteryData, setMasteryData] = useState<Record<string, ScaleMasteryEntry>>(() => loadScaleMasteryData());

  // Filters
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<ScaleCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ScaleMasteryStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'circle' | 'chromatic'>('circle');
  const [viewStyle, setViewStyle] = useState<'grid' | 'circle'>('grid');

  // Selected Scale for Inspector Drawer
  const [selectedScaleKey, setSelectedScaleKey] = useState<string>('C_major');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isWaterfallModalOpen, setIsWaterfallModalOpen] = useState(false);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Inspector edit state
  const [bpmInput, setBpmInput] = useState<number>(100);
  const [handsTogetherInput, setHandsTogetherInput] = useState<boolean>(true);

  // Compute live statistics
  const stats = useMemo(() => computeScaleMasteryStats(masteryData), [masteryData]);

  // Cleanup audio playback on unmount
  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    };
  }, []);

  // Update inspector edit fields when selected scale changes
  useEffect(() => {
    const entry = masteryData[selectedScaleKey];
    if (entry) {
      setBpmInput(entry.bpm || 100);
      setHandsTogetherInput(entry.handsTogether ?? true);
    }
  }, [selectedScaleKey, masteryData]);

  // Handle status update
  const handleUpdateStatus = (scaleId: string, newStatus: ScaleMasteryStatus, options?: { bpm?: number; handsTogether?: boolean }) => {
    const updated = updateScaleMasteryStatus(scaleId, newStatus, options);
    setMasteryData({ ...updated });
  };

  // Play scale audio ascending and descending
  const handlePlayScaleAudio = (notes: string[]) => {
    if (isPlayingAudio) {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      setIsPlayingAudio(false);
      return;
    }

    if (notes.length === 0) return;
    setIsPlayingAudio(true);

    // Ascending + Descending sequence
    const fullSequence = [...notes, ...[...notes].reverse().slice(1)];
    const preset = getSavedSoundPreset();
    let currentIdx = 0;

    audioIntervalRef.current = setInterval(() => {
      if (currentIdx < fullSequence.length) {
        soundEngine.playNote(fullSequence[currentIdx], preset, '8n');
        currentIdx++;
      } else {
        if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
        setIsPlayingAudio(false);
      }
    }, 240);
  };

  // Preview on piano keyboard & staff
  const handlePreviewOnPiano = (root: string, category: ScaleCategory) => {
    const scaleObj = SCALES_DATABASE.find(s => s.id === category) || SCALES_DATABASE[0];
    const notes = calculateScaleNotes(root, scaleObj, 4);
    const catConfig = SCALE_CATEGORIES_CONFIG[category];

    if (onSelectScaleForPiano) {
      onSelectScaleForPiano(notes, {
        name: `${root} ${catConfig.shortName}`,
        root,
        type: catConfig.shortName,
      });
    }
  };

  // Reset all progress confirmation
  const handleReset = () => {
    if (window.confirm('¿Estás seguro de que deseas reiniciar todos los registros de dominio de escalas?')) {
      const reset = resetAllScaleMastery();
      setMasteryData({ ...reset });
    }
  };

  // Selected scale object for inspector
  const activeEntry = masteryData[selectedScaleKey] || {
    scaleId: 'C_major',
    root: 'C',
    category: 'major',
    status: 'pending',
    bpm: 60,
    handsTogether: false,
    accuracy: 0,
    notesCount: 8,
  };

  const activeTonality = TONALITIES_DATABASE.find(t => t.root === activeEntry.root) || TONALITIES_DATABASE[0];
  const activeCatConfig = SCALE_CATEGORIES_CONFIG[activeEntry.category];
  const activeScaleObj = SCALES_DATABASE.find(s => s.id === activeEntry.category) || SCALES_DATABASE[0];
  const activeNotes = calculateScaleNotes(activeEntry.root, activeScaleObj, 4);
  const activeFingering = getScaleFingeringByRoot(activeEntry.root, activeEntry.category);

  // Filter and sort scale items for the grid
  const filteredScalesList = useMemo(() => {
    const list: Array<{
      entry: ScaleMasteryEntry;
      tonality: typeof TONALITIES_DATABASE[0];
      config: typeof SCALE_CATEGORIES_CONFIG[ScaleCategory];
      notes: string[];
    }> = [];

    // Sort tonalities
    const sortedTonalities = [...TONALITIES_DATABASE].sort((a, b) => {
      if (sortOrder === 'circle') return a.circleOrder - b.circleOrder;
      return a.root.localeCompare(b.root);
    });

    const categories: ScaleCategory[] = ['major', 'minor_harmonic', 'minor_melodic'];

    sortedTonalities.forEach(tonality => {
      categories.forEach(cat => {
        const scaleId = getScaleMasteryKey(tonality.root, cat);
        const entry = masteryData[scaleId] || {
          scaleId,
          root: tonality.root,
          category: cat,
          status: 'pending',
          bpm: 60,
          handsTogether: false,
          accuracy: 0,
          notesCount: 8,
        };

        // Category filter
        if (selectedCategoryFilter !== 'all' && cat !== selectedCategoryFilter) {
          return;
        }

        // Status filter
        if (statusFilter !== 'all' && entry.status !== statusFilter) {
          return;
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchRoot = tonality.root.toLowerCase().includes(q) || tonality.rootEs.toLowerCase().includes(q);
          const matchCat = SCALE_CATEGORIES_CONFIG[cat].nameEs.toLowerCase().includes(q) || SCALE_CATEGORIES_CONFIG[cat].shortName.toLowerCase().includes(q);
          const matchAcc = tonality.accidentals.toLowerCase().includes(q);
          if (!matchRoot && !matchCat && !matchAcc) return;
        }

        const scaleObj = SCALES_DATABASE.find(s => s.id === cat) || SCALES_DATABASE[0];
        const notes = calculateScaleNotes(tonality.root, scaleObj, 4);

        list.push({
          entry,
          tonality,
          config: SCALE_CATEGORIES_CONFIG[cat],
          notes,
        });
      });
    });

    return list;
  }, [masteryData, selectedCategoryFilter, statusFilter, searchQuery, sortOrder]);

  return (
    <div id="scale-progress-map-section" className="w-full space-y-8">
      {/* HERO SUMMARY & MASTERY KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Global Progress Card */}
        <div className="md:col-span-1 p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-black/50 to-amber-950/20 border border-amber-400/30 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-brand-2 font-bold flex items-center gap-1.5">
                <Trophy size={14} />
                <span>Dominio Total</span>
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-brand-2 border border-amber-400/30 font-bold">
                {stats.masteredPercentage}%
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-serif font-black text-ink">
                {stats.masteredCount}
              </span>
              <span className="text-sm font-mono text-ink-3">/ {stats.totalCount} Escalas</span>
            </div>

            <p className="text-xs font-light text-ink-2 leading-relaxed">
              Progreso integral en tonalidades mayores y menores del piano.
            </p>
          </div>

          {/* Mastered Progress Bar */}
          <div className="pt-4 space-y-1.5">
            <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden p-0.5 border border-line">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${stats.masteredPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-ink-3">
              <span>{stats.inProgressCount} en práctica</span>
              <span>{stats.pendingCount} por iniciar</span>
            </div>
          </div>
        </div>

        {/* 3 Categories Breakdown: Major, Minor Harmonic, Minor Melodic */}
        {(['major', 'minor_harmonic', 'minor_melodic'] as ScaleCategory[]).map(catKey => {
          const cfg = SCALE_CATEGORIES_CONFIG[catKey];
          const catStat = stats.byCategory[catKey];
          const isSelectedFilter = selectedCategoryFilter === catKey;

          return (
            <button
              key={catKey}
              type="button"
              onClick={() => setSelectedCategoryFilter(prev => prev === catKey ? 'all' : catKey)}
              className={cn(
                "p-5 rounded-3xl border transition-all text-left flex flex-col justify-between group relative overflow-hidden",
                isSelectedFilter
                  ? "bg-surface-3 border-amber-400 ring-2 ring-amber-400/30 shadow-lg"
                  : "bg-black/40 border-line hover:border-line-strong hover:bg-white/[0.03]"
              )}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-mono font-bold uppercase tracking-wider", cfg.color)}>
                    {cfg.shortName}
                  </span>
                  <span className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                    cfg.badgeBg
                  )}>
                    {catStat.mastered} / {catStat.total}
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-serif font-bold text-ink group-hover:text-brand-2 transition-colors">
                  {catStat.percentage}% <span className="text-xs font-mono text-ink-3 font-normal">dominadas</span>
                </div>

                <p className="text-[11px] font-light text-ink-2 line-clamp-2">
                  {cfg.formula} • {cfg.description}
                </p>
              </div>

              {/* Progress bar per category */}
              <div className="pt-4 space-y-1 w-full">
                <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      catKey === 'major' ? 'bg-amber-400' : catKey === 'minor_harmonic' ? 'bg-rose-400' : 'bg-cyan-400'
                    )}
                    style={{ width: `${catStat.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-ink-3">
                  <span>{catStat.inProgress} en práctica</span>
                  <span className="text-brand-2 group-hover:underline">
                    {isSelectedFilter ? 'Filtro activo' : 'Filtrar'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CONTROLS BAR: CATEGORY TABS, STATUS FILTER, SEARCH & SORT */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-black/40 border border-line backdrop-blur-xl">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all",
              selectedCategoryFilter === 'all'
                ? "bg-amber-400 text-black shadow"
                : "bg-surface-2 text-ink-2 hover:text-ink"
            )}
          >
            Todas ({stats.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('major')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5",
              selectedCategoryFilter === 'major'
                ? "bg-amber-400 text-black shadow"
                : "bg-surface-2 text-brand-2 hover:text-ink"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Mayores (12)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('minor_harmonic')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5",
              selectedCategoryFilter === 'minor_harmonic'
                ? "bg-rose-500 text-ink shadow"
                : "bg-surface-2 text-danger hover:text-ink"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Menores Armónicas (12)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('minor_melodic')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5",
              selectedCategoryFilter === 'minor_melodic'
                ? "bg-cyan-500 text-black font-bold shadow"
                : "bg-surface-2 text-info hover:text-ink"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Menores Melódicas (12)</span>
          </button>
        </div>

        {/* Right tools: Status filter & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-black/60 border border-line-strong text-ink-2 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="mastered">⭐ Solo Dominadas ({stats.masteredCount})</option>
            <option value="in_progress">⏳ Solo En Práctica ({stats.inProgressCount})</option>
            <option value="pending">🔒 Solo Por Iniciar ({stats.pendingCount})</option>
          </select>

          {/* Search input */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              placeholder="Buscar tonalidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/60 border border-line-strong text-ink rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-400 w-36 sm:w-44"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-xl bg-surface-2 hover:bg-rose-500/20 text-ink-3 hover:text-danger border border-line transition-colors"
            title="Reiniciar progreso"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT: 2 COLUMNS (MAP GRID + SCALE INSPECTOR DRAWER) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: TONAL PROGRESS GRID (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-ink-3 px-1">
            <span>Mostrando {filteredScalesList.length} tonalidades configuradas:</span>
            <div className="flex items-center gap-2">
              <span>Ordenar por:</span>
              <button
                type="button"
                onClick={() => setSortOrder(p => p === 'circle' ? 'chromatic' : 'circle')}
                className="text-brand-2 hover:underline font-bold"
              >
                {sortOrder === 'circle' ? 'Círculo de Quintas' : 'Cromático'}
              </button>
            </div>
          </div>

          {filteredScalesList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-black/40 border border-line space-y-3">
              <Info size={28} className="mx-auto text-brand-2" />
              <h4 className="text-base font-serif font-bold text-ink">No se encontraron escalas</h4>
              <p className="text-xs font-mono text-ink-3">
                Prueba ajustando los filtros de categoría, estado o búsqueda.
              </p>
              <button
                type="button"
                onClick={() => { setSelectedCategoryFilter('all'); setStatusFilter('all'); setSearchQuery(''); }}
                className="px-4 py-2 rounded-xl bg-surface-3 hover:bg-surface-3 text-xs font-mono text-ink"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredScalesList.map(({ entry, tonality, config, notes }) => {
                const isSelected = selectedScaleKey === entry.scaleId;
                const isMastered = entry.status === 'mastered';
                const isInProgress = entry.status === 'in_progress';

                return (
                  <motion.div
                    whileHover={{ scale: 1.015 }}
                    key={entry.scaleId}
                    onClick={() => {
                      setSelectedScaleKey(entry.scaleId);
                      handlePreviewOnPiano(entry.root, entry.category);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden",
                      isSelected
                        ? "bg-amber-400/15 border-amber-400 ring-2 ring-amber-400/30 shadow-xl"
                        : isMastered
                          ? "bg-gradient-to-br from-emerald-500/10 via-black/50 to-black/60 border-emerald-500/30 hover:border-emerald-400/60"
                          : isInProgress
                            ? "bg-gradient-to-br from-cyan-500/10 via-black/50 to-black/60 border-cyan-500/30 hover:border-cyan-400/60"
                            : "bg-black/40 border-line hover:border-white/25"
                    )}
                  >
                    {/* Top Row: Tonality Badge + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-serif font-black text-lg transition-transform",
                          isMastered 
                            ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/30"
                            : isInProgress
                              ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                              : "bg-surface-3 text-ink"
                        )}>
                          {tonality.root}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-serif font-bold text-ink text-base">
                              {tonality.rootEs}
                            </span>
                            <span className={cn("text-[10px] font-mono px-1.5 py-0.2 rounded", config.badgeBg)}>
                              {config.shortName}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-ink-3 truncate max-w-[130px]">
                            {tonality.accidentals}
                          </div>
                        </div>
                      </div>

                      {/* Status indicator Pill */}
                      <div className="shrink-0">
                        {isMastered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-ok border border-emerald-500/40">
                            <CheckCircle2 size={11} />
                            <span>Dominada</span>
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-info border border-cyan-500/40">
                            <Clock size={11} />
                            <span>En Práctica</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-ink-3 px-2 py-0.5 rounded-full bg-surface-2 border border-line">
                            <span>Pendiente</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Note Preview Pills */}
                    <div className="flex flex-wrap gap-1">
                      {notes.slice(0, 8).map((n, idx) => (
                        <span 
                          key={idx}
                          className={cn(
                            "text-[9px] font-mono px-1.5 py-0.5 rounded",
                            isMastered 
                              ? "bg-emerald-500/10 text-ok border border-emerald-500/20"
                              : "bg-surface-2 text-ink-2"
                          )}
                        >
                          {n.replace(/\d/, '')}
                        </span>
                      ))}
                    </div>

                    {/* Bottom Row: Metronome BPM / Mastery info & Quick actions */}
                    <div className="pt-2 border-t border-line flex items-center justify-between text-xs font-mono">
                      <div className="text-[10px] text-ink-3">
                        {isMastered ? (
                          <span className="text-ok font-bold">
                            {entry.bpm} BPM • 100% Precisión
                          </span>
                        ) : isInProgress ? (
                          <span className="text-info">
                            Meta: {entry.bpm || 80} BPM
                          </span>
                        ) : (
                          <span>Sin registrar</span>
                        )}
                      </div>

                      {/* Quick Status Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus: ScaleMasteryStatus = isMastered 
                            ? 'pending' 
                            : isInProgress 
                              ? 'mastered' 
                              : 'in_progress';
                          handleUpdateStatus(entry.scaleId, nextStatus);
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors",
                          isMastered 
                            ? "bg-emerald-500/20 text-ok hover:bg-emerald-500/30"
                            : isInProgress
                              ? "bg-cyan-500/20 text-info hover:bg-cyan-500/30"
                              : "bg-surface-3 text-ink-2 hover:text-ink"
                        )}
                        title="Cambiar estado de dominio"
                      >
                        {isMastered ? '✓ Conquistada' : isInProgress ? 'Marcar Dominada' : '+ Iniciar'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAILED SCALE INSPECTOR DRAWER (4 COLS) */}
        <div className="lg:col-span-4 sticky top-24 space-y-5">
          <div className="p-6 rounded-3xl bg-surface border border-brand-line shadow-2xl space-y-6 text-ink">
            {/* Header with Tonality & Category */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-mono font-bold uppercase tracking-wider", activeCatConfig.color)}>
                  {activeCatConfig.nameEs}
                </span>
                <span className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold",
                  activeEntry.status === 'mastered' 
                    ? "bg-emerald-500/20 text-ok border-emerald-500/40"
                    : activeEntry.status === 'in_progress'
                      ? "bg-cyan-500/20 text-info border-cyan-500/40"
                      : "bg-surface-3 text-ink-3 border-line"
                )}>
                  {activeEntry.status === 'mastered' ? '⭐ Dominada' : activeEntry.status === 'in_progress' ? '⏳ En Práctica' : '🔒 Pendiente'}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-3xl font-serif font-black text-ink">
                  {activeTonality.rootEs} {activeCatConfig.shortName}
                </h3>
                <span className="text-xl font-mono text-brand-2 font-bold">
                  {activeTonality.root}
                </span>
              </div>

              <p className="text-xs font-light text-ink-2 leading-relaxed">
                {activeTonality.accidentals}. {activeCatConfig.description}
              </p>
            </div>

            {/* Audio Audition & Piano Trigger Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePlayScaleAudio(activeNotes)}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-mono font-bold transition-all shadow-md",
                  isPlayingAudio
                    ? "bg-rose-500 text-ink animate-pulse"
                    : "bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20"
                )}
              >
                {isPlayingAudio ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlayingAudio ? 'Detener Audio' : 'Escuchar Escala'}</span>
              </button>

              <button
                type="button"
                onClick={() => handlePreviewOnPiano(activeEntry.root, activeEntry.category)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-mono font-bold bg-surface-3 hover:bg-surface-3 text-ink border border-line-strong transition-colors"
                title="Mostrar notas en el teclado virtual y pentagrama"
              >
                <Music size={14} className="text-brand-2" />
                <span>Ver en Teclado</span>
              </button>

              {/* Tone Waterfall Demo with Fingering */}
              <button
                type="button"
                id="btn-scale-waterfall-demo"
                onClick={() => {
                  if (isPlayingAudio && audioIntervalRef.current) {
                    clearInterval(audioIntervalRef.current);
                    setIsPlayingAudio(false);
                  }
                  setIsWaterfallModalOpen(true);
                }}
                className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-mono font-bold bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-black transition-all shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-98"
                title="Demostración visual de Catarata de Tonos cayendo hacia el teclado con digitación técnica"
              >
                <Flame size={15} className="fill-black" />
                <span>Demo Catarata de Tonos con Digitación</span>
              </button>
            </div>

            {/* Scale Notes Analysis Breakdown */}
            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center justify-between text-xs font-mono text-ink-3">
                <span>Notas de la Escala:</span>
                <span>{activeNotes.length} tonos</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {activeNotes.map((noteWithOctave, idx) => {
                  const pureNote = noteWithOctave.replace(/\d/, '');
                  return (
                    <div 
                      key={idx}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-2 border border-line text-center"
                    >
                      <span className="text-[10px] font-mono text-brand-2/70">
                        {idx + 1}º
                      </span>
                      <span className="text-sm font-serif font-bold text-ink">
                        {pureNote}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fingering Patterns for Both Hands */}
            <div className="space-y-3 pt-2 border-t border-line">
              <div className="flex items-center justify-between text-xs font-mono text-ink-3">
                <span>Digitación Recomendada:</span>
                <span className="text-[10px] text-brand-2">1: Pulgar ... 5: Meñique</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                {/* Right Hand */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-line flex items-center justify-between gap-2">
                  <span className="text-ink-2 font-semibold w-24">M. Derecha:</span>
                  <div className="flex items-center gap-1.5">
                    {activeFingering.rightHand.map((f, i) => (
                      <span 
                        key={i}
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold",
                          i === activeFingering.thumbPassRight
                            ? "bg-amber-400 text-black ring-1 ring-amber-300"
                            : "bg-surface-3 text-ink-2"
                        )}
                        title={i === activeFingering.thumbPassRight ? "Paso de pulgar por debajo" : undefined}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Left Hand */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-line flex items-center justify-between gap-2">
                  <span className="text-ink-2 font-semibold w-24">M. Izquierda:</span>
                  <div className="flex items-center gap-1.5">
                    {activeFingering.leftHand.map((f, i) => (
                      <span 
                        key={i}
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold",
                          i === activeFingering.thumbPassLeft
                            ? "bg-amber-400 text-black ring-1 ring-amber-300"
                            : "bg-surface-3 text-ink-2"
                        )}
                        title={i === activeFingering.thumbPassLeft ? "Paso de dedo por encima" : undefined}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mastery Controller Box */}
            <div className="p-4 rounded-2xl bg-black/60 border border-line-strong space-y-4">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-ink">
                <span className="flex items-center gap-1.5 text-brand-2">
                  <Award size={14} />
                  <span>Control de Dominio Tonal</span>
                </span>
              </div>

              {/* Status Radio Buttons */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeEntry.scaleId, 'mastered', { bpm: bpmInput, handsTogether: handsTogetherInput })}
                  className={cn(
                    "py-2 px-1 rounded-xl text-center border font-bold transition-all",
                    activeEntry.status === 'mastered'
                      ? "bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20"
                      : "bg-surface-2 border-line text-ink-2 hover:text-ink"
                  )}
                >
                  ⭐ Dominada
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeEntry.scaleId, 'in_progress', { bpm: bpmInput, handsTogether: handsTogetherInput })}
                  className={cn(
                    "py-2 px-1 rounded-xl text-center border font-bold transition-all",
                    activeEntry.status === 'in_progress'
                      ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/20"
                      : "bg-surface-2 border-line text-ink-2 hover:text-ink"
                  )}
                >
                  ⏳ En Práctica
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeEntry.scaleId, 'pending')}
                  className={cn(
                    "py-2 px-1 rounded-xl text-center border transition-all",
                    activeEntry.status === 'pending'
                      ? "bg-surface-3 text-ink border-white/30"
                      : "bg-surface-2 border-line text-ink-3 hover:text-ink-2"
                  )}
                >
                  🔒 Pendiente
                </button>
              </div>

              {/* BPM achieved input */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-ink-2">Tempo Alcanzado (BPM):</span>
                  <span className="text-brand-2 font-bold">{bpmInput} BPM</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={160}
                  step={2}
                  value={bpmInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBpmInput(val);
                    if (activeEntry.status !== 'pending') {
                      handleUpdateStatus(activeEntry.scaleId, activeEntry.status, { bpm: val, handsTogether: handsTogetherInput });
                    }
                  }}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-surface-3 rounded-lg"
                />
              </div>

              {/* Hands Together Checkbox */}
              <label className="flex items-center gap-2.5 text-xs font-mono text-ink-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={handsTogetherInput}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHandsTogetherInput(checked);
                    if (activeEntry.status !== 'pending') {
                      handleUpdateStatus(activeEntry.scaleId, activeEntry.status, { bpm: bpmInput, handsTogether: checked });
                    }
                  }}
                  className="rounded border-line-strong text-brand-2 focus:ring-amber-400 h-4 w-4 bg-black/40"
                />
                <span>Ambas manos juntas coordinadas</span>
              </label>

              {activeEntry.masteredAt && (
                <div className="text-[10px] font-mono text-ok/80 pt-1 border-t border-line">
                  Dominada el: {activeEntry.masteredAt}
                </div>
              )}
            </div>

            {/* Pedagogical Tip */}
            <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 text-brand-2 font-bold text-[11px] uppercase">
                <Sparkles size={12} />
                <span>Consejo Técnico</span>
              </div>
              <p className="text-ink-2 text-[11px] leading-relaxed">
                {activeEntry.category === 'major'
                  ? 'Mantén la muñeca relajada y flexible en el paso del pulgar. No levantes el codo innecesariamente.'
                  : activeEntry.category === 'minor_harmonic'
                    ? 'Presta atención al salto de segunda aumentada entre el 6º y 7º grado; apóyate con el peso del brazo.'
                    : 'Recuerda que en la menor melódica clásica, el 6º y 7º grado suben alterados y al bajar vuelven al modo menor natural.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tone Waterfall Demo Modal */}
      {isWaterfallModalOpen && (
        <WaterfallDemoModal
          isOpen={isWaterfallModalOpen}
          onClose={() => setIsWaterfallModalOpen(false)}
          title={`Escala de ${activeTonality.rootEs} ${activeCatConfig.shortName}`}
          subtitle={`Digitación recomendada con paso de pulgar • ${activeTonality.accidentals}`}
          composer="Método Clásico de Escalas"
          bpm={activeEntry.bpm || 80}
          notes={buildWaterfallFromScale(
            activeTonality.root,
            activeCatConfig.shortName,
            activeNotes,
            activeFingering.rightHand,
            activeEntry.bpm || 80
          )}
        />
      )}
    </div>
  );
};
