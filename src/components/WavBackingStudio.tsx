import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Upload, Volume2, Music, Disc, 
  Sliders, Activity, Sparkles, Mic, FileAudio, Gauge, RefreshCw,
  Info, CheckCircle2, ChevronRight, Zap
} from 'lucide-react';
import * as Tone from 'tone';
import { Piano } from './Piano';
import { soundEngine, SoundPreset, SOUND_PRESETS, getSavedSoundPreset } from '../lib/soundPresets';
import { cn } from '../lib/utils';

export interface BuiltInTrack {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  key: string;
  chords: string[]; // e.g. ['C', 'G', 'Am', 'F']
  scaleNotes: string[]; // recommended notes for improvisation
  description: string;
}

export const BUILTIN_TRACKS: BuiltInTrack[] = [
  {
    id: 'blues-c',
    name: 'Blues 12 Compases en Do',
    genre: 'Blues & Shuffle',
    bpm: 96,
    key: 'C Blues',
    chords: ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'],
    scaleNotes: ['C4', 'Eb4', 'F4', 'Gb4', 'G4', 'Bb4'],
    description: 'Batería shuffle con bajo caminante tradicional para improvisar con la escala de blues.'
  },
  {
    id: 'pop-ballad',
    name: 'Balada Pop de 4 Acordes',
    genre: 'Pop / Acústico',
    bpm: 78,
    key: 'C Mayor',
    chords: ['C', 'G', 'Am', 'F'],
    scaleNotes: ['C4', 'D4', 'E4', 'G4', 'A4'],
    description: 'La progresión I - V - vi - IV más famosa de la música moderna, ideal para arpegios y melodías.'
  },
  {
    id: 'jazz-ii-v-i',
    name: 'Jazz Swing 2 - 5 - 1 en Do',
    genre: 'Jazz Standards',
    bpm: 120,
    key: 'C Mayor',
    chords: ['Dm7', 'G7', 'Cmaj7', 'A7'],
    scaleNotes: ['D4', 'F4', 'A4', 'C5', 'B4', 'G4', 'E4'],
    description: 'Contrabajo acústico y escobillas en swing tradicional para ejercitar tensiones e inversiones de jazz.'
  },
  {
    id: 'lofi-chill',
    name: 'Lo-Fi Chillhop Groovin',
    genre: 'Lo-Fi / Neo-Soul',
    bpm: 82,
    key: 'F Mayor',
    chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'],
    scaleNotes: ['F4', 'A4', 'C5', 'E5', 'G4'],
    description: 'Textura analógica cálida con bombo y caja relajados para acordes extendidos y voicings modernos.'
  },
  {
    id: 'latin-montuno',
    name: 'Bossa & Groove Latino',
    genre: 'Latino / Bossa',
    bpm: 108,
    key: 'A Menor',
    chords: ['Am7', 'Dm7', 'E7', 'Am7'],
    scaleNotes: ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G#4'],
    description: 'Sincopas de percusión latina para independizar la mano izquierda de patrones rítmicos.'
  }
];

// Helper to synthesize rich accompaniment rhythm stems when no audio file is uploaded
class ProceduralJamEngine {
  private kick: Tone.MembraneSynth | null = null;
  private snare: Tone.NoiseSynth | null = null;
  private hihat: Tone.MetalSynth | null = null;
  private bass: Tone.MonoSynth | null = null;
  private organ: Tone.PolySynth | null = null;
  private loop: Tone.Part | null = null;
  private isRunning: boolean = false;

  private init() {
    if (this.kick) return;

    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 }
    }).toDestination();
    this.kick.volume.value = -4;

    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
    }).toDestination();
    this.snare.volume.value = -12;

    this.hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.08, release: 0.05 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).toDestination();
    this.hihat.volume.value = -18;

    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2, baseFrequency: 80, octaves: 2.6 }
    }).toDestination();
    this.bass.volume.value = -6;

    this.organ = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsine', count: 2, spread: 20 },
      envelope: { attack: 0.05, decay: 0.8, sustain: 0.6, release: 0.8 }
    }).toDestination();
    this.organ.volume.value = -16;
  }

  public setVolume(volumeNorm: number) {
    const db = volumeNorm <= 0 ? -100 : Tone.gainToDb(volumeNorm);
    if (this.kick) this.kick.volume.value = db - 4;
    if (this.snare) this.snare.volume.value = db - 12;
    if (this.hihat) this.hihat.volume.value = db - 18;
    if (this.bass) this.bass.volume.value = db - 6;
    if (this.organ) this.organ.volume.value = db - 16;
  }

  public start(track: BuiltInTrack, bpm: number, onChordTick: (chordIndex: number) => void) {
    this.init();
    this.stop();

    Tone.Transport.bpm.value = bpm;

    // Build measure steps
    const numChords = track.chords.length;
    const events: any[] = [];

    for (let c = 0; c < numChords; c++) {
      const barTime = `${c}:0:0`;
      events.push({ time: barTime, type: 'chordTick', index: c });

      // Drums
      events.push({ time: `${c}:0:0`, type: 'kick' });
      events.push({ time: `${c}:1:0`, type: 'snare' });
      events.push({ time: `${c}:2:0`, type: 'kick' });
      events.push({ time: `${c}:3:0`, type: 'snare' });

      // Hi-hat 8th notes
      for (let s = 0; s < 4; s++) {
        events.push({ time: `${c}:${s}:0`, type: 'hihat' });
        events.push({ time: `${c}:${s}:2`, type: 'hihat' });
      }

      // Bass note based on chord root
      const chordName = track.chords[c];
      const root = chordName.replace(/[^A-G#b]/g, '');
      const bassNote = `${root}2`;
      events.push({ time: `${c}:0:0`, type: 'bass', note: bassNote, dur: '2n' });
      events.push({ time: `${c}:2:0`, type: 'bass', note: bassNote, dur: '2n' });
    }

    this.loop = new Tone.Part((time, value) => {
      if (value.type === 'chordTick') {
        onChordTick(value.index);
      } else if (value.type === 'kick') {
        this.kick?.triggerAttackRelease('C1', '8n', time);
      } else if (value.type === 'snare') {
        this.snare?.triggerAttackRelease('8n', time);
      } else if (value.type === 'hihat') {
        this.hihat?.triggerAttackRelease('16n', time, 0.5);
      } else if (value.type === 'bass') {
        this.bass?.triggerAttackRelease(value.note, value.dur, time);
      }
    }, events);

    this.loop.loop = true;
    this.loop.loopEnd = `${numChords}:0:0`;
    this.loop.start(0);

    Tone.Transport.start();
    this.isRunning = true;
  }

  public stop() {
    if (this.loop) {
      this.loop.dispose();
      this.loop = null;
    }
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.isRunning = false;
  }
}

const proceduralEngine = new ProceduralJamEngine();

export const WavBackingStudio: React.FC = () => {
  // Builtin selection or custom file
  const [selectedBuiltin, setSelectedBuiltin] = useState<BuiltInTrack>(BUILTIN_TRACKS[0]);
  const [uploadedFile, setUploadedFile] = useState<{ file: File; url: string; name: string } | null>(null);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeChordIndex, setActiveChordIndex] = useState<number>(0);
  const [tempo, setTempo] = useState<number>(BUILTIN_TRACKS[0].bpm);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0); // 0.75x to 1.25x
  const [backingVolume, setBackingVolume] = useState<number>(85); // 0-100
  const [pianoVolume, setPianoVolume] = useState<number>(90); // 0-100
  
  // Sound preset for interactive piano
  const [soundPreset, setSoundPreset] = useState<SoundPreset>(() => getSavedSoundPreset());
  const [activePianoNotes, setActivePianoNotes] = useState<string[]>([]);
  
  // Web Audio Analyser for real-time waveform
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop when unmounting
  useEffect(() => {
    return () => {
      proceduralEngine.stop();
      if (audioElRef.current) {
        audioElRef.current.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update tempo when changing track
  useEffect(() => {
    if (!uploadedFile) {
      setTempo(selectedBuiltin.bpm);
    }
  }, [selectedBuiltin, uploadedFile]);

  // Volume synchronization
  useEffect(() => {
    if (uploadedFile && audioElRef.current) {
      audioElRef.current.volume = backingVolume / 100;
    } else {
      proceduralEngine.setVolume(backingVolume / 100);
    }
  }, [backingVolume, uploadedFile]);

  // Playback rate synchronization
  useEffect(() => {
    if (uploadedFile && audioElRef.current) {
      audioElRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, uploadedFile]);

  // Setup Web Audio Analyser for canvas waveform
  const setupWebAudioAnalyser = (audioElement: HTMLAudioElement) => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createMediaElementSource(audioElement);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    } catch (err) {
      console.warn("AudioContext setup notice:", err);
    }
  };

  // Continuous waveform visualizer render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dummyPhase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background subtle dark grid
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, width, height);

      // Grid line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (isPlaying) {
        if (analyserRef.current) {
          // Real Web Audio data from uploaded .wav
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteTimeDomainData(dataArray);

          // Draw neon waveform
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#38bdf8';
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 12;
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Frequency bars underneath
          const freqArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(freqArray);
          const barWidth = (width / bufferLength) * 2;
          let barX = 0;
          for (let i = 0; i < bufferLength / 2; i++) {
            const barHeight = (freqArray[i] / 255) * (height / 2.2);
            ctx.fillStyle = `rgba(245, 158, 11, ${freqArray[i] / 300})`;
            ctx.fillRect(barX, height - barHeight, barWidth - 1, barHeight);
            barX += barWidth;
          }

        } else {
          // Procedural live animated beat wave
          dummyPhase += 0.08;
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#f59e0b';
          ctx.shadowColor = '#d97706';
          ctx.shadowBlur = 14;
          ctx.beginPath();

          const points = 80;
          const sliceWidth = width / points;
          for (let i = 0; i <= points; i++) {
            const x = i * sliceWidth;
            const wave1 = Math.sin(i * 0.15 + dummyPhase) * 28;
            const wave2 = Math.sin(i * 0.35 - dummyPhase * 1.5) * 14;
            const y = height / 2 + wave1 + wave2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Beat pulse bars
          for (let b = 0; b < 24; b++) {
            const bh = Math.abs(Math.sin(dummyPhase * 2 + b * 0.5)) * (height * 0.4);
            const bx = (width / 24) * b;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.fillRect(bx + 2, height - bh, (width / 24) - 4, bh);
          }
        }
      } else {
        // Idle flat line with subtle breathing glow
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  // Toggle playback
  const handleTogglePlay = async () => {
    await Tone.start();

    if (isPlaying) {
      if (uploadedFile && audioElRef.current) {
        audioElRef.current.pause();
      } else {
        proceduralEngine.stop();
      }
      setIsPlaying(false);
    } else {
      if (uploadedFile && audioElRef.current) {
        if (!analyserRef.current) {
          setupWebAudioAnalyser(audioElRef.current);
        }
        audioElRef.current.play();
      } else {
        proceduralEngine.start(selectedBuiltin, tempo, (index) => {
          setActiveChordIndex(index);
        });
      }
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    if (uploadedFile && audioElRef.current) {
      audioElRef.current.currentTime = 0;
    } else {
      proceduralEngine.stop();
      if (isPlaying) {
        proceduralEngine.start(selectedBuiltin, tempo, (index) => {
          setActiveChordIndex(index);
        });
      }
    }
    setActiveChordIndex(0);
  };

  // Handle user uploading custom .wav
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isPlaying) {
      handleTogglePlay();
    }

    const url = URL.createObjectURL(file);
    setUploadedFile({ file, url, name: file.name });

    // Preload audio
    if (audioElRef.current) {
      audioElRef.current.src = url;
      audioElRef.current.load();
    }
  };

  const handleClearUploadedFile = () => {
    if (isPlaying) {
      handleTogglePlay();
    }
    setUploadedFile(null);
  };

  const activeChord = uploadedFile ? 'Pista Propia' : selectedBuiltin.chords[activeChordIndex];

  return (
    <div className="space-y-6">
      {/* Hidden audio element for uploaded .wav / .mp3 */}
      <audio
        ref={audioElRef}
        loop
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* TOP EXPLANATION BANNER: What can you do with .wav bases? */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-amber-400/20 bg-gradient-to-r from-[#0d121f] via-[#090b14] to-[#160e12] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-widest font-bold">
              <FileAudio size={15} />
              <span>¿Qué puedes hacer con Bases .WAV?</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px]">
                Audio & Play-Along
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-white">
              Estudio de Acompañamiento y Bases .WAV
            </h2>
            <p className="text-xs md:text-sm text-white/60 font-light max-w-4xl leading-relaxed">
              Las bases en formato <strong>.WAV</strong> (y pistas de audio sin comprimir) son el estándar de la industria musical para practicar piano con sonido de banda real. Aquí tienes todo lo que puedes realizar:
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.ogg,.m4a,.flac"
              onChange={handleFileUpload}
              className="hidden"
              id="upload-wav-input"
            />
            <label
              htmlFor="upload-wav-input"
              className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-amber-400/20 hover:scale-105 active:scale-95"
            >
              <Upload size={15} className="fill-black text-black" />
              <span>Subir Mi Base .WAV</span>
            </label>
          </div>
        </div>

        {/* 4 Pillars of .WAV Backing capabilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
              <Disc size={14} />
              <span>1. Tocar Arriba (Jamming)</span>
            </div>
            <p className="text-[11px] text-white/50 leading-normal font-light">
              Toca el piano sobre baterías acústicas, bajo y guitarras reales con tempo estricto, aprendiendo a mantener el pulso exacto sin perderte.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
              <Activity size={14} />
              <span>2. Visualización de Onda</span>
            </div>
            <p className="text-[11px] text-white/50 leading-normal font-light">
              El osciloscopio y analizador de frecuencias Web Audio te muestra los golpes de percusión y la dinámica de la pista en tiempo real.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold">
              <Gauge size={14} />
              <span>3. Control de Velocidad</span>
            </div>
            <p className="text-[11px] text-white/50 leading-normal font-light">
              Desacelera cualquier base a 0.75x o 0.9x para aprender solos difíciles o voicings complejos paso a paso antes de tocar a velocidad real.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
              <Sliders size={14} />
              <span>4. Mezcla Dual (Mixer)</span>
            </div>
            <p className="text-[11px] text-white/50 leading-normal font-light">
              Balancea el volumen de la base frente al del piano virtual para que tu instrumento resalte con claridad durante la sesión de práctica.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN PLAY-ALONG WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: TRACK PICKER & HARMONIC ROADMAP (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass p-5 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-white/50">
                Pistas Disponibles
              </span>
              {uploadedFile && (
                <button
                  type="button"
                  onClick={handleClearUploadedFile}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-mono underline"
                >
                  Volver a pistas internas
                </button>
              )}
            </div>

            {/* If custom file uploaded */}
            {uploadedFile ? (
              <div className="p-4 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs font-mono">
                  <FileAudio size={16} />
                  <span>Base Personal Cargada:</span>
                </div>
                <div className="text-sm font-semibold text-white truncate">
                  {uploadedFile.name}
                </div>
                <div className="text-[11px] text-white/50 font-mono">
                  Audio decodificado por Web Audio API con osciloscopio en vivo.
                </div>
              </div>
            ) : (
              /* Built-in groove selector */
              <div className="space-y-2">
                {BUILTIN_TRACKS.map(t => {
                  const isSelected = selectedBuiltin.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (isPlaying) proceduralEngine.stop();
                        setSelectedBuiltin(t);
                        setIsPlaying(false);
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-2xl border transition-all flex flex-col gap-1",
                        isSelected
                          ? "bg-amber-400/15 border-amber-400/40 text-white shadow-md shadow-amber-400/10"
                          : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{t.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 text-amber-300">
                          {t.bpm} BPM
                        </span>
                      </div>
                      <div className="text-[11px] text-white/40 flex items-center gap-2">
                        <span>{t.genre}</span>
                        <span>•</span>
                        <span>Tonalidad: {t.key}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Chord Progression Visual Sequence for selected track */}
            {!uploadedFile && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <span className="text-[11px] font-mono text-white/50 block">
                  Secuencia de Acordes (Compás Activo):
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedBuiltin.chords.map((chord, idx) => {
                    const isCurrent = isPlaying && idx === activeChordIndex;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all text-center",
                          isCurrent
                            ? "bg-amber-400 text-black border-amber-300 scale-110 shadow-lg shadow-amber-400/40 animate-pulse"
                            : "bg-black/40 border-white/10 text-white/60"
                        )}
                      >
                        {chord}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-white/60 space-y-1">
                  <div className="text-amber-300 font-bold font-mono text-[10px] uppercase">
                    Notas sugeridas para solear / improvisar:
                  </div>
                  <div className="font-mono text-white/80 flex flex-wrap gap-1.5">
                    {selectedBuiltin.scaleNotes.map(n => (
                      <span key={n} className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 text-[10px]">
                        {n.replace(/\d/, '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REALTIME WAVEFORM OSCILLOSCOPE & PLAYBACK CONTROLS (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass p-6 rounded-3xl border border-white/10 space-y-5">
            
            {/* Real-time Waveform Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#06080e] shadow-2xl">
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full h-[180px] sm:h-[220px] block"
              />

              {/* Center status overlay */}
              <div className="absolute top-3 left-4 flex items-center gap-2 text-xs font-mono">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  isPlaying ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-white/30"
                )} />
                <span className="text-white/70">
                  {isPlaying ? 'EN REPRODUCCIÓN (PLAY-ALONG)' : 'PAUSADO'}
                </span>
              </div>

              {/* Big active chord indicator floating on top right */}
              <div className="absolute top-3 right-4 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] font-mono text-white/40 block">ACORDE ACTUAL</span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  {activeChord}
                </span>
              </div>
            </div>

            {/* Main Playback Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              {/* Play / Pause / Reset buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="btn-wav-toggle-play"
                  onClick={handleTogglePlay}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black flex items-center justify-center font-bold shadow-lg shadow-amber-400/30 hover:scale-105 active:scale-95 transition-all"
                  title={isPlaying ? "Pausar pista" : "Iniciar reproducción de la base"}
                >
                  {isPlaying ? <Pause size={24} className="fill-black" /> : <Play size={24} className="fill-black ml-1" />}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                  title="Reiniciar base al compás 1"
                >
                  <RotateCcw size={18} />
                </button>

                <div>
                  <div className="text-sm font-bold text-white font-serif">
                    {uploadedFile ? uploadedFile.name : selectedBuiltin.name}
                  </div>
                  <div className="text-xs text-white/40 font-mono">
                    {uploadedFile ? 'Archivo .WAV personalizado' : `${selectedBuiltin.genre} • ${tempo} BPM`}
                  </div>
                </div>
              </div>

              {/* Speed Multiplier Pill */}
              <div className="flex items-center bg-black/50 p-1.5 rounded-2xl border border-white/10 text-xs font-mono">
                <span className="text-[10px] text-white/40 px-2 flex items-center gap-1">
                  <Gauge size={12} className="text-amber-400" />
                  <span>Velocidad:</span>
                </span>
                {[0.75, 0.9, 1.0, 1.1, 1.25].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(rate);
                      if (!uploadedFile) {
                        setTempo(Math.round(selectedBuiltin.bpm * rate));
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-xl transition-all",
                      playbackRate === rate
                        ? "bg-amber-400 text-black font-bold shadow"
                        : "text-white/50 hover:text-white"
                    )}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Mixer Controls (Dual Volume) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10">
              
              {/* Backing track volume */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Volume2 size={13} className="text-amber-400" />
                    <span>Volumen de la Base .WAV</span>
                  </span>
                  <span className="text-amber-300 font-bold">{backingVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={backingVolume}
                  onChange={(e) => setBackingVolume(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-black/40 rounded-lg"
                />
              </div>

              {/* Virtual Piano volume */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Music size={13} className="text-cyan-400" />
                    <span>Volumen de tu Piano</span>
                  </span>
                  <span className="text-cyan-300 font-bold">{pianoVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pianoVolume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPianoVolume(val);
                    soundEngine.setMasterVolume(val / 100);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-black/40 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INTEGRATED ACOUSTIC PIANO (Toca directamente sobre la base!) */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-amber-400 text-xs font-mono uppercase tracking-widest font-bold">
              Teclado de Ensayo en Vivo
            </span>
            <h3 className="text-lg md:text-xl font-serif font-bold text-white">
              Toca tu Piano por Encima de la Base
            </h3>
            <p className="text-xs text-white/50 font-light">
              Puedes tocar con el teclado de tu computadora (A, W, S, E, D, F...), haciendo clic con el ratón o conectando un teclado USB/MIDI.
            </p>
          </div>

          {/* Sound Timbre Selector for Piano */}
          <div className="flex items-center gap-1.5 bg-black/50 p-1.5 rounded-2xl border border-white/10 text-xs font-mono">
            <span className="text-[10px] text-white/40 px-2">Timbre:</span>
            {SOUND_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSoundPreset(preset.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all",
                  soundPreset === preset.id
                    ? "bg-amber-400 text-black font-bold shadow"
                    : "text-white/60 hover:text-white"
                )}
              >
                <span>{preset.icon}</span>
                <span className="hidden sm:inline">{preset.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* The Piano Component */}
        <div className="pt-2">
          <Piano
            activeNotes={activePianoNotes}
            soundPreset={soundPreset}
            onNotePlay={(note) => {
              setActivePianoNotes(prev => prev.includes(note) ? prev : [...prev, note]);
              setTimeout(() => {
                setActivePianoNotes(prev => prev.filter(n => n !== note));
              }, 300);
            }}
          />
        </div>
      </div>
    </div>
  );
};
