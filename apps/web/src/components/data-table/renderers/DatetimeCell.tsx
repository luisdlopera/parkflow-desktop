import React, { useMemo } from "react";
import { CellRendererProps, DatetimeOptions } from "../types";

/**
 * DatetimeCell — Renderiza fechas formateadas.
 * Soporta type: "date", "time", "datetime".
 */
const DatetimeCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const {
    format: formatStr,
    locale = "es-CO",
  } = (column.options as DatetimeOptions) ?? {};

  if (value === null || value === undefined || value === "") {
    return <span className="text-default-400 select-none">−</span>;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return <span className="text-danger-500">Invalid Date</span>;
  }

  const formatter = useMemo(() => {
    // Determinar el tipo real si el usuario lo omite
    const inferredType = (column.type === "date" || column.type === "time" || column.type === "datetime")
      ? column.type
      : "datetime";

    // If a string format is passed, assume it's a Intl.DateTimeFormat 'dateStyle'
    if (formatStr && typeof formatStr === "string") {
      return new Intl.DateTimeFormat(locale, { dateStyle: formatStr as Intl.DateTimeFormatOptions["dateStyle"] });
    }

    switch (inferredType) {
      case "date":
        return new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
      case "time":
        return new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "datetime":
      default:
        return new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
    }
  }, [locale, formatStr, column.type]);

  return <span className="text-foreground whitespace-nowrap">{formatter.format(date)}</span>;
};

export default DatetimeCell;
