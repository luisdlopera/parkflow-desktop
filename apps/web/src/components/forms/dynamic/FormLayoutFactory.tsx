"use client";

import React from "react";
import { Control } from "react-hook-form";
import { EntryFormRegistry, type RegisteredFieldKey } from "./form-registry";

interface FormLayoutFactoryProps {
  layout: RegisteredFieldKey[];
  control: Control<any>;
  selectedVehicleType: string;
  skipConditionCheck?: boolean;
}

export function FormLayoutFactory({
  layout,
  control,
  selectedVehicleType,
  skipConditionCheck = false,
}: FormLayoutFactoryProps) {
  return (
    <>
      {layout.map((fieldKey) => {
        const FieldComponent = EntryFormRegistry[fieldKey];
        if (!FieldComponent) return null;

        // Pasamos props específicas según el tipo de campo si es necesario
        if (fieldKey === "vehicle_condition") {
          const VehicleConditionComponent = FieldComponent as React.ComponentType<{
            control: Control<any>;
            skipConditionCheck: boolean;
          }>;
          return (
            <VehicleConditionComponent
              key={fieldKey}
              control={control}
              skipConditionCheck={skipConditionCheck}
            />
          );
        }

        if (fieldKey === "helmet_section") {
          const HelmetSectionComponent = FieldComponent as React.ComponentType<{
            control: Control<any>;
            selectedVehicleType: string;
          }>;
          return (
            <HelmetSectionComponent
              key={fieldKey}
              control={control}
              selectedVehicleType={selectedVehicleType}
            />
          );
        }

        // Caso base general
        const GeneralComponent = FieldComponent as React.ComponentType<{
          control: Control<any>;
        }>;
        return <GeneralComponent key={fieldKey} control={control} />;
      })}
    </>
  );
}
