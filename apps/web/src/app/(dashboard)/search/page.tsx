"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowRight, Car, Search, Ticket, User, Building2, Loader2 } from "lucide-react";
import { useSearch } from "@/modules/search/hooks/useSearch";
import type { SearchResult, SearchType } from "@/modules/search/types/search.types";

const RECENT_KEY = "parkflow.search.recent";

const TYPE_META: Record<SearchType, { label: string; icon: ReactNode }> = {
  VEHICLE: { label: "Vehículos", icon: <Car className="h-4 w-4" /> },
  TICKET: { label: "Tickets", icon: <Ticket className="h-4 w-4" /> },
  CLIENT: { label: "Clientes", icon: <Building2 className="h-4 w-4" /> },
  USER: { label: "Usuarios", icon: <User className="h-4 w-4" /> },
  INVOICE: { label: "Facturas", icon: <Building2 className="h-4 w-4" /> },
  RESERVATION: { label: "Reservas", icon: <Building2 className="h-4 w-4" /> },
  PAYMENT: { label: "Pagos", icon: <Building2 className="h-4 w-4" /> },
  INCIDENT: { label: "Incidentes", icon: <Building2 className="h-4 w-4" /> },
  ACTION: { label: "Acciones", icon: <Building2 className="h-4 w-4" /> },
};

function saveRecentSearch(query: string) {
  if (typeof window === "undefined") return;
  const clean = query.trim();
  if (!clean) return;
  const stored = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  const next = [clean, ...stored.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function ResultCard({ result, onSelect }: { result: SearchResult; onSelect: (result: SearchResult) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950/50 dark:hover:border-orange-900/50"
    >
      <div className="rounded-2xl bg-orange-50 p-3 text-orange-600 dark:bg-orange-950/20">
        {TYPE_META[result.type]?.icon ?? <Search className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{result.title}</p>
          {String(result.metadata?.status ?? "").toUpperCase() === "ACTIVE" ? <Chip size="sm" color="success" variant="soft">Activo</Chip> : null}
        </div>
        <p className="truncate text-xs text-slate-500 dark:text-neutral-400">{result.subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400" />
    </button>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const queryParam = params?.get("q") ?? "";
  const scopeParam = params?.get("scope") ?? undefined;
  const [query, setQuery] = useState(queryParam);
  const [scope, setScope] = useState<string | undefined>(scopeParam);
  const { results, isLoading } = useSearch(query, scope);

  useEffect(() => {
    const nextQuery = params?.get("q") ?? "";
    const nextScope = params?.get("scope") ?? undefined;
    setQuery(nextQuery);
    setScope(nextScope);
  }, [params]);

  useEffect(() => {
    if (query.trim().length >= 2) {
      saveRecentSearch(query);
    }
  }, [query]);

  const grouped = results?.results ?? {};
  const groupedEntries = Object.entries(grouped) as Array<[SearchType, SearchResult[]]>;
  const total = useMemo(() => groupedEntries.reduce((sum, [, items]) => sum + items.length, 0), [groupedEntries]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.actionUrl);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-orange-700/80">Búsqueda global</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Todo lo que necesita la persona operando</h1>
            <p className="text-sm text-slate-500 dark:text-neutral-400">Busca placas, tickets, usuarios y cualquier entidad disponible en el sistema.</p>
          </div>
          <div className="w-full sm:max-w-md">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              startContent={isLoading ? <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> : <Search className="h-4 w-4 text-slate-400" />}
              classNames={{ inputWrapper: "h-12 rounded-2xl bg-white dark:bg-neutral-950/70" }}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {["all", "vehicles", "users", "parking"].map((item) => (
          <Button
            key={item}
            size="sm"
            variant={scope === item || (!scope && item === "all") ? "solid" : "flat"}
            color={scope === item || (!scope && item === "all") ? "primary" : "default"}
            className={scope === item || (!scope && item === "all") ? "bg-orange-500 text-white" : ""}
            onPress={() => {
              const next = new URLSearchParams();
              if (query.trim()) next.set("q", query.trim());
              if (item !== "all") next.set("scope", item);
              router.replace(`/search${next.toString() ? `?${next.toString()}` : ""}`);
            }}
          >
            {item === "all" ? "Todo" : item}
          </Button>
        ))}
      </div>

      {!query.trim() ? (
        <Card className="border border-slate-200/70 bg-white/70 dark:border-neutral-800/70 dark:bg-neutral-950/50">
          <Card.Content className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Ingresos", desc: "Buscar ticket, placa o vehículo" },
              { title: "Salidas", desc: "Cobros, reimpresiones y cierres" },
              { title: "Usuarios", desc: "Operadores, cajeros y admins" },
              { title: "Configuración", desc: "Sedes, cajas, tarifas y parámetros" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{item.desc}</p>
              </div>
            ))}
          </Card.Content>
        </Card>
      ) : total > 0 ? (
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-neutral-400">{total} resultados para “{query}”.</p>
          {groupedEntries.map(([type, items]) => (
            <section key={type} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {TYPE_META[type as SearchType]?.icon}
                {TYPE_META[type as SearchType]?.label ?? type}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-neutral-900">{items.length}</span>
              </div>
              <div className="grid gap-3">
                {items.map((result) => <ResultCard key={result.id} result={result} onSelect={handleSelect} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-slate-300 bg-white/70 dark:border-neutral-700 dark:bg-neutral-950/40">
          <Card.Content className="py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-500 dark:bg-orange-950/20">
              <Search className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No hay resultados</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Prueba con otra placa, ticket, usuario o abre una búsqueda más amplia.</p>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
