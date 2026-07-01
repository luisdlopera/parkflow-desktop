"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/bridge/Button";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Input } from "@/components/bridge/Input";
import { Separator } from "@heroui/react";
import { createAuthProvider } from "@/auth/runtime/createAuthProvider";
import { isTauri } from "@/auth/runtime/detectRuntime";
import { loadRememberMeEmail, saveRememberMeEmail, clearRememberMeEmail } from "@/lib/services/remember-me.service";
import { broadcastAuthEvent } from "@/hooks/auth/useAuthBroadcast";
import { checkSetupRequired } from "@/lib/api/auth-api";
import { authBase } from "@/lib/api/config";
import { errorService } from "@/lib/errors/error-service";
import { useAuthStore } from "@/lib/stores/auth.store";
import { FormErrorSummary } from "@/components/feedback/FormErrorSummary";
import { loginSchema, setupSchema, LoginInput, SetupInput } from "@/lib/validation/auth.schema";
import { Lock, Mail, User, Building, Landmark, Zap } from "lucide-react";
import { safeStorage } from "@/lib/utils/storage";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "Inicio de sesión cancelado en el proveedor externo.",
  oauth_cancelled: "Inicio de sesión cancelado.",
  oauth_invalid_params: "Error en la solicitud de autenticación. Intenta de nuevo.",
  oauth_expired: "La solicitud expiró. Intenta de nuevo.",
  oauth_unlinked: "No hay una cuenta de ParkFlow vinculada a este correo. Inicia sesión con tu email y contraseña primero.",
  oauth_disabled: "Tu cuenta de ParkFlow está desactivada. Contacta al administrador.",
  oauth_blocked: "Tu cuenta de ParkFlow está bloqueada. Contacta al administrador.",
  oauth_error: "Error al iniciar sesión con el proveedor externo. Intenta de nuevo.",
  oauth_provider_error: "El proveedor externo reportó un error. Intenta de nuevo.",
};

const fallbackDeviceId = process.env.NEXT_PUBLIC_DEVICE_ID ?? "desktop-default";
const deviceName = process.env.NEXT_PUBLIC_DEVICE_NAME ?? "Caja principal";
const platform = process.env.NEXT_PUBLIC_DEVICE_PLATFORM ?? "web";
const fingerprint = process.env.NEXT_PUBLIC_DEVICE_FINGERPRINT ?? "browser";

export default function LoginPage() {
  const router = useRouter();
  const { user: authStoreUser, isAuthenticated: authStoreAuthenticated } = useAuthStore();
  const [nextPath, setNextPath] = useState("/");
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [sessionExpiredReason, setSessionExpiredReason] = useState<string | null>(null);

  const [initialFormValues] = useState(() => {
    const remembered = typeof window !== "undefined" ? loadRememberMeEmail() : null;
    return {
      email: remembered?.email ?? "",
      password: "",
      rememberMe: remembered?.rememberMe ?? false,
    };
  });

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: initialFormValues,
  });

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

  const activeForm = isSetupMode ? setupForm : loginForm;
  const activeFormState = isSetupMode ? setupForm.formState : loginForm.formState;

  const handleOAuthSuccess = useCallback(async () => {
    try {
      const authProvider = await createAuthProvider();
      const session = await authProvider.restoreSession();
      if (session) {
        useAuthStore.getState().setAuthState(
          session.user,
          session.permissions,
          session.expiresAt
        );
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", window.location.pathname);
        }
        broadcastAuthEvent({ type: "auth:login" });
        if (!session.user.onboardingCompleted) {
          router.replace("/onboarding");
        } else {
          router.replace(nextPath);
        }
      }
    } catch {
      // Silently fail - user can still use email login
    }
  }, [router, nextPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") ?? "/";
    const reason = params.get("reason");
    const oauthSuccess = params.get("oauth");
    const error = params.get("error");
    const provider = params.get("provider");

    setNextPath(next);
    if (reason) setSessionExpiredReason(reason);

    if (oauthSuccess === "success") {
      void handleOAuthSuccess();
      return;
    }

    if (error && error.startsWith("oauth")) {
      const msg = OAUTH_ERROR_MESSAGES[error] || OAUTH_ERROR_MESSAGES.oauth_error;
      const providerLabel = provider === "google" ? "Google" : provider === "microsoft" ? "Microsoft" : provider;
      setOauthError(providerLabel ? `${providerLabel}: ${msg}` : msg);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

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
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Check setup required failed:", err);
        }
        setIsSetupMode(false);
      }
    })();
  }, [handleOAuthSuccess, nextPath]);

  useEffect(() => {
    if (!authStoreAuthenticated || !authStoreUser) return;
    if (!authStoreUser.onboardingCompleted) {
      router.replace("/onboarding");
    } else {
      router.replace(nextPath);
    }
  }, [authStoreAuthenticated, authStoreUser, router, nextPath]);

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

      const authProvider = await createAuthProvider();
      const session = await authProvider.login({
        email: emailValue,
        password: passwordValue,
        rememberMe: data.rememberMe,
      });

      if (data.rememberMe) {
        saveRememberMeEmail(emailValue);
      } else {
        clearRememberMeEmail();
      }

      broadcastAuthEvent({ type: "auth:login" });
      safeStorage.removeItem("parkflow_just_logged_out");

      useAuthStore.getState().setUser(session.user);
      if (session.permissions) {
        useAuthStore.getState().setPermissions(session.permissions);
      }
      if (session.expiresAt) {
        useAuthStore.getState().setSessionExpiresAt(session.expiresAt);
      }

      if (!session.user.onboardingCompleted) {
        router.replace("/onboarding");
      } else {
        router.replace(nextPath);
      }
    } catch (err) {
      const pfError = errorService.normalize(err);
      setGlobalError(`${pfError.title}: ${pfError.message}`);
    }
  };

  const onSetupSubmit = async (_data: SetupInput) => {
    setGlobalError("La configuración inicial debe hacerse a través del flujo de onboarding.");
  };

  const isSubmitting = activeFormState.isSubmitting;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4 sm:px-6 py-10">
      <a href="#login-form" className="sr-only">Ir al formulario</a>
      <div
        id="login-form"
        className="surface w-full space-y-6 rounded-[2rem] p-6 sm:p-8 md:p-10 border border-default-200 dark:border-default-200 bg-default-50 dark:bg-default-100"
        aria-label={isSetupMode ? "Formulario de configuración inicial" : "Formulario de inicio de sesión"}
      >
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-700/80 mb-2">Parkflow</p>
          <h1 className="text-3xl font-black text-foreground dark:text-default-50 tracking-tight">
            {isSetupMode ? "Configuración Inicial" : "¡Bienvenido!"}
          </h1>
          <p className="text-default-500 text-sm mt-2">
            {isSetupMode
              ? "Crea tu cuenta de administrador y registra tu negocio"
              : "Ingresa tus credenciales para continuar"}
          </p>
        </div>

        {sessionExpiredReason && !globalError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <svg className="mt-0.5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold">Sesión expirada</span>
              <span className="text-sm leading-relaxed">
                Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.
              </span>
            </div>
          </div>
        )}

        <FormErrorSummary
          message={oauthError || globalError || undefined}
          testId={oauthError ? "oauth-error-message" : globalError ? "error-message" : undefined}
        />

        <form
          onSubmit={(e) => {
            void (isSetupMode
              ? setupForm.handleSubmit(onSetupSubmit)(e)
              : loginForm.handleSubmit(onLoginSubmit)(e));
          }}
        >
          <div className="space-y-4">
            {isSetupMode && (
              <div className="space-y-4 bg-default-50 dark:bg-default-100 p-5 rounded-2xl border border-default-200 dark:border-default-200 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-default-400">Datos del Administrador</p>

                <Input
                  {...setupForm.register("adminName")}
                  type="text"
                  label="Nombre Completo"
                  placeholder="Nombre del Administrador"
                  size="md"
                  startContent={<User size={18} className="text-default-400" />}
                  errorMessage={setupForm.formState.errors.adminName?.message}
                  isInvalid={!!setupForm.formState.errors.adminName}
                />
              </div>
            )}

            <div className="bg-default-50 dark:bg-default-100 p-5 rounded-2xl border border-default-200/60 dark:border-default-200 space-y-4">
              <Input
                data-testid="username"
                {...(isSetupMode ? setupForm.register("email") : loginForm.register("email"))}
                type="email"
                label="Correo Electrónico"
                placeholder="ejemplo@parkflow.com"
                autoComplete="username"
                isRequired
                size="md"
                startContent={<Mail size={18} className="text-default-400" />}
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
                    label="Contraseña"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    isRequired
                    size="md"
                    startContent={<Lock size={18} className="text-default-400" />}
                    endContent={
                      <button
                        type="button"
                        aria-label="Mostrar contraseña"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs font-semibold text-default-400 hover:text-default-600 dark:text-default-500 dark:hover:text-default-300 transition-colors focus:outline-none"
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
                    startContent={<Lock size={18} className="text-default-400" />}
                    errorMessage={setupForm.formState.errors.confirmPassword?.message}
                    isInvalid={!!setupForm.formState.errors.confirmPassword}
                  />
                </div>
              ) : (
                <Input
                  data-testid="password"
                  {...loginForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  label="Contraseña"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  isRequired
                  size="md"
                  startContent={<Lock size={18} className="text-default-400" />}
                  endContent={
                    <button
                      type="button"
                      aria-label="Mostrar contraseña"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs font-semibold text-default-400 hover:text-default-600 dark:text-default-500 dark:hover:text-default-300 transition-colors focus:outline-none"
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
              <div className="space-y-4 bg-default-50 dark:bg-default-100 p-5 rounded-2xl border border-default-200/60 dark:border-default-200 mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-default-400">Datos de la Empresa / Parqueadero</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    {...setupForm.register("companyName")}
                    type="text"
                    label="Nombre del Parqueadero"
                    placeholder="Mi Parqueadero Local"
                    size="md"
                    startContent={<Building size={18} className="text-default-400" />}
                    errorMessage={setupForm.formState.errors.companyName?.message}
                    isInvalid={!!setupForm.formState.errors.companyName}
                  />

                  <Input
                    {...setupForm.register("companyNit")}
                    type="text"
                    label="NIT / Registro Tributario"
                    placeholder="900123456"
                    size="md"
                    startContent={<Landmark size={18} className="text-default-400" />}
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
            <div className="flex items-center justify-between mt-4">
              <Controller
                control={loginForm.control}
                name="rememberMe"
                render={({ field: { onChange, value, ref } }) => (
                  <Checkbox
                    ref={ref}
                    isSelected={value}
                    onValueChange={onChange}
                    size="sm"
                    className="text-default-600"
                  >
                    Recordarme
                  </Checkbox>
                )}
              />
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
            className="w-full font-bold border border-default-200 text-default-50 mt-4"
            isLoading={isSubmitting}
            isDisabled={isSubmitting}
          >
            {isSubmitting ? (
              isSetupMode ? "Configurando..." : "Entrando..."
            ) : (
              isSetupMode ? "Completar Configuración Inicial" : "Entrar al Sistema"
            )}
          </Button>
        </form>

        {!isSetupMode && (
          <>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs font-bold text-default-400 uppercase tracking-widest shrink-0">
                o continúa con
              </span>
              <Separator className="flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="bordered"
                size="lg"
                className="w-full font-medium border border-default-200"
                onPress={() => { window.location.href = `${authBase()}/oauth2/authorization/google`; }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="bordered"
                size="lg"
                className="w-full font-medium border border-default-200"
                onPress={() => { window.location.href = `${authBase()}/oauth2/authorization/microsoft`; }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022"/>
                  <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00"/>
                  <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF"/>
                  <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900"/>
                </svg>
                Microsoft
              </Button>
            </div>
          </>
        )}

        <p className="text-center text-[10px] font-bold text-default-400 uppercase tracking-widest pt-2">
          &copy; 2026 ParkFlow Operations. v2.0
        </p>
      </div>
    </main>
  );
}
