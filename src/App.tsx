import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, Music, Compass, Target, MessageSquare, 
  Sparkles, Award, RotateCcw, Volume2, Bot, CheckCircle2,
  Zap, Timer, Sliders, Flame, Disc, Maximize2, FileAudio
} from 'lucide-react';
import { Piano } from './components/Piano';
import { ChordChart, SelectedChordInfo } from './components/ChordChart';
import { StaffVisualizer } from './components/StaffVisualizer';
import { ExerciseSystem } from './components/ExerciseSystem';
import { ToneWaterfallGym } from './components/ToneWaterfallGym';
import { WavBackingStudio } from './components/WavBackingStudio';
import { LessonViewer } from './components/LessonViewer';
import { CurriculumRoadmap } from './components/CurriculumRoadmap';
import { CircleOfFifths } from './components/CircleOfFifths';
import { Metronome } from './components/Metronome';
import { InstructorChatModal } from './components/InstructorChatModal';
import { QuickPracticeModal } from './components/QuickPracticeModal';
import { LESSONS, Lesson, UserProgress, DEFAULT_USER_PROGRESS } from './types';
import { cn } from './lib/utils';
import { 
  SoundPreset, 
  SOUND_PRESETS, 
  getSavedSoundPreset, 
  saveSoundPreset, 
  soundEngine,
  SplitKeyboardConfig,
  getSavedSplitConfig,
  saveSplitConfig
} from './lib/soundPresets';

const STORAGE_KEY = 'pianomaster_user_progress_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'curriculum' | 'waterfall' | 'wavStudio' | 'chords' | 'circle' | 'gym'>('curriculum');
  const [layoutWidth, setLayoutWidth] = useState<'ultra' | 'wide' | 'standard'>(() => {
    return (localStorage.getItem('pianomaster_layout_width') as any) || 'ultra';
  });

  const handleLayoutWidthChange = (mode: 'ultra' | 'wide' | 'standard') => {
    setLayoutWidth(mode);
    localStorage.setItem('pianomaster_layout_width', mode);
  };

  const getContainerWidthClass = () => {
    if (layoutWidth === 'ultra') return 'w-full max-w-[98%] 2xl:max-w-[1880px] mx-auto';
    if (layoutWidth === 'wide') return 'w-full max-w-[1550px] mx-auto';
    return 'w-full max-w-7xl mx-auto';
  };
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activePianoChord, setActivePianoChord] = useState<string[]>(['C4', 'E4', 'G4']);
  const [activeChordInfo, setActiveChordInfo] = useState<SelectedChordInfo>({
    root: 'C',
    type: 'Major',
    inversion: 0,
    name: 'Do Mayor (C Major)'
  });
  const [chordViewMode, setChordViewMode] = useState<'both' | 'staff' | 'piano'>('both');
  const [isInstructorChatOpen, setIsInstructorChatOpen] = useState(false);
  const [isQuickPracticeOpen, setIsQuickPracticeOpen] = useState(false);
  const [soundPreset, setSoundPreset] = useState<SoundPreset>(() => getSavedSoundPreset());
  const [splitConfig, setSplitConfig] = useState<SplitKeyboardConfig>(() => getSavedSplitConfig());

  // Keep sound preset in sync across tabs or piano interactions
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<SoundPreset>;
      if (custom.detail) {
        setSoundPreset(custom.detail);
      }
    };
    window.addEventListener('piano-preset-changed', handler);
    return () => window.removeEventListener('piano-preset-changed', handler);
  }, []);

  // Keep split config in sync across tabs or piano interactions
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<SplitKeyboardConfig>;
      if (custom.detail) {
        setSplitConfig(custom.detail);
      }
    };
    window.addEventListener('piano-split-changed', handler);
    return () => window.removeEventListener('piano-split-changed', handler);
  }, []);

  const handleGlobalSoundPresetChange = (newPreset: SoundPreset) => {
    setSoundPreset(newPreset);
    saveSoundPreset(newPreset);
    soundEngine.playNote('C4', newPreset, '0.4n');
  };

  const handleGlobalSplitToggle = () => {
    const updated: SplitKeyboardConfig = {
      ...splitConfig,
      enabled: !splitConfig.enabled
    };
    setSplitConfig(updated);
    saveSplitConfig(updated);
    if (updated.enabled) {
      soundEngine.playNote('C3', updated.leftPreset, '0.4n');
      setTimeout(() => {
        soundEngine.playNote('G4', updated.rightPreset, '0.5n');
      }, 200);
    }
  };

  // Persistent User Progress (0 to 100)
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_USER_PROGRESS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));
    } catch {
      // ignore
    }
  }, [userProgress]);

  // Handle passing a lesson after successful evaluation
  const handlePassLesson = (lessonId: string, score: number) => {
    setUserProgress(prev => {
      const isAlreadyCompleted = prev.completedLessons.includes(lessonId);
      const nextLessonIndex = LESSONS.findIndex(l => l.id === lessonId) + 1;
      const nextLessonId = nextLessonIndex < LESSONS.length ? LESSONS[nextLessonIndex].id : null;

      const nextUnlocked = [...prev.unlockedLessons];
      if (nextLessonId && !nextUnlocked.includes(nextLessonId)) {
        nextUnlocked.push(nextLessonId);
      }

      const nextCompleted = isAlreadyCompleted 
        ? prev.completedLessons 
        : [...prev.completedLessons, lessonId];

      const newScores = {
        ...prev.lessonScores,
        [lessonId]: Math.max(prev.lessonScores[lessonId] || 0, score)
      };

      return {
        ...prev,
        completedLessons: nextCompleted,
        unlockedLessons: nextUnlocked,
        lessonScores: newScores,
        xp: prev.xp + (isAlreadyCompleted ? 30 : 150),
      };
    });
  };

  const handleSetUserLevel = (level: 'Principiante' | 'Intermedio' | 'Avanzado') => {
    setUserProgress(prev => {
      let unlocked = [...prev.unlockedLessons];
      if (level === 'Intermedio') {
        // Unlock up to lesson 7
        ['1', '2', '3', '4', '5', '6', '7'].forEach(id => {
          if (!unlocked.includes(id)) unlocked.push(id);
        });
      } else if (level === 'Avanzado') {
        // Unlock up to lesson 13
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'].forEach(id => {
          if (!unlocked.includes(id)) unlocked.push(id);
        });
      }
      return {
        ...prev,
        userLevel: level,
        unlockedLessons: unlocked,
      };
    });
  };

  const handleQuickPracticeComplete = (pointsGained: number, solvedCount: number) => {
    setUserProgress(prev => ({
      ...prev,
      xp: prev.xp + pointsGained,
      notesPlayedCount: prev.notesPlayedCount + (solvedCount * 3),
      streak: prev.streak + (solvedCount > 0 ? 1 : 0),
    }));
  };

  const handleScoreGain = (points: number) => {
    setUserProgress(prev => ({
      ...prev,
      xp: prev.xp + points,
      notesPlayedCount: prev.notesPlayedCount + 1,
    }));
  };

  const completedCount = userProgress.completedLessons.length;
  const progressPercent = Math.round((completedCount / LESSONS.length) * 100);

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col selection:bg-amber-400/30 selection:text-amber-200">
      {/* Top Conservatory Command Header */}
      <header className="sticky top-0 z-40 bg-[#090c13]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className={cn("flex flex-wrap items-center justify-between gap-4 transition-all duration-200", getContainerWidthClass())}>
          {/* Logo & Instructor Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-bold text-xl shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              🎹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-white">PianoMaster</span>
                <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Conservatorio Flexible & Tutor 0 a 100
                </span>
              </div>
              <div className="text-[11px] text-white/50 flex items-center gap-1.5 font-light">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Maestro Aurelio disponible</span>
              </div>
            </div>
          </div>

          {/* Center: Metronome */}
          <div className="hidden md:flex items-center">
            <Metronome />
          </div>

          {/* Right: Progress & AI Chat Button */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-xs font-mono">
              <span className="text-white/40">Progreso 0 a 100</span>
              <span className="text-amber-400 font-bold">{progressPercent}% ({completedCount}/{LESSONS.length})</span>
            </div>

            {/* Quick Practice 60s Blitz Button */}
            <button
              type="button"
              id="btn-header-quick-practice"
              onClick={() => setIsQuickPracticeOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-black text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 hover:scale-105 active:scale-95"
              title="Práctica Rápida de 60 segundos basada en tus habilidades desbloqueadas"
            >
              <Zap size={14} className="fill-black text-black shrink-0" />
              <span>Práctica Rápida</span>
              <span className="px-1.5 py-0.5 rounded bg-black/25 text-black text-[10px] font-extrabold">
                60s
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsInstructorChatOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider transition-all border border-white/10 hover:scale-105"
            >
              <Bot size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Consultar al Maestro</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Navigation Bar */}
      <div className="border-b border-white/5 bg-[#0a0d16] px-4">
        <div className={cn("flex flex-col xl:flex-row xl:items-center justify-between gap-3 py-2 transition-all duration-200", getContainerWidthClass())}>
          {/* Main Module Tabs */}
          <div className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar">
            {[
              { id: 'curriculum', label: 'Currículo 0 a 100', icon: GraduationCap },
              { id: 'waterfall', label: 'Catarata de Tonos', icon: Flame, badge: 'MIDI' },
              { id: 'wavStudio', label: 'Bases .WAV Jam', icon: Disc, badge: 'AUDIO' },
              { id: 'chords', label: 'Biblioteca de Acordes', icon: Music },
              { id: 'circle', label: 'Círculo de Quintas', icon: Compass },
              { id: 'gym', label: 'Gimnasio Práctico', icon: Target },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isWaterfall = tab.id === 'waterfall';
              const isWav = tab.id === 'wavStudio';
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`nav-tab-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id !== 'curriculum') {
                      setSelectedLesson(null);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-mono whitespace-nowrap transition-all",
                    isActive
                      ? isWaterfall
                        ? "bg-gradient-to-r from-cyan-400 to-sky-500 text-black font-bold shadow-lg shadow-cyan-500/30"
                        : isWav
                          ? "bg-gradient-to-r from-amber-400 to-orange-400 text-black font-bold shadow-lg shadow-amber-400/30"
                          : "bg-amber-400 text-black font-bold shadow"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                    isWaterfall && !isActive && "text-cyan-300 hover:text-cyan-200",
                    isWav && !isActive && "text-amber-300 hover:text-amber-200"
                  )}
                >
                  <Icon size={16} className={isWaterfall && !isActive ? "text-cyan-400" : isWav && !isActive ? "text-amber-400" : ""} />
                  <span>{tab.label}</span>
                  {'badge' in tab && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.2 rounded font-extrabold",
                      isActive ? "bg-black/30 text-black" : isWav ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "bg-cyan-400/20 text-cyan-300 border border-cyan-400/40"
                    )}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Layout Width Selector Toggle */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 shadow-inner">
              <span className="text-[10px] font-mono text-white/40 px-1.5 flex items-center gap-1">
                <Maximize2 size={11} className="text-amber-400" />
                <span className="hidden xl:inline">Ancho:</span>
              </span>
              {[
                { id: 'ultra', label: 'Ultra-Flex', short: 'Ultra (98%)' },
                { id: 'wide', label: 'Panorámico', short: '1550px' },
                { id: 'standard', label: 'Estándar', short: '1280px' },
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleLayoutWidthChange(mode.id as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-mono transition-all",
                    layoutWidth === mode.id
                      ? "bg-amber-400 text-black font-bold shadow"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                  title={`Cambiar diseño a modo ${mode.label}`}
                >
                  <span className="hidden sm:inline">{mode.label}</span>
                  <span className="sm:hidden">{mode.short}</span>
                </button>
              ))}
            </div>

            {/* Global Sound Selector */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10 shadow-inner">
              <span className="text-[10px] font-mono text-white/40 px-2 flex items-center gap-1">
                <Volume2 size={12} className="text-amber-400" />
                <span>Sonido:</span>
              </span>
              {SOUND_PRESETS.map((preset) => {
                const isSelected = soundPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleGlobalSoundPresetChange(preset.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono transition-all",
                      isSelected
                        ? "bg-amber-400 text-black font-bold shadow scale-[1.02]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                    title={preset.description}
                  >
                    <span>{preset.icon}</span>
                    <span className="hidden lg:inline">{preset.label}</span>
                    <span className="lg:hidden">{preset.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Global Split Keyboard Quick Toggle in Header */}
            <button
              type="button"
              id="btn-header-split-toggle"
              onClick={handleGlobalSplitToggle}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-mono transition-all border shadow-inner",
                splitConfig.enabled
                  ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-md shadow-indigo-500/30 scale-[1.02]"
                  : "bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              )}
              title="Dividir teclado: timbres independientes para mano izquierda (acompañamiento) y derecha (melodía)"
            >
              <Sliders size={13} className={splitConfig.enabled ? "text-indigo-200" : "text-amber-400"} />
              <span className="hidden sm:inline">Teclado Dividido</span>
              <span className="sm:hidden">Split</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[9px] font-extrabold",
                splitConfig.enabled ? "bg-white/25 text-white" : "bg-black/40 text-white/40"
              )}>
                {splitConfig.enabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Working View */}
      <main className={cn("flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-12 transition-all duration-300", getContainerWidthClass())}>
        <AnimatePresence mode="wait">
          {/* TAB 1: CURRÍCULO 0 A 100 */}
          {activeTab === 'curriculum' && (
            <motion.div
              key="curriculum"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {selectedLesson ? (
                <LessonViewer
                  lesson={selectedLesson}
                  userProgress={userProgress}
                  onBack={() => setSelectedLesson(null)}
                  onSelectLesson={(id) => {
                    const found = LESSONS.find(l => l.id === id);
                    if (found) setSelectedLesson(found);
                  }}
                  onPassLesson={handlePassLesson}
                />
              ) : (
                <CurriculumRoadmap
                  userProgress={userProgress}
                  onSelectLesson={(lesson) => setSelectedLesson(lesson)}
                  onSetLevel={handleSetUserLevel}
                />
              )}
            </motion.div>
          )}

          {/* TAB: CATARATA DE TONOS (PIANO ROLL WATERFALL & MIDIs) */}
          {activeTab === 'waterfall' && (
            <motion.div
              key="waterfall"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center max-w-3xl mx-auto space-y-2">
                <span className="text-cyan-400 text-xs font-mono uppercase tracking-widest font-bold">
                  Cascada Visual & Ejercitación con Archivos MIDI
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">
                  Catarata de Tonos
                </h2>
                <p className="text-xs md:text-sm text-white/50 font-light leading-relaxed">
                  Observa cómo descienden los tonos en cascada directamente sobre las teclas: azul cyan para la melodía (mano derecha) y rojo coral para bajos y acordes (mano izquierda). Sube tus propios archivos MIDI o ejercita con obras de repertorio universal en Modo Espera o Modo Flujo.
                </p>
              </div>

              <ToneWaterfallGym onScoreGain={handleScoreGain} />
            </motion.div>
          )}

          {/* TAB: BASES .WAV JAM PLAY-ALONG */}
          {activeTab === 'wavStudio' && (
            <motion.div
              key="wavStudio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <WavBackingStudio />
            </motion.div>
          )}

          {/* TAB 2: BIBLIOTECA DE ACORDES & INVERSIONES */}
          {activeTab === 'chords' && (
            <motion.div
              key="chords"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="text-amber-400 text-xs font-mono uppercase tracking-widest">
                  Visualizador Armónico & Partituras
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">
                  Biblioteca Completa de Acordes e Inversiones
                </h2>
                <p className="text-xs md:text-sm text-white/50 font-light leading-relaxed">
                  Selecciona la nota raíz, la inversión y el tipo de acorde. Observa la notación en pentagrama en tiempo real para mejorar tu lectura a primera vista y consulta las teclas en el teclado.
                </p>
              </div>

              {/* View Mode Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                <div className="flex items-center gap-1.5 p-1 glass rounded-2xl border border-white/10 text-xs font-mono">
                  <span className="text-white/40 px-2 hidden sm:inline">Visualización:</span>
                  {[
                    { id: 'both', label: '📖 Partitura + Teclado' },
                    { id: 'staff', label: '🎼 Solo Pentagrama' },
                    { id: 'piano', label: '🎹 Solo Teclado' },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setChordViewMode(mode.id as any)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl transition-all",
                        chordViewMode === mode.id
                          ? "bg-amber-400 text-black font-bold shadow"
                          : "text-white/60 hover:text-white"
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                {activePianoChord.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActivePianoChord([]);
                      setActiveChordInfo({
                        root: '',
                        type: '',
                        inversion: 0,
                        name: 'Sin acorde seleccionado'
                      });
                    }}
                    className="text-xs font-mono text-amber-400 hover:underline"
                  >
                    Limpiar Selección
                  </button>
                )}
              </div>

              {/* Real-time Staff Visualizer */}
              {(chordViewMode === 'both' || chordViewMode === 'staff') && (
                <StaffVisualizer
                  notes={activePianoChord}
                  chordName={activeChordInfo.name}
                  root={activeChordInfo.root}
                  chordType={activeChordInfo.type}
                  inversion={activeChordInfo.inversion}
                />
              )}

              {/* Piano Keyboard Display for Selected Chord */}
              {(chordViewMode === 'both' || chordViewMode === 'piano') && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono text-white/50 px-2">
                    <span>Visualización en el Teclado:</span>
                  </div>
                  <Piano activeNotes={activePianoChord} />
                </div>
              )}

              <ChordChart 
                onChordSelect={(keys, info) => {
                  setActivePianoChord(keys);
                  if (info) {
                    setActiveChordInfo(info);
                  }
                }} 
              />
            </motion.div>
          )}

          {/* TAB 3: CÍRCULO DE QUINTAS */}
          {activeTab === 'circle' && (
            <motion.div
              key="circle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <CircleOfFifths onSelectChordKeys={(keys) => {
                setActivePianoChord(keys);
                setActiveChordInfo({
                  root: keys[0]?.replace(/\d/, '') || 'C',
                  type: 'Acorde Tonal',
                  inversion: 0,
                  name: `Acorde Tonal (${keys.map(k => k.replace(/\d/, '')).join('-')})`
                });
              }} />

              {/* Synchronized Notation & Acoustic Piano */}
              <div className="pt-4 space-y-6">
                <StaffVisualizer
                  notes={activePianoChord}
                  chordName={activeChordInfo.name}
                  root={activeChordInfo.root}
                  chordType={activeChordInfo.type}
                  inversion={activeChordInfo.inversion}
                />
                <div className="space-y-2">
                  <div className="text-xs font-mono text-white/50 px-2">Teclado Acústico Sincronizado:</div>
                  <Piano activeNotes={activePianoChord} />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: GIMNASIO PRÁCTICO */}
          {activeTab === 'gym' && (
            <motion.div
              key="gym"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <ExerciseSystem />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Maestro Aurelio Chat Modal */}
      <InstructorChatModal
        isOpen={isInstructorChatOpen}
        onClose={() => setIsInstructorChatOpen(false)}
        currentLesson={selectedLesson || undefined}
        userLevel={userProgress.userLevel}
      />

      {/* Quick Practice 60s Blitz Modal */}
      <QuickPracticeModal
        isOpen={isQuickPracticeOpen}
        onClose={() => setIsQuickPracticeOpen(false)}
        userProgress={userProgress}
        onSessionComplete={handleQuickPracticeComplete}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 text-center text-xs text-white/40 font-mono">
        <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-200", getContainerWidthClass())}>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">🎹</span>
            <span className="text-white font-semibold">PianoMaster</span>
            <span>— Conservatorio y Tutor Virtual de Piano</span>
          </div>
          <div>
            Metodología pedagógica adaptativa • De 0 a 100 con Maestro Aurelio
          </div>
        </div>
      </footer>
    </div>
  );
}
