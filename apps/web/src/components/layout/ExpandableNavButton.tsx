"use client";

import { ReactNode } from "react";

interface ExpandableNavButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  isActive?: boolean;
  collapsed?: boolean;
}

/**
 * Reusable expandable navigation button component
 * Used for buttons that open submenu/category views (Configuración, Administración, etc.)
 * Shared between Sidebar and MobileSidebar
 */
export function ExpandableNavButton({
  label,
  icon,
  onClick,
  isActive = false,
  collapsed = false,
}: ExpandableNavButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`Ver opciones de ${label}`}
      title={collapsed ? label : undefined}
      className={`
        w-full flex items-center rounded-xl font-medium transition-all border group cursor-pointer
        ${
          isActive
            ? "bg-brand text-default-50 border-brand-400"
            : "text-default-600 dark:text-default-300 border-transparent hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40"
        }
        ${collapsed ? "justify-center p-3" : "justify-between px-3 py-3 text-sm gap-3"}
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 flex-shrink-0 transition-colors ${
            collapsed
              ? "text-default-700 dark:text-gray-100"
              : isActive
                ? "text-default-50"
                : "text-default-600 dark:text-gray-200 group-hover:text-brand-600"
          }`}
        >
          {icon}
        </div>
        {!collapsed && <span className="truncate">{label}</span>}
      </div>
      {!collapsed && (
        <svg
          className="w-4 h-4 transition-colors text-default-400 group-hover:text-brand-600 bg-default-200 group-hover:bg-brand-200 rounded px-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </button>
  );
}
