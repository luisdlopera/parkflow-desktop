"use client";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { currentUser } from "@/features/auth/services/auth-domain.service";
import { usePermissions } from "@/hooks/auth/usePermissions";
import type { Permission } from "@parkflow/types";

const SetupBasicoTab = dynamic(() => import("@/features/configuration/components/ui/SetupBasicoTab").then((m) => ({ default: m.SetupBasicoTab })), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando configuración...</p>,
});
const ModulesTab = dynamic(() => import("@/features/configuration/components/ui/ModulesTab").then((m) => ({ default: m.ModulesTab })), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando módulos...</p>,
});
const RatesSection = dynamic(() => import("@/features/configuration/components/RatesSection"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando tarifas...</p>,
});
const UsersSection = dynamic(() => import("@/features/configuration/components/UsersSection"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando usuarios...</p>,
});
const ParametersSection = dynamic(() => import("@/features/configuration/components/ParametersSection"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando parámetros...</p>,
});
const InterfaceSection = dynamic(() => import("@/features/configuration/components/InterfaceSection"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando interfaz...</p>,
});
const MastersSection = dynamic(() => import("@/features/configuration/components/MastersSection"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando maestros...</p>,
});
const MonthlySection = dynamic(() => import("@/features/configuration/components/MonthlySection"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando mensualidades...</p>,
});
const AgreementsSection = dynamic(() => import("@/features/configuration/components/AgreementsSection"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando convenios...</p>,
});
const PrepaidSection = dynamic(() => import("@/features/configuration/components/PrepaidSection"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando prepagados...</p>,
});
const OnboardingSection = dynamic(() => import("@/features/configuration/components/OnboardingSection"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando asistente...</p>,
});
const FeatureFlagsSection = dynamic(() => import("@/features/configuration/components/ui/FeatureFlagsSection").then((m) => ({ default: m.FeatureFlagsSection })), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando características...</p>,
});

function Notice({ kind, text }: { kind: "ok" | "err" | "info"; text: string }) {
  let cls = "border-slate-200 bg-slate-50 text-slate-800";
  if (kind === "ok") cls = "border-emerald-200 bg-emerald-50 text-emerald-900";
  else if (kind === "err") cls = "border-rose-200 bg-rose-50 text-rose-900";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`} role="status">
      {text}
    </div>
  );
}

const SECTION_CONFIG: Record<string, { label: string; title: string; description: string }> = {
  onboarding: { label: "Asistente Inicial", title: "Parametrización y Características del Negocio", description: "Ejecuta el asistente de configuración inicial y define las características operativas de tu parqueadero." },
  setup: { label: "Operación Básica", title: "Configuración de operación", description: "Configura los parámetros básicos de tu parqueadero: capacidad, turnos, región y cascos." },
  modules: { label: "Módulos", title: "Módulos y características", description: "Habilita o deshabilita módulos según tu plan de suscripción." },
  rates: { label: "Tarifas", title: "Tarifas de estacionamiento", description: "Configura las tarifas por tipo de vehículo, fracciones de tiempo y topes de cobro." },
  monthly: { label: "Mensualidades", title: "Mensualidades y contratos", description: "Administra los contratos mensuales de estacionamiento para clientes recurrentes." },
  agreements: { label: "Convenios", title: "Convenios empresariales", description: "Gestiona los convenios con empresas y organizaciones para tarifas preferenciales." },
  prepaid: { label: "Prepagados", title: "Paquetes prepagados", description: "Administra los paquetes de horas prepagadas para clientes." },
  users: { label: "Usuarios", title: "Usuarios del sistema", description: "Administra los usuarios, roles y permisos del sistema de estacionamiento." },
  parameters: { label: "Parámetros", title: "Parámetros del sistema", description: "Configura los parámetros generales del parqueadero, facturación e integraciones." },
  interface: { label: "Interfaz", title: "Personalización de interfaz", description: "Ajusta la apariencia y comportamiento de la interfaz de usuario." },
  masters: { label: "Maestros", title: "Tipos de vehículo", description: "Administra los tipos de vehículo, íconos y colores del sistema." }
};

export default function ConfiguracionPage() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const [notice, setNotice] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [auditReason] = useState("");
  const { perms: perm, refresh: refreshPerms } = usePermissions();
  const [companyId, setCompanyId] = useState("");
  const [uiSettings, setUiSettings] = useState({ showSystemStatus: true, showKeyboardShortcuts: true });

  useEffect(() => {
    const saved = localStorage.getItem("parkflow_ui_settings");
    if (saved) {
      try { setUiSettings(JSON.parse(saved)); } catch { localStorage.removeItem("parkflow_ui_settings"); }
    }
  }, []);

  const updateUiSetting = (key: keyof typeof uiSettings, value: boolean) => {
    const updated = { ...uiSettings, [key]: value };
    setUiSettings(updated);
    localStorage.setItem("parkflow_ui_settings", JSON.stringify(updated));
  };

  useEffect(() => { refreshPerms(["tarifas:leer", "tarifas:editar", "usuarios:leer", "usuarios:editar", "configuracion:leer", "configuracion:editar"]).catch(() => {}); }, [refreshPerms]);

  useEffect(() => {
    currentUser().then((user) => { if (user?.companyId) setCompanyId(user.companyId); }).catch(() => {});
  }, []);

  const can = useMemo(() => ({
    ratesRead: perm["tarifas:leer"] ?? false,
    ratesEdit: perm["tarifas:editar"] ?? false,
    usersRead: perm["usuarios:leer"] ?? false,
    usersEdit: perm["usuarios:editar"] ?? false,
    cfgRead: perm["configuracion:leer"] ?? false,
    cfgEdit: perm["configuracion:editar"] ?? false
  }), [perm]);

  if (!section) return null;

  const config = SECTION_CONFIG[section];
  if (!config) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">{config.label}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{config.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{config.description}</p>
      </div>

      {notice ? <Notice kind={notice.kind} text={notice.text} /> : null}

      {section === "setup" && (
        can.cfgRead
          ? companyId ? <SetupBasicoTab companyId={companyId} /> : <p className="text-sm text-slate-600">Cargando...</p>
          : <p className="text-sm text-slate-600">No tiene permiso para configurar operación.</p>
      )}

      {section === "modules" && (
        can.cfgRead
          ? companyId ? <ModulesTab companyId={companyId} /> : <p className="text-sm text-slate-600">Cargando...</p>
          : <p className="text-sm text-slate-600">No tiene permiso para configurar módulos.</p>
      )}

      {section === "rates" && (
        can.ratesRead
          ? <RatesSection canEdit={can.ratesEdit} onNotify={setNotice} auditReason={auditReason} />
          : <p className="text-sm text-slate-600">No tiene permiso para ver tarifas.</p>
      )}

      {section === "monthly" && (
        can.ratesRead
          ? <MonthlySection canEdit={can.ratesEdit} onNotify={setNotice} auditReason={auditReason} />
          : <p className="text-sm text-slate-600">No tiene permiso para ver mensualidades.</p>
      )}

      {section === "agreements" && (
        can.ratesRead
          ? <AgreementsSection canEdit={can.ratesEdit} onNotify={setNotice} auditReason={auditReason} />
          : <p className="text-sm text-slate-600">No tiene permiso para ver convenios.</p>
      )}

      {section === "prepaid" && (
        can.ratesRead
          ? <PrepaidSection canEdit={can.ratesEdit} onNotify={setNotice} auditReason={auditReason} />
          : <p className="text-sm text-slate-600">No tiene permiso para ver prepagados.</p>
      )}

      {section === "users" && (
        can.usersRead
          ? <UsersSection canEdit={can.usersEdit} onNotify={setNotice} auditReason={auditReason} />
          : <p className="text-sm text-slate-600">No tiene permiso para ver usuarios.</p>
      )}

      {section === "parameters" && (
        can.cfgRead
          ? <ParametersSection canEdit={can.cfgEdit} onNotify={setNotice} auditReason={auditReason} />
          : <p className="text-sm text-slate-600">No tiene permiso para ver parametros.</p>
      )}

      {section === "interface" && (
        <InterfaceSection settings={uiSettings} onUpdate={updateUiSetting} companyId={companyId} onNotify={setNotice} />
      )}

      {section === "onboarding" && (
        <>
          <OnboardingSection onNotify={setNotice} />
          <hr className="border-slate-200" />
          <FeatureFlagsSection onNotify={setNotice} />
        </>
      )}

      {section === "masters" && (
        can.cfgRead
          ? <MastersSection onNotify={setNotice} canEdit={can.cfgEdit} />
          : <p className="text-sm text-slate-600">No tienes permisos para ver esta sección. Contacta a un administrador.</p>
      )}
    </div>
  );
}
