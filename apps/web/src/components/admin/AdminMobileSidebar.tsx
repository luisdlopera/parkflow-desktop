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
  X,
} from "lucide-react";

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

interface AdminMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminMobileSidebar({ isOpen, onClose }: AdminMobileSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[280px]
          border-r border-slate-200/70 bg-white/95 backdrop-blur-xl
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-full flex-col px-4 py-6">
          {/* Header with close button */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white grid place-content-center shadow-lg shadow-indigo-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">ParkFlow</p>
                <p className="text-base font-bold text-slate-900">Super Admin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              aria-label="Cerrar menú"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Status indicator */}
          <div className="mt-6 px-2">
            <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Panel Administrativo
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-6 space-y-1 flex-1">
            {adminNavItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all
                    ${
                      isActive
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Back to operation */}
          <div className="mt-auto pt-4 px-2">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Volver a operación</span>
            </Link>
          </div>

          {/* Footer */}
          <div className="pt-4 px-2 border-t border-slate-200/70 mt-2">
            <p className="text-xs text-slate-400">
              ParkFlow Licensing System v1.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
