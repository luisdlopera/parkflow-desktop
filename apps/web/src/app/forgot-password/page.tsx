"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";

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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "http://localhost:6011/api/v1/auth"}/password-reset/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.NEXT_PUBLIC_API_KEY ?? "dev-api-key-123",
          },
          body: JSON.stringify({ email, deviceId: "web" }),
        }
      );

      if (response.status === 429) {
        throw new Error("Demasiados intentos. Por favor espere antes de solicitar un nuevo código.");
      }

      // Always show success (prevent email enumeration)
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
          <h1 className="text-xl font-semibold text-slate-900">Solicitud enviada</h1>
          <p className="text-sm text-slate-600">
            Si el correo <strong>{email}</strong> está registrado, recibirás instrucciones para restablecer tu contraseña.
          </p>
          <p className="text-xs text-slate-500">
            Revisa tu bandeja de entrada y carpetas de spam.
          </p>
          <Button
            as={Link}
            href="/login"
            color="primary"
            className="w-full"
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <form onSubmit={onSubmit} className="surface w-full space-y-4 rounded-2xl p-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-700/80">Parkflow</p>
          <h1 className="text-2xl font-semibold text-slate-900">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-slate-600">
            Ingresa tu correo electrónico y te enviaremos instrucciones.
          </p>
        </div>

        <Input
          type="email"
          label="Email"
          value={email}
          onValueChange={setEmail}
          variant="flat"
          placeholder="tu@email.com"
          isRequired
          autoComplete="email"
        />

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

        <p className="text-center text-sm text-slate-600">
          ¿Recordaste tu contraseña?{" "}
          <Link href="/login" className="text-amber-700 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
