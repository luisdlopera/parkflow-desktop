"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { currentUser, loadSession, login } from "@/lib/auth";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";
import { FormErrorSummary } from "@/components/feedback/FormErrorSummary";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") ?? "/";
      setNextPath(next);
    }
    void (async () => {
      const session = await loadSession();
      const user = await currentUser();
      if (session && user) {
        router.replace(nextPath);
      }
    })();

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
  }, [nextPath, router]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget as HTMLFormElement);
      const emailValue = String(formData.get("email") ?? email).trim();
      const passwordValue = String(formData.get("password") ?? password);
      if (!passwordValue) {
        setError("Credenciales: Debes ingresar la contrasena.");
        setLoading(false);
        return;
      }

      await login({
        email: emailValue,
        password: passwordValue,
        deviceId,
        deviceName,
        platform,
        fingerprint,
        offlineRequestedHours: 48
      });
      router.replace(nextPath);
    } catch (err) {
      const userError = getUserErrorMessage(err, "auth.login");
      setError(`${userError.title}: ${userError.description}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <form onSubmit={onSubmit} className="surface w-full space-y-6 rounded-2xl p-8 shadow-xl border border-default-100">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1">Parkflow</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">¡Bienvenido!</h1>
          <p className="text-default-500 text-sm mt-2">Ingresa tus credenciales para continuar</p>
        </div>

        <FormErrorSummary message={error || undefined} />

        <div className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="ejemplo@parkflow.com"
            value={email}
            onValueChange={setEmail}
            variant="bordered"
            autoComplete="username"
            startContent={<Mail size={18} className="text-default-400" />}
          />

          <Input
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            name="password"
            onValueChange={setPassword}
            variant="bordered"
            autoComplete="current-password"
            startContent={<Lock size={18} className="text-default-400" />}
            endContent={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Checkbox size="sm" className="text-default-500">Recordarme</Checkbox>
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button
          type="submit"
          color="primary"
          size="lg"
          isLoading={loading}
          className="w-full font-bold shadow-lg"
        >
          {loading ? "Validando..." : "Entrar al Sistema"}
        </Button>
        
        <p className="text-center text-xs text-default-400 pt-2">
          &copy; 2026 ParkFlow Operations. v2.0
        </p>
      </form>
    </main>
  );
}

