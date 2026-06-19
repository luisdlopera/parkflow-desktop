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
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
];
