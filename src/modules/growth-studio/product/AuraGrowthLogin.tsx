import { useState } from 'react';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

import { auth } from '../../../firebase';

interface AuraGrowthLoginProps {
  readonly onLoginSuccess: () => void;
}

const getAuthErrorMessage = (
  error: unknown,
): string => {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(error.code)
      : '';

  if (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found')
  ) {
    return 'El correo o la contraseña no son correctos.';
  }

  if (code.includes('too-many-requests')) {
    return 'Demasiados intentos. Espera un momento e inténtalo nuevamente.';
  }

  if (code.includes('network-request-failed')) {
    return 'No fue posible conectar con el servicio de autenticación.';
  }

  return 'No fue posible iniciar sesión. Inténtalo nuevamente.';
};

const AuraGrowthLogin = ({
  onLoginSuccess,
}: AuraGrowthLoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] =
    useState(false);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState('');
  const [noticeMessage, setNoticeMessage] =
    useState('');

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage('');
    setNoticeMessage('');
    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      onLoginSuccess();
    } catch (error) {
      console.error(
        '[Aura Growth] Login error:',
        error,
      );

      setErrorMessage(
        getAuthErrorMessage(error),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();

    setErrorMessage('');
    setNoticeMessage('');

    if (!normalizedEmail) {
      setErrorMessage(
        'Ingresa tu correo para recuperar tu contraseña.',
      );
      return;
    }

    try {
      await sendPasswordResetEmail(
        auth,
        normalizedEmail,
      );

      setNoticeMessage(
        'Te enviamos instrucciones para restablecer tu contraseña.',
      );
    } catch (error) {
      console.error(
        '[Aura Growth] Password reset error:',
        error,
      );

      setErrorMessage(
        'No fue posible enviar la recuperación de contraseña.',
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="relative">
            <img
              src="/brand/aura-growth-logo-official.png"
              alt="Aura Growth"
              className="h-24 w-auto object-contain object-left"
            />

            <div className="mt-14 max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.34em] text-cyan-300/80">
                Growth Intelligence Platform
              </p>

              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight xl:text-5xl">
                Convierte inteligencia en crecimiento.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-8 text-white/45">
                Planea, prioriza y ejecuta crecimiento
                comercial con decisiones respaldadas por
                evidencia, contexto e inteligencia gobernada.
              </p>
            </div>
          </div>

          <div className="relative grid gap-3 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <Target
                size={18}
                className="text-cyan-300"
              />
              <p className="mt-3 text-sm font-black">
                Prioriza
              </p>
              <p className="mt-1 text-xs leading-5 text-white/35">
                Detecta oportunidades y siguientes acciones.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <Sparkles
                size={18}
                className="text-cyan-300"
              />
              <p className="mt-3 text-sm font-black">
                Ejecuta
              </p>
              <p className="mt-1 text-xs leading-5 text-white/35">
                Convierte estrategia en campañas y contenido.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <TrendingUp
                size={18}
                className="text-cyan-300"
              />
              <p className="mt-3 text-sm font-black">
                Aprende
              </p>
              <p className="mt-1 text-xs leading-5 text-white/35">
                Mide resultados y mejora continuamente.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <img
                src="/brand/aura-growth-logo-official.png"
                alt="Aura Growth"
                className="h-20 w-auto object-contain object-left"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
              <div className="flex h-14 w-28 items-center justify-start overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#07111f] px-3">
                <img
                  src="/brand/aura-logo-official.png"
                  alt="Aura"
                  className="h-9 w-auto object-contain"
                />
              </div>

              <p className="mt-7 text-xs font-black uppercase tracking-[0.26em] text-cyan-300/70">
                Acceso seguro
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Bienvenido a Aura Growth
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/40">
                Ingresa con tu cuenta empresarial para
                continuar a tu espacio de crecimiento.
              </p>

              <form
                onSubmit={handleLogin}
                className="mt-8 space-y-5"
              >
                <label className="block">
                  <span className="text-xs font-bold text-white/55">
                    Correo electrónico
                  </span>

                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4">
                    <Mail
                      size={17}
                      className="shrink-0 text-white/30"
                    />

                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="nombre@empresa.com"
                      className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-white/20"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-white/55">
                    Contraseña
                  </span>

                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4">
                    <LockKeyhole
                      size={17}
                      className="shrink-0 text-white/30"
                    />

                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white outline-none"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                      onClick={() =>
                        setShowPassword(
                          (current) => !current,
                        )
                      }
                      className="text-white/30 transition hover:text-cyan-200"
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      void handlePasswordReset()
                    }
                    className="text-xs font-bold text-cyan-300/75 transition hover:text-cyan-200"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-xs leading-5 text-red-100"
                  >
                    {errorMessage}
                  </div>
                )}

                {noticeMessage && (
                  <div
                    role="status"
                    className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3 text-xs leading-5 text-cyan-100"
                  >
                    {noticeMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3.5 text-sm font-black text-[#07111f] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Validando acceso...'
                    : 'Entrar a Aura Growth'}

                  {!isSubmitting && (
                    <ArrowRight size={17} />
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-[11px] leading-5 text-white/25">
                Tu acceso está protegido por la
                infraestructura de identidad de Aura.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuraGrowthLogin;
