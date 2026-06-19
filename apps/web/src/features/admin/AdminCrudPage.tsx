"use client";

import { Skeleton } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { EntityManagementPage } from "@/features/admin/EntityManagementPage";
import type { DataTableColumn } from "@/components/ui/DataTable";

interface AdminCrudPageProps<T extends object> {
  title: string;
  description: string;
  icon?: LucideIcon;
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  error?: Error | string | null;
  getRowKey: (item: T) => string;
  createHref?: string;
  createLabel?: string;
  FormComponent?: React.ComponentType<{
    initialData?: T | null;
    onSave: (data: Partial<T>) => void;
  }>;
  onSave?: (data: Partial<T>, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  searchable?: boolean;
  searchPlaceholder?: string;
  filters?: Array<{
    key: string;
    label: string;
    type: "select" | "boolean" | "dateRange";
    options?: { label: string; value: string }[];
  }>;
  customActions?: (item: T) => React.ReactNode[];
  renderStats?: () => React.ReactNode;
}

export function AdminCrudPage<T extends object>({
  title,
  description,
  icon,
  data,
  columns,
  isLoading,
  error,
  getRowKey,
  createHref,
  createLabel,
  FormComponent,
  onSave,
  onDelete,
  searchable = true,
  searchPlaceholder,
  filters,
  customActions,
  renderStats,
}: AdminCrudPageProps<T>) {
  const loadingFallback = isLoading ? (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64 rounded-md" />
      <Skeleton className="h-4 w-96 rounded-md" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  ) : undefined;

  if (isLoading && data.length === 0) {
    return <>{loadingFallback}</>;
  }

  return (
    <EntityManagementPage
      title={title}
      description={description}
      icon={icon}
      data={data}
      columns={columns}
      isLoading={isLoading}
      error={error}
      getRowKey={getRowKey}
      createHref={createHref}
      createLabel={createLabel}
      FormComponent={FormComponent}
      onSave={onSave}
      onDelete={onDelete}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder}
      filters={filters}
      customActions={customActions}
      renderStats={renderStats}
    />
  );
}
