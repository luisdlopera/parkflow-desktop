"use client";
import React from "react";
import { Controller } from "react-hook-form";
import { ListBox, SearchField } from "@heroui/react";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ManualMovementForm({ p, contains }: any) {
  return (
    <>
      <h3 className="mt-8 text-base font-semibold text-slate-900">Ingreso / egreso manual</h3>
      <div className="mt-3 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 items-end">
        <Autocomplete label="Tipo de movimiento" placeholder="Seleccionar tipo" selectionMode="single"
          value={p.manualType}
          onChange={(key: any) => p.manualForm.setValue("manualType", (key as string) ?? "")}
          isDisabled={!p.perms.canMove}>
          <Autocomplete.Trigger><Autocomplete.Value /><Autocomplete.ClearButton /><Autocomplete.Indicator /></Autocomplete.Trigger>
          <Autocomplete.Popover>
            <Autocomplete.Filter filter={contains}>
              <SearchField autoFocus name="search" variant="secondary" aria-label="Buscar tipo">
                <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Buscar tipo..." /><SearchField.ClearButton /></SearchField.Group>
              </SearchField>
              <ListBox>
                <ListBox.Item key="MANUAL_INCOME" id="MANUAL_INCOME" textValue="Ingreso manual">Ingreso manual</ListBox.Item>
                <ListBox.Item key="MANUAL_EXPENSE" id="MANUAL_EXPENSE" textValue="Egreso manual">Egreso manual</ListBox.Item>
                <ListBox.Item key="WITHDRAWAL" id="WITHDRAWAL" textValue="Retiro">Retiro / Transferencia a Tesorería</ListBox.Item>
                <ListBox.Item key="CUSTOMER_REFUND" id="CUSTOMER_REFUND" textValue="Devolucion">Devolucion al cliente</ListBox.Item>
                <ListBox.Item key="DISCOUNT" id="DISCOUNT" textValue="Descuento">Descuento</ListBox.Item>
                <ListBox.Item key="ADJUSTMENT" id="ADJUSTMENT" textValue="Ajuste">Ajuste autorizado</ListBox.Item>
                <ListBox.Item key="REPRINT_FEE" id="REPRINT_FEE" textValue="Reimpresion">Reimpresion cobrada</ListBox.Item>
              </ListBox>
            </Autocomplete.Filter>
          </Autocomplete.Popover>
        </Autocomplete>
        <Autocomplete label="Medio de pago" placeholder="Seleccionar medio" selectionMode="single"
          value={p.manualMethod}
          onChange={(key: any) => p.manualForm.setValue("manualMethod", (key as string) ?? "")}
          isDisabled={!p.perms.canMove}>
          <Autocomplete.Trigger><Autocomplete.Value /><Autocomplete.ClearButton /><Autocomplete.Indicator /></Autocomplete.Trigger>
          <Autocomplete.Popover>
            <Autocomplete.Filter filter={contains}>
              <SearchField autoFocus name="search" variant="secondary" aria-label="Buscar medio">
                <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Buscar medio..." /><SearchField.ClearButton /></SearchField.Group>
              </SearchField>
              <ListBox>
                <ListBox.Item key="CASH" id="CASH" textValue="Efectivo">Efectivo</ListBox.Item>
                <ListBox.Item key="DEBIT_CARD" id="DEBIT_CARD" textValue="Tarjeta débito">Tarjeta débito</ListBox.Item>
                <ListBox.Item key="CREDIT_CARD" id="CREDIT_CARD" textValue="Tarjeta crédito">Tarjeta crédito</ListBox.Item>
                <ListBox.Item key="CARD" id="CARD" textValue="Tarjeta legacy">Tarjeta legacy</ListBox.Item>
                <ListBox.Item key="QR" id="QR" textValue="QR">QR</ListBox.Item>
                <ListBox.Item key="NEQUI" id="NEQUI" textValue="Nequi">Nequi</ListBox.Item>
                <ListBox.Item key="DAVIPLATA" id="DAVIPLATA" textValue="Daviplata">Daviplata</ListBox.Item>
                <ListBox.Item key="TRANSFER" id="TRANSFER" textValue="Transferencia">Transferencia</ListBox.Item>
                <ListBox.Item key="AGREEMENT" id="AGREEMENT" textValue="Convenio">Convenio</ListBox.Item>
                <ListBox.Item key="INTERNAL_CREDIT" id="INTERNAL_CREDIT" textValue="Crédito interno">Crédito interno</ListBox.Item>
                <ListBox.Item key="OTHER" id="OTHER" textValue="Otro">Otro</ListBox.Item>
                <ListBox.Item key="MIXED" id="MIXED" textValue="Mixto">Mixto</ListBox.Item>
              </ListBox>
            </Autocomplete.Filter>
          </Autocomplete.Popover>
        </Autocomplete>
        <Controller name="manualAmount" control={p.manualForm.control}
          render={({ field }) => <Input label="Valor" size="sm" type="number" {...field} isDisabled={!p.perms.canMove} />}
        />
        <Controller name="manualReason" control={p.manualForm.control}
          render={({ field }) => <Input label="Motivo" size="sm" {...field} isDisabled={!p.perms.canMove} />}
        />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1 font-bold" color="primary"
          isDisabled={p.busy || !p.perms.canMove} isLoading={p.busy}
          onPress={() => { p.manualForm.handleSubmit(p.onAddManual)().catch(console.error); }}>
          Registrar movimiento
        </Button>
        <Button className="flex-1 font-semibold" variant="outline" color="primary"
          isDisabled={p.busy || p.allMovements.length === 0}
          onPress={() => { p.onPrintLastMovement().catch(console.error); }}>
          Imprimir ultimo movimiento
        </Button>
      </div>
    </>
  );
}
