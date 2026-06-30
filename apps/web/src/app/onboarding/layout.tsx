import type { Metadata } from "next";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";
import { privateRouteMetadata } from "@/lib/seo/private-metadata";

export const metadata: Metadata = {
  ...privateRouteMetadata,
  title: "Configuración inicial",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeInitializer />
      {children}
    </>
  );
}
