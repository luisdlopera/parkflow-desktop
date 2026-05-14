import LocalPrintAgentStatus from "@/components/print/LocalPrintAgentStatus";
import { PrintStatusMonitor } from "@/components/print/PrintStatusMonitor";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";

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
        {/* Theme toggle - hidden on smallest screens */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* Status indicators - stacked on mobile, row on larger screens */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <PrintStatusMonitor />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block">
              <LocalPrintAgentStatus />
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600">Caja 01</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1" />

        {/* User Menu with Avatar */}
        <UserMenu />
      </div>
    </header>
  );
}
