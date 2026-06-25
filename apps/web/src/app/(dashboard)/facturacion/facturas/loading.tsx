import { Spinner } from "@heroui/react";

export default function FacturasLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Spinner size="lg" />
    </div>
  );
}
