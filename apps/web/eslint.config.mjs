import baseConfig from "@parkflow/config/eslint";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  ...baseConfig,
  ...coreWebVitals,
  {
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "import/no-anonymous-default-export": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/refs": "warn",
      "react-hooks/incompatible-library": "warn",
      // Enforce React Hooks rules strictly
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-undef": "off",
      "no-useless-escape": "error",
      "no-useless-assignment": "error",
      "react/display-name": "error",
      "no-case-declarations": "error",
      "no-empty": "error",
      "no-useless-catch": "error",
      "no-redeclare": "error",
      "no-cond-assign": "error",
      "preserve-caught-error": "error",

      // Accessibility rules specific to our HeroUI components
      "jsx-a11y/control-has-associated-label": [
        "error",
        {
          labelAttributes: ["label"],
          controlComponents: ["Button", "Input", "Select", "Textarea", "Autocomplete", "DatePicker", "TimeInput", "Switch", "RadioGroup", "CheckboxGroup"],
          ignoreElements: [
            "audio",
            "canvas",
            "embed",
            "iframe",
            "input",
            "select",
            "textarea",
            "video",
            "tr",
            "th",
          ],
          ignoreRoles: [
            "grid",
            "listbox",
            "menu",
            "menubar",
            "radiogroup",
            "row",
            "tablist",
            "toolbar",
            "tree",
            "treegrid",
          ],
        },
      ],
    },
  },
];
