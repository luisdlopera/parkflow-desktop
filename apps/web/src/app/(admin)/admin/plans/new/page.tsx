"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/bridge/Button";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/bridge/Card";
import { useCreatePlan } from "@/lib/plans/hooks";
import type { CreatePlanRequest } from "@/lib/plans/types";
import { PlanForm } from "@/features/admin/PlanForm";

export default function NewPlanPage() {
  const router = useRouter();
  const { createPlan, isLoading } = useCreatePlan();

  const handleCreate = useCallback(
    async (data: CreatePlanRequest) => {
      await createPlan(data);
      router.push("/admin/plans");
    },
    [createPlan, router]
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="ghost"
          aria-label="Volver a planes"
          onPress={() => router.push("/admin/plans")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Crear Nuevo Plan</h1>
          <p className="text-default-500">
            Define un nuevo plan con sus funcionalidades
          </p>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-default-50 border border-default-200 rounded-xl">
        <PlanForm onSubmit={handleCreate} isLoading={isLoading} />
      </div>
    </div>
  );
}
