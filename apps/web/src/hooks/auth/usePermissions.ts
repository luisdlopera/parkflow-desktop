import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth.store";
import { hasPermission } from "@/lib/services/auth-domain.service";
import type { Permission } from "@parkflow/types";

/**
 * Hook for checking user permissions
 * Automatically loads permissions from auth store on login
 * Provides both permission object and individual checking function
 */
export function usePermissions() {
  const { user } = useAuthStore();
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  // Auto-load permissions when user logs in
  useEffect(() => {
    if (user?.permissions) {
      const permMap = user.permissions.reduce(
        (acc, perm) => {
          acc[perm] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
      setPerms(permMap);
    } else {
      setPerms({});
    }
  }, [user]);

  const refresh = useCallback(
    async (keys: Permission[] | string[]) => {
      const entries = await Promise.all(
        (keys as Permission[]).map(async (k) => [k, await hasPermission(k)] as const)
      );
      setPerms(Object.fromEntries(entries));
    },
    []
  );

  return { perms, refresh, setPerms } as const;
}

/**
 * Simple hook for checking a single permission
 * Returns boolean directly without needing refresh()
 */
export function useHasPermission(permission: string): boolean {
  const { user } = useAuthStore();
  return user?.permissions.includes(permission) ?? false;
}
