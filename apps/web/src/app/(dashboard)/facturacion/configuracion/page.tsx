"use client";

import { useEffect, useState } from "react";
import {
  fetchBillingProviders,
  createOrUpdateBillingProvider,
  testBillingProviderConnection,
  deactivateBillingProvider,
  type InvoiceProviderConfig,
  type InvoiceProviderType,
  type CountryCode,
} from "@/lib/api/billing-api";
import { toast } from "@heroui/react";

const PROVIDER_LABELS: Record<InvoiceProviderType, string> = {
  ALEGRA: "Alegra",
  SIIGO: "Siigo",
  FACTURATECH: "FacturaTech",
  CARVAJAL: "Carvajal",
  LOGGRO: "Loggro",
  QUICKBOOKS: "QuickBooks",
  XERO: "Xero",
  ZOHO: "Zoho Books",
  STRIPE: "Stripe Invoicing",
  SAP: "SAP",
  NETSUITE: "Oracle NetSuite",
  DYNAMICS: "Microsoft Dynamics",
  ODOO: "Odoo",
};

const STATUS_CHIP: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
};

export default function FacturacionConfiguracionPage() {
  const [providers, setProviders] = useState<InvoiceProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [healthResult, setHealthResult] = useState<Record<string, { healthy: boolean; message: string }>>({});

  const [form, setForm] = useState({
    providerType: "ALEGRA" as InvoiceProviderType,
    countryCode: "CO" as CountryCode,
    currency: "COP",
    isDefault: true,
    email: "",
    token: "",
    resolutionNumber: "",
    resolutionPrefix: "",
    taxRegime: "SIMPLIFICADO",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchBillingProviders()
      .then(setProviders)
      .catch(() => toast.danger("No se pudo cargar la configuración de proveedores"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createOrUpdateBillingProvider({
        providerType: form.providerType,
        countryCode: form.countryCode,
        currency: form.currency,
        isDefault: form.isDefault,
        credentials: { email: form.email, token: form.token },
        resolutionNumber: form.resolutionNumber || undefined,
        resolutionPrefix: form.resolutionPrefix || undefined,
        taxRegime: form.taxRegime || undefined,
      });
      toast.success("Proveedor configurado correctamente");
      setDrawerOpen(false);
      load();
    } catch {
      toast.danger("No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const result = await testBillingProviderConnection(id);
      setHealthResult((prev) => ({ ...prev, [id]: result }));
      if (result.healthy) {
        toast.success("Conexión exitosa con el proveedor");
      } else {
        toast.danger(result.message || "Falló la conexión");
      }
    } catch {
      toast.danger("Error al probar la conexión");
    } finally {
      setTesting(null);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateBillingProvider(id);
      toast.success("Proveedor desactivado");
      load();
    } catch {
      toast.danger("No se pudo desactivar el proveedor");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Proveedores de Facturación</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configura Alegra u otros proveedores. Cada tenant puede tener su propio proveedor activo.
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Agregar proveedor
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-default-200 bg-default-50" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-default-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">No hay proveedores configurados</p>
          <p className="mt-1 text-xs text-slate-400">
            Agrega Alegra para comenzar a emitir facturas electrónicas en Colombia
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => {
            const health = healthResult[p.id];
            return (
              <div key={p.id} className="rounded-xl border border-default-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{PROVIDER_LABELS[p.providerType] ?? p.providerType}</p>
                      {p.isDefault && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          Por defecto
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.isActive ? STATUS_CHIP.active : STATUS_CHIP.inactive}`}>
                        {p.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      País: {p.countryCode} · Moneda: {p.currency}
                      {p.resolutionNumber ? ` · Resolución: ${p.resolutionNumber}` : ""}
                      {p.taxRegime ? ` · Régimen: ${p.taxRegime}` : ""}
                    </p>
                    {p.hasCredentials && (
                      <p className="mt-0.5 text-xs text-slate-400">Credenciales configuradas ✓</p>
                    )}
                    {health && (
                      <p className={`mt-1 text-xs font-medium ${health.healthy ? "text-emerald-600" : "text-red-600"}`}>
                        {health.healthy ? "✓" : "✗"} {health.message}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleTest(p.id)}
                      disabled={testing === p.id}
                      className="rounded-lg border border-default-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {testing === p.id ? "Probando..." : "Probar conexión"}
                    </button>
                    <button
                      onClick={() => handleDeactivate(p.id)}
                      className="rounded-lg border border-danger-200 px-3 py-1.5 text-xs font-semibold text-danger-600 hover:bg-danger-50"
                    >
                      Desactivar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer for new provider */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button className="flex-1 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="flex w-full max-w-md flex-col border-l border-default-200 bg-white shadow-none">
            <div className="flex items-center justify-between border-b border-default-200 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Configurar proveedor</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Proveedor</label>
                <select
                  value={form.providerType}
                  onChange={(e) => setForm((f) => ({ ...f, providerType: e.target.value as InvoiceProviderType }))}
                  className="w-full rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {(Object.keys(PROVIDER_LABELS) as InvoiceProviderType[]).map((k) => (
                    <option key={k} value={k}>{PROVIDER_LABELS[k]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">País</label>
                  <select
                    value={form.countryCode}
                    onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value as CountryCode }))}
                    className="w-full rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {["CO", "MX", "PE", "CL", "AR", "US", "ES"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Moneda</label>
                  <input
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                    maxLength={3}
                    className="w-full rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {form.providerType === "ALEGRA" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Email Alegra</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="tu@empresa.com"
                      className="w-full rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Token API Alegra</label>
                    <input
                      type="password"
                      value={form.token}
                      onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                      placeholder="Token de acceso"
                      className="w-full rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </>
              )}

              {form.countryCode === "CO" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Resolución DIAN</label>
                      <input
                        value={form.resolutionNumber}
                        onChange={(e) => setForm((f) => ({ ...f, resolutionNumber: e.target.value }))}
                        placeholder="18760000001"
                        className="w-full rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Prefijo</label>
                      <input
                        value={form.resolutionPrefix}
                        onChange={(e) => setForm((f) => ({ ...f, resolutionPrefix: e.target.value }))}
                        placeholder="FEV"
                        className="w-full rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Régimen tributario</label>
                    <select
                      value={form.taxRegime}
                      onChange={(e) => setForm((f) => ({ ...f, taxRegime: e.target.value }))}
                      className="w-full rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="SIMPLIFICADO">Simplificado</option>
                      <option value="RESPONSABLE_IVA">Responsable de IVA</option>
                    </select>
                  </div>
                </>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded"
                />
                Establecer como proveedor por defecto
              </label>
            </div>
            <div className="flex gap-3 border-t border-default-200 px-6 py-4">
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 rounded-lg border border-default-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar configuración"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
