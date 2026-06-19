import type { Metadata } from "next";
import ReportesClient from "./ReportesClient";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportesPage() {
  return <ReportesClient />;
}
