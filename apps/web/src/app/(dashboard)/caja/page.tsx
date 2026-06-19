import type { Metadata } from "next";
import CajaClient from "./CajaClient";

export const metadata: Metadata = { title: "Caja" };

export default function CajaPage() {
  return <CajaClient />;
}
