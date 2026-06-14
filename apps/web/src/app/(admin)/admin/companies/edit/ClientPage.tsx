"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@heroui/react";
import { Card } from "@/components/ui/Card";
import { CompanyForm } from "@/components/admin/CompanyForm";
import type { Company } from "@/lib/licensing/types";
import { getCompany, updateCompany } from "@/lib/licensing/api";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setCompany(null);
      return;
    }
    setLoading(true);
    setCompany(null);
    const abortController = new AbortController();
    getCompany(id)
      .then((data) => {
        if (!abortController.signal.aborted) {
          setCompany(data);
        }
      })
      .catch(err => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching company", err);
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });
    return () => abortController.abort();
  }, [id]);

  const handleUpdate = async (data: any) => {
    if (!id) return;
    try {
      setSaving(true);
      await updateCompany(id, data);
      router.push("/admin/companies");
    } catch (err) {
      console.error(err);
      throw err; // Let CompanyForm handle the error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          isIconOnly 
          onPress={() => router.push("/admin/companies")}
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Empresa</h1>
          <p className="text-default-500">Modifica los datos de la empresa licenciada</p>
        </div>
      </div>

      <Card>
        <Card.Content className="p-6">
          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : company ? (
             <CompanyForm onSubmit={handleUpdate} isLoading={saving} initialData={company} />
          ) : (
             <div className="text-danger">Empresa no encontrada o ID no proporcionado</div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
