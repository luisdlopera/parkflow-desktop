import type { Metadata } from "next";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";

export const metadata: Metadata = {
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
