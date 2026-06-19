import type { Metadata } from "next";
import SalidaCobroClient from "./SalidaCobroClient";

export const metadata: Metadata = { title: "Salida y Cobro" };

export default function SalidaCobroPage() {
  return <SalidaCobroClient />;
}
