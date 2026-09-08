import React, { useState, useEffect, lazy, Suspense } from 'react';
import type { SelectedChordInfo } from './components/ChordChart';
import { motion, AnimatePresence } from 'motion/react';
import { Award, BookOpen, Music2, Piano as PianoIcon } from 'lucide-react';
import { CurriculumRoadmap } from './components/CurriculumRoadmap';
import { Sidebar } from './components/shell/Sidebar';
import { TopBar } from './components/shell/TopBar';
import { BottomNav } from './components/shell/BottomNav';
import { PageHeader } from './components/ui/PageHeader';
import { TabId } from './components/shell/navConfig';
import { UpdateToast } from './components/shell/UpdateToast';
import { TooltipLayer } from './components/ui/Tooltip';
import { registerServiceWorker } from './lib/pwa';
import { startAutoSync, pull } from './lib/profileSync';
import { me, claimQrToken, type AuthState, type AuthUser } from './lib/auth';
import { LoginScreen } from './components/LoginScreen';
import { DailyRoutineCard } from './components/DailyRoutineCard';
import { itemKey, type RoutineItem } from './lib/scaleRoutine';
import { startReminderWatch } from './lib/reminders';
import { WaterfallSong } from './lib/midiWaterfall';
import { triggerCurriculumConfetti } from './lib/celebration';
import { LESSONS, Lesson, LessonPractice, UserProgress, DEFAULT_USER_PROGRESS } from './types';
import { spellChordNotes } from './lib/musicGymTheory';
import { midi } from './lib/midi';
import { cn } from './lib/utils';
import {
  SoundPreset,
  SOUND_PRESETS,
  getSavedSoundPreset,
  saveSoundPreset,
  SplitKeyboardConfig,
  getSavedSplitConfig,
  saveSplitConfig,
} from './lib/soundPresetsInfo';

/* El motor de sonido arrastra Tone.js (~200 kB). Acá sólo se usa para la
   nota de muestra al cambiar de timbre, así que se trae recién cuando alguien
   toca ese control, no antes de ver la primera pantalla. */
const playSample = async (note: string, preset: SoundPreset, dur: string) => {
  const { soundEngine } = await import('./lib/soundPresets');
  soundEngine.playNote(note, preset, dur);
};

/* ------------------------------------------------------------------ *
 *  Carga diferida por sección
 *
 *  Todo entraba en un solo paquete de 1,6 MB: para ver el currículo se
 *  descargaban también la catarata, el estudio de audio, los ocho gimnasios y
 *  Tone.js entero. Cada sección se trae recién cuando se entra, que es la
 *  diferencia entre abrir la app en un celular con datos y esperar.
 * ------------------------------------------------------------------ */
const Piano = lazy(() => import('./components/Piano').then(m => ({ default: m.Piano })));
const ChordChart = lazy(() => import('./components/ChordChart').then(m => ({ default: m.ChordChart })));
const ScaleProgressMap = lazy(() => import('./components/ScaleProgressMap').then(m => ({ default: m.ScaleProgressMap })));
const StaffVisualizer = lazy(() => import('./components/StaffVisualizer').then(m => ({ default: m.StaffVisualizer })));
const ExerciseSystem = lazy(() => import('./components/ExerciseSystem').then(m => ({ default: m.ExerciseSystem })));
const ToneWaterfallGym = lazy(() => import('./components/ToneWaterfallGym').then(m => ({ default: m.ToneWaterfallGym })));
const WavBackingStudio = lazy(() => import('./components/WavBackingStudio').then(m => ({ default: m.WavBackingStudio })));
const LessonViewer = lazy(() => import('./components/LessonViewer').then(m => ({ default: m.LessonViewer })));
const CircleOfFifths = lazy(() => import('./components/CircleOfFifths').then(m => ({ default: m.CircleOfFifths })));
const InstructorChatModal = lazy(() => import('./components/InstructorChatModal').then(m => ({ default: m.InstructorChatModal })));
const QuickPracticeModal = lazy(() => import('./components/QuickPracticeModal').then(m => ({ default: m.QuickPracticeModal })));
const LessonCelebrationModal = lazy(() => import('./components/LessonCelebrationModal').then(m => ({ default: m.LessonCelebrationModal })));
const ClassicalMethodsGym = lazy(() => import('./components/ClassicalMethodsGym').then(m => ({ default: m.ClassicalMethodsGym })));

/**
 * Con la app ya dibujada y el navegador sin nada que hacer, se traen los
 * trozos de las secciones. Así la navegación sigue siendo instantánea y —lo
 * que importa más— quedan en la caché del service worker, o sea que la app
 * sigue andando sin conexión aunque no hayas entrado antes a esa sección.
 * No se hace si el sistema pide ahorrar datos.
 */
function warmSections() {
  const conn = (navigator as any).connection;
  if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return;
  const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 2500));
  idle(() => {
    void import('./components/LessonViewer');
    void import('./components/ExerciseSystem');
    void import('./components/ToneWaterfallGym');
    void import('./components/ClassicalMethodsGym');
    void import('./components/ChordChart');
    void import('./components/CircleOfFifths');
  });
}

/** Mientras baja el trozo que falta. Ocupa alto para que no salte el layout. */
const SectionFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center gap-2 text-ink-3 text-sm">
    <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
    Cargando…
  </div>
);

const STORAGE_KEY = 'pianomaster_user_progress_v2';

type GymCategory = LessonPractice['gym'];

/**
 * El currículo puede crecer con lecciones intercaladas en medio del recorrido.
 * Si a alguien ya se le había destrabado la lección 12, no tiene sentido que
 * una lección nueva insertada en la 8 le aparezca con candado: se destraba
 * todo lo anterior al punto más lejano que ya había alcanzado.
 */
function migrateProgress(saved: UserProgress): UserProgress {
  const reached = [...saved.unlockedLessons, ...saved.completedLessons]
    .map(id => LESSONS.findIndex(l => l.id === id))
    .filter(i => i >= 0);
  if (!reached.length) return saved;
  const furthest = Math.max(...reached);
  const unlocked = new Set(saved.unlockedLessons);
  LESSONS.slice(0, furthest + 1).forEach(l => unlocked.add(l.id));
  return { ...saved, unlockedLessons: [...unlocked] };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('curriculum');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('pianomaster_sidebar') === 'collapsed');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  // Piezas transcriptas desde Bases .WAV que se mandan a la Catarata de Tonos
  const [importedSongs, setImportedSongs] = useState<WaterfallSong[]>([]);
  const [requestedSongId, setRequestedSongId] = useState<string | null>(null);
  const handleExportToWaterfall = (song: WaterfallSong) => {
    setImportedSongs(prev => [song, ...prev.filter(s => s.id !== song.id)]);
    setRequestedSongId(song.id);
    setActiveTab('waterfall');
    setSelectedLesson(null);
    window.scrollTo({ top: 0 });
  };

  // Service worker: offline + aviso cuando hay versión nueva
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);
  useEffect(() => {
    registerServiceWorker(apply => setApplyUpdate(() => apply));
    warmSections();
    /* Si el permiso de MIDI ya está dado, el instrumento queda andando desde
       el arranque en cualquier pantalla. Si todavía no, no se pide acá: el
       cartel del navegador aparecería sin que nadie lo haya pedido. */
    void midi.initIfAllowed();
  }, []);

  /* Sesión. Mientras se resuelve no se pinta nada: si no, se ve un destello
     de la app antes del login. Sin red se usa la copia local del usuario, para
     que la PWA siga abriendo y se pueda practicar igual. */
  const [auth, setAuth] = useState<AuthState | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const qrToken = url.searchParams.get('login');
    const clean = () => {
      url.searchParams.delete('login');
      window.history.replaceState({}, '', url.toString());
    };
    if (qrToken) {
      // El QR del escritorio abre /?login=<token>: el celular canjea y entra
      void claimQrToken(qrToken)
        .then(user => { clean(); void pull(); setAuth({ user, signupOpen: false, needsCode: false, firstRun: false, offline: false }); })
        .catch(() => { clean(); void me().then(setAuth); });
      return;
    }
    void me().then(setAuth);
  }, []);

  // Sincroniza al abrir y al volver del segundo plano, nunca en un intervalo:
  // el progreso cambia cuando se aprueba una lección, no cada 30 segundos.
  useEffect(() => {
    if (!auth?.user) return;
    return startReminderWatch();
  }, [auth?.user?.id]);

  useEffect(() => {
    if (!auth?.user) return;
    return startAutoSync(() => {
      /* Recargar es la forma simple de que todos los componentes relean el
         progreso nuevo, pero nunca puede volverse un bucle: como mucho una
         recarga por pestaña, y si hiciera falta otra se pide a mano. */
      try {
        if (sessionStorage.getItem('pianomaster_synced_reload')) return;
        sessionStorage.setItem('pianomaster_synced_reload', '1');
      } catch { /* modo privado: se recarga igual, una vez */ }
      window.location.reload();
    });
  }, [auth?.user?.id]);

  // Ir al gimnasio con una escala concreta de la rutina ya elegida
  const practiceRoutineItem = (item: RoutineItem) => {
    try { localStorage.setItem('pianomaster_routine_focus', itemKey(item.pc, item.scaleId)); } catch { /* modo privado */ }
    goToGym('scales');
  };

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setAiEnabled(Boolean(d?.aiEnabled)))
      .catch(() => setAiEnabled(false));
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(c => {
      localStorage.setItem('pianomaster_sidebar', c ? 'expanded' : 'collapsed');
      return !c;
    });
  };

  // Gimnasio al que apunta la lección abierta (el enganche "practicar esto")
  const [gymCategory, setGymCategory] = useState<GymCategory>('scales');
  const goToGym = (category: GymCategory) => {
    setGymCategory(category);
    setActiveTab('gym');
    setSelectedLesson(null);
    window.scrollTo({ top: 0 });
  };

  const navigate = (id: TabId) => {
    setActiveTab(id);
    if (id !== 'curriculum') setSelectedLesson(null);
    window.scrollTo({ top: 0 });
  };
  const [layoutWidth, setLayoutWidth] = useState<'ultra' | 'wide' | 'standard'>(() => {
    return (localStorage.getItem('pianomaster_layout_width') as any) || 'ultra';
  });

  const handleLayoutWidthChange = (mode: 'ultra' | 'wide' | 'standard') => {
    setLayoutWidth(mode);
    localStorage.setItem('pianomaster_layout_width', mode);
  };

  const getContainerWidthClass = () => {
    if (layoutWidth === 'ultra') return 'w-full max-w-[1880px] mx-auto';
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
  const [chordLibrarySubTab, setChordLibrarySubTab] = useState<'chords' | 'scaleMap'>('chords');
  const [isInstructorChatOpen, setIsInstructorChatOpen] = useState(false);
  const [isQuickPracticeOpen, setIsQuickPracticeOpen] = useState(false);
  const [celebratingLesson, setCelebratingLesson] = useState<{ lesson: Lesson; score: number } | null>(null);
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
    void playSample('C4', newPreset, '0.4n');
  };

  const handleGlobalSplitToggle = () => {
    const updated: SplitKeyboardConfig = {
      ...splitConfig,
      enabled: !splitConfig.enabled
    };
    setSplitConfig(updated);
    saveSplitConfig(updated);
    if (updated.enabled) {
      void playSample('C3', updated.leftPreset, '0.4n');
      setTimeout(() => { void playSample('G4', updated.rightPreset, '0.5n'); }, 200);
    }
  };

  // Persistent User Progress (0 to 100)
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return migrateProgress(JSON.parse(saved));
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
    const passedLesson = LESSONS.find(l => l.id === lessonId) || null;
    if (passedLesson) {
      setCelebratingLesson({ lesson: passedLesson, score });
      triggerCurriculumConfetti('grand');
    }

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

  /**
   * Lo que el nivel de partida regala: quien arranca en Intermedio ya sabe lo
   * de Principiante, y quien arranca en Avanzado, lo de Intermedio también.
   * Se deduce del campo `level` de cada lección en vez de una lista de ids
   * escrita a mano —esa lista se quedó vieja apenas se intercalaron lecciones
   * nuevas y dejó de destrabar nada.
   */
  const levelFloor = (level: UserProgress['userLevel']): string[] => {
    const incluye: Record<UserProgress['userLevel'], Lesson['level'][]> = {
      Principiante: [],
      Intermedio: ['Principiante'],
      Avanzado: ['Principiante', 'Intermedio'],
    };
    return LESSONS.filter(l => incluye[level].includes(l.level)).map(l => l.id);
  };

  const handleSetUserLevel = (level: 'Principiante' | 'Intermedio' | 'Avanzado') => {
    setUserProgress(prev => {
      /* Bajar de nivel vuelve a poner el candado en lo que nunca se aprobó:
         si no, elegir Avanzado una vez destrababa el currículo para siempre.
         Lo aprobado, lo que sigue a cada lección aprobada y la primera lección
         no se tocan nunca. */
      const unlocked = new Set<string>([LESSONS[0].id, ...prev.completedLessons, ...levelFloor(level)]);
      for (const id of prev.completedLessons) {
        const next = LESSONS[LESSONS.findIndex(l => l.id === id) + 1];
        if (next) unlocked.add(next.id);
      }
      return {
        ...prev,
        userLevel: level,
        unlockedLessons: LESSONS.filter(l => unlocked.has(l.id)).map(l => l.id),
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
  const containerClass = getContainerWidthClass();

  if (!auth) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-brand text-brand-ink flex items-center justify-center font-serif font-bold animate-pulse">P</div>
      </div>
    );
  }
  if (!auth.user) {
    return <LoginScreen state={auth} onAuthenticated={user => {
      // Traer el perfil de la cuenta antes de entrar, para no arrancar con el
      // progreso del dispositivo y pisarlo después.
      void pull().finally(() => { try { sessionStorage.removeItem('pianomaster_synced_reload'); } catch { /* ignorar */ } window.location.reload(); });
    }} />;
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex">
      <Sidebar
        active={activeTab}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        onOpenMaestro={() => setIsInstructorChatOpen(true)}
        aiEnabled={aiEnabled}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          active={activeTab}
          userProgress={userProgress}
          onQuickPractice={() => setIsQuickPracticeOpen(true)}
          onOpenMaestro={() => setIsInstructorChatOpen(true)}
          containerClass={containerClass}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          settings={{
            open: settingsOpen,
            onOpenChange: setSettingsOpen,
            layoutWidth,
            onLayoutWidthChange: handleLayoutWidthChange,
            soundPreset,
            onSoundPresetChange: handleGlobalSoundPresetChange,
            splitConfig,
            onSplitToggle: handleGlobalSplitToggle,
            user: auth.user,
          }}
        />

          {/* Main Working View */}
              <main className={cn(
            "flex-1 w-full transition-all duration-300",
            activeTab === 'waterfall' ? 'p-0 pb-[60px] lg:pb-0 max-w-none' : cn("px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 lg:pb-10", containerClass)
          )}>
            <Suspense fallback={<SectionFallback />}>
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
                      onGoToGym={goToGym}
                    />
                  ) : (
                    <>
                    <DailyRoutineCard onPractice={practiceRoutineItem} />
                    <CurriculumRoadmap
                      userProgress={userProgress}
                      onSelectLesson={(lesson) => setSelectedLesson(lesson)}
                      onSetLevel={handleSetUserLevel}
                    />
                    </>
                  )}
                </motion.div>
              )}

              {/* TAB: MÉTODOS CLÁSICOS (HANON, CZERNY, SUZUKI) */}
              {activeTab === 'classicalMethods' && (
                <motion.div
                  key="classicalMethods"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <ClassicalMethodsGym onScoreGain={handleScoreGain} />
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
                  <ToneWaterfallGym onScoreGain={handleScoreGain} extraSongs={importedSongs} requestedSongId={requestedSongId} />
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
                  <WavBackingStudio onExportToWaterfall={handleExportToWaterfall} />
                </motion.div>
              )}

              {/* TAB 2: BIBLIOTECA DE ACORDES & MAPA DE ESCALAS */}
              {activeTab === 'chords' && (
                <motion.div
                  key="chords"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* SUB-NAVIGATION: ACORDES vs MAPA DE ESCALAS */}
                  <PageHeader
                    eyebrow={chordLibrarySubTab === 'chords' ? 'Visualizador armónico y partituras' : 'Progreso tonal del pianista'}
                    title={chordLibrarySubTab === 'chords' ? 'Biblioteca de acordes e inversiones' : 'Mapa de escalas y dominio tonal'}
                    description={chordLibrarySubTab === 'chords'
                      ? 'Elegí la nota raíz, la inversión y el tipo de acorde. La notación en pentagrama se actualiza en tiempo real.'
                      : <>Tu dominio de <strong className="text-ink">escalas mayores</strong>, <strong className="text-ink">menores armónicas</strong> y <strong className="text-ink">menores melódicas</strong> en las 12 tonalidades.</>}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="seg">
                      <button type="button" data-active={chordLibrarySubTab === 'chords'} onClick={() => setChordLibrarySubTab('chords')} className="seg-item flex items-center gap-1.5">
                        <BookOpen size={13} /> Acordes e inversiones
                      </button>
                      <button type="button" data-active={chordLibrarySubTab === 'scaleMap'} onClick={() => setChordLibrarySubTab('scaleMap')} className="seg-item flex items-center gap-1.5">
                        <Award size={13} /> Mapa de escalas
                      </button>
                    </div>

                    <div className="seg">
                      {[
                        { id: 'both', label: 'Partitura + teclado', Icon: BookOpen },
                        { id: 'staff', label: 'Pentagrama', Icon: Music2 },
                        { id: 'piano', label: 'Teclado', Icon: PianoIcon },
                      ].map(mode => {
                        const ModeIcon = mode.Icon;
                        return (
                          <button key={mode.id} type="button" data-active={chordViewMode === mode.id} onClick={() => setChordViewMode(mode.id as any)} className="seg-item flex items-center gap-1.5">
                            <ModeIcon size={13} /> {mode.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Real-time Staff Visualizer */}
                  {activePianoChord.length > 0 && (
                    <div className="space-y-6">
                      {(chordViewMode === 'both' || chordViewMode === 'staff') && (
                        <StaffVisualizer
                          notes={activePianoChord}
                          chordName={activeChordInfo.name}
                          root={activeChordInfo.root}
                          chordType={activeChordInfo.type}
                          inversion={activeChordInfo.inversion}
                        />
                      )}

                      {/* Piano Keyboard Display for Selected Chord or Scale */}
                      {(chordViewMode === 'both' || chordViewMode === 'piano') && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs text-ink-3 px-1">
                            <span>Teclado</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActivePianoChord([]);
                                setActiveChordInfo({
                                  root: '',
                                  type: '',
                                  inversion: 0,
                                  name: 'Sin acorde o escala seleccionada'
                                });
                              }}
                              className="btn btn-ghost btn-sm text-brand-2"
                            >
                              Limpiar teclado
                            </button>
                          </div>
                          <Piano 
                            activeNotes={activePianoChord} 
                            chordRoot={activeChordInfo.root || undefined}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-VIEW 1: CHORDS & INVERSIONS */}
                  {chordLibrarySubTab === 'chords' && (
                    <div className="space-y-8">
                      <ChordChart 
                        onChordSelect={(keys, info) => {
                          setActivePianoChord(keys);
                          if (info) {
                            setActiveChordInfo(info);
                          }
                        }}
                        onOpenScaleMap={() => setChordLibrarySubTab('scaleMap')}
                      />
                    </div>
                  )}

                  {/* SUB-VIEW 2: MAPA DE ESCALAS & DOMINIO TONAL */}
                  {chordLibrarySubTab === 'scaleMap' && (
                    <div className="space-y-8">
                      <ScaleProgressMap
                        onSelectScaleForPiano={(notes, info) => {
                          setActivePianoChord(notes);
                          setActiveChordInfo({
                            root: info.root,
                            type: info.type,
                            inversion: 0,
                            name: info.name,
                          });
                        }}
                      />
                    </div>
                  )}
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
                  <CircleOfFifths onSelectChordKeys={(keys, rootName) => {
                    setActivePianoChord(keys);
                    // El nombre se arma con la escritura de la tonalidad, no con
                    // los nombres de tecla: Reb mayor es Db-F-Ab, no C#-F-G#.
                    const escrito = spellChordNotes(rootName, keys).map(k => k.replace(/\d/, ''));
                    setActiveChordInfo({
                      root: rootName,
                      type: 'Acorde Tonal',
                      inversion: 0,
                      name: `Acorde Tonal (${escrito.join('-')})`
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
                      <div className="text-xs text-ink-3 px-1">Teclado sincronizado</div>
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
                  <ExerciseSystem key={gymCategory} initialCategory={gymCategory} />
                </motion.div>
              )}
            </AnimatePresence>
            </Suspense>
              </main>


        <footer className={cn("hidden border-t border-line py-5 px-8 text-xs text-ink-3", activeTab !== 'waterfall' && "lg:block")}>
          <div className={cn("flex items-center justify-between gap-4", containerClass)}>
            <div className="flex items-center gap-2">
              <PianoIcon size={14} className="text-brand" />
              <span className="text-ink-2 font-medium">PianoMaster</span>
              <span>· Conservatorio y tutor virtual de piano</span>
            </div>
            <div>Metodología adaptativa · de 0 a 100 con el Maestro Aurelio</div>
          </div>
        </footer>
      </div>

      <BottomNav
        active={activeTab}
        onNavigate={navigate}
        onOpenMaestro={() => setIsInstructorChatOpen(true)}
      />

      {/* Global Maestro Aurelio Chat Modal */}
      {/* Los modales se montan recién cuando se abren: montados desde el
          principio, sus trozos se bajaban apenas entrabas aunque no los
          abrieras nunca. */}
      <Suspense fallback={null}>
      {isInstructorChatOpen && <InstructorChatModal
        isOpen={isInstructorChatOpen}
        onClose={() => setIsInstructorChatOpen(false)}
        currentLesson={selectedLesson || undefined}
        userLevel={userProgress.userLevel}
      />}

      {/* Quick Practice 60s Blitz Modal */}
      {isQuickPracticeOpen && <QuickPracticeModal
        isOpen={isQuickPracticeOpen}
        onClose={() => setIsQuickPracticeOpen(false)}
        userProgress={userProgress}
        onSessionComplete={handleQuickPracticeComplete}
      />}

      {/* Lesson Completion Celebration Modal with Confetti & Fanfare */}
      {celebratingLesson !== null && <LessonCelebrationModal
        isOpen={celebratingLesson !== null}
        lesson={celebratingLesson?.lesson || null}
        score={celebratingLesson?.score || 100}
        userProgress={userProgress}
        onClose={() => setCelebratingLesson(null)}
        onGoToNextLesson={(nextLessonId) => {
          setCelebratingLesson(null);
          const next = LESSONS.find(l => l.id === nextLessonId);
          if (next) {
            setSelectedLesson(next);
            setActiveTab('curriculum');
          }
        }}
      />}
      </Suspense>

      {applyUpdate && (
        <UpdateToast onApply={applyUpdate} onDismiss={() => setApplyUpdate(null)} />
      )}

      <TooltipLayer />
    </div>
  );
}
