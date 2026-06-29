"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";

import { QuickSearch } from "@/features/search/components/QuickSearch";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-[var(--color-sidebar)] px-4 lg:px-8 py-4 transition-all duration-300">
      {/* Left side: Hamburger + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          data-testid="mobile-menu"
          className="md:hidden p-2 rounded-lg hover:bg-default-200 text-default-600 dark:text-default-400 dark:hover:bg-default-300 transition-colors"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-default-300/60 dark:text-default-500/40 hidden sm:block font-normal">Parkflow Desktop</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-default-200">Operación Diaria</h2>
        </div>
      </div>

      {/* Right side: Actions + Status + User */}
      <div className="flex items-center gap-2 sm:gap-4">
        <QuickSearch />
        {/* Theme toggle - hidden on smallest screens */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-default-200 dark:bg-default-700 mx-1" />

        {/* User Menu with Avatar */}
        <UserMenu />
      </div>
    </header>
  );
}
