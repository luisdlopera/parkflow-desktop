import LocalPrintAgentStatus from "@/components/print/LocalPrintAgentStatus";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200/70 bg-white/70 px-8 py-4 backdrop-blur">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Parkflow</p>
        <h2 className="text-lg font-semibold text-slate-900">Operacion diaria</h2>
      </div>
      <div className="text-right">
        <LocalPrintAgentStatus />
        <p className="mt-1 text-xs text-slate-500">Windows desktop</p>
        <p className="text-sm font-medium text-slate-700">Caja 01</p>
      </div>
    </header>
  );
}
