"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<string>("");

  useEffect(() => {
    const tokenParam = searchParams?.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const checkPasswordStrength = (pass: string): string => {
    if (pass.length < 8) return "weak";
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[@#$%^&+=!.]/.test(pass);
    
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score >= 4 && pass.length >= 10) return "strong";
    if (score >= 3) return "medium";
    return "weak";
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (passwordStrength === "weak") {
      setError("La contraseña es demasiado débil. Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "http://localhost:6011/api/v1/auth"}/password-reset/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.NEXT_PUBLIC_API_KEY ?? "dev-api-key-123",
          },
          body: JSON.stringify({ token, newPassword: password, deviceId: "web" }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Token inválido o expirado");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
        <div className="surface w-full space-y-4 rounded-2xl p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Contraseña restablecida</h1>
          <p className="text-sm text-slate-600">
            Tu contraseña ha sido actualizada exitosamente.
          </p>
          <Button
            as={Link}
            href="/login"
            color="primary"
            className="w-full"
          >
            Iniciar sesión
          </Button>
        </div>
      </main>
    );
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength === "weak") return "bg-red-500";
    if (passwordStrength === "medium") return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthWidth = () => {
    if (passwordStrength === "weak") return "w-1/3";
    if (passwordStrength === "medium") return "w-2/3";
    return "w-full";
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <form onSubmit={onSubmit} className="surface w-full space-y-4 rounded-2xl p-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-700/80">Parkflow</p>
          <h1 className="text-2xl font-semibold text-slate-900">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-slate-600">
            Ingresa tu código de recuperación y tu nueva contraseña.
          </p>
        </div>

        <Input
          label="Código de recuperación"
          value={token}
          onValueChange={setToken}
          variant="flat"
          placeholder="Ingresa el código"
          isRequired
        />

        <div>
          <Input
            label="Nueva contraseña"
            type={showPassword ? "text" : "password"}
            value={password}
            onValueChange={handlePasswordChange}
            variant="flat"
            placeholder="Mínimo 8 caracteres"
            isRequired
            endContent={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            }
          />
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className={`h-full transition-all duration-300 ${getPasswordStrengthColor()} ${getPasswordStrengthWidth()}`} />
              </div>
              <span className="text-xs text-slate-500 capitalize">{passwordStrength}</span>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Debe contener: mayúscula, minúscula, número y carácter especial (@#$%^&+=!.)
          </p>
        </div>

        <div>
          <Input
            label="Confirmar contraseña"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onValueChange={setConfirmPassword}
            variant="flat"
            placeholder="Repite la contraseña"
            isRequired
            isInvalid={confirmPassword.length > 0 && password !== confirmPassword}
            errorMessage={confirmPassword.length > 0 && password !== confirmPassword ? "Las contraseñas no coinciden" : undefined}
            endContent={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            }
          />
        </div>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <Button
          type="submit"
          color="primary"
          isLoading={loading}
          isDisabled={!token || !password || password !== confirmPassword || passwordStrength === "weak"}
          className="w-full"
        >
          {loading ? "Restableciendo..." : "Restablecer contraseña"}
        </Button>

        <p className="text-center text-sm text-slate-600">
          ¿No tienes código?{" "}
          <Link href="/forgot-password" className="text-amber-700 hover:underline">
            Solicitar uno nuevo
          </Link>
        </p>
      </form>
    </main>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <div className="surface w-full rounded-2xl p-6 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"></div>
        <p className="mt-4 text-sm text-slate-600">Cargando...</p>
      </div>
    </main>
  );
}

// Page component wrapped in Suspense for useSearchParams
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
