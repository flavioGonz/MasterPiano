import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, ArrowRight, KeyRound, User as UserIcon, Sparkles } from 'lucide-react';
import { login, register, type AuthState, type AuthUser } from '../lib/auth';
import { ThemeToggle } from './shell/ThemeToggle';
import { cn } from '../lib/utils';

/**
 * Puerta de entrada.
 *
 * Un teclado dibujado en SVG hace de fondo: las teclas "tocan" solas en un
 * bucle lento, con la escala de Do mayor. Es la misma idea del resto de la app
 * —el piano como objeto, no como ilustración— y le da identidad a una pantalla
 * que si no sería un formulario más.
 */
const KEYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const BLACK_AFTER = new Set([0, 1, 3, 4, 5, 7, 8, 10, 11, 12]);

const KeyboardBackdrop: React.FC = () => (
  <div aria-hidden className="absolute inset-x-0 bottom-0 h-[46vh] pointer-events-none select-none overflow-hidden">
    <div className="absolute inset-x-0 bottom-0 h-full flex items-end justify-center gap-[6px] px-4">
      {KEYS.map(i => (
        <div key={i} className="relative flex-1 max-w-[74px]">
          {/* Las teclas se dibujan con la misma tinta en los dos temas y se
              distinguen por opacidad: la negra es simplemente más densa. Así
              el teclado se lee igual sobre papel que sobre fondo profundo. */}
          <motion.div
            className="rounded-t-sm rounded-b-lg bg-ink"
            style={{ height: '38vh' }}
            animate={{ opacity: [0.07, 0.16, 0.07] }}
            transition={{ duration: 6, repeat: Infinity, delay: i * 0.42, ease: 'easeInOut' }}
          />
          {BLACK_AFTER.has(i) && (
            <motion.div
              className="absolute top-0 -right-[10px] w-[20px] rounded-b-md bg-ink"
              style={{ height: '23vh' }}
              animate={{ opacity: [0.18, 0.34, 0.18] }}
              transition={{ duration: 6, repeat: Infinity, delay: i * 0.42 + 0.2, ease: 'easeInOut' }}
            />
          )}
        </div>
      ))}
    </div>
    {/* Velo suave: el teclado se insinúa, no compite con el formulario */}
    <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/45 to-transparent" />
  </div>
);

interface Props {
  state: AuthState;
  onAuthenticated: (u: AuthUser) => void;
}

export const LoginScreen: React.FC<Props> = ({ state, onAuthenticated }) => {
  // En la primera corrida no hay cuentas: la pantalla arranca en "crear cuenta"
  const [mode, setMode] = useState<'login' | 'register'>(state.firstRun ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const u = mode === 'login'
        ? await login(username, password)
        : await register(username, password, displayName, code || undefined);
      onAuthenticated(u);
    } catch (err: any) {
      setError(err?.message || 'No se pudo entrar.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = username.trim().length >= 3 && password.length >= (mode === 'register' ? 8 : 1);

  return (
    <div className="min-h-dvh bg-bg text-ink relative flex flex-col">
      <KeyboardBackdrop />

      <header className="relative z-10 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-brand-ink font-serif font-bold">P</div>
          <div className="leading-tight">
            <div className="font-serif font-semibold text-[15px]">PianoMaster</div>
            <div className="text-[11px] text-ink-3">Conservatorio · Tutor 0 a 100</div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-5 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="w-full max-w-[380px] card p-6 md:p-7 space-y-5"
        >
          <div className="space-y-1.5">
            <div className="eyebrow">{state.firstRun ? 'Primera vez' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</div>
            <h1 className="font-serif font-semibold text-[26px] leading-tight">
              {state.firstRun ? 'Creá tu cuenta' : mode === 'login' ? 'Seguí donde dejaste' : 'Sumate al conservatorio'}
            </h1>
            <p className="text-[13px] text-ink-2 leading-relaxed">
              {state.firstRun
                ? 'Es la primera cuenta de esta instalación. Después el registro queda cerrado.'
                : mode === 'login'
                  ? 'Tu progreso, tus piezas y tu rutina te siguen a cualquier dispositivo.'
                  : 'Vas a necesitar el código de invitación de esta instalación.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <label className="block space-y-1.5">
                <span className="text-[11px] font-medium text-ink-2">Cómo querés que te llame</span>
                <input
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Mauricio" autoComplete="name"
                  className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand-line"
                />
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium text-ink-2">Usuario</span>
              <div className="relative">
                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
                  placeholder="mauricio" autoCapitalize="none" autoCorrect="off" autoComplete="username"
                  className="w-full bg-surface-2 border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand-line"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium text-ink-2">Contraseña</span>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'mínimo 8 caracteres' : '••••••••'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full bg-surface-2 border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand-line"
                />
              </div>
            </label>

            {mode === 'register' && state.needsCode && (
              <label className="block space-y-1.5">
                <span className="text-[11px] font-medium text-ink-2">Código de invitación</span>
                <input
                  value={code} onChange={e => setCode(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm font-mono text-ink focus:outline-none focus:border-brand-line"
                />
              </label>
            )}

            {error && (
              <div className="flex items-start gap-2 text-[12.5px] text-danger leading-snug">
                <AlertCircle size={13} className="shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={!canSubmit || busy} className="btn btn-primary w-full disabled:opacity-45">
              {busy ? <Loader2 size={15} className="animate-spin" /> : mode === 'login' ? <ArrowRight size={15} /> : <Sparkles size={15} />}
              {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          {!state.firstRun && (
            <div className="text-center text-[12.5px] text-ink-3">
              {mode === 'login' ? (
                state.signupOpen ? (
                  <>¿No tenés cuenta?{' '}
                    <button type="button" onClick={() => { setMode('register'); setError(null); }} className="text-brand-2 font-medium hover:underline">
                      Crear una
                    </button>
                  </>
                ) : 'El registro está cerrado en esta instalación.'
              ) : (
                <>¿Ya tenés cuenta?{' '}
                  <button type="button" onClick={() => { setMode('login'); setError(null); }} className="text-brand-2 font-medium hover:underline">
                    Entrar
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </main>

      <footer className="relative z-10 px-5 py-4 text-center text-[11px] text-ink-3">
        Metodología adaptativa · de 0 a 100 con el Maestro Aurelio
      </footer>
    </div>
  );
};
