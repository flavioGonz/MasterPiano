import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, Music, Compass, Target, MessageSquare, 
  Sparkles, Award, RotateCcw, Volume2, Bot, CheckCircle2 
} from 'lucide-react';
import { Piano } from './components/Piano';
import { ChordChart } from './components/ChordChart';
import { ExerciseSystem } from './components/ExerciseSystem';
import { LessonViewer } from './components/LessonViewer';
import { CurriculumRoadmap } from './components/CurriculumRoadmap';
import { CircleOfFifths } from './components/CircleOfFifths';
import { Metronome } from './components/Metronome';
import { InstructorChatModal } from './components/InstructorChatModal';
import { LESSONS, Lesson, UserProgress, DEFAULT_USER_PROGRESS } from './types';
import { cn } from './lib/utils';

const STORAGE_KEY = 'pianomaster_user_progress_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'curriculum' | 'chords' | 'circle' | 'gym'>('curriculum');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activePianoChord, setActivePianoChord] = useState<string[]>([]);
  const [isInstructorChatOpen, setIsInstructorChatOpen] = useState(false);

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

  const completedCount = userProgress.completedLessons.length;
  const progressPercent = Math.round((completedCount / LESSONS.length) * 100);

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col selection:bg-amber-400/30 selection:text-amber-200">
      {/* Top Conservatory Command Header */}
      <header className="sticky top-0 z-40 bg-[#090c13]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Instructor Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-bold text-xl shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              🎹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-white">PianoMaster</span>
                <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Instructor Virtual 0 a 100
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

            <button
              type="button"
              onClick={() => setIsInstructorChatOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold uppercase tracking-wider transition-all shadow-md hover:scale-105"
            >
              <Bot size={15} />
              <span className="hidden sm:inline">Consultar al Maestro</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Navigation Bar */}
      <div className="border-b border-white/5 bg-[#0a0d16] px-4">
        <div className="max-w-7xl mx-auto flex gap-2 md:gap-4 overflow-x-auto no-scrollbar py-2">
          {[
            { id: 'curriculum', label: 'Currículo 0 a 100', icon: GraduationCap },
            { id: 'chords', label: 'Biblioteca de Acordes', icon: Music },
            { id: 'circle', label: 'Círculo de Quintas', icon: Compass },
            { id: 'gym', label: 'Gimnasio Práctico', icon: Target },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id !== 'curriculum') {
                    setSelectedLesson(null);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-mono whitespace-nowrap transition-all",
                  isActive
                    ? "bg-amber-400 text-black font-bold shadow"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Working View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-12">
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
                  Visualizador Armónico
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">
                  Biblioteca Completa de Acordes e Inversiones
                </h2>
                <p className="text-xs md:text-sm text-white/50 font-light leading-relaxed">
                  Selecciona la nota raíz, la inversión (fundamental, 1ª o 2ª) y el tipo de acorde. Escucha el sonido y observa las teclas iluminadas en el piano abajo.
                </p>
              </div>

              {/* Piano Keyboard Display for Selected Chord */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-mono text-white/50 px-2">
                  <span>Visualización en el Teclado:</span>
                  {activePianoChord.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePianoChord([])}
                      className="text-amber-400 hover:underline"
                    >
                      Limpiar Teclado
                    </button>
                  )}
                </div>
                <Piano activeNotes={activePianoChord} />
              </div>

              <ChordChart onChordSelect={setActivePianoChord} />
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
              <CircleOfFifths onSelectChordKeys={setActivePianoChord} />

              <div className="pt-4 space-y-3">
                <div className="text-xs font-mono text-white/50 px-2">Teclado Acústico Sincronizado:</div>
                <Piano activeNotes={activePianoChord} />
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

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 text-center text-xs text-white/40 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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
