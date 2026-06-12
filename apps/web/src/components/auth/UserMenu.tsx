"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@heroui/avatar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection
} from "@heroui/dropdown";
import { clearSession, currentUser, canAccessSuperAdminPortal } from "@/lib/auth";
import type { AuthUser } from "@parkflow/types";
import { Shield } from "lucide-react";

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const u = await currentUser();
      setUser(u);
    })();
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await clearSession();
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
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
        className="bg-slate-200 text-slate-500 dark:bg-neutral-800 dark:text-neutral-300"
      />
    );
  }

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800/35 rounded-full px-2 py-1 transition-colors">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-slate-700 dark:text-neutral-200 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-neutral-400 leading-tight">{getRoleLabel(user.role)}</p>
          </div>
          <Avatar
            name={getInitials(user.name)}
            size="sm"
            className="bg-orange-500 text-white font-semibold"
          />
        </div>
      </DropdownTrigger>
      <DropdownMenu aria-label="Acciones de usuario" disabledKeys={isLoading ? ["logout"] : []}>
        <DropdownSection title={user.email} showDivider>
          <DropdownItem
            key="edit-profile"
            textValue="Editar perfil"
            description="Datos personales y contraseña"
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
            Editar perfil
          </DropdownItem>
          {user && canAccessSuperAdminPortal(user) ? (
            <DropdownItem
              key="admin"
              textValue="Panel Super Admin"
              description="Empresas, licencias y dispositivos"
              startContent={<Shield className="w-4 h-4 shrink-0" aria-hidden />}
              onPress={() => router.push("/admin")}
            >
              Panel Super Admin
            </DropdownItem>
          ) : null}
        </DropdownSection>
        <DropdownSection>
          <DropdownItem
            key="logout"
            textValue={isLoading ? "Cerrando sesión..." : "Cerrar sesión"}
            color="danger"
            description="Cerrar sesión actual"
            startContent={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
            onPress={handleLogout}
          >
            {isLoading ? "Cerrando sesión..." : "Cerrar sesión"}
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}
