"use client";

import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type PageBackButtonProps = {
  fallbackHref?: string;
  label?: string;
};

export function PageBackButton({ fallbackHref = "/", label = "Volver" }: PageBackButtonProps) {
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="tertiary"
      color="default"
      startContent={<ArrowLeft className="w-4 h-4" aria-hidden />}
      onPress={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
    >
      {label}
    </Button>
  );
}
