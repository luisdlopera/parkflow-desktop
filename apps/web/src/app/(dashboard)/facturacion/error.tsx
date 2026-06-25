"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <p className="text-sm text-danger">{error.message || "Error al cargar facturación"}</p>
      <button
        onClick={reset}
        className="rounded-lg border border-default-200 px-4 py-2 text-sm font-medium hover:bg-default-50"
      >
        Reintentar
      </button>
    </div>
  );
}
