"use client";

import { useState, useCallback } from "react";
import { toast } from "@heroui/react";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import type { SettingsPage } from "@/lib/api/_shared";

type CrudData<T> = SettingsPage<T> | T[];

function toRows<T>(data: CrudData<T>): T[] {
  return Array.isArray(data) ? data : data.content ?? [];
}

export interface ConfigCrudOptions<T extends { id: string }> {
  /** Fetches the data; may return a paginated SettingsPage or a flat array. */
  loadFn: (...args: unknown[]) => Promise<CrudData<T>>;
  /** Creates a new item. */
  createFn?: (data: Record<string, unknown>) => Promise<unknown>;
  /** Updates an existing item by id. */
  updateFn?: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  /** Deletes an item by id. */
  deleteFn?: (id: string) => Promise<unknown>;
  /** Toggles the active status of an item. */
  toggleStatusFn?: (id: string, active: boolean) => Promise<unknown>;
}

export interface ConfigCrudReturn<T extends { id: string }> {
  rows: T[];
  data: SettingsPage<T>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  drawerOpen: boolean;
  editing: T | null;
  load: (...args: unknown[]) => Promise<void>;
  openCreate: () => void;
  openEdit: (row: T) => void;
  closeDrawer: () => void;
  save: (values: Record<string, unknown>) => Promise<boolean>;
  handleDelete: (
    id: string,
    confirmFn?: () => Promise<boolean>,
    label?: string
  ) => Promise<void>;
  handleToggleStatus: (row: T & { isActive?: boolean; active?: boolean }) => Promise<void>;
}

const EMPTY_PAGE = <T>(): SettingsPage<T> => ({
  content: [],
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: 20,
});

/**
 * Encapsula el estado CRUD repetido en las páginas de configuración:
 * rows/loading/error/drawerOpen/editing + load/openCreate/openEdit/save/delete/toggleStatus.
 *
 * El formulario (useForm + zodResolver) permanece en la página para máxima flexibilidad.
 *
 * Ejemplo:
 *   const crud = useConfigCrud({
 *     loadFn: () => fetchConfigurationPaymentMethods({ page: 0, size: 50 }),
 *     createFn: createConfigurationPaymentMethod,
 *     updateFn: updateConfigurationPaymentMethod,
 *     deleteFn: deleteConfigurationPaymentMethod,
 *   });
 */
export function useConfigCrud<T extends { id: string }>(
  opts: ConfigCrudOptions<T>
): ConfigCrudReturn<T> {
  const { loadFn, createFn, updateFn, deleteFn, toggleStatusFn } = opts;

  const [data, setData] = useState<SettingsPage<T>>(EMPTY_PAGE<T>());
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const load = useCallback(
    async (...args: unknown[]) => {
      setLoading(true);
      setError(null);
      try {
        const result = await loadFn(...args);
        if (Array.isArray(result)) {
          setRows(result);
          setData({ content: result, totalElements: result.length, totalPages: 1, page: 0, size: result.length });
        } else {
          setData(result as SettingsPage<T>);
          setRows((result as SettingsPage<T>).content ?? []);
        }
      } catch (e) {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA));
      } finally {
        setLoading(false);
      }
    },
    [loadFn]
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setError(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((row: T) => {
    setEditing(row);
    setError(null);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditing(null);
    setError(null);
  }, []);

  /**
   * Llama createFn o updateFn según si hay editing.
   * Retorna true en éxito para que la página pueda recargar datos.
   */
  const save = useCallback(
    async (values: Record<string, unknown>): Promise<boolean> => {
      setError(null);
      try {
        if (editing && updateFn) {
          await updateFn(editing.id, values);
        } else if (!editing && createFn) {
          await createFn(values);
        }
        setDrawerOpen(false);
        setEditing(null);
        toast.success(editing ? "Cambios guardados" : "Registro creado");
        return true;
      } catch (e) {
        const msg = getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA);
        setError(msg);
        return false;
      }
    },
    [editing, createFn, updateFn]
  );

  const handleDelete = useCallback(
    async (id: string, confirmFn?: () => Promise<boolean>, label = "este registro") => {
      if (confirmFn && !(await confirmFn())) return;
      try {
        await deleteFn?.(id);
        toast.success("Registro eliminado");
        await load();
      } catch (e) {
        toast.danger(getUserFriendlyErrorMessage(e, FrontendActionError.DELETE_DATA));
      }
    },
    [deleteFn, load]
  );

  const handleToggleStatus = useCallback(
    async (row: T & { isActive?: boolean; active?: boolean }) => {
      const current = row.isActive ?? row.active ?? false;
      try {
        await toggleStatusFn?.(row.id, !current);
        await load();
      } catch (e) {
        toast.danger(getUserFriendlyErrorMessage(e, FrontendActionError.CHANGE_STATUS));
      }
    },
    [toggleStatusFn, load]
  );

  return {
    rows,
    data,
    loading,
    error,
    clearError,
    drawerOpen,
    editing,
    load,
    openCreate,
    openEdit,
    closeDrawer,
    save,
    handleDelete,
    handleToggleStatus,
  };
}
