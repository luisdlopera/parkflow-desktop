"use client";

import { useEffect, useState } from "react";
import { getLocalAgentClient, getTauriClient } from "@/lib/print/print-clients";

type State =
  | { tauri: true; label: "Tauri" }
  | { tauri: false; agent: boolean; label: "Navegador" };

export default function LocalPrintAgentStatus() {
  const [s, setS] = useState<State | null>(null);

  useEffect(() => {
    const run = async () => {
      const tauri = getTauriClient();
      if (await tauri.probe()) {
        setS({ tauri: true, label: "Tauri" });
        return;
      }
      const ok = await getLocalAgentClient().probe();
      setS({ tauri: false, agent: ok, label: "Navegador" });
    };
    void run();
    const id = setInterval(() => void run(), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!s) {
    return null;
  }
  if (s.tauri) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Impresion: app escritorio
      </span>
    );
  }
  if (s.agent) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Agente de impresion conectado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Sin agente local: la impresion usara Tauri o cola offline. Instala el Print Agent.
    </span>
  );
}
