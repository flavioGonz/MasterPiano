/**
 * speech.ts - Voz natural uruguaya del Maestro Aurelio
 *
 * Utiliza Gemini TTS (gemini-3.1-flash-tts-preview) para síntesis neuronal ultra-realista
 * con acento y calidez rioplatense uruguaya.
 * Cuenta con fallback inteligente al Web Speech API calibrado en dialecto es-UY / es-AR.
 */

class MaestroVoicePlayer {
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private currentAudioCtx: AudioContext | null = null;
  private isSpeakingState = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  /**
   * Adapta cualquier texto para que tenga la cadencia, voseo y modismos de Uruguay
   */
  public toUruguayanDialect(text: string): string {
    return text
      .replace(/\bHola\b/g, '¡Buenas! ¿Cómo andás?')
      .replace(/\bmira\b/gi, 'mirá')
      .replace(/\bmirad\b/gi, 'miren')
      .replace(/\bfíjate\b/gi, 'fijate')
      .replace(/\bfijate\b/gi, 'fijate')
      .replace(/\btoca\b/gi, 'tocá')
      .replace(/\btocad\b/gi, 'toquen')
      .replace(/\brecuerda\b/gi, 'acordate')
      .replace(/\bacuérdate\b/gi, 'acordate')
      .replace(/\bpuedes\b/gi, 'podés')
      .replace(/\btienes\b/gi, 'tenés')
      .replace(/\bhazlo\b/gi, 'hacelo')
      .replace(/\bpon\b/gi, 'poné')
      .replace(/\bcoloca\b/gi, 'poné')
      .replace(/\bcoloques\b/gi, 'pongas')
      .replace(/\bobserva\b/gi, 'mirá bien')
      .replace(/\bempieza\b/gi, 'arrancá')
      .replace(/\bcomienza\b/gi, 'arrancá')
      .replace(/\bsiéntate\b/gi, 'sentate')
      .replace(/\brelaja\b/gi, 'relajá')
      .replace(/\bpráctica\b/gi, 'práctica')
      .replace(/\bvamos\b/gi, 'vamos arriba')
      .replace(/\bexcelente\b/gi, 'impecable')
      .replace(/\bperfecto\b/gi, 'impecable');
  }

  /**
   * Detiene cualquier reproducción actual (sea Web Audio o SpeechSynthesis)
   */
  public stop() {
    this.isSpeakingState = false;

    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.currentAudioSource = null;
    }

    if (this.currentAudioCtx && this.currentAudioCtx.state !== 'closed') {
      try {
        this.currentAudioCtx.suspend();
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  /**
   * Habla un texto con la voz del Maestro Aurelio (Uruguay)
   */
  public async speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<() => void> {
    this.stop();
    this.isSpeakingState = true;

    // Aseguramos que el texto tenga inflexión uruguaya natural
    const uruguayanText = this.toUruguayanDialect(text);

    // Intentamos primero con la voz de IA Gemini en el servidor
    try {
      const response = await fetch('/api/instructor/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: uruguayanText }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioBase64) {
          options?.onStart?.();
          await this.playBase64Audio(data.audioBase64, () => {
            this.isSpeakingState = false;
            options?.onEnd?.();
          });
          return () => this.stop();
        }
      }
    } catch {
      // Si el servidor falla o no tiene API key, caemos suavemente al síntesis del navegador calibrado
    }

    // Fallback: Síntesis local del navegador calibrada específicamente para Uruguay / Rioplatense
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(uruguayanText);

      // Priorizamos voces rioplatenses (Uruguay / Argentina) y voces naturales
      const voices = window.speechSynthesis.getVoices();
      const rioplatenseVoice = voices.find(
        v => v.lang === 'es-UY' || v.lang === 'es-AR'
      ) || voices.find(
        v => (v.lang.startsWith('es') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Mateo') || v.name.includes('Tomas') || v.name.includes('Diego')))
      ) || voices.find(v => v.lang.startsWith('es'));

      if (rioplatenseVoice) {
        utterance.voice = rioplatenseVoice;
      }
      utterance.lang = rioplatenseVoice?.lang || 'es-UY';
      // Tono más calmado, pausado y cálido para sonar humano y no acelerado
      utterance.rate = 0.90;
      utterance.pitch = 0.98;

      utterance.onstart = () => {
        this.isSpeakingState = true;
        options?.onStart?.();
      };
      utterance.onend = () => {
        this.isSpeakingState = false;
        options?.onEnd?.();
      };
      utterance.onerror = (e) => {
        this.isSpeakingState = false;
        options?.onError?.(e);
        options?.onEnd?.();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return () => this.stop();
    }

    this.isSpeakingState = false;
    options?.onEnd?.();
    return () => this.stop();
  }

  /**
   * Reproduce audio base64 con Web Audio API (soporta WAV o PCM 24kHz)
   */
  private async playBase64Audio(base64: string, onEnded: () => void): Promise<void> {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    this.currentAudioCtx = audioCtx;

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    // Verificar si tiene cabecera estándar RIFF (WAV)
    const isRiff = len > 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;

    let audioBuffer: AudioBuffer;

    if (isRiff) {
      audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
    } else {
      // PCM lineal de 16 bits little-endian a 24000 Hz
      const numSamples = Math.floor(len / 2);
      audioBuffer = audioCtx.createBuffer(1, numSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(bytes.buffer);

      for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        channelData[i] = int16 / 32768.0;
      }
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    source.onended = () => {
      onEnded();
    };

    this.currentAudioSource = source;
    source.start(0);
  }
}

export const maestroVoice = new MaestroVoicePlayer();
