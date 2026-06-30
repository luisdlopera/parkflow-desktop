import { ColumnType, CellRendererComponent } from "./types";

import FallbackCell from "./renderers/FallbackCell";
import TextCell from "./renderers/TextCell";
import NumberCell from "./renderers/NumberCell";
import PercentCell from "./renderers/PercentCell";
import CurrencyCell from "./renderers/CurrencyCell";
import DatetimeCell from "./renderers/DatetimeCell";
import BooleanCell from "./renderers/BooleanCell";
import BadgeCell from "./renderers/BadgeCell";
import StatusCell from "./renderers/StatusCell";
import FormatEnumCell from "./renderers/FormatEnumCell";
import TagsCell from "./renderers/TagsCell";
import ImageCell from "./renderers/ImageCell";
import ColorCell from "./renderers/ColorCell";
import GeolocationCell from "./renderers/GeolocationCell";
import JsonCell from "./renderers/JsonCell";
import CopyableCell from "./renderers/CopyableCell";
import CustomCell from "./renderers/CustomCell";
import EmailCell from "./renderers/EmailCell";
import PhoneCell from "./renderers/PhoneCell";
import UrlCell from "./renderers/UrlCell";
import IconCell from "./renderers/IconCell";
import ProgressCell from "./renderers/ProgressCell";
import RatingCell from "./renderers/RatingCell";
import RelationCell from "./renderers/RelationCell";
import MultiRelationCell from "./renderers/MultiRelationCell";
import ActionsCell from "./renderers/ActionsCell";

/**
 * Registro de renderizadores de celda.
 * Cada ColumnType se mapea a un componente React que renderiza su celda.
 * 
 * IMPORTANTE: Si necesitas agregar un nuevo tipo:
 * 1. Crear componente en renderers/MiTipoCell.tsx
 * 2. Importarlo aquí
 * 3. Agregar al objeto `registry`
 */
const registry: Record<ColumnType, CellRendererComponent> = {
  text: TextCell,
  number: NumberCell,
  currency: CurrencyCell,
  percent: PercentCell,
  date: DatetimeCell,
  time: DatetimeCell,
  datetime: DatetimeCell,
  boolean: BooleanCell,
  badge: BadgeCell,
  status: StatusCell,
  formatEnum: FormatEnumCell,
  tags: TagsCell,
  image: ImageCell,
  avatar: ImageCell,             // Alias: avatar usa el mismo renderer que image
  relation: RelationCell,
  multirelation: MultiRelationCell,
  geolocation: GeolocationCell,
  color: ColorCell,
  json: JsonCell,
  email: EmailCell,
  phone: PhoneCell,
  url: UrlCell,
  icon: IconCell,
  progress: ProgressCell,
  rating: RatingCell,
  copyable: CopyableCell,
  actions: ActionsCell,
  custom: CustomCell,
};

/**
 * Obtiene el renderer de celda para un tipo de columna.
 * Si no existe, devuelve FallbackCell.
 */
export function getCellRenderer(type: ColumnType): CellRendererComponent {
  return registry[type] ?? FallbackCell;
}

/**
 * Registra un nuevo renderer de celda para un tipo existente o nuevo.
 * Útil para extender el sistema sin modificar el código base.
 * 
 * @example
 * registerCellRenderer("myType", MyCustomCell);
 */
export function registerCellRenderer(
  type: ColumnType,
  renderer: CellRendererComponent
): void {
  registry[type] = renderer;
}

/**
 * Mapeo legacy: convierte valores de `format` a `type`.
 * Se mantiene por compatibilidad con tablas existentes.
 * 
 * @deprecated Usa directamente `type` en vez de `format` en columnas nuevas.
 */
export function mapFormatToType(format: string): ColumnType {
  const map: Record<string, ColumnType> = {
    currency: "currency",
    datetime: "datetime",
    date: "date",
    boolean: "boolean",
    badge: "badge",
  };
  return map[format] ?? "text";
}
