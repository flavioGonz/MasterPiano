/**
 * El teclado MIDI, para toda la app.
 *
 * Antes el MIDI vivía adentro de la catarata: sólo ahí el Kross tocaba, y de
 * cada mensaje se leía apenas "nota sí / nota no". Todo lo demás que manda un
 * instrumento de verdad —con cuánta fuerza tocaste, el pedal de sustain, qué
 * sonido tenés elegido— se tiraba a la basura. Y en las lecciones, en los
 * gimnasios y en la evaluación el teclado directamente no existía: había que
 * tocar con el mouse.
 *
 * Este módulo es uno solo para toda la app, con tres trabajos:
 *
 *  1. **Entrada**: notas con su velocidad, el pedal de sustain (CC64, incluido
 *     el medio pedal del Kross), la rueda de modulación, el pitch bend, y el
 *     cambio de programa que manda el teclado cuando girás el dial.
 *  2. **Salida**: mandarle notas al instrumento para que suene con su propio
 *     motor —que es infinitamente mejor que un sintetizador del navegador—,
 *     cambiarle el sonido, y mandarle el reloj para que su arpegiador y sus
 *     baterías sigan el tempo de la app.
 *  3. **Estado**: qué hay conectado, en qué canal, y qué prefiere el usuario;
 *     todo se recuerda entre sesiones.
 *
 * El pedal de sustain no se pasa al resto de la app tal cual: acá se traduce a
 * lo que la app entiende, que son notas que siguen sonando. Si soltás la tecla
 * con el pedal pisado, la nota queda retenida y recién se suelta cuando
 * levantás el pedal — que es lo que pasa en un piano.
 */

export interface MidiNote {
  midi: number;
  /** 0 a 1. El Kross manda velocidad; el teclado de pantalla asume 0,8. */
  velocity: number;
  /** Marca de tiempo del propio mensaje MIDI: más precisa que el cuadro. */
  at: number;
}

export interface MidiDevice { id: string; name: string; manufacturer: string }

export interface MidiState {
  /** `false` si el navegador no tiene Web MIDI (Safari, por ejemplo). */
  supported: boolean;
  /** `true` cuando el permiso está dado y hay acceso. */
  ready: boolean;
  error: string | null;
  inputs: MidiDevice[];
  outputs: MidiDevice[];
  /** Entrada y salida elegidas (o la única que haya). */
  inputId: string | null;
  outputId: string | null;
  /** Último mensaje recibido, para el indicador de actividad. */
  lastMessageAt: number;
  /** Programa que el instrumento dice tener puesto, si lo mandó. */
  program: { bankMsb: number; bankLsb: number; program: number } | null;
  sustain: boolean;
  /** El navegador va a preguntar antes de dar acceso (Chrome 124+). */
  needsPermission: boolean;
}

/**
 * Un sonido del instrumento guardado con nombre. El Kross se maneja con
 * banco (dos CC) + programa, tres números que no dicen nada; acá se les pone
 * el nombre que uno lee en la pantalla del teclado ("E.Piano Rhodes") y ya se
 * elige por nombre desde cualquier parte de la app.
 */
export interface KrossPreset {
  id: string;
  name: string;
  bankMsb: number;
  bankLsb: number;
  program: number;
}

export interface MidiPrefs {
  inputId: string | null;
  outputId: string | null;
  /** Canal de salida, 1–16. El global del Kross viene en 1. */
  channel: number;
  /** Que el instrumento suene lo que la app reproduce, en vez del navegador. */
  throughOut: boolean;
  /** Mandarle el reloj para que su arpegiador siga el tempo de la app. */
  sendClock: boolean;
  /** Milisegundos a compensar si el instrumento llega tarde o temprano. */
  latencyMs: number;
  /**
   * Control del instrumento (el switch o el pedal asignable del Kross) que
   * hace play/pausa. Con las dos manos ocupadas, parar con el pie es la
   * diferencia entre practicar y estar peleando con el mouse.
   */
  footCc: number | null;
  /** Último sonido que mandó el instrumento, para poder volver a él. */
  lastProgram: { bankMsb: number; bankLsb: number; program: number } | null;
  /** Sonidos del instrumento guardados con nombre. */
  presets: KrossPreset[];
}

const PREFS_KEY = 'pianomaster_midi_v1';
const DEFAULT_PREFS: MidiPrefs = {
  inputId: null, outputId: null, channel: 1,
  throughOut: false, sendClock: false, latencyMs: 0,
  footCc: null, lastProgram: null, presets: [],
};

function loadPrefs(): MidiPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      const merged = { ...DEFAULT_PREFS, ...raw } as MidiPrefs;
      if (!Array.isArray(merged.presets)) merged.presets = [];
      return merged;
    }
  } catch { /* se usan los de fábrica */ }
  return DEFAULT_PREFS;
}

/** Los datos MIDI van de 0 a 127 y nada más. */
function clamp7(n: number, min = 0): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(127, Math.round(n)));
}

type Listener = () => void;
type NoteHandler = (n: MidiNote) => void;
type OffHandler = (midi: number) => void;

class MidiHub {
  private access: any = null;
  private prefs: MidiPrefs = loadPrefs();
  private listeners = new Set<Listener>();
  private onNote = new Set<NoteHandler>();
  private onNoteOff = new Set<OffHandler>();
  private onControl = new Set<(cc: number, value: number) => void>();
  private onFoot = new Set<() => void>();
  /** Cuando está esperando que muevas un control para aprenderlo. */
  private learning: ((cc: number) => void) | null = null;
  /** Notas que la tecla ya soltó pero el pedal sostiene. */
  private held = new Set<number>();
  private down = new Set<number>();
  private clockTimer: number | null = null;

  state: MidiState = {
    supported: typeof navigator !== 'undefined' && !!(navigator as any).requestMIDIAccess,
    ready: false, error: null, inputs: [], outputs: [],
    inputId: null, outputId: null, lastMessageAt: 0, program: null, sustain: false,
    needsPermission: false,
  };

  getPrefs(): MidiPrefs { return this.prefs; }

  setPrefs(patch: Partial<MidiPrefs>) {
    this.prefs = { ...this.prefs, ...patch };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs)); } catch { /* modo privado */ }
    if (patch.inputId !== undefined) { this.state.inputId = patch.inputId; this.bindInputs(); }
    if (patch.outputId !== undefined) this.state.outputId = patch.outputId;
    if (patch.sendClock === false) this.stopClock();
    this.emit();
  }

  subscribe(fn: Listener): () => void { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  onNoteOn(fn: NoteHandler): () => void { this.onNote.add(fn); return () => { this.onNote.delete(fn); }; }
  onNoteEnd(fn: OffHandler): () => void { this.onNoteOff.add(fn); return () => { this.onNoteOff.delete(fn); }; }
  onCc(fn: (cc: number, value: number) => void): () => void { this.onControl.add(fn); return () => { this.onControl.delete(fn); }; }
  /** El pedal o switch asignable: se avisa al pisarlo, no al soltarlo. */
  onFootSwitch(fn: () => void): () => void { this.onFoot.add(fn); return () => { this.onFoot.delete(fn); }; }

  /**
   * Espera a que muevas un control del instrumento y lo deja asignado. El
   * sustain se ignora a propósito: es el que más se pisa sin querer y ya tiene
   * su función.
   */
  learnFootSwitch(): Promise<number | null> {
    return new Promise(resolve => {
      const timeout = window.setTimeout(() => { this.learning = null; this.emit(); resolve(null); }, 10000);
      this.learning = cc => {
        window.clearTimeout(timeout);
        this.learning = null;
        this.setPrefs({ footCc: cc });
        resolve(cc);
      };
      this.emit();
    });
  }
  isLearning(): boolean { return this.learning !== null; }

  /* `useSyncExternalStore` compara por identidad, así que cada cambio produce
     un objeto nuevo; si no, React no vuelve a dibujar. */
  private emit() {
    this.state = { ...this.state };
    this.listeners.forEach(f => f());
  }

  /**
   * Conecta sin molestar.
   *
   * Desde Chrome 124 pedir acceso al MIDI abre un cartel de permiso, así que
   * llamarlo al abrir la app le tiraría el cartel en la cara a todo el mundo,
   * tenga o no un teclado. Acá se pregunta primero si el permiso ya está dado:
   * si lo está, se conecta solo y el instrumento anda desde el primer segundo;
   * si no, se espera a que la persona lo pida desde Ajustes.
   */
  async initIfAllowed(): Promise<void> {
    if (!this.state.supported || this.access) return;
    try {
      const perm = await (navigator as any).permissions?.query({ name: 'midi' });
      if (perm && perm.state !== 'granted') {
        this.state.needsPermission = perm.state === 'prompt';
        this.state.error = perm.state === 'denied' ? 'El navegador tiene bloqueado el acceso al MIDI.' : null;
        this.emit();
        return;
      }
    } catch {
      /* Firefox no tiene el permiso 'midi' en la API de permisos: se intenta
         igual, que allá no hay cartel. */
    }
    await this.init();
  }

  /**
   * Pide acceso de verdad (con cartel si hace falta). Va detrás de un botón.
   */
  async init(): Promise<void> {
    if (!this.state.supported || this.access) return;
    try {
      // `sysex: false` alcanza para notas, pedal y cambios de programa, y
      // evita el permiso más invasivo del navegador.
      this.access = await (navigator as any).requestMIDIAccess({ sysex: false });
      this.state.ready = true;
      this.state.needsPermission = false;
      this.state.error = null;
      this.access.onstatechange = () => { this.refreshPorts(); this.bindInputs(); this.emit(); };
      this.refreshPorts();
      this.bindInputs();
    } catch (e: any) {
      this.state.error = e?.message || 'El navegador no dio acceso al MIDI';
    }
    this.emit();
  }

  private refreshPorts() {
    if (!this.access) return;
    const map = (it: Iterable<any>): MidiDevice[] => Array.from(it).map((p: any) => ({
      id: p.id, name: p.name || 'Sin nombre', manufacturer: p.manufacturer || '',
    }));
    this.state.inputs = map(this.access.inputs.values());
    this.state.outputs = map(this.access.outputs.values());
    // Sin elección previa (o si el elegido se desenchufó), se toma el primero
    const has = (list: MidiDevice[], id: string | null) => !!id && list.some(d => d.id === id);
    this.state.inputId = has(this.state.inputs, this.prefs.inputId) ? this.prefs.inputId
      : (this.state.inputs[0]?.id ?? null);
    this.state.outputId = has(this.state.outputs, this.prefs.outputId) ? this.prefs.outputId
      : (this.state.outputs[0]?.id ?? null);
  }

  private bindInputs() {
    if (!this.access) return;
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = input.id === this.state.inputId ? (e: any) => this.handle(e) : null;
    }
  }

  /** El nombre del instrumento conectado, tal cual lo da el sistema. */
  deviceName(): string | null {
    return this.state.inputs.find(d => d.id === this.state.inputId)?.name ?? null;
  }

  /**
   * El nombre para mostrar en poco lugar.
   *
   * Los puertos MIDI se llaman a los gritos y con la palabra de más: el Kross
   * se presenta como "KROSS 2 KEYBOARD", y "KEYBOARD" al lado de un icono de
   * teclado no agrega nada. Se saca esa cola y se deja de gritar.
   */
  shortDeviceName(): string | null {
    const raw = this.deviceName();
    if (!raw) return null;
    const sinCola = raw.replace(/[\s-]*\b(KEYBOARD|MIDI ?(IN|OUT)?|PORT ?\d*|INPUT|OUTPUT|SOUND)\b[\s\d-]*$/i, '').trim() || raw;
    if (sinCola !== sinCola.toUpperCase()) return sinCola;      // ya venía en minúsculas
    return sinCola.split(/\s+/)
      // Las siglas cortas (USB, MPK, GM) se dejan como están
      .map(w => (/\d/.test(w) || w.length <= 3 ? w : w.charAt(0) + w.slice(1).toLowerCase()))
      .join(' ');
  }

  private handle(e: any) {
    const [status, d1, d2] = e.data;
    const cmd = status & 0xf0;
    this.state.lastMessageAt = e.timeStamp ?? performance.now();

    if (cmd === 0x90 && d2 > 0) {
      this.down.add(d1);
      this.held.delete(d1);
      this.onNote.forEach(f => f({ midi: d1, velocity: d2 / 127, at: this.state.lastMessageAt }));
      return;
    }
    if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) {
      this.down.delete(d1);
      // Con el pedal pisado la nota no se suelta: queda retenida
      if (this.state.sustain) this.held.add(d1);
      else this.onNoteOff.forEach(f => f(d1));
      return;
    }
    if (cmd === 0xb0) {
      this.onControl.forEach(f => f(d1, d2));
      if (this.learning && d1 !== 64 && d2 > 0) { this.learning(d1); return; }
      if (this.prefs.footCc !== null && d1 === this.prefs.footCc && d2 >= 64) {
        this.onFoot.forEach(f => f());
        return;
      }
      if (d1 === 64) {
        // Medio pedal: el Kross manda valores intermedios, y de 64 para
        // arriba ya cuenta como pisado.
        const on = d2 >= 64;
        if (on !== this.state.sustain) {
          this.state.sustain = on;
          if (!on) { this.held.forEach(m => { if (!this.down.has(m)) this.onNoteOff.forEach(f => f(m)); }); this.held.clear(); }
          this.emit();
        }
      }
      if (d1 === 0) this.pendingBank.msb = d2;
      if (d1 === 32) this.pendingBank.lsb = d2;
      if (d1 === 123 || d1 === 120) {   // all notes off / all sound off
        this.down.forEach(m => this.onNoteOff.forEach(f => f(m)));
        this.down.clear(); this.held.clear();
      }
      return;
    }
    if (cmd === 0xc0) {
      // El instrumento avisa qué sonido pusiste: se recuerda para poder
      // volver a él desde la app.
      this.state.program = { bankMsb: this.pendingBank.msb, bankLsb: this.pendingBank.lsb, program: d1 };
      this.setPrefs({ lastProgram: this.state.program });
    }
  }

  private pendingBank = { msb: 0, lsb: 0 };

  /* ---------------- Salida ---------------- */

  private out(): any | null {
    if (!this.access || !this.state.outputId) return null;
    return this.access.outputs.get(this.state.outputId) ?? null;
  }

  /** ¿Se puede mandar sonido al instrumento ahora mismo? */
  canPlayOut(): boolean { return this.prefs.throughOut && !!this.out(); }

  private send(bytes: number[], when?: number) {
    const o = this.out();
    if (!o) return;
    try { o.send(bytes, when === undefined ? undefined : when + this.prefs.latencyMs); } catch { /* puerto cerrado */ }
  }

  /**
   * Canal en el que hay que mandar. Sin argumento va el canal global de los
   * ajustes; con argumento, el de la pista (1–16), que es lo que permite que
   * cada pista de una pieza suene con un sonido distinto del Kross.
   */
  private ch(channel?: number): number {
    const n = channel && channel >= 1 && channel <= 16 ? channel : this.prefs.channel;
    return Math.max(0, Math.min(15, n - 1));
  }

  /** Toca una nota en el instrumento. `duration` en segundos. */
  playNote(midi: number, velocity = 0.8, duration = 0.6, channel?: number) {
    const ch = this.ch(channel);
    const v = clamp7(Math.round(velocity * 127), 1);
    const now = performance.now();
    this.send([0x90 | ch, midi, v], now);
    this.send([0x80 | ch, midi, 0], now + duration * 1000);
  }

  noteOn(midi: number, velocity = 0.8, channel?: number) {
    this.send([0x90 | this.ch(channel), midi, clamp7(Math.round(velocity * 127), 1)]);
  }
  noteOff(midi: number, channel?: number) {
    this.send([0x80 | this.ch(channel), midi, 0]);
  }

  /**
   * Corta todo: al parar, al cambiar de pieza o al salir de la sección. Va por
   * los 16 canales porque una pieza puede haber dejado notas colgadas en
   * cualquiera de ellos.
   */
  panic() {
    for (let ch = 0; ch < 16; ch++) {
      this.send([0xb0 | ch, 120, 0]);   // all sound off
      this.send([0xb0 | ch, 123, 0]);   // all notes off
      this.send([0xb0 | ch, 64, 0]);    // pedal arriba
    }
  }

  /** Vuelve al último sonido que el instrumento avisó tener puesto. */
  recallProgram(): boolean {
    const p = this.prefs.lastProgram;
    if (!p) return false;
    this.selectProgram(p.bankMsb, p.bankLsb, p.program);
    return true;
  }

  /** Cambia el sonido del instrumento (banco + programa) en el canal global. */
  selectProgram(bankMsb: number, bankLsb: number, program: number) {
    this.selectProgramOn(this.prefs.channel, bankMsb, bankLsb, program);
  }

  /** Lo mismo, pero en el canal que se le diga (1–16). */
  selectProgramOn(channel: number, bankMsb: number, bankLsb: number, program: number) {
    const ch = this.ch(channel);
    this.send([0xb0 | ch, 0, clamp7(bankMsb)]);
    this.send([0xb0 | ch, 32, clamp7(bankLsb)]);
    this.send([0xc0 | ch, clamp7(program)]);
  }

  /* ---------------- Sonidos guardados ---------------- */

  /**
   * Lo último que el instrumento avisó tener puesto, aunque todavía no se
   * haya guardado con nombre. Es lo que se ofrece al apretar "guardar este
   * sonido": uno gira el dial del Kross y la app ya sabe qué eligió.
   */
  pendingCapture(): { bankMsb: number; bankLsb: number; program: number } | null {
    return this.state.program ?? this.prefs.lastProgram ?? null;
  }

  presets(): KrossPreset[] { return this.prefs.presets; }

  findPreset(id: string | null | undefined): KrossPreset | null {
    if (!id) return null;
    return this.prefs.presets.find(p => p.id === id) ?? null;
  }

  /** Guarda con nombre el sonido que el instrumento tiene puesto ahora. */
  capturePreset(name: string): KrossPreset | null {
    const cur = this.pendingCapture();
    if (!cur) return null;
    return this.addPreset(name, cur.bankMsb, cur.bankLsb, cur.program);
  }

  /** Alta a mano, para cuando uno tiene el banco y el programa en papel. */
  addPreset(name: string, bankMsb: number, bankLsb: number, program: number): KrossPreset {
    const preset: KrossPreset = {
      id: `kp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || 'Sonido',
      bankMsb: clamp7(bankMsb), bankLsb: clamp7(bankLsb), program: clamp7(program),
    };
    this.setPrefs({ presets: [...this.prefs.presets, preset] });
    return preset;
  }

  renamePreset(id: string, name: string) {
    this.setPrefs({ presets: this.prefs.presets.map(p => p.id === id ? { ...p, name: name.trim() || p.name } : p) });
  }

  removePreset(id: string) {
    this.setPrefs({ presets: this.prefs.presets.filter(p => p.id !== id) });
  }

  /** Pone ese sonido en el canal indicado (o en el global). */
  applyPreset(id: string, channel?: number): boolean {
    const p = this.findPreset(id);
    if (!p) return false;
    this.selectProgramOn(channel ?? this.prefs.channel, p.bankMsb, p.bankLsb, p.program);
    return true;
  }

  /* ---------------- Reloj ---------------- */

  /**
   * Manda reloj MIDI a 24 pulsos por negra, que es lo que espera cualquier
   * arpegiador. Con esto el Kross sigue el tempo de la app en vez de tener que
   * ponerle el mismo número a mano.
   */
  startClock(bpm: number) {
    if (!this.prefs.sendClock || !this.out()) return;
    this.stopClock();
    this.send([0xfa]);                                  // start
    const step = 60000 / (bpm || 100) / 24;
    let tick = performance.now();
    const pump = () => {
      const now = performance.now();
      // Se mandan por adelantado los pulsos de los próximos 120 ms
      while (tick < now + 120) { this.send([0xf8], tick); tick += step; }
      this.clockTimer = window.setTimeout(pump, 60);
    };
    pump();
  }
  stopClock() {
    if (this.clockTimer !== null) { window.clearTimeout(this.clockTimer); this.clockTimer = null; this.send([0xfc]); }
  }
}

export const midi = new MidiHub();
