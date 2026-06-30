import type { Metadata } from "next";
import { privateRouteMetadata } from "@/lib/seo/private-metadata";

export const metadata: Metadata = {
  ...privateRouteMetadata,
  title: "Acceso",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
