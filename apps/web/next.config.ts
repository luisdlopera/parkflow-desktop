import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const buildTarget = process.env.PARKFLOW_BUILD_TARGET ?? process.env.NEXT_PUBLIC_PARKFLOW_BUILD_TARGET;
const isDesktopBuild = buildTarget === "desktop" || process.env.TAURI_ENV_PLATFORM !== undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isDesktopBuild ? "export" : undefined,
  // React Compiler: auto-memoizes components/hooks. Components that break the
  // Rules of React are skipped silently by the compiler (and flagged by
  // eslint-plugin-react-hooks); see lint output after enabling.
  reactCompiler: true,
  transpilePackages: ["@parkflow/types", "@parkflow/print-core"],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react", "framer-motion"],
  },
  // SECURITY: headers are not supported in export mode,
  // they should be handled by the server or Tauri CSP if needed.
};

export default withBundleAnalyzer(nextConfig);
