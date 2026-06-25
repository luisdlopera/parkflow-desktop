import { useCallback, useEffect, useState } from "react";
import { hasPermission } from "@/lib/services/auth-domain.service";
import type { Permission } from "@parkflow/types";

export function usePermissions() {
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async (keys: Permission[] | string[]) => {
    const entries = await Promise.all((keys as Permission[]).map(async (k) => [k, await hasPermission(k)] as const));
    setPerms(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    // no-op by default; caller should call refresh with needed keys
  }, []);

  return { perms, refresh, setPerms } as const;
}
