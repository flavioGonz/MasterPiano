import confetti from 'canvas-confetti';
import * as Tone from 'tone';

/**
 * Fires a high-end celebratory confetti sequence designed for conservatory achievements.
 * Includes center burst and side cannons in elegant gold, emerald, and cyan palettes.
 */
export function triggerCurriculumConfetti(intensity: 'standard' | 'grand' = 'grand') {
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

  // Play a brief uplifting celebratory piano fanfare
  try {
    if (Tone.context.state === 'running') {
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

      setTimeout(() => {
        synth.dispose();
      }, 2000);
    }
  } catch {
    // Tone audio context may be suspended; silence is acceptable
  }
}
