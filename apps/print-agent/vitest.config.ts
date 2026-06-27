import baseConfig from "@parkflow/config/vitest.config.base";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
      env: {
        PRINT_AGENT_DATA_DIR: "/tmp/parkflow-print-agent-test-data",
      },
    },
  })
);
