"use client";

import React from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Separator, ListBox } from "@heroui/react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import type { CreateCompanyRequest, PlanType, Company } from "@/lib/licensing/types";
import { getPlanFeatures } from "@/lib/licensing/hooks";
import { requiredString, emailSchema, positiveNumber, nonNegativeNumber } from "@/lib/validation";
import { InlineFieldError } from "@/components/feedback/InlineFieldError";
import { FormErrorSummary } from "@/components/feedback/FormErrorSummary";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";
import { toast } from "@heroui/react";

const plans: { value: PlanType; label: string }[] = [
  { value: "LOCAL", label: "Local / Offline" },
  { value: "SYNC", label: "Sync / Cloud" },
  { value: "PRO", label: "Pro / Multi-sede" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

const companySchema = z.object({
  name: requiredString("Ingresa el nombre de la empresa."),
  nit: z.string().optional().or(z.literal("")),
  email: z.string().email({ message: "Ingresa un correo electrónico válido." }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  plan: z.enum(["LOCAL", "SYNC", "PRO", "ENTERPRISE"] as const),
  maxDevices: positiveNumber("Mínimo 1 dispositivo."),
  maxLocations: positiveNumber("Mínimo 1 sede."),
  maxUsers: positiveNumber("Mínimo 1 usuario."),
  trialDays: nonNegativeNumber("Días de prueba inválidos."),
  offlineModeAllowed: z.boolean(),
});

type FormValues = z.infer<typeof companySchema>;

interface CompanyFormProps {
  onSubmit: (data: CreateCompanyRequest) => Promise<void>;
  isLoading?: boolean;
  initialData?: Company;
}

export function CompanyForm({ onSubmit, isLoading, initialData }: CompanyFormProps) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    control,
    reset,
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

  // Reset form values when editing (initialData changes asynchronously)
  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        nit: initialData.nit || "",
        address: initialData.address || "",
        city: initialData.city || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        contactName: initialData.contactName || "",
        plan: initialData.plan || "LOCAL",
        maxDevices: initialData.maxDevices || 1,
        maxLocations: initialData.maxLocations || 1,
        maxUsers: initialData.maxUsers || 5,
        trialDays: initialData.trialDays ?? 14,
        offlineModeAllowed: initialData.offlineModeAllowed ?? true,
      });
    }
  }, [initialData, reset]);

  const selectedPlan = useWatch({ control, name: "plan" });
  const offlineModeAllowed = useWatch({ control, name: "offlineModeAllowed" });
  const features = getPlanFeatures(selectedPlan);

  const toastError = toast.danger;

  const onFormSubmit = async (data: FormValues) => {
    try {
      setSubmitError(null);
      await onSubmit(data as CreateCompanyRequest);
    } catch (err) {
      const userError = getUserErrorMessage(err, "companies.create");
      setSubmitError(`${userError.title}: ${userError.description}`);
      toastError(`${userError.title}: ${userError.description}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 pt-2">
      <FormErrorSummary message={submitError || undefined} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                label="Nombre de la empresa *"
                placeholder="Ej: Parqueadero El Centro"
                {...field}
                isInvalid={!!errors.name}
              />
            )}
          />
          <InlineFieldError message={errors.name?.message} />
        </div>

        <div>
          <Controller
            name="nit"
            control={control}
            render={({ field }) => (
              <Input
                label="NIT (Opcional)"
                placeholder="Ej: 900.123.456-7"
                {...field}
                isInvalid={!!errors.nit}
              />
            )}
          />
          <InlineFieldError message={errors.nit?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                label="Email"
                placeholder="contacto@empresa.com"
                type="email"
                {...field}
                isInvalid={!!errors.email}
              />
            )}
          />
          <InlineFieldError message={errors.email?.message} />
        </div>

        <div>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                label="Teléfono"
                placeholder="Ej: +57 300 123 4567"
                {...field}
                isInvalid={!!errors.phone}
              />
            )}
          />
          <InlineFieldError message={errors.phone?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Input
                label="Ciudad"
                placeholder="Ej: Bogotá"
                {...field}
                isInvalid={!!errors.city}
              />
            )}
          />
          <InlineFieldError message={errors.city?.message} />
        </div>

        <div>
          <Controller
            name="contactName"
            control={control}
            render={({ field }) => (
              <Input
                label="Nombre de contacto"
                placeholder="Nombre del administrador"
                {...field}
                isInvalid={!!errors.contactName}
              />
            )}
          />
          <InlineFieldError message={errors.contactName?.message} />
        </div>
      </div>

      <div>
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <TextArea
              label="Dirección"
              placeholder="Dirección física de la empresa"
              {...field}
              isInvalid={!!errors.address}
            />
          )}
        />
        <InlineFieldError message={errors.address?.message} />
      </div>

      <Separator className="my-2" />

      <Select
        label="Plan *"
        value={[selectedPlan]}
        onChange={(keys) => {
          const plan = Array.from(keys)[0] as PlanType;
          setValue("plan", plan);
        }}
      >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

        {plans.map((plan) => (
          <ListBox.Item id={plan.value} key={plan.value} textValue={plan.label}>
            {plan.label}
          </ListBox.Item>
        ))}
      
        </ListBox>
      </Select.Popover>
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

      <Separator className="my-2" />

      <div className="grid grid-cols-3 gap-4">
        <Controller
          name="maxDevices"
          control={control}
          render={({ field }) => (
            <Input
              label="Máx. dispositivos"
              type="number"
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
              isInvalid={!!errors.maxDevices}
            />
          )}
        />

        <Controller
          name="maxLocations"
          control={control}
          render={({ field }) => (
            <Input
              label="Máx. sedes"
              type="number"
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
              isInvalid={!!errors.maxLocations}
            />
          )}
        />

        <Controller
          name="maxUsers"
          control={control}
          render={({ field }) => (
            <Input
              label="Máx. usuarios"
              type="number"
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
              isInvalid={!!errors.maxUsers}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="trialDays"
          control={control}
          render={({ field }) => (
            <Input
              label="Días de prueba"
              type="number"
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
              isInvalid={!!errors.trialDays}
            />
          )}
        />

        <Select
          label="Modo offline permitido"
          value={[offlineModeAllowed ? "true" : "false"]}
          onChange={(keys) => {
            const allowed = Array.from(keys)[0] === "true";
            setValue("offlineModeAllowed", allowed);
          }}
        >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

          <ListBox.Item id="true" textValue="Sí">Sí</ListBox.Item>
          <ListBox.Item id="false" textValue="No">No</ListBox.Item>
        
        </ListBox>
      </Select.Popover>
    </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="submit" 
          color="primary" 
          isLoading={isLoading}
          className="font-bold px-8"
        >
          {isLoading ? "Guardando..." : (initialData ? "Actualizar Empresa" : "Crear Empresa")}
        </Button>
      </div>
    </form>
  );
}

