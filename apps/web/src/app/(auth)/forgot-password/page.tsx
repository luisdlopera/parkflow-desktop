"use client";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestPasswordReset } from "@/lib/api/auth-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
        <div className="surface w-full space-y-4 rounded-[2rem] p-8 sm:p-10 border border-default-200 dark:border-default-200 bg-default-50 dark:bg-default-100 text-center">
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
          <h1 className="text-xl font-semibold text-foreground">Solicitud enviada</h1>
          <p className="text-sm text-default-600">
            Si el correo <strong>{email}</strong> está registrado, recibirás instrucciones para restablecer tu contraseña.
          </p>
          <p className="text-xs text-default-500">
            Revisa tu bandeja de entrada y carpetas de spam.
          </p>
          <Link href="/login" className="w-full">
            <Button
              color="primary"
              className="w-full"
            >
              Volver al inicio de sesión
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <form onSubmit={onSubmit} className="surface w-full space-y-6 rounded-[2rem] p-8 sm:p-10 border border-default-200 dark:border-default-200 bg-default-50 dark:bg-default-100">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-700/80">Parkflow</p>
          <h1 className="text-2xl font-semibold text-foreground">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-default-600">
            Ingresa tu correo electrónico y te enviaremos instrucciones.
          </p>
        </div>

        <div className="bg-default-50 dark:bg-default-100 p-5 rounded-2xl border border-default-200 dark:border-default-200 space-y-4">
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            
            placeholder="tu@email.com"
            isRequired
            autoComplete="email"
          />
        </div>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <Button
          type="submit"
          color="primary"
          isLoading={loading}
          isDisabled={!email}
          className="w-full"
        >
          {loading ? "Enviando..." : "Enviar instrucciones"}
        </Button>

        <p className="text-center text-sm text-default-600">
          ¿Recordaste tu contraseña?{" "}
          <Link href="/login" className="text-amber-700 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
