import coreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  { ignores: [".next/**", "node_modules/**"] },
  ...coreWebVitals,
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/incompatible-library": "warn",
      // Enforce TypeScript type safety — surface `any` uses to developer awareness
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "off",
      // Enforce React Hooks rules strictly
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
