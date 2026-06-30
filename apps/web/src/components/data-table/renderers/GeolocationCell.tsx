import React from "react";
import { Link } from "@heroui/react";
import { CellRendererProps, GeolocationOptions } from "../types";
import { MapPin } from "lucide-react";

/**
 * GeolocationCell — Renderiza coordenadas con enlace a Google Maps.
 * Opciones: latKey, lngKey, showMapLink.
 */
const GeolocationCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const opts = (column.options ?? {}) as GeolocationOptions;
  const { showMapLink = true } = opts;

  if (!value || typeof value !== "object") {
    return <span className="text-default-400 select-none">−</span>;
  }

  // Support both string keys and lat/lng object structure
  let lat: number | string | undefined;
  let lng: number | string | undefined;

  if ("lat" in value && "lng" in value) {
    lat = (value as any).lat;
    lng = (value as any).lng;
  } else if ("latitude" in value && "longitude" in value) {
    lat = (value as any).latitude;
    lng = (value as any).longitude;
  } else {
    return <span className="text-default-400 select-none">−</span>;
  }

  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return <span className="text-default-400 select-none">−</span>;
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return <span className="text-default-400 select-none">−</span>;
  }

  if (!showMapLink) {
    return (
      <span className="text-foreground font-mono text-xs">
        {latNum.toFixed(6)}, {lngNum.toFixed(6)}
      </span>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`;

  return (
    <Link
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <MapPin className="size-4" />
      <span>Ver en mapa</span>
    </Link>
  );
};

export default GeolocationCell;
