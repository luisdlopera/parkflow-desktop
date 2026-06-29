import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CONFIG_NAVIGATION } from "@/features/configuration/constants/navigation";

/**
 * Unified hook for managing configuration view state across Sidebar and MobileSidebar
 * Handles both URL-based (searchParams) and local state approaches seamlessly
 */
export function useConfigView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [configView, setConfigView] = useState<string | false>(false);

  useEffect(() => {
    if (pathname?.startsWith("/configuracion")) {
      const currentSectionParams = searchParams.get("section");
      const currentGroupParams = searchParams.get("group");

      let matchedGroupId: string | null = null;

      // Try to match by explicit group param first
      if (currentGroupParams) {
        matchedGroupId = currentGroupParams;
      } else {
        // Otherwise, search through CONFIG_NAVIGATION to find matching group
        for (const group of CONFIG_NAVIGATION) {
          for (const item of group.items) {
            try {
              const url = new URL(item.href, "http://localhost");
              const itemPath = url.pathname;
              const itemSection = url.searchParams.get("section");

              if (itemPath === pathname) {
                if (itemSection && currentSectionParams === itemSection) {
                  matchedGroupId = group.id;
                  break;
                } else if (!itemSection && (!currentSectionParams || itemPath !== "/configuracion")) {
                  matchedGroupId = group.id;
                  break;
                }
              }
            } catch (e) {
              // Ignore URL parsing errors
            }
          }
          if (matchedGroupId) break;
        }
      }

      // Update state if matched group is different
      if (matchedGroupId) {
        setConfigView((prev) => (prev !== matchedGroupId ? matchedGroupId : prev));
      } else if (pathname === "/configuracion" && !currentSectionParams) {
        setConfigView((prev) => (prev !== "ROOT" ? "ROOT" : prev));
      }
    } else {
      setConfigView(false);
    }
  }, [pathname, searchParams]);

  return {
    configView,
    setConfigView,
    isConfigViewOpen: configView !== false,
  };
}
