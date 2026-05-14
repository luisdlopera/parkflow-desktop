"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import { Shield } from "lucide-react";

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-950/65 px-4 lg:px-8 py-4 backdrop-blur">
      {/* Left side: Hamburger + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800/35 text-slate-600 dark:text-neutral-300 transition-colors"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-sm shadow-indigo-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 hidden sm:block">ParkFlow Admin</p>
            <h2 className="text-lg font-bold text-slate-900">Panel de Administración</h2>
          </div>
        </div>
      </div>

      {/* Right side: Theme toggle + User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Admin badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-xs font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span>Super Admin</span>
        </div>

        {/* Theme toggle */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-neutral-800 mx-1" />

        {/* User Menu with Avatar */}
        <UserMenu />
      </div>
    </header>
  );
}
