"use client";
import { DropdownSection } from "@/components/bridge/Dropdown";
import { DropdownTrigger } from "@/components/bridge/Dropdown";
import { Dropdown } from "@/components/bridge/Dropdown";
import { Avatar } from "@/components/bridge/Avatar";
import { DropdownMenu } from "@/components/bridge/Dropdown";
import { DropdownItem } from "@/components/bridge/Dropdown";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthProvider } from "@/auth/runtime/createAuthProvider";
import { broadcastAuthEvent } from "@/hooks/auth/useAuthBroadcast";
import { canAccessSuperAdminPortal } from "@/lib/services/auth-domain.service";
import { Shield } from "lucide-react";
import { Modal } from "@/components/bridge/Modal";
import { Button } from "@/components/bridge/Button";
import { useAuthStore } from "@/lib/stores/auth.store";
import { safeStorage } from "@/lib/utils/storage";

export function UserMenu() {
  const router = useRouter();
  const { user: storeUser, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [logoutType, setLogoutType] = useState<"single" | "all" | null>(null);
  const user = storeUser;

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await (await createAuthProvider()).logout();
      storeLogout();
      broadcastAuthEvent({ type: "auth:logout" });
      setShowConfirmLogout(false);
      safeStorage.setItem("parkflow_just_logged_out", "true");
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setIsLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setIsLoading(true);
    try {
      await (await createAuthProvider()).logoutAll();
      storeLogout();
      broadcastAuthEvent({ type: "auth:logout" });
      setShowConfirmLogout(false);
      safeStorage.setItem("parkflow_just_logged_out", "true");
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar todas las sesiones:", error);
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      SUPER_ADMIN: "Super Admin",
      ADMIN: "Administrador",
      CAJERO: "Cajero",
      OPERADOR: "Operador",
      AUDITOR: "Auditor"
    };
    return roles[role] || role;
  };

  if (!user) {
    return (
      <Avatar
        name="?"
        size="sm"
        className="bg-default-200 text-default-500 dark:bg-neutral-800 dark:text-neutral-300"
      />
    );
  }

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-default-100 dark:hover:bg-neutral-800/35 rounded-full px-2 py-1 transition-colors">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-default-700 dark:text-neutral-200 leading-tight">{user.name}</p>
            <p className="text-[10px] text-default-500 dark:text-neutral-400 leading-tight">{getRoleLabel(user.role)}</p>
          </div>
          <Avatar
            name={getInitials(user.name)}
            size="sm"
            className="bg-brand-500 text-default-50 font-semibold"
          />
        </div>
      </DropdownTrigger>
      <DropdownMenu aria-label="Acciones de usuario" disabledKeys={isLoading ? ["logout"] : []}>
        <DropdownSection title={user.email} showDivider>
          <DropdownItem
            key="edit-profile"
            textValue="Editar perfil"
            className="!outline-none !focus-visible:outline-none data-[hover]:bg-default-50 dark:data-[hover]:bg-default-900/20 data-[hover]:text-default-foreground"
            startContent={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            }
            onPress={() => router.push("/perfil")}
          >
            <div className="flex flex-col">
              <span className="font-medium">Editar perfil</span>
              <span className="text-xs text-default-400">Datos personales y contraseña</span>
            </div>
          </DropdownItem>
          {user && canAccessSuperAdminPortal(user as any) ? (
            <DropdownItem
              key="admin"
              textValue="Panel Super Admin"
              className="!outline-none !focus-visible:outline-none data-[hover]:bg-default-50 dark:data-[hover]:bg-default-900/20 data-[hover]:text-default-foreground"
              startContent={<Shield className="w-4 h-4 shrink-0" aria-hidden />}
              onPress={() => router.push("/admin")}
            >
              <div className="flex flex-col">
                <span className="font-medium">Panel Super Admin</span>
                <span className="text-xs text-default-400">Empresas, licencias y dispositivos</span>
              </div>
            </DropdownItem>
          ) : null}
        </DropdownSection>
        <DropdownSection>
          <DropdownItem
            key="logout"
            textValue={isLoading ? "Cerrando sesión..." : "Cerrar sesión"}
            color="danger"
            startContent={
              <svg className="w-4 h-4 text-danger shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
            className="outline-none focus-visible:outline-none text-danger data-[hover]:bg-danger-50 data-[hover]:text-danger-700"
            onPress={() => {
              setLogoutType("single");
              setShowConfirmLogout(true);
            }}
          >
            <div className="flex flex-col">
              <span className="font-medium">{isLoading ? "Cerrando sesión..." : "Cerrar sesión"}</span>
              <span className="text-xs text-danger-400">Salir de tu cuenta de forma segura</span>
            </div>
          </DropdownItem>
          <DropdownItem
            key="logout-all"
            textValue={isLoading ? "Cerrando sesiones..." : "Cerrar todas las sesiones"}
            color="danger"
            startContent={
              <svg className="w-4 h-4 text-danger shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            className="outline-none focus-visible:outline-none text-danger data-[hover]:bg-danger-50 data-[hover]:text-danger-700"
            onPress={() => {
              setLogoutType("all");
              setShowConfirmLogout(true);
            }}
          >
            <div className="flex flex-col">
              <span className="font-medium">{isLoading ? "Cerrando sesiones..." : "Cerrar todas las sesiones"}</span>
              <span className="text-xs text-danger-400">Cerrar sesión en todos los dispositivos</span>
            </div>
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>

      <Modal state={{ isOpen: showConfirmLogout, setOpen: setShowConfirmLogout, open: () => {}, close: () => setShowConfirmLogout(false), toggle: () => {} }}>
        <Modal.Content>
          <Modal.Header>Cerrar Sesión</Modal.Header>
          <Modal.Body>
            <p className="text-default-600 text-sm">
              {logoutType === "all"
                ? "¿Estás seguro de que deseas cerrar todas las sesiones activas en todos los dispositivos?"
                : "¿Estás seguro de que deseas cerrar tu sesión actual?"}
            </p>
          </Modal.Body>
          <Modal.Footer className="flex gap-2">
            <Button variant="ghost" onPress={() => setShowConfirmLogout(false)}>
              Cancelar
            </Button>
            <Button
              color="danger"
              onPress={async () => {
                setShowConfirmLogout(false);
                if (logoutType === "all") {
                  await handleLogoutAll();
                } else {
                  await handleLogout();
                }
              }}
              isLoading={isLoading}
            >
              Confirmar
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </Dropdown>
  );
}
