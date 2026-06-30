"use client";

import { useEffect, useMemo, useState } from "react";
import { PricingBuilder, pricingConfigurationToRatePayload, rateRowToPricingConfiguration } from "@/features/pricing-builder";
import { fetchMasterVehicleTypes } from "@/lib/api/vehicle-types-api";
import { saveRate, type RateRow } from "@/lib/api/rates-api";
import { errorService } from "@/lib/errors/error-service";

export function RateForm({
  auditReason,
  initial,
  onCancel,
  onSaved,
  onError,
}: {
  auditReason: string;
  initial: RateRow | (Partial<RateRow> & { name: string });
  onCancel: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [vehicleTypes, setVehicleTypes] = useState<{ code: string; name: string }[]>([]);
  const [draft, setDraft] = useState(() => rateRowToPricingConfiguration(initial));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMasterVehicleTypes().then(setVehicleTypes).catch(() => {});
  }, []);

  const vehicleTypeCodes = useMemo(() => vehicleTypes.map((vehicleType) => vehicleType.code), [vehicleTypes]);

  return (
    <div className="surface rounded-2xl p-4">
      <PricingBuilder
        mode="configuration"
        value={draft}
        vehicleTypes={vehicleTypeCodes}
        isSaving={saving}
        onChange={setDraft}
        onCancel={onCancel}
        onSubmit={async (config) => {
          setSaving(true);
          try {
            await saveRate(pricingConfigurationToRatePayload(config), (initial as RateRow).id || undefined, auditReason);
            await onSaved();
          } catch (error) {
            onError(errorService.normalize(error).message);
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
