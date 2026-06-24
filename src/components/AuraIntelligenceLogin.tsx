import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '../firebase';

type AuraIntelligenceLoginProps = {
  onLoginSuccess: () => void;
};

const AuraIntelligenceLogin: React.FC<AuraIntelligenceLoginProps> = ({
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert('Correo y contraseña son obligatorios.');
      return;
    }

    setIsLoggingIn(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      onLoginSuccess();
    } catch (error) {
      console.error(
        '[Aura Intelligence] Login error:',
        error
      );

      alert(
        'No se pudo iniciar sesión. Verifica tus credenciales.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d1117] bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.16),_transparent_35%)] p-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-cyan-300/15 bg-white/[0.045] p-8 shadow-2xl shadow-cyan-950/30">
        <div className="mb-7 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-[#101923] shadow-lg shadow-cyan-950/30">
            <img
              src="/android-chrome-192x192.png"
              alt="Aura Intelligence"
              className="h-12 w-12 rounded-xl object-contain"
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
              Aura Ecosystem
            </p>

            <h1 className="mt-1 text-2xl font-black">
              Aura Intelligence
            </h1>

            <p className="text-xs font-semibold text-cyan-100/60">
              Enterprise Copilot
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-white/60">
          Inicia sesión con un usuario válido de Aura para
          administrar conocimiento, conectores, auditoría y
          asistencia contextual del ecosistema.
        </p>

        <div className="grid gap-4">
          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Correo"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-cyan-300"
          />

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleLogin();
              }
            }}
            placeholder="Contraseña"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-cyan-300"
          />

          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={isLoggingIn}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/40 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={18} />

            {isLoggingIn
              ? 'Ingresando...'
              : 'Entrar'}
          </button>
        </div>
      </section>
    </main>
  );
};

export default AuraIntelligenceLogin;