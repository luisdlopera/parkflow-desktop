import { Suspense } from "react";
import ClientPage from "./ClientPage";

export default function EditCompanyPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ClientPage />
    </Suspense>
  );
}
