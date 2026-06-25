"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { currentUser } from "@/lib/services/auth-domain.service";
import type { Plan, CreatePlanRequest } from "./types";
import {
  listPlans,
  createPlan as apiCreatePlan,
  updatePlan as apiUpdatePlan,
  deletePlan as apiDeletePlan,
  togglePlan as apiTogglePlan,
  duplicatePlan as apiDuplicatePlan,
} from "./api";

export function usePlans() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    currentUser().then((user) => {
      if (!mounted) return;
      setIsAdmin(user?.role === "SUPER_ADMIN");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const { data, error, isLoading, mutate } = useSWR<Plan[]>(
    isAdmin ? "/api/v1/admin/plans" : null,
    async () => {
      const plans = await listPlans();
      return plans;
    },
    { refreshInterval: 30000 }
  );

  return {
    data: data || [],
    error,
    isLoading: isLoading || isAdmin === null,
    mutate,
  };
}

export function useCreatePlan() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPlan = useCallback(
    async (request: CreatePlanRequest): Promise<Plan> => {
      setIsLoading(true);
      setError(null);
      try {
        const plan = await apiCreatePlan(request);
        return plan;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Error al crear plan");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { createPlan, isLoading, error };
}

export function useUpdatePlan() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updatePlan = useCallback(
    async (id: string, request: CreatePlanRequest): Promise<Plan> => {
      setIsLoading(true);
      setError(null);
      try {
        const plan = await apiUpdatePlan(id, request);
        return plan;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Error al actualizar plan");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { updatePlan, isLoading, error };
}
