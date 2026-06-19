import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  // React Compiler: auto-memoizes components/hooks. Components that break the
  // Rules of React are skipped silently by the compiler (and flagged by
  // eslint-plugin-react-hooks); see lint output after enabling.
  reactCompiler: true,
  transpilePackages: ["@parkflow/types", "@parkflow/print-core", "@heroui/*"],
  // SECURITY: headers are not supported in export mode,
  // they should be handled by the server or Tauri CSP if needed.
};

export default nextConfig;
