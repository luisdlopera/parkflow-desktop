/**
 * Sistema de DataTable extensible tipo SolvyX para ParkFlow
 * 
 * Este módulo centraliza el renderizado de celdas en tablas,
 * permitiendo definir el tipo de columna (`type`) y sus opciones
 * en lugar de renderizar manualmente en cada vista.
 * 
 * Flujo de uso típico:
 * 
 * ```tsx
 * import { DataTable, DataTableColumn } from "@/components/data-table";
 * 
 * const columns: DataTableColumn<Vehicle>[] = [
 *   { key: "plate", label: "Placa", type: "text" },
 *   { key: "vehicleType", label: "Tipo", type: "formatEnum",
 *     options: { labelMap: { CAR: "Carro", MOTORCYCLE: "Moto" } } },
 *   { key: "status", label: "Estado", type: "status",
 *     options: { colorMap: { ACTIVE: "success" }, labelMap: { ACTIVE: "Activo" } } },
 *   { key: "createdAt", label: "Fecha", type: "datetime" }
 * ];
 * 
 * <DataTable columns={columns} data={vehicles} />
 * ```
 */

export { DataTableCellRenderer } from "./DataTableCellRenderer";
export {
  getCellRenderer,
  registerCellRenderer,
  mapFormatToType,
} from "./cellRegistry";
export type {
  ColumnType,
  DataTableColumn,
  CellRendererProps,
  CellRendererComponent,
  BaseColumnOptions,
  CurrencyOptions,
  DatetimeOptions,
  BadgeOptions,
  FormatEnumOptions,
  TagsOptions,
  ImageOptions,
  AvatarOptions,
  RelationOptions,
  MultiRelationOptions,
  GeolocationOptions,
  JsonOptions,
  ColorOptions,
  CopyableOptions,
  CustomOptions,
  ExtractOptions,
  getColumnOptions,
} from "./types";
