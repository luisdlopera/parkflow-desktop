"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Search, Loader2, Car, Ticket, User, ChevronRight } from "lucide-react";
import { useSearch } from "../hooks/useSearch";
import { SearchResult, SearchType } from "../types/search.types";
import { useRouter } from "next/navigation";
import { cn } from "@heroui/theme";

const TypeIcon = ({ type }: { type: SearchType }) => {
  switch (type) {
    case "VEHICLE": return <Car className="w-4 h-4" />;
    case "TICKET": return <Ticket className="w-4 h-4" />;
    case "USER": return <User className="w-4 h-4" />;
    default: return <Search className="w-4 h-4" />;
  }
};

export function QuickSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { results, isLoading } = useSearch(query);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const flatResults = results ? Object.values(results.results).flat() : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === "Enter" && flatResults[selectedIndex]) {
      handleSelect(flatResults[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    router.push(result.actionUrl);
  };

  const handleSearchClick = () => {
    if (query.length >= 2) {
      if (flatResults.length > 0) {
        handleSelect(flatResults[selectedIndex] || flatResults[0]);
      } else {
        setIsOpen(true);
      }
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className="relative w-full max-w-md flex items-center gap-2" ref={containerRef} onKeyDown={handleKeyDown}>
      <div className="relative flex-1">
        <Input
          placeholder="Buscar placa, ticket o cliente... (Cmd+K)"
          startContent={
            isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Search className="w-4 h-4 text-default-400" />
            )
          }
          value={query}
          onValueChange={(val) => {
            setQuery(val);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          variant="flat"
          classNames={{
            inputWrapper: "bg-default-100/50 hover:bg-default-200/50 transition-colors h-10",
          }}
        />

        {isOpen && query.length >= 2 && (
          <Card className="absolute top-12 left-0 right-0 z-50 shadow-2xl border-1 border-default-200 overflow-hidden">
            <CardBody className="p-0 max-h-[400px] overflow-y-auto">
              {flatResults.length > 0 ? (
                <div className="py-2">
                  {Object.entries(results?.results || {}).map(([type, items]) => (
                    <div key={type}>
                      <div className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-default-400 bg-default-50/50">
                        {type}
                      </div>
                      {items.map((item) => {
                        const isSelected = flatResults[selectedIndex]?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-2",
                              isSelected 
                                ? "bg-primary-50 border-primary text-primary" 
                                : "hover:bg-default-100 border-transparent"
                            )}
                            onClick={() => handleSelect(item)}
                          >
                            <div className={cn(
                              "p-2 rounded-lg",
                              isSelected ? "bg-primary-100 text-primary" : "bg-default-100 text-default-500"
                            )}>
                              <TypeIcon type={item.type} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold truncate">{item.title}</p>
                                {(item.metadata?.status === "ACTIVE" || String(item.subtitle).includes("ACTIVE")) && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                                    Activo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-default-500 truncate">{item.subtitle}</p>
                            </div>
                            {isSelected && <ChevronRight className="w-4 h-4" />}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : !isLoading ? (
                <div className="p-8 text-center">
                  <Search className="w-8 h-8 text-default-200 mx-auto mb-2" />
                  <p className="text-sm text-default-500">No se encontraron resultados para "{query}"</p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        )}
      </div>

      <Button
        color="primary"
        variant="solid"
        size="md"
        className="h-10 px-4 font-semibold text-white shadow-md shadow-orange-500/20 bg-orange-500 hover:bg-orange-600 transition-all rounded-xl"
        onPress={handleSearchClick}
      >
        Buscar
      </Button>
    </div>
  );
}
