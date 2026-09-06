import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Play, Pause, RotateCcw, Volume2, Download, 
  Upload, FileText, Music, Sparkles, Filter, Search, 
  ChevronRight, Check, Copy, ArrowRight, Gauge, Layers, 
  Hand, FileJson, CheckCircle2, Clock, Zap, AlertCircle, Flame
} from 'lucide-react';
import { 
  CLASSICAL_BOOKS, ClassicalBook, ClassicalExercise, 
  ClassicalBookId, MethodNote 
} from '../data/classicalMethodsData';
import { 
  exportExerciseToScoreJSON, exportExerciseToMIDI, 
  triggerFileDownload, parseScoreJSON, parseMIDIFile,
  noteNameToMidi
} from '../lib/scoreParser';
import { HandFingeringVisualizer } from './HandFingeringVisualizer';
import { WaterfallDemoModal } from './WaterfallDemoModal';
import { buildWaterfallFromMethodNotes } from '../lib/midiWaterfall';
import { soundEngine, getSavedSoundPreset } from '../lib/soundPresets';
import { maestroVoice } from '../lib/speech';
import { cn } from '../lib/utils';
import * as Tone from 'tone';

interface ClassicalScoreEngineViewerProps {
  onSelectExerciseToPractice?: (exercise: ClassicalExercise) => void;
}

// Map note pitch to vertical offset on staff (relative to Middle C4)
function getNoteStaffY(noteName: string, clef: 'treble' | 'bass'): number {
  const match = noteName.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!match) return 50;
  
  const letter = match[1];
  const octave = parseInt(match[3], 10);
  
  const stepMap: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const diatonicValue = octave * 7 + stepMap[letter];

  if (clef === 'treble') {
    // E4 is bottom line (y = 60), F5 is top line (y = 20)
    // Middle C4 is diatonic value 28
    // Step distance is 5px
    const trebleE4 = 4 * 7 + stepMap['E']; // 30
    const diff = diatonicValue - trebleE4;
    return 60 - diff * 5;
  } else {
    // G2 is bottom line (y = 60), A3 is top line (y = 20)
    // Middle C4 is diatonic value 28 (one ledger line above bass)
    const bassG2 = 2 * 7 + stepMap['G']; // 18
    const diff = diatonicValue - bassG2;
    return 60 - diff * 5;
  }
}

export const ClassicalScoreEngineViewer: React.FC<ClassicalScoreEngineViewerProps> = ({
  onSelectExerciseToPractice,
}) => {
  // Collect all built-in exercises across all books
  const allInitialExercises = useMemo(() => {
    return CLASSICAL_BOOKS.flatMap(b => b.exercises);
  }, []);

  const [allExercises, setAllExercises] = useState<ClassicalExercise[]>(allInitialExercises);

  // Filters State
  const [selectedBookFilter, setSelectedBookFilter] = useState<'all' | ClassicalBookId>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Principiante' | 'Intermedio' | 'Avanzado'>('all');
  const [tempoRangeFilter, setTempoRangeFilter] = useState<'all' | 'slow' | 'moderate' | 'fast'>('all');
  const [technicalFocusFilter, setTechnicalFocusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Selected Exercise
  const [currentExercise, setCurrentExercise] = useState<ClassicalExercise>(allExercises[0]);

  // Active Score View Mode: 'sheet' | 'json' | 'midi' | 'upload'
  const [activeTab, setActiveTab] = useState<'sheet' | 'json' | 'midi' | 'upload'>('sheet');

  // Playback & Tempo States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isWaterfallModalOpen, setIsWaterfallModalOpen] = useState<boolean>(false);
  const [activePlaybackStep, setActivePlaybackStep] = useState<number>(0);
  const [tempoBpm, setTempoBpm] = useState<number>(currentExercise.recommendedBpm);
  const [activeHandMode, setActiveHandMode] = useState<'both' | 'right' | 'left'>('right');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const playbackTimerRef = useRef<any>(null);

  // Sync tempo when exercise changes
  useEffect(() => {
    setTempoBpm(currentExercise.recommendedBpm);
    setActivePlaybackStep(0);
    if (isPlaying) {
      stopPlayback();
    }
  }, [currentExercise.id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    return allExercises.filter(ex => {
      // Book filter
      if (selectedBookFilter !== 'all' && ex.bookId !== selectedBookFilter) return false;
      // Difficulty filter
      if (difficultyFilter !== 'all' && ex.difficulty !== difficultyFilter) return false;
      // Tempo filter
      if (tempoRangeFilter === 'slow' && ex.recommendedBpm > 65) return false;
      if (tempoRangeFilter === 'moderate' && (ex.recommendedBpm < 66 || ex.recommendedBpm > 90)) return false;
      if (tempoRangeFilter === 'fast' && ex.recommendedBpm <= 90) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ex.title.toLowerCase().includes(q);
        const matchSubtitle = ex.subtitle.toLowerCase().includes(q);
        const matchTechnique = ex.focusTechnique.toLowerCase().includes(q);
        const matchNumber = String(ex.exerciseNumber).includes(q);
        if (!matchTitle && !matchSubtitle && !matchTechnique && !matchNumber) return false;
      }
      return true;
    });
  }, [allExercises, selectedBookFilter, difficultyFilter, tempoRangeFilter, searchQuery]);

  // Make sure current exercise is valid
  useEffect(() => {
    if (filteredExercises.length > 0 && !filteredExercises.some(e => e.id === currentExercise.id)) {
      setCurrentExercise(filteredExercises[0]);
    }
  }, [filteredExercises]);

  // Active notes sequence for playback
  const activeTrackNotes = useMemo(() => {
    if (activeHandMode === 'right') return currentExercise.rightHandNotes;
    if (activeHandMode === 'left') return currentExercise.leftHandNotes;
    return currentExercise.rightHandNotes;
  }, [currentExercise, activeHandMode]);

  const activeCurrentNote = activeTrackNotes[activePlaybackStep];

  // Stop playback cleanly
  const stopPlayback = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
  };

  // Play / Pause sequence with tempo
  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    setIsPlaying(true);
    let step = activePlaybackStep >= activeTrackNotes.length - 1 ? 0 : activePlaybackStep;
    setActivePlaybackStep(step);

    const stepIntervalMs = Math.max(120, (60 / tempoBpm) * 500); // 8th note base time
    const preset = getSavedSoundPreset();

    playbackTimerRef.current = setInterval(() => {
      if (step >= activeTrackNotes.length) {
        stopPlayback();
        setActivePlaybackStep(0);
        return;
      }

      // Play Right Hand note
      const rhNote = currentExercise.rightHandNotes[step];
      if (rhNote && (activeHandMode === 'right' || activeHandMode === 'both')) {
        soundEngine.playNote(rhNote.note, preset, rhNote.duration || '8n');
      }

      // Play Left Hand note
      const lhNote = currentExercise.leftHandNotes[step];
      if (lhNote && (activeHandMode === 'left' || activeHandMode === 'both')) {
        soundEngine.playNote(lhNote.note, preset, lhNote.duration || '8n');
      }

      setActivePlaybackStep(step);
      step++;
    }, stepIntervalMs);
  };

  // Metronome tick helper
  const playMetronomeTick = (high = false) => {
    try {
      const osc = new Tone.Oscillator(high ? 880 : 440, "sine").toDestination();
      osc.volume.value = -12;
      osc.start();
      osc.stop("+0.05");
    } catch {
      // AudioContext fallback
    }
  };

  // Handle tempo presets
  const handleSetTempoPreset = (percentage: number) => {
    const newBpm = Math.round(currentExercise.recommendedBpm * percentage);
    setTempoBpm(newBpm);
  };

  // Export JSON Score
  const handleDownloadJSON = () => {
    const jsonStr = exportExerciseToScoreJSON(currentExercise);
    const filename = `${currentExercise.bookId}_ex${currentExercise.exerciseNumber}_score.json`;
    triggerFileDownload(filename, jsonStr, 'application/json');
  };

  // Export MIDI Score
  const handleDownloadMIDI = () => {
    const midiBytes = exportExerciseToMIDI(currentExercise, tempoBpm);
    const filename = `${currentExercise.bookId}_ex${currentExercise.exerciseNumber}_${tempoBpm}bpm.mid`;
    triggerFileDownload(filename, midiBytes, 'audio/midi');
  };

  // Copy JSON to clipboard
  const handleCopyJSON = () => {
    const jsonStr = exportExerciseToScoreJSON(currentExercise);
    navigator.clipboard.writeText(jsonStr);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Handle uploaded file (JSON or MIDI)
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    const isJson = file.name.endsWith('.json') || file.type === 'application/json';
    const isMidi = file.name.endsWith('.mid') || file.name.endsWith('.midi') || file.type.includes('midi');

    if (!isJson && !isMidi) {
      setUploadError('Por favor selecciona un archivo con extensión .json o .mid.');
      return;
    }

    try {
      if (isJson) {
        const text = await file.text();
        const imported = parseScoreJSON(text);
        setAllExercises(prev => [imported, ...prev]);
        setCurrentExercise(imported);
        setUploadSuccess(`¡Partitura "${imported.title}" importada y cargada con éxito!`);
        setActiveTab('sheet');
      } else if (isMidi) {
        const buffer = await file.arrayBuffer();
        const imported = await parseMIDIFile(buffer);
        setAllExercises(prev => [imported, ...prev]);
        setCurrentExercise(imported);
        setUploadSuccess(`¡Archivo MIDI "${imported.title}" procesado e integrado al visor!`);
        setActiveTab('sheet');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error al procesar el archivo.');
    }
  };

  // Current JSON representation
  const activeScoreJSON = useMemo(() => {
    return exportExerciseToScoreJSON(currentExercise);
  }, [currentExercise]);

  return (
    <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-8">
      {/* HEADER: MODULE IDENTITY */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Layers size={14} />
            <span>Módulo de Partituras Técnicas (JSON / MIDI)</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white">
            Visualizador & Filtro de Ejercicios Clásicos
          </h2>
          <p className="text-xs md:text-sm text-white/60 font-light leading-relaxed">
            Filtra de manera automática los estudios de <strong>Hanon</strong>, <strong>Czerny</strong> y <strong>Suzuki</strong>. Visualiza la digitación anatómica exacta (dedos 1 al 5), inspecciona partituras estructuradas en <strong>JSON</strong>, exporta archivos <strong>MIDI (.mid)</strong> o importa tus propios estudios.
          </p>
        </div>

        {/* Action button to switch to guided practice */}
        {onSelectExerciseToPractice && (
          <button
            type="button"
            onClick={() => onSelectExerciseToPractice(currentExercise)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-amber-400/20 whitespace-nowrap"
          >
            <span>Llevar al Piano Guiado</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="space-y-4 p-5 rounded-2xl bg-black/40 border border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-white/50">
            <Filter size={14} className="text-amber-400" />
            <span className="font-bold uppercase tracking-wider text-white/80">Filtros Automáticos:</span>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por título, compás, tono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400 font-mono transition-colors"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {/* 1. Método / Libro */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-white/40">Colección / Método:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'hanon', label: 'Hanon' },
                { id: 'czerny', label: 'Czerny' },
                { id: 'suzuki', label: 'Suzuki' },
              ].map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBookFilter(b.id as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-mono transition-all",
                    selectedBookFilter === b.id
                      ? "bg-amber-400 text-black font-bold shadow"
                      : "bg-white/5 text-white/60 hover:text-white"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Dificultad */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-white/40">Nivel de Dificultad:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'Principiante', label: 'Principiante' },
                { id: 'Intermedio', label: 'Intermedio' },
                { id: 'Avanzado', label: 'Avanzado' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficultyFilter(d.id as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-mono transition-all",
                    difficultyFilter === d.id
                      ? "bg-emerald-400 text-black font-bold shadow"
                      : "bg-white/5 text-white/60 hover:text-white"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Rango de Tempo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-white/40">Rango de Tempo Sugerido:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'slow', label: 'Lento (≤65)' },
                { id: 'moderate', label: 'Moderato (66-90)' },
                { id: 'fast', label: 'Allegro (>90)' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTempoRangeFilter(t.id as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-mono transition-all",
                    tempoRangeFilter === t.id
                      ? "bg-purple-400 text-black font-bold shadow"
                      : "bg-white/5 text-white/60 hover:text-white"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Counter of matching exercises */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-white/40">
          <span>
            Mostrando <strong>{filteredExercises.length}</strong> de {allExercises.length} partituras técnicas disponibles
          </span>
          {filteredExercises.length === 0 && (
            <span className="text-amber-400">No hay ejercicios con los filtros seleccionados. Intenta ampliar los criterios.</span>
          )}
        </div>
      </div>

      {/* HORIZONTAL CAROUSEL OF FILTERED EXERCISES */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-white/50 px-1">
          Partituras Seleccionables ({filteredExercises.length}):
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {filteredExercises.map(ex => {
            const isSelected = ex.id === currentExercise.id;
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  stopPlayback();
                  setCurrentExercise(ex);
                }}
                className={cn(
                  "p-3.5 rounded-2xl border text-left transition-all shrink-0 w-64 flex flex-col justify-between gap-2.5",
                  isSelected
                    ? "bg-amber-400/15 border-amber-400 text-white shadow-lg shadow-amber-400/10"
                    : "bg-black/40 border-white/10 text-white/70 hover:border-white/20 hover:bg-black/60"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="uppercase font-bold text-amber-400">
                      {ex.bookId} • Nº {ex.exerciseNumber}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-semibold">
                      {ex.difficulty}
                    </span>
                  </div>
                  <div className="font-serif font-bold text-sm text-white line-clamp-1">
                    {ex.title}
                  </div>
                  <div className="text-[11px] text-white/40 line-clamp-1 font-light">
                    {ex.focusTechnique}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/50">
                  <span>♩ = {ex.recommendedBpm} BPM</span>
                  <span className={cn("font-bold flex items-center gap-1", isSelected ? "text-amber-300" : "")}>
                    <span>{isSelected ? 'Abierta' : 'Ver'}</span>
                    <ChevronRight size={12} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TEMPO CONTROL & AUDIO PLAYBACK CONSOLE */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-black/80 via-[#0e1320] to-black/80 border border-amber-500/30 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/10 pb-5">
          {/* Active Exercise Overview */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <Sparkles size={14} />
              <span className="uppercase font-bold tracking-wider">Partitura en Ejecución</span>
              <span className="text-white/40">•</span>
              <span className="text-white/60">{currentExercise.keySignature}</span>
              <span className="text-white/40">•</span>
              <span className="text-white/60">Compás {currentExercise.timeSignature}</span>
            </div>
            <h3 className="text-2xl font-serif font-bold text-white">
              {currentExercise.title}
            </h3>
            <p className="text-xs text-white/60 font-light">
              {currentExercise.subtitle}
            </p>
          </div>

          {/* Hand Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-2xl border border-white/10 text-xs font-mono">
            <span className="text-white/40 px-2 hidden sm:inline">Pista:</span>
            {[
              { id: 'right', label: 'MD (Sol)', Icon: Hand, iconClass: 'rotate-12' },
              { id: 'left', label: 'MI (Fa)', Icon: Hand, iconClass: '-scale-x-100 -rotate-12' },
              { id: 'both', label: 'Ambas', Icon: Layers, iconClass: '' },
            ].map(m => {
              const ModeIcon = m.Icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setActiveHandMode(m.id as any);
                    setActivePlaybackStep(0);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all",
                    activeHandMode === m.id
                      ? "bg-amber-400 text-black font-bold shadow"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <ModeIcon size={14} className={m.iconClass} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TEMPO ENGINE SLIDERS & PRESETS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Suggested Tempo Showcase */}
          <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[11px] font-mono text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} />
                <span>Tempo Sugerido por el Método</span>
              </div>
              <div className="text-2xl font-mono font-bold text-white">
                ♩ = {currentExercise.recommendedBpm} <span className="text-xs text-white/50 font-normal">BPM</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTempoBpm(currentExercise.recommendedBpm)}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold transition-all shadow"
              title="Restablecer exactamente al tempo metronómico original"
            >
              Fijar Sugerido
            </button>
          </div>

          {/* Interactive Tempo Slider */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/60">Tempo de Práctica Activo:</span>
              <span className="text-amber-400 font-bold text-sm">{tempoBpm} BPM</span>
            </div>
            <input
              type="range"
              min={40}
              max={150}
              step={2}
              value={tempoBpm}
              onChange={(e) => setTempoBpm(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            {/* Quick Multiplier Presets */}
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40 pt-1">
              <button
                type="button"
                onClick={() => handleSetTempoPreset(0.7)}
                className="hover:text-amber-300 transition-colors"
              >
                70% (Lento didáctico)
              </button>
              <button
                type="button"
                onClick={() => handleSetTempoPreset(1.0)}
                className="hover:text-amber-300 font-bold text-amber-400/80 transition-colors"
              >
                100% (Sugerido)
              </button>
              <button
                type="button"
                onClick={() => handleSetTempoPreset(1.25)}
                className="hover:text-amber-300 transition-colors"
              >
                125% (Virtuoso)
              </button>
            </div>
          </div>

          {/* Master Play / Pause Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className={cn(
                "flex-1 py-3.5 px-6 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl",
                isPlaying
                  ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                  : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
              )}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span>{isPlaying ? 'Pausar Reproducción' : `Escuchar a ${tempoBpm} BPM`}</span>
            </button>

            {/* Tone Waterfall Demo Button */}
            <button
              type="button"
              id="btn-score-waterfall-demo"
              onClick={() => {
                stopPlayback();
                setIsWaterfallModalOpen(true);
              }}
              className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95"
              title="Abrir demostración de Catarata de Tonos con notas cayendo y digitación animada"
            >
              <Flame size={16} className="fill-black" />
              <span>Demo Catarata</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopPlayback();
                setActivePlaybackStep(0);
              }}
              className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
              title="Reiniciar partitura al compás 1"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* SCORE VIEWER TABS: SHEET MUSIC / SCORE JSON / MIDI / UPLOAD */}
      <div className="space-y-4">
        {/* Tab Headers */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'sheet', label: 'Partitura Técnica & Digitación', Icon: Music },
              { id: 'json', label: 'Partitura JSON', Icon: FileJson },
              { id: 'midi', label: 'Exportar MIDI (.mid)', Icon: Download },
              { id: 'upload', label: 'Cargar Partitura (JSON/MIDI)', Icon: Upload },
            ].map(tab => {
              const TabIcon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all",
                    activeTab === tab.id
                      ? "bg-white/15 text-white font-bold border border-white/20 shadow"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                >
                  <TabIcon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Maestro Voice button */}
          <button
            type="button"
            onClick={() => maestroVoice.speak(currentExercise.maestroAdvice)}
            className="flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Volume2 size={13} />
            <span>Instrucción del Maestro</span>
          </button>
        </div>

        {/* TAB CONTENT: 1. GRAPHICAL SHEET MUSIC & FINGERING */}
        {activeTab === 'sheet' && (
          <div className="space-y-6">
            {/* Grand Staff Score Canvas Component */}
            <div className="p-6 rounded-3xl bg-[#0a0d14] border border-white/10 space-y-4 overflow-hidden">
              <div className="flex items-center justify-between text-xs font-mono text-white/50 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white uppercase">{currentExercise.title}</span>
                  <span className="text-white/40">•</span>
                  <span>Compás {currentExercise.timeSignature}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-400">
                    Nota {activePlaybackStep + 1} de {activeTrackNotes.length}
                  </span>
                </div>
              </div>

              {/* Graphical Staff Rendering */}
              <div className="overflow-x-auto pb-3 no-scrollbar">
                <div className="min-w-[650px] p-4 bg-black/40 rounded-2xl border border-white/5">
                  <svg viewBox="0 0 750 160" className="w-full h-44 drop-shadow">
                    {/* Clef Labels & 5 Staff Lines for Treble (Clave de Sol) */}
                    <g className="opacity-80">
                      {[20, 30, 40, 50, 60].map((y, idx) => (
                        <line
                          key={`treble-${idx}`}
                          x1="50"
                          y1={y}
                          x2="730"
                          y2={y}
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth="1.2"
                        />
                      ))}
                      <text x="15" y="45" fill="#fcd34d" fontSize="16" fontFamily="serif" fontWeight="bold">
                        𝄞 Sol
                      </text>
                    </g>

                    {/* 5 Staff Lines for Bass (Clave de Fa) */}
                    <g className="opacity-80">
                      {[100, 110, 120, 130, 140].map((y, idx) => (
                        <line
                          key={`bass-${idx}`}
                          x1="50"
                          y1={y}
                          x2="730"
                          y2={y}
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth="1.2"
                        />
                      ))}
                      <text x="15" y="125" fill="#6ee7b7" fontSize="16" fontFamily="serif" fontWeight="bold">
                        𝄢 Fa
                      </text>
                    </g>

                    {/* Treble / Right Hand Notes with Fingering numbers */}
                    {currentExercise.rightHandNotes.map((n, idx) => {
                      const noteSpacing = 650 / Math.max(12, currentExercise.rightHandNotes.length);
                      const x = 70 + idx * noteSpacing;
                      const y = getNoteStaffY(n.note, 'treble');
                      const isCurrent = (activeHandMode === 'right' || activeHandMode === 'both') && idx === activePlaybackStep;

                      return (
                        <g 
                          key={`rh-${idx}`} 
                          className="cursor-pointer transition-all"
                          onClick={() => {
                            setActivePlaybackStep(idx);
                            soundEngine.playNote(n.note, getSavedSoundPreset(), n.duration || '8n');
                          }}
                        >
                          {/* Active Note Glow Highlight */}
                          {isCurrent && (
                            <circle
                              cx={x}
                              cy={y}
                              r="13"
                              fill="rgba(251, 191, 36, 0.3)"
                              className="animate-pulse"
                            />
                          )}

                          {/* Ledger line if Middle C4 or lower */}
                          {y >= 65 && (
                            <line
                              x1={x - 8}
                              y1={65}
                              x2={x + 8}
                              y2={65}
                              stroke="rgba(255,255,255,0.6)"
                              strokeWidth="1.5"
                            />
                          )}

                          {/* Notehead oval */}
                          <ellipse
                            cx={x}
                            cy={y}
                            rx="5.5"
                            ry="4"
                            transform={`rotate(-20 ${x} ${y})`}
                            fill={isCurrent ? "#fbbf24" : "#ffffff"}
                            stroke={isCurrent ? "#fef08a" : "none"}
                            strokeWidth="1.5"
                          />

                          {/* Stem */}
                          <line
                            x1={x + 4.5}
                            y1={y}
                            x2={x + 4.5}
                            y2={y - 20}
                            stroke={isCurrent ? "#fbbf24" : "rgba(255,255,255,0.85)"}
                            strokeWidth="1.5"
                          />

                          {/* FINGERING NUMBER PROMINENT ABOVE NOTE */}
                          <rect
                            x={x - 6}
                            y={y - 33}
                            width="12"
                            height="11"
                            rx="3"
                            fill={isCurrent ? "#fbbf24" : "rgba(255,255,255,0.15)"}
                          />
                          <text
                            x={x}
                            y={y - 24.5}
                            textAnchor="middle"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                            fill={isCurrent ? "#000000" : "#fbbf24"}
                          >
                            {n.fingering}
                          </text>

                          {/* Note Name underneath */}
                          <text
                            x={x}
                            y={y + 14}
                            textAnchor="middle"
                            fontSize="7.5"
                            fontFamily="monospace"
                            fill={isCurrent ? "#fbbf24" : "rgba(255,255,255,0.4)"}
                          >
                            {n.note}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bass / Left Hand Notes with Fingering numbers */}
                    {currentExercise.leftHandNotes.map((n, idx) => {
                      const noteSpacing = 650 / Math.max(12, currentExercise.leftHandNotes.length);
                      const x = 70 + idx * noteSpacing;
                      const y = getNoteStaffY(n.note, 'bass');
                      const isCurrent = (activeHandMode === 'left' || activeHandMode === 'both') && idx === activePlaybackStep;

                      return (
                        <g 
                          key={`lh-${idx}`} 
                          className="cursor-pointer transition-all"
                          onClick={() => {
                            setActivePlaybackStep(idx);
                            soundEngine.playNote(n.note, getSavedSoundPreset(), n.duration || '8n');
                          }}
                        >
                          {/* Active Note Glow */}
                          {isCurrent && (
                            <circle
                              cx={x}
                              cy={y}
                              r="13"
                              fill="rgba(16, 185, 129, 0.3)"
                              className="animate-pulse"
                            />
                          )}

                          {/* Notehead oval */}
                          <ellipse
                            cx={x}
                            cy={y}
                            rx="5.5"
                            ry="4"
                            transform={`rotate(-20 ${x} ${y})`}
                            fill={isCurrent ? "#34d399" : "#ffffff"}
                            stroke={isCurrent ? "#a7f3d0" : "none"}
                            strokeWidth="1.5"
                          />

                          {/* Stem */}
                          <line
                            x1={x - 4.5}
                            y1={y}
                            x2={x - 4.5}
                            y2={y + 20}
                            stroke={isCurrent ? "#34d399" : "rgba(255,255,255,0.85)"}
                            strokeWidth="1.5"
                          />

                          {/* FINGERING NUMBER BELOW NOTE */}
                          <rect
                            x={x - 6}
                            y={y + 23}
                            width="12"
                            height="11"
                            rx="3"
                            fill={isCurrent ? "#34d399" : "rgba(255,255,255,0.15)"}
                          />
                          <text
                            x={x}
                            y={y + 31.5}
                            textAnchor="middle"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                            fill={isCurrent ? "#000000" : "#34d399"}
                          >
                            {n.fingering}
                          </text>

                          {/* Note Name */}
                          <text
                            x={x}
                            y={y - 8}
                            textAnchor="middle"
                            fontSize="7.5"
                            fontFamily="monospace"
                            fill={isCurrent ? "#34d399" : "rgba(255,255,255,0.4)"}
                          >
                            {n.note}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            {/* Anatomical Hand & Fingering Guide */}
            <HandFingeringVisualizer
              activeFingering={activeCurrentNote?.fingering}
              activeHand={activeCurrentNote?.hand || activeHandMode}
              activeNote={activeCurrentNote?.note}
            />
          </div>
        )}

        {/* TAB CONTENT: 2. JSON SCORE INSPECTOR */}
        {activeTab === 'json' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-black/50 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                  <FileJson size={14} className="text-amber-400" />
                  <span>Estructura Estándar de Partitura (ConservatoryClassicalScore)</span>
                </div>
                <div className="text-[11px] font-mono text-white/50">
                  Formato portable compatible con motores de notación, apps móviles y archivado de ejercicios.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJSON}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{isCopied ? '¡Copiado!' : 'Copiar JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJSON}
                  className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow"
                >
                  <Download size={13} />
                  <span>Descargar .json</span>
                </button>
              </div>
            </div>

            {/* Code Display */}
            <div className="p-4 rounded-2xl bg-[#0a0d14] border border-white/10 max-h-96 overflow-y-auto font-mono text-xs text-amber-200/90 leading-relaxed">
              <pre>{activeScoreJSON}</pre>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 3. EXPORT MIDI (.MID) */}
        {activeTab === 'midi' && (
          <div className="p-8 rounded-3xl bg-black/60 border border-white/10 space-y-6 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-300 mx-auto flex items-center justify-center">
              <Music size={32} />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-serif font-bold text-white">
                Exportar Archivo MIDI Estándar (.mid)
              </h4>
              <p className="text-xs text-white/60 font-light leading-relaxed">
                Genera al vuelo un archivo binario <strong>MIDI Tipo 1</strong> con pistas separadas de <strong>Mano Derecha</strong> (Canal 1) y <strong>Mano Izquierda</strong> (Canal 2), programado a <strong>{tempoBpm} BPM</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left text-xs font-mono text-white/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/40">Título de Pista:</span>
                <span className="text-white font-semibold">{currentExercise.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Tempo metronómico:</span>
                <span className="text-amber-400 font-bold">{tempoBpm} BPM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Pista 1:</span>
                <span>Mano Derecha (Clave de Sol)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Pista 2:</span>
                <span>Mano Izquierda (Clave de Fa)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Compatibilidad:</span>
                <span className="text-emerald-400">DAWs, MuseScore, Teclados Yamaha/Roland</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadMIDI}
              className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-400/20"
            >
              <Download size={15} />
              <span>Descargar Archivo .mid ({tempoBpm} BPM)</span>
            </button>
          </div>
        )}

        {/* TAB CONTENT: 4. IMPORT / UPLOAD SCORE FILE */}
        {activeTab === 'upload' && (
          <div className="p-8 rounded-3xl bg-black/60 border border-white/10 space-y-6 max-w-xl mx-auto">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <Upload size={28} />
              </div>
              <h4 className="text-xl font-serif font-bold text-white">
                Cargar Partitura Externa
              </h4>
              <p className="text-xs text-white/60 font-light leading-relaxed">
                Importa un archivo de partitura en formato <strong>.json</strong> o <strong>.mid (MIDI)</strong>. El analizador extraerá automáticamente las notas, las dividirá por manos y calculará las digitaciones técnicas sugeridas.
              </p>
            </div>

            {/* Drag & Drop or Click input */}
            <div className="border-2 border-dashed border-white/20 hover:border-amber-400/60 rounded-3xl p-8 text-center space-y-3 transition-colors cursor-pointer relative bg-white/[0.02]">
              <input
                type="file"
                accept=".json,.mid,.midi"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileText size={32} className="mx-auto text-white/40" />
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-white">
                  Arrastra un archivo aquí o haz clic para examinar
                </div>
                <div className="text-[11px] font-mono text-white/40">
                  Formatos soportados: .json (Partitura Técnica) o .mid (Archivo MIDI)
                </div>
              </div>
            </div>

            {/* Feedback messages */}
            {uploadSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tone Waterfall Demo Modal */}
      {isWaterfallModalOpen && (
        <WaterfallDemoModal
          isOpen={isWaterfallModalOpen}
          onClose={() => setIsWaterfallModalOpen(false)}
          title={currentExercise.title}
          subtitle={`${currentExercise.focusTechnique} • ${CLASSICAL_BOOKS.find(b => b.id === currentExercise.bookId)?.author || 'Método Clásico'}`}
          composer={CLASSICAL_BOOKS.find(b => b.id === currentExercise.bookId)?.author || 'Método Clásico'}
          bpm={tempoBpm || currentExercise.recommendedBpm}
          notes={buildWaterfallFromMethodNotes(
            currentExercise.rightHandNotes,
            currentExercise.leftHandNotes,
            tempoBpm || currentExercise.recommendedBpm
          )}
        />
      )}
    </div>
  );
};
