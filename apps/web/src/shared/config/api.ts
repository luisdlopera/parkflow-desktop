export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1",
  authBaseUrl: process.env.NEXT_PUBLIC_AUTH_BASE_URL || "http://localhost:8080",
  tauriPrintPort: process.env.NEXT_PUBLIC_TAURI_PRINT_PORT || "1420",
};
