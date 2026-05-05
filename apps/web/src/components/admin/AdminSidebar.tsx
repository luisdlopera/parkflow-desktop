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
  ChevronsLeft,
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

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AdminSidebar({ collapsed = false, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        hidden md:flex h-screen border-r border-slate-200/70 bg-white/60 backdrop-blur
        flex-col transition-all duration-300 ease-in-out
        ${collapsed ? "w-[72px] px-2" : "w-[260px] px-4"}
      `}
    >
      {/* Logo section with toggle */}
      <div
        className={`
          flex items-center gap-3 px-2 transition-all duration-300
          ${collapsed ? "py-6 justify-center" : "py-6"}
        `}
      >
        <div
          className={`
            rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white grid place-content-center font-bold shadow-lg shadow-indigo-500/30
            ${collapsed ? "h-10 w-10 text-lg" : "h-12 w-12 text-xl"}
          `}
        >
          <Shield className={collapsed ? "w-5 h-5" : "w-6 h-6"} />
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ParkFlow</p>
            <p className="text-lg font-bold text-slate-900">Super Admin</p>
          </div>
        )}
        {/* Toggle button (visible when expanded) */}
        <button
          onClick={onToggle}
          className={`
            p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all
            ${collapsed ? "hidden" : "flex"}
          `}
          aria-label="Colapsar sidebar"
          title="Colapsar sidebar"
        >
          <ChevronsLeft className="w-5 h-5 transition-transform duration-300" />
        </button>
      </div>

      {/* Toggle button (visible when collapsed) */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="w-full flex justify-center p-2 mb-4 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
          aria-label="Expandir sidebar"
          title="Expandir sidebar"
        >
          <ChevronsLeft className="w-5 h-5 transition-transform duration-300 rotate-180" />
        </button>
      )}

      {/* Status indicator */}
      <div
        className={`
          mt-2 transition-all duration-300
          ${collapsed ? "px-1" : "px-2"}
        `}
      >
        <div
          className={`
            flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg
            ${collapsed ? "justify-center px-2 py-3" : "px-3 py-2"}
          `}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse flex-shrink-0" />
          {!collapsed && <span>Panel Administrativo</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={`
          mt-6 space-y-1 flex-1
          ${collapsed ? "px-1" : ""}
        `}
      >
        {adminNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center rounded-xl font-medium transition-all
                ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
                ${
                  collapsed
                    ? "justify-center p-3"
                    : "px-3 py-3 text-sm gap-3"
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Back to operation */}
      <div className={`mt-auto pt-4 ${collapsed ? "px-1" : "px-2"}`}>
        <Link
          href="/"
          className={`
            flex items-center rounded-xl font-medium text-sm transition-all
            text-slate-500 hover:bg-orange-50 hover:text-orange-600
            ${collapsed ? "justify-center p-3" : "px-3 py-3 gap-3"}
          `}
          title={collapsed ? "Volver a operación" : undefined}
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
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
          {!collapsed && <span>Volver a operación</span>}
        </Link>
      </div>

      {/* Footer */}
      <div
        className={`
          py-4 border-t border-slate-200/70 mt-2
          ${collapsed ? "px-1 text-center" : "px-2"}
        `}
      >
        {collapsed ? (
          <p className="text-[9px] text-slate-400 leading-tight">v1.0</p>
        ) : (
          <p className="text-xs text-slate-400">ParkFlow Licensing System v1.0</p>
        )}
      </div>
    </aside>
  );
}
