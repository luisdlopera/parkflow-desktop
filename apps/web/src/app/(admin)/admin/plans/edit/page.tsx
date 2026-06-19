import { Suspense } from "react";
import ClientPage from "./ClientPage";

export default function EditPlanPage() {
  return (
    <Suspense fallback={<div className="p-6 text-default-500">Cargando...</div>}>
      <ClientPage />
    </Suspense>
  );
}
