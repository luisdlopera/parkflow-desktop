"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@heroui/react";
import { Card } from "@/components/ui/Card";
import { CompanyForm } from "@/components/admin/CompanyForm";
import type { Company } from "@/lib/licensing/types";
import { getCompany, updateCompany } from "@/lib/licensing/api";

export default function EditCompanyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCompany(params.id)
      .then(setCompany)
      .catch(err => console.error("Error fetching company", err))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleUpdate = async (data: any) => {
    try {
      setSaving(true);
      await updateCompany(params.id, data);
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
      <div>
        <h1 className="text-2xl font-bold">Editar Empresa</h1>
        <p className="text-default-500">Modifica los datos de la empresa licenciada</p>
      </div>

      <Card>
        <Card.Content className="p-6">
          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : company ? (
             <CompanyForm onSubmit={handleUpdate} isLoading={saving} initialData={company} />
          ) : (
             <div className="text-danger">Empresa no encontrada</div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
