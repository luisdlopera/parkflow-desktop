"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/bridge/Button";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Input } from "@/components/bridge/Input";
import { login } from "@/features/auth/api/auth.api";
import { loadSession, saveSession } from "@/lib/services/auth-storage.service";
import { currentUser } from "@/lib/services/auth-domain.service";
import { checkSetupRequired, postInitialSetup } from "@/lib/api/auth-api";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";
import { useAuthStore } from "@/lib/stores/auth.store";
import { FormErrorSummary } from "@/components/feedback/FormErrorSummary";
import { loginSchema, setupSchema, LoginInput, SetupInput } from "@/lib/validation/auth.schema";
import { Lock, Mail, User, Building, Landmark, Zap } from "lucide-react";

const fallbackDeviceId = process.env.NEXT_PUBLIC_DEVICE_ID ?? "desktop-default";
const deviceName = process.env.NEXT_PUBLIC_DEVICE_NAME ?? "Caja principal";
const platform = process.env.NEXT_PUBLIC_DEVICE_PLATFORM ?? "desktop";
const fingerprint = process.env.NEXT_PUBLIC_DEVICE_FINGERPRINT ?? "local-dev";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/");
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [deviceId, setDeviceId] = useState(fallbackDeviceId);
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Initialize login form with react-hook-form
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "admin@parkflow.local",
      password: "",
      rememberMe: false,
    },
  });

  // Initialize setup form with react-hook-form
  const setupForm = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      adminName: "",
      companyName: "",
      companyNit: "",
    },
  });

  // Select the active form based on local state
  const activeForm = isSetupMode ? setupForm : loginForm;
  const activeFormState = isSetupMode ? setupForm.formState : loginForm.formState;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setNextPath(params.get("next") ?? "/");
    }

    void (async () => {
      if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
        return;
      }
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const value = await invoke<string>("auth_get_or_create_device_id");
        setDeviceId(value);
      } catch {
        setDeviceId(fallbackDeviceId);
      }
    })();

    // Check if initial admin setup is required (with timeout)
    void (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const data = await checkSetupRequired();
        clearTimeout(timeoutId);

        if (data.setupRequired) {
          setIsSetupMode(true);
        }
      } catch (err) {
        // Only log non-abort errors
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Check setup required failed:", err);
        }
        // Continue with login mode even if setup check fails
        setIsSetupMode(false);
      }
    })();
  }, []);

  // Separate effect to check session and redirect on mount
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const session = await loadSession();
      const user = await currentUser();
      if (!mounted) return;
      if (session && user) {
        if (!user.onboardingCompleted) {
          router.replace("/onboarding");
        } else {
          const next = new URLSearchParams(window.location.search).get("next") ?? "/";
          router.replace(next);
        }
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const loadDemoData = () => {
    setupForm.reset({
      email: "admin@parkflow.local",
      password: "Qwert.12345",
      confirmPassword: "Qwert.12345",
      adminName: "Administrador Local",
      companyName: "Empresa Demo Local",
      companyNit: "900123456",
    });
  };

  const onLoginSubmit = async (data: LoginInput) => {
    setGlobalError(null);
    try {
      const emailValue = data.email.trim();
      const passwordValue = data.password;

      const session = await login({
        email: emailValue,
        password: passwordValue,
        deviceId,
        deviceName,
        platform,
        fingerprint,
        offlineRequestedHours: 48
      });

      // Update the store global so AuthGate doesn't redirect to login
      useAuthStore.getState().setUser(session.user);
      if (!session.user.onboardingCompleted) {
        router.replace("/onboarding");
      } else {
        router.replace(nextPath);
      }
    } catch (err) {
      const userError = getUserErrorMessage(err, "auth.login");
      setGlobalError(`${userError.title}: ${userError.description}`);
    }
  };

  const onSetupSubmit = async (data: SetupInput) => {
    setGlobalError(null);
    try {
      const session = await postInitialSetup({
        email: data.email.trim(),
        password: data.password,
        name: data.adminName.trim(),
        companyName: data.companyName.trim(),
        nit: data.companyNit.trim(),
      });

      await saveSession(session);
      useAuthStore.getState().setUser(session.user);
      if (!session.user?.onboardingCompleted) {
        router.replace("/onboarding");
      } else {
        router.replace(nextPath);
      }
    } catch (err) {
      const userError = getUserErrorMessage(err, "auth.setup");
      setGlobalError(`${userError.title}: ${userError.description}`);
    }
  };

  const isSubmitting = activeFormState.isSubmitting;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4 sm:px-6 py-10">
      <a href="#login-form" className="sr-only">Ir al formulario</a>
      <form
        id="login-form"
        onSubmit={activeForm.handleSubmit(
          isSetupMode
            ? onSetupSubmit
            : onLoginSubmit
        )}
        className="surface w-full space-y-6 rounded-[2rem] p-6 sm:p-8 md:p-10 border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950"
        aria-label={isSetupMode ? "Formulario de configuración inicial" : "Formulario de inicio de sesión"}
      >
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-700/80 mb-2">Parkflow</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {isSetupMode ? "Configuración Inicial" : "¡Bienvenido!"}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            {isSetupMode
              ? "Crea tu cuenta de administrador y registra tu negocio"
              : "Ingresa tus credenciales para continuar"}
          </p>
        </div>

        <FormErrorSummary
          message={globalError || undefined}
          testId={globalError ? "error-message" : undefined}
        />

        <div className="space-y-4">
          {isSetupMode && (
            <div className="space-y-4 bg-slate-50 dark:bg-neutral-900 p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos del Administrador</p>

              <Input
                {...setupForm.register("adminName")}
                type="text"
                label="Nombre Completo"
                placeholder="Nombre del Administrador"
                size="md"
                startContent={<User size={18} className="text-slate-400" />}
                errorMessage={setupForm.formState.errors.adminName?.message}
                isInvalid={!!setupForm.formState.errors.adminName}
              />
            </div>
          )}

          <div className="bg-white dark:bg-neutral-950 p-5 rounded-2xl border border-slate-200/60 dark:border-neutral-800 space-y-4">
            <Input
              data-testid="username"
              {...(isSetupMode ? setupForm.register("email") : loginForm.register("email"))}
              type="email"
              label={
                <span>
                  Correo Electrónico <span className="text-danger">*</span>
                </span>
              }
              placeholder="ejemplo@parkflow.com"
              autoComplete="username"
              isRequired
              size="md"
              startContent={<Mail size={18} className="text-slate-400" />}
              errorMessage={
                isSetupMode
                  ? setupForm.formState.errors.email?.message
                  : loginForm.formState.errors.email?.message
              }
              isInvalid={
                isSetupMode
                  ? !!setupForm.formState.errors.email
                  : !!loginForm.formState.errors.email
              }
            />

            {isSetupMode ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  data-testid="password"
                  {...setupForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  label={
                    <span>
                      Contraseña <span className="text-danger">*</span>
                    </span>
                  }
                  placeholder="••••••••"
                  autoComplete="new-password"
                  isRequired
                  size="md"
                  startContent={<Lock size={18} className="text-slate-400" />}
                  endContent={
                    <button
                      type="button"
                      aria-label="Mostrar contraseña"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  }
                  errorMessage={setupForm.formState.errors.password?.message}
                  isInvalid={!!setupForm.formState.errors.password}
                />
                <Input
                  {...setupForm.register("confirmPassword")}
                  type={showPassword ? "text" : "password"}
                  label="Confirmar Contraseña"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  size="md"
                  startContent={<Lock size={18} className="text-slate-400" />}
                  errorMessage={setupForm.formState.errors.confirmPassword?.message}
                  isInvalid={!!setupForm.formState.errors.confirmPassword}
                />
              </div>
            ) : (
              <Input
                data-testid="password"
                {...loginForm.register("password")}
                type={showPassword ? "text" : "password"}
                label={
                  <span>
                    Contraseña <span className="text-danger">*</span>
                  </span>
                }
                placeholder="••••••••"
                autoComplete="current-password"
                isRequired
                size="md"
                startContent={<Lock size={18} className="text-slate-400" />}
                endContent={
                  <button
                    type="button"
                    aria-label="Mostrar contraseña"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                }
                errorMessage={loginForm.formState.errors.password?.message}
                isInvalid={!!loginForm.formState.errors.password}
              />
            )}
          </div>

          {isSetupMode && (
            <div className="space-y-4 bg-white dark:bg-neutral-950 p-5 rounded-2xl border border-slate-200/60 dark:border-neutral-800 mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos de la Empresa / Parqueadero</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  {...setupForm.register("companyName")}
                  type="text"
                  label="Nombre del Parqueadero"
                  placeholder="Mi Parqueadero Local"
                  size="md"
                  startContent={<Building size={18} className="text-slate-400" />}
                  errorMessage={setupForm.formState.errors.companyName?.message}
                  isInvalid={!!setupForm.formState.errors.companyName}
                />

                <Input
                  {...setupForm.register("companyNit")}
                  type="text"
                  label="NIT / Registro Tributario"
                  placeholder="900123456"
                  size="md"
                  startContent={<Landmark size={18} className="text-slate-400" />}
                  errorMessage={setupForm.formState.errors.companyNit?.message}
                  isInvalid={!!setupForm.formState.errors.companyNit}
                />
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={loadDemoData}
                  className="text-xs font-bold text-amber-700 hover:underline hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400 transition-colors"
                >
                  <Zap className="inline w-3 h-3 mr-0.5" /> Usar Datos Demo (Desarrollo)
                </button>
              </div>
            </div>
          )}
        </div>

        {!isSetupMode && (
          <div className="flex items-center justify-between">
            <Checkbox
              isSelected={loginForm.watch("rememberMe")}
              onValueChange={(checked: boolean) => loginForm.setValue("rememberMe", checked)}
              size="sm"
              className="text-slate-600"
            >
              Recordarme
            </Checkbox>
            <Link href="/forgot-password" className="text-sm font-bold text-amber-700 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        )}

        <Button
          data-testid="login-button"
          type="submit"
          color={isSetupMode ? "success" : "primary"}
          size="lg"
          className="w-full font-bold border border-default-200 text-white"
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="inline-block animate-spin mr-2">⚙️</span>
              {isSetupMode ? "Configurando..." : "Entrando..."}
            </>
          ) : (
            isSetupMode ? "Completar Configuración Inicial" : "Entrar al Sistema"
          )}
        </Button>

        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
          &copy; 2026 ParkFlow Operations. v2.0
        </p>
      </form>
    </main>
  );
}
