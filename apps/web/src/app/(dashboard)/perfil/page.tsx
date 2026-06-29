"use client";

import { Separator } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { Alert } from "@/components/bridge/Alert";
import { Chip } from "@/components/bridge/Chip";
import { Tabs, Tab } from "@/components/bridge/Tabs";
import { Skeleton } from "@/components/bridge/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  changePassword,
  fetchProfile,
  updateProfile,
  type UserProfile,
} from "@/lib/api/profile.api";
import {
  getUserFriendlyErrorMessage,
  FrontendActionError,
} from "@/lib/errors/error-messages";
import { useAsyncAction } from "@/lib/errors/use-async-action";
import { clearSession } from "@/lib/services/auth-storage.service";
import { patchSessionUser } from "@/lib/services/auth-domain.service";
import type { UserRole } from "@/lib/types/settings.types";
import { PageBackButton } from "@/components/layout/PageBackButton";
import {
  User,
  Mail,
  FileText,
  Phone,
  MapPin,
  Monitor,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Laptop,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
} from "lucide-react";

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN: "Administrador",
  CAJERO: "Cajero",
  OPERADOR: "Operador",
  AUDITOR: "Auditor",
  SUPPORT: "Soporte",
};

const ROLE_COLORS: Record<UserRole, "default" | "success" | "warning" | "danger"> = {
  SUPER_ADMIN: "danger",
  ADMIN: "warning",
  CAJERO: "default",
  OPERADOR: "default",
  AUDITOR: "default",
  SUPPORT: "default",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Skeleton Loading ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-lg" />
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-3 w-64 rounded-lg" />
        </div>
      </div>
      {/* Tabs skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />
      {/* Form skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Permission Row ───────────────────────────────────────────────────────────

function PermissionRow({
  label,
  granted,
}: {
  label: string;
  granted: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-default-100 last:border-0">
      <span className="text-sm text-default-600">{label}</span>
      {granted ? (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Permitido
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-default-400">
          <XCircle className="w-4 h-4" />
          No permitido
        </span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("datos");

  // Personal data fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [site, setSite] = useState("");
  const [terminal, setTerminal] = useState("");

  // Profile section feedback
  const [profileMessage, setProfileMessage] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  // Password section feedback
  const [passwordMessage, setPasswordMessage] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password visibility toggles (independent per field)
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const saveProfile = useAsyncAction<UserProfile>({
    showErrorToast: false,
    errorContext: FrontendActionError.SAVE_DATA,
    onSuccess: (updated) => {
      applyProfile(updated);
      void patchSessionUser({ name: updated.name, email: updated.email });
      setProfileMessage({ kind: "ok", text: "Perfil actualizado correctamente" });
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
      setLoadError(null);
      try {
        applyProfile(await fetchProfile());
      } catch (e) {
        setLoadError(
          getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA)
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [applyProfile]);

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      setProfileMessage({ kind: "err", text: "Nombre y correo son obligatorios" });
      return;
    }
    setProfileMessage(null);
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
    if (saveProfile.error) {
      setProfileMessage({ kind: "err", text: saveProfile.error });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordMessage({
        kind: "err",
        text: "Complete la contraseña actual y la nueva",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        kind: "err",
        text: "La confirmación de contraseña no coincide",
      });
      return;
    }
    setPasswordMessage(null);
    await changePass.run(() => changePassword(currentPassword, newPassword));
    if (changePass.error) {
      setPasswordMessage({ kind: "err", text: changePass.error });
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <PageBackButton />
        </div>
        <ProfileSkeleton />
      </div>
    );
  }

  // ─── Load Error ─────────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <PageBackButton />
          <h1 className="text-2xl font-semibold text-foreground">Editar perfil</h1>
        </div>
        <Alert color="danger" title="No se pudo cargar el perfil">
          {loadError ?? "Error desconocido al cargar el perfil."}
        </Alert>
      </div>
    );
  }

  const initials = getUserInitials(profile.name);

  // ─── Main Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start gap-4">
        <PageBackButton />

        <div className="flex items-center gap-4 flex-1">
          {/* Avatar */}
          <div
            className="h-14 w-14 rounded-2xl bg-brand text-default-50 grid place-content-center font-bold text-lg border border-default-200 flex-shrink-0 select-none"
            aria-hidden="true"
          >
            {initials || <User className="w-6 h-6" />}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-700/80 font-semibold">
              Cuenta
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground dark:text-neutral-100">
              {profile.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Chip
                color={ROLE_COLORS[profile.role]}
                size="sm"
              >
                {ROLE_LABELS[profile.role]}
              </Chip>
              <Chip
                color={profile.active ? "success" : "danger"}
                size="sm"
              >
                {profile.active ? "Activo" : "Inactivo"}
              </Chip>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key))}
        aria-label="Secciones del perfil"
        defaultSelectedKey="datos"
      >
        {/* ───────────── TAB 1: Datos personales ───────────── */}
        <Tab tabKey="datos" title="Datos personales">
          <div className="space-y-4 pt-4">
            {/* Error / Success inline */}
            {(profileMessage || saveProfile.error) && (
              <Alert
                color={profileMessage?.kind === "ok" ? "success" : "danger"}
                title={
                  profileMessage?.kind === "ok"
                    ? "¡Perfil actualizado!"
                    : "Error al guardar"
                }
              >
                {profileMessage?.text ?? saveProfile.error}
              </Alert>
            )}

            <Card>
              <Card.Header>
                <h2 className="text-base font-semibold text-foreground">
                  Datos personales
                </h2>
                <p className="text-sm text-default-500">
                  Actualice su información de contacto y datos de identificación.
                </p>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Nombre completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    isRequired
                    startContent={<User className="w-4 h-4 text-default-400" />}
                  />
                  <Input
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    isRequired
                    startContent={<Mail className="w-4 h-4 text-default-400" />}
                  />
                  <Input
                    label="Documento"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="Opcional"
                    startContent={<FileText className="w-4 h-4 text-default-400" />}
                  />
                  <Input
                    label="Teléfono"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Opcional"
                    startContent={<Phone className="w-4 h-4 text-default-400" />}
                  />
                  <Input
                    label="Sede"
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    placeholder="Opcional"
                    startContent={<MapPin className="w-4 h-4 text-default-400" />}
                  />
                  <Input
                    label="Terminal"
                    value={terminal}
                    onChange={(e) => setTerminal(e.target.value)}
                    placeholder="Opcional"
                    startContent={<Monitor className="w-4 h-4 text-default-400" />}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    color="primary"
                    isLoading={saveProfile.isLoading}
                    onPress={() => void handleSaveProfile()}
                  >
                    Guardar cambios
                  </Button>
                </div>
              </Card.Content>
            </Card>
          </div>
        </Tab>

        {/* ───────────── TAB 2: Cuenta ───────────── */}
        <Tab key="cuenta" title="Cuenta">
          <div className="space-y-4 pt-4">
            <Card>
              <Card.Header>
                <h2 className="text-base font-semibold text-foreground">
                  Información de la cuenta
                </h2>
                <p className="text-sm text-default-500">
                  Solo lectura — gestionada por un administrador.
                </p>
              </Card.Header>
              <Card.Content className="space-y-2">
                {/* Estado y rol */}
                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-default-400 uppercase tracking-wide">
                      Rol
                    </p>
                    <Chip color={ROLE_COLORS[profile.role]}>
                      {ROLE_LABELS[profile.role]}
                    </Chip>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-default-400 uppercase tracking-wide">
                      Estado
                    </p>
                    <Chip
                      color={profile.active ? "success" : "danger"}
                    >
                      {profile.active ? "Activo" : "Inactivo"}
                    </Chip>
                  </div>
                </div>

                <Separator />

                {/* Fechas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-default-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-default-400">Último acceso</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(profile.lastAccessAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <KeyRound className="w-4 h-4 text-default-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-default-400">
                        Contraseña actualizada
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(profile.passwordChangedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Permisos */}
                <div className="py-2">
                  <p className="text-xs font-medium text-default-400 uppercase tracking-wide mb-3">
                    Permisos
                  </p>
                  <PermissionRow
                    label="Puede anular tickets"
                    granted={profile.canVoidTickets}
                  />
                  <PermissionRow
                    label="Puede reimprimir tickets"
                    granted={profile.canReprintTickets}
                  />
                  <PermissionRow
                    label="Puede cerrar caja"
                    granted={profile.canCloseCash}
                  />
                  <PermissionRow
                    label="Cambio de contraseña obligatorio"
                    granted={profile.requirePasswordChange}
                  />
                </div>
              </Card.Content>
            </Card>
          </div>
        </Tab>

        {/* ───────────── TAB 3: Seguridad ───────────── */}
        <Tab key="seguridad" title="Seguridad">
          <div className="space-y-4 pt-4">
            {/* Error / Success inline */}
            {(passwordMessage || changePass.error) && (
              <Alert
                color={passwordMessage?.kind === "ok" ? "success" : "danger"}
                title={
                  passwordMessage?.kind === "ok"
                    ? "¡Contraseña actualizada!"
                    : "Error al cambiar la contraseña"
                }
              >
                {passwordMessage?.text ?? changePass.error}
              </Alert>
            )}

            {/* Cambiar contraseña */}
            <Card>
              <Card.Header>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-default-500" />
                  <h2 className="text-base font-semibold text-foreground">
                    Cambiar contraseña
                  </h2>
                </div>
                <p className="text-sm text-default-500">
                  Al cambiar la contraseña se cerrarán todas las sesiones activas.
                </p>
              </Card.Header>
              <Card.Content className="space-y-4">
                {/* Contraseña actual — ocupa el ancho completo */}
                <Input
                  label="Contraseña actual"
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  startContent={<Lock className="w-4 h-4 text-default-400" />}
                  endContent={
                    <button
                      type="button"
                      aria-label={
                        showCurrentPass
                          ? "Ocultar contraseña actual"
                          : "Mostrar contraseña actual"
                      }
                      onClick={() => setShowCurrentPass((v) => !v)}
                      className="text-xs font-semibold text-default-400 hover:text-default-600 dark:text-default-500 dark:hover:text-default-300 transition-colors focus:outline-none flex items-center gap-1"
                      tabIndex={-1}
                    >
                      {showCurrentPass ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {showCurrentPass ? "Ocultar" : "Mostrar"}
                      </span>
                    </button>
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Nueva contraseña"
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    description="Mín. 8 caracteres, mayúscula, minúscula, número y carácter especial"
                    startContent={<Lock className="w-4 h-4 text-default-400" />}
                    endContent={
                      <button
                        type="button"
                        aria-label={
                          showNewPass
                            ? "Ocultar nueva contraseña"
                            : "Mostrar nueva contraseña"
                        }
                        onClick={() => setShowNewPass((v) => !v)}
                        className="text-xs font-semibold text-default-400 hover:text-default-600 dark:text-default-500 dark:hover:text-default-300 transition-colors focus:outline-none flex items-center gap-1"
                        tabIndex={-1}
                      >
                        {showNewPass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                          {showNewPass ? "Ocultar" : "Mostrar"}
                        </span>
                      </button>
                    }
                  />
                  <Input
                    label="Confirmar nueva contraseña"
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    startContent={<Lock className="w-4 h-4 text-default-400" />}
                    endContent={
                      <button
                        type="button"
                        aria-label={
                          showConfirmPass
                            ? "Ocultar confirmación de contraseña"
                            : "Mostrar confirmación de contraseña"
                        }
                        onClick={() => setShowConfirmPass((v) => !v)}
                        className="text-xs font-semibold text-default-400 hover:text-default-600 dark:text-default-500 dark:hover:text-default-300 transition-colors focus:outline-none flex items-center gap-1"
                        tabIndex={-1}
                      >
                        {showConfirmPass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                          {showConfirmPass ? "Ocultar" : "Mostrar"}
                        </span>
                      </button>
                    }
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

            {/* Sesiones y dispositivos */}
            <Card>
              <Card.Header>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-default-500" />
                  <h2 className="text-base font-semibold text-foreground">
                    Sesiones y dispositivos
                  </h2>
                </div>
                <p className="text-sm text-default-500">
                  Administra los equipos autorizados que tienen acceso a tu cuenta.
                </p>
              </Card.Header>
              <Card.Content className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-start gap-3">
                  <Laptop className="w-5 h-5 text-default-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-default-600 dark:text-neutral-400">
                    Puedes revocar el acceso a dispositivos antiguos o desconocidos
                    para proteger tu cuenta.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  color="primary"
                  onPress={() => router.push("/perfil/dispositivos")}
                  className="flex-shrink-0"
                >
                  Gestionar dispositivos
                </Button>
              </Card.Content>
            </Card>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
