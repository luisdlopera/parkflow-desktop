import Link from "next/link";

const NAV = [
  { href: "/configuracion", label: "General" },
  { href: "/configuracion/sedes", label: "Sedes" },
  { href: "/configuracion/metodos-pago", label: "Métodos de pago" },
  { href: "/configuracion/impresoras", label: "Impresoras" },
  { href: "/configuracion/cajas", label: "Cajas" },
  { href: "/configuracion/operacion", label: "Operación" },
  { href: "/configuracion/fracciones", label: "Fracciones" },
];

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
