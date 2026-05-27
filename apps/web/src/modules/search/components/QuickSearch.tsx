"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Modal, ModalBody, ModalContent, Chip } from "@heroui/react";
import { ChevronRight, Clock3, Loader2, Search, Ticket, Car, User, Building2, CreditCard, Bell, Wand2, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@heroui/theme";
import { useSearch } from "../hooks/useSearch";
import { SearchResult, SearchType } from "../types/search.types";

const RECENT_KEY = "parkflow.search.recent";
const MAX_RECENT = 6;

const TYPE_META: Record<SearchType, { label: string; icon: React.ReactNode }> = {
  VEHICLE: { label: "Vehículos", icon: <Car className="h-4 w-4" /> },
  TICKET: { label: "Tickets", icon: <Ticket className="h-4 w-4" /> },
  CLIENT: { label: "Clientes", icon: <Building2 className="h-4 w-4" /> },
  USER: { label: "Usuarios", icon: <User className="h-4 w-4" /> },
  INVOICE: { label: "Facturas", icon: <CreditCard className="h-4 w-4" /> },
  RESERVATION: { label: "Reservas", icon: <Bell className="h-4 w-4" /> },
  PAYMENT: { label: "Pagos", icon: <CreditCard className="h-4 w-4" /> },
  INCIDENT: { label: "Incidentes", icon: <Wand2 className="h-4 w-4" /> },
  ACTION: { label: "Acciones", icon: <Sparkles className="h-4 w-4" /> },
};

function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === "undefined") return;
  const clean = query.trim();
  if (!clean) return;
  const next = [clean, ...readRecentSearches().filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function TypeIcon({ type }: { type: SearchType }) {
  return <>{TYPE_META[type]?.icon ?? <Search className="h-4 w-4" />}</>;
}

function SearchResultRow({ result, selected, onSelect }: { result: SearchResult; selected: boolean; onSelect: (result: SearchResult) => void; }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className={cn(
        "flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-all",
        selected ? "border-orange-500 bg-orange-50/80 dark:bg-orange-950/20" : "border-transparent hover:bg-slate-50 dark:hover:bg-neutral-800/40"
      )}
    >
      <div className={cn("rounded-xl p-2", selected ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-300")}>
        <TypeIcon type={result.type} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{result.title}</p>
          {String(result.metadata?.status ?? "").toUpperCase() === "ACTIVE" ? (
            <Chip size="sm" variant="flat" color="success">Activo</Chip>
          ) : null}
        </div>
        <p className="truncate text-xs text-slate-500 dark:text-neutral-400">{result.subtitle}</p>
      </div>
      {selected ? <ChevronRight className="h-4 w-4 text-orange-600" /> : null}
    </button>
  );
}

export function QuickSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading } = useSearch(query);

  const groups = results?.results ?? null;
  const flatResults = useMemo<SearchResult[]>(() => Object.values(groups ?? {}).flat() as SearchResult[], [groups]);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
      const onKeyDown = (event: KeyboardEvent) => {
        const metaOrCtrl = event.metaKey || event.ctrlKey;
        if (metaOrCtrl && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setIsOpen(true);
        }
        if (!isOpen) return;
        if (event.key === "Escape") {
          event.preventDefault();
          setIsOpen(false);
        }
      };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (flatResults.length === 0 ? 0 : (prev + 1) % flatResults.length));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (flatResults.length === 0 ? 0 : (prev - 1 + flatResults.length) % flatResults.length));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
          return;
        }
        handleSearchPage();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flatResults, isOpen, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(query);
    setRecentSearches(readRecentSearches());
    setIsOpen(false);
    setQuery("");
    router.push(result.actionUrl);
  };

  const handleSearchPage = () => {
    const next = query.trim();
    if (!next) {
      setIsOpen(true);
      return;
    }
    saveRecentSearch(next);
    setRecentSearches(readRecentSearches());
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(next)}`);
    setQuery("");
  };

  const handleQuickEntry = () => {
    const next = query.trim().toUpperCase();
    if (!next) return;
    saveRecentSearch(next);
    setRecentSearches(readRecentSearches());
    setIsOpen(false);
    router.push(`/nuevo-ingreso?plate=${encodeURIComponent(next)}`);
    setQuery("");
  };

  const openPalette = () => {
    setIsOpen(true);
  };

  return (
    <>
      <Button
        className="hidden h-10 min-w-0 flex-1 max-w-md items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-slate-50 dark:border-neutral-800/70 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-900/70 sm:flex"
        variant="flat"
        onPress={openPalette}
      >
        <span className="flex items-center gap-2 truncate text-sm">
          <Search className="h-4 w-4" />
          Buscar placa, ticket, usuario...
        </span>
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500">
          ⌘K
        </span>
      </Button>

      <Button
        className="h-10 w-10 min-w-10 rounded-xl border border-slate-200/80 bg-white/70 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-slate-50 dark:border-neutral-800/70 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-900/70 sm:hidden"
        variant="flat"
        onPress={openPalette}
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="4xl" scrollBehavior="inside" placement="top" hideCloseButton>
        <ModalContent className="overflow-hidden border border-slate-200/70 bg-white/95 shadow-2xl dark:border-neutral-800/70 dark:bg-neutral-950/95">
          <ModalBody className="p-0">
            <div className="border-b border-slate-200/70 px-4 py-4 dark:border-neutral-800/70">
              <Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Busca placas, tickets, usuarios, sedes..."
                startContent={isLoading ? <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> : <Search className="h-4 w-4 text-slate-400" />}
                classNames={{ inputWrapper: "h-12 rounded-2xl bg-slate-50 shadow-none dark:bg-neutral-900/80" }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-neutral-900"><Clock3 className="h-3.5 w-3.5" /> Cmd/Ctrl + K</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-neutral-900">Enter abre el mejor resultado</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-neutral-900">Esc cierra</span>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-2 sm:p-3">
              {query.trim().length < 2 ? (
                <div className="grid gap-4 p-3 sm:grid-cols-[1.3fr_1fr]">
                  <Card className="border border-slate-200/70 bg-slate-50/80 shadow-none dark:border-neutral-800/70 dark:bg-neutral-900/40">
                    <CardBody className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Acceso rápido</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          { label: "Nuevo ingreso", href: "/nuevo-ingreso" },
                          { label: "Salida y cobro", href: "/salida-cobro" },
                          { label: "Vehículos activos", href: "/vehiculos-activos" },
                          { label: "Cierre de caja", href: "/caja" },
                        ].map((item) => (
                          <button
                            key={item.href}
                            type="button"
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-200 dark:hover:border-orange-900/60 dark:hover:bg-orange-950/20"
                            onClick={() => router.push(item.href)}
                          >
                            <span>{item.label}</span>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="border border-slate-200/70 bg-white shadow-none dark:border-neutral-800/70 dark:bg-neutral-950/50">
                    <CardBody className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Recientes</p>
                      <div className="space-y-2">
                        {recentSearches.length > 0 ? recentSearches.map((item) => (
                          <button
                            key={item}
                            type="button"
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                              onClick={() => {
                                setQuery(item);
                                router.push(`/search?q=${encodeURIComponent(item)}`);
                                setIsOpen(false);
                              }}
                          >
                            <span className="truncate">{item}</span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        )) : <p className="text-sm text-slate-500 dark:text-neutral-400">Todavía no hay búsquedas recientes.</p>}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              ) : flatResults.length > 0 ? (
                <div className="space-y-4 p-2">
                  {Object.entries(groups ?? {}).map(([type, items]) => (
                    <section key={type} className="space-y-2">
                      <div className="flex items-center justify-between px-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-neutral-500">
                          <TypeIcon type={type as SearchType} />
                          {TYPE_META[type as SearchType]?.label ?? type}
                        </div>
                        <span className="text-xs text-slate-400">{items.length} resultados</span>
                      </div>
                      <Card className="overflow-hidden border border-slate-200/70 shadow-none dark:border-neutral-800/70">
                        <CardBody className="p-0">
                          {items.map((item) => {
                            const isSelected = flatResults[selectedIndex]?.id === item.id;
                            return <SearchResultRow key={item.id} result={item} selected={isSelected} onSelect={handleSelect} />;
                          })}
                        </CardBody>
                      </Card>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-950/20">
                    <Search className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">Sin resultados</p>
                    <p className="text-sm text-slate-500 dark:text-neutral-400">No encontramos coincidencias para "{query}".</p>
                  </div>
                  <Button color="primary" className="rounded-xl bg-orange-500 font-semibold text-white" onPress={handleSearchPage}>
                    Ver búsqueda completa
                  </Button>
                  <Button color="secondary" variant="flat" className="rounded-xl font-semibold" onPress={handleQuickEntry}>
                    Alta rápida con esta placa
                  </Button>
                </div>
              )}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
