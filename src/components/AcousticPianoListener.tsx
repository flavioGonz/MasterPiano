import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Volume2, Sparkles, CheckCircle2, AlertTriangle, 
  Sliders, Activity, Music, Radio, ShieldAlert, Zap, Flame,
  HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  pianoPitchDetector, 
  PitchFrameState, 
  DetectedPitchInfo 
} from '../lib/pitchDetector';
import { cn } from '../lib/utils';
import { ENHARMONIC_MAP } from '../lib/musicGymTheory';

interface AcousticPianoListenerProps {
  currentTargetNote?: string | null; // e.g. 'C4', 'E4', or base 'C'
  currentTargetNotes?: string[]; // e.g. ['C4', 'E4', 'G4'] for chords
  exerciseName?: string; // e.g. 'Escala Do Mayor' or 'Tríada Sol Mayor'
  onNoteDetected?: (note: string, info: DetectedPitchInfo) => void;
  onCorrectMatch?: (note: string, info: DetectedPitchInfo) => void;
  onMismatch?: (playedNote: string, targetNote: string) => void;
  autoExpand?: boolean;
}

export const AcousticPianoListener: React.FC<AcousticPianoListenerProps> = ({
  currentTargetNote,
  currentTargetNotes,
  exerciseName = 'Ejercicio Activo',
  onNoteDetected,
  onCorrectMatch,
  onMismatch,
  autoExpand = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(autoExpand);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [frameState, setFrameState] = useState<PitchFrameState>(() => pianoPitchDetector.getState());
  
  // Settings
  const [sensitivity, setSensitivity] = useState<number>(0.015);
  const [a4Pitch, setA4Pitch] = useState<number>(440);

  // Match state
  const [lastMatchResult, setLastMatchResult] = useState<{
    status: 'correct' | 'wrong' | 'idle';
    played: string;
    expected: string;
    timestamp: number;
  }>({ status: 'idle', played: '', expected: '', timestamp: 0 });

  // Subscribe to real-time audio frames
  useEffect(() => {
    const unsub = pianoPitchDetector.subscribeFrame((state) => {
      setFrameState(state);
    });
    return unsub;
  }, []);

  // Update detector settings
  useEffect(() => {
    pianoPitchDetector.noiseThreshold = sensitivity;
    pianoPitchDetector.a4Calibration = a4Pitch;
  }, [sensitivity, a4Pitch]);

  // Subscribe to clean note onset events
  useEffect(() => {
    const unsub = pianoPitchDetector.subscribeNoteOnset((info) => {
      if (onNoteDetected) {
        onNoteDetected(info.note, info);
      }

      // Check comparison if target note or chord is provided
      if (currentTargetNote || (currentTargetNotes && currentTargetNotes.length > 0)) {
        const playedBase = info.noteBase;
        const playedFull = info.note;

        let isMatch = false;
        let expectedDisplay = '';

        if (currentTargetNote) {
          expectedDisplay = currentTargetNote;
          const targetBase = currentTargetNote.replace(/\d/, '');
          if (
            playedBase === targetBase || 
            ENHARMONIC_MAP[playedBase] === targetBase ||
            playedFull === currentTargetNote
          ) {
            isMatch = true;
          }
        } else if (currentTargetNotes && currentTargetNotes.length > 0) {
          expectedDisplay = currentTargetNotes.join(', ');
          const targetBases = currentTargetNotes.map(n => n.replace(/\d/, ''));
          if (
            targetBases.includes(playedBase) ||
            targetBases.includes(ENHARMONIC_MAP[playedBase] || '') ||
            currentTargetNotes.includes(playedFull)
          ) {
            isMatch = true;
          }
        }

        if (isMatch) {
          setLastMatchResult({
            status: 'correct',
            played: info.note,
            expected: expectedDisplay,
            timestamp: Date.now(),
          });
          if (onCorrectMatch) onCorrectMatch(info.note, info);
        } else {
          setLastMatchResult({
            status: 'wrong',
            played: info.note,
            expected: expectedDisplay,
            timestamp: Date.now(),
          });
          if (onMismatch) onMismatch(info.note, expectedDisplay);
        }
      }
    });

    return unsub;
  }, [currentTargetNote, currentTargetNotes, onNoteDetected, onCorrectMatch, onMismatch]);

  // Toggle Microphone
  const handleToggleMic = async () => {
    if (frameState.isListening) {
      pianoPitchDetector.stop();
      setLastMatchResult({ status: 'idle', played: '', expected: '', timestamp: 0 });
    } else {
      await pianoPitchDetector.start();
    }
  };

  // Cents needle position (-50 to +50 -> 0% to 100%)
  const centsNeedlePercent = Math.max(0, Math.min(100, ((frameState.cents + 50) / 100) * 100));
  const isWellTuned = Math.abs(frameState.cents) <= 7;

  return (
    <div className="rounded-3xl bg-surface border border-info/30 shadow-2xl overflow-hidden transition-all duration-300">
      {/* Top Banner Bar */}
      <div className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Module Title & Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleMic}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
              frameState.isListening
                ? "bg-emerald-500 text-black shadow-emerald-500/30 ring-2 ring-emerald-400 animate-pulse"
                : "bg-surface-3 hover:bg-surface-3 text-ink-2 border border-line-strong"
            )}
            title={frameState.isListening ? "Desactivar escucha" : "Activar micrófono"}
          >
            {frameState.isListening ? <Mic size={22} className="stroke-[2.5]" /> : <MicOff size={22} />}
          </button>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-info flex items-center gap-1.5">
                <Radio size={13} className={frameState.isListening ? "animate-pulse text-ok" : ""} />
                <span>Analizador Acústico de Piano Real</span>
              </span>
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
                frameState.isListening
                  ? "bg-emerald-500/20 text-ok border border-emerald-500/30"
                  : "bg-surface-3 text-ink-3"
              )}>
                {frameState.isListening ? 'Escuchando en vivo' : 'Micrófono en pausa'}
              </span>
            </div>
            <h4 className="text-base md:text-lg font-serif font-bold text-ink flex items-center gap-2">
              <span>Toca en tu piano físico</span>
              <span className="text-xs font-mono font-normal text-ink-3 hidden sm:inline">
                • Reconocimiento acústico por micrófono
              </span>
            </h4>
          </div>
        </div>

        {/* Right: Quick Controls & Expand Button */}
        <div className="flex items-center gap-2">
          {/* Main Action Button */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow",
              frameState.isListening
                ? "bg-rose-500/20 hover:bg-rose-500/30 text-danger border border-rose-500/30"
                : "bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-black font-extrabold shadow-cyan-500/20"
            )}
          >
            {frameState.isListening ? <MicOff size={14} /> : <Mic size={14} />}
            <span>{frameState.isListening ? 'Detener Micrófono' : 'Activar Micrófono'}</span>
          </button>

          {/* Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-xl border text-ink-2 hover:text-ink transition-all",
              showSettings ? "bg-surface-3 border-white/30 text-ink" : "bg-black/30 border-line"
            )}
            title="Configuración de audio y calibración"
          >
            <Sliders size={16} />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-black/30 border border-line text-ink-2 hover:text-ink transition-all"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Permission Denied Error Banner */}
      {frameState.errorMessage && (
        <div className="mx-4 mb-4 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3">
          <ShieldAlert size={18} className="shrink-0 text-danger mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">No se pudo acceder al micrófono</span>
            <span>{frameState.errorMessage}</span>
          </div>
        </div>
      )}

      {/* Expanded Live Gauge & Validation Workspace */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-line p-5 md:p-6 space-y-6 bg-black/30"
          >
            {/* Live Tuner & Note Visualizer Display Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Detected Note Card */}
              <div className="p-5 rounded-2xl bg-black/40 border border-line flex flex-col justify-between">
                <span className="text-xs font-mono text-ink-3 uppercase tracking-wider">
                  Nota Detectada en Vivo
                </span>
                <div className="my-2 text-center">
                  <div className={cn(
                    "text-4xl md:text-5xl font-serif font-black tracking-tight transition-colors duration-150",
                    frameState.isPitchDetected ? "text-info scale-105" : "text-ink/20"
                  )}>
                    {frameState.isPitchDetected ? frameState.note : '--'}
                  </div>
                  <div className="text-xs font-mono text-ink-3 pt-1">
                    {frameState.isPitchDetected 
                      ? `${frameState.solfege} • ${frameState.frequency} Hz`
                      : 'Esperando pulsación...'}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 border-t border-line pt-2">
                  <span>Rango: A1 a C7</span>
                  <span className={frameState.isPitchDetected ? "text-ok font-bold" : ""}>
                    {frameState.isPitchDetected ? 'Tono Claro' : 'Silencio'}
                  </span>
                </div>
              </div>

              {/* 2. Target Exercise Comparison Card */}
              <div className={cn(
                "p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between",
                lastMatchResult.status === 'correct'
                  ? "bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                  : lastMatchResult.status === 'wrong'
                    ? "bg-amber-950/40 border-amber-500/50"
                    : "bg-black/40 border-line"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-ink-3 uppercase tracking-wider">
                    Comparación de Ejercicio
                  </span>
                  <span className="text-[10px] font-mono text-info font-bold truncate max-w-[150px]">
                    {exerciseName}
                  </span>
                </div>

                <div className="my-2 text-center space-y-1">
                  <div className="text-xs font-mono text-ink-3">Nota(s) esperada(s):</div>
                  <div className="text-2xl md:text-3xl font-serif font-bold text-brand-2">
                    {currentTargetNote || (currentTargetNotes && currentTargetNotes.join(' - ')) || 'Cualquier nota'}
                  </div>
                  {lastMatchResult.status !== 'idle' && (
                    <div className={cn(
                      "text-xs font-mono font-bold flex items-center justify-center gap-1.5 pt-1",
                      lastMatchResult.status === 'correct' ? "text-ok" : "text-brand-2"
                    )}>
                      {lastMatchResult.status === 'correct' ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>¡Nota Correcta! (+15 Pts)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} />
                          <span>Tocaste {lastMatchResult.played} (esperada: {lastMatchResult.expected})</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[11px] font-mono text-ink-3 border-t border-line pt-2 flex items-center justify-between">
                  <span>Modo: Manos Libres</span>
                  <span className="text-brand-2 font-semibold">Validación Automática</span>
                </div>
              </div>

              {/* 3. Real-time VU & Tuner Cents Meter */}
              <div className="p-5 rounded-2xl bg-black/40 border border-line flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-ink-3 uppercase tracking-wider">Entrada & Afinador</span>
                  <span className="text-ink-2">A4 = {a4Pitch} Hz</span>
                </div>

                {/* Cents Tuning Gauge */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-ink-3 px-1">
                    <span>-50c (Bemol)</span>
                    <span className={cn("font-bold", isWellTuned && frameState.isPitchDetected ? "text-ok" : "text-ink-2")}>
                      {frameState.isPitchDetected ? `${frameState.cents > 0 ? '+' : ''}${frameState.cents} cents` : '0 cents'}
                    </span>
                    <span>+50c (Sost.)</span>
                  </div>
                  <div className="relative h-3 bg-black/60 rounded-full border border-line overflow-hidden">
                    {/* Center tick */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-emerald-400 z-10" />
                    {/* Needle */}
                    {frameState.isPitchDetected && (
                      <div 
                        className={cn(
                          "absolute top-0 bottom-0 w-2.5 -ml-1.25 rounded-full transition-all duration-100",
                          isWellTuned ? "bg-emerald-400 shadow-md shadow-emerald-400/50" : "bg-amber-400"
                        )}
                        style={{ left: `${centsNeedlePercent}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Input Volume VU Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-ink-3">
                    <span>Nivel de Entrada (Micrófono)</span>
                    <span className="text-info font-bold">{frameState.volume}%</span>
                  </div>
                  <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-line">
                    <div 
                      className={cn(
                        "h-full transition-all duration-75 rounded-full",
                        frameState.volume > 60 ? "bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400" : "bg-gradient-to-r from-cyan-400 to-emerald-400"
                      )}
                      style={{ width: `${frameState.volume}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Settings Drawer */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-2xl bg-black/50 border border-line space-y-4 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 text-brand-2 font-bold">
                    <Sliders size={14} />
                    <span>Calibración de Audio & Sensibilidad Acústica</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sensitivity / Noise Gate */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-ink-2">
                        <span>Umbral de Ruido (Filtro ambiental):</span>
                        <span className="text-info font-bold">{Math.round(sensitivity * 1000)} pts</span>
                      </div>
                      <input
                        type="range"
                        min="0.005"
                        max="0.05"
                        step="0.002"
                        value={sensitivity}
                        onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="text-[10px] text-ink-3">
                        Aumenta si tu habitación tiene ruido de fondo; redúcelo si tu piano suena suave.
                      </div>
                    </div>

                    {/* A4 Reference Calibration */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-ink-2">
                        <span>Frecuencia de Afinación Referencia (A4):</span>
                        <span className="text-brand-2 font-bold">{a4Pitch} Hz</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {[432, 440, 442, 444].map((hz) => (
                          <button
                            key={hz}
                            type="button"
                            onClick={() => setA4Pitch(hz)}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg border transition-all text-center",
                              a4Pitch === hz
                                ? "bg-amber-400 text-black font-bold border-amber-300"
                                : "bg-black/40 text-ink-2 border-line hover:text-ink"
                            )}
                          >
                            {hz} Hz
                          </button>
                        ))}
                      </div>
                      <div className="text-[10px] text-ink-3">
                        El estándar internacional de conservatorio es 440 Hz.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Helper Tip */}
            <div className="flex items-start gap-2.5 text-xs text-ink-3 bg-black/20 p-3 rounded-xl border border-line font-light">
              <HelpCircle size={15} className="text-info shrink-0 mt-0.5" />
              <span>
                <strong>Consejo del Conservatorio:</strong> Coloca tu dispositivo a 40–80 cm del teclado de tu piano real. Al pulsar cada tecla, el analizador detecta la frecuencia fundamental y validará automáticamente si coincide con la escala, tríada o ejercicio activo.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
