# @parkflow/config

Shared configuration for ParkFlow monorepo (TypeScript, ESLint, Prettier, Vitest).

## Usage

### TypeScript (tsconfig.json)

In any app, extend from the base config:

```json
{
  "extends": "@parkflow/config/tsconfig",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

### Prettier (prettier.config.mjs)

```javascript
import prettier from "@parkflow/config/prettier";

export default prettier;
```

Or create `prettier.config.mjs`:

```mjs
import config from "@parkflow/config/prettier";

export default config;
```

### ESLint (eslint.config.mjs)

In apps/web, extend with app-specific overrides:

```javascript
import baseConfig from "@parkflow/config/eslint";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  ...baseConfig,
  {
    // App-specific rules
    plugins: { "@typescript-eslint": tsPlugin },
    rules: { "@typescript-eslint/no-explicit-any": "warn" },
  },
];
```

### Vitest (vitest.config.ts)

```typescript
import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "@parkflow/config/vitest";
import path from "path";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ["./setupTests.ts"],
    },
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
  })
);
```

## Migration Checklist

- [ ] Update `apps/web/tsconfig.json` to extend from `@parkflow/config/tsconfig`
- [ ] Move `apps/web/prettier.config.mjs` → import from `@parkflow/config/prettier`
- [ ] Update `apps/web/eslint.config.mjs` to extend base config
- [ ] Update `apps/web/vitest.config.ts` to merge with base config
- [ ] Delete duplicate Playwright configs (use root or app-level only)
- [ ] Run `pnpm install` to link the workspace package
- [ ] Verify `pnpm build` and `pnpm test` work
