"use client";
import { Separator } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword, fetchProfile, updateProfile, type UserProfile } from "@/lib/profile-api";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { useAsyncAction } from "@/lib/errors/use-async-action";
import { clearSession } from "@/features/auth/services/auth-storage.service";
import { patchSessionUser } from "@/features/auth/services/auth-domain.service";
import type { UserRole } from "@/lib/types/settings.types";
import { PageBackButton } from "@/components/layout/PageBackButton";

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN: "Administrador",
  CAJERO: "Cajero",
  OPERADOR: "Operador",
  AUDITOR: "Auditor"
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [site, setSite] = useState("");
  const [terminal, setTerminal] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const saveProfile = useAsyncAction<UserProfile>({
    showErrorToast: false,
    errorContext: FrontendActionError.SAVE_DATA,
    onSuccess: (updated) => {
      applyProfile(updated);
      void patchSessionUser({ name: updated.name, email: updated.email });
      setMessage({ kind: "ok", text: "Perfil actualizado correctamente" });
    },
  });

  const changePass = useAsyncAction<void>({
    showErrorToast: false,
    errorContext: FrontendActionError.SAVE_DATA,
    onSuccess: async () => {
      await clearSession();
      router.push("/login?reason=password-changed");
    },
  });

  const applyProfile = useCallback((data: UserProfile) => {
    setProfile(data);
    setName(data.name);
    setEmail(data.email);
    setDocument(data.document ?? "");
    setPhone(data.phone ?? "");
    setSite(data.site ?? "");
    setTerminal(data.terminal ?? "");
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setMessage(null);
      try {
        applyProfile(await fetchProfile());
      } catch (e) {
        setMessage({
          kind: "err",
          text: getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA)
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [applyProfile]);

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      setMessage({ kind: "err", text: "Nombre y correo son obligatorios" });
      return;
    }
    setMessage(null);
    await saveProfile.run(() =>
      updateProfile({
        name: name.trim(),
        email: email.trim(),
        document: document.trim() || null,
        phone: phone.trim() || null,
        site: site.trim() || null,
        terminal: terminal.trim() || null,
      })
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setMessage({ kind: "err", text: "Complete la contraseña actual y la nueva" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ kind: "err", text: "La confirmación de contraseña no coincide" });
      return;
    }
    setMessage(null);
    await changePass.run(() => changePassword(currentPassword, newPassword));
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando perfil…</p>;
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Editar perfil</h1>
        <p className="text-sm text-danger">{message?.text ?? "No se pudo cargar el perfil"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <PageBackButton />
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Cuenta</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-neutral-100">
            Editar perfil
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
            Actualice sus datos personales y credenciales de acceso.
          </p>
        </div>
      </div>

      {(message || saveProfile.error || changePass.error) ? (
        <p
          className={`text-sm rounded-lg px-4 py-3 ${
            message?.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {message?.text ?? saveProfile.error ?? changePass.error}
        </p>
      ) : null}

      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-slate-900">Datos personales</h2>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre completo"
              
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
            />
            <Input
              label="Correo electrónico"
              type="email"
              
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
            />
            <Input
              label="Documento"
              
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="Opcional"
            />
            <Input
              label="Teléfono"
              
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Opcional"
            />
            <Input
              label="Sede"
              
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Opcional"
            />
            <Input
              label="Terminal"
              
              value={terminal}
              onChange={(e) => setTerminal(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="flex justify-end">
            <Button color="primary" isLoading={saveProfile.isLoading} onPress={() => void handleSaveProfile()}>
              Guardar cambios
            </Button>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-slate-900">Información de la cuenta</h2>
          <p className="text-sm text-slate-500">Solo lectura — gestionada por un administrador</p>
        </Card.Header>
        <Card.Content>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-slate-500">Rol</dt>
              <dd className="font-medium text-slate-900">{ROLE_LABELS[profile.role]}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Estado</dt>
              <dd className="font-medium text-slate-900">{profile.active ? "Activo" : "Inactivo"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Último acceso</dt>
              <dd className="font-medium text-slate-900">{formatDate(profile.lastAccessAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Contraseña actualizada</dt>
              <dd className="font-medium text-slate-900">{formatDate(profile.passwordChangedAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Puede anular tickets</dt>
              <dd className="font-medium text-slate-900">{profile.canVoidTickets ? "Sí" : "No"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Puede reimprimir tickets</dt>
              <dd className="font-medium text-slate-900">{profile.canReprintTickets ? "Sí" : "No"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Puede cerrar caja</dt>
              <dd className="font-medium text-slate-900">{profile.canCloseCash ? "Sí" : "No"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Cambio de contraseña obligatorio</dt>
              <dd className="font-medium text-slate-900">
                {profile.requirePasswordChange ? "Sí" : "No"}
              </dd>
            </div>
          </dl>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-slate-900">Cambiar contraseña</h2>
          <p className="text-sm text-slate-500">
            Al cambiar la contraseña se cerrarán todas las sesiones activas.
          </p>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Contraseña actual"
              type="password"
              
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <div className="hidden md:block" />
            <Input
              label="Nueva contraseña"
              type="password"
              
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              description="Mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial"
            />
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              color="warning"
              variant="tertiary"
              isLoading={changePass.isLoading}
              onPress={() => void handleChangePassword()}
            >
              Cambiar contraseña
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
