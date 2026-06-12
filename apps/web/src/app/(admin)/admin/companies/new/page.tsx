"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { useCreateCompany } from "@/lib/licensing/hooks";
import type { CreateCompanyRequest } from "@/lib/licensing/types";
import { CompanyForm } from "@/components/admin/CompanyForm";

export default function NewCompanyPage() {
  const router = useRouter();
  const { createCompany, isLoading } = useCreateCompany();

  const handleCreateCompany = useCallback(
    async (data: CreateCompanyRequest) => {
      try {
        await createCompany(data);
        router.push("/admin/companies");
      } catch (err) {
        // Error manejado en el form / hook
      }
    },
    [createCompany, router]
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="light"
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
      
      <div className="p-6 bg-white dark:bg-default-50 border border-default-200 rounded-xl">
        <CompanyForm onSubmit={handleCreateCompany} isLoading={isLoading} />
      </div>
    </div>
  );
}
