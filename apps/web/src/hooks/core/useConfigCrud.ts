"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "@heroui/react";
import { errorService } from "@/lib/errors/error-service";
import type { PaginatedResponse } from "@/lib/types/api.types";

type CrudData<T> = PaginatedResponse<T> | T[];

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
  data: PaginatedResponse<T>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  drawerOpen: boolean;
  editing: T | null;
  load: (...args: unknown[]) => Promise<void>;
  openCreate: () => void;
  openEdit: (row: T) => void;
  closeDrawer: () => void;
  save: (
    values: Record<string, unknown>,
    setErrorFn?: (name: any, error: { type: string; message: string }) => void
  ) => Promise<boolean>;
  handleDelete: (
    id: string,
    confirmFn?: () => Promise<boolean>,
    label?: string
  ) => Promise<void>;
  handleToggleStatus: (row: T & { isActive?: boolean; active?: boolean }) => Promise<void>;
}

const EMPTY_PAGE = <T>(): PaginatedResponse<T> => ({
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

  const loadFnRef = useRef(loadFn);
  const createFnRef = useRef(createFn);
  const updateFnRef = useRef(updateFn);
  const deleteFnRef = useRef(deleteFn);
  const toggleStatusFnRef = useRef(toggleStatusFn);

  useEffect(() => {
    loadFnRef.current = loadFn;
    createFnRef.current = createFn;
    updateFnRef.current = updateFn;
    deleteFnRef.current = deleteFn;
    toggleStatusFnRef.current = toggleStatusFn;
  }, [loadFn, createFn, updateFn, deleteFn, toggleStatusFn]);

  const [data, setData] = useState<PaginatedResponse<T>>(EMPTY_PAGE<T>());
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
        const result = await loadFnRef.current(...args);
        if (Array.isArray(result)) {
          setRows(result);
          setData({ content: result, totalElements: result.length, totalPages: 1, page: 0, size: result.length });
        } else {
          setData(result as PaginatedResponse<T>);
          setRows((result as PaginatedResponse<T>).content ?? []);
        }
      } catch (e) {
        setError(errorService.normalize(e).message);
      } finally {
        setLoading(false);
      }
    },
    []
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
    async (
      values: Record<string, unknown>,
      setErrorFn?: (name: any, error: { type: string; message: string }) => void
    ): Promise<boolean> => {
      setError(null);
      try {
        if (editing && updateFnRef.current) {
          await updateFnRef.current(editing.id, values);
        } else if (!editing && createFnRef.current) {
          await createFnRef.current(values);
        }
        setDrawerOpen(false);
        setEditing(null);
        toast.success(editing ? "Cambios guardados" : "Registro creado");
        return true;
      } catch (e) {
        const normalized = errorService.normalize(e);
        setError(normalized.message);
        if (setErrorFn && normalized.fieldErrors) {
          Object.entries(normalized.fieldErrors).forEach(([field, msg]) => {
            setErrorFn(field, { type: "server", message: msg });
          });
        }
        return false;
      }
    },
    [editing]
  );

  const handleDelete = useCallback(
    async (id: string, confirmFn?: () => Promise<boolean>, label = "este registro") => {
      if (confirmFn && !(await confirmFn())) return;
      try {
        await deleteFnRef.current?.(id);
        toast.success("Registro eliminado");
        await load();
      } catch (e) {
        errorService.toast.error(e);
      }
    },
    [load]
  );

  const handleToggleStatus = useCallback(
    async (row: T & { isActive?: boolean; active?: boolean }) => {
      const current = row.isActive ?? row.active ?? false;
      try {
        await toggleStatusFnRef.current?.(row.id, !current);
        await load();
      } catch (e) {
        errorService.toast.error(e);
      }
    },
    [load]
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
