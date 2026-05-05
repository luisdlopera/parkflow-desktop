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
        className="bg-slate-200 text-slate-500"
      />
    );
  }

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 rounded-full px-2 py-1 transition-colors">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-slate-700 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{getRoleLabel(user.role)}</p>
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
            key="profile"
            textValue="Mi perfil"
            description="Ver y editar tu perfil"
            startContent={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            onPress={() => router.push("/configuracion")}
          >
            Mi perfil
          </DropdownItem>
          <DropdownItem
            key="settings"
            textValue="Configuración"
            description="Configuración del sistema"
            startContent={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            onPress={() => router.push("/configuracion")}
          >
            Configuración
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
