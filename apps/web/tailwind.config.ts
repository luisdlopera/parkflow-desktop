import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui"]
      },
      colors: {
        brand: {
          50: "#ecf8f6",
          100: "#d1f0ea",
          200: "#a6e1d7",
          300: "#72cfbf",
          400: "#3ebaa8",
          500: "#1fa390",
          600: "#148476",
          700: "#116a60",
          800: "#10564e",
          900: "#0f4740"
        }
      }
    }
  },
  plugins: []
};

export default config;
