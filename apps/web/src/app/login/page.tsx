"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

const fallbackDeviceId = process.env.NEXT_PUBLIC_DEVICE_ID ?? "desktop-default";
const deviceName = process.env.NEXT_PUBLIC_DEVICE_NAME ?? "Caja principal";
const platform = process.env.NEXT_PUBLIC_DEVICE_PLATFORM ?? "desktop";
const fingerprint = process.env.NEXT_PUBLIC_DEVICE_FINGERPRINT ?? "local-dev";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/");

  const [email, setEmail] = useState("admin@parkflow.local");
  const [password, setPassword] = useState("password");
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
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            autoComplete="current-password"
          />
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
