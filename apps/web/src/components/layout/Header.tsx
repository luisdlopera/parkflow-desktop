import LocalPrintAgentStatus from "@/components/print/LocalPrintAgentStatus";
import { PrintStatusMonitor } from "@/components/print/PrintStatusMonitor";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200/70 bg-white/70 px-4 lg:px-8 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Parkflow Desktop</p>
        <h2 className="text-lg font-bold text-slate-900">Operación Diaria</h2>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        
        {/* Status indicators */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <PrintStatusMonitor />
          </div>
          <div className="flex items-center gap-3">
            <LocalPrintAgentStatus />
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600">Caja 01</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
