"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { changePassword } from "@/lib/api/auth-api";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { AuthUser } from "@parkflow/types";

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
    void (async () => {
      const { createAuthProvider } = await import("@/auth/runtime/createAuthProvider");
      const authProvider = await createAuthProvider();
      const session = await authProvider.restoreSession();
      if (!mounted) return;
      
      const authUser = session?.user || null;
      if (!authUser) {
        router.replace("/login");
        return;
      }
      if (!authUser.requirePasswordChange) {
        router.replace("/");
        return;
      }
      setUser(authUser);
      setLoading(false);
    })();
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
      await changePassword(currentPassword, newPassword);
      const { createAuthProvider } = await import("@/auth/runtime/createAuthProvider");
      const refreshedSession = await (await createAuthProvider()).refresh();
      if (refreshedSession?.user) {
        useAuthStore.getState().setUser(refreshedSession.user);
        if (refreshedSession.permissions) {
          useAuthStore.getState().setPermissions(refreshedSession.permissions);
        }
        if (refreshedSession.expiresAt) {
          useAuthStore.getState().setSessionExpiresAt(refreshedSession.expiresAt);
        }
      }
      router.push("/");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Error al cambiar la contraseña");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSkip = async () => {
    const { createAuthProvider } = await import("@/auth/runtime/createAuthProvider");
    const refreshedSession = await (await createAuthProvider()).refresh();
    if (refreshedSession?.user) {
      useAuthStore.getState().setUser(refreshedSession.user);
      if (refreshedSession.permissions) {
        useAuthStore.getState().setPermissions(refreshedSession.permissions);
      }
      if (refreshedSession.expiresAt) {
        useAuthStore.getState().setSessionExpiresAt(refreshedSession.expiresAt);
      }
    }
    router.push("/");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-default-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-default-200">
        <Card.Header className="flex flex-col items-center pb-0 pt-6">
          <h1 className="text-2xl font-bold text-foreground">Actualizar Contraseña</h1>
          <p className="text-default-500 text-sm mt-1 text-center">
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
