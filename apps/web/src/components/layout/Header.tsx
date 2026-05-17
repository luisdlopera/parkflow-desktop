"use client";

import { useRouter } from "next/navigation";
import { Input } from "@heroui/input";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import { useState } from "react";

import { QuickSearch } from "@/modules/search/components/QuickSearch";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-950/65 px-4 lg:px-8 py-4 backdrop-blur">
      {/* Left side: Hamburger + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          data-testid="mobile-menu"
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 hidden sm:block">Parkflow Desktop</p>
          <h2 className="text-lg font-bold text-slate-900">Operación Diaria</h2>
        </div>
      </div>

      {/* Right side: Actions + Status + User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Buscador general */}
        <div className="hidden md:block w-96">
          <QuickSearch />
        </div>
        {/* Theme toggle - hidden on smallest screens */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1" />

        {/* User Menu with Avatar */}
        <UserMenu />
      </div>
    </header>
  );
}
