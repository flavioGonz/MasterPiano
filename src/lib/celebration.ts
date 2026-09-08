
/**
 * Fires a high-end celebratory confetti sequence designed for conservatory achievements.
 * Includes center burst and side cannons in elegant gold, emerald, and cyan palettes.
 */
export async function triggerCurriculumConfetti(intensity: 'standard' | 'grand' = 'grand') {
  // El confeti sólo hace falta cuando hay algo que festejar: la librería se
  // trae en ese momento y no en la primera carga.
  const confetti = (await import('canvas-confetti')).default;
  // Center fountain
  confetti({
    particleCount: intensity === 'grand' ? 90 : 50,
    spread: 70,
    origin: { y: 0.65, x: 0.5 },
    colors: ['#f59e0b', '#10b981', '#06b6d4', '#fbbf24', '#ffffff', '#34d399'],
    ticks: 250,
    gravity: 1.1,
    scalar: 1.15,
  });

  if (intensity === 'grand') {
    // Left cannon
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.75 },
        colors: ['#f59e0b', '#38bdf8', '#fbbf24', '#ffffff'],
        ticks: 200,
      });
    }, 150);

    // Right cannon
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.75 },
        colors: ['#10b981', '#f59e0b', '#34d399', '#ffffff'],
        ticks: 200,
      });
    }, 300);

    // Stars / sparkle finale
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { y: 0.45, x: 0.5 },
        shapes: ['circle'],
        colors: ['#fbbf24', '#f59e0b', '#ffffff'],
        scalar: 1.3,
        ticks: 180,
      });
    }, 450);
  }

  // La fanfarria: Tone.js pesa ~200 kB y el confeti tiene que salir igual sin
  // él, así que se trae recién acá. Si el contexto de audio está suspendido
  // (no hubo gesto del usuario todavía), se celebra en silencio.
  void (async () => {
    try {
      const Tone = await import('tone');
      if (Tone.context.state !== 'running') return;
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 1.2 },
        volume: -10,
      }).toDestination();

      const now = Tone.now();
      synth.triggerAttackRelease('C4', '0.2n', now);
      synth.triggerAttackRelease('E4', '0.2n', now + 0.1);
      synth.triggerAttackRelease('G4', '0.2n', now + 0.2);
      synth.triggerAttackRelease('C5', '0.6n', now + 0.3);
      setTimeout(() => synth.dispose(), 2000);
    } catch {
      /* sin audio, el confeti alcanza */
    }
  })();
}
