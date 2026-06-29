"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/bridge/Button";
import { ArrowLeft } from "lucide-react";
import { useCreateCompany } from "@/lib/licensing/hooks";
import type { CreateCompanyRequest, Company } from "@/lib/licensing/types";
import { CompanyForm } from "@/features/admin/CompanyForm";
import { CompanyCreatedDialog } from "@/features/admin/CompanyCreatedDialog";

export default function NewCompanyPage() {
  const router = useRouter();
  const { createCompany, isLoading } = useCreateCompany();
  const [createdCompany, setCreatedCompany] = useState<Company | null>(null);

  const handleCreateCompany = useCallback(
    async (data: CreateCompanyRequest) => {
      try {
        const company = await createCompany(data);
        setCreatedCompany(company);
      } catch (err) {
        throw err;
      }
    },
    [createCompany]
  );

  const handleDialogClose = useCallback(() => {
    setCreatedCompany(null);
    router.push("/admin/companies");
  }, [router]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="ghost"
          aria-label="Volver a empresas"
          onPress={() => router.push("/admin/companies")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Crear Nueva Empresa</h1>
          <p className="text-default-500">
            Diligencia los datos para registrar una nueva empresa
          </p>
        </div>
      </div>
      
      <div className="p-6 bg-default-50 dark:bg-default-100 dark:bg-default-50 border border-default-200 rounded-xl">
        <CompanyForm onSubmit={handleCreateCompany} isLoading={isLoading} />
      </div>

      {createdCompany && (
        <CompanyCreatedDialog
          isOpen={!!createdCompany}
          company={createdCompany}
          onClose={handleDialogClose}
        />
      )}
    </div>
  );
}
