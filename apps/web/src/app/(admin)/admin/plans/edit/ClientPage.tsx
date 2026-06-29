"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/bridge/Button";
import { Card } from "@/components/bridge/Card";
import { PlanForm } from "@/features/admin/PlanForm";
import type { Plan, CreatePlanRequest } from "@/lib/plans/types";
import { getPlan, updatePlan } from "@/lib/plans/api";

export default function ClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setPlan(null);
      return;
    }
    setLoading(true);
    setPlan(null);
    const abortController = new AbortController();

    getPlan(id)
      .then((data) => {
        if (!abortController.signal.aborted) {
          setPlan(data);
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching plan", err);
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => abortController.abort();
  }, [id]);

  const handleUpdate = async (data: CreatePlanRequest) => {
    if (!id) return;
    try {
      setSaving(true);
      await updatePlan(id, data);
      router.push("/admin/plans");
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md mt-2" />
          </div>
        </div>
        <div className="p-6 border border-default-200 rounded-xl">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!id || !plan) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-danger">Plan no encontrado</p>
        <Button onPress={() => router.push("/admin/plans")}>
          Volver a planes
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          isIconOnly
          onPress={() => router.push("/admin/plans")}
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Plan</h1>
          <p className="text-default-500">
            Modifica los datos y funcionalidades del plan
          </p>
        </div>
      </div>

      <div className="p-6 bg-default-50 dark:bg-default-100 dark:bg-default-50 border border-default-200 rounded-xl">
        <PlanForm
          onSubmit={handleUpdate}
          isLoading={saving}
          initialData={plan}
        />
      </div>
    </div>
  );
}
