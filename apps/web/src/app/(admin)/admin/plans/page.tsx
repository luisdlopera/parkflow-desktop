"use client";

import { toast } from "@heroui/react";
import { useState, useCallback } from "react";
import { Skeleton, AlertDialog, Button as HeroButton } from "@heroui/react";
import { Chip } from "@/components/bridge/Chip";
import { Card } from "@/components/bridge/Card";
import { DropdownItem } from "@/components/bridge/Dropdown";
import { Button } from "@/components/bridge/Button";
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  Pencil,
  Eye,
  ToggleLeft,
} from "lucide-react";
import { usePlans } from "@/lib/plans/hooks";
import { deletePlan, togglePlan, duplicatePlan } from "@/lib/plans/api";
import type { Plan } from "@/lib/plans/types";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";
import { ApiError } from "@/lib/errors/api-error";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { EntityManagementPage } from "@/features/admin/EntityManagementPage";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getFeatureSummary(features: import("@/lib/plans/types").PlanFeatures): string {
  const enabled = Object.values(features).filter(Boolean).length;
  const total = Object.keys(features).length;
  return `${enabled}/${total}`;
}

export default function PlansPage() {
  const { data: plans, isLoading, error, mutate } = usePlans();
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTrigger = useCallback((plan: Plan) => {
    setPlanToDelete(plan);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!planToDelete) return;
    try {
      setIsDeleting(true);
      await deletePlan(planToDelete.id);
      mutate();
      setPlanToDelete(null);
      toast.success("Plan eliminado correctamente");
    } catch (err: unknown) {
      const isUnauthorized = (err as any)?.status === 401 || (err as any)?.status === 403;
      toast.danger(
        isUnauthorized
          ? "No tienes permisos suficientes (SUPER_ADMIN) o tu sesión expiró."
          : (err as any)?.message || "Ocurrió un error al eliminar el plan."
      );
    } finally {
      setIsDeleting(false);
    }
  }, [planToDelete, mutate]);

  const handleToggle = useCallback(
    async (plan: Plan) => {
      try {
        await togglePlan(plan.id);
        mutate();
        toast.success(
          plan.isActive ? "Plan desactivado" : "Plan activado"
        );
      } catch (err: unknown) {
        toast.danger(
          (err as any)?.message || "Error al cambiar estado del plan"
        );
      }
    },
    [mutate]
  );

  const handleDuplicate = useCallback(
    async (plan: Plan) => {
      try {
        await duplicatePlan(plan.id);
        mutate();
        toast.success("Plan duplicado correctamente");
      } catch (err: unknown) {
        toast.danger(
          (err as any)?.message || "Error al duplicar el plan"
        );
      }
    },
    [mutate]
  );

  const columns: DataTableColumn<Plan>[] = [
    {
      key: "name",
      header: "Nombre",
      sortable: true,
      render: (plan) => (
        <div>
          <p className="font-medium">{plan.name}</p>
          {plan.description && (
            <p className="text-sm text-default-500 truncate max-w-xs">
              {plan.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "monthlyPrice",
      header: "Precio mensual",
      sortable: true,
      render: (plan) => (
        <span className="font-medium">{formatPrice(plan.monthlyPrice)}</span>
      ),
    },
    {
      key: "isActive",
      header: "Estado",
      sortable: true,
      render: (plan) =>
        plan.deletedAt ? (
          <Chip color="default" variant="soft" size="sm">
            Eliminado
          </Chip>
        ) : plan.isActive ? (
          <Chip color="success" variant="soft" size="sm">
            <CheckCircle2 className="w-3 h-3" />
            Activo
          </Chip>
        ) : (
          <Chip color="danger" variant="soft" size="sm">
            <XCircle className="w-3 h-3" />
            Inactivo
          </Chip>
        ),
    },
    {
      key: "features",
      header: "Features",
      render: (plan) => {
        if (!plan.features) return <span className="text-default-400">-</span>;
        const summary = getFeatureSummary(plan.features);
        return <Chip variant="soft" size="sm">{summary} activas</Chip>;
      },
    },
    {
      key: "createdAt",
      header: "Creado",
      sortable: true,
      render: (plan) =>
        plan.createdAt
          ? new Date(plan.createdAt).toLocaleDateString("es-CO")
          : "-",
    },
  ];

  if (error) {
    const userError = getUserErrorMessage(error, "plans.load");
    const apiErr = error instanceof ApiError ? error : undefined;
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ErrorState
          title={userError.title}
          description={userError.description}
          actionLabel={userError.actionLabel}
          onRetry={() => mutate()}
          errorCode={apiErr?.code as string}
          correlationId={apiErr?.correlationId}
          technicalDetails={apiErr?.message}
        />
      </div>
    );
  }

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <Card>
        <Card.Content className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-default-500">Total Planes</p>
            <div className="text-xl font-bold">
              {isLoading ? (
                <Skeleton className="w-8 h-6 rounded-md" />
              ) : (
                <span>{plans?.length ?? 0}</span>
              )}
            </div>
          </div>
        </Card.Content>
      </Card>
      <Card>
        <Card.Content className="flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-default-500">Activos</p>
            <div className="text-xl font-bold">
              {isLoading ? (
                <Skeleton className="w-8 h-6 rounded-md" />
              ) : (
                <span>
                  {plans?.filter((p) => p.isActive && !p.deletedAt).length ?? 0}
                </span>
              )}
            </div>
          </div>
        </Card.Content>
      </Card>
      <Card>
        <Card.Content className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <XCircle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-sm text-default-500">Inactivos</p>
            <div className="text-xl font-bold">
              {isLoading ? (
                <Skeleton className="w-8 h-6 rounded-md" />
              ) : (
                <span>
                  {plans?.filter((p) => !p.isActive && !p.deletedAt).length ?? 0}
                </span>
              )}
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );

  return (
    <>
      <EntityManagementPage
        title="Planes"
        description="Gestione los planes del sistema y sus funcionalidades disponibles"
        data={plans || []}
        columns={columns}
        isLoading={isLoading}
        getRowKey={(p) => p.id}
        createHref="/admin/plans/new"
        createLabel="Nuevo Plan"
        onSave={async () => {}}
        renderStats={renderStats}
        searchable
        searchPlaceholder="Buscar plan..."
        filters={[
          {
            key: "status",
            label: "Estado",
            type: "select",
            options: [
              { label: "Activos", value: "active" },
              { label: "Inactivos", value: "inactive" },
            ],
          },
        ]}
        customActions={(plan) => [
          <DropdownItem
            key="view"
            textValue="Ver detalle"
            startContent={<Eye className="w-4 h-4" />}
            onPress={() => window.location.href = `/admin/plans/edit?id=${plan.id}`}
          >
            Ver detalle
          </DropdownItem>,
          <DropdownItem
            key="edit"
            textValue="Editar"
            startContent={<Pencil className="w-4 h-4" />}
            href={`/admin/plans/edit?id=${plan.id}`}
            as="a"
          >
            Editar
          </DropdownItem>,
          <DropdownItem
            key="toggle"
            textValue={plan.isActive ? "Desactivar" : "Activar"}
            startContent={<ToggleLeft className="w-4 h-4" />}
            onPress={() => handleToggle(plan)}
          >
            {plan.isActive ? "Desactivar" : "Activar"}
          </DropdownItem>,
          <DropdownItem
            key="duplicate"
            textValue="Duplicar"
            startContent={<Copy className="w-4 h-4" />}
            onPress={() => handleDuplicate(plan)}
          >
            Duplicar
          </DropdownItem>,
          <DropdownItem
            key="delete"
            textValue="Eliminar"
            className="text-danger"
            color="danger"
            startContent={<Trash2 className="w-4 h-4" />}
            onPress={() => handleDeleteTrigger(plan)}
          >
            Eliminar
          </DropdownItem>,
        ]}
      />

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={!!planToDelete}
          onOpenChange={(open) => !open && setPlanToDelete(null)}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Eliminar plan</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Esto eliminará el plan <strong>{planToDelete?.name}</strong>.
                  Los planes con historial no se eliminan físicamente. Esta
                  acción se puede revertir contactando a soporte.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <HeroButton
                  variant="tertiary"
                  onPress={() => setPlanToDelete(null)}
                >
                  Cancelar
                </HeroButton>
                <Button
                  className="bg-danger text-white hover:bg-danger/90"
                  onPress={confirmDelete as any}
                  isLoading={isDeleting}
                >
                  Eliminar
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
