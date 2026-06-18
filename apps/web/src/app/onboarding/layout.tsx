import { ThemeInitializer } from "@/components/theme/ThemeInitializer";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeInitializer />
      {children}
    </>
  );
}
