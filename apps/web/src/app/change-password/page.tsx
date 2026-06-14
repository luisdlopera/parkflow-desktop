"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@heroui/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { currentUser, authHeaders, loadSession, saveSession } from "@/lib/auth";
import type { AuthUser } from "@parkflow/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    currentUser().then((u) => {
      if (!mounted) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      if (!u.requirePasswordChange) {
        router.replace("/");
        return;
      }
      setUser(u);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      setIsChangingPassword(true);
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        let detail = "Error al cambiar la contraseña";
        if (res.status === 400) detail = "La contraseña actual no es correcta o la nueva no cumple los requisitos";
        else if (res.status === 401) detail = "Sesión expirada. Inicia sesión nuevamente.";
        else if (body) detail = body;
        throw new Error(detail);
      }

      // Actualizar sesión para reflejar que la contraseña fue cambiada
      const session = await loadSession();
      if (session) {
        await saveSession({
          ...session,
          user: { ...session.user, requirePasswordChange: false }
        });
      }
      window.location.href = "/";
    } catch (err: any) {
      setPasswordError(err.message || "Error al cambiar la contraseña");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSkip = async () => {
    const session = await loadSession();
    if (session) {
      await saveSession({
        ...session,
        user: { ...session.user, requirePasswordChange: false }
      });
    }
    window.location.href = "/";
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-default-200">
        <Card.Header className="flex flex-col items-center pb-0 pt-6">
          <h1 className="text-2xl font-bold text-slate-800">Actualizar Contraseña</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">
            Por seguridad, debes cambiar la contraseña por defecto antes de continuar.
          </p>
        </Card.Header>
        
        <Separator className="my-4" />

        <Card.Content className="pt-0 pb-6">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Contraseña Actual"
              type="password"
              
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              isRequired
            />
            <Input
              label="Nueva Contraseña"
              type="password"
              
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              isRequired
            />
            <Input
              label="Confirmar Contraseña"
              type="password"
              
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              isRequired
            />
            
            {passwordError && (
              <div className="text-danger text-sm">{passwordError}</div>
            )}
            
            <Button 
              type="submit" 
              color="primary" 
              className="w-full"
              isLoading={isChangingPassword}
            >
              Cambiar y Continuar
            </Button>
            <div className="text-center">
              <Button
                variant="light"
                color="primary"
                className="text-sm"
                isDisabled={isChangingPassword}
                onPress={handleSkip}
              >
                Omitir por ahora
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
