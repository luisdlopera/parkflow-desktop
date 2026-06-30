import type { ReactNode } from "react";

/**
 * Sistema de tipos de columna extensible para DataTable
 * Inspirado en SolvyX/Solvy — diseñado para ser tip-safe y escalable
 */

// ────────────────────────────────────────────────────────────────────────
// 1. Tipos de columna soportados
// ────────────────────────────────────────────────────────────────────────

export type ColumnType =
  | "text"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "time"
  | "datetime"
  | "boolean"
  | "badge"
  | "status"
  | "formatEnum"
  | "tags"
  | "image"
  | "avatar"
  | "relation"
  | "multirelation"
  | "geolocation"
  | "color"
  | "json"
  | "email"
  | "phone"
  | "url"
  | "icon"
  | "progress"
  | "rating"
  | "copyable"
  | "actions"
  | "custom";

// ────────────────────────────────────────────────────────────────────────
// 2. Opciones de columna específicas por tipo (configuración granular)
// ────────────────────────────────────────────────────────────────────────

export interface BaseColumnOptions {
  /** Texto visible cuando el valor es nulo o vacío */
  emptyText?: string;
  /** Si la celda debe truncarse con ellipsis */
  truncate?: boolean;
  /** Clases CSS adicionales para la celda */
  className?: string;
}

export interface CurrencyOptions extends BaseColumnOptions {
  currency?: string;
  locale?: string;
  showSymbol?: boolean;
}

export interface DatetimeOptions extends BaseColumnOptions {
  format?: string;
  locale?: string;
}

export interface BadgeOptions extends BaseColumnOptions {
  variantMap?: Record<string, string>;
  labelMap?: Record<string, string>;
  colorMap?: Record<string, string>;
}

export interface FormatEnumOptions extends BaseColumnOptions {
  labelMap?: Record<string, string>;
  fallbackLabel?: string;
}

export interface TagsOptions extends BaseColumnOptions {
  maxVisible?: number;
  colorMap?: Record<string, string>;
  labelMap?: Record<string, string>;
}

export interface ImageOptions extends BaseColumnOptions {
  size?: string | number;
  rounded?: boolean;
  fallback?: string;
}

export interface AvatarOptions extends BaseColumnOptions {
  size?: "sm" | "md" | "lg";
}

export interface RelationOptions extends BaseColumnOptions {
  labelKey?: string;
  valueKey?: string;
}

export interface MultiRelationOptions extends BaseColumnOptions {
  labelKey?: string;
  maxVisible?: number;
}

export interface GeolocationOptions extends BaseColumnOptions {
  latKey?: string;
  lngKey?: string;
  showMapLink?: boolean;
}

export interface JsonOptions extends BaseColumnOptions {
  collapsed?: boolean;
  maxLength?: number;
  pretty?: boolean;
}

export interface ColorOptions extends BaseColumnOptions {
  showHex?: boolean;
  shape?: "circle" | "square";
}

export interface CopyableOptions extends BaseColumnOptions {
  copyValue?: boolean;
  toastMessage?: string;
}

export interface CustomOptions extends BaseColumnOptions {
  render: (value: unknown, row: unknown) => ReactNode;
}

// ────────────────────────────────────────────────────────────────────────
// 3. Interfaz de columna principal (DataTableColumn)
// ────────────────────────────────────────────────────────────────────────

/**
 * TODAS las columnas deben tener propiedad `type` explícita.
 * Si una columna heredada usa `format`, el wrapper la migrará automáticamente.
 */
export interface DataTableColumn<T = unknown> {
  key: keyof T | (string & {});
  label?: string;
  header?: string;
  /**
   * Tipo de columna para el renderer centralizado.
   * En columnas heredadas que usan `format`, el wrapper lo mapea automáticamente.
   */
  type?: ColumnType;
  /** Opciones específicas del tipo de columna */
  options?: BaseColumnOptions & Record<string, any>;
  priority?: "high" | "medium" | "low";
  sortable?: boolean;
  sortType?: "string" | "number" | "date" | "boolean";
  align?: "left" | "center" | "right";
  resizable?: boolean;
  width?: number | string;
  minWidth?: number;
  /**
   * @deprecated Usa `type` + `options` en su lugar.
   * Se mantiene por compatibilidad con tablas existentes.
   */
  format?: "currency" | "datetime" | "date" | "boolean" | "badge";
  /**
   * @deprecated Usa `type: "custom"` + `options: { render: ... }` en su lugar.
   * Se mantiene por compatibilidad con tablas existentes.
   */
  render?: (row: T) => ReactNode;
}

// ────────────────────────────────────────────────────────────────────────
// 4. Props del renderizador de celdas
// ────────────────────────────────────────────────────────────────────────

export interface CellRendererProps<T = unknown> {
  column: DataTableColumn<T>;
  value: unknown;
  row: T;
}

// ────────────────────────────────────────────────────────────────────────
// 5. Tipo para componentes de renderizado de celdas
// ────────────────────────────────────────────────────────────────────────

export type CellRendererComponent<T = unknown> = React.FC<CellRendererProps<T>>;

// ────────────────────────────────────────────────────────────────────────
// 6. Tipos utilitarios
// ────────────────────────────────────────────────────────────────────────

/**
 * Extrae las opciones de un tipo de columna específico.
 * Útil para tipar correctamente las props internas de cada renderer.
 */
export type ExtractOptions<T extends ColumnType> = T extends "currency"
  ? CurrencyOptions
  : T extends "datetime" | "date" | "time"
    ? DatetimeOptions
    : T extends "badge"
      ? BadgeOptions
      : T extends "status"
        ? BadgeOptions
        : T extends "formatEnum"
          ? FormatEnumOptions
          : T extends "tags"
            ? TagsOptions
            : T extends "image"
              ? ImageOptions
              : T extends "avatar"
                ? AvatarOptions
                : T extends "relation"
                  ? RelationOptions
                  : T extends "multirelation"
                    ? MultiRelationOptions
                    : T extends "geolocation"
                      ? GeolocationOptions
                      : T extends "json"
                        ? JsonOptions
                        : T extends "color"
                          ? ColorOptions
                          : T extends "copyable"
                            ? CopyableOptions
                            : T extends "custom"
                              ? CustomOptions
                              : BaseColumnOptions;

/**
 * Obtiene las opciones de una columna con tipado seguro.
 */
export function getColumnOptions<T extends ColumnType>(
  column: DataTableColumn,
): ExtractOptions<T> {
  return (column.options ?? {}) as ExtractOptions<T>;
}
