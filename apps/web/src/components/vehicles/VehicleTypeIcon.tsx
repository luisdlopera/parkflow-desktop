import React from "react";
import {
  Car,
  Bike,
  CarFront,
  Truck,
  Bus,
  Zap,
  HelpCircle,
} from "lucide-react";

export type VehicleTypeCode =
  | "CAR"
  | "MOTORCYCLE"
  | "BICYCLE"
  | "VAN"
  | "TRUCK"
  | "BUS"
  | "ELECTRIC"
  | "OTHER"
  | string;

const VEHICLE_ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  CAR: Car,
  MOTORCYCLE: Bike,
  BICYCLE: Bike,
  VAN: CarFront,
  TRUCK: Truck,
  BUS: Bus,
  ELECTRIC: Zap,
  OTHER: HelpCircle,
};

interface VehicleTypeIconProps {
  code: VehicleTypeCode;
  icon?: string | null;
  className?: string;
  size?: number;
}

export function VehicleTypeIcon({ code, icon, className = "w-5 h-5", size }: VehicleTypeIconProps) {
  const IconComponent = VEHICLE_ICON_MAP[code] || HelpCircle;
  return <IconComponent className={className} size={size} />;
}

export function getVehicleTypeIconComponent(code: VehicleTypeCode) {
  return VEHICLE_ICON_MAP[code] || HelpCircle;
}
