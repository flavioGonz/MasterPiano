import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Upload, Sparkles, 
  Trophy, CheckCircle2, ChevronRight, Sliders, Music, Zap, Flame, 
  HelpCircle, Eye, RefreshCw, Layers, Radio, Settings2, Download, Maximize2, Minimize2,
  Waves, GraduationCap
} from 'lucide-react';
import * as Tone from 'tone';
import { 
  WaterfallSong, WaterfallNote, PRELOADED_WATERFALL_SONGS, 
  parseMidiFile, midiToNoteName, noteNameToMidi 
} from '../lib/midiWaterfall';
import { soundEngine, SoundPreset, SOUND_PRESETS, getSavedSoundPreset } from '../lib/soundPresets';
import { cn } from '../lib/utils';
import { maestroVoice } from '../lib/speech';

interface ToneWaterfallGymProps {
  onScoreGain?: (points: number) => void;
}

export const ToneWaterfallGym: React.FC<ToneWaterfallGymProps> = ({ onScoreGain }) => {
  // -------------------------------------------------------------
  // ACTIVE SONG & LIBRARY STATE
  // -------------------------------------------------------------
  const [songList, setSongList] = useState<WaterfallSong[]>(PRELOADED_WATERFALL_SONGS);
  const [activeSongId, setActiveSongId] = useState<string>(PRELOADED_WATERFALL_SONGS[0].id);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSong = useMemo(() => {
    return songList.find(s => s.id === activeSongId) || songList[0];
  }, [songList, activeSongId]);

  // -------------------------------------------------------------
  // PLAYBACK & ENGINE STATE
  // -------------------------------------------------------------
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.5x, 0.75x, 1x, 1.25x
  
  // Modes: 'flow' (continuous rhythm game) or 'wait' (pauses at line until user hits note)
  const [practiceMode, setPracticeMode] = useState<'wait' | 'flow'>('wait');
  
  // Hands selection: 'both' | 'right' | 'left'
  const [activeHandFilter, setActiveHandFilter] = useState<'both' | 'right' | 'left'>('both');
  
  // Range selection for visual keyboard
  const [keyboardRange, setKeyboardRange] = useState<'auto' | '61' | '88' | '49'>('auto');

  // Mute audio backing vs user instrument
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Sound preset
  const [soundPreset, setSoundPreset] = useState<SoundPreset>(() => getSavedSoundPreset());

  // Web MIDI device status
  const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);

  // Stats & Performance
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [hitFeedback, setHitFeedback] = useState<{ text: string; color: string; id: number } | null>(null);
  const [pressedNotes, setPressedNotes] = useState<Set<number>>(new Set());

  // Fullscreen state for immersive cascade
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas & Animation refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const synthRef = useRef<Tone.PolySynth | null>(null);

  // -------------------------------------------------------------
  // AUDIO SYNTH INITIALIZATION
  // -------------------------------------------------------------
  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
      oscillator: { type: 'triangle' }
    }).toDestination();
    synthRef.current.volume.value = -4;

    return () => {
      synthRef.current?.dispose();
      synthRef.current = null;
    };
  }, []);

  // -------------------------------------------------------------
  // WEB MIDI API LISTENER (PLUG-AND-PLAY USB PIANOS)
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.requestMIDIAccess) return;

    let midiAccessObj: any = null;

    const onMidiMessage = (event: any) => {
      const [status, noteNumber, velocity] = event.data;
      const command = status >> 4;

      if (command === 9 && velocity > 0) {
        // Note On
        handleUserNotePress(noteNumber);
      } else if (command === 8 || (command === 9 && velocity === 0)) {
        // Note Off
        handleUserNoteRelease(noteNumber);
      }
    };

    navigator.requestMIDIAccess({ sysex: false })
      .then((access) => {
        midiAccessObj = access;
        const inputs = Array.from(access.inputs.values());
        if (inputs.length > 0) {
          const firstDevice = inputs[0] as any;
          setMidiDeviceName(firstDevice.name || 'Teclado USB MIDI Conectado');
          firstDevice.onmidimessage = onMidiMessage;
        }

        access.onstatechange = (e: any) => {
          if (e.port.type === 'input') {
            if (e.port.state === 'connected') {
              setMidiDeviceName(e.port.name || 'Teclado USB MIDI');
              e.port.onmidimessage = onMidiMessage;
            } else {
              setMidiDeviceName(null);
            }
          }
        };
      })
      .catch(() => {
        // Web MIDI not supported or permission denied
      });

    return () => {
      if (midiAccessObj) {
        midiAccessObj.onstatechange = null;
      }
    };
  }, []);

  // -------------------------------------------------------------
  // KEYBOARD COMPUTATION (MIN & MAX MIDI RANGE)
  // -------------------------------------------------------------
  const { minMidi, maxMidi } = useMemo(() => {
    if (keyboardRange === '88') {
      return { minMidi: 21, maxMidi: 108 }; // A0 to C8
    }
    if (keyboardRange === '61') {
      return { minMidi: 36, maxMidi: 96 }; // C2 to C7
    }
    if (keyboardRange === '49') {
      return { minMidi: 48, maxMidi: 84 }; // C3 to C6
    }

    // Auto range: Calculate based on active song notes
    if (!activeSong || activeSong.notes.length === 0) {
      return { minMidi: 48, maxMidi: 84 };
    }

    let min = 127;
    let max = 0;
    activeSong.notes.forEach(n => {
      if (n.midi < min) min = n.midi;
      if (n.midi > max) max = n.midi;
    });

    // Expand margin by 2 semitones to give visual breathing space
    min = Math.max(21, min - 2);
    max = Math.min(108, max + 2);

    // Snap min to nearest C if possible for clean visual layout
    const snappedMin = Math.max(21, min - (min % 12));
    const snappedMax = Math.min(108, max + (12 - (max % 12)));

    return { minMidi: snappedMin, maxMidi: snappedMax };
  }, [keyboardRange, activeSong]);

  // Keys to display in range
  const pianoKeys = useMemo(() => {
    const keys: { midi: number; name: string; isBlack: boolean; noteLetter: string }[] = [];
    for (let m = minMidi; m <= maxMidi; m++) {
      const name = midiToNoteName(m);
      const isBlack = name.includes('#');
      const noteLetter = name.replace(/\d/, '');
      keys.push({ midi: m, name, isBlack, noteLetter });
    }
    return keys;
  }, [minMidi, maxMidi]);

  // White keys count (used to compute column widths)
  const whiteKeys = useMemo(() => {
    return pianoKeys.filter(k => !k.isBlack);
  }, [pianoKeys]);

  // -------------------------------------------------------------
  // NOTE RECOGNITION & USER INPUT
  // -------------------------------------------------------------
  const handleUserNotePress = useCallback((midi: number) => {
    setPressedNotes(prev => new Set(prev).add(midi));

    // Play user audio sound
    const noteName = midiToNoteName(midi);
    soundEngine.playNote(noteName, soundPreset, '0.8s');

    // Validate against active target notes at the hit line
    if (!activeSong) return;

    // Filter notes by selected hand
    const notesToConsider = activeSong.notes.filter(n => {
      if (activeHandFilter === 'right') return n.hand === 'right';
      if (activeHandFilter === 'left') return n.hand === 'left';
      return true;
    });

    // Window around current time (+- 0.3s)
    const activeTarget = notesToConsider.find(n => {
      const timeDiff = Math.abs(n.time - currentTime);
      return n.midi === midi && timeDiff < 0.45;
    });

    if (activeTarget) {
      // Hit!
      setScore(prev => prev + 50 + streak * 5);
      setStreak(prev => {
        const next = prev + 1;
        if (next > maxStreak) setMaxStreak(next);
        return next;
      });
      setHitFeedback({ text: '¡PERFECTO!', color: '#38bdf8', id: Date.now() });
      if (onScoreGain) onScoreGain(25);

      // In wait mode, if this was the note that held the waterfall, resume playback
      if (practiceMode === 'wait') {
        setIsPlaying(true);
      }
    }
  }, [activeSong, activeHandFilter, currentTime, streak, maxStreak, practiceMode, soundPreset, onScoreGain]);

  const handleUserNoteRelease = useCallback((midi: number) => {
    setPressedNotes(prev => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, []);

  // -------------------------------------------------------------
  // ANIMATION LOOP (WATERFALL RENDERING ON CANVAS)
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localTime = currentTime;

    const render = (timestamp: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      // Handle time advancement if playing
      if (isPlaying) {
        // Wait Mode logic: check if there is an unplayed note at the hit line
        let shouldPauseForWait = false;
        if (practiceMode === 'wait' && activeSong) {
          const notesAtStrike = activeSong.notes.filter(n => {
            if (activeHandFilter === 'right' && n.hand !== 'right') return false;
            if (activeHandFilter === 'left' && n.hand !== 'left') return false;
            return n.time <= localTime + 0.05 && n.time >= localTime - 0.15;
          });

          if (notesAtStrike.length > 0) {
            // Check if any of these notes are NOT currently being pressed
            const isAnyPressed = notesAtStrike.some(n => pressedNotes.has(n.midi));
            if (!isAnyPressed) {
              shouldPauseForWait = true;
            }
          }
        }

        if (shouldPauseForWait) {
          // Pause waterfall until user strikes the key
          setIsPlaying(false);
        } else {
          localTime += delta * playbackSpeed;
          if (localTime >= activeSong.duration + 2) {
            localTime = 0; // Loop back
          }
          setCurrentTime(localTime);
        }
      }

      // Resize canvas to match display size
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;

      // Clear dark background with subtle vignette
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle cosmic/nebula vertical lane dividers
      const totalWhiteKeys = whiteKeys.length;
      const whiteKeyWidth = width / totalWhiteKeys;

      // Hit line position (right above the bottom border)
      const hitLineY = height - 20;

      // Draw vertical lane guides
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= totalWhiteKeys; i++) {
        const x = i * whiteKeyWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, hitLineY);
        ctx.stroke();
      }

      // Map each MIDI pitch to its exact X position and width
      const getNoteXAndWidth = (midi: number): { x: number; w: number; isBlack: boolean } => {
        let whiteIndex = 0;
        for (let m = minMidi; m < midi; m++) {
          const name = midiToNoteName(m);
          if (!name.includes('#')) whiteIndex++;
        }

        const name = midiToNoteName(midi);
        const isBlack = name.includes('#');

        if (!isBlack) {
          return {
            x: whiteIndex * whiteKeyWidth,
            w: whiteKeyWidth,
            isBlack: false
          };
        } else {
          // Black key sits between two white keys
          const leftWhiteX = whiteIndex * whiteKeyWidth;
          const blackWidth = whiteKeyWidth * 0.65;
          return {
            x: leftWhiteX - blackWidth / 2,
            w: blackWidth,
            isBlack: true
          };
        }
      };

      // Pixels per second falling speed
      const pixelsPerSecond = 160 * playbackSpeed;

      // Draw Falling Notes
      if (activeSong) {
        const notesToRender = activeSong.notes.filter(n => {
          if (activeHandFilter === 'right' && n.hand !== 'right') return false;
          if (activeHandFilter === 'left' && n.hand !== 'left') return false;

          // Check if within visible time window (around 3.5 seconds ahead)
          const timeToHit = n.time - localTime;
          return timeToHit > -1.5 && timeToHit < 4.0;
        });

        // Separate into non-black and black notes so black notes draw on top
        notesToRender.forEach(note => {
          const { x, w, isBlack } = getNoteXAndWidth(note.midi);
          const timeToHit = note.time - localTime;
          const noteY = hitLineY - timeToHit * pixelsPerSecond;
          const noteHeight = Math.max(16, note.duration * pixelsPerSecond);

          // Note top Y and bottom Y
          const topY = noteY - noteHeight;
          const bottomY = noteY;

          // Color palette matching the user's reference picture:
          // Right Hand = Cyan / Electric Neon Sky Blue
          // Left Hand = Crimson / Hot Rose Red
          const isRight = note.hand === 'right';
          const isAtHitLine = Math.abs(timeToHit) < 0.15;
          const isNotePressed = pressedNotes.has(note.midi);

          ctx.save();

          // Capsule rounded rectangle
          const radius = Math.min(8, w / 3);
          ctx.beginPath();
          ctx.roundRect(x + 2, topY, w - 4, noteHeight, radius);

          // Gradient fill
          const grad = ctx.createLinearGradient(x, topY, x + w, bottomY);
          if (isRight) {
            // Right Hand: Electric Cyan (#00f0ff to #0284c7)
            grad.addColorStop(0, isAtHitLine ? '#a5f3fc' : '#38bdf8');
            grad.addColorStop(0.5, '#0ea5e9');
            grad.addColorStop(1, '#0369a1');
          } else {
            // Left Hand: Crimson Red (#ff2a5f to #9f1239)
            grad.addColorStop(0, isAtHitLine ? '#fecdd3' : '#fb7185');
            grad.addColorStop(0.5, '#f43f5e');
            grad.addColorStop(1, '#be123c');
          }

          ctx.fillStyle = grad;
          ctx.fill();

          // Outer Glow
          if (isAtHitLine || isNotePressed) {
            ctx.shadowColor = isRight ? '#38bdf8' : '#fb7185';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.shadowColor = isRight ? 'rgba(56, 189, 248, 0.4)' : 'rgba(251, 113, 133, 0.4)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = isRight ? 'rgba(186, 230, 253, 0.6)' : 'rgba(254, 205, 211, 0.6)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Note Name Text inside capsule (just like the image!)
          const noteBase = note.name.replace(/\d/, '');
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(10, Math.min(14, w * 0.45))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw text near leading edge of the falling note
          const textY = Math.max(topY + 12, Math.min(bottomY - 10, bottomY - 14));
          ctx.fillText(noteBase, x + w / 2, textY);

          // If note is at strike line, draw upward particle laser beam
          if (isAtHitLine) {
            const beamGrad = ctx.createLinearGradient(x, hitLineY, x, hitLineY - 80);
            beamGrad.addColorStop(0, isRight ? 'rgba(56, 189, 248, 0.8)' : 'rgba(244, 63, 94, 0.8)');
            beamGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = beamGrad;
            ctx.fillRect(x + 1, hitLineY - 80, w - 2, 80);
          }

          ctx.restore();
        });
      }

      // Draw Glowing Strike / Hit Line right above the keyboard
      ctx.save();
      // Outer glow of strike line
      const lineGlow = ctx.createLinearGradient(0, hitLineY - 6, width, hitLineY - 6);
      lineGlow.addColorStop(0, '#38bdf8');
      lineGlow.addColorStop(0.5, '#f43f5e');
      lineGlow.addColorStop(1, '#38bdf8');

      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = lineGlow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, hitLineY);
      ctx.lineTo(width, hitLineY);
      ctx.stroke();

      // Laser core white line
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, hitLineY);
      ctx.lineTo(width, hitLineY);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, playbackSpeed, activeSong, activeHandFilter, practiceMode, pressedNotes, minMidi, maxMidi, whiteKeys]);

  // -------------------------------------------------------------
  // AUDIO SCHEDULING (Tone.js auto-play in Flow Mode)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying || practiceMode !== 'flow' || isMuted || !activeSong) return;

    // Check notes that should sound within the next step
    const notesToPlay = activeSong.notes.filter(n => {
      if (activeHandFilter === 'right' && n.hand !== 'right') return false;
      if (activeHandFilter === 'left' && n.hand !== 'left') return false;
      return Math.abs(n.time - currentTime) < 0.04;
    });

    notesToPlay.forEach(n => {
      try {
        synthRef.current?.triggerAttackRelease(n.name, n.duration, undefined, n.velocity);
      } catch {
        // ignore audio safety
      }
    });
  }, [isPlaying, currentTime, practiceMode, isMuted, activeSong, activeHandFilter]);

  // -------------------------------------------------------------
  // FILE UPLOAD HANDLER (.MID / .MIDI)
  // -------------------------------------------------------------
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsedSong = parseMidiFile(buffer, file.name);

      setSongList(prev => [parsedSong, ...prev]);
      setActiveSongId(parsedSong.id);
      setCurrentTime(0);
      setIsPlaying(false);
      maestroVoice.speak(`¡Excelente! Subiste "${parsedSong.title}". Analicé ${parsedSong.notesCount} notas listas para entrenar en la catarata.`);
    } catch (err) {
      console.error('Error parsing MIDI file:', err);
      maestroVoice.speak('Che, hubo un problema al leer el archivo MIDI. Asegurate de que sea un archivo .mid estándar.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Toggle Play / Pause
  const handleTogglePlay = async () => {
    await Tone.start();
    setIsPlaying(prev => !prev);
  };

  // Rewind
  const handleRewind = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col space-y-4 select-none",
        isFullscreen ? "fixed inset-0 z-50 bg-[#06080e] p-4 overflow-y-auto" : ""
      )}
    >
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER CONTROLS & HUD */}
      {/* ------------------------------------------------------------- */}
      <div className="glass p-4 sm:p-5 rounded-3xl border border-sky-400/20 bg-gradient-to-r from-[#0a0f1d] via-[#090b14] to-[#120a15] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Module Title & Song selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-rose-500 flex items-center justify-center text-black font-extrabold shadow-lg shadow-cyan-500/20 shrink-0">
            <Flame size={20} className="text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                Catarata de Tonos
              </span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.2 rounded-full font-mono">
                Piano Roll Cascada
              </span>
              {midiDeviceName && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>MIDI: {midiDeviceName}</span>
                </span>
              )}
            </div>

            {/* Song Picker Dropdown */}
            <div className="flex items-center gap-2 mt-1">
              <select
                value={activeSongId}
                onChange={(e) => {
                  setActiveSongId(e.target.value);
                  setCurrentTime(0);
                  setIsPlaying(false);
                }}
                className="bg-black/50 border border-white/20 text-white font-serif font-bold text-sm md:text-base rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {songList.map(song => (
                  <option key={song.id} value={song.id} className="bg-slate-900 text-white">
                    {song.title} - {song.composer} ({song.difficulty})
                  </option>
                ))}
              </select>

              {/* Upload MIDI Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".mid,.midi"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload-midi"
              />
              <label
                htmlFor="file-upload-midi"
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-300 border border-cyan-400/40 text-xs font-mono transition-all shadow-sm shrink-0"
                title="Subir archivo .MID o .MIDI desde tu computadora"
              >
                <Upload size={13} />
                <span className="hidden sm:inline">Subir MIDI</span>
                <span className="sm:hidden">MIDI</span>
              </label>
            </div>
          </div>
        </div>

        {/* Practice Mode & Hands Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Practice Mode: Espera vs Flujo */}
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={() => setPracticeMode('wait')}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1",
                practiceMode === 'wait'
                  ? "bg-cyan-400 text-black font-bold shadow"
                  : "text-white/60 hover:text-white"
              )}
              title="Modo Espera: la catarata se detiene hasta que toques la tecla correcta"
            >
              <Pause size={13} />
              <span>Espera</span>
            </button>

            <button
              type="button"
              onClick={() => setPracticeMode('flow')}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1",
                practiceMode === 'flow'
                  ? "bg-cyan-400 text-black font-bold shadow"
                  : "text-white/60 hover:text-white"
              )}
              title="Modo Flujo: ritmo continuo al tempo real con puntuación"
            >
              <Waves size={13} />
              <span>Flujo</span>
            </button>
          </div>

          {/* Hands Filter (Both / Right / Left) */}
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10 text-xs font-mono">
            {[
              { id: 'both', label: 'Ambas', color: 'text-amber-300' },
              { id: 'right', label: 'Derecha (Cyan)', color: 'text-cyan-400' },
              { id: 'left', label: 'Izquierda (Rojo)', color: 'text-rose-400' },
            ].map(hand => (
              <button
                key={hand.id}
                type="button"
                onClick={() => setActiveHandFilter(hand.id as any)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl transition-all",
                  activeHandFilter === hand.id
                    ? "bg-white/20 text-white font-bold"
                    : "text-white/50 hover:text-white"
                )}
              >
                {hand.label}
              </button>
            ))}
          </div>

          {/* Speed Multiplier */}
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10 text-xs font-mono">
            {[0.5, 0.75, 1.0, 1.25].map(speed => (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaybackSpeed(speed)}
                className={cn(
                  "px-2 py-1 rounded-xl transition-all",
                  playbackSpeed === speed
                    ? "bg-amber-400 text-black font-bold"
                    : "text-white/50 hover:text-white"
                )}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title="Pantalla completa para máxima inmersión"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECONDARY HUD: SCORE, STREAK & HIT ACCURACY NOTIFIER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-white/70">
            <span className="text-white/40">PUNTOS:</span>
            <strong className="text-cyan-300 font-bold text-sm">{score}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-white/70 border-l border-white/10 pl-3">
            <span className="text-white/40">RACHA:</span>
            <strong className="text-rose-400 font-bold text-sm flex items-center gap-1">
              <span>{streak}</span>
              <Flame size={13} className="text-rose-400" />
            </strong>
          </div>
          <div className="flex items-center gap-1.5 text-white/70 border-l border-white/10 pl-3">
            <span className="text-white/40">COMPOSITOR:</span>
            <span className="text-white/80">{activeSong.composer}</span>
          </div>
        </div>

        {/* Dynamic Hit Feedback Banner (e.g. ¡PERFECTO!) */}
        {hitFeedback && (
          <motion.div
            key={hitFeedback.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="font-black tracking-widest text-xs px-3 py-1 rounded-full bg-cyan-400/20 border border-cyan-400 text-cyan-300 shadow-md shadow-cyan-400/30"
          >
            {hitFeedback.text}
          </motion.div>
        )}

        {/* Keyboard range zoom selector */}
        <div className="flex items-center gap-1 text-[11px] text-white/50">
          <span>Teclado:</span>
          {[
            { id: 'auto', label: 'Auto' },
            { id: '49', label: '49T' },
            { id: '61', label: '61T' },
            { id: '88', label: '88T' },
          ].map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setKeyboardRange(r.id as any)}
              className={cn(
                "px-2 py-0.5 rounded-lg border transition-all",
                keyboardRange === r.id
                  ? "bg-white/20 border-white/40 text-white font-bold"
                  : "border-transparent text-white/40 hover:text-white"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN WATERFALL CANVAS (CANVAS DE NOTAS EN CASCADA) */}
      {/* ------------------------------------------------------------- */}
      <div className="relative rounded-3xl border border-white/10 overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.9)] bg-[#06080e]">
        
        {/* The Falling Notes Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-[360px] sm:h-[420px] md:h-[480px] block cursor-pointer"
          onClick={handleTogglePlay}
        />

        {/* Interactive Play Overlay when paused at start */}
        {!isPlaying && currentTime === 0 && (
          <div 
            onClick={handleTogglePlay}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center gap-3 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-cyan-400 text-black flex items-center justify-center font-bold shadow-xl shadow-cyan-400/40 group-hover:scale-110 transition-transform">
              <Play size={28} className="fill-black ml-1" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-serif font-bold text-white">
                Toca para Iniciar la Cascada de "{activeSong.title}"
              </h3>
              <p className="text-xs text-white/60 font-mono mt-1">
                {practiceMode === 'wait' 
                  ? 'Modo Espera: las notas se pausarán en la línea hasta que toques la tecla.' 
                  : 'Modo Flujo: toca siguiendo el ritmo de la cascada.'}
              </p>
            </div>
          </div>
        )}

        {/* Hand Color Legend Overlay (top corners) */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            <span className="text-rose-200">Mano Izq (Bajo / Acorde)</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
            <span className="text-cyan-200">Mano Der (Melodía)</span>
          </div>
        </div>

        {/* Timeline Scrubber Bar */}
        <div className="absolute bottom-1 inset-x-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-[10px] font-mono">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>
          
          <button
            type="button"
            onClick={handleRewind}
            className="text-white/50 hover:text-white transition-colors"
            title="Reiniciar pieza"
          >
            <RotateCcw size={12} />
          </button>

          <input
            type="range"
            min="0"
            max={activeSong.duration || 30}
            step="0.1"
            value={currentTime}
            onChange={(e) => {
              setCurrentTime(parseFloat(e.target.value));
            }}
            className="flex-1 accent-cyan-400 h-1.5 bg-white/10 rounded cursor-pointer"
          />

          <span className="text-white/60 min-w-[50px] text-right">
            {Math.floor(currentTime)}s / {Math.floor(activeSong.duration)}s
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SYNCHRONIZED PIANO KEYBOARD (ALIGNED 1:1 WITH WATERFALL LANES) */}
      {/* ------------------------------------------------------------- */}
      <div className="relative bg-gradient-to-b from-[#121520] to-[#090b12] rounded-3xl border border-white/10 p-2 sm:p-4 shadow-xl overflow-x-auto">
        <div className="relative flex justify-between w-full h-32 sm:h-36 md:h-40 select-none">
          {whiteKeys.map((key) => {
            const isPressed = pressedNotes.has(key.midi);

            return (
              <div
                key={key.midi}
                onMouseDown={() => handleUserNotePress(key.midi)}
                onMouseUp={() => handleUserNoteRelease(key.midi)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleUserNotePress(key.midi);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleUserNoteRelease(key.midi);
                }}
                className={cn(
                  "relative flex-1 bg-white border border-slate-300 rounded-b-lg transition-all cursor-pointer flex flex-col justify-end items-center pb-2 z-0",
                  isPressed
                    ? "!bg-cyan-300 !translate-y-1 shadow-[0_0_25px_rgba(56,189,248,1)] border-cyan-200"
                    : "hover:bg-slate-100 active:bg-cyan-200"
                )}
              >
                {/* Note letter inscribed on the key just like in the user's photo! */}
                <span className={cn(
                  "text-[10px] sm:text-xs font-bold font-mono",
                  isPressed ? "text-black font-extrabold" : "text-slate-800"
                )}>
                  {key.noteLetter}
                </span>
                <span className="text-[8px] text-slate-500 font-mono -mt-0.5">
                  {key.name.slice(-1)}
                </span>
              </div>
            );
          })}

          {/* Black Keys overlaid with absolute positioning */}
          {pianoKeys.filter(k => k.isBlack).map((key) => {
            const isPressed = pressedNotes.has(key.midi);

            // Compute percentage offset across the keyboard
            let whiteIndex = 0;
            for (let m = minMidi; m < key.midi; m++) {
              if (!midiToNoteName(m).includes('#')) whiteIndex++;
            }

            const totalWhites = whiteKeys.length;
            const leftPercent = (whiteIndex / totalWhites) * 100;
            const widthPercent = (0.65 / totalWhites) * 100;

            return (
              <div
                key={key.midi}
                style={{
                  left: `calc(${leftPercent}% - ${widthPercent / 2}%)`,
                  width: `${widthPercent}%`,
                  height: '62%'
                }}
                onMouseDown={() => handleUserNotePress(key.midi)}
                onMouseUp={() => handleUserNoteRelease(key.midi)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleUserNotePress(key.midi);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleUserNoteRelease(key.midi);
                }}
                className={cn(
                  "absolute top-0 bg-slate-900 border border-slate-700 rounded-b-md cursor-pointer flex flex-col justify-end items-center pb-1 z-10 transition-all shadow-md",
                  isPressed
                    ? "!bg-rose-500 !translate-y-1 shadow-[0_0_25px_rgba(244,63,94,1)] border-rose-300"
                    : "hover:bg-slate-800 active:bg-rose-600"
                )}
              >
                <span className={cn(
                  "text-[8px] sm:text-[9px] font-mono font-bold truncate",
                  isPressed ? "text-white" : "text-slate-400"
                )}>
                  {key.name.slice(0, -1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PEDAGOGICAL TIPS & MIDI INSTRUCTIONS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pedagogical Advice */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 md:col-span-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
            <GraduationCap size={15} className="text-cyan-300" />
            <span>Consejo del Maestro Aurelio para la Catarata:</span>
          </div>
          <p className="text-xs text-white/70 font-light leading-relaxed">
            "En la catarata de tonos el secreto no es mirar los dedos, sino anticipar la trayectoria de la columna que desciende hacia la línea láser. Entrená primero en <strong>Modo Espera</strong> para memorizar la postura de la mano, y luego activá <strong>Modo Flujo</strong> para desarrollar velocidad y reflejos."
          </p>
        </div>

        {/* MIDI Upload & USB Connection Card */}
        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
            <Radio size={14} className="text-cyan-400 animate-pulse" />
            <span>Conexión USB & Archivos MIDI</span>
          </div>
          <p className="text-[11px] text-white/60 leading-normal">
            Podés conectar cualquier teclado digital o piano eléctrico por USB (Web MIDI nativo) y tocar directamente sobre la catarata con tus teclas reales. También podés arrastrar cualquier archivo <strong>.mid</strong> o <strong>.midi</strong> para practicar cualquier obra que desees.
          </p>
        </div>
      </div>
    </div>
  );
};
