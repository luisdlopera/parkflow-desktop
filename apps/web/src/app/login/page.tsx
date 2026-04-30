"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";

const fallbackDeviceId = process.env.NEXT_PUBLIC_DEVICE_ID ?? "desktop-default";
const deviceName = process.env.NEXT_PUBLIC_DEVICE_NAME ?? "Caja principal";
const platform = process.env.NEXT_PUBLIC_DEVICE_PLATFORM ?? "desktop";
const fingerprint = process.env.NEXT_PUBLIC_DEVICE_FINGERPRINT ?? "local-dev";

// Eye icons for password visibility toggle
const EyeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/");

  const [email, setEmail] = useState("admin@parkflow.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deviceId, setDeviceId] = useState(fallbackDeviceId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") ?? "/";
      setNextPath(next);
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
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({
        email,
        password,
        deviceId,
        deviceName,
        platform,
        fingerprint,
        offlineRequestedHours: 48
      });
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <form onSubmit={onSubmit} className="surface w-full space-y-4 rounded-2xl p-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-700/80">Parkflow</p>
          <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesion</h1>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Contrasena</label>
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm"
              autoComplete="current-password"
              placeholder="Ingrese su contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="rounded border-slate-300" />
            Recordarme
          </label>
          <Link href="/forgot-password" className="text-sm text-amber-700 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
        >
          {loading ? "Validando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
