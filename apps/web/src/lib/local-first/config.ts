let cachedConfig: { mode: string; syncEnabled: boolean } | null = null;

export async function getLocalFirstConfig(): Promise<{ mode: string; syncEnabled: boolean }> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return { mode: "cloud", syncEnabled: false };
  }
  if (cachedConfig) {
    return cachedConfig;
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const config = await invoke<{ mode: string; syncEnabled: boolean }>("get_parkflow_config");
    cachedConfig = config;
    return config;
  } catch {
    // Default to local if tauri command fails inside tauri
    return { mode: "local", syncEnabled: false };
  }
}

export async function isLocalFirstMode(): Promise<boolean> {
  const config = await getLocalFirstConfig();
  return config.mode === "local" || config.mode === "sync";
}

export async function isSyncEnabled(): Promise<boolean> {
  const config = await getLocalFirstConfig();
  return config.syncEnabled;
}
