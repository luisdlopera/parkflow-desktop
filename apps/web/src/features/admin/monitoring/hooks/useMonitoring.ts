"use client";
import { useState, useEffect, useCallback } from "react";
import {
  fetchPriorityCases,
  fetchUnresolvedBlocks,
  fetchBlockStatistics,
  resolveBlock,
  markBlockFalsePositive,
  type PriorityCase,
  type BlockEvent,
  type BlockStatistics,
} from "@/lib/api/licensing-support-api";

export type { PriorityCase, BlockEvent, BlockStatistics };

export function useMonitoring() {
  const [priorityCases, setPriorityCases] = useState<PriorityCase[]>([]);
  const [blockEvents, setBlockEvents] = useState<BlockEvent[]>([]);
  const [statistics, setStatistics] = useState<BlockStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cases, blocks, stats] = await Promise.all([
        fetchPriorityCases(),
        fetchUnresolvedBlocks(),
        fetchBlockStatistics(7),
      ]);
      setPriorityCases(cases);
      setBlockEvents(blocks);
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleResolve = async (eventId: string, notes: string) => {
    try {
      await resolveBlock(eventId, notes);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al resolver");
    }
  };

  const handleFalsePositive = async (eventId: string, notes: string) => {
    try {
      await markBlockFalsePositive(eventId, notes);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al marcar");
    }
  };

  return { priorityCases, blockEvents, statistics, isLoading, error, fetchData, handleResolve, handleFalsePositive };
}
