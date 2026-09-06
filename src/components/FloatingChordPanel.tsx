import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Volume2, Sparkles, Activity, Layers, 
  RotateCw, ChevronDown, ChevronUp, RefreshCw, X,
  Sliders, Music, CheckCircle2, ShieldAlert, Move,
  Maximize2, Minimize2, Radio
} from 'lucide-react';
import { 
  acousticChordDetector, 
  AcousticChordState, 
  NOTE_NAMES, 
  SOLFEGE_MAP 
} from '../lib/acousticChordDetector';
import { soundEngine, getSavedSoundPreset } from '../lib/soundPresets';
import { cn } from '../lib/utils';

interface FloatingChordPanelProps {
  defaultExpanded?: boolean;
}

export const FloatingChordPanel: React.FC<FloatingChordPanelProps> = ({
  defaultExpanded = true,
}) => {
  const [detectorState, setDetectorState] = useState<AcousticChordState>(() => acousticChordDetector.getState());
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<number>(65);
  const [dockPosition, setDockPosition] = useState<'bottom-right' | 'top-right'>('bottom-right');
  const [isMutedPreview, setIsMutedPreview] = useState<boolean>(false);

  // Subscribe to acoustic chord detector state
  useEffect(() => {
    const unsub = acousticChordDetector.subscribe((state) => {
      setDetectorState(state);
    });
    return unsub;
  }, []);

  const handleToggleListening = async () => {
    if (detectorState.isListening) {
      acousticChordDetector.stop();
    } else {
      await acousticChordDetector.start();
    }
  };

  const handleSensitivityChange = (newVal: number) => {
    setSensitivity(newVal);
    acousticChordDetector.setSensitivity(newVal);
  };

  const handleClear = () => {
    acousticChordDetector.clearHistory();
  };

  const handlePlayChordAudio = (keys: string[]) => {
    if (keys.length === 0) return;
    const preset = getSavedSoundPreset();
    keys.forEach((k, idx) => {
      setTimeout(() => {
        soundEngine.playNote(k, preset, '1n');
      }, idx * 25);
    });
  };

  const detected = detectorState.detectedChord;

  return (
    <div 
      id="acoustic-chord-floating-panel"
      className={cn(
        "fixed z-50 transition-all duration-300 pointer-events-auto",
        dockPosition === 'bottom-right' 
          ? "bottom-5 right-5 sm:bottom-7 sm:right-7" 
          : "top-20 right-5 sm:top-24 sm:right-7"
      )}
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          /* COMPACT FLOATING PILL WHEN MINIMIZED */
          <motion.div
            key="minimized-pill"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-black/90 border border-amber-400/40 shadow-2xl backdrop-blur-xl text-white"
          >
            {/* Live Mic Indicator */}
            <button
              type="button"
              onClick={handleToggleListening}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold transition-all",
                detectorState.isListening
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
                  : "bg-white/10 text-white/50 hover:text-white"
              )}
              title={detectorState.isListening ? "Micrófono activo (Clic para pausar)" : "Activar micrófono"}
            >
              {detectorState.isListening ? <Mic size={13} /> : <MicOff size={13} />}
              <span className="hidden sm:inline">
                {detectorState.isListening ? 'Escuchando' : 'Mic Inactivo'}
              </span>
            </button>

            {/* Current Chord summary or prompt */}
            <div 
              onClick={() => setIsExpanded(true)}
              className="cursor-pointer flex items-center gap-2 px-2 py-1 hover:text-amber-300 transition-colors"
            >
              {detected ? (
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-amber-400 font-bold font-serif text-sm">
                    {detected.symbol}
                  </span>
                  <span className="text-white/80 font-medium">
                    ({detected.fullNameEs})
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {detected.confidence}%
                  </span>
                </div>
              ) : (
                <span className="text-xs font-mono text-white/50">
                  {detectorState.isListening ? 'Toca un acorde...' : 'Detector de Acordes'}
                </span>
              )}
            </div>

            {/* Expand button */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Expandir panel flotante"
            >
              <ChevronUp size={16} />
            </button>
          </motion.div>
        ) : (
          /* FULL EXPANDED FLOATING INSPECTOR CARD */
          <motion.div
            key="expanded-panel"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-[92vw] sm:w-[410px] max-w-full rounded-3xl bg-[#090d16]/95 border border-amber-400/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-white overflow-hidden flex flex-col"
          >
            {/* Header with Title and Window Controls */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "p-1.5 rounded-xl border transition-all",
                  detectorState.isListening
                    ? "bg-amber-400/10 border-amber-400/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-white/40"
                )}>
                  <Activity size={15} className={detectorState.isListening ? "animate-pulse" : ""} />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
                    <span>Detector de Acordes</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold">
                      En Vivo
                    </span>
                  </h4>
                  <p className="text-[10px] font-mono text-white/40">
                    Análisis armónico acústico vía micrófono
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Reposition Toggle */}
                <button
                  type="button"
                  onClick={() => setDockPosition(p => p === 'bottom-right' ? 'top-right' : 'bottom-right')}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  title={dockPosition === 'bottom-right' ? 'Mover hacia arriba' : 'Mover hacia abajo'}
                >
                  <Move size={13} />
                </button>

                {/* Settings Toggle */}
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isSettingsOpen ? "bg-amber-400 text-black font-bold" : "hover:bg-white/10 text-white/40 hover:text-white"
                  )}
                  title="Ajustes de sensibilidad"
                >
                  <Sliders size={13} />
                </button>

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  title="Minimizar panel"
                >
                  <ChevronDown size={15} />
                </button>
              </div>
            </div>

            {/* Mic Activation Bar & Status Banner */}
            <div className="px-5 py-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between gap-3 text-xs font-mono">
              <button
                type="button"
                onClick={handleToggleListening}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all",
                  detectorState.isListening
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                )}
              >
                {detectorState.isListening ? <Mic size={14} /> : <MicOff size={14} />}
                <span>{detectorState.isListening ? 'Micrófono Activado' : 'Activar Micrófono'}</span>
              </button>

              {/* Volume VU Meter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40">Entrada:</span>
                <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-75",
                      detectorState.volume > 70 
                        ? "bg-rose-400" 
                        : detectorState.volume > 25 
                          ? "bg-amber-400" 
                          : "bg-emerald-400"
                    )}
                    style={{ width: `${detectorState.volume}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/50 w-6 text-right">{detectorState.volume}%</span>
              </div>
            </div>

            {/* Error banner if permission denied */}
            {detectorState.errorMessage && (
              <div className="px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0 text-rose-400" />
                <span>{detectorState.errorMessage}</span>
              </div>
            )}

            {/* Settings Drawer */}
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 py-3 border-b border-white/10 bg-black/60 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/60">Sensibilidad del Micrófono:</span>
                    <span className="text-amber-400 font-bold">{sensitivity}%</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={95}
                    step={1}
                    value={sensitivity}
                    onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span>Filtro de ruido ambiental</span>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={10} />
                      <span>Limpiar memoria de notas</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body: Main Chord Display Area */}
            <div className="p-5 space-y-5">
              {detected ? (
                /* CHORD IDENTIFIED STATE */
                <div className="space-y-4">
                  {/* Hero Chord Banner */}
                  <div className="relative p-5 rounded-2xl bg-gradient-to-br from-amber-400/15 via-black/40 to-amber-900/10 border border-amber-400/30 shadow-inner">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
                            Acorde Detectado
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {detected.confidence}% Certeza
                          </span>
                        </div>
                        
                        <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-wide leading-none pt-1">
                          {detected.fullNameEs}
                        </h2>

                        <div className="text-xs font-mono text-white/60">
                          {detected.fullNameEn} • <span className="text-amber-300 font-semibold">{detected.symbol}</span>
                        </div>
                      </div>

                      {/* Giant Cipher Badge & Sound button */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-serif font-black text-2xl shadow-lg shadow-amber-400/20">
                          {detected.symbol}
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePlayChordAudio(detected.suggestedKeys)}
                          className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-white transition-colors"
                          title="Escuchar acorde en el piano virtual"
                        >
                          <Volume2 size={13} />
                          <span>Escuchar</span>
                        </button>
                      </div>
                    </div>

                    {/* Inversion badge */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-amber-300">
                        <RotateCw size={12} className="text-amber-400" />
                        <span>{detected.inversionName}</span>
                      </div>

                      <div className="text-[11px] font-mono text-white/50">
                        Bajo acústico: <strong className="text-white">{SOLFEGE_MAP[detected.bassNote] || detected.bassNote}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Chord Notes breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-white/50">
                      <span>Notas Componentes:</span>
                      <span>{detected.detectedNotes.length} tonos armónicos</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detected.detectedNotes.map((noteName, idx) => (
                        <div 
                          key={noteName}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs font-mono"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="font-bold text-white font-serif">{noteName}</span>
                          <span className="text-white/40">({SOLFEGE_MAP[noteName] || noteName})</span>
                          <span className="text-[10px] text-amber-400/80 px-1 py-0.2 rounded bg-amber-400/10">
                            {idx === 0 ? '1' : idx === 1 ? '3' : idx === 2 ? '5' : '7'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mini Keyboard Representation */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-mono text-white/40">Posición en el Teclado:</div>
                    <div className="p-2.5 rounded-2xl bg-black/60 border border-white/10 flex justify-center">
                      <div className="flex relative h-16 w-full max-w-[280px]">
                        {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((whiteKey) => {
                          const isActive = detected.detectedNotes.includes(whiteKey);
                          return (
                            <div
                              key={whiteKey}
                              className={cn(
                                "flex-1 border border-black/30 rounded-b-md flex flex-col justify-end items-center pb-1 text-[10px] font-mono font-bold transition-colors",
                                isActive
                                  ? "bg-amber-400 text-black shadow-md shadow-amber-400/30"
                                  : "bg-white/90 text-black/60"
                              )}
                            >
                              <span>{whiteKey}</span>
                            </div>
                          );
                        })}
                        {/* Black Keys */}
                        {[
                          { note: 'C#', left: '11%' },
                          { note: 'D#', left: '25%' },
                          { note: 'F#', left: '54%' },
                          { note: 'G#', left: '68%' },
                          { note: 'A#', left: '82%' },
                        ].map((blackKey) => {
                          const isActive = detected.detectedNotes.includes(blackKey.note);
                          return (
                            <div
                              key={blackKey.note}
                              style={{ left: blackKey.left }}
                              className={cn(
                                "absolute top-0 w-[8%] h-10 rounded-b-sm z-10 border border-white/20 transition-colors",
                                isActive
                                  ? "bg-amber-500 shadow-md shadow-amber-500/40"
                                  : "bg-[#161a22]"
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Harmonic Pedagogy Note */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                      <Sparkles size={12} />
                      <span>Carácter Armónico</span>
                    </div>
                    <p className="text-white/70 font-light text-[11px] leading-relaxed">
                      {detected.harmonicDescription}
                    </p>
                  </div>
                </div>
              ) : (
                /* WAITING / LISTENING STATE */
                <div className="text-center py-6 px-4 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                  <div className="w-12 h-12 rounded-full mx-auto bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <Radio size={22} className={detectorState.isListening ? "animate-pulse" : ""} />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-sm font-serif font-bold text-white">
                      {detectorState.isListening ? 'Escuchando tu piano real...' : 'Micrófono en Espera'}
                    </h5>
                    <p className="text-xs font-mono text-white/50 max-w-[280px] mx-auto leading-relaxed">
                      {detectorState.isListening
                        ? 'Toca un acorde en bloque o arpegia sus notas (ej. Do Mayor, La menor, Sol 7) frente a tu micrófono.'
                        : 'Haz clic en "Activar Micrófono" para detectar acordes acústicos en tiempo real.'}
                    </p>
                  </div>

                  {!detectorState.isListening && (
                    <button
                      type="button"
                      onClick={handleToggleListening}
                      className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-amber-400/20"
                    >
                      Activar Micrófono Ahora
                    </button>
                  )}
                </div>
              )}

              {/* 12-Tone Chromagram (Pitch Class Profile Resonance Spectrum) */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
                  <span className="flex items-center gap-1">
                    <Activity size={12} className="text-amber-400" />
                    <span>Espectro Cromático (12 Semitonos)</span>
                  </span>
                  <span>{detectorState.activePitchClasses.length} activos</span>
                </div>

                <div className="grid grid-cols-12 gap-1 h-10 items-end p-2 rounded-xl bg-black/60 border border-white/5">
                  {NOTE_NAMES.map((name, idx) => {
                    const energy = detectorState.chromaVector[idx] || 0;
                    const isChordTone = detected?.detectedNotes.includes(name);
                    const isBaseActive = detectorState.activePitchClasses.includes(name);

                    return (
                      <div key={name} className="flex flex-col items-center gap-1 h-full justify-end">
                        <div 
                          className={cn(
                            "w-full rounded-t-sm transition-all duration-75",
                            isChordTone 
                              ? "bg-amber-400 shadow-sm shadow-amber-400/50" 
                              : isBaseActive 
                                ? "bg-emerald-400" 
                                : "bg-white/15"
                          )}
                          style={{ height: `${Math.max(10, Math.round(energy * 100))}%` }}
                        />
                        <span className={cn(
                          "text-[9px] font-mono leading-none",
                          isChordTone ? "text-amber-300 font-bold" : "text-white/40"
                        )}>
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Quick Action */}
            <div className="px-5 py-2.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Gimnasio Práctico Audio Engine</span>
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-white/50 hover:text-white transition-colors"
              >
                Resetear Notas
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
