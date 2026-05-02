"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  Divider,
} from "@heroui/react";
import type { CreateCompanyRequest, PlanType } from "@/lib/licensing/types";
import { getPlanFeatures } from "@/lib/licensing/hooks";

interface CompanyFormProps {
  onSubmit: (data: CreateCompanyRequest) => void;
  isLoading?: boolean;
}

const plans: { value: PlanType; label: string }[] = [
  { value: "LOCAL", label: "Local / Offline" },
  { value: "SYNC", label: "Sync / Cloud" },
  { value: "PRO", label: "Pro / Multi-sede" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

export function CompanyForm({ onSubmit, isLoading }: CompanyFormProps) {
  const [formData, setFormData] = useState<CreateCompanyRequest>({
    name: "",
    nit: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    contactName: "",
    plan: "LOCAL",
    maxDevices: 1,
    maxLocations: 1,
    maxUsers: 5,
    trialDays: 14,
    offlineModeAllowed: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const features = getPlanFeatures(formData.plan);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre de la empresa *"
          placeholder="Ej: Parqueadero El Centro"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          isRequired
        />

        <Input
          label="NIT"
          placeholder="Ej: 900.123.456-7"
          value={formData.nit}
          onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          placeholder="contacto@empresa.com"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <Input
          label="Teléfono"
          placeholder="Ej: +57 300 123 4567"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Ciudad"
          placeholder="Ej: Bogotá"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
        />

        <Input
          label="Nombre de contacto"
          placeholder="Nombre del administrador"
          value={formData.contactName}
          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
        />
      </div>

      <Textarea
        label="Dirección"
        placeholder="Dirección física de la empresa"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
      />

      <Divider />

      <Select
        label="Plan *"
        selectedKeys={[formData.plan]}
        onSelectionChange={(keys) => {
          const plan = Array.from(keys)[0] as PlanType;
          setFormData({ ...formData, plan });
        }}
      >
        {plans.map((plan) => (
          <SelectItem key={plan.value}>
            {plan.label}
          </SelectItem>
        ))}
      </Select>

      <div className="p-3 bg-default-100 rounded-lg">
        <p className="text-sm font-medium mb-2">Características incluidas:</p>
        <ul className="text-sm text-default-600 space-y-1">
          {features.map((feature, i) => (
            <li key={i}>• {feature}</li>
          ))}
        </ul>
      </div>

      <Divider />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Máx. dispositivos"
          type="number"
          min={1}
          max={100}
          value={formData.maxDevices?.toString()}
          onChange={(e) =>
            setFormData({ ...formData, maxDevices: parseInt(e.target.value) || 1 })
          }
        />

        <Input
          label="Máx. sedes"
          type="number"
          min={1}
          max={50}
          value={formData.maxLocations?.toString()}
          onChange={(e) =>
            setFormData({ ...formData, maxLocations: parseInt(e.target.value) || 1 })
          }
        />

        <Input
          label="Máx. usuarios"
          type="number"
          min={1}
          max={500}
          value={formData.maxUsers?.toString()}
          onChange={(e) =>
            setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Días de prueba"
          type="number"
          min={0}
          max={90}
          value={formData.trialDays?.toString()}
          onChange={(e) =>
            setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })
          }
        />

        <Select
          label="Modo offline permitido"
          selectedKeys={[formData.offlineModeAllowed ? "true" : "false"]}
          onSelectionChange={(keys) => {
            const allowed = Array.from(keys)[0] === "true";
            setFormData({ ...formData, offlineModeAllowed: allowed });
          }}
        >
          <SelectItem key="true">Sí</SelectItem>
          <SelectItem key="false">No</SelectItem>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" color="primary" isLoading={isLoading}>
          Crear Empresa
        </Button>
      </div>
    </form>
  );
}
