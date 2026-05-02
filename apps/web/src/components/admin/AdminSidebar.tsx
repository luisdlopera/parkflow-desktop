"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileBadge,
  Monitor,
  BarChart3,
  Settings,
  Users,
  Receipt,
  Shield,
} from "lucide-react";
import { cn } from "@heroui/react";

const adminNavItems = [
  {
    label: "Empresas",
    href: "/admin/companies",
    icon: Building2,
  },
  {
    label: "Licencias",
    href: "/admin/licenses",
    icon: FileBadge,
  },
  {
    label: "Dispositivos",
    href: "/admin/devices",
    icon: Monitor,
  },
  {
    label: "Monitoreo",
    href: "/admin/monitoring",
    icon: BarChart3,
  },
  {
    label: "Auditoría",
    href: "/admin/audit",
    icon: Receipt,
  },
  {
    label: "Usuarios",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Configuración",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-default-50 border-r border-divider flex flex-col">
      <div className="p-4 border-b border-divider">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">Super Admin</span>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-default-100"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-divider">
        <p className="text-xs text-default-500">
          ParkFlow Licensing System v1.0
        </p>
      </div>
    </aside>
  );
}
