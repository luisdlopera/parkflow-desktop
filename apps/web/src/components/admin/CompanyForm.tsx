"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { requiredString, emailSchema, positiveNumber, nonNegativeNumber } from "@/lib/validation";
import { InlineFieldError } from "@/components/feedback/InlineFieldError";
import { FormErrorSummary } from "@/components/feedback/FormErrorSummary";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";

interface CompanyFormProps {
  onSubmit: (data: CreateCompanyRequest) => Promise<void>;
  isLoading?: boolean;
}

const plans: { value: PlanType; label: string }[] = [
  { value: "LOCAL", label: "Local / Offline" },
  { value: "SYNC", label: "Sync / Cloud" },
  { value: "PRO", label: "Pro / Multi-sede" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

const companySchema = z.object({
  name: requiredString("Ingresa el nombre de la empresa."),
  nit: requiredString("Ingresa el NIT de la empresa."),
  email: emailSchema("Ingresa un correo electrónico válido."),
  phone: requiredString("Ingresa un número de teléfono."),
  city: requiredString("Ingresa la ciudad."),
  contactName: requiredString("Ingresa el nombre del administrador."),
  address: requiredString("Ingresa la dirección física."),
  plan: z.enum(["LOCAL", "SYNC", "PRO", "ENTERPRISE"] as const),
  maxDevices: positiveNumber("Mínimo 1 dispositivo."),
  maxLocations: positiveNumber("Mínimo 1 sede."),
  maxUsers: positiveNumber("Mínimo 1 usuario."),
  trialDays: nonNegativeNumber("Días de prueba inválidos."),
  offlineModeAllowed: z.boolean(),
});

type FormValues = z.infer<typeof companySchema>;

export function CompanyForm({ onSubmit, isLoading }: CompanyFormProps) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
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
    },
  });

  const selectedPlan = watch("plan");
  const features = getPlanFeatures(selectedPlan);

  const onFormSubmit = async (data: FormValues) => {
    try {
      setSubmitError(null);
      await onSubmit(data as CreateCompanyRequest);
    } catch (err) {
      const userError = getUserErrorMessage(err, "companies.create");
      setSubmitError(`${userError.title}: ${userError.description}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 pt-2">
      <FormErrorSummary message={submitError || undefined} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Nombre de la empresa *"
            placeholder="Ej: Parqueadero El Centro"
            {...register("name")}
            isInvalid={!!errors.name}
          />
          <InlineFieldError message={errors.name?.message} />
        </div>

        <div>
          <Input
            label="NIT *"
            placeholder="Ej: 900.123.456-7"
            {...register("nit")}
            isInvalid={!!errors.nit}
          />
          <InlineFieldError message={errors.nit?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Email *"
            placeholder="contacto@empresa.com"
            type="email"
            {...register("email")}
            isInvalid={!!errors.email}
          />
          <InlineFieldError message={errors.email?.message} />
        </div>

        <div>
          <Input
            label="Teléfono *"
            placeholder="Ej: +57 300 123 4567"
            {...register("phone")}
            isInvalid={!!errors.phone}
          />
          <InlineFieldError message={errors.phone?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Ciudad *"
            placeholder="Ej: Bogotá"
            {...register("city")}
            isInvalid={!!errors.city}
          />
          <InlineFieldError message={errors.city?.message} />
        </div>

        <div>
          <Input
            label="Nombre de contacto *"
            placeholder="Nombre del administrador"
            {...register("contactName")}
            isInvalid={!!errors.contactName}
          />
          <InlineFieldError message={errors.contactName?.message} />
        </div>
      </div>

      <div>
        <Textarea
          label="Dirección *"
          placeholder="Dirección física de la empresa"
          {...register("address")}
          isInvalid={!!errors.address}
        />
        <InlineFieldError message={errors.address?.message} />
      </div>

      <Divider className="my-2" />

      <Select
        label="Plan *"
        selectedKeys={[selectedPlan]}
        onSelectionChange={(keys) => {
          const plan = Array.from(keys)[0] as PlanType;
          setValue("plan", plan);
        }}
      >
        {plans.map((plan) => (
          <SelectItem key={plan.value} textValue={plan.label}>
            {plan.label}
          </SelectItem>
        ))}
      </Select>

      <div className="p-3 bg-default-50 border border-default-200 rounded-xl">
        <p className="text-xs font-bold text-default-700 uppercase tracking-wider mb-2">Características del plan:</p>
        <ul className="text-sm text-default-600 grid grid-cols-2 gap-x-4 gap-y-1">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <Divider className="my-2" />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Máx. dispositivos"
          type="number"
          {...register("maxDevices", { valueAsNumber: true })}
          isInvalid={!!errors.maxDevices}
        />

        <Input
          label="Máx. sedes"
          type="number"
          {...register("maxLocations", { valueAsNumber: true })}
          isInvalid={!!errors.maxLocations}
        />

        <Input
          label="Máx. usuarios"
          type="number"
          {...register("maxUsers", { valueAsNumber: true })}
          isInvalid={!!errors.maxUsers}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Días de prueba"
          type="number"
          {...register("trialDays", { valueAsNumber: true })}
          isInvalid={!!errors.trialDays}
        />

        <Select
          label="Modo offline permitido"
          selectedKeys={[watch("offlineModeAllowed") ? "true" : "false"]}
          onSelectionChange={(keys) => {
            const allowed = Array.from(keys)[0] === "true";
            setValue("offlineModeAllowed", allowed);
          }}
        >
          <SelectItem key="true" textValue="Sí">Sí</SelectItem>
          <SelectItem key="false" textValue="No">No</SelectItem>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="submit" 
          color="primary" 
          isLoading={isLoading}
          className="font-bold px-8"
        >
          {isLoading ? "Creando..." : "Crear Empresa"}
        </Button>
      </div>
    </form>
  );
}

