"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { currentUser, loadSession, login, saveSession } from "@/lib/auth";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";
import { FormErrorSummary } from "@/components/feedback/FormErrorSummary";
import { Eye, EyeOff, Lock, Mail, User, Building, Landmark, Zap } from "lucide-react";

const fallbackDeviceId = process.env.NEXT_PUBLIC_DEVICE_ID ?? "desktop-default";
const deviceName = process.env.NEXT_PUBLIC_DEVICE_NAME ?? "Caja principal";
const platform = process.env.NEXT_PUBLIC_DEVICE_PLATFORM ?? "desktop";
const fingerprint = process.env.NEXT_PUBLIC_DEVICE_FINGERPRINT ?? "local-dev";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/");

  const [email, setEmail] = useState("admin@parkflow.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deviceId, setDeviceId] = useState(fallbackDeviceId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup mode states
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyNit, setCompanyNit] = useState("");

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

    // Check if initial admin setup is required
    void (async () => {
      try {
        const authBaseUrl = (process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "http://localhost:6011/api/v1/auth").replace(/\/$/, "");
        const response = await fetch(`${authBaseUrl}/setup-required`);
        if (response.ok) {
          const data = await response.json();
          if (data.setupRequired) {
            setIsSetupMode(true);
            setEmail(""); // clear default email for setup
          }
        }
      } catch (err) {
        console.error("Check setup required failed:", err);
      }
    })();
  }, []);

  // Separate effect to check session and redirect on mount — reads nextPath from URL directly to avoid race conditions
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
    setEmail("admin@parkflow.local");
    setAdminName("Administrador Local");
    setPassword("Qwert.12345");
    setConfirmPassword("Qwert.12345");
    setCompanyName("Empresa Demo Local");
    setCompanyNit("900123456");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const emailValue = email.trim();
      const passwordValue = password;

      if (!emailValue) {
        setError("El correo electrónico es requerido");
        setLoading(false);
        return;
      }
      if (!passwordValue) {
        setError("Debes ingresar la contraseña");
        setLoading(false);
        return;
      }

      if (isSetupMode) {
        if (!adminName.trim()) {
          setError("El nombre del administrador es requerido");
          setLoading(false);
          return;
        }
        if (passwordValue !== confirmPassword) {
          setError("Las contraseñas no coinciden");
          setLoading(false);
          return;
        }
        if (!companyName.trim()) {
          setError("El nombre del negocio es requerido");
          setLoading(false);
          return;
        }
        if (!companyNit.trim()) {
          setError("El NIT o identificación tributaria es requerido");
          setLoading(false);
          return;
        }

        const authBaseUrl = (process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "http://localhost:6011/api/v1/auth").replace(/\/$/, "");
        const response = await fetch(`${authBaseUrl}/setup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailValue,
            password: passwordValue,
            name: adminName.trim(),
            companyName: companyName.trim(),
            nit: companyNit.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo registrar la configuración inicial");
        }

        const session = await response.json();
        await saveSession(session);
        if (!session.user?.onboardingCompleted) {
          router.replace("/onboarding");
        } else {
          router.replace(nextPath);
        }
      } else {
        const session = await login({
          email: emailValue,
          password: passwordValue,
          deviceId,
          deviceName,
          platform,
          fingerprint,
          offlineRequestedHours: 48
        });
        if (!session.user.onboardingCompleted) {
          router.replace("/onboarding");
        } else {
          router.replace(nextPath);
        }
      }
    } catch (err) {
      const userError = getUserErrorMessage(err, "auth.login");
      setError(`${userError.title}: ${userError.description}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-6 py-10">
      <form onSubmit={onSubmit} className="surface w-full space-y-6 rounded-[2rem] p-8 sm:p-10 border border-default-200 dark:border border-default-200 border border-slate-200/80 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/90">
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
          message={error || undefined}
          testId={error === "El correo electrónico es requerido" ? "username-error" : "error-message"}
        />

        <div className="space-y-4">
          {isSetupMode && (
            <div className="space-y-4 bg-white dark:bg-neutral-950 p-5 rounded-2xl border border-slate-200/60 dark:border-neutral-800 border border-default-200 mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos del Administrador</p>
              
              <Input
                name="adminName"
                type="text"
                label="Nombre Completo"
                placeholder="Nombre del Administrador"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                
                size="md"
                startContent={<User size={18} className="text-slate-400" />}
              />
            </div>
          )}

          <div className="bg-white dark:bg-neutral-950 p-5 rounded-2xl border border-slate-200/60 dark:border-neutral-800 border border-default-200 space-y-4">
            <Input
            data-testid="username"
            name="email"
            type="email"
            label="Correo Electrónico"
            placeholder="ejemplo@parkflow.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            
            size="md"
            startContent={<Mail size={18} className="text-slate-400" />}
          />

          {isSetupMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                data-testid="password"
                name="password"
                type={showPassword ? "text" : "password"}
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                
                size="md"
                startContent={<Lock size={18} className="text-slate-400" />}
                endContent={
                  <button
                    type="button"
                    aria-label="Mostrar contraseña"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <Input
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                label="Confirmar Contraseña"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                
                size="md"
                startContent={<Lock size={18} className="text-slate-400" />}
              />
            </div>
          ) : (
            <Input
              data-testid="password"
              name="password"
              type={showPassword ? "text" : "password"}
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              
              size="md"
              startContent={<Lock size={18} className="text-slate-400" />}
              endContent={
                <button
                  type="button"
                  aria-label="Mostrar contraseña"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
          )}
          </div>

          {isSetupMode && (
            <div className="space-y-4 bg-white dark:bg-neutral-950 p-5 rounded-2xl border border-slate-200/60 dark:border-neutral-800 border border-default-200 mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos de la Empresa / Parqueadero</p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  name="companyName"
                  type="text"
                  label="Nombre del Parqueadero"
                  placeholder="Mi Parqueadero Local"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  
                  size="md"
                  startContent={<Building size={18} className="text-slate-400" />}
                />

                <Input
                  name="companyNit"
                  type="text"
                  label="NIT / Registro Tributario"
                  placeholder="900123456"
                  value={companyNit}
                  onChange={(e) => setCompanyNit(e.target.value)}
                  
                  size="md"
                  startContent={<Landmark size={18} className="text-slate-400" />}
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
            <Checkbox size="sm" className="text-slate-600">Recordarme</Checkbox>
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
          isLoading={loading}
        >
          {isSetupMode ? "Completar Configuración Inicial" : "Entrar al Sistema"}
        </Button>
        
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
          &copy; 2026 ParkFlow Operations. v2.0
        </p>
      </form>
    </main>
  );
}

