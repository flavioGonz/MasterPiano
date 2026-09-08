import { useSyncExternalStore } from 'react';
import { midi, MidiState } from './midi';

/** El estado del MIDI, vivo, para cualquier componente. */
export function useMidi(): MidiState {
  return useSyncExternalStore(
    cb => midi.subscribe(cb),
    () => midi.state,
    () => midi.state,
  );
}
